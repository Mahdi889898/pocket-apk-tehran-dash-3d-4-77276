import * as THREE from 'three';
import type { GameMaterialLibrary } from './materials';
import { CHUNK_LENGTH, LANE_POSITIONS, type CharacterConfig, type PowerUpType } from './types';

export interface RunnerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftShin: THREE.Group;
  rightShin: THREE.Group;
  scarfTail: THREE.Group;
  carpetMount: THREE.Group;
  shadowPlane: THREE.Mesh;
  applyOutfit: (config: CharacterConfig) => void;
  dispose: () => void;
}

export function createIranianRunner(
  initialConfig: CharacterConfig,
  mats: GameMaterialLibrary
): RunnerRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    ownedGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    ownedMats.push(m);
    return m;
  };

  // Dynamic outfit materials
  const skinMat = trackMat(
    new THREE.MeshStandardMaterial({ color: initialConfig.skinColor, roughness: 0.62, metalness: 0.02 })
  );
  const hairMat = trackMat(
    new THREE.MeshStandardMaterial({ color: initialConfig.hairColor, roughness: 0.85, metalness: 0.05 })
  );
  const jacketMat = trackMat(
    new THREE.MeshStandardMaterial({ color: initialConfig.jacketColor, roughness: 0.68, metalness: 0.06 })
  );
  const accentMat = trackMat(
    new THREE.MeshStandardMaterial({ color: initialConfig.accentColor, roughness: 0.35, metalness: 0.28 })
  );
  const scarfMat = trackMat(
    new THREE.MeshStandardMaterial({ color: initialConfig.scarfColor, roughness: 0.78, metalness: 0.04 })
  );
  const pantsMat = trackMat(
    new THREE.MeshStandardMaterial({ color: initialConfig.pantsColor, roughness: 0.8, metalness: 0.04 })
  );
  const capMat = trackMat(
    new THREE.MeshStandardMaterial({ color: initialConfig.capColor, roughness: 0.65, metalness: 0.06 })
  );
  const shoeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45, metalness: 0.08 })
  );
  const eyeWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 })
  );
  const pupilMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2 })
  );
  const goldTrimMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.22, metalness: 0.88 })
  );

  // Contact shadow directly at y = 0.02
  const shadowPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(1.35, 1.35)),
    mats.contactShadow
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.025;
  root.add(shadowPlane);

  // --- Torso & Hip Pelvis ---
  const pelvis = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.2, 0.28)), pantsMat);
  pelvis.position.y = 0.82;
  pelvis.castShadow = true;
  bodyPivot.add(pelvis);

  const torso = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.52, 0.54, 0.32)), jacketMat);
  torso.position.y = 1.17;
  torso.castShadow = true;
  bodyPivot.add(torso);

  // Cream inner shirt stripe + zipper accent
  const shirtStrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.5, 0.335)), shoeMat);
  shirtStrip.position.y = 1.17;
  bodyPivot.add(shirtStrip);

  // Geometric Persian Sun/Faravahar chest emblem
  const emblem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.065, 0)), goldTrimMat);
  emblem.position.set(0.14, 1.27, -0.17);
  emblem.scale.set(1, 1, 0.4);
  bodyPivot.add(emblem);

  // Courier backpack with Persian kilim flap
  const backpack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.42, 0.18)), pantsMat);
  backpack.position.set(0, 1.18, 0.24);
  backpack.castShadow = true;
  bodyPivot.add(backpack);

  const packFlap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.39, 0.16, 0.195)), mats.persianCarpet);
  packFlap.position.set(0, 1.29, 0.245);
  bodyPivot.add(packFlap);

  // Scarf collar + trailing flowing tail (waves dynamically)
  const scarfCollar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.19, 0.055, 10, 20)), scarfMat);
  scarfCollar.rotation.x = Math.PI / 2;
  scarfCollar.position.set(0, 1.44, 0);
  bodyPivot.add(scarfCollar);

  const scarfTail = new THREE.Group();
  scarfTail.position.set(0.08, 1.42, 0.14);
  const scarfSeg1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.13, 0.04, 0.32)), scarfMat);
  scarfSeg1.position.set(0, -0.02, 0.16);
  const scarfSeg2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.035, 0.26)), accentMat);
  scarfSeg2.position.set(0, -0.04, 0.42);
  scarfTail.add(scarfSeg1, scarfSeg2);
  bodyPivot.add(scarfTail);

  // --- Head Group ---
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.5, 0);
  bodyPivot.add(headGroup);

  const neck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.075, 0.085, 0.1, 12)), skinMat);
  neck.position.y = 0.02;
  headGroup.add(neck);

  const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.21, 18, 16)), skinMat);
  head.position.y = 0.2;
  head.scale.set(0.95, 1.05, 0.96);
  head.castShadow = true;
  headGroup.add(head);

  // Expressive eyes + brows (facing -Z forward!)
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.034, 10, 10)), eyeWhiteMat);
    eye.position.set(side * 0.075, 0.21, -0.175);
    eye.scale.set(1, 1.15, 0.6);
    headGroup.add(eye);

    const pupil = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.02, 8, 8)), pupilMat);
    pupil.position.set(side * 0.075, 0.21, -0.19);
    headGroup.add(pupil);

    const brow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.065, 0.018, 0.02)), hairMat);
    brow.position.set(side * 0.075, 0.265, -0.185);
    brow.rotation.z = side * -0.12;
    headGroup.add(brow);
  }

  // Dark wavy hair crown + back
  const hairBack = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.215, 14, 12)), hairMat);
  hairBack.position.set(0, 0.22, 0.03);
  headGroup.add(hairBack);

  const ponytail = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.055, 0.18, 6, 10)), hairMat);
  ponytail.position.set(0, 0.14, 0.23);
  ponytail.rotation.x = 0.55;
  ponytail.visible = Boolean(initialConfig.hasPonytail);
  headGroup.add(ponytail);

  // Stylish street cap with turquoise/saffron visor
  const capDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.222, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)),
    capMat
  );
  capDome.position.set(0, 0.23, 0);
  capDome.rotation.x = 0.15;
  headGroup.add(capDome);

  const capVisor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.03, 0.18)), accentMat);
  capVisor.position.set(0, 0.27, -0.19);
  capVisor.rotation.x = -0.12;
  headGroup.add(capVisor);

  // --- Articulated Arms ---
  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.32, 1.38, 0);

    const upper = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.072, 0.22, 6, 10)), jacketMat);
    upper.position.y = -0.14;
    upper.castShadow = true;
    shoulder.add(upper);

    const forearm = new THREE.Group();
    forearm.position.set(0, -0.28, 0);

    const lower = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.06, 0.2, 6, 10)), skinMat);
    lower.position.y = -0.12;
    forearm.add(lower);

    const wristband = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.065, 0.065, 0.06, 10)), accentMat);
    wristband.position.y = -0.19;
    forearm.add(wristband);

    const hand = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.062, 10, 10)), skinMat);
    hand.position.y = -0.25;
    forearm.add(hand);

    shoulder.add(forearm);
    bodyPivot.add(shoulder);
    return { shoulder, forearm };
  };

  const leftArmRig = buildArm(-1);
  const rightArmRig = buildArm(1);

  // --- Articulated Legs ---
  const buildLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.135, 0.78, 0);

    const thigh = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.09, 0.26, 6, 10)), pantsMat);
    thigh.position.y = -0.17;
    thigh.castShadow = true;
    hip.add(thigh);

    const shin = new THREE.Group();
    shin.position.set(0, -0.36, 0);

    const calf = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.075, 0.24, 6, 10)), pantsMat);
    calf.position.y = -0.16;
    calf.castShadow = true;
    shin.add(calf);

    // Sneaker (white sole + accent upper)
    const shoeUpper = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.15, 0.1, 0.26)), accentMat);
    shoeUpper.position.set(0, -0.34, -0.04);
    shin.add(shoeUpper);

    const shoeSole = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.045, 0.28)), shoeMat);
    shoeSole.position.set(0, -0.395, -0.04);
    shin.add(shoeSole);

    hip.add(shin);
    bodyPivot.add(hip);
    return { hip, shin };
  };

  const leftLegRig = buildLeg(-1);
  const rightLegRig = buildLeg(1);

  // --- Flying Carpet Hoverboard Mount (visible when carpet powerup active) ---
  const carpetMount = createFlyingCarpet(mats, ownedGeos);
  carpetMount.visible = false;
  carpetMount.position.y = 0.12;
  root.add(carpetMount);

  const applyOutfit = (config: CharacterConfig) => {
    skinMat.color.setHex(config.skinColor);
    hairMat.color.setHex(config.hairColor);
    jacketMat.color.setHex(config.jacketColor);
    accentMat.color.setHex(config.accentColor);
    scarfMat.color.setHex(config.scarfColor);
    pantsMat.color.setHex(config.pantsColor);
    capMat.color.setHex(config.capColor);
    ponytail.visible = Boolean(config.hasPonytail);
  };

  return {
    root,
    bodyPivot,
    headGroup,
    leftArm: leftArmRig.shoulder,
    rightArm: rightArmRig.shoulder,
    leftForearm: leftArmRig.forearm,
    rightForearm: rightArmRig.forearm,
    leftLeg: leftLegRig.hip,
    rightLeg: rightLegRig.hip,
    leftShin: leftLegRig.shin,
    rightShin: rightLegRig.shin,
    scarfTail,
    carpetMount,
    shadowPlane,
    applyOutfit,
    dispose: () => {
      ownedGeos.forEach((g) => g.dispose());
      ownedMats.forEach((m) => m.dispose());
    },
  };
}

