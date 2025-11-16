'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    continuous = true,
    interimResults = true,
    lang = 'en-US',
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const shouldBeListeningRef = useRef(false); // Track if we should be listening

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[STT] Speech recognition not supported in this browser');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalText += text + ' ';
        } else {
          interimText += text;
        }
      }

      if (finalText) {
        setTranscript(prev => prev + finalText);
        if (onResult) {
          onResult(finalText.trim(), true);
        }
      }

      if (interimText) {
        setInterimTranscript(interimText);
        if (onResult && interimResults) {
          onResult(interimText, false);
        }
      }
    };

    recognition.onerror = (event: any) => {
      // Ignore abort errors - they're normal when stopping recognition
      if (event.error === 'aborted') {
        console.log('[STT] Speech recognition aborted (normal stop)');
        return;
      }
      
      // Ignore no-speech errors - just means user paused
      if (event.error === 'no-speech') {
        console.log('[STT] No speech detected');
        // Only set to false if we're not supposed to be listening
        if (!shouldBeListeningRef.current) {
          setIsListening(false);
        }
        return;
      }
      
      console.error('[STT] Speech recognition error:', event.error);
      setIsListening(false);
      shouldBeListeningRef.current = false;

      if (onError) {
        onError(event.error);
      }
    };

    recognition.onend = () => {
      console.log('[STT] Speech recognition ended');
      // Only set to false and stop if we're not supposed to be listening
      if (!shouldBeListeningRef.current) {
        setIsListening(false);
      } else {
        // Restart if we should still be listening (continuous mode)
        try {
          console.log('[STT] Restarting recognition (continuous mode)');
          recognitionRef.current?.start();
        } catch (e) {
          console.warn('[STT] Could not restart recognition:', e);
          setIsListening(false);
          shouldBeListeningRef.current = false;
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [continuous, interimResults, lang, onResult, onError]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.warn('[STT] Speech recognition not initialized');
      return;
    }

    try {
      shouldBeListeningRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
      console.log('[STT] Started listening');
    } catch (error: any) {
      console.error('[STT] Error starting recognition:', error);
      shouldBeListeningRef.current = false;
      if (onError) {
        onError(error.message);
      }
    }
  }, [onError]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }

    try {
      shouldBeListeningRef.current = false; // Mark that we should NOT be listening
      setIsListening(false); // Set state first to prevent race conditions
      recognitionRef.current.stop();
      console.log('[STT] Stopped listening');
    } catch (error: any) {
      console.error('[STT] Error stopping recognition:', error);
      // Ensure state is consistent even on error
      shouldBeListeningRef.current = false;
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
