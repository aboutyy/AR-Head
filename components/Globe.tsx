
import React, { useRef, useMemo, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { PointMaterial, Line } from '@react-three/drei';
import * as THREE from 'three';
import { TrackingData } from '../types';

// --- Spherical Particle Generation ---
const particleCount = 1200; 
const particlesPosition = new Float32Array(particleCount * 3);
const GLOBE_RADIUS = 1.5; 

for (let i = 0; i < particleCount; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / particleCount);
    const theta = Math.PI * (1 + 5 ** 0.5) * (i + 0.5);
    const r = GLOBE_RADIUS * 1.05; 
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    const noise = 1 + (Math.random() * 0.1); 
    particlesPosition[i * 3] = x * noise;
    particlesPosition[i * 3 + 1] = y * noise;
    particlesPosition[i * 3 + 2] = z * noise;
}

// --- Holographic Shader Definition ---
const holoVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const holoFragmentShader = `
  uniform float uTime;
  uniform sampler2D uMap; 
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    vec4 mapColor = texture2D(uMap, vUv);
    float landMask = mapColor.r; 

    float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
    float scanline = sin(vUv.y * 150.0 - uTime * 3.0) * 0.5 + 0.5;
    float flicker = sin(uTime * 40.0) * 0.02;
    
    vec3 oceanColor = vec3(0.0, 0.1, 0.2);
    vec3 landColor = vec3(0.0, 1.0, 1.0);
    
    vec3 finalColor = mix(oceanColor, landColor, landMask);
    finalColor += landColor * scanline * landMask * 0.5;
    finalColor += vec3(0.0, 0.6, 1.0) * fresnel * 0.8;

    float alpha = (landMask * 0.5) + (fresnel * 0.6) + flicker;
    if (landMask > 0.1) {
        alpha += scanline * 0.2;
    }

    alpha = clamp(alpha, 0.0, 0.95);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

interface GlobeProps {
  trackingRef: React.MutableRefObject<TrackingData>;
}

export const Globe: React.FC<GlobeProps> = ({ trackingRef }) => {
  const { viewport } = useThree();
  const meshRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);
  const earthCoreRef = useRef<THREE.Mesh>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const lineRef = useRef<any>(null);
  
  const earthMap = useLoader(THREE.TextureLoader, 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg');

  // State tracking
  const targetRotation = useRef({ x: 0, y: 0 });
  const targetScale = useRef(0.6); 
  const targetPosition = useRef({ x: -2.0, y: 0 });
  
  // Interaction Logic State
  const isInteractingRef = useRef({ 
    leftPinch: false, 
    rightPinch: false,
    scalingLocked: false
  });
  
  const interactionData = useRef({
      lastLeftPos: { x: 0, y: 0 },
      lastRightPos: { x: 0, y: 0 },
      initialHandDistance: 0,
      initialGlobeScale: 0.6,
      linePoints: [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)] as [THREE.Vector3, THREE.Vector3]
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMap: { value: earthMap }
  }), [earthMap]);

  useFrame((state, delta) => {
    if (!groupRef.current || !trackingRef.current) return;

    // Update Shader
    if (shaderRef.current) {
        shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }

    // Idle Rotation
    if (earthCoreRef.current) earthCoreRef.current.rotation.y += delta * 0.05;
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.02;

    const tracking = trackingRef.current;
    const { leftHand, rightHand, distance } = tracking.hands;
    const { face } = tracking;

    // --- Head Tracking Parallax ---
    let parallaxX = 0;
    let parallaxY = 0;
    if (face.detected) {
       parallaxX = (face.x - 0.5) * -0.5; 
       parallaxY = (face.y - 0.5) * -0.5;
    }

    // --- INTERACTION LOGIC ---
    
    // Map normalized hand coordinates (0..1) to ThreeJS Viewport coordinates
    // Note: Viewport Y is inverted relative to Screen Y
    const getHandVec3 = (hand: {x: number, y: number}) => {
        return new THREE.Vector3(
            (hand.x - 0.5) * viewport.width, 
            (0.5 - hand.y) * viewport.height, 
            0
        );
    };

    const isLeftPinching = leftHand?.isPinching || false;
    const isRightPinching = rightHand?.isPinching || false;

    // === PRIORITY 1: DUAL PINCH SCALING ===
    if (leftHand && rightHand && isLeftPinching && isRightPinching) {
        // Update visual connector line
        const p1 = getHandVec3(leftHand);
        const p2 = getHandVec3(rightHand);
        // Transform points to be local to the group (roughly) or just use world space if line is outside group
        // To keep simple, let's assume line is separate. We'll handle line rendering outside logic.
        interactionData.current.linePoints = [p1, p2];

        if (!isInteractingRef.current.scalingLocked) {
            // START SCALING
            isInteractingRef.current.scalingLocked = true;
            interactionData.current.initialHandDistance = distance;
            interactionData.current.initialGlobeScale = targetScale.current;
        } else {
            // UPDATE SCALING
            // Avoid divide by zero
            const safeDist = Math.max(0.01, interactionData.current.initialHandDistance);
            const ratio = distance / safeDist;
            
            const newScale = interactionData.current.initialGlobeScale * ratio;
            targetScale.current = Math.max(0.2, Math.min(3.5, newScale));
        }

        // Update history positions to prevent jumping when releasing one hand
        interactionData.current.lastLeftPos = { x: leftHand.x, y: leftHand.y };
        interactionData.current.lastRightPos = { x: rightHand.x, y: rightHand.y };
        
        // Disable individual flags
        isInteractingRef.current.leftPinch = false;
        isInteractingRef.current.rightPinch = false;

    } 
    // === PRIORITY 2: SINGLE HAND ACTIONS ===
    else {
        isInteractingRef.current.scalingLocked = false;

        // LEFT HAND: ROTATE
        if (leftHand) {
            if (isLeftPinching) {
                if (!isInteractingRef.current.leftPinch) {
                    isInteractingRef.current.leftPinch = true;
                } else {
                    const dx = leftHand.x - interactionData.current.lastLeftPos.x;
                    const dy = leftHand.y - interactionData.current.lastLeftPos.y;
                    targetRotation.current.y += dx * 8; 
                    targetRotation.current.x += dy * 8;
                }
            } else {
                isInteractingRef.current.leftPinch = false;
            }
            interactionData.current.lastLeftPos = { x: leftHand.x, y: leftHand.y };
        }

        // RIGHT HAND: PAN
        if (rightHand) {
            if (isRightPinching) {
                if (!isInteractingRef.current.rightPinch) {
                    isInteractingRef.current.rightPinch = true;
                } else {
                    const dx = rightHand.x - interactionData.current.lastRightPos.x;
                    const dy = rightHand.y - interactionData.current.lastRightPos.y;
                    targetPosition.current.x += dx * 12;
                    targetPosition.current.y -= dy * 12; 
                }
            } else {
                isInteractingRef.current.rightPinch = false;
            }
            interactionData.current.lastRightPos = { x: rightHand.x, y: rightHand.y };
        }
    }

    // --- CONSTRAINTS & ANIMATION ---
    const VIEW_LIMIT_X_MIN = -4.0;
    const VIEW_LIMIT_X_MAX = 2.0; 
    const VIEW_LIMIT_Y = 2.5;

    targetPosition.current.x = Math.max(VIEW_LIMIT_X_MIN, Math.min(VIEW_LIMIT_X_MAX, targetPosition.current.x));
    targetPosition.current.y = Math.max(-VIEW_LIMIT_Y, Math.min(VIEW_LIMIT_Y, targetPosition.current.y));

    const damp = 0.1; 
    
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetPosition.current.x + parallaxX, damp);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetPosition.current.y + parallaxY, damp);
    
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation.current.x, damp);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation.current.y, damp);
    
    const currentScale = groupRef.current.scale.x;
    const nextScale = THREE.MathUtils.lerp(currentScale, targetScale.current, 0.1);
    groupRef.current.scale.setScalar(nextScale);
  });

  return (
    <>
        <group position={[-2.0, 0, 0]} ref={groupRef}> 
            {/* 1. Core Sphere */}
            <mesh ref={earthCoreRef}>
            <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
            <shaderMaterial 
                ref={shaderRef}
                vertexShader={holoVertexShader}
                fragmentShader={holoFragmentShader}
                uniforms={uniforms}
                transparent={true}
                side={THREE.FrontSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
            </mesh>

            {/* 2. Wireframe Overlay */}
            <mesh rotation={[0, 0.2, 0]}>
            <icosahedronGeometry args={[GLOBE_RADIUS * 1.01, 2]} />
            <meshBasicMaterial 
                color="#0044aa" 
                wireframe 
                transparent 
                opacity={0.15} 
                blending={THREE.AdditiveBlending}
            />
            </mesh>

            {/* 3. Particles */}
            <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute
                attach="attributes-position"
                count={particlesPosition.length / 3}
                array={particlesPosition}
                itemSize={3}
                />
            </bufferGeometry>
            <PointMaterial
                transparent
                color="#00ffff"
                size={0.02}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                opacity={0.4}
            />
            </points>
        </group>

        {/* 4. Visual Feedback: Dual Pinch Connector Line */}
        {/* We render this outside the group so it stays stationary relative to camera frame, tracking hands accurately */}
        {isInteractingRef.current.scalingLocked && (
            <Line 
                points={interactionData.current.linePoints} 
                color="cyan" 
                lineWidth={2} 
                dashed={true}
                dashScale={2}
                gapSize={2}
                opacity={0.5}
                transparent
            />
        )}
        {isInteractingRef.current.scalingLocked && (
             <mesh position={interactionData.current.linePoints[0]}>
                 <ringGeometry args={[0.05, 0.08, 32]} />
                 <meshBasicMaterial color="cyan" transparent opacity={0.8} />
             </mesh>
        )}
        {isInteractingRef.current.scalingLocked && (
             <mesh position={interactionData.current.linePoints[1]}>
                 <ringGeometry args={[0.05, 0.08, 32]} />
                 <meshBasicMaterial color="cyan" transparent opacity={0.8} />
             </mesh>
        )}
    </>
  );
};
