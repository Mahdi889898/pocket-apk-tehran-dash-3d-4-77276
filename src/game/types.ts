export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type PowerUpType = 'magnet' | 'boots' | 'multiplier' | 'carpet';

export type CharacterId = 'kian' | 'parisa' | 'rostam';

export interface CharacterConfig {
  id: CharacterId;
  nameFa: string;
  subtitleFa: string;
  jacketColor: number;
  accentColor: number;
  scarfColor: number;
  pantsColor: number;
  skinColor: number;
  hairColor: number;
  capColor: number;
  hasPonytail?: boolean;
}

export const CHARACTERS: CharacterConfig[] = [
  {
    id: 'kian',
    nameFa: 'کیان',
    subtitleFa: 'تیپ خیابان ولیعصر',
    jacketColor: 0xb91c1c, // Deep Persian crimson
    accentColor: 0x06b6d4, // Turquoise accent
    scarfColor: 0xf59e0b,  // Saffron gold scarf
    pantsColor: 0x1e293b,  // Slate indigo denim
    skinColor: 0xd99b72,
    hairColor: 0x181311,
    capColor: 0x0f766e,    // Turquoise cap
  },
  {
    id: 'parisa',
    nameFa: 'پریسا',
    subtitleFa: 'تیپ فیروزه اصفهان',
    jacketColor: 0x0e7490, // Isfahan turquoise
    accentColor: 0xf59e0b, // Saffron trim
    scarfColor: 0xe11d48,  // Pomegranate rose shawl
    pantsColor: 0x1f2937,
    skinColor: 0xe2ab84,
    hairColor: 0x1c1411,
    capColor: 0xf59e0b,
    hasPonytail: true,
  },
  {
    id: 'rostam',
    nameFa: 'سهراب',
    subtitleFa: 'تیپ لاجورد و طلا',
    jacketColor: 0x1e3a8a, // Persian lapis lazuli
    accentColor: 0xfbbf24, // Gold trim
    scarfColor: 0x14b8a6,  // Turquoise scarf
    pantsColor: 0x27272a,
    skinColor: 0xcf8e64,
    hairColor: 0x14100e,
    capColor: 0x991b1b,
  },
];

export const LANE_POSITIONS = [-2.65, 0, 2.65] as const;
export const CHUNK_LENGTH = 42;
export const VISIBLE_CHUNKS = 7;

export interface ActivePowerUps {
  magnet: number;      // seconds remaining
  boots: number;       // seconds remaining
  multiplier: number;  // seconds remaining
  carpet: number;      // seconds remaining
}

export interface HudSnapshot {
  phase: GamePhase;
  score: number;
  highScore: number;
  coins: number;
  totalBankCoins: number;
  distance: number;
  speedKmh: number;
  multiplier: number;
  carpetCharges: number;
  stumbleWarning: boolean;
  powerUps: ActivePowerUps;
  characterId: CharacterId;
  crashReason?: string;
}
