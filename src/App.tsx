import { useState } from 'react';
import { HandTracker } from './components/HandTracker';
import { synth } from './utils/audio';

function App() {
  const [started, setStarted] = useState(false);

  const handleStart = () => {
    synth.init().catch(console.error);
    setStarted(true);
  };

  if (!started) {
    return (
      <main className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center cursor-pointer" onClick={handleStart}>
        <div className="text-center space-y-4 animate-pulse">
          <h1 className="text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            AI Finger Piano
          </h1>
          <p className="text-emerald-500/80 text-2xl tracking-widest uppercase mt-4">Tap anywhere to start</p>
          <p className="text-slate-500 text-sm mt-8 max-w-md mx-auto">
            Module 3 & 4: Fullscreen immersive tracking, Web Audio synthesizer, and physics-based tap detection.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-screen bg-slate-950 overflow-hidden select-none">
      {/* Radial Gradient Background */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, rgba(52,211,153,0.1) 0%, transparent 70%)' }} />

      {/* Frame Guide Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
        <div className="w-[80vw] h-[65vh] border-2 border-dashed border-emerald-500/20 rounded-[2rem] flex items-center justify-center relative mt-32">
          <div className="absolute top-4 px-6 py-1.5 bg-emerald-950/60 backdrop-blur-md rounded-full text-emerald-400 text-xs tracking-[0.3em] font-medium uppercase shadow-[0_0_10px_rgba(52,211,153,0.2)]">
            [ Place your hands here ]
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-0 right-0 z-20 pointer-events-none flex flex-col items-center space-y-3">
        <h2 className="text-emerald-400 font-bold text-3xl tracking-[0.2em] uppercase drop-shadow-[0_0_20px_rgba(52,211,153,0.6)]">
          Move your fingers to play music 🎶
        </h2>
        <p className="text-emerald-500/70 text-sm tracking-[0.4em] uppercase font-medium">
          Powered by AI Hand Tracking
        </p>
      </div>
      
      <HandTracker />
    </main>
  );
}

export default App;