export function createFlyingCarpet(
  mats: GameMaterialLibrary,
  trackGeos?: THREE.BufferGeometry[]
): THREE.Group {
  const group = new THREE.Group();
  const reg = <T extends THREE.BufferGeometry>(g: T): T => {
    if (trackGeos) trackGeos.push(g);
    return g;
  };

  // Curved woven deck
  const deck = new THREE.Mesh(reg(new THREE.BoxGeometry(0.92, 0.06, 1.75)), mats.persianCarpet);
  deck.position.y = 0.06;
  deck.castShadow = true;
  group.add(deck);

  // Golden side rails
  for (const side of [-1, 1]) {
    const trim = new THREE.Mesh(reg(new THREE.BoxGeometry(0.06, 0.075, 1.78)), mats.coinGold);
    trim.position.set(side * 0.46, 0.06, 0);
    group.add(trim);
  }

  // Front & rear upturned curl + 4 golden tassels
  const frontCurl = new THREE.Mesh(reg(new THREE.CylinderGeometry(0.05, 0.05, 0.94, 10)), mats.coinGold);
  frontCurl.rotation.z = Math.PI / 2;
  frontCurl.position.set(0, 0.1, -0.88);
  group.add(frontCurl);

  for (const sx of [-0.38, 0.38]) {
    for (const sz of [-0.95, 0.95]) {
      const tassel = new THREE.Mesh(reg(new THREE.ConeGeometry(0.05, 0.18, 8)), mats.carpetGlow);
      tassel.rotation.x = sz < 0 ? -0.45 : 0.45;
      tassel.position.set(sx, 0.04, sz);
      group.add(tassel);
    }
  }

  // Hover aura ring underneath
  const aura = new THREE.Mesh(reg(new THREE.TorusGeometry(0.42, 0.03, 8, 24)), mats.carpetGlow);
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 0.01;
  group.add(aura);

  return group;
}

