import { Play, RotateCcw, Home } from 'lucide-react';
import type { HudSnapshot } from '../game/types';

interface PauseModalProps {
  hud: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export function PauseModal({ hud, onResume, onRestart, onTitle }: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-amber-400/25 bg-slate-950/95 p-6 text-center shadow-2xl">
        <h2 className="text-2xl font-black text-white">توقف بازی</h2>
        <p className="mt-1 text-sm text-slate-300">
          امتیاز فعلی: <span className="font-mono-num font-bold text-amber-300">{hud.score.toLocaleString('en-US')}</span>
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-base font-black text-slate-950 transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-white"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            <span>ادامه بازی</span>
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <RotateCcw className="h-4 w-4" />
            <span>شروع مجدد</span>
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <Home className="h-4 w-4" />
            <span>بازگشت به صفحه اصلی</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface GameOverModalProps {
  hud: HudSnapshot;
  onRestart: () => void;
  onTitle: () => void;
}

export function GameOverModal({ hud, onRestart, onTitle }: GameOverModalProps) {
  const isNewRecord = hud.score > 0 && hud.score >= hud.highScore;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-md rounded-3xl border border-amber-400/30 bg-slate-950/95 p-6 text-center shadow-2xl">
        <p className="text-xs font-bold text-amber-400">
          {isNewRecord ? 'رکورد جدید ثبت شد!' : 'پایان دویدن'}
        </p>
        <h2 className="mt-1 text-3xl font-black text-white">متوقف شدی!</h2>
        {hud.crashReason && (
          <p className="mt-1 text-sm text-slate-300">{hud.crashReason}</p>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-900/90 p-3.5">
          <div>
            <div className="text-xs text-slate-400">امتیاز</div>
            <div className="mt-0.5 font-mono-num text-xl font-bold text-white">
              {hud.score.toLocaleString('en-US')}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">مسافت</div>
            <div className="mt-0.5 font-mono-num text-xl font-bold text-cyan-300">
              {hud.distance}m
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">سکه</div>
            <div className="mt-0.5 font-mono-num text-xl font-bold text-amber-300">
              {hud.coins.toLocaleString('en-US')}
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          بهترین رکورد: <span className="font-mono-num font-bold text-slate-200">{hud.highScore.toLocaleString('en-US')}</span>
          {' · '}
          کل سکه‌ها: <span className="font-mono-num font-bold text-amber-300">{hud.totalBankCoins.toLocaleString('en-US')}</span>
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onRestart}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-base font-black text-slate-950 transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-white"
          >
            <RotateCcw className="h-4 w-4" />
            <span>دوباره بدو</span>
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <Home className="h-4 w-4" />
            <span>منو</span>
          </button>
        </div>
      </div>
    </div>
  );
}
