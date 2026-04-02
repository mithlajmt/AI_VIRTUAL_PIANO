import { useEffect, useRef } from 'react';
import { useWebcam } from '../hooks/useWebcam';
import { useHandTracking } from '../hooks/useHandTracking';
import { synth } from '../utils/audio';

interface FingerState {
  y: number;
  lastTapTime: number;
  history: {x: number, y: number}[];
  lastKeyIndex: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export const HandTracker = () => {
  const { videoRef, stream, error: webcamError, isLoading: webcamLoading } = useWebcam();
  const { isModelLoaded, detectHands, error: modelError } = useHandTracking();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fingerStatesRef = useRef<Record<string, FingerState>>({});
  const ripplesRef = useRef<Ripple[]>([]);
  const pressedKeysRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let animationFrameId: number;
    let lastVideoTime = -1;

    const renderLoop = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const video = videoRef.current;
        
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const numKeys = 10;
          const pianoHeight = canvas.height * 0.45;
          const pianoY = 0; // Piano moved to the top
          const keyWidth = canvas.width / numKeys;

          const currentFrameKeys = new Set<number>();
          const currentTime = performance.now();
          const allTipsToDraw: {x: number, y: number, id: string}[] = [];

          // 1. Process Hand Tracking (Only if video/model is ready)
          if (video && isModelLoaded && video.readyState >= 2) {
            if (lastVideoTime !== video.currentTime) {
              lastVideoTime = video.currentTime;
              const startTimeMs = performance.now();
              const results = detectHands(video, startTimeMs);
              
              const FINGERTIP_INDICES = [4, 8, 12, 16, 20];
              const fingerNames = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];

              if (results && results.landmarks) {
                results.landmarks.forEach((handLandmarks, handIndex) => {
                  FINGERTIP_INDICES.forEach((landmarkIndex, i) => {
                    const landmark = handLandmarks[landmarkIndex];
                    const tipX = landmark.x * canvas.width;
                    const tipY = landmark.y * canvas.height;
                    const fingerId = `hand${handIndex}-${fingerNames[i]}`;

                    if (!fingerStatesRef.current[fingerId]) {
                      fingerStatesRef.current[fingerId] = { y: tipY, lastTapTime: 0, history: [], lastKeyIndex: -1 };
                    }

                    const state = fingerStatesRef.current[fingerId];
                    state.history.push({ x: tipX, y: tipY });
                    if (state.history.length > 8) state.history.shift();

                    const isInside = tipY <= pianoHeight;
                    const velocityY = tipY - state.y;

                    if (isInside) {
                      const keyIndex = Math.floor(tipX / keyWidth);
                      if (keyIndex >= 0 && keyIndex < numKeys) {
                        currentFrameKeys.add(keyIndex);
                        
                        const enteredNewKey = keyIndex !== state.lastKeyIndex;
                        const isPressingUp = velocityY < -3; // Negative Y is moving UP deeper into the top piano

                        // Trigger if we moved to a new key (glissando) or if we thrust upward inside the key
                        if ((enteredNewKey || isPressingUp) && (currentTime - state.lastTapTime) > 150) {
                          synth.playNote(keyIndex);
                          state.lastTapTime = currentTime;
                          pressedKeysRef.current.add(keyIndex);

                          ripplesRef.current.push({
                            x: keyIndex * keyWidth + keyWidth / 2,
                            y: pianoHeight / 2,
                            radius: 10,
                            alpha: 1
                          });
                          
                          setTimeout(() => {
                            pressedKeysRef.current.delete(keyIndex);
                          }, 150);
                        }
                        
                        state.lastKeyIndex = keyIndex;
                      }
                    } else {
                      state.lastKeyIndex = -1;
                    }
                    state.y = tipY;
                    allTipsToDraw.push({x: tipX, y: tipY, id: fingerId});
                  });
                });
              } else {
                 Object.values(fingerStatesRef.current).forEach(state => {
                     if (state.history.length > 0) state.history.shift();
                 });
              }
            } else {
              // Video time didn't change, still tick down history sizes so trails don't freeze indefinitely
              Object.values(fingerStatesRef.current).forEach(state => {
                 if (state.history.length > 0) state.history.shift();
              });
            }
          }

