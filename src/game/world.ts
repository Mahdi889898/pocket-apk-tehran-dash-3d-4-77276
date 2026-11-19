import * as THREE from 'three';
import type { GameMaterialLibrary } from './materials';
import {
  buildBaseTrackChunk,
  type SharedPropGeometries,
} from './models';
import { CHUNK_LENGTH, LANE_POSITIONS, VISIBLE_CHUNKS, type PowerUpType } from './types';

export type ObstacleKind = 'low_barrier' | 'high_arch' | 'train_static' | 'train_ramp' | 'train_moving';

export interface ObstacleEntity {
  id: number;
  kind: ObstacleKind;
  lane: number; // 0, 1, 2
  mesh: THREE.Group;
  /** Local Z inside its parent chunk */
  localZ: number;
  /** Extra Z offset for moving trains */
  extraZ: number;
  halfLen: number;
  rampLen: number;
  topY: number;
  hitHandled: boolean;
}

export interface CoinEntity {
  mesh: THREE.Group;
  lane: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  collected: boolean;
  magnetized: boolean;
  worldPos: THREE.Vector3;
}

export interface PowerUpEntity {
  type: PowerUpType;
  mesh: THREE.Group;
  lane: number;
  baseY: number;
  localZ: number;
  collected: boolean;
}

export interface TrackChunk {
  index: number;
  z: number; // center Z in world space
  group: THREE.Group;
  contentGroup: THREE.Group;
  disposables: THREE.BufferGeometry[];
  obstacles: ObstacleEntity[];
  coins: CoinEntity[];
  powerUps: PowerUpEntity[];
}

interface Particle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scaleVec = new THREE.Vector3();

export class ParticlePool {
  public readonly mesh: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private cursor = 0;
  private geo: THREE.BufferGeometry;
  private mat: THREE.MeshBasicMaterial;

  constructor(count = 96) {
    this.geo = new THREE.OctahedronGeometry(0.14, 0);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < count; i++) {
      this.mesh.setMatrixAt(i, zero);
      this.mesh.setColorAt(i, new THREE.Color(0xfbbf24));
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        scale: 1,
        color: new THREE.Color(0xfbbf24),
      });
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public burst(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count = 10,
    speed = 5.5
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % this.particles.length;

      p.active = true;
      p.pos.set(x, y, z);
      const angle = Math.random() * Math.PI * 2;
      const up = 0.35 + Math.random() * 0.9;
      const spd = speed * (0.5 + Math.random() * 0.7);
      p.vel.set(Math.cos(angle) * spd, up * spd, Math.sin(angle) * spd);
      p.maxLife = 0.28 + Math.random() * 0.24;
      p.life = p.maxLife;
      p.scale = 0.65 + Math.random() * 0.75;
      p.color.setHex(colorHex);
    }
  }

  public update(dt: number): void {
    let dirty = false;
    let colorDirty = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _scaleVec.set(0, 0, 0);
        _mat4.compose(p.pos, _quat, _scaleVec);
        this.mesh.setMatrixAt(i, _mat4);
        continue;
      }
      p.vel.y -= 14 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const s = (p.life / p.maxLife) * p.scale;
      _scaleVec.set(s, s, s);
      _mat4.compose(p.pos, _quat, _scaleVec);
      this.mesh.setMatrixAt(i, _mat4);
      this.mesh.setColorAt(i, p.color);
      colorDirty = true;
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
    if (colorDirty && this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
  }
}

export class WorldManager {
  public readonly root = new THREE.Group();
  public readonly chunks: TrackChunk[] = [];
  private nextObstacleId = 1;
  private highestSpawnIndex = 0;

  constructor(
    private mats: GameMaterialLibrary,
    private props: SharedPropGeometries
  ) {
    this.initChunks();
  }

