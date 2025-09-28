import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for speech-to-text functionality with enhanced features
 */
export function useSpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  /**
   * Check browser support for audio recording
   */
  useEffect(() => {
    const checkSupport = () => {
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
      const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
      
      setIsSupported(hasMediaRecorder && hasGetUserMedia && hasAudioContext);
    };
    
    checkSupport();
  }, []);
  
  /**
   * Initialize audio recording
   */
  const initializeRecording = useCallback(async () => {
    try {
      if (!isSupported) {
        throw new Error('Audio recording is not supported in this browser');
      }
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      });
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      // Set up audio context for level monitoring
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      // Store references
      mediaRecorderRef.current = mediaRecorder;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;
      
      return { success: true, mediaRecorder, stream };
      
    } catch (err) {
      let errorMessage = 'Failed to initialize recording';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone found';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application';
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [isSupported]);
  
  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    if (isRecording || isProcessing) return { success: false, error: 'Already recording or processing' };
    
    setError(null);
    setTranscription('');
    setRecordingDuration(0);
    audioChunksRef.current = [];
    
    try {
      const { success, mediaRecorder, error } = await initializeRecording();
      
      if (!success) {
        return { success: false, error };
      }
      
      // Set up MediaRecorder event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        await processRecording();
      };
      
      mediaRecorder.onerror = (event) => {
        setError('Recording error occurred');
        setIsRecording(false);
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every 1000ms
      setIsRecording(true);
      
      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      // Start audio level monitoring
      monitorAudioLevel();
      
      return { success: true };
      
    } catch (err) {
      const errorMessage = err.message || 'Failed to start recording';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [isRecording, isProcessing, initializeRecording, monitorAudioLevel, processRecording]);
  
  /**
   * Stop recording audio
   */
  const stopRecording = useCallback(() => {
    if (!isRecording) return { success: false, error: 'Not currently recording' };
    
    try {
      // Stop MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Stop audio level monitoring
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // Stop microphone stream
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      setAudioLevel(0);
      
      return { success: true };
      
    } catch (err) {
      const errorMessage = err.message || 'Failed to stop recording';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [isRecording]);
  
  /**
   * Process recorded audio and get transcription
   */
  const processRecording = useCallback(async () => {
    if (audioChunksRef.current.length === 0) {
      setError('No audio data recorded');
      return { success: false, error: 'No audio data recorded' };
    }
    
    setIsProcessing(true);
    
    try {
      // Create blob from audio chunks
      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || 'audio/webm'
      });
      
      // Check minimum audio duration (1 second)
      if (recordingDuration < 1) {
        throw new Error('Recording too short. Please record for at least 1 second.');
      }
      
      // Send to speech-to-text API
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording.${audioBlob.type.split('/')[1]}`);
      formData.append('language', 'auto'); // Auto-detect language (Arabic/English)
      
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Transcription failed');
      }
      
      if (!data.transcription?.trim()) {
        throw new Error('No speech detected. Please try again.');
      }
      
      setTranscription(data.transcription);
      
      return {
        success: true,
        transcription: data.transcription,
        audioBlob: audioBlob,
        duration: recordingDuration,
        language: data.language || 'unknown'
      };
      
    } catch (err) {
      const errorMessage = err.message || 'Failed to process recording';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, [recordingDuration]);
  
  /**
   * Monitor audio levels for visual feedback
   */
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateLevel = () => {
      if (!isRecording) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Normalize to 0-100
      const level = Math.min(100, (average / 128) * 100);
      setAudioLevel(level);
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  }, [isRecording]);
  
  /**
   * Cancel current recording
   */
  const cancelRecording = useCallback(() => {
    if (!isRecording && !isProcessing) return { success: false, error: 'Nothing to cancel' };
    
    try {
      // Stop recording without processing
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // Clear all state
      setIsRecording(false);
      setIsProcessing(false);
      setTranscription('');
      setRecordingDuration(0);
      setAudioLevel(0);
      setError(null);
      
      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Stop audio level monitoring
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Clean up resources
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      // Clear audio chunks
      audioChunksRef.current = [];
      
      return { success: true };
      
    } catch (err) {
      const errorMessage = err.message || 'Failed to cancel recording';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [isRecording, isProcessing]);
  
  /**
   * Clear transcription and error state
   */
  const clearTranscription = useCallback(() => {
    setTranscription('');
    setError(null);
  }, []);
  
  /**
   * Get formatted recording time
   */
  const getFormattedDuration = useCallback(() => {
    const minutes = Math.floor(recordingDuration / 60);
    const seconds = recordingDuration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [recordingDuration]);
  
  /**
   * Check if microphone permission is granted
   */
  const checkMicrophonePermission = useCallback(async () => {
    try {
      if (!navigator.permissions) {
        return { status: 'unknown' };
      }
      
      const permission = await navigator.permissions.query({ name: 'microphone' });
      return { status: permission.state };
    } catch (err) {
      return { status: 'unknown', error: err.message };
    }
  }, []);
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  return {
    // State
    isRecording,
    isProcessing,
    transcription,
    error,
    audioLevel,
    recordingDuration,
    isSupported,
    
    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    clearTranscription,
    
    // Utilities
    getFormattedDuration,
    checkMicrophonePermission,
    
    // Status
    canRecord: isSupported && !isRecording && !isProcessing,
    canStop: isRecording,
    canCancel: isRecording || isProcessing
  };
}

export default useSpeechToText;