export interface GuardRig {
  root: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  dispose: () => void;
}

export function createMetroGuard(mats: GameMaterialLibrary): GuardRig {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const localMats: THREE.Material[] = [];

  const g = <T extends THREE.BufferGeometry>(geo: T) => {
    geos.push(geo);
    return geo;
  };
  const m = <T extends THREE.Material>(mat: T) => {
    localMats.push(mat);
    return mat;
  };

  const uniformMat = m(new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.72 }));
  const shirtMat = m(new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.75 }));
  const skinMat = m(new THREE.MeshStandardMaterial({ color: 0xd4966e, roughness: 0.65 }));
  const mustacheMat = m(new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 }));

  const shadow = new THREE.Mesh(g(new THREE.PlaneGeometry(1.45, 1.45)), mats.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  root.add(shadow);

  // Stocky torso
  const torso = new THREE.Mesh(g(new THREE.BoxGeometry(0.62, 0.6, 0.36)), uniformMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  root.add(torso);

  const vest = new THREE.Mesh(g(new THREE.BoxGeometry(0.64, 0.25, 0.38)), mats.hazardStripe);
  vest.position.y = 1.05;
  root.add(vest);

  const head = new THREE.Mesh(g(new THREE.SphereGeometry(0.22, 14, 12)), skinMat);
  head.position.y = 1.66;
  root.add(head);

  // Classic Iranian Metro Inspector mustache + peaked cap
  const mustache = new THREE.Mesh(g(new THREE.BoxGeometry(0.16, 0.04, 0.05)), mustacheMat);
  mustache.position.set(0, 1.61, -0.2);
  root.add(mustache);

  const capTop = new THREE.Mesh(g(new THREE.CylinderGeometry(0.24, 0.21, 0.14, 14)), uniformMat);
  capTop.position.set(0, 1.84, 0);
  root.add(capTop);

  const capBrim = new THREE.Mesh(g(new THREE.BoxGeometry(0.28, 0.03, 0.16)), mats.darkSteel);
  capBrim.position.set(0, 1.78, -0.18);
  root.add(capBrim);

  const badge = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.045, 0)), mats.coinGold);
  badge.position.set(0, 1.85, -0.22);
  root.add(badge);

  const buildLimb = (x: number, y: number, w: number, h: number, mat: THREE.Material) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(g(new THREE.CapsuleGeometry(w, h, 5, 8)), mat);
    mesh.position.y = -h * 0.6;
    pivot.add(mesh);
    root.add(pivot);
    return pivot;
  };

  const leftArm = buildLimb(-0.38, 1.38, 0.075, 0.36, shirtMat);
  const rightArm = buildLimb(0.38, 1.38, 0.075, 0.36, shirtMat);
  const leftLeg = buildLimb(-0.15, 0.82, 0.095, 0.44, uniformMat);
  const rightLeg = buildLimb(0.15, 0.82, 0.095, 0.44, uniformMat);

  // Flashlight in right hand
  const torch = new THREE.Mesh(g(new THREE.CylinderGeometry(0.04, 0.035, 0.2, 8)), mats.darkSteel);
  torch.rotation.x = Math.PI / 2;
  torch.position.set(0, -0.42, -0.1);
  rightArm.add(torch);

  return {
    root,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    dispose: () => {
      geos.forEach((geo) => geo.dispose());
      localMats.forEach((mat) => mat.dispose());
    },
  };
}