  private initChunks(): void {
    for (let i = 0; i < VISIBLE_CHUNKS; i++) {
      const { group, disposables } = buildBaseTrackChunk(this.mats, this.props, i);
      const contentGroup = new THREE.Group();
      group.add(contentGroup);
      const z = -i * CHUNK_LENGTH;
      group.position.z = z;
      this.root.add(group);

      const chunk: TrackChunk = {
        index: i,
        z,
        group,
        contentGroup,
        disposables,
        obstacles: [],
        coins: [],
        powerUps: [],
      };
      this.populateChunk(chunk, i, 0);
      this.chunks.push(chunk);
      this.highestSpawnIndex = i;
    }
  }

  public reset(difficulty = 0): void {
    this.highestSpawnIndex = VISIBLE_CHUNKS - 1;
    // Sort chunks cleanly from frontmost (index 0 at z=0) backward
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      chunk.index = i;
      chunk.z = -i * CHUNK_LENGTH;
      chunk.group.position.z = chunk.z;
      this.populateChunk(chunk, i, difficulty);
    }
  }

  public update(forwardDelta: number, difficulty: number, elapsed: number): void {
    // Advance all chunks toward +Z
    let minZ = Infinity;
    for (const chunk of this.chunks) {
      chunk.z += forwardDelta;
      chunk.group.position.z = chunk.z;
      if (chunk.z < minZ) minZ = chunk.z;

      // Animate moving trains & collectible rotation
      for (const obs of chunk.obstacles) {
        if (obs.kind === 'train_moving') {
          const approxWorldZ = chunk.z + obs.localZ + obs.extraZ;
          if (approxWorldZ > -135 && approxWorldZ < 25) {
            obs.extraZ += forwardDelta * 0.58;
            obs.mesh.position.z = obs.localZ + obs.extraZ;
          }
        }
      }

      for (const coin of chunk.coins) {
        if (!coin.collected && !coin.magnetized) {
          coin.mesh.rotation.y = elapsed * 3.8 + coin.baseZ * 0.25;
          coin.mesh.position.y = coin.baseY + Math.sin(elapsed * 4.2 + coin.baseZ) * 0.08;
        }
      }

      for (const pu of chunk.powerUps) {
        if (!pu.collected) {
          pu.mesh.rotation.y = elapsed * 2.4;
          pu.mesh.position.y = pu.baseY + Math.sin(elapsed * 3.5) * 0.14;
        }
      }
    }

    // Recycle chunks that passed behind the camera (z > CHUNK_LENGTH * 0.9)
    for (const chunk of this.chunks) {
      if (chunk.z > CHUNK_LENGTH * 0.92) {
        this.highestSpawnIndex += 1;
        chunk.index = this.highestSpawnIndex;
        chunk.z = minZ - CHUNK_LENGTH;
        minZ = chunk.z;
        chunk.group.position.z = chunk.z;
        this.populateChunk(chunk, this.highestSpawnIndex, difficulty);
      }
    }
  }

  private clearChunkContent(chunk: TrackChunk): void {
    while (chunk.contentGroup.children.length > 0) {
      chunk.contentGroup.remove(chunk.contentGroup.children[0]);
    }
    chunk.obstacles.length = 0;
    chunk.coins.length = 0;
    chunk.powerUps.length = 0;
  }

  private populateChunk(chunk: TrackChunk, seqIndex: number, difficulty: number): void {
    this.clearChunkContent(chunk);

    // First 2 chunks are a smooth warm-up runway with coins only
    if (seqIndex <= 1) {
      if (seqIndex === 1) {
        this.spawnCoinLine(chunk, 1, 12, -12, 0.75, 5);
      }
      return;
    }

    // Sub-zones inside each 42m chunk: front band (+11m) and back band (-10m)
    // Pick guaranteed-solvable lane layouts
    const pattern = (seqIndex + Math.floor(Math.random() * 6)) % 7;

    if (pattern === 0) {
      // Classic: 1 ramped train, 1 static train, 1 open lane with low barrier
      const rampLane = Math.floor(Math.random() * 3);
      const staticLane = (rampLane + 1) % 3;
      const openLane = (rampLane + 2) % 3;

      this.addTrain(chunk, rampLane, 0, true, false);
      this.spawnCoinRampArc(chunk, rampLane, 10.5, 5.2, 6);
      this.spawnCoinLine(chunk, rampLane, 4.5, -5.0, 3.65, 4);

      this.addTrain(chunk, staticLane, -2, false, false);
      this.addLowBarrier(chunk, openLane, 4);
      this.spawnJumpCoinArc(chunk, openLane, 4, 0.75);
    } else if (pattern === 1) {
      // Overhead bazaar arches + low barriers mix
      const archLane = seqIndex % 3;
      const hurdleLane = (archLane + 1) % 3;
      const freeLane = (archLane + 2) % 3;

      this.addHighArch(chunk, archLane, 7);
      this.spawnCoinLine(chunk, archLane, 11, 2, 0.65, 4);

      this.addLowBarrier(chunk, hurdleLane, -6);
      this.spawnJumpCoinArc(chunk, hurdleLane, -6, 0.75);

      this.addLowBarrier(chunk, freeLane, 8);
      this.spawnCoinLine(chunk, freeLane, 2, -11, 0.75, 5);
    } else if (pattern === 2) {
      // Twin oncoming or parked trains with 1 clear center/side dash corridor
      const clearLane = Math.floor(Math.random() * 3);
      for (let l = 0; l < 3; l++) {
        if (l === clearLane) {
          this.addHighArch(chunk, l, -8);
          this.spawnCoinLine(chunk, l, 11, -13, 0.75, 6);
        } else {
          const moving = difficulty > 0.2 && l === (clearLane + 1) % 3;
          this.addTrain(chunk, l, -4, false, moving);
        }
      }
    } else if (pattern === 3) {
      // Hurdle gauntlet (jump, roll, open)
      this.addLowBarrier(chunk, 0, 8);
      this.addLowBarrier(chunk, 2, 8);
      this.addHighArch(chunk, 1, -4);
      this.spawnJumpCoinArc(chunk, 0, 8, 0.75);
      this.spawnJumpCoinArc(chunk, 2, 8, 0.75);
      this.spawnCoinLine(chunk, 1, 1, -11, 0.65, 4);
    } else if (pattern === 4) {
      // Double ramp playground onto train roofs
      const l1 = seqIndex % 2 === 0 ? 0 : 1;
      const l2 = l1 + 1;
      const l3 = (l2 + 1) % 3;
      this.addTrain(chunk, l1, 0, true, false);
      this.addTrain(chunk, l2, -3, true, false);
      this.spawnCoinLine(chunk, l1, 4, -5, 3.65, 4);
      this.spawnCoinLine(chunk, l2, 1, -8, 3.65, 4);
      this.addLowBarrier(chunk, l3, 5);
    } else if (pattern === 5) {
      // Express oncoming train in one lane, ramp in another
      const movingLane = seqIndex % 3;
      const rampLane = (movingLane + 1) % 3;
      const safeLane = (movingLane + 2) % 3;

      this.addTrain(chunk, movingLane, -10, false, true);
      this.addTrain(chunk, rampLane, 1, true, false);
      this.addLowBarrier(chunk, safeLane, -5);
      this.spawnCoinLine(chunk, safeLane, 10, 0, 0.75, 4);
    } else {
      // Open slalom with staggered barriers & rich coin trail
      this.addLowBarrier(chunk, 1, 9);
      this.addHighArch(chunk, 0, -2);
      this.addHighArch(chunk, 2, -2);
      this.spawnJumpCoinArc(chunk, 1, 9, 0.75);
      this.spawnCoinLine(chunk, 1, 3, -12, 0.75, 5);
    }

    // Power-up spawn chance (~36% per chunk after chunk 2)
    if (seqIndex >= 2 && (seqIndex % 3 === 2 || Math.random() < 0.28)) {
      const types: PowerUpType[] = ['magnet', 'boots', 'multiplier', 'carpet'];
      const puType = types[(seqIndex + Math.floor(Math.random() * 4)) % types.length];
      const puLane = Math.floor(Math.random() * 3);
      // Place powerup at z = 15 (front edge of chunk, clear of train bodies at z=0) or high above
      const puZ = 14.5;
      const puY = 1.05;
      const mesh = this.props.powerUp(puType);
      mesh.position.set(LANE_POSITIONS[puLane], puY, puZ);
      chunk.contentGroup.add(mesh);
      chunk.powerUps.push({
        type: puType,
        mesh,
        lane: puLane,
        baseY: puY,
        localZ: puZ,
        collected: false,
      });
    }
  }

  private addTrain(
    chunk: TrackChunk,
    lane: number,
    localZ: number,
    hasRamp: boolean,
    isMoving: boolean
  ): void {
    const mesh = this.props.trainGroup(hasRamp, isMoving);
    mesh.position.set(LANE_POSITIONS[lane], 0, localZ);
    chunk.contentGroup.add(mesh);

    chunk.obstacles.push({
      id: this.nextObstacleId++,
      kind: isMoving ? 'train_moving' : hasRamp ? 'train_ramp' : 'train_static',
      lane,
      mesh,
      localZ,
      extraZ: 0,
      halfLen: 5.85,
      rampLen: hasRamp ? 5.6 : 0,
      topY: 2.95,
      hitHandled: false,
    });
  }

  private addLowBarrier(chunk: TrackChunk, lane: number, localZ: number): void {
    const mesh = this.props.lowBarrier();
    mesh.position.set(LANE_POSITIONS[lane], 0, localZ);
    chunk.contentGroup.add(mesh);
    chunk.obstacles.push({
      id: this.nextObstacleId++,
      kind: 'low_barrier',
      lane,
      mesh,
      localZ,
      extraZ: 0,
      halfLen: 0.45,
      rampLen: 0,
      topY: 1.08,
      hitHandled: false,
    });
  }

  private addHighArch(chunk: TrackChunk, lane: number, localZ: number): void {
    const mesh = this.props.highArch();
    mesh.position.set(LANE_POSITIONS[lane], 0, localZ);
    chunk.contentGroup.add(mesh);
    chunk.obstacles.push({
      id: this.nextObstacleId++,
      kind: 'high_arch',
      lane,
      mesh,
      localZ,
      extraZ: 0,
      halfLen: 0.4,
      rampLen: 0,
      topY: 2.85,
      hitHandled: false,
    });
  }

  private spawnCoinLine(
    chunk: TrackChunk,
    lane: number,
    startZ: number,
    endZ: number,
    y: number,
    count: number
  ): void {
    const x = LANE_POSITIONS[lane];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);
      const z = THREE.MathUtils.lerp(startZ, endZ, t);
      this.addCoin(chunk, lane, x, y, z);
    }
  }

  private spawnJumpCoinArc(
    chunk: TrackChunk,
    lane: number,
    centerZ: number,
    baseY: number
  ): void {
    const x = LANE_POSITIONS[lane];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const t = (i / (count - 1)) * 2 - 1; // -1 to 1
      const z = centerZ - t * 3.0;
      const y = baseY + (1 - t * t) * 1.45;
      this.addCoin(chunk, lane, x, y, z);
    }
  }

  private spawnCoinRampArc(
    chunk: TrackChunk,
    lane: number,
    startZ: number,
    endZ: number,
    count: number
  ): void {
    const x = LANE_POSITIONS[lane];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const z = THREE.MathUtils.lerp(startZ, endZ, t);
      const y = THREE.MathUtils.lerp(0.8, 3.65, t);
      this.addCoin(chunk, lane, x, y, z);
    }
  }

  private addCoin(
    chunk: TrackChunk,
    lane: number,
    x: number,
    y: number,
    z: number
  ): void {
    const mesh = this.props.coin();
    mesh.position.set(x, y, z);
    chunk.contentGroup.add(mesh);
    chunk.coins.push({
      mesh,
      lane,
      baseX: x,
      baseY: y,
      baseZ: z,
      collected: false,
      magnetized: false,
      worldPos: new THREE.Vector3(),
    });
  }

  public dispose(): void {
    for (const chunk of this.chunks) {
      chunk.disposables.forEach((g) => g.dispose());
    }
  }
}
