import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from './audio';
import { createMaterialLibrary, type GameMaterialLibrary } from './materials';
import {
  createIranianRunner,
  createMetroGuard,
  createMiladSkyline,
  createPropFactory,
  type GuardRig,
  type RunnerRig,
  type SharedPropGeometries,
} from './models';
import { createProceduralTextures, type ProceduralTextureSet } from './textures';
import {
  CHARACTERS,
  LANE_POSITIONS,
  type ActivePowerUps,
  type CharacterId,
  type GamePhase,
  type HudSnapshot,
  type PowerUpType,
} from './types';
import { ParticlePool, WorldManager } from './world';

const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _coinPos = new THREE.Vector3();
const _playerTarget = new THREE.Vector3();

const HIGH_SCORE_KEY = 'tehran_dash_highscore_v1';
const BANK_COINS_KEY = 'tehran_dash_bank_coins_v1';
const CHARACTER_KEY = 'tehran_dash_character_v1';

export class RunnerEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private isSoftwareGl = false;

  private textures!: ProceduralTextureSet;
  private mats!: GameMaterialLibrary;
  private props!: SharedPropGeometries;
  private world!: WorldManager;
  private particles!: ParticlePool;
  private runner!: RunnerRig;
  private guard!: GuardRig;
  private skyline!: { group: THREE.Group; dispose: () => void };
  private envRT: THREE.WebGLRenderTarget | null = null;

  public readonly sound = new SoundEngine();

  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private contextLost = false;

  // Game state
  private phase: GamePhase = 'title';
  private characterId: CharacterId = 'kian';
  private score = 0;
  private highScore = 0;
  private coins = 0;
  private totalBankCoins = 0;
  private distance = 0;
  private speed = 15.5;
  private baseSpeed = 15.5;
  private maxSpeed = 32;
  private carpetCharges = 2;

  // Player kinematics
  private lane = 1; // 0, 1, 2
  private prevLane = 1;
  private playerX = 0;
  private playerY = 0;
  private velY = 0;
  private groundY = 0;
  private coyoteTimer = 0;
  private rollTimer = 0;
  private laneLean = 0;
  private laneSwitchGrace = 0;
  private invulnTimer = 0;

  // Input buffering
  private jumpBufferTimer = 0;
  private rollBufferTimer = 0;
  private laneBuffer: -1 | 0 | 1 = 0;
  private laneBufferTimer = 0;

  // Guard / Stumble state
  private stumbleTimer = 0;
  private guardChaseTimer = 3.5;

  // Power-ups
  private powerUps: ActivePowerUps = {
    magnet: 0,
    boots: 0,
    multiplier: 0,
    carpet: 0,
  };

  // Juice: hitstop & camera shake
  private hitstopTimer = 0;
  private shakeTrauma = 0;
  private crashReason = '';

  // Input listeners state
  private touchStartX = 0;
  private touchStartY = 0;
  private touchActive = false;

  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private hudEmitAccum = 0;

  constructor(
    container: HTMLElement,
    onHudUpdate: (snapshot: HudSnapshot) => void
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;

    // Load saved progress
    try {
      this.highScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || '0') || 0;
      this.totalBankCoins = Number(localStorage.getItem(BANK_COINS_KEY) || '0') || 0;
      const savedChar = localStorage.getItem(CHARACTER_KEY) as CharacterId | null;
      if (savedChar && CHARACTERS.some((c) => c.id === savedChar)) {
        this.characterId = savedChar;
      }
    } catch {
      // Ignore storage errors in sandboxed iframes
    }

    this.initScene();
    this.bindEvents();
    this.emitHud();
    this.startLoop();
  }

  private detectSoftwareGl(): boolean {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  }

  private initScene(): void {
    this.isSoftwareGl = this.detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(this.container.clientWidth || window.innerWidth, this.container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    // Warm Tehran golden-hour horizon sky
    const skyColor = new THREE.Color(0xe8a87c);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0xe8a87c, 0.0082);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.1, 320);
    this.camera.position.set(2.4, 2.5, 5.2);

    // Mandatory studio environment reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmremGenerator.dispose();

    // 3-Point + Hemisphere warm/cool lighting rig
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0xb45309, 0.85);
    hemi.position.set(0, 40, 0);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    keyLight.position.set(16, 28, 18);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 90;
    const d = 24;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-14, 12, -22);
    this.scene.add(rimLight);

    // Assets & Procedural World
    const maxAniso = this.isSoftwareGl
      ? 1
      : this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.mats = createMaterialLibrary(this.textures, this.isSoftwareGl);
    this.props = createPropFactory(this.mats);

    this.world = new WorldManager(this.mats, this.props);
    this.scene.add(this.world.root);

    this.skyline = createMiladSkyline(this.mats);
    this.scene.add(this.skyline.group);

    this.particles = new ParticlePool(96);
    this.scene.add(this.particles.mesh);

    const charCfg = CHARACTERS.find((c) => c.id === this.characterId) || CHARACTERS[0];
    this.runner = createIranianRunner(charCfg, this.mats);
    this.scene.add(this.runner.root);

    this.guard = createMetroGuard(this.mats);
    this.guard.root.position.set(0, 0, 3.5);
    this.scene.add(this.guard.root);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public setCharacter(id: CharacterId): void {
    const cfg = CHARACTERS.find((c) => c.id === id);
    if (!cfg) return;
    this.characterId = id;
    this.runner.applyOutfit(cfg);
    try {
      localStorage.setItem(CHARACTER_KEY, id);
    } catch {
      // ignore
    }
    this.emitHud();
  }

  public startRun(): void {
    this.sound.unlock();
    this.phase = 'playing';
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.speed = this.baseSpeed;
    this.carpetCharges = 2;
    this.crashReason = '';

    this.lane = 1;
    this.prevLane = 1;
    this.playerX = LANE_POSITIONS[1];
    this.playerY = 0;
    this.velY = 0;
    this.groundY = 0;
    this.coyoteTimer = 0;
    this.rollTimer = 0;
    this.laneLean = 0;
    this.laneSwitchGrace = 0;
    this.invulnTimer = 0;
    this.jumpBufferTimer = 0;
    this.rollBufferTimer = 0;
    this.laneBuffer = 0;
    this.laneBufferTimer = 0;

    this.stumbleTimer = 0;
    this.guardChaseTimer = 3.6;
    this.hitstopTimer = 0;
    this.shakeTrauma = 0;

    this.powerUps = { magnet: 0, boots: 0, multiplier: 0, carpet: 0 };
    this.runner.carpetMount.visible = false;
    this.runner.root.position.set(this.playerX, 0, 0);
    this.runner.root.rotation.set(0, 0, 0);

    this.world.reset(0);
    this.emitHud();
  }

  public togglePause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.emitHud();
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.clock.getDelta(); // flush delta spike
      this.emitHud();
    }
  }

  public returnToTitle(): void {
    this.phase = 'title';
    this.lane = 1;
    this.playerX = 0;
    this.playerY = 0;
    this.velY = 0;
    this.rollTimer = 0;
    this.powerUps = { magnet: 0, boots: 0, multiplier: 0, carpet: 0 };
    this.runner.carpetMount.visible = false;
    this.runner.root.position.set(0, 0, 0);
    this.runner.root.rotation.set(0, 0, 0);
    this.world.reset(0);
    this.emitHud();
  }

  public activateCarpet(): void {
    if (this.phase !== 'playing') return;
    if (this.carpetCharges <= 0 || this.powerUps.carpet > 0) return;
    this.carpetCharges -= 1;
    this.powerUps.carpet = 10.0;
    this.sound.playPowerUp();
    this.particles.burst(this.playerX, this.playerY + 0.4, 0, 0xf59e0b, 16, 6.5);
    this.emitHud();
  }

  public toggleMute(): boolean {
    const next = !this.sound.isMuted();
    this.sound.setMuted(next);
    return next;
  }

  // Player actions
  private queueLane(dir: -1 | 1): void {
    this.laneBuffer = dir;
    this.laneBufferTimer = 0.14;
  }

  private queueJump(): void {
    this.jumpBufferTimer = 0.14;
  }

  private queueRoll(): void {
    if (this.playerY > this.groundY + 0.18) {
      // Fast-fall midair!
      this.velY = Math.min(this.velY, -24);
      this.rollBufferTimer = 0.25;
    } else {
      this.rollBufferTimer = 0.14;
    }
  }

  private performLaneSwitch(dir: -1 | 1): void {
    const target = THREE.MathUtils.clamp(this.lane + dir, 0, 2);
    if (target !== this.lane) {
      this.prevLane = this.lane;
      this.lane = target;
      this.laneLean = dir * -0.28;
      this.laneSwitchGrace = 0.26;
      this.sound.playLaneSwitch();
    }
    this.laneBuffer = 0;
    this.laneBufferTimer = 0;
  }

  private performJump(): void {
    const superJump = this.powerUps.boots > 0;
    this.velY = superJump ? 18.2 : 14.0;
    this.rollTimer = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.sound.playJump(superJump);
    this.particles.burst(this.playerX, this.groundY + 0.1, 0.2, 0xd6cfc2, 6, 3.2);
  }

  private performRoll(): void {
    this.rollTimer = 0.65;
    this.rollBufferTimer = 0;
    this.sound.playRoll();
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;

    if (this.phase === 'title') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.startRun();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        const idx = CHARACTERS.findIndex((c) => c.id === this.characterId);
        this.setCharacter(CHARACTERS[(idx + CHARACTERS.length - 1) % CHARACTERS.length].id);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        const idx = CHARACTERS.findIndex((c) => c.id === this.characterId);
        this.setCharacter(CHARACTERS[(idx + 1) % CHARACTERS.length].id);
      }
      return;
    }

    if (this.phase === 'gameover') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.startRun();
      }
      return;
    }

    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      this.togglePause();
      return;
    }

    if (this.phase !== 'playing') return;

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        e.preventDefault();
        this.queueLane(-1);
        break;
      case 'ArrowRight':
      case 'KeyD':
        e.preventDefault();
        this.queueLane(1);
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        e.preventDefault();
        this.queueJump();
        break;
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.queueRoll();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyE':
      case 'KeyF':
        e.preventDefault();
        this.activateCarpet();
        break;
    }
  };

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.phase !== 'playing') return;
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
    this.touchActive = true;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.touchActive || this.phase !== 'playing') return;
    const dx = e.clientX - this.touchStartX;
    const dy = e.clientY - this.touchStartY;
    const threshold = 28;
    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      this.touchActive = false;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.queueLane(dx > 0 ? 1 : -1);
      } else if (dy < 0) {
        this.queueJump();
      } else {
        this.queueRoll();
      }
    }
  };

  private handlePointerUp = (): void => {
    this.touchActive = false;
  };

  private handleBlur = (): void => {
    this.touchActive = false;
    if (this.phase === 'playing') {
      this.togglePause();
    }
  };

  private handleResize = (): void => {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
  };

  private handleContextRestored = (): void => {
    this.contextLost = false;
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('blur', this.handleBlur);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('webglcontextlost', this.handleContextLost);
    dom.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private startLoop(): void {
    this.clock.start();
    const tick = () => {
      if (this.disposed) return;

      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = this.clock.elapsedTime;

      if (!this.contextLost) {
        this.step(dt, elapsed);
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = requestAnimationFrame(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private step(dt: number, elapsed: number): void {
    // Hitstop freeze for heavy impacts
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateCamera(dt, elapsed);
      return;
    }

    if (this.phase === 'title') {
      // Gentle live-world atmospheric showcase on Title Screen
      this.world.update(4.2 * dt, 0, elapsed);
      this.animateRunnerIdleOrJog(elapsed, dt, true);
      this.guard.root.visible = false;
      this.particles.update(dt);
      this.updateCamera(dt, elapsed);
      return;
    }

    if (this.phase === 'paused') {
      return;
    }

    if (this.phase === 'gameover') {
      this.particles.update(dt);
      this.animateRunnerCrashed(dt);
      this.guard.root.visible = true;
      this.guard.root.position.x = THREE.MathUtils.damp(this.guard.root.position.x, this.playerX, 8, dt);
      this.guard.root.position.z = THREE.MathUtils.damp(this.guard.root.position.z, 1.55, 8, dt);
      this.updateCamera(dt, elapsed);
      return;
    }

    // --- ACTIVE PLAYING SIMULATION ---
    // Smooth speed ramp
    const difficulty = Math.min(1, this.distance / 1800);
    this.speed = THREE.MathUtils.lerp(this.baseSpeed, this.maxSpeed, difficulty);
    const forwardDelta = this.speed * dt;
    this.distance += forwardDelta;

    // Score ticks up scaled by multiplier
    const mult = this.powerUps.multiplier > 0 ? 2 : 1;
    this.score += forwardDelta * 1.8 * mult;

    // Timers
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.laneSwitchGrace > 0) this.laneSwitchGrace -= dt;
    if (this.stumbleTimer > 0) this.stumbleTimer -= dt;
    if (this.guardChaseTimer > 0) this.guardChaseTimer -= dt;

    if (this.powerUps.magnet > 0) this.powerUps.magnet = Math.max(0, this.powerUps.magnet - dt);
    if (this.powerUps.boots > 0) this.powerUps.boots = Math.max(0, this.powerUps.boots - dt);
    if (this.powerUps.multiplier > 0) this.powerUps.multiplier = Math.max(0, this.powerUps.multiplier - dt);
    if (this.powerUps.carpet > 0) {
      this.powerUps.carpet = Math.max(0, this.powerUps.carpet - dt);
    }
    this.runner.carpetMount.visible = this.powerUps.carpet > 0;

    // Input buffers
    if (this.laneBufferTimer > 0) {
      this.laneBufferTimer -= dt;
      if (this.laneBuffer !== 0) {
        this.performLaneSwitch(this.laneBuffer);
      }
    }

    // Advance endless world
    this.world.update(forwardDelta, difficulty, elapsed);

    // Horizontal lane damping
    const targetX = LANE_POSITIONS[this.lane];
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 16, dt);
    this.laneLean = THREE.MathUtils.damp(this.laneLean, 0, 12, dt);

    // Compute dynamic groundY (ground 0, ramp, or train roof 2.95)
    this.groundY = this.computeSupportHeight(this.playerX);

    // Coyote time & buffered jump/roll
    const isGrounded = this.playerY <= this.groundY + 0.06 && this.velY <= 0.5;
    if (isGrounded) {
      this.coyoteTimer = 0.09;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
      if (this.coyoteTimer > 0) {
        this.performJump();
      }
    }

    if (this.rollBufferTimer > 0) {
      this.rollBufferTimer -= dt;
      if (isGrounded) {
        this.performRoll();
      }
    }

    // Vertical gravity & landing
    const gravity = this.powerUps.carpet > 0 ? 28 : 38;
    this.velY -= gravity * dt;
    this.playerY += this.velY * dt;

    if (this.playerY <= this.groundY) {
      this.playerY = this.groundY;
      this.velY = 0;
    }

    if (this.rollTimer > 0) {
      this.rollTimer = Math.max(0, this.rollTimer - dt);
    }

    // Position runner
    this.runner.root.position.set(this.playerX, this.playerY, 0);
    // Keep contact shadow pinned to support surface below player!
    this.runner.shadowPlane.position.y = Math.max(0.025, this.groundY - this.playerY + 0.025);
    const shadowScale = Math.max(0.45, 1 - (this.playerY - this.groundY) * 0.14);
    this.runner.shadowPlane.scale.setScalar(shadowScale);

    // Animate character rig
    this.animateRunnerPlaying(elapsed, dt);

    // Animate pursuing guard
    const showGuard = this.guardChaseTimer > 0 || this.stumbleTimer > 0;
    this.guard.root.visible = showGuard;
    if (showGuard) {
      const guardZ = this.stumbleTimer > 0 ? 1.85 : THREE.MathUtils.lerp(2.2, 4.8, 1 - this.guardChaseTimer / 3.6);
      this.guard.root.position.x = THREE.MathUtils.damp(this.guard.root.position.x, this.playerX, 8, dt);
      this.guard.root.position.z = THREE.MathUtils.damp(this.guard.root.position.z, guardZ, 6, dt);
      const stride = Math.sin(elapsed * 16);
      this.guard.leftLeg.rotation.x = stride * 0.75;
      this.guard.rightLeg.rotation.x = -stride * 0.75;
      this.guard.leftArm.rotation.x = -stride * 0.65;
      this.guard.rightArm.rotation.x = stride * 0.45 + 0.5;
    }

    // Collisions: Coins, PowerUps, Obstacles
    this.resolveCollectibles(dt);
    this.resolveObstacles();

    this.particles.update(dt);
    this.updateCamera(dt, elapsed);

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.06) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private computeSupportHeight(x: number): number {
    let support = 0;
    for (const chunk of this.world.chunks) {
      for (const obs of chunk.obstacles) {
        if (
          obs.kind !== 'train_static' &&
          obs.kind !== 'train_ramp' &&
          obs.kind !== 'train_moving'
        ) {
          continue;
        }
        const obsX = LANE_POSITIONS[obs.lane];
        if (Math.abs(x - obsX) > 0.92) continue;

        const obsWorldZ = chunk.z + obs.localZ + obs.extraZ;
        // Flat train roof: [obsWorldZ - halfLen, obsWorldZ + halfLen]
        if (obsWorldZ - obs.halfLen <= 0.35 && obsWorldZ + obs.halfLen >= -0.35) {
          if (this.playerY >= obs.topY - 0.55) {
            support = Math.max(support, obs.topY);
          }
        }
        // Climbable ramp in front (+Z side): [obsWorldZ + halfLen, obsWorldZ + halfLen + rampLen]
        if (obs.rampLen > 0) {
          const rampTopZ = obsWorldZ + obs.halfLen;
          const rampBotZ = rampTopZ + obs.rampLen;
          if (0 >= rampTopZ && 0 <= rampBotZ) {
            const t = THREE.MathUtils.clamp((rampBotZ - 0) / obs.rampLen, 0, 1);
            const rampY = t * obs.topY;
            if (this.playerY >= rampY - 0.5) {
              support = Math.max(support, rampY);
            }
          }
        }
      }
    }
    return support;
  }

  private resolveCollectibles(dt: number): void {
    const magnetOn = this.powerUps.magnet > 0;
    const playerCenterY = this.playerY + (this.rollTimer > 0 ? 0.55 : 1.0);

    for (const chunk of this.world.chunks) {
      for (const coin of chunk.coins) {
        if (coin.collected) continue;

        const worldZ = chunk.z + coin.baseZ;
        if (worldZ > 6 || worldZ < -32) continue;

        if (magnetOn) {
          const dx = this.playerX - coin.mesh.position.x;
          const dy = playerCenterY - coin.mesh.position.y;
          const dz = -worldZ;
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq < 196) {
            coin.magnetized = true;
            _coinPos.set(this.playerX, playerCenterY, -chunk.z);
            coin.mesh.position.lerp(_coinPos, Math.min(1, dt * 14));
          }
        }

        const curWorldZ = chunk.z + coin.mesh.position.z;
        const dx = Math.abs(this.playerX - coin.mesh.position.x);
        const dy = Math.abs(playerCenterY - coin.mesh.position.y);
        const dz = Math.abs(curWorldZ);

        if (dx < 0.85 && dy < 1.15 && dz < 0.95) {
          coin.collected = true;
          coin.mesh.visible = false;
          const mult = this.powerUps.multiplier > 0 ? 2 : 1;
          this.coins += 1;
          this.totalBankCoins += 1;
          this.score += 15 * mult;
          this.sound.playCoin();
          this.particles.burst(coin.mesh.position.x, coin.mesh.position.y, curWorldZ, 0xfbbf24, 7, 4.2);
        }
      }

      for (const pu of chunk.powerUps) {
        if (pu.collected) continue;
        const worldZ = chunk.z + pu.localZ;
        if (Math.abs(worldZ) < 1.15 && Math.abs(this.playerX - LANE_POSITIONS[pu.lane]) < 0.95 && Math.abs(playerCenterY - pu.baseY) < 1.3) {
          pu.collected = true;
          pu.mesh.visible = false;
          this.grantPowerUp(pu.type);
        }
      }
    }
  }

  private grantPowerUp(type: PowerUpType): void {
    this.sound.playPowerUp();
    if (type === 'magnet') {
      this.powerUps.magnet = 11;
      this.particles.burst(this.playerX, this.playerY + 1, 0, 0xef4444, 14, 5.5);
    } else if (type === 'boots') {
      this.powerUps.boots = 11;
      this.particles.burst(this.playerX, this.playerY + 0.5, 0, 0x10b981, 14, 5.5);
    } else if (type === 'multiplier') {
      this.powerUps.multiplier = 12;
      this.particles.burst(this.playerX, this.playerY + 1.1, 0, 0x3b82f6, 14, 5.5);
    } else if (type === 'carpet') {
      this.carpetCharges = Math.min(9, this.carpetCharges + 1);
      if (this.powerUps.carpet <= 0) {
        this.powerUps.carpet = 10;
      }
      this.particles.burst(this.playerX, this.playerY + 0.4, 0, 0xf59e0b, 16, 6.0);
    }
    this.emitHud();
  }

  private resolveObstacles(): void {
    if (this.invulnTimer > 0) return;

    for (const chunk of this.world.chunks) {
      for (const obs of chunk.obstacles) {
        if (obs.hitHandled) continue;
        const obsX = LANE_POSITIONS[obs.lane];
        if (Math.abs(this.playerX - obsX) > 0.78) continue;

        const obsWorldZ = chunk.z + obs.localZ + obs.extraZ;

        if (obs.kind === 'low_barrier') {
          if (Math.abs(obsWorldZ) < 0.52) {
            if (this.playerY >= 0.88) continue; // Jumped cleanly
            obs.hitHandled = true;
            if (this.playerY > 0.58) {
              this.triggerStumble(obs);
            } else {
              this.triggerImpact(obs, 'برخورد با مانع ترافیکی');
            }
            return;
          }
        } else if (obs.kind === 'high_arch') {
          if (Math.abs(obsWorldZ) < 0.46) {
            // Slide/roll underneath OR super-jump over top
            const rollingLow = this.rollTimer > 0 && this.playerY < 0.45;
            const clearedTop = this.playerY >= 2.7;
            if (rollingLow || clearedTop) continue;
            obs.hitHandled = true;
            this.triggerImpact(obs, 'برخورد با طاق بازار');
            return;
          }
        } else {
          // Train bodies
          const frontZ = obsWorldZ + obs.halfLen;
          const backZ = obsWorldZ - obs.halfLen;
          if (backZ <= 0.35 && frontZ >= -0.35) {
            // Safe if running on top!
            if (this.playerY >= obs.topY - 0.52) continue;

            // Check if player hit the front face or clipped the side during a lane switch
            const hitSide = this.laneSwitchGrace > 0 && frontZ > 0.85;
            obs.hitHandled = true;
            if (hitSide && this.prevLane !== obs.lane) {
              this.lane = this.prevLane;
              this.triggerStumble(obs);
            } else {
              this.triggerImpact(
                obs,
                obs.kind === 'train_moving'
                  ? 'برخورد با قطار در حال حرکت'
                  : 'برخورد با واگن مترو'
              );
            }
            return;
          }
        }
      }
    }
  }

  private triggerStumble(obs: { mesh: THREE.Group; kind: string }): void {
    if (this.powerUps.carpet > 0) {
      this.consumeCarpetShield(obs);
      return;
    }
    this.sound.playStumble();
    this.shakeTrauma = 0.45;
    this.particles.burst(this.playerX, this.playerY + 0.8, 0, 0xf97316, 10, 5.0);

    if (this.stumbleTimer > 0) {
      // Caught by آقا مصطفی on second stumble!
      this.triggerGameOver('آقا مصطفی بهت رسید!');
      return;
    }

    this.stumbleTimer = 4.8;
    this.guardChaseTimer = 4.8;
    this.invulnTimer = 0.45;
    if (obs.kind === 'low_barrier') {
      obs.mesh.visible = false;
    }
    this.emitHud();
  }

  private triggerImpact(obs: { mesh: THREE.Group; kind: string }, reason: string): void {
    if (this.powerUps.carpet > 0) {
      this.consumeCarpetShield(obs);
      return;
    }
    this.triggerGameOver(reason);
  }

  private consumeCarpetShield(obs: { mesh: THREE.Group; kind: string }): void {
    this.powerUps.carpet = 0;
    this.runner.carpetMount.visible = false;
    this.invulnTimer = 1.35;
    this.hitstopTimer = 0.045;
    this.shakeTrauma = 0.65;
    this.sound.playCarpetShield();
    this.particles.burst(this.playerX, this.playerY + 0.9, 0, 0xf59e0b, 24, 8.5);
    if (obs.kind === 'low_barrier' || obs.kind === 'high_arch') {
      obs.mesh.visible = false;
    } else {
      // Pop safely up onto roof height if crashing into train with carpet
      this.velY = 12.5;
    }
    this.emitHud();
  }

  private triggerGameOver(reason: string): void {
    this.phase = 'gameover';
    this.crashReason = reason;
    this.hitstopTimer = 0.065;
    this.shakeTrauma = 1.0;
    this.sound.playCrash();
    this.particles.burst(this.playerX, this.playerY + 1.0, 0, 0xef4444, 24, 8.0);
    this.particles.burst(this.playerX, this.playerY + 0.8, 0, 0xfbbf24, 14, 6.5);

    const finalScore = Math.floor(this.score);
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
    }
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(this.highScore));
      localStorage.setItem(BANK_COINS_KEY, String(this.totalBankCoins));
    } catch {
      // ignore
    }
    this.emitHud();
  }

  private animateRunnerIdleOrJog(elapsed: number, dt: number, isTitle: boolean): void {
    const r = this.runner;
    const speed = isTitle ? 7.5 : 14;
    const stride = Math.sin(elapsed * speed);

    r.bodyPivot.position.y = Math.abs(Math.cos(elapsed * speed)) * 0.06;
    r.bodyPivot.rotation.set(0.08, isTitle ? Math.sin(elapsed * 0.6) * 0.14 : 0, 0);
    r.bodyPivot.scale.set(1, 1, 1);

    r.leftLeg.rotation.x = stride * 0.62;
    r.rightLeg.rotation.x = -stride * 0.62;
    r.leftShin.rotation.x = Math.max(0, -stride) * 0.65;
    r.rightShin.rotation.x = Math.max(0, stride) * 0.65;

    r.leftArm.rotation.x = -stride * 0.55;
    r.rightArm.rotation.x = stride * 0.55;
    r.leftForearm.rotation.x = -0.55;
    r.rightForearm.rotation.x = -0.55;

    r.scarfTail.rotation.x = 0.25 + Math.sin(elapsed * 9) * 0.12;
    r.scarfTail.rotation.y = Math.cos(elapsed * 7) * 0.18;
    r.root.position.y = THREE.MathUtils.damp(r.root.position.y, 0, 10, dt);
  }

  private animateRunnerPlaying(elapsed: number, dt: number): void {
    const r = this.runner;

    // Blink softly during post-carpet invulnerability
    if (this.invulnTimer > 0) {
      r.bodyPivot.visible = Math.floor(elapsed * 18) % 2 === 0;
    } else {
      r.bodyPivot.visible = true;
    }

    if (this.powerUps.carpet > 0) {
      // Surfing stance on the Flying Persian Carpet!
      r.bodyPivot.position.y = 0.2 + Math.sin(elapsed * 6) * 0.05;
      r.bodyPivot.rotation.set(0.14, 0.45, this.laneLean * 0.9);
      r.bodyPivot.scale.set(1, 1, 1);
      r.leftLeg.rotation.x = -0.22;
      r.rightLeg.rotation.x = 0.28;
      r.leftShin.rotation.x = 0.35;
      r.rightShin.rotation.x = 0.25;
      r.leftArm.rotation.set(0.1, 0, -0.75);
      r.rightArm.rotation.set(-0.1, 0, 0.75);
      r.scarfTail.rotation.x = 0.4 + Math.sin(elapsed * 16) * 0.16;
      r.carpetMount.rotation.z = this.laneLean * 1.1;
      r.carpetMount.position.y = 0.12 + Math.sin(elapsed * 6) * 0.05;
      return;
    }

    if (this.rollTimer > 0) {
      // Low roll/slide tuck
      r.bodyPivot.position.y = -0.18;
      r.bodyPivot.scale.set(1.06, 0.58, 1.06);
      r.bodyPivot.rotation.set(-0.55, 0, this.laneLean * 0.5);
      r.leftLeg.rotation.x = -1.1;
      r.rightLeg.rotation.x = -0.9;
      r.leftArm.rotation.x = -0.9;
      r.rightArm.rotation.x = -0.9;
      r.scarfTail.rotation.x = 0.55;
      return;
    }

    const airborne = this.playerY > this.groundY + 0.12;
    if (airborne) {
      // Dynamic airborne jump pose
      r.bodyPivot.position.y = 0;
      r.bodyPivot.scale.set(0.95, 1.06, 0.95);
      r.bodyPivot.rotation.set(THREE.MathUtils.clamp(-this.velY * 0.02, -0.25, 0.28), 0, this.laneLean);
      r.leftLeg.rotation.x = -0.75;
      r.rightLeg.rotation.x = 0.45;
      r.leftShin.rotation.x = 0.95;
      r.rightShin.rotation.x = 0.35;
      r.leftArm.rotation.x = -1.15;
      r.rightArm.rotation.x = -0.85;
      r.scarfTail.rotation.x = 0.45;
      return;
    }

    // Full sprint stride
    const freq = this.speed * 0.92;
    const stride = Math.sin(elapsed * freq);
    r.bodyPivot.position.y = Math.abs(Math.cos(elapsed * freq)) * 0.09;
    r.bodyPivot.scale.set(1, 1, 1);
    r.bodyPivot.rotation.set(0.16, 0, this.laneLean);

    r.leftLeg.rotation.x = stride * 0.92;
    r.rightLeg.rotation.x = -stride * 0.92;
    r.leftShin.rotation.x = Math.max(0, -stride) * 1.15;
    r.rightShin.rotation.x = Math.max(0, stride) * 1.15;

    r.leftArm.rotation.x = -stride * 0.85;
    r.rightArm.rotation.x = stride * 0.85;
    r.leftForearm.rotation.x = -0.78;
    r.rightForearm.rotation.x = -0.78;

    r.scarfTail.rotation.x = 0.35 + Math.sin(elapsed * freq * 1.4) * 0.15;
    r.scarfTail.rotation.y = Math.cos(elapsed * 12) * 0.22 + this.laneLean * 0.6;
    void dt;
  }

  private animateRunnerCrashed(dt: number): void {
    const r = this.runner;
    r.bodyPivot.visible = true;
    r.bodyPivot.scale.set(1, 1, 1);
    r.bodyPivot.rotation.x = THREE.MathUtils.damp(r.bodyPivot.rotation.x, -1.15, 10, dt);
    r.bodyPivot.position.y = THREE.MathUtils.damp(r.bodyPivot.position.y, 0.35, 10, dt);
  }

  private updateCamera(dt: number, elapsed: number): void {
    if (this.phase === 'title') {
      // Gentle cinematic hero pan showcasing Kian + Tehran Metro corridor
      const angle = Math.sin(elapsed * 0.35) * 0.55 + 0.35;
      _camDesired.set(
        Math.sin(angle) * 3.8,
        2.15 + Math.sin(elapsed * 0.5) * 0.15,
        -Math.cos(angle) * 3.8 + 0.6
      );
      _camTarget.set(0, 1.35, -3.5);
      this.camera.position.lerp(_camDesired, 1 - Math.exp(-4 * dt));
      this.camera.lookAt(_camTarget);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 54, 6, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    // Playing / Gameover chase camera
    this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.2);
    const shakeAmt = this.shakeTrauma * this.shakeTrauma * 0.32;
    const sx = (Math.random() * 2 - 1) * shakeAmt;
    const sy = (Math.random() * 2 - 1) * shakeAmt;

    const targetFov = 62 + ((this.speed - this.baseSpeed) / (this.maxSpeed - this.baseSpeed)) * 10;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, dt);
    this.camera.updateProjectionMatrix();

    _camDesired.set(
      this.playerX * 0.68 + sx,
      3.45 + this.playerY * 0.62 + sy,
      6.4
    );
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camDesired.x, 10, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camDesired.y, 8, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camDesired.z, 8, dt);

    _playerTarget.set(this.playerX * 0.42, 1.4 + this.playerY * 0.55, -8.5);
    this.camera.lookAt(_playerTarget);
    this.camera.rotation.z = this.laneLean * -0.14;
  }

  private emitHud(): void {
    this.onHudUpdate({
      phase: this.phase,
      score: Math.floor(this.score),
      highScore: Math.max(this.highScore, Math.floor(this.score)),
      coins: this.coins,
      totalBankCoins: this.totalBankCoins,
      distance: Math.floor(this.distance),
      speedKmh: Math.round(this.speed * 3.1),
      multiplier: this.powerUps.multiplier > 0 ? 2 : 1,
      carpetCharges: this.carpetCharges,
      stumbleWarning: this.stumbleTimer > 0,
      powerUps: { ...this.powerUps },
      characterId: this.characterId,
      crashReason: this.crashReason,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    dom.removeEventListener('webglcontextlost', this.handleContextLost);
    dom.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.sound.dispose();
    this.runner.dispose();
    this.guard.dispose();
    this.skyline.dispose();
    this.world.dispose();
    this.particles.dispose();
    this.props.dispose();
    this.mats.dispose();
    this.textures.dispose();
    this.envRT?.dispose();
    this.renderer.dispose();

    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