export interface SharedPropGeometries {
  trainGroup: (hasRamp: boolean, isMoving: boolean) => THREE.Group;
  lowBarrier: () => THREE.Group;
  highArch: () => THREE.Group;
  coin: () => THREE.Group;
  powerUp: (type: PowerUpType) => THREE.Group;
  cypressTree: () => THREE.Group;
  bazaarBuilding: (variant: number) => THREE.Group;
  pedestrianBridge: () => THREE.Group;
  dispose: () => void;
}

export function createPropFactory(mats: GameMaterialLibrary): SharedPropGeometries {
  const pool: THREE.BufferGeometry[] = [];
  const reg = <T extends THREE.BufferGeometry>(g: T): T => {
    pool.push(g);
    return g;
  };

  // Shared geometries
  const trainChassisGeo = reg(new THREE.BoxGeometry(2.12, 0.42, 11.6));
  const trainBodyGeo = reg(new THREE.BoxGeometry(2.18, 2.15, 11.8));
  const trainRoofGeo = reg(new THREE.CylinderGeometry(1.06, 1.09, 11.7, 10, 1, false, -Math.PI / 2, Math.PI));
  trainRoofGeo.rotateX(Math.PI / 2);
  trainRoofGeo.scale(1, 0.36, 1);

  const acUnitGeo = reg(new THREE.BoxGeometry(1.3, 0.28, 2.1));
  const windshieldGeo = reg(new THREE.BoxGeometry(1.75, 0.95, 0.08));
  const sideWindowGeo = reg(new THREE.BoxGeometry(0.06, 0.72, 1.35));
  const headlightGeo = reg(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12));
  headlightGeo.rotateX(Math.PI / 2);
  const wheelGeo = reg(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12));
  wheelGeo.rotateZ(Math.PI / 2);
  const rampSlopeGeo = reg(new THREE.BoxGeometry(2.05, 0.22, 6.2));
  const rampCarpetGeo = reg(new THREE.PlaneGeometry(1.72, 5.9));
  rampCarpetGeo.rotateX(-Math.PI / 2);

  const barrierPostGeo = reg(new THREE.BoxGeometry(0.14, 1.02, 0.16));
  const barrierFootGeo = reg(new THREE.BoxGeometry(0.22, 0.1, 0.68));
  const barrierBeamGeo = reg(new THREE.BoxGeometry(2.18, 0.42, 0.18));
  const beaconGeo = reg(new THREE.CylinderGeometry(0.08, 0.1, 0.16, 10));

  const archPillarGeo = reg(new THREE.BoxGeometry(0.28, 2.85, 0.34));
  const archBeamGeo = reg(new THREE.BoxGeometry(2.26, 1.25, 0.38));
  const archTrimGeo = reg(new THREE.BoxGeometry(2.38, 0.18, 0.44));

  const coinRimGeo = reg(new THREE.CylinderGeometry(0.36, 0.36, 0.09, 18));
  coinRimGeo.rotateX(Math.PI / 2);
  const coinInnerGeo = reg(new THREE.OctahedronGeometry(0.17, 0));
  coinInnerGeo.scale(1, 1, 0.4);

  // PowerUp geometries
  const magnetLoopGeo = reg(new THREE.TorusGeometry(0.32, 0.1, 10, 18, Math.PI));
  const magnetTipGeo = reg(new THREE.CylinderGeometry(0.105, 0.105, 0.24, 10));
  const bootSoleGeo = reg(new THREE.BoxGeometry(0.34, 0.12, 0.62));
  const bootShaftGeo = reg(new THREE.CylinderGeometry(0.14, 0.16, 0.38, 10));
  const bootSpringGeo = reg(new THREE.TorusGeometry(0.16, 0.04, 8, 16));
  const starGeo = reg(new THREE.OctahedronGeometry(0.38, 0));
  const starRingGeo = reg(new THREE.TorusGeometry(0.5, 0.045, 8, 24));
  const miniCarpetGeo = reg(new THREE.BoxGeometry(0.68, 0.06, 1.02));

  // Scenery geometries
  const trunkGeo = reg(new THREE.CylinderGeometry(0.18, 0.28, 2.2, 8));
  const cypressCone1Geo = reg(new THREE.ConeGeometry(1.15, 3.6, 9));
  const cypressCone2Geo = reg(new THREE.ConeGeometry(0.88, 3.2, 9));
  const cypressCone3Geo = reg(new THREE.ConeGeometry(0.52, 2.4, 9));

  const buildingBodyGeo = reg(new THREE.BoxGeometry(6.8, 10.5, 11.5));
  const buildingCorniceGeo = reg(new THREE.BoxGeometry(7.1, 0.75, 11.8));
  const buildingArchFrameGeo = reg(new THREE.BoxGeometry(0.55, 5.2, 3.2));
  const lanternBodyGeo = reg(new THREE.OctahedronGeometry(0.32, 0));

  const bridgeDeckGeo = reg(new THREE.BoxGeometry(11.8, 1.15, 3.4));
  const bridgePillarGeo = reg(new THREE.BoxGeometry(1.05, 5.4, 2.6));
  const bridgeTrimGeo = reg(new THREE.BoxGeometry(12.0, 0.45, 3.55));

  const trainGroup = (hasRamp: boolean, isMoving: boolean): THREE.Group => {
    const group = new THREE.Group();

    const chassis = new THREE.Mesh(trainChassisGeo, mats.darkSteel);
    chassis.position.y = 0.44;
    group.add(chassis);

    const body = new THREE.Mesh(trainBodyGeo, mats.metroBody);
    body.position.y = 1.66;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(trainRoofGeo, mats.metroRoof);
    roof.position.y = 2.74;
    roof.receiveShadow = true;
    group.add(roof);

    // 2 Roof AC units
    for (const zOff of [-3.1, 3.1]) {
      const ac = new THREE.Mesh(acUnitGeo, mats.platformCurb);
      ac.position.set(0, 3.04, zOff);
      group.add(ac);
    }

    // Front & rear turquoise cab mask + windshield
    for (const zSign of [-1, 1]) {
      const mask = new THREE.Mesh(
        reg(new THREE.BoxGeometry(2.14, 1.95, 0.16)),
        mats.metroFrontRed
      );
      mask.position.set(0, 1.62, zSign * 5.88);
      group.add(mask);

      const windshield = new THREE.Mesh(windshieldGeo, mats.metroWindow);
      windshield.position.set(0, 2.02, zSign * 5.95);
      group.add(windshield);

      const lightMat = zSign === 1 && isMoving ? mats.headlightGlow : mats.taillightGlow;
      for (const xSide of [-0.68, 0.68]) {
        const light = new THREE.Mesh(headlightGeo, lightMat);
        light.position.set(xSide, 0.96, zSign * 5.96);
        group.add(light);
      }
    }

    // Side recessed windows
    for (const xSide of [-1.09, 1.09]) {
      for (const zOff of [-3.8, -1.3, 1.3, 3.8]) {
        const win = new THREE.Mesh(sideWindowGeo, mats.metroWindow);
        win.position.set(xSide, 1.92, zOff);
        group.add(win);
      }
    }

    // Bogie wheels
    for (const xSide of [-0.95, 0.95]) {
      for (const zOff of [-4.2, -2.6, 2.6, 4.2]) {
        const wheel = new THREE.Mesh(wheelGeo, mats.darkSteel);
        wheel.position.set(xSide, 0.28, zOff);
        group.add(wheel);
      }
    }

    // Optional climbable Persian-carpeted loading ramp in front (+Z faces player)
    if (hasRamp) {
      const rampHolder = new THREE.Group();
      // Train front is at z = +5.9. Ramp goes from z = +5.9 (y=2.95) down to z = +11.4 (y=0.05)
      rampHolder.position.set(0, 1.5, 8.65);
      rampHolder.rotation.x = 0.495; // ~28.3 deg climbable slope

      const plank = new THREE.Mesh(rampSlopeGeo, mats.woodPlank);
      plank.castShadow = true;
      plank.receiveShadow = true;
      rampHolder.add(plank);

      const rug = new THREE.Mesh(rampCarpetGeo, mats.persianCarpet);
      rug.position.y = 0.125;
      rug.receiveShadow = true;
      rampHolder.add(rug);

      group.add(rampHolder);
    }

    return group;
  };

  const lowBarrier = (): THREE.Group => {
    const group = new THREE.Group();
    for (const xSide of [-0.88, 0.88]) {
      const foot = new THREE.Mesh(barrierFootGeo, mats.darkSteel);
      foot.position.set(xSide, 0.05, 0);
      group.add(foot);

      const post = new THREE.Mesh(barrierPostGeo, mats.darkSteel);
      post.position.set(xSide, 0.54, 0);
      post.castShadow = true;
      group.add(post);
    }
    const beam = new THREE.Mesh(barrierBeamGeo, mats.hazardStripe);
    beam.position.y = 0.82;
    beam.castShadow = true;
    group.add(beam);

    const beacon = new THREE.Mesh(beaconGeo, mats.headlightGlow);
    beacon.position.set(0, 1.11, 0);
    group.add(beacon);
    return group;
  };

  const highArch = (): THREE.Group => {
    const group = new THREE.Group();
    for (const xSide of [-0.98, 0.98]) {
      const pillar = new THREE.Mesh(archPillarGeo, mats.bazaarBrick);
      pillar.position.set(xSide, 1.425, 0);
      pillar.castShadow = true;
      group.add(pillar);
    }
    const beam = new THREE.Mesh(archBeamGeo, mats.persianTile);
    beam.position.y = 2.25;
    beam.castShadow = true;
    group.add(beam);

    const trim = new THREE.Mesh(archTrimGeo, mats.coinGold);
    trim.position.y = 1.62;
    group.add(trim);
    return group;
  };

  const coin = (): THREE.Group => {
    const group = new THREE.Group();
    const rim = new THREE.Mesh(coinRimGeo, mats.coinGold);
    const core = new THREE.Mesh(coinInnerGeo, mats.lanternGlow);
    group.add(rim, core);
    return group;
  };

  const powerUp = (type: PowerUpType): THREE.Group => {
    const group = new THREE.Group();
    const halo = new THREE.Mesh(starRingGeo, mats.carpetGlow);
    group.add(halo);

    if (type === 'magnet') {
      const u = new THREE.Mesh(magnetLoopGeo, mats.magnetRed);
      u.position.y = 0.04;
      const tipL = new THREE.Mesh(magnetTipGeo, mats.magnetChrome);
      tipL.position.set(-0.32, -0.08, 0);
      const tipR = new THREE.Mesh(magnetTipGeo, mats.magnetChrome);
      tipR.position.set(0.32, -0.08, 0);
      group.add(u, tipL, tipR);
    } else if (type === 'boots') {
      const sole = new THREE.Mesh(bootSoleGeo, mats.platformCurb);
      sole.position.set(0, -0.18, -0.04);
      const shaft = new THREE.Mesh(bootShaftGeo, mats.bootsEmerald);
      shaft.position.set(0, 0.05, 0.06);
      const spring = new THREE.Mesh(bootSpringGeo, mats.coinGold);
      spring.rotation.x = Math.PI / 2;
      spring.position.set(0, -0.28, 0);
      group.add(sole, shaft, spring);
    } else if (type === 'multiplier') {
      const star = new THREE.Mesh(starGeo, mats.multiplierPurple);
      const core = new THREE.Mesh(coinInnerGeo, mats.coinGold);
      core.scale.setScalar(1.6);
      group.add(star, core);
    } else {
      const rug = new THREE.Mesh(miniCarpetGeo, mats.persianCarpet);
      rug.rotation.x = 0.25;
      rug.rotation.z = 0.18;
      group.add(rug);
    }
    return group;
  };

  const cypressTree = (): THREE.Group => {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, mats.cypressTrunk);
    trunk.position.y = 1.1;
    group.add(trunk);

    const c1 = new THREE.Mesh(cypressCone1Geo, mats.cypressFoliage);
    c1.position.y = 3.2;
    c1.castShadow = true;
    const c2 = new THREE.Mesh(cypressCone2Geo, mats.cypressFoliage);
    c2.position.y = 5.0;
    const c3 = new THREE.Mesh(cypressCone3Geo, mats.cypressFoliage);
    c3.position.y = 6.6;
    group.add(c1, c2, c3);
    return group;
  };

  const bazaarBuilding = (variant: number): THREE.Group => {
    const group = new THREE.Group();
    const heightScale = variant % 2 === 0 ? 1.0 : 1.24;
    const body = new THREE.Mesh(buildingBodyGeo, mats.bazaarBrick);
    body.scale.y = heightScale;
    body.position.y = (10.5 * heightScale) / 2;
    body.receiveShadow = true;
    group.add(body);

    // Turquoise tiled cornice at top
    const cornice = new THREE.Mesh(buildingCorniceGeo, mats.persianTile);
    cornice.position.y = 10.5 * heightScale + 0.32;
    group.add(cornice);

    // Recessed Persian arch bays on street-facing wall (x local face)
    for (const zOff of [-3.4, 3.4]) {
      const archTile = new THREE.Mesh(buildingArchFrameGeo, mats.persianTile);
      archTile.position.set(0, 2.8, zOff);
      group.add(archTile);

      const lantern = new THREE.Mesh(lanternBodyGeo, mats.lanternGlow);
      lantern.position.set(0, 5.1, zOff);
      group.add(lantern);
    }
    return group;
  };

  const pedestrianBridge = (): THREE.Group => {
    const group = new THREE.Group();
    for (const xSide of [-5.2, 5.2]) {
      const pillar = new THREE.Mesh(bridgePillarGeo, mats.bazaarBrick);
      pillar.position.set(xSide, 2.7, 0);
      group.add(pillar);
    }
    const deck = new THREE.Mesh(bridgeDeckGeo, mats.platformCurb);
    deck.position.y = 5.6;
    group.add(deck);

    const tileFascia = new THREE.Mesh(bridgeTrimGeo, mats.persianTile);
    tileFascia.position.y = 5.95;
    group.add(tileFascia);
    return group;
  };

  return {
    trainGroup,
    lowBarrier,
    highArch,
    coin,
    powerUp,
    cypressTree,
    bazaarBuilding,
    pedestrianBridge,
    dispose: () => {
      pool.forEach((g) => g.dispose());
    },
  };
}

