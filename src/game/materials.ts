import * as THREE from 'three';
import type { ProceduralTextureSet } from './textures';

export interface GameMaterialLibrary {
  trackBed: THREE.MeshStandardMaterial;
  steelRail: THREE.MeshStandardMaterial;
  platformCurb: THREE.MeshStandardMaterial;
  persianTile: THREE.MeshStandardMaterial;
  bazaarBrick: THREE.MeshStandardMaterial;
  persianCarpet: THREE.MeshStandardMaterial;
  hazardStripe: THREE.MeshStandardMaterial;
  metroBody: THREE.MeshStandardMaterial;
  metroRoof: THREE.MeshStandardMaterial;
  metroWindow: THREE.MeshPhysicalMaterial;
  metroFrontRed: THREE.MeshStandardMaterial;
  headlightGlow: THREE.MeshStandardMaterial;
  taillightGlow: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  woodPlank: THREE.MeshStandardMaterial;
  coinGold: THREE.MeshPhysicalMaterial;
  magnetRed: THREE.MeshStandardMaterial;
  magnetChrome: THREE.MeshStandardMaterial;
  bootsEmerald: THREE.MeshStandardMaterial;
  multiplierPurple: THREE.MeshStandardMaterial;
  carpetGlow: THREE.MeshStandardMaterial;
  cypressFoliage: THREE.MeshStandardMaterial;
  cypressTrunk: THREE.MeshStandardMaterial;
  lanternGlow: THREE.MeshStandardMaterial;
  miladConcrete: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function createMaterialLibrary(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean
): GameMaterialLibrary {
  const trackBed = new THREE.MeshStandardMaterial({
    map: textures.trackBed,
    roughness: 0.92,
    metalness: 0.04,
  });

  const steelRail = new THREE.MeshStandardMaterial({
    color: 0xb8c4cf,
    roughness: 0.24,
    metalness: 0.88,
  });

  const platformCurb = new THREE.MeshStandardMaterial({
    color: 0xd6cfc2,
    roughness: 0.78,
    metalness: 0.05,
  });

  const persianTile = new THREE.MeshStandardMaterial({
    map: textures.persianTile,
    roughness: 0.28,
    metalness: 0.12,
  });

  const bazaarBrick = new THREE.MeshStandardMaterial({
    map: textures.bazaarBrick,
    roughness: 0.88,
    metalness: 0.02,
  });

  const persianCarpet = new THREE.MeshStandardMaterial({
    map: textures.persianCarpet,
    roughness: 0.85,
    metalness: 0.04,
  });

  const hazardStripe = new THREE.MeshStandardMaterial({
    map: textures.hazardStripe,
    roughness: 0.45,
    metalness: 0.08,
  });

  const metroBody = new THREE.MeshStandardMaterial({
    map: textures.metroLivery,
    roughness: 0.34,
    metalness: 0.38,
  });

  const metroRoof = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.52,
    metalness: 0.45,
  });

  const metroWindow = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.12,
    metalness: 0.2,
    clearcoat: isSoftwareGl ? 0 : 0.9,
    clearcoatRoughness: 0.1,
  });

  const metroFrontRed = new THREE.MeshStandardMaterial({
    color: 0x0e7490,
    roughness: 0.3,
    metalness: 0.35,
  });

  const headlightGlow = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  const taillightGlow = new THREE.MeshStandardMaterial({
    color: 0xfca5a5,
    emissive: 0xef4444,
    emissiveIntensity: 1.4,
    roughness: 0.25,
  });

  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.55,
    metalness: 0.72,
  });

  const woodPlank = new THREE.MeshStandardMaterial({
    color: 0x7c4a2d,
    roughness: 0.82,
    metalness: 0.03,
  });

  const coinGold = new THREE.MeshPhysicalMaterial({
    color: 0xfbbf24,
    roughness: 0.18,
    metalness: 0.92,
    anisotropy: isSoftwareGl ? 0 : 0.75,
    emissive: 0x92400e,
    emissiveIntensity: 0.22,
  });

  const magnetRed = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.3,
    metalness: 0.35,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.35,
  });

  const magnetChrome = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.18,
    metalness: 0.9,
  });

  const bootsEmerald = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.32,
    metalness: 0.25,
    emissive: 0x065f46,
    emissiveIntensity: 0.35,
  });

  const multiplierPurple = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.25,
    metalness: 0.45,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.45,
  });

  const carpetGlow = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.85,
    roughness: 0.28,
    metalness: 0.65,
  });

  const cypressFoliage = new THREE.MeshStandardMaterial({
    color: 0x1b4d3e,
    roughness: 0.86,
    metalness: 0.02,
  });

  const cypressTrunk = new THREE.MeshStandardMaterial({
    color: 0x4a3222,
    roughness: 0.92,
    metalness: 0.0,
  });

  const lanternGlow = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });

  const miladConcrete = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.72,
    metalness: 0.12,
  });

  const contactShadow = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
  });

  const all: THREE.Material[] = [
    trackBed,
    steelRail,
    platformCurb,
    persianTile,
    bazaarBrick,
    persianCarpet,
    hazardStripe,
    metroBody,
    metroRoof,
    metroWindow,
    metroFrontRed,
    headlightGlow,
    taillightGlow,
    darkSteel,
    woodPlank,
    coinGold,
    magnetRed,
    magnetChrome,
    bootsEmerald,
    multiplierPurple,
    carpetGlow,
    cypressFoliage,
    cypressTrunk,
    lanternGlow,
    miladConcrete,
    contactShadow,
  ];

  return {
    trackBed,
    steelRail,
    platformCurb,
    persianTile,
    bazaarBrick,
    persianCarpet,
    hazardStripe,
    metroBody,
    metroRoof,
    metroWindow,
    metroFrontRed,
    headlightGlow,
    taillightGlow,
    darkSteel,
    woodPlank,
    coinGold,
    magnetRed,
    magnetChrome,
    bootsEmerald,
    multiplierPurple,
    carpetGlow,
    cypressFoliage,
    cypressTrunk,
    lanternGlow,
    miladConcrete,
    contactShadow,
    dispose: () => {
      all.forEach((m) => m.dispose());
    },
  };
}
