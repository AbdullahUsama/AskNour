'use client';

import { useState, useRef, useCallback } from 'react';

/**
 * Audio recording component with voice-to-text functionality
 * Supports WebRTC MediaRecorder API for audio capture
 */
export default function AudioRecorder({ onTranscription, isRecording, setIsRecording }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioChunksRef = useRef([]);
  const animationFrameRef = useRef(null);

  /**
   * Start audio recording
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      });

      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      // Set up audio visualization
      setupAudioVisualization(stream);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        await processRecording();
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      console.log('Recording started');

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Unable to access microphone. Please check permissions.');
    }
  }, [setIsRecording]);

  /**
   * Stop audio recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clean up audio visualization
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Stop audio stream
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      console.log('Recording stopped');
    }
  }, [setIsRecording]);

  /**
   * Set up audio visualization for recording feedback
   */
  const setupAudioVisualization = (stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateAudioLevel = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        
        if (isRecording) {
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (err) {
      console.error('Error setting up audio visualization:', err);
    }
  };

  /**
   * Process recorded audio and send for transcription
   */
  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      setError('No audio data recorded');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Create FormData for upload
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('sessionId', `session_${Date.now()}`);

      console.log('Sending audio for transcription...');

      // Send to speech-to-text API
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.transcription) {
        console.log('Transcription received:', data.transcription);
        onTranscription(data.transcription);
      } else {
        throw new Error(data.error || 'Transcription failed');
      }

    } catch (err) {
      console.error('Error processing recording:', err);
      setError('Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
      setAudioLevel(0);
    }
  };

  /**
   * Toggle recording state
   */
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  /**
   * Check if audio recording is supported
   */
  const isAudioSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  };

  if (!isAudioSupported()) {
    return (
      <div className="relative">
        <button
          disabled
          className="p-2 bg-gray-200 text-gray-400 rounded-lg cursor-not-allowed"
          title="Audio recording not supported in this browser"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.366zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Recording Button */}
      <button
        onClick={toggleRecording}
        disabled={isProcessing}
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
            : isProcessing
              ? 'bg-yellow-500 text-white cursor-wait'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }`}
        title={isRecording ? 'Click to stop recording' : 'Click to start recording'}
      >
        {isProcessing ? (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : isRecording ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <rect x="6" y="6" width="8" height="8" rx="1" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        )}

        {/* Audio Level Indicator */}
        {isRecording && (
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full"
            style={{
              transform: `scale(${1 + (audioLevel / 128)})`,
              opacity: 0.8
            }}
          />
        )}
      </button>

      {/* Recording Status */}
      {isRecording && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Recording... 🔴
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Processing... ⏳
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap max-w-48 text-center">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Audio waveform visualization component (optional enhancement)
 */
export const AudioWaveform = ({ audioLevel, isRecording }) => {
  const bars = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className="flex items-center space-x-1 h-6">
      {bars.map((bar) => (
        <div
          key={bar}
          className={`w-1 bg-current rounded-full transition-all duration-150 ${
            isRecording ? 'bg-red-500' : 'bg-gray-400'
          }`}
          style={{
            height: isRecording 
              ? `${Math.max(4, (audioLevel / 128) * 24 + Math.random() * 8)}px`
              : '4px'
          }}
        />
      ))}
    </div>
  );
};