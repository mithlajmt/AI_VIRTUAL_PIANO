import { useEffect, useRef, useState } from 'react';

export const useWebcam = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isActive = true;

    const startWebcam = async () => {
      try {
        setIsLoading(true);
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });
        
        if (isActive) {
          setStream(activeStream);
          if (videoRef.current) {
            videoRef.current.srcObject = activeStream;
            // Needed for iOS Safari
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.play();
          }
        }
      } catch (err: any) {
        if (isActive) {
          setError(err.message || 'Failed to access webcam');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    startWebcam();

    return () => {
      isActive = false;
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return { videoRef, stream, error, isLoading };
};
