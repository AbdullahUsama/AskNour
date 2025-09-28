import { useState, useCallback, useRef, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';

/**
 * Custom hook for chat operations with enhanced functionality
 */
export function useChat() {
  const [typing, setTyping] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const typingTimeoutRef = useRef(null);
  const chatContext = useChatContext();
  
  /**
   * Send text message with typing simulation
   */
  const sendMessage = useCallback(async (message, options = {}) => {
    if (!message?.trim()) return { success: false, error: 'Message is empty' };
    
    try {
      // Simulate typing if enabled
      if (options.simulateTyping !== false) {
        setTyping(true);
        chatContext.setTyping(true);
      }
      
      const result = await chatContext.sendMessage(message.trim(), options);
      
      // Clear message draft on successful send
      if (result.success) {
        setMessageDraft('');
      }
      
      return result;
      
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setTyping(false);
      chatContext.setTyping(false);
    }
  }, [chatContext]);
  
  /**
   * Send message with typing delay simulation
   */
  const sendMessageWithDelay = useCallback(async (message, delay = 1000) => {
    setTyping(true);
    chatContext.setTyping(true);
    
    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return await sendMessage(message, { simulateTyping: false });
  }, [sendMessage, chatContext]);
  
  /**
   * Handle message input with real-time typing indicators
   */
  const handleTyping = useCallback((isUserTyping) => {
    if (isUserTyping) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set typing indicator
      setTyping(true);
      
      // Clear typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 3000);
    } else {
      // Clear typing immediately when user stops
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTyping(false);
    }
  }, []);
  
  /**
   * Auto-save message draft
   */
  const updateMessageDraft = useCallback((draft) => {
    setMessageDraft(draft);
    // Auto-save to localStorage
    localStorage.setItem('chatMessageDraft', draft);
  }, []);
  
  /**
   * Load message draft from localStorage
   */
  const loadMessageDraft = useCallback(() => {
    const draft = localStorage.getItem('chatMessageDraft') || '';
    setMessageDraft(draft);
    return draft;
  }, []);
  
  /**
   * Clear message draft
   */
  const clearMessageDraft = useCallback(() => {
    setMessageDraft('');
    localStorage.removeItem('chatMessageDraft');
  }, []);
  
  /**
   * Send quick reply message
   */
  const sendQuickReply = useCallback(async (replyText) => {
    return await sendMessage(replyText, { isQuickReply: true });
  }, [sendMessage]);
  
  /**
   * Send audio message with transcription
   */
  const sendAudioMessage = useCallback(async (audioBlob) => {
    try {
      // First, get transcription
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      const transcriptionResponse = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      
      const transcriptionData = await transcriptionResponse.json();
      
      if (!transcriptionData.success) {
        throw new Error(transcriptionData.error || 'Transcription failed');
      }
      
      // Send the transcribed message
      return await chatContext.sendAudioMessage(transcriptionData.transcription);
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [chatContext]);
  
  /**
   * Send file attachment
   */
  const sendFileMessage = useCallback(async (file) => {
    if (!file) return { success: false, error: 'No file provided' };
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 10MB' };
    }
    
    // Determine file type
    const fileType = getFileType(file);
    
    if (!fileType) {
      return { success: false, error: 'Unsupported file type' };
    }
    
    return await chatContext.sendFileMessage(file, fileType);
  }, [chatContext]);
  
  /**
   * Get file type from file object
   */
  const getFileType = useCallback((file) => {
    const mimeType = file.type;
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Document types
    if (mimeType.includes('pdf') || extension === 'pdf') return 'pdf';
    if (mimeType.includes('document') || ['doc', 'docx'].includes(extension)) return 'document';
    if (mimeType.includes('spreadsheet') || ['xls', 'xlsx'].includes(extension)) return 'spreadsheet';
    if (mimeType.includes('presentation') || ['ppt', 'pptx'].includes(extension)) return 'presentation';
    
    // Image types
    if (mimeType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) return 'image';
    
    // Text types
    if (mimeType.includes('text') || ['txt', 'md', 'csv'].includes(extension)) return 'text';
    
    return null;
  }, []);
  
  /**
   * Search messages
   */
  const searchMessages = useCallback((query) => {
    if (!query?.trim()) return [];
    
    const searchTerm = query.toLowerCase();
    return chatContext.messages.filter(message => 
      message.content?.toLowerCase().includes(searchTerm)
    );
  }, [chatContext.messages]);
  
  /**
   * Filter messages by type
   */
  const filterMessages = useCallback((filters) => {
    const { type, hasAttachment, isAudio, timeRange } = filters;
    
    return chatContext.messages.filter(message => {
      // Type filter
      if (type && message.type !== type) return false;
      
      // Attachment filter
      if (hasAttachment !== undefined && !!message.fileAttachment !== hasAttachment) return false;
      
      // Audio filter
      if (isAudio !== undefined && !!message.isAudio !== isAudio) return false;
      
      // Time range filter
      if (timeRange) {
        const messageTime = new Date(message.timestamp);
        const { start, end } = timeRange;
        if (start && messageTime < new Date(start)) return false;
        if (end && messageTime > new Date(end)) return false;
      }
      
      return true;
    });
  }, [chatContext.messages]);
  
  /**
   * Get message thread/conversation
   */
  const getMessageThread = useCallback((messageId) => {
    const messageIndex = chatContext.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return [];
    
    // Get context around the message (previous 5 and next 5 messages)
    const start = Math.max(0, messageIndex - 5);
    const end = Math.min(chatContext.messages.length, messageIndex + 6);
    
    return chatContext.messages.slice(start, end);
  }, [chatContext.messages]);
  
  /**
   * Export chat history
   */
  const exportChatHistory = useCallback((format = 'json') => {
    const data = {
      messages: chatContext.messages,
      kycData: chatContext.kycData,
      kycStep: chatContext.kycStep,
      exportDate: new Date().toISOString(),
      stats: chatContext.getMessageStats()
    };
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      return URL.createObjectURL(blob);
    }
    
    if (format === 'txt') {
      const textContent = chatContext.messages
        .map(msg => `${msg.type.toUpperCase()} [${new Date(msg.timestamp).toLocaleString()}]: ${msg.content}`)
        .join('\n\n');
      
      const blob = new Blob([textContent], { type: 'text/plain' });
      return URL.createObjectURL(blob);
    }
    
    return null;
  }, [chatContext]);
  
  /**
   * Select message for actions (edit, delete, etc.)
   */
  const selectMessage = useCallback((messageId) => {
    setSelectedMessage(messageId);
  }, []);
  
  /**
   * Clear message selection
   */
  const clearSelection = useCallback(() => {
    setSelectedMessage(null);
  }, []);
  
  /**
   * Get conversation summary
   */
  const getConversationSummary = useCallback(() => {
    const stats = chatContext.getMessageStats();
    const firstMessage = chatContext.messages[0];
    const lastMessage = chatContext.messages[chatContext.messages.length - 1];
    
    return {
      messageCount: stats.total,
      userMessageCount: stats.user,
      aiMessageCount: stats.ai,
      audioMessageCount: stats.audio,
      errorCount: stats.errors,
      startTime: firstMessage?.timestamp,
      lastActivity: lastMessage?.timestamp,
      kycProgress: {
        currentStep: chatContext.kycStep,
        data: chatContext.kycData
      },
      connectionStatus: chatContext.connectionStatus
    };
  }, [chatContext]);
  
  /**
   * Load draft on component mount
   */
  useEffect(() => {
    loadMessageDraft();
  }, [loadMessageDraft]);
  
  /**
   * Cleanup typing timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    // State from chat context
    messages: chatContext.messages,
    isLoading: chatContext.isLoading,
    error: chatContext.error,
    kycData: chatContext.kycData,
    kycStep: chatContext.kycStep,
    showRegisterButton: chatContext.showRegisterButton,
    isTyping: chatContext.isTyping || typing,
    connectionStatus: chatContext.connectionStatus,
    
    // Local state
    messageDraft,
    selectedMessage,
    
    // Message operations
    sendMessage,
    sendMessageWithDelay,
    sendQuickReply,
    sendAudioMessage,
    sendFileMessage,
    
    // Draft management
    updateMessageDraft,
    loadMessageDraft,
    clearMessageDraft,
    
    // Typing indicators
    handleTyping,
    
    // Message utilities
    searchMessages,
    filterMessages,
    getMessageThread,
    exportChatHistory,
    
    // Selection
    selectMessage,
    clearSelection,
    
    // Chat operations from context
    updateKycData: chatContext.updateKycData,
    updateKycStep: chatContext.updateKycStep,
    clearError: chatContext.clearError,
    clearChat: chatContext.clearChat,
    loadChatHistory: chatContext.loadChatHistory,
    retryMessage: chatContext.retryMessage,
    
    // Utilities
    getConversationSummary,
    getMessageStats: chatContext.getMessageStats
  };
}

export default useChat;