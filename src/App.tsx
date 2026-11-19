import { useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { GameOverModal, PauseModal } from './components/ModalOverlays';
import { OfflineIndicator } from './components/PWAInstallButton';
import { TitleOverlay } from './components/TitleOverlay';
import { RunnerEngine } from './game/engine';
import type { CharacterId, HudSnapshot } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  score: 0,
  highScore: 0,
  coins: 0,
  totalBankCoins: 0,
  distance: 0,
  speedKmh: 48,
  multiplier: 1,
  carpetCharges: 2,
  stumbleWarning: false,
  powerUps: { magnet: 0, boots: 0, multiplier: 0, carpet: 0 },
  characterId: 'kian',
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RunnerEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new RunnerEngine(container, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStart = () => {
    engineRef.current?.startRun();
  };

  const handleSelectCharacter = (id: CharacterId) => {
    engineRef.current?.setCharacter(id);
  };

  const handleTogglePause = () => {
    engineRef.current?.togglePause();
  };

  const handleReturnTitle = () => {
    engineRef.current?.returnToTitle();
  };

  const handleActivateCarpet = () => {
    engineRef.current?.activateCarpet();
  };

  const handleToggleMute = () => {
    if (!engineRef.current) return;
    setMuted(engineRef.current.toggleMute());
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {/* Isolated WebGL mount container: React state updates never re-create the canvas */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {hud.phase === 'title' && (
        <TitleOverlay
          characterId={hud.characterId}
          highScore={hud.highScore}
          totalBankCoins={hud.totalBankCoins}
          muted={muted}
          onSelectCharacter={handleSelectCharacter}
          onStart={handleStart}
          onToggleMute={handleToggleMute}
        />
      )}

      {(hud.phase === 'playing' || hud.phase === 'paused') && (
        <GameHud
          hud={hud}
          muted={muted}
          onTogglePause={handleTogglePause}
          onToggleMute={handleToggleMute}
          onActivateCarpet={handleActivateCarpet}
        />
      )}

      {hud.phase === 'paused' && (
        <PauseModal
          hud={hud}
          onResume={handleTogglePause}
          onRestart={handleStart}
          onTitle={handleReturnTitle}
        />
      )}

      {hud.phase === 'gameover' && (
        <GameOverModal
          hud={hud}
          onRestart={handleStart}
          onTitle={handleReturnTitle}
        />
      )}

      <OfflineIndicator />
    </main>
  );
}
