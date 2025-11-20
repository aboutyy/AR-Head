
export interface TrackingData {
  face: {
    detected: boolean;
    x: number; // normalized 0-1 center of face
    y: number; // normalized 0-1 center of face
    z: number;
    tiltX: number;
    tiltY: number;
    tiltZ: number;
    // Eye coordinates for retinal scan
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
  };
  hands: {
    detected: boolean;
    // We add 'handOpenness' (0 to 1) to track fist vs open hand
    // We add 'handSize' to estimate distance from camera (larger = closer)
    leftHand: { x: number; y: number; z: number; isPinching: boolean; isPalmUp: boolean; handOpenness: number; handSize: number } | null;
    rightHand: { x: number; y: number; z: number; isPinching: boolean; isPalmUp: boolean; handOpenness: number; handSize: number } | null;
    distance: number; // Distance between hands if both present
    gesture: 'IDLE' | 'ROTATE' | 'SCALE' | 'PAN';
    swipeDirection: 'LEFT' | 'RIGHT' | 'NONE';
  };
}

export enum SystemStatus {
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  ERROR = 'ERROR',
  SCANNING = 'SCANNING'
}
