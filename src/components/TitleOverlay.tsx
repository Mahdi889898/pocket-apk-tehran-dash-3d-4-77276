import { Volume2, VolumeX, Play } from 'lucide-react';
import { CHARACTERS, type CharacterId } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleOverlayProps {
  characterId: CharacterId;
  highScore: number;
  totalBankCoins: number;
  muted: boolean;
  onSelectCharacter: (id: CharacterId) => void;
  onStart: () => void;
  onToggleMute: () => void;
}

export function TitleOverlay({
  characterId,
  highScore,
  totalBankCoins,
  muted,
  onSelectCharacter,
  onStart,
  onToggleMute,
}: TitleOverlayProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-5 md:p-8">
      {/* Top Row: Title Lockup + Install & Audio Mute */}
      <div className="flex items-start justify-between gap-4">
        {/* Bespoke inline SVG Persian Arch + Title Lockup over sky negative space */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="flex items-center gap-3.5">
            <svg
              width="54"
              height="54"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="shrink-0 drop-shadow-md"
            >
              <path
                d="M12 56V28C12 16.5 22 9 32 6C42 9 52 16.5 52 28V56H12Z"
                fill="#0F172A"
                fillOpacity="0.88"
                stroke="#F59E0B"
                strokeWidth="2.5"
              />
              <path
                d="M20 56V31C20 22.5 26 17.5 32 15C38 17.5 44 22.5 44 31V56"
                stroke="#06B6D4"
                strokeWidth="2.5"
              />
              <path
                d="M25 56L29 36H35L39 56"
                stroke="#FBBF24"
                strokeWidth="2"
              />
              <circle cx="32" cy="24" r="3.5" fill="#FBBF24" />
            </svg>
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.65)]">
                تهران دَش
              </h1>
              <div className="mt-0.5 flex items-center gap-2 text-xs md:text-sm font-semibold text-amber-100/95 drop-shadow">
                <span>TEHRAN DASH 3D</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">
                  رکورد {highScore.toLocaleString('en-US')}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">
                  سکه {totalBankCoins.toLocaleString('en-US')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'روشن کردن صدا' : 'قطع صدا'}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-slate-950/85 text-amber-100 transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Bottom Dock: Character Selector + Primary Start CTA + Single Control-Hint Line */}
      <div className="flex flex-col items-center gap-3.5">
        {/* Character switcher */}
        <div
          role="group"
          aria-label="انتخاب شخصیت ایرانی"
          className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/15 bg-slate-950/85 p-1.5 shadow-2xl"
        >
          {CHARACTERS.map((char) => {
            const active = char.id === characterId;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => onSelectCharacter(char.id)}
                className={`flex items-center gap-2.5 rounded-xl px-4 py-2 text-sm font-bold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  active
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                <span
                  className="h-3 w-3 rounded-sm border border-white/40"
                  style={{
                    backgroundColor: `#${char.jacketColor
                      .toString(16)
                      .padStart(6, '0')}`,
                  }}
                />
                <span>{char.nameFa}</span>
                <span className="hidden sm:inline text-xs font-normal opacity-80">
                  {char.subtitleFa}
                </span>
              </button>
            );
          })}
        </div>

        {/* Primary Start CTA */}
        <button
          type="button"
          onClick={onStart}
          className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-amber-300/40 bg-amber-500 px-10 py-3.5 text-lg font-black text-slate-950 shadow-xl transition-transform hover:scale-[1.02] hover:bg-amber-400 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-white"
        >
          <Play className="h-5 w-5 fill-slate-950" />
          <span>شروع دویدن</span>
        </button>

        {/* Single flat control-hint line */}
        <p className="rounded-lg bg-slate-950/75 px-4 py-1.5 text-center text-xs md:text-sm font-medium text-slate-200">
          ← → تغییر خط · ↑ / Space پرش · ↓ سر خوردن · Shift قالیچه پرنده · Esc توقف
        </p>
      </div>
    </div>
  );
}
