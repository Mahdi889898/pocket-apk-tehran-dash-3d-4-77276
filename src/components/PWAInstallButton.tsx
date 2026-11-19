import { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="pointer-events-auto flex h-11 items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-600/95 px-4 text-sm font-bold text-white shadow-lg transition-colors hover:bg-cyan-500 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>نصب بازی (PWA)</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="pointer-events-auto flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-slate-950/85 px-4 text-sm font-bold text-amber-100 shadow-lg transition-colors hover:bg-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <Smartphone className="h-4 w-4 shrink-0" />
          <span>نصب روی آیفون</span>
        </button>

        {showIOSGuide && (
          <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-amber-400/30 bg-slate-950 p-6 text-right shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-black text-white">نصب روی آیفون و آیپد</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="بستن"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-2 text-sm leading-relaxed text-slate-300">
                <li>۱. در نوار پایین مرورگر Safari دکمه <strong>Share</strong> را بزنید.</li>
                <li>۲. صفحه را به پایین بکشید و <strong>Add to Home Screen</strong> را انتخاب کنید.</li>
                <li>۳. گزینه <strong>Add</strong> را بزنید تا آیکون بازی به صفحه اصلی اضافه شود.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-slate-950/90 px-3.5 py-2 text-xs font-bold text-amber-200 shadow-lg">
      <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
      <span>حالت آفلاین · بازی با فایل‌های ذخیره‌شده</span>
    </div>
  );
}
