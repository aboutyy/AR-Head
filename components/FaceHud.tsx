
import React, { useEffect, useState, useRef } from 'react';
import { TrackingData } from '../types';
import { Activity, Battery, Wifi, Target, Cpu, Database, Hand, MoveHorizontal } from 'lucide-react';

interface FaceHudProps {
  trackingRef: React.MutableRefObject<TrackingData>;
}

export const FaceHud: React.FC<FaceHudProps> = ({ trackingRef }) => {
  const [pos, setPos] = useState({ x: 0, y: 0, detected: false });
  const [metrics, setMetrics] = useState({ bpm: 72, cpu: 34, power: 98 });
  const [activeGesture, setActiveGesture] = useState<'IDLE' | 'ROTATE' | 'SCALE' | 'PAN'>('IDLE');
  const frameCount = useRef(0);

  // Update loop for HUD Position (runs 60fps via RAF inside useEffect)
  useEffect(() => {
    let animationFrameId: number;

    const renderLoop = () => {
      const face = trackingRef.current.face;
      const hands = trackingRef.current.hands;
      
      // Smooth dampening
      setPos(prev => ({
        x: prev.x + (face.x * window.innerWidth - prev.x) * 0.1,
        y: prev.y + (face.y * window.innerHeight - prev.y) * 0.1,
        detected: face.detected
      }));

      // Check for active gesture overrides
      if (hands.detected) {
          const leftPinch = hands.leftHand?.isPinching;
          const rightPinch = hands.rightHand?.isPinching;

          if (leftPinch && rightPinch) setActiveGesture('SCALE');
          else if (leftPinch) setActiveGesture('ROTATE');
          else if (rightPinch) setActiveGesture('PAN');
          else setActiveGesture('IDLE');
      } else {
          setActiveGesture('IDLE');
      }

      // Simulate fluctuating metrics
      frameCount.current++;
      if (frameCount.current % 60 === 0) { // Every second
        setMetrics(prev => ({
          bpm: 70 + Math.floor(Math.random() * 20),
          cpu: 30 + Math.floor(Math.random() * 10),
          power: Math.max(0, prev.power - 0.01)
        }));
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [trackingRef]);

  if (!pos.detected) return null;

  // Offset the main HUD to the right of the face
  const offsetX = 180; 
  const offsetY = -50;

  return (
    <div 
      className="absolute pointer-events-none z-20 transition-opacity duration-300"
      style={{ 
        left: pos.x, 
        top: pos.y,
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        opacity: pos.detected ? 1 : 0,
        perspective: '1000px' // 3D Perspective container
      }}
    >
      {/* Removed Dotted Connector Line */}

      {/* Main Widget with 3D Tilt */}
      <div 
        className="w-64 bg-black/40 border border-cyan-500/30 backdrop-blur-sm p-4 rounded-lg shadow-[0_0_15px_rgba(0,255,255,0.2)] origin-left"
        style={{ transform: 'rotateY(-12deg)' }}
      >
        <div className="flex justify-between items-center border-b border-cyan-500/30 pb-2 mb-2">
          <span className="text-cyan-400 text-xs font-bold tracking-widest">TARGET_LOCK</span>
          <Target className="w-4 h-4 text-red-500 animate-pulse" />
        </div>

        <div className="space-y-3">
          {/* Biometrics */}
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-cyan-300" />
            <div className="flex-1">
              <div className="text-[10px] text-cyan-600 uppercase">Heart Rate</div>
              <div className="text-xl text-cyan-100 font-mono leading-none hud-text-shadow">{metrics.bpm} <span className="text-xs">BPM</span></div>
            </div>
            <div className="h-8 w-1 bg-cyan-900/50 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-full bg-cyan-400 transition-all duration-300" style={{ height: `${(metrics.bpm - 50) * 2}%`}}></div>
            </div>
          </div>

          {/* System Status */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-cyan-900/20 p-2 rounded border border-cyan-500/10">
               <div className="flex items-center gap-1 mb-1">
                 <Cpu className="w-3 h-3 text-cyan-400" />
                 <span className="text-[9px] text-cyan-500">CPU_LOAD</span>
               </div>
               <div className="text-lg text-white font-mono">{metrics.cpu}%</div>
            </div>
            <div className="bg-cyan-900/20 p-2 rounded border border-cyan-500/10">
               <div className="flex items-center gap-1 mb-1">
                 <Battery className="w-3 h-3 text-cyan-400" />
                 <span className="text-[9px] text-cyan-500">PWR_CELL</span>
               </div>
               <div className="text-lg text-white font-mono">{metrics.power.toFixed(0)}%</div>
            </div>
          </div>
          
          {/* Data Stream Visual */}
          <div className="flex gap-1 text-[8px] text-cyan-700 font-mono break-all leading-tight overflow-hidden h-8 opacity-70">
             {Array.from({length: 100}).map((_, i) => Math.random() > 0.5 ? '1' : '0').join('')}
          </div>
        </div>
      </div>
      
      {/* Gesture Feedback Indicator */}
      {activeGesture !== 'IDLE' && (
        <div className="absolute -left-40 top-10 flex items-center gap-2 animate-pulse">
            <div className="bg-cyan-500/20 border border-cyan-400 p-2 rounded-full">
                {activeGesture === 'SCALE' ? <MoveHorizontal className="w-6 h-6 text-cyan-200" /> : <Hand className="w-6 h-6 text-cyan-200" />}
            </div>
            <div className="bg-black/60 border-l-2 border-cyan-400 px-3 py-1 text-cyan-300 font-mono text-xs">
                MANUAL OVERRIDE<br/>
                <span className="text-white font-bold tracking-wider">{activeGesture} ACTIVE</span>
            </div>
        </div>
      )}

      {/* Floating Tags */}
      <div className="absolute -right-4 -top-4 flex flex-col gap-1" style={{ transform: 'translateZ(20px)' }}>
        <div className="bg-cyan-500/20 text-cyan-300 text-[9px] px-1 border-l-2 border-cyan-500">ID: STARK_01</div>
        <div className="bg-cyan-500/20 text-cyan-300 text-[9px] px-1 border-l-2 border-cyan-500">SEC: ALPHA</div>
      </div>
    </div>
  );
};