export function buildBaseTrackChunk(
  mats: GameMaterialLibrary,
  props: SharedPropGeometries,
  chunkIndex: number
): { group: THREE.Group; disposables: THREE.BufferGeometry[] } {
  const group = new THREE.Group();
  const disposables: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T) => {
    disposables.push(g);
    return g;
  };

  // Track ballast plane (width 10.6m, length CHUNK_LENGTH)
  const bed = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(10.6, CHUNK_LENGTH)),
    mats.trackBed
  );
  bed.rotation.x = -Math.PI / 2;
  bed.receiveShadow = true;
  group.add(bed);

  // Outer ground apron extending beyond curbs so world never looks like a floating strip
  const groundApron = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(120, CHUNK_LENGTH)),
    mats.platformCurb
  );
  groundApron.rotation.x = -Math.PI / 2;
  groundApron.position.y = -0.08;
  groundApron.receiveShadow = true;
  group.add(groundApron);

  // 6 Steel Rails (2 per lane)
  const railGeo = trackGeo(new THREE.BoxGeometry(0.1, 0.12, CHUNK_LENGTH));
  for (const laneX of LANE_POSITIONS) {
    for (const rOff of [-0.62, 0.62]) {
      const rail = new THREE.Mesh(railGeo, mats.steelRail);
      rail.position.set(laneX + rOff, 0.06, 0);
      group.add(rail);
    }
  }

  // Raised Station Curbs on left & right with Persian tile trim
  const curbGeo = trackGeo(new THREE.BoxGeometry(2.2, 0.55, CHUNK_LENGTH));
  const curbTrimGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.58, CHUNK_LENGTH));
  for (const side of [-1, 1]) {
    const curb = new THREE.Mesh(curbGeo, mats.platformCurb);
    curb.position.set(side * 6.3, 0.27, 0);
    curb.receiveShadow = true;
    group.add(curb);

    const trim = new THREE.Mesh(curbTrimGeo, mats.persianTile);
    trim.position.set(side * 5.22, 0.29, 0);
    group.add(trim);
  }

  // Flanking Bazaar Buildings & Persian Cypress Trees
  for (const zOff of [-CHUNK_LENGTH * 0.25, CHUNK_LENGTH * 0.25]) {
    for (const side of [-1, 1]) {
      const bldg = props.bazaarBuilding(chunkIndex + (side > 0 ? 1 : 0));
      bldg.position.set(side * 10.6, 0, zOff);
      // Orient arch bays facing inward toward track
      bldg.rotation.y = side < 0 ? 0 : Math.PI;
      // Offset arch bays onto inner face
      bldg.children.forEach((c, idx) => {
        if (idx >= 2) c.position.x = 3.45;
      });
      group.add(bldg);
    }
  }

  // Cypress trees along platform edges
  for (const side of [-1, 1]) {
    const tree = props.cypressTree();
    tree.position.set(side * 6.45, 0.52, 0);
    const s = 0.85 + ((chunkIndex * 7 + (side > 0 ? 3 : 1)) % 5) * 0.06;
    tree.scale.setScalar(s);
    group.add(tree);
  }

  // Every 3rd chunk gets an overhead Persian tiled pedestrian bridge
  if (chunkIndex % 3 === 1) {
    const bridge = props.pedestrianBridge();
    bridge.position.z = 0;
    group.add(bridge);
  }

  return { group, disposables };
}

