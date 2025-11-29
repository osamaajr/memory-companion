import { useState } from 'react';
import { CameraView } from '@/components/CameraView';
import { PersonOverlay } from '@/components/PersonOverlay';
import { StatusIndicator } from '@/components/StatusIndicator';
import { useRecognition } from '@/hooks/useRecognition';
import { Camera, Power, HelpCircle } from 'lucide-react';

const Index = () => {
  const [isCameraActive, setIsCameraActive] = useState(true);
  const { person, isLoading, status, errorMessage, processImage, dismissPerson } = useRecognition();

  const handleCapture = (imageBlob: Blob) => {
    processImage(imageBlob);
  };

  const toggleCamera = () => {
    setIsCameraActive(prev => !prev);
    if (person) {
      dismissPerson();
    }
  };

  return (
    <main className="fixed inset-0 bg-foreground overflow-hidden">
      {/* Camera feed */}
      <CameraView onCapture={handleCapture} isActive={isCameraActive} />

      {/* Status indicator */}
      {isCameraActive && !person && (
        <StatusIndicator status={status} message={errorMessage || undefined} />
      )}

      {/* Person overlay */}
      <PersonOverlay 
        person={person} 
        isLoading={isLoading} 
        onDismiss={dismissPerson} 
      />

      {/* Control buttons */}
      <div className="absolute bottom-safe-bottom left-0 right-0 pb-6 px-6">
        {!person && (
          <div className="flex justify-between items-center">
            {/* Help button */}
            <button
              className="w-14 h-14 rounded-full bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-primary-foreground/20 active:scale-95"
              aria-label="Help"
            >
              <HelpCircle className="w-7 h-7 text-primary-foreground" />
            </button>

            {/* Main camera toggle */}
            <button
              onClick={toggleCamera}
              className={`
                w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95
                ${isCameraActive 
                  ? 'bg-primary shadow-lg shadow-primary/30' 
                  : 'bg-destructive shadow-lg shadow-destructive/30'}
              `}
              aria-label={isCameraActive ? 'Stop camera' : 'Start camera'}
            >
              {isCameraActive ? (
                <Camera className="w-10 h-10 text-primary-foreground" />
              ) : (
                <Power className="w-10 h-10 text-destructive-foreground" />
              )}
            </button>

            {/* Placeholder for symmetry */}
            <div className="w-14 h-14" />
          </div>
        )}
      </div>

      {/* App title - shown when camera is off */}
      {!isCameraActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/95">
          <div className="text-center px-8">
            <div className="bg-primary/20 rounded-full p-6 w-fit mx-auto mb-6">
              <Camera className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-primary-foreground mb-3">
              Memory Helper
            </h1>
            <p className="text-xl text-primary-foreground/70 mb-8 max-w-sm">
              Point the camera at someone to help remember who they are.
            </p>
            <button
              onClick={toggleCamera}
              className="px-10 py-5 bg-primary text-primary-foreground rounded-2xl text-xl font-semibold transition-all hover:bg-primary/90 active:scale-95 shadow-lg shadow-primary/30"
            >
              Start Camera
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Index;