          // 2. Draw Piano Keys (Unconditionally)
          for (let i = 0; i < numKeys; i++) {
            const keyX = i * keyWidth;
            const isHovered = currentFrameKeys.has(i);
            const isPressed = pressedKeysRef.current.has(i);
            
            ctx.beginPath();
            
            const pressOffset = isPressed ? 8 : 0;
            ctx.roundRect(
              keyX + 3, 
              pianoY, 
              keyWidth - 6, 
              pianoHeight - 8 + pressOffset, 
              [0, 0, 14, 14] 
            );
            
            const grad = ctx.createLinearGradient(0, pianoY, 0, pianoY + pianoHeight);
            if (isPressed) {
               // Intense but transparent modern glowing emerald when pressed
               grad.addColorStop(0, 'rgba(52, 211, 153, 0.4)');
               grad.addColorStop(1, 'rgba(16, 185, 129, 0.6)');
            } else {
               // Premium glassmorphic frosted white
               grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
               grad.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
            }
            ctx.fillStyle = grad;
            
            if (isPressed) {
                ctx.shadowColor = 'rgba(52, 211, 153, 0.6)';
                ctx.shadowBlur = 25;
            } else {
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            }
            ctx.fill();
            
            // Subtle crisp border
            ctx.strokeStyle = isPressed ? 'rgba(52, 211, 153, 0.8)' : 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Delicate hover lighting
            if (isHovered && !isPressed) {
               ctx.beginPath();
               ctx.roundRect(
                 keyX + 3, 
                 pianoY, 
                 keyWidth - 6, 
                 pianoHeight - 8 + pressOffset, 
                 [0, 0, 14, 14] 
               );
               ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
               ctx.fill();
            }

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
          }

          // Modern Glass Dark Keys
          const hasBlackKeyAfter = [true, true, false, true, true, true, false, true, true, false];
          const blackKeyWidth = keyWidth * 0.55;
          const blackKeyHeight = pianoHeight * 0.55;

          for (let i = 0; i < numKeys; i++) {
            if (hasBlackKeyAfter[i]) {
               const blackKeyX = (i + 1) * keyWidth - blackKeyWidth / 2;
               ctx.beginPath();
               ctx.roundRect(
                 blackKeyX,
                 pianoY,
                 blackKeyWidth,
                 blackKeyHeight,
                 [0, 0, 8, 8]
               );
               
               // Deep dark frosted glass
               const grad = ctx.createLinearGradient(0, pianoY, 0, pianoY + blackKeyHeight);
               grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
               grad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
               ctx.fillStyle = grad;
               
               // Gives depth floating above the white keys
               ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
               ctx.shadowBlur = 12;
               ctx.shadowOffsetY = 4;
               ctx.fill();

               // Glare/reflection to look premium
               ctx.beginPath();
               ctx.roundRect(blackKeyX + 1, pianoY, blackKeyWidth - 2, blackKeyHeight - 4, [0,0,8,8]);
               const highlightGrad = ctx.createLinearGradient(0, pianoY, 0, pianoY + blackKeyHeight);
               highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
               highlightGrad.addColorStop(1, 'transparent');
               ctx.fillStyle = highlightGrad;
               ctx.fill();
               
               // Sharp thin border
               ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
               ctx.lineWidth = 1;
               ctx.stroke();

               ctx.shadowColor = 'transparent';
               ctx.shadowBlur = 0;
               ctx.shadowOffsetY = 0;
            }
          }

          // 3. Draw Ripples (Unconditionally)
          for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
            const rip = ripplesRef.current[i];
            ctx.beginPath();
            ctx.arc(rip.x, rip.y, rip.radius, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(52, 211, 153, ${rip.alpha * 0.3})`; // Lighter ripple
            ctx.fill();

            rip.radius += 8; // Slower, smaller expansion
            rip.alpha -= 0.05; // Fade out faster
            if (rip.alpha <= 0) ripplesRef.current.splice(i, 1);
          }

          // 4. Draw Trails & Fingertips (If we have tracking data)
          allTipsToDraw.forEach(tip => {
            const state = fingerStatesRef.current[tip.id];
            
            if (state && state.history.length > 1) {
              ctx.beginPath();
              ctx.moveTo(state.history[0].x, state.history[0].y);
              for (let j = 1; j < state.history.length; j++) {
                ctx.lineTo(state.history[j].x, state.history[j].y);
              }
              ctx.strokeStyle = `rgba(52, 211, 153, 0.6)`;
              ctx.lineWidth = 6;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.shadowColor = '#10b981';
              ctx.shadowBlur = 15;
              ctx.stroke();
              ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 6, 0, 2 * Math.PI); // Smaller circle
            ctx.fillStyle = '#34d399'; // Emerald bright fingertips
            ctx.shadowColor = '#6ee7b7';
            ctx.shadowBlur = 10; // Reduced from 20
            ctx.fill();
            ctx.shadowBlur = 0;
          });
        }
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isModelLoaded, detectHands, videoRef]);

  if (webcamError || modelError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-8 bg-slate-950 z-50 text-red-400">
        <p className="font-semibold text-2xl">{webcamError || modelError}</p>
      </div>
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-60"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
      />

      {(!stream || !isModelLoaded) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md z-10 transition-opacity duration-500">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6" />
          <p className="text-emerald-400 font-medium text-lg tracking-widest uppercase animate-pulse">
            {webcamLoading ? 'Accessing Camera...' : 'Loading AI Engine...'}
          </p>
        </div>
      )}
    </>
  );
};