export function createMiladSkyline(mats: GameMaterialLibrary): {
  group: THREE.Group;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const g = <T extends THREE.BufferGeometry>(geo: T) => {
    geos.push(geo);
    return geo;
  };

  // Distant Milad-inspired Tower centered softly on the far horizon
  const shaft = new THREE.Mesh(g(new THREE.CylinderGeometry(1.4, 3.2, 68, 8)), mats.miladConcrete);
  shaft.position.set(16, 34, -185);
  group.add(shaft);

  const pod = new THREE.Mesh(g(new THREE.CylinderGeometry(6.5, 4.4, 9.5, 12)), mats.persianTile);
  pod.position.set(16, 62, -185);
  group.add(pod);

  const domeCap = new THREE.Mesh(g(new THREE.ConeGeometry(4.2, 7.5, 12)), mats.miladConcrete);
  domeCap.position.set(16, 70, -185);
  group.add(domeCap);

  const spire = new THREE.Mesh(g(new THREE.CylinderGeometry(0.22, 0.6, 22, 8)), mats.steelRail);
  spire.position.set(16, 84, -185);
  group.add(spire);

  // Subtle Alborz-style distant mountain ridge silhouettes
  const ridgeMat = new THREE.MeshStandardMaterial({
    color: 0x6b7c93,
    roughness: 0.95,
    metalness: 0.0,
  });
  const mountainOffsets = [-115, -55, 25, 95, 155];
  mountainOffsets.forEach((mx, i) => {
    const m = new THREE.Mesh(
      g(new THREE.ConeGeometry(42 + (i % 3) * 14, 34 + (i % 2) * 16, 6)),
      ridgeMat
    );
    m.position.set(mx, 14, -225);
    m.scale.set(1.5, 1, 0.7);
    group.add(m);
  });

  return {
    group,
    dispose: () => {
      geos.forEach((geo) => geo.dispose());
      ridgeMat.dispose();
    },
  };
}
