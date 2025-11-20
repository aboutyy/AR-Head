
import React, { useEffect, useState, useRef } from 'react';
import { TrackingData } from '../types';
import { Shield, Zap, Activity, Crosshair, Cpu, Wifi, Fingerprint, CheckCircle, Lock, ChevronLeft, ChevronRight } from 'lucide-react';

interface HoloMenuProps {
  trackingRef: React.MutableRefObject<TrackingData>;
  onMenuToggle: (isOpen: boolean) => void;
}

const MENU_ITEMS = [
  { 
    id: 'MK-85', 
    label: 'ARMOR SYSTEMS', 
    subLabel: '装甲系统',
    icon: Shield, 
    color: 'text-amber-400', 
    borderColor: 'border-amber-500',
    shadow: 'shadow-amber-500/50',
    bgGradient: 'from-amber-900/40',
    description: 'Nanotech structural integrity monitoring and repair protocols.',
    stats: [
      { label: 'INTEGRITY', value: 98, unit: '%' },
      { label: 'SHIELDING', value: 100, unit: '%' },
      { label: 'THRUSTERS', value: 85, unit: 'PSI' }
    ],
    logs: ['> CHECKING PLATING...', '> NANITES ACTIVE', '> FLIGHT STABILIZERS: OK'],
    activeMessage: 'FLIGHT SYSTEMS ENGAGED'
  },
  { 
    id: 'ARC-V', 
    label: 'FUSION REACTOR', 
    subLabel: '聚变核心',
    icon: Zap, 
    color: 'text-cyan-400', 
    borderColor: 'border-cyan-500',
    shadow: 'shadow-cyan-500/50',
    bgGradient: 'from-cyan-900/40',
    description: 'Palladium core output regulation and energy distribution.',
    stats: [
      { label: 'OUTPUT', value: 480, unit: 'GJ/s' },
      { label: 'CORE TEMP', value: 3200, unit: 'K' },
      { label: 'EFFICIENCY', value: 99, unit: '%' }
    ],
    logs: ['> INJECTING PLASMA', '> MAGNETIC FIELD STABLE', '> OUTPUT NORMALIZED'],
    activeMessage: 'MAXIMUM POWER OUTPUT'
  },
  { 
    id: 'BIO-X', 
    label: 'VITAL SIGNS', 
    subLabel: '生命体征',
    icon: Activity, 
    color: 'text-emerald-400', 
    borderColor: 'border-emerald-500',
    shadow: 'shadow-emerald-500/50',
    bgGradient: 'from-emerald-900/40',
    description: 'Real-time biometric telemetry and trauma response.',
    stats: [
      { label: 'HEART RATE', value: 82, unit: 'BPM' },
      { label: 'BP', value: 120, unit: 'SYS' },
      { label: 'O2 LEVELS', value: 98, unit: '%' }
    ],
    logs: ['> SCANNING VITALS...', '> NO TRAUMA DETECTED', '> ADRENALINE: NORMAL'],
    activeMessage: 'COMBAT STIMULANTS READY'
  },
  { 
    id: 'WPN-7', 
    label: 'WEAPON CONTROL', 
    subLabel: '武器系统',
    icon: Crosshair, 
    color: 'text-rose-400', 
    borderColor: 'border-rose-500',
    shadow: 'shadow-rose-500/50',
    bgGradient: 'from-rose-900/40',
    description: 'Offensive capability management and targeting array.',
    stats: [
      { label: 'MISSILES', value: 32, unit: 'QTY' },
      { label: 'REPULSORS', value: 100, unit: '%' },
      { label: 'UNIBEAM', value: 100, unit: '%' }
    ],
    logs: ['> ARMING WARHEADS...', '> TARGETING CALIBRATED', '> SAFETIES DISABLED'],
    activeMessage: 'WEAPONS FREE'
  },
  { 
    id: 'SYS-9', 
    label: 'NETWORK DIAG', 
    subLabel: '网络诊断',
    icon: Cpu, 
    color: 'text-purple-400', 
    borderColor: 'border-purple-500',
    shadow: 'shadow-purple-500/50',
    bgGradient: 'from-purple-900/40',
    description: 'Neural uplink connection and satellite diagnostics.',
    stats: [
      { label: 'LATENCY', value: 1, unit: 'ms' },
      { label: 'UPLOAD', value: 50, unit: 'TB/s' },
      { label: 'SAT-LINK', value: 12, unit: 'SAT' }
    ],
    logs: ['> PINGING SATELLITE...', '> ENCRYPTION: AES-4096', '> UPLINK SECURE'],
    activeMessage: 'DEEP SCAN INITIATED'
  },
];

