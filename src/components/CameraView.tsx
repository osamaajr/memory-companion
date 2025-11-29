import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

interface CameraViewProps {
  onCapture: (imageBlob: Blob) => void;
  isActive: boolean;
}

export function CameraView({ onCapture, isActive }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasPermission(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access was denied. Please allow camera access to use this app.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError('Could not access the camera. Please try again.');
        }
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
        }
      },
      'image/jpeg',
      0.8
    );
  }, [isActive, onCapture]);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isActive, startCamera, stopCamera]);

  useEffect(() => {
    if (!isActive || !hasPermission) return;

    const interval = setInterval(captureFrame, 2000);
    return () => clearInterval(interval);
  }, [isActive, hasPermission, captureFrame]);

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-foreground/95 p-8 text-center">
        <div className="bg-destructive/20 rounded-full p-6 mb-6">
          <CameraOff className="w-16 h-16 text-destructive" />
        </div>
        <h2 className="text-2xl font-semibold text-primary-foreground mb-4">
          Camera Access Needed
        </h2>
        <p className="text-lg text-primary-foreground/80 max-w-sm mb-8">
          {error || 'Please allow camera access to help recognize people around you.'}
        </p>
        <button
          onClick={startCamera}
          className="px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-medium transition-all hover:bg-primary/90 active:scale-95"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="camera-container">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Scanning indicator */}
      {isActive && hasPermission && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Corner brackets for visual guidance */}
          <div className="absolute top-8 left-8 w-16 h-16 border-l-4 border-t-4 border-primary/60 rounded-tl-2xl" />
          <div className="absolute top-8 right-8 w-16 h-16 border-r-4 border-t-4 border-primary/60 rounded-tr-2xl" />
          <div className="absolute bottom-8 left-8 w-16 h-16 border-l-4 border-b-4 border-primary/60 rounded-bl-2xl" />
          <div className="absolute bottom-8 right-8 w-16 h-16 border-r-4 border-b-4 border-primary/60 rounded-br-2xl" />
          
          {/* Scanning line animation */}
          <div className="absolute left-8 right-8 top-8 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse-soft" />
        </div>
      )}

      {/* Loading state */}
      {hasPermission === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground">
          <div className="text-center">
            <Camera className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
            <p className="text-lg text-primary-foreground">
              Starting camera...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
