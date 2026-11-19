import { Pause, Volume2, VolumeX, Magnet, Zap, Sparkles, Shield } from 'lucide-react';
import type { HudSnapshot } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onActivateCarpet: () => void;
}

export function GameHud({
  hud,
  muted,
  onTogglePause,
  onToggleMute,
  onActivateCarpet,
}: GameHudProps) {
  const activeTimers: Array<{
    key: string;
    label: string;
    sec: number;
    max: number;
    color: string;
    icon: typeof Magnet;
  }> = [];

  if (hud.powerUps.magnet > 0) {
    activeTimers.push({
      key: 'magnet',
      label: 'آهنربا',
      sec: hud.powerUps.magnet,
      max: 11,
      color: 'bg-red-500',
      icon: Magnet,
    });
  }
  if (hud.powerUps.boots > 0) {
    activeTimers.push({
      key: 'boots',
      label: 'چکمه پرش',
      sec: hud.powerUps.boots,
      max: 11,
      color: 'bg-emerald-500',
      icon: Zap,
    });
  }
  if (hud.powerUps.multiplier > 0) {
    activeTimers.push({
      key: 'multiplier',
      label: 'ضریب ۲x',
      sec: hud.powerUps.multiplier,
      max: 12,
      color: 'bg-blue-500',
      icon: Sparkles,
    });
  }
  if (hud.powerUps.carpet > 0) {
    activeTimers.push({
      key: 'carpet',
      label: 'قالیچه پرنده',
      sec: hud.powerUps.carpet,
      max: 10,
      color: 'bg-amber-500',
      icon: Shield,
    });
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 md:p-6">
      {/* Top Perimeter Bar */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Right (RTL Start): Score & Distance */}
        <div className="flex flex-col gap-1 rounded-2xl border border-white/15 bg-slate-950/85 px-4 py-2.5 shadow-lg">
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono-num text-2xl md:text-3xl font-bold text-white">
              {hud.score.toLocaleString('en-US')}
            </span>
            {hud.multiplier > 1 && (
              <span className="font-mono-num text-sm font-bold text-amber-400">
                ×{hud.multiplier}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-mono-num">{hud.distance}m</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">{hud.speedKmh} km/h</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">
              رکورد {hud.highScore.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {/* Center Stumble Warning (only when guard is chasing closely) */}
        {hud.stumbleWarning && (
          <div className="rounded-xl border border-amber-400/50 bg-red-950/90 px-4 py-2 text-xs md:text-sm font-bold text-amber-200 shadow-lg">
            هشدار! آقا مصطفی پشت سرته
          </div>
        )}

        {/* Top-Left (RTL End): Coins + Audio + Pause */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-slate-950/85 px-3.5 py-2 shadow-lg">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" fill="#FBBF24" stroke="#B45309" strokeWidth="2" />
              <circle cx="12" cy="12" r="4" fill="#FEF3C7" />
            </svg>
            <span className="font-mono-num text-base md:text-lg font-bold text-amber-300">
              {hud.coins.toLocaleString('en-US')}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'روشن کردن صدا' : 'قطع صدا'}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-slate-950/85 text-slate-100 transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            aria-label="توقف بازی"
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-slate-950/85 text-slate-100 transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <Pause className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Bottom Perimeter Bar */}
      <div className="flex items-end justify-between gap-4">
        {/* Flying Carpet Hoverboard Action Button (RTL Start) */}
        <button
          type="button"
          onClick={onActivateCarpet}
          disabled={hud.carpetCharges <= 0 || hud.powerUps.carpet > 0}
          className={`pointer-events-auto flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-bold shadow-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
            hud.powerUps.carpet > 0
              ? 'border-amber-400 bg-amber-600/90 text-white'
              : hud.carpetCharges > 0
              ? 'border-amber-400/40 bg-slate-950/88 text-amber-200 hover:bg-slate-900'
              : 'border-white/10 bg-slate-950/65 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Shield className="h-4 w-4 shrink-0" />
          <span>قالیچه پرنده</span>
          <span className="font-mono-num text-xs opacity-90">
            ({hud.carpetCharges}) · Shift
          </span>
        </button>

        {/* Active Power-Up Timers (RTL End) */}
        {activeTimers.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {activeTimers.map((t) => {
              const Icon = t.icon;
              const pct = Math.max(0, Math.min(100, (t.sec / t.max) * 100));
              return (
                <div
                  key={t.key}
                  className="flex w-44 flex-col gap-1 rounded-xl border border-white/15 bg-slate-950/85 px-3 py-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-100">
                    <span className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-amber-300" />
                      {t.label}
                    </span>
                    <span className="font-mono-num text-slate-300">
                      {Math.ceil(t.sec)}s
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full ${t.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
