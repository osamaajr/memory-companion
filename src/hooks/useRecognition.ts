import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PersonSummary {
  name: string;
  relationship: string;
  photoUrl?: string;
  summary: string;
}

interface UseRecognitionReturn {
  person: PersonSummary | null;
  isLoading: boolean;
  status: 'scanning' | 'recognized' | 'error';
  errorMessage: string | null;
  processImage: (imageBlob: Blob) => Promise<void>;
  dismissPerson: () => void;
}

export function useRecognition(): UseRecognitionReturn {
  const [person, setPerson] = useState<PersonSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'scanning' | 'recognized' | 'error'>('scanning');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastPersonId = useRef<string | null>(null);
  const cooldownRef = useRef<boolean>(false);

  const processImage = useCallback(async (imageBlob: Blob) => {
    // Skip if we're already loading or showing a person or in cooldown
    if (isLoading || person || cooldownRef.current) return;

    try {
      // Send image to recognize endpoint
      const formData = new FormData();
      formData.append('image', imageBlob, 'frame.jpg');

      const { data: recognizeData, error: recognizeError } = await supabase.functions.invoke('recognize', {
        body: formData,
      });

      if (recognizeError) {
        console.error('Recognition error:', recognizeError);
        return;
      }

      const personId = recognizeData?.personId;
      
      // If no face detected or same person, skip
      if (!personId || personId === lastPersonId.current) {
        return;
      }

      // New person detected - fetch summary
      setIsLoading(true);
      setStatus('scanning');
      lastPersonId.current = personId;

      const { data: summaryData, error: summaryError } = await supabase.functions.invoke(`summary/${personId}`, {
        method: 'GET',
      });

      if (summaryError) {
        console.error('Summary error:', summaryError);
        setStatus('error');
        setErrorMessage('Could not load information. Please try again.');
        setIsLoading(false);
        return;
      }

      if (summaryData) {
        setPerson({
          name: summaryData.name,
          relationship: summaryData.relationship,
          photoUrl: summaryData.photoUrl,
          summary: summaryData.summary,
        });
        setStatus('recognized');
        setErrorMessage(null);
      }
    } catch (err) {
      console.error('Processing error:', err);
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, person]);

  const dismissPerson = useCallback(() => {
    setPerson(null);
    setStatus('scanning');
    setErrorMessage(null);
    
    // Add a short cooldown before detecting the same person again
    cooldownRef.current = true;
    setTimeout(() => {
      cooldownRef.current = false;
      lastPersonId.current = null;
    }, 5000);
  }, []);

  return {
    person,
    isLoading,
    status,
    errorMessage,
    processImage,
    dismissPerson,
  };
}
