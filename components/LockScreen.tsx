
import React, { useEffect, useState, useRef } from 'react';
import { TrackingData } from '../types';
import { Scan, Lock, Unlock, Fingerprint, AlertTriangle, ShieldCheck, UserCheck } from 'lucide-react';

interface LockScreenProps {
  trackingRef: React.MutableRefObject<TrackingData>;
  onUnlock: () => void;
}

// Helper to lerp position smoothly
const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

export const LockScreen: React.FC<LockScreenProps> = ({ trackingRef, onUnlock }) => {
  const [scanState, setScanState] = useState<'IDLE' | 'ALIGNING' | 'SCANNING' | 'SUCCESS'>('IDLE');
  const [progress, setProgress] = useState(0);
  const [eyePos, setEyePos] = useState<{ left: {x:number, y:number}, right: {x:number, y:number} }>({ 
    left: {x:0, y:0}, 
    right: {x:0, y:0} 
  });
  
  // Store previous positions for smoothing
  const smoothPos = useRef({ left: {x:window.innerWidth/2, y:window.innerHeight/2}, right: {x:window.innerWidth/2, y:window.innerHeight/2} });
  const alignmentTimer = useRef(0);

  useEffect(() => {
    let animationFrame: number;

    const updateLoop = () => {
      const face = trackingRef.current.face;

      if (face.detected) {
          // Map normalized coordinates to screen pixels
          const targetLeftX = face.leftEye.x * window.innerWidth;
          const targetLeftY = face.leftEye.y * window.innerHeight;
          const targetRightX = face.rightEye.x * window.innerWidth;
          const targetRightY = face.rightEye.y * window.innerHeight;

          // Smooth Movement (Lerp) - snappier for lock feeling
          smoothPos.current.left.x = lerp(smoothPos.current.left.x, targetLeftX, 0.3);
          smoothPos.current.left.y = lerp(smoothPos.current.left.y, targetLeftY, 0.3);
          smoothPos.current.right.x = lerp(smoothPos.current.right.x, targetRightX, 0.3);
          smoothPos.current.right.y = lerp(smoothPos.current.right.y, targetRightY, 0.3);

          setEyePos({
              left: { x: smoothPos.current.left.x, y: smoothPos.current.left.y },
              right: { x: smoothPos.current.right.x, y: smoothPos.current.right.y }
          });

          // State Machine
          if (scanState === 'IDLE') {
              setScanState('ALIGNING');
              alignmentTimer.current = 0;
          } else if (scanState === 'ALIGNING') {
              // Visual scan phase - wait for a moment while showing laser effect
              alignmentTimer.current++;
              if (alignmentTimer.current > 60) { // Approx 1 second of aligning/laser
                  setScanState('SCANNING');
              }
          } else if (scanState === 'SCANNING') {
              // Rapid progress fill
              setProgress(p => Math.min(p + 1.5, 100));
              if (progress >= 100) {
                  setScanState('SUCCESS');
                  setTimeout(onUnlock, 1500);
              }
          }
      } else {
          // Face Lost
          if (scanState !== 'SUCCESS') {
              setScanState('IDLE');
              setProgress(0);
              alignmentTimer.current = 0;
          }
      }

      animationFrame = requestAnimationFrame(updateLoop);
    };

    animationFrame = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animationFrame);
  }, [scanState, progress, onUnlock, trackingRef]);

  return (
    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[3px]">
        
        {/* Dark Vignette & Grid Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_30%,rgba(0,0,0,0.9)_100%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none opacity-20" />

        {/* --- EYE RETICLES --- */}
        {(scanState !== 'IDLE') && (
            <>
                <Reticle x={eyePos.left.x} y={eyePos.left.y} state={scanState} label="L-OPTIC" />
                <Reticle x={eyePos.right.x} y={eyePos.right.y} state={scanState} label="R-OPTIC" />
            </>
        )}

        {/* --- CENTER HUD INFORMATION --- */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center">
            {scanState === 'IDLE' && (
                 <div className="animate-pulse flex flex-col items-center">
                     <Scan className="w-16 h-16 text-cyan-500/50 mb-4" />
                     <span className="bg-cyan-950/80 border border-cyan-500/50 px-4 py-2 text-cyan-400 font-mono tracking-[0.3em] text-sm">AWAITING INPUT</span>
                 </div>
            )}

            {scanState === 'SUCCESS' && (
                <div className="animate-in zoom-in duration-300 flex flex-col items-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-green-500 blur-[30px] opacity-20" />
                        <ShieldCheck className="w-24 h-24 text-green-400 drop-shadow-[0_0_20px_rgba(0,255,0,0.8)]" />
                    </div>
                    <h1 className="text-4xl font-black text-green-400 tracking-widest glitch-text mb-2" data-text="ACCESS GRANTED">ACCESS GRANTED</h1>
                    <div className="text-green-600 font-mono text-sm tracking-[0.5em]">IDENTITY VERIFIED: STARK_T</div>
                </div>
            )}
        </div>

        {/* --- BOTTOM STATUS BAR --- */}
        <div className="absolute bottom-24 left-0 right-0 flex justify-center">
            <div className="w-[400px] bg-black/80 border-x border-cyan-500/30 p-6 backdrop-blur-md relative overflow-hidden group">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10 bg-[size:10px_10px] bg-[linear-gradient(to_right,#00ffff_1px,transparent_1px),linear-gradient(to_bottom,#00ffff_1px,transparent_1px)]" />
                
                {/* Progress Bar */}
                {scanState !== 'IDLE' && (
                    <div className="absolute bottom-0 left-0 h-1 bg-cyan-900/50 w-full">
                        <div 
                            className={`h-full transition-all duration-100 ease-out ${scanState === 'SUCCESS' ? 'bg-green-400 shadow-[0_0_20px_#0f0]' : 'bg-cyan-400 shadow-[0_0_20px_#0ff]'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
                
                <div className="flex justify-between items-end font-mono relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                             {scanState === 'SUCCESS' ? <UserCheck className="w-4 h-4 text-green-400"/> : <Lock className="w-4 h-4 text-cyan-500"/>}
                             <span className="text-[10px] text-cyan-600 tracking-widest">SECURITY LEVEL 10</span>
                        </div>
                        <div className="text-lg text-cyan-100 tracking-widest font-bold">
                            {scanState === 'IDLE' && "STANDBY"}
                            {scanState === 'ALIGNING' && "RETINAL SYNC..."}
                            {scanState === 'SCANNING' && "DECRYPTING KEY..."}
                            {scanState === 'SUCCESS' && "UNLOCKED"}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-cyan-600 mb-1">CONFIDENCE</div>
                        <div className={`text-2xl font-bold font-mono ${scanState === 'SUCCESS' ? 'text-green-400' : 'text-cyan-400'}`}>
                            {scanState === 'IDLE' ? '00' : (progress).toFixed(0)}%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

// Sub-component for the Eye Reticle Graphics
const Reticle = ({ x, y, state, label }: { x: number, y: number, state: string, label: string }) => {
    const isSuccess = state === 'SUCCESS';
    const isAligning = state === 'ALIGNING';
    const color = isSuccess ? 'text-green-400 border-green-500' : 'text-cyan-400 border-cyan-500';
    const glow = isSuccess ? 'shadow-[0_0_30px_rgba(0,255,0,0.6)]' : 'shadow-[0_0_20px_rgba(0,255,255,0.4)]';

    return (
        <div 
            className="absolute pointer-events-none transition-all duration-100 ease-out z-40"
            style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
        >
            {/* Laser Scanner Effect */}
            {isAligning && (
                <div className="absolute left-[-20px] right-[-20px] h-[2px] bg-red-500/80 shadow-[0_0_10px_#f00] animate-[scan_1s_ease-in-out_infinite]" />
            )}

            {/* Rotating Segments */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-dashed ${color} opacity-60 animate-[spin_4s_linear_infinite]`} />
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-dotted ${color} opacity-80 animate-[spin_2s_linear_infinite_reverse]`} />
            
            {/* Main Ring */}
            <div 
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${color} transition-all duration-300 ${glow}`}
                style={{ 
                    width: isAligning ? '60px' : '30px',
                    height: isAligning ? '60px' : '30px',
                    opacity: isAligning ? 0.8 : 1
                }} 
            />

            {/* Crosshairs */}
            <div className={`absolute top-1/2 left-1/2 w-20 h-[1px] -translate-x-1/2 ${isSuccess ? 'bg-green-500' : 'bg-cyan-500'} opacity-30`} />
            <div className={`absolute top-1/2 left-1/2 h-20 w-[1px] -translate-x-1/2 -translate-y-1/2 ${isSuccess ? 'bg-green-500' : 'bg-cyan-500'} opacity-30`} />

            {/* Data Tag */}
            <div className="absolute top-[-50px] right-[-80px] flex flex-col items-end">
                <div className={`text-[9px] font-mono ${isSuccess ? 'text-green-400 bg-green-900/50' : 'text-cyan-300 bg-cyan-900/50'} px-2 py-0.5 border-r-2 border-current`}>
                    {label} // {Math.floor(x)}:{Math.floor(y)}
                </div>
            </div>

            {/* Corner Markers */}
            <div className={`absolute top-[-40px] left-[-40px] w-4 h-4 border-t-2 border-l-2 ${color}`} />
            <div className={`absolute top-[-40px] right-[-40px] w-4 h-4 border-t-2 border-r-2 ${color}`} />
            <div className={`absolute bottom-[-40px] left-[-40px] w-4 h-4 border-b-2 border-l-2 ${color}`} />
            <div className={`absolute bottom-[-40px] right-[-40px] w-4 h-4 border-b-2 border-r-2 ${color}`} />
            
            <style>{`
                @keyframes scan {
                    0% { top: -20%; opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { top: 120%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};
