
import { useEffect, useRef, useState } from 'react';
import { initializeVision, getFaceLandmarker, getHandLandmarker } from '../services/visionService';
import { TrackingData, SystemStatus } from '../types';

export const useAR = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<SystemStatus>(SystemStatus.INITIALIZING);
  const requestRef = useRef<number>(0);
  
  const trackingRef = useRef<TrackingData>({
    face: { 
      detected: false, 
      x: 0.5, y: 0.5, z: 0, 
      tiltX: 0, tiltY: 0, tiltZ: 0,
      leftEye: { x: 0.5, y: 0.5 },
      rightEye: { x: 0.5, y: 0.5 }
    },
    hands: { detected: false, leftHand: null, rightHand: null, distance: 0, gesture: 'IDLE', swipeDirection: 'NONE' }
  });

  // Swipe detection state
  const lastHandX = useRef<number>(0.5);
  const swipeCooldown = useRef<number>(0);

  useEffect(() => {
    const startCamera = async () => {
      try {
        await initializeVision();
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1280,
            height: 720,
            facingMode: 'user'
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready
          videoRef.current.onloadeddata = () => {
             predictWebcam();
             setStatus(SystemStatus.READY);
          };
        }
      } catch (err) {
        console.error(err);
        setStatus(SystemStatus.ERROR);
      }
    };

    startCamera();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const predictWebcam = () => {
    const video = videoRef.current;
    const faceModel = getFaceLandmarker();
    const handModel = getHandLandmarker();

    if (video && faceModel && handModel) {
      const startTimeMs = performance.now();

      // Check if video is actually playing and has data
      if (video.readyState >= 2 && !video.paused && !video.ended) {
          // 1. Face Detection
          const faceResult = faceModel.detectForVideo(video, startTimeMs);
          
          if (faceResult.faceLandmarks.length > 0) {
            const landmarks = faceResult.faceLandmarks[0];
            
            // Simple averages for eye centers
            const leftEyeY = (landmarks[159].y + landmarks[145].y) / 2;
            const leftEyeX = (landmarks[159].x + landmarks[145].x) / 2;
            const rightEyeY = (landmarks[386].y + landmarks[374].y) / 2;
            const rightEyeX = (landmarks[386].x + landmarks[374].x) / 2;

            trackingRef.current.face = {
              detected: true,
              x: 1 - landmarks[1].x, // Mirror X for self-view
              y: landmarks[1].y,
              z: landmarks[1].z,
              tiltX: (landmarks[1].y - (landmarks[10].y + landmarks[152].y)/2) * 2,
              tiltY: (landmarks[234].z - landmarks[454].z),
              tiltZ: (landmarks[234].y - landmarks[454].y),
              leftEye: { x: 1 - leftEyeX, y: leftEyeY },
              rightEye: { x: 1 - rightEyeX, y: rightEyeY }
            };
          } else {
            trackingRef.current.face.detected = false;
          }

          // 2. Hand Detection
          const handResult = handModel.detectForVideo(video, startTimeMs);
          
          const handsData: TrackingData['hands'] = {
             detected: handResult.landmarks.length > 0,
             leftHand: null,
             rightHand: null,
             distance: 0,
             gesture: 'IDLE',
             swipeDirection: 'NONE'
          };

          // Process hands
          for (const landmarks of handResult.landmarks) {
              if (!landmarks || landmarks.length < 21) continue;

              const wrist = landmarks[0];
              const thumbTip = landmarks[4];
              const indexTip = landmarks[8];
              const middleTip = landmarks[12];
              const ringTip = landmarks[16];
              const pinkyTip = landmarks[20];
              const indexMCP = landmarks[5];

              // Calculate Pinch (Thumb tip to Index tip distance)
              const pinchDist = Math.sqrt(
                  Math.pow(thumbTip.x - indexTip.x, 2) + 
                  Math.pow(thumbTip.y - indexTip.y, 2)
              );
              const isPinching = pinchDist < 0.05;

              // Calculate Hand Size (Proxy for distance from camera)
              // Distance from Wrist to Index MCP is structurally stable
              const refScale = Math.sqrt(Math.pow(wrist.x - indexMCP.x, 2) + Math.pow(wrist.y - indexMCP.y, 2));
              // Clamp min size to avoid division by zero errors later
              const handSize = Math.max(0.01, refScale);

              // Calculate Openness (Average distance of tips from wrist relative to hand size)
              const tipsDist = (
                  Math.sqrt(Math.pow(thumbTip.x - wrist.x, 2) + Math.pow(thumbTip.y - wrist.y, 2)) +
                  Math.sqrt(Math.pow(indexTip.x - wrist.x, 2) + Math.pow(indexTip.y - wrist.y, 2)) +
                  Math.sqrt(Math.pow(middleTip.x - wrist.x, 2) + Math.pow(middleTip.y - wrist.y, 2)) +
                  Math.sqrt(Math.pow(ringTip.x - wrist.x, 2) + Math.pow(ringTip.y - wrist.y, 2)) +
                  Math.sqrt(Math.pow(pinkyTip.x - wrist.x, 2) + Math.pow(pinkyTip.y - wrist.y, 2))
              ) / 5;

              // Normalized openness ratio
              const opennessRatio = tipsDist / handSize;
              // Map roughly 1.0 (fist) to 2.5 (open) -> 0 to 1
              const handOpenness = Math.min(Math.max((opennessRatio - 0.8) / 1.7, 0), 1);
              
              // Lowered threshold to 0.5 to make it easier to trigger
              const isPalmUp = wrist.y > middleTip.y && handOpenness > 0.5;

              const handObj = {
                  x: 1 - wrist.x, // Mirror coordinate
                  y: wrist.y,
                  z: wrist.z,
                  isPinching,
                  isPalmUp,
                  handOpenness,
                  handSize
              };

              // Spatial assignment based on screen position (Mirrored View)
              // If real hand is on user's Left, it appears on right side of camera frame (x > 0.5)
              // We want this to be the "Left Hand" in the UI (screen left)
              if (wrist.x > 0.5) {
                  handsData.leftHand = handObj;
              } else {
                  handsData.rightHand = handObj;
              }
          }

          // Calculate Inter-hand distance (for Dual Pinch Scaling)
          if (handsData.leftHand && handsData.rightHand) {
              const dx = handsData.leftHand.x - handsData.rightHand.x;
              const dy = handsData.leftHand.y - handsData.rightHand.y;
              handsData.distance = Math.sqrt(dx*dx + dy*dy);
          }

          // Swipe Gesture (Right Hand Only)
          if (handsData.rightHand) {
             const x = handsData.rightHand.x;
             
             // Only detect swipe if hand was present in previous frame to avoid jump
             const wasHandPresent = !!trackingRef.current.hands.rightHand;

             if (wasHandPresent && swipeCooldown.current <= 0) {
                 const dx = x - lastHandX.current;
                 // Threshold reduced from 0.15 to 0.04 for better sensitivity
                 if (dx > 0.04) {
                     handsData.swipeDirection = 'RIGHT';
                     swipeCooldown.current = 15; // Slightly reduced cooldown
                 } else if (dx < -0.04) {
                     handsData.swipeDirection = 'LEFT';
                     swipeCooldown.current = 15;
                 }
             } else if (!wasHandPresent) {
                 // Reset X if hand just appeared
                 lastHandX.current = x;
             }

             // Always update last X
             lastHandX.current = x;
          }

          if (swipeCooldown.current > 0) {
              swipeCooldown.current--;
              if (swipeCooldown.current === 0) handsData.swipeDirection = 'NONE';
          } else {
              handsData.swipeDirection = 'NONE';
          }
          
          trackingRef.current.hands = handsData;
      }
      
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  };

  return { videoRef, status, trackingRef };
};
