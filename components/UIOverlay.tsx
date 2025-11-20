import React, { useEffect, useState } from 'react';
import { Wifi, Database, Shield, Activity, Eye, Minimize2, Menu } from 'lucide-react';
import { SystemStatus } from '../types';

interface UIOverlayProps {
  status: SystemStatus;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ status }) => {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(t => t + 10); // 10ms increments
    }, 10);
    return () => clearInterval(interval);
  }, []);

  // Format time as HH:MM:SS:MS
  const formatTime = (ms: number) => {
    const date = new Date(ms);
    return date.toISOString().substr(11, 11).replace('.', ':');
  };

  const getStatusClasses = (s: SystemStatus) => {
    switch (s) {
      case SystemStatus.READY: 
        return 'bg-green-500 animate-slow-pulse';
      case SystemStatus.INITIALIZING: 
        return 'bg-yellow-500 animate-shimmer';
      case SystemStatus.ERROR: 
        return 'bg-red-500 animate-flicker';
      default: 
        return 'bg-gray-500';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 p-8 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-cyan-400 tracking-[0.2em] hud-text-shadow">J.A.R.V.I.S.</h1>
            
            {/* System Status Indicators */}
            <div className="flex gap-4 mt-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusClasses(status)}`}></div>
                <span className="text-[10px] text-cyan-300 font-mono">SYSTEM</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusClasses(status)}`}></div>
                <span className="text-[10px] text-cyan-300 font-mono">VISION</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#0f0] animate-pulse"></div>
                <span className="text-[10px] text-cyan-300 font-mono">NETWORK</span>
              </div>
            </div>
        </div>
        
        <div className="flex gap-8">
            <div className="flex flex-col items-center text-cyan-500/60">
                <Wifi className="w-6 h-6 mb-1" />
                <span className="text-[10px]">NET_LINK</span>
            </div>
            <div className="flex flex-col items-center text-cyan-500/60">
                <Database className="w-6 h-6 mb-1" />
                <span className="text-[10px]">DB_SYNC</span>
            </div>
            <div className="flex flex-col items-center text-cyan-500/60">
                <Shield className="w-6 h-6 mb-1" />
                <span className="text-[10px]">DEFENSE</span>
            </div>
        </div>
      </div>

      {/* Center Reticle (Static) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] border border-cyan-500/10 rounded-full opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40px] h-[40px] border-2 border-cyan-500/30 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-cyan-500/30"></div>
          <div className="absolute top-1/2 left-0 -translate-y-1/2 h-[1px] w-full bg-cyan-500/30"></div>
      </div>


      {/* Bottom Bar */}
      <div className="flex justify-between items-end border-t border-cyan-900/30 pt-4">
        <div className="w-2/5">
            <div className="text-xs text-cyan-600 mb-1 uppercase tracking-widest">Control Interface</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-cyan-400/70 font-mono pt-1">
                <span className="flex items-center gap-1"><Menu className="w-3 h-3 text-amber-400"/> RIGHT PALM UP: MENU</span>
                <span className="flex items-center gap-1"><Minimize2 className="w-3 h-3 text-cyan-300"/> DUAL PINCH: SCALE</span>
                <span className="flex items-center gap-1"><Activity className="w-3 h-3"/> L-PINCH: ROTATE</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3"/> R-PINCH: PAN</span>
            </div>
        </div>

        <div className="flex flex-col items-center">
           <div className="text-xs text-cyan-700 mb-1 tracking-[0.3em]">SESSION UPTIME</div>
           <div className="text-2xl text-cyan-100 font-mono bg-cyan-950/50 px-4 py-1 rounded border border-cyan-500/30 hud-text-shadow">
             {formatTime(uptime)}
           </div>
        </div>
        
        <div className="flex items-center gap-2 w-1/3 justify-end">
            <div className="flex flex-col items-end">
               <span className="text-xs text-red-400 tracking-wider">REC ●</span>
               <span className="text-[9px] text-cyan-700">4K 60FPS RAW</span>
            </div>
        </div>
      </div>
    </div>
  );
};