// CONSTANTS FOR SENSITIVITY
const MENU_OPEN_THRESHOLD = 40; 
const MENU_CLOSE_THRESHOLD = 30; 

export const HoloMenu: React.FC<HoloMenuProps> = ({ trackingRef, onMenuToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'CAROUSEL' | 'DETAIL'>('CAROUSEL');
  const [palmHoldTimer, setPalmHoldTimer] = useState(0);
  
  const [activatedSystems, setActivatedSystems] = useState<Record<string, boolean>>({});
  const [activationProgress, setActivationProgress] = useState(0);
  
  const processingSwipe = useRef(false);
  const pinchCooldown = useRef(false);

  useEffect(() => {
    let animationFrame: number;

    const checkGestures = () => {
      const hands = trackingRef.current.hands;
      
      // --- MENU ACTIVATION LOGIC ---
      const isRightPalmUp = hands.rightHand?.isPalmUp || false;
      const isRightPinching = hands.rightHand?.isPinching || false;
      const swipe = hands.swipeDirection;

      // --- 1. Menu Visibility ---
      // OPEN: Right Palm Up + No Pinching
      if (isRightPalmUp && !isRightPinching && !isOpen) {
        setPalmHoldTimer(prev => {
            const newVal = prev + 1;
            if (newVal >= MENU_OPEN_THRESHOLD) {
                setIsOpen(true);
                onMenuToggle(true);
                return 0; 
            }
            return newVal;
        });
      } 
      // CLOSE: Right Hand NOT Palm Up (Drop hand)
      else if (!isRightPalmUp && !isRightPinching && isOpen) {
        setPalmHoldTimer(prev => {
            const newVal = prev + 1;
            if (newVal >= MENU_CLOSE_THRESHOLD) { 
                setIsOpen(false);
                onMenuToggle(false);
                setViewMode('CAROUSEL'); 
                setActivationProgress(0);
                return 0;
            }
            return newVal;
        });
      } else {
          if (!isOpen) setPalmHoldTimer(0);
          if (isOpen && (isRightPalmUp || isRightPinching)) setPalmHoldTimer(0); 
      }

      // --- 2. Interaction Logic ---
      if (isOpen) {
          const activeItem = MENU_ITEMS[activeIndex];
          const isSystemOnline = activatedSystems[activeItem.id];
          let justSwiped = false;

          if (viewMode === 'CAROUSEL') {
              // Swipe Navigation
              if (swipe !== 'NONE' && !processingSwipe.current) {
                  processingSwipe.current = true;
                  justSwiped = true;
                  if (swipe === 'LEFT') {
                      setActiveIndex(prev => (prev + 1) % MENU_ITEMS.length);
                  } else {
                      setActiveIndex(prev => (prev - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
                  }
                  setTimeout(() => { processingSwipe.current = false; }, 400);
              }

              // Enter Detail: Right Hand Pinch (Only if NOT swiping)
              if (hands.rightHand?.isPinching && !pinchCooldown.current && !processingSwipe.current && !justSwiped) {
                   setViewMode('DETAIL');
                   pinchCooldown.current = true;
                   setTimeout(() => { pinchCooldown.current = false; }, 1000);
              }
          } else {
              // --- DETAIL MODE ---
              // Activation: Right Hand Pinch Hold
              if (hands.rightHand?.isPinching) {
                  if (!isSystemOnline) {
                      setActivationProgress(prev => {
                          const next = prev + 1.5; 
                          if (next >= 100) {
                              setActivatedSystems(curr => ({ ...curr, [activeItem.id]: true }));
                          }
                          return Math.min(next, 100);
                      });
                  }
              } else {
                  if (!isSystemOnline) {
                      setActivationProgress(prev => Math.max(prev - 2, 0));
                  }
              }
          }
      }

      animationFrame = requestAnimationFrame(checkGestures);
    };

    animationFrame = requestAnimationFrame(checkGestures);
    return () => cancelAnimationFrame(animationFrame);
  }, [isOpen, viewMode, onMenuToggle, activeIndex, activatedSystems]);

  if (!isOpen && palmHoldTimer === 0) return null;

  const activeItem = MENU_ITEMS[activeIndex];
  const hands = trackingRef.current.hands;
  const isPinching = hands.rightHand?.isPinching; 
  const isSystemOnline = activatedSystems[activeItem.id] || false;

  // --- UI HELPERS ---
  const CornerBrackets = ({ color = "border-cyan-400" }: { color?: string }) => (
    <>
      <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 ${color}`} />
      <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 ${color}`} />
      <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 ${color}`} />
      <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 ${color}`} />
    </>
  );

  // Loading Indicator
  if (!isOpen && palmHoldTimer > 0) {
      if (palmHoldTimer < 5) return null; 
      const progress = Math.min((palmHoldTimer / MENU_OPEN_THRESHOLD) * 100, 100);
      return (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
             <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-full border border-cyan-500/20 flex items-center justify-center relative bg-black/40 backdrop-blur-sm">
                    <svg className="w-full h-full -rotate-90 absolute inset-0">
                        <circle
                            cx="48" cy="48" r="46"
                            stroke="rgb(34, 211, 238)"
                            strokeWidth="2"
                            fill="transparent"
                            strokeDasharray="289"
                            strokeDashoffset={289 - (289 * progress) / 100}
                        />
                    </svg>
                    <Fingerprint className={`w-10 h-10 text-cyan-400 ${progress > 80 ? 'animate-pulse' : ''}`} />
                </div>
                <div className="text-cyan-400 font-mono text-xs tracking-widest bg-black/60 px-2 py-1">
                    HOLD PALM UP... {Math.floor(progress)}%
                </div>
             </div>
          </div>
      )
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center perspective-1000 pointer-events-none">
       <div className="relative w-full max-w-5xl h-[600px] flex items-center justify-center transform-style-3d">
          
          {/* Guide Text */}
          <div className="absolute bottom-10 left-0 right-0 text-center z-50 animate-bounce">
              <div className="inline-block bg-black/60 backdrop-blur border border-cyan-500/30 px-4 py-2 rounded text-cyan-300 font-mono text-xs">
                  {viewMode === 'CAROUSEL' ? (
                      <div className="flex items-center gap-2">
                          <ChevronLeft className="w-4 h-4 animate-pulse" />
                          <span>SWIPE TO NAVIGATE • PINCH TO SELECT</span>
                          <ChevronRight className="w-4 h-4 animate-pulse" />
                      </div>
                  ) : !isSystemOnline ? (
                      <span>RIGHT HAND: HOLD PINCH (右手长捏)</span>
                  ) : (
                      <span>SYSTEM ONLINE</span>
                  )}
              </div>
          </div>

          {/* --- CAROUSEL MODE --- */}
          {viewMode === 'CAROUSEL' && (
             <div className="relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in duration-500">
                 {/* Side Navigation Arrows (Visual Cues) */}
                 <div className="absolute left-20 top-1/2 -translate-y-1/2 z-40 opacity-50 animate-pulse">
                     <ChevronLeft className="w-16 h-16 text-cyan-500" />
                 </div>
                 <div className="absolute right-20 top-1/2 -translate-y-1/2 z-40 opacity-50 animate-pulse">
                     <ChevronRight className="w-16 h-16 text-cyan-500" />
                 </div>

                 <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                 {MENU_ITEMS.map((item, index) => {
                     const offset = (index - activeIndex + MENU_ITEMS.length) % MENU_ITEMS.length;
                     let visualOffset = offset;
                     if (offset > MENU_ITEMS.length / 2) visualOffset = offset - MENU_ITEMS.length;
                     const isActive = index === activeIndex;
                     
                     return (
                         <div
                            key={item.id}
                            className={`absolute transition-all duration-500 ease-out flex flex-col items-center ${isActive ? 'z-20 opacity-100' : 'z-0 opacity-20 grayscale blur-[1px]'}`}
                            style={{
                                transform: `
                                    translateX(${visualOffset * 280}px) 
                                    translateZ(${isActive ? 200 : -300}px) 
                                    rotateY(${visualOffset * -20}deg)
                                    scale(${isActive && isPinching ? 0.95 : 1})
                                `
                            }}
                         >
                            {isActive && (
                                <>
                                    <div className={`absolute inset-0 ${item.color} blur-[50px] opacity-20 animate-pulse -z-10`} />
                                    <CornerBrackets color={isPinching ? "border-green-400" : item.borderColor.replace('border', 'border-opacity-60 border')} />
                                </>
                            )}

                            <div className={`
                                relative w-64 h-96 p-1 backdrop-blur-md
                                bg-gradient-to-b ${isActive ? item.bgGradient : 'from-gray-900/30'} to-black/90
                                border-x ${isActive ? item.borderColor : 'border-gray-700'} border-opacity-30
                                transition-colors duration-300
                            `}
                            style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)' }}
                            >
                                <div className="h-full flex flex-col items-center p-6 relative overflow-hidden">
                                    <div className="w-full flex justify-between items-center border-b border-white/10 pb-3 mb-6">
                                        <span className={`text-xs font-bold tracking-widest ${item.color}`}>{item.id}</span>
                                        <Wifi className={`w-3 h-3 ${item.color} animate-pulse`} />
                                    </div>
                                    <div className="relative w-28 h-28 flex items-center justify-center mb-8 group">
                                        <div className={`absolute inset-0 border-2 ${item.borderColor} opacity-30 rounded-full border-dashed animate-[spin_10s_linear_infinite]`} />
                                        <item.icon className={`w-14 h-14 ${item.color} drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-transform duration-300 ${isPinching ? 'scale-110' : ''}`} />
                                    </div>
                                    <div className={`text-xl font-black tracking-widest ${item.color} mb-1 text-center`}>{item.label}</div>
                                    <div className="text-[10px] text-gray-400 text-center font-mono mb-2">{item.subLabel}</div>
                                </div>
                            </div>
                         </div>
                     );
                 })}
             </div>
          )}

          {/* --- DETAIL MODE --- */}
          {viewMode === 'DETAIL' && (
              <div className="relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in duration-300">
                  <div className="w-[900px] h-[550px] bg-black/90 border border-white/10 relative flex overflow-hidden shadow-2xl rounded-xl">
                      {/* Background Grid & Overlay */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
                      <div className={`absolute inset-0 bg-gradient-to-br ${activeItem.bgGradient} opacity-10 pointer-events-none`} />
                      
                      {/* Left Panel: Info */}
                      <div className="w-1/3 border-r border-white/10 p-8 flex flex-col relative z-10 bg-black/40 backdrop-blur-sm">
                          <div className="flex items-center gap-4 mb-8">
                              <div className={`p-3 border ${activeItem.borderColor} bg-white/5 rounded shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
                                  <activeItem.icon className={`w-8 h-8 ${activeItem.color}`} />
                              </div>
                              <div>
                                  <div className="text-3xl font-bold text-white tracking-wider font-mono">{activeItem.id}</div>
                                  <div className={`text-xs ${activeItem.color} tracking-[0.2em] uppercase`}>{activeItem.label}</div>
                              </div>
                          </div>
                          
                          <div className="text-xs text-gray-400 font-mono leading-relaxed mb-8 border-l-2 border-white/10 pl-4">
                              {activeItem.description}
                          </div>

                          <div className="mt-auto space-y-4">
                              {activeItem.stats.map((stat, i) => (
                                  <div key={i} className="flex justify-between items-end border-b border-white/5 pb-1">
                                      <span className="text-[10px] text-gray-500 tracking-widest">{stat.label}</span>
                                      <div className="flex items-baseline gap-1">
                                          <span className={`text-lg font-mono ${activeItem.color}`}>{stat.value}</span>
                                          <span className="text-[9px] text-gray-600">{stat.unit}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Right Panel: Interactive Visualization */}
                      <div className="flex-1 relative flex flex-col items-center justify-center p-8 overflow-hidden">
                           
                           {/* Status Badge Top Right */}
                           <div className={`absolute top-6 right-6 px-4 py-1.5 border ${isSystemOnline ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'} rounded text-xs font-mono flex items-center gap-2 transition-colors duration-500`}>
                                {isSystemOnline ? <CheckCircle className="w-4 h-4 text-green-400"/> : <Lock className="w-4 h-4 text-red-400"/>}
                                <span className={isSystemOnline ? 'text-green-400' : 'text-red-400'}>
                                    {isSystemOnline ? 'SYSTEM ONLINE' : 'AUTHORIZATION REQUIRED'}
                                </span>
                           </div>

                           {/* CENTRAL VISUALIZATION */}
                           <div className={`relative w-80 h-80 flex items-center justify-center group ${activeItem.color}`}>
                                {/* 1. Base Static Ring */}
                                <div className="absolute inset-4 border border-white/10 rounded-full" />

                                {/* 2. ACTIVATION SEQUENCE */}
                                {!isSystemOnline && activationProgress > 0 && (
                                    <>
                                        {/* Spinning Outer Notches */}
                                        <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-transparent animate-[spin_1s_linear_infinite]" 
                                             style={{ borderTopColor: 'currentColor', borderBottomColor: 'currentColor', opacity: 0.3 }}>
                                        </div>
                                        
                                        {/* Counter-Spinning Inner Ring */}
                                        <div className="absolute inset-8 rounded-full border-l-2 border-r-2 border-transparent animate-[spin_2s_linear_infinite_reverse]"
                                             style={{ borderLeftColor: 'currentColor', borderRightColor: 'currentColor', opacity: 0.5 }}>
                                        </div>

                                        {/* SVG Progress Circle */}
                                        <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                            {/* Track */}
                                            <circle cx="50%" cy="50%" r="42%" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                                            {/* Fill with Dash effect */}
                                            <circle 
                                                cx="50%" cy="50%" r="42%" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                strokeWidth="6" 
                                                strokeDasharray="2 4" // Techy segmented look
                                                strokeDashoffset={0}
                                                pathLength="100"
                                                className="opacity-30"
                                            />
                                            {/* Actual Progress Fill */}
                                            <circle 
                                                cx="50%" cy="50%" r="42%" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                strokeWidth="6"
                                                strokeDasharray="100"
                                                strokeDashoffset={100 - activationProgress}
                                                pathLength="100"
                                                strokeLinecap="round"
                                            />
                                        </svg>

                                        {/* Digital Noise / Glitch Overlay on Icon */}
                                        <div className="absolute inset-20 overflow-hidden rounded-full mix-blend-screen opacity-50">
                                             <div className="w-full h-[200%] bg-[linear-gradient(transparent_40%,currentColor_50%,transparent_60%)] animate-[scan_1s_linear_infinite] opacity-40" />
                                        </div>
                                        
                                        {/* Floating Data Text */}
                                        <div className="absolute -bottom-12 font-mono text-xs tracking-widest animate-pulse text-white">
                                            INITIALIZING... {Math.floor(activationProgress)}%
                                        </div>
                                    </>
                                )}

                                {/* 3. SYSTEM ONLINE STATE */}
                                {isSystemOnline && (
                                    <>
                                        {/* Shockwave Pulse */}
                                        <div className="absolute inset-0 rounded-full border-2 border-current opacity-0 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                                        
                                        {/* Radiant Glow Gradient */}
                                        <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${activeItem.bgGradient} to-transparent opacity-40 blur-2xl animate-pulse`} />
                                        
                                        {/* Stable Rotating Ring */}
                                        <div className="absolute inset-2 rounded-full border border-dashed border-current opacity-40 animate-[spin_20s_linear_infinite]" />
                                        
                                        {/* Highlighting Brackets */}
                                        <div className="absolute inset-[-20px]">
                                             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-current shadow-[0_0_10px_currentColor]" />
                                             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-current shadow-[0_0_10px_currentColor]" />
                                             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-1 bg-current shadow-[0_0_10px_currentColor]" />
                                             <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-1 bg-current shadow-[0_0_10px_currentColor]" />
                                        </div>

                                        {/* Status Badge */}
                                        <div className="absolute -bottom-20 bg-black/80 border border-current px-6 py-2 rounded backdrop-blur-md flex items-center gap-3 shadow-[0_0_30px_rgba(0,0,0,0.7)] animate-in slide-in-from-bottom-4 duration-700">
                                            <div className="w-2 h-2 rounded-full bg-current animate-pulse shadow-[0_0_10px_currentColor]" />
                                            <span className="font-mono font-bold tracking-[0.2em] text-sm drop-shadow-lg text-white">SYSTEM ONLINE</span>
                                        </div>
                                    </>
                                )}

                                {/* 4. CENTRAL ICON */}
                                <div className={`relative z-10 transition-all duration-700 
                                    ${isSystemOnline ? 'scale-110 drop-shadow-[0_0_40px_currentColor] brightness-125' : 'opacity-80'}
                                    ${!isSystemOnline && activationProgress > 0 ? 'animate-pulse brightness-150' : ''}
                                `}>
                                     <activeItem.icon className="w-32 h-32" strokeWidth={1.5} />
                                </div>
                           </div>

                           <style>{`
                               @keyframes scan {
                                   0% { transform: translateY(-50%); }
                                   100% { transform: translateY(0%); }
                               }
                           `}</style>
                      </div>
                  </div>
              </div>
          )}
       </div>
    </div>
  );
};
