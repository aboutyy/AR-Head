import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useAR } from './hooks/useAR';
import { Globe } from './components/Globe';
import { FaceHud } from './components/FaceHud';
import { UIOverlay } from './components/UIOverlay';
import { HoloMenu } from './components/HoloMenu';
import { LockScreen } from './components/LockScreen';
import { LogConsole } from './components/LogConsole';
import { SystemStatus } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const { videoRef, status: cameraStatus, trackingRef } = useAR();
  const [appState, setAppState] = useState<SystemStatus>(SystemStatus.INITIALIZING);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Manage global app state based on camera readiness
  useEffect(() => {
      if (cameraStatus === SystemStatus.READY && appState === SystemStatus.INITIALIZING) {
          // Camera is ready, move to Biometric Scan
          setAppState(SystemStatus.SCANNING);
      } else if (cameraStatus === SystemStatus.ERROR) {
          setAppState(SystemStatus.ERROR);
      }
  }, [cameraStatus, appState]);

  const handleUnlock = () => {
      setAppState(SystemStatus.READY);
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Webcam Background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-60 brightness-75 contrast-125"
      />
      
      {/* Dark Overlay for better contrast & Cyberpunk Tints */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/10 via-transparent to-black/80 mix-blend-multiply pointer-events-none" />
      
      {/* Loading State (Camera Init) */}
      {appState === SystemStatus.INITIALIZING && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            <div className="text-cyan-400 font-mono text-xl tracking-widest animate-pulse glitch-text" data-text="INITIALIZING">
              INITIALIZING PROTOCOLS...
            </div>
          </div>
        </div>
      )}

      {/* Biometric Lock Screen */}
      {appState === SystemStatus.SCANNING && (
         <LockScreen trackingRef={trackingRef} onUnlock={handleUnlock} />
      )}
      
      {/* MAIN APP (Only visible when READY) */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${appState === SystemStatus.READY ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          
          {/* AR Layer (Three.js) - Fades out when Menu is Open */}
          <div className={`absolute inset-0 z-10 transition-all duration-500 ease-in-out ${isMenuOpen ? 'opacity-30 blur-sm scale-110' : 'opacity-100 scale-100'}`}>
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ alpha: true, antialias: true }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
              <Suspense fallback={null}>
                 <Globe trackingRef={trackingRef} />
              </Suspense>
            </Canvas>
          </div>

          {/* HUD Layer */}
          <div className={`transition-all duration-500 ${isMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <FaceHud trackingRef={trackingRef} />
          </div>
          
          {/* Menu Layer */}
          <HoloMenu trackingRef={trackingRef} onMenuToggle={setIsMenuOpen} />
          
          {/* New Log Console (Right Side) */}
          {!isMenuOpen && <LogConsole trackingRef={trackingRef} />}
          
          <UIOverlay status={appState} />
      </div>
      
      {/* Error State */}
      {appState === SystemStatus.ERROR && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
           <div className="border border-red-500 p-8 rounded bg-red-900/20 backdrop-blur-md text-center">
              <h2 className="text-red-500 text-2xl font-bold mb-2 glitch-text" data-text="FAILURE">SYSTEM FAILURE</h2>
              <p className="text-red-300 font-mono">Camera access required for HUD initialization.</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;