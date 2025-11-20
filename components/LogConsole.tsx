import React, { useEffect, useState, useRef } from 'react';
import { TrackingData } from '../types';
import { Terminal, Radio } from 'lucide-react';

interface LogConsoleProps {
  trackingRef: React.MutableRefObject<TrackingData>;
}

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'INFO' | 'WARN' | 'SUCCESS' | 'SYSTEM';
}

export const LogConsole: React.FC<LogConsoleProps> = ({ trackingRef }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const maxLogs = 15;
  const logIdRef = useRef(0);
  
  // State trackers to detect changes
  const lastFaceState = useRef(false);
  const lastGesture = useRef('IDLE');
  const lastHandCount = useRef(0);

  const addLog = (message: string, type: LogEntry['type'] = 'INFO') => {
    const now = new Date();
    const timeStr = now.toISOString().split('T')[1].split('.')[0];
    
    const newLog = {
      id: logIdRef.current++,
      timestamp: timeStr,
      message,
      type
    };

    setLogs(prev => [newLog, ...prev].slice(0, maxLogs));
  };

  useEffect(() => {
    // Initial System Log
    addLog('KERNEL INITIALIZED', 'SYSTEM');
    addLog('CONNECTING TO JARVIS_MAIN...', 'SYSTEM');
    
    const interval = setInterval(() => {
      const tracking = trackingRef.current;
      
      // 1. Track Face Detection Changes
      if (tracking.face.detected !== lastFaceState.current) {
         lastFaceState.current = tracking.face.detected;
         if (tracking.face.detected) {
             addLog(`FACE DETECTED [ID: ${Math.floor(Math.random()*999)}]`, 'SUCCESS');
             addLog('RETINAL SCAN: MATCH', 'INFO');
         } else {
             addLog('TARGET LOST: RE-ACQUIRING...', 'WARN');
         }
      }

      // 2. Track Gesture Changes
      if (tracking.hands.gesture !== lastGesture.current) {
         const gesture = tracking.hands.gesture;
         if (gesture !== 'IDLE') {
             addLog(`GESTURE RECOGNIZED: ${gesture}`, 'SUCCESS');
         }
         lastGesture.current = gesture;
      }

      // 3. Track Hand Detection Count
      let handCount = 0;
      if (tracking.hands.leftHand) handCount++;
      if (tracking.hands.rightHand) handCount++;
      
      if (handCount !== lastHandCount.current) {
          if (handCount > lastHandCount.current) {
              addLog(`HAND INPUT DETECTED: ${handCount} ACTOR(S)`, 'INFO');
          }
          lastHandCount.current = handCount;
      }

      // 4. Random System Chatter (Simulate active processing)
      if (Math.random() < 0.05) {
          const msgs = [
              'OPTIMIZING NEURAL NET...',
              'UPLINK STABLE: 40TB/s',
              'RECALIBRATING HUD...',
              'ENCRYPTING STREAM...',
              'CHECKING PERIMETER...',
              'BACKGROUND SYNC COMPLETE'
          ];
          addLog(msgs[Math.floor(Math.random() * msgs.length)], 'SYSTEM');
      }

    }, 200);

    return () => clearInterval(interval);
  }, [trackingRef]);

  return (
    <div className="absolute right-4 top-20 bottom-32 w-72 pointer-events-none z-10 flex flex-col gap-2">
        {/* Header */}
        <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 p-2 rounded-t flex justify-between items-center shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono text-cyan-300 tracking-widest">SYS_LOGS</span>
            </div>
            <Radio className="w-3 h-3 text-green-500 animate-pulse" />
        </div>

        {/* Log Container */}
        <div className="flex-1 overflow-hidden relative bg-black/20 backdrop-blur-md border-x border-b border-cyan-500/20 rounded-b p-3 shadow-lg">
            {/* Scanline effect inside log */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
            
            <div className="flex flex-col gap-1.5 h-full justify-end mask-image-gradient">
                {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-[10px] font-mono animate-in slide-in-from-left-2 duration-300">
                        <span className="text-cyan-700 opacity-60 shrink-0">[{log.timestamp}]</span>
                        <span className={`
                            break-words leading-tight
                            ${log.type === 'INFO' ? 'text-cyan-100' : ''}
                            ${log.type === 'WARN' ? 'text-amber-400' : ''}
                            ${log.type === 'SUCCESS' ? 'text-green-400' : ''}
                            ${log.type === 'SYSTEM' ? 'text-cyan-500 opacity-70 italic' : ''}
                        `}>
                            {log.type === 'WARN' && '⚠ '}
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Bottom Decoration */}
        <div className="flex justify-between opacity-50">
             <div className="h-1 w-8 bg-cyan-500/50" />
             <div className="h-1 w-24 bg-cyan-500/30" />
             <div className="h-1 w-2 bg-cyan-500/50" />
        </div>
    </div>
  );
};