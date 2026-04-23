import { useState, useEffect, useRef } from 'react';
import { Music2, VolumeX, Volume2 } from 'lucide-react';

const TRACKS = ['/musicas/1.mp3', '/musicas/2.mp3'];

function pickRandom(exclude) {
  const pool = TRACKS.filter(t => t !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function MusicPlayer() {
  const audioRef  = useRef(null);
  const [muted,   setMuted]   = useState(false);
  const [visible, setVisible] = useState(true);
  const [track,   setTrack]   = useState(() => TRACKS[Math.floor(Math.random() * TRACKS.length)]);

  // Attempt autoplay on mount — browsers require user gesture, so we silently swallow the error
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;
    audio.src    = track;
    audio.play().catch(() => {});
  }, []);

  // When track changes, play new one
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = track;
    audio.play().catch(() => {});
  }, [track]);

  function handleEnded() {
    setTrack(prev => pickRandom(prev));
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    if (muted) {
      audio.muted = false;
      audio.play().catch(() => {});
    } else {
      audio.muted = true;
    }
    setMuted(m => !m);
  }

  if (!visible) return null;

  return (
    <>
      <audio ref={audioRef} onEnded={handleEnded} loop={TRACKS.length === 1} />

      <div className="fixed bottom-20 right-3 md:bottom-4 z-50 flex items-center gap-1.5">
        {/* Dismiss */}
        <button
          onClick={() => { audioRef.current?.pause(); setVisible(false); }}
          className="w-7 h-7 rounded-full bg-g-card/80 border border-g-border
                     flex items-center justify-center text-g-muted hover:text-white
                     text-xs transition-colors backdrop-blur-sm"
          title="Cerrar música">
          ×
        </button>

        {/* Mute toggle */}
        <button
          onClick={toggleMute}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs
                      font-semibold backdrop-blur-sm transition-all duration-200
                      ${muted
                        ? 'bg-g-card/60 border-g-border text-g-muted'
                        : 'bg-g-card/80 border-g-accent/50 text-g-accent shadow-[0_0_8px_rgba(233,69,96,0.3)]'}`}
          title={muted ? 'Activar música' : 'Silenciar'}>
          {muted
            ? <VolumeX size={12} />
            : <Music2 size={12} className="animate-pulse" />}
          {muted ? 'Música off' : 'Música on'}
        </button>
      </div>
    </>
  );
}
