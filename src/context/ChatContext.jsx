'use client';

import { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuthContext } from './AuthContext';

// Initial chat state
const initialChatState = {
  messages: [],
  isLoading: false,
  error: null,
  kycData: {},
  kycStep: 0,
  showRegisterButton: false,
  isTyping: false,
  connectionStatus: 'connecting', // 'connecting', 'connected', 'disconnected'
  lastMessageId: null,
  chatHistory: []
};

// Chat action types
export const CHAT_ACTIONS = {
  SEND_MESSAGE_START: 'SEND_MESSAGE_START',
  SEND_MESSAGE_SUCCESS: 'SEND_MESSAGE_SUCCESS',
  SEND_MESSAGE_FAILURE: 'SEND_MESSAGE_FAILURE',
  RECEIVE_MESSAGE: 'RECEIVE_MESSAGE',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  DELETE_MESSAGE: 'DELETE_MESSAGE',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_KYC_DATA: 'UPDATE_KYC_DATA',
  UPDATE_KYC_STEP: 'UPDATE_KYC_STEP',
  SET_SHOW_REGISTER_BUTTON: 'SET_SHOW_REGISTER_BUTTON',
  SET_TYPING: 'SET_TYPING',
  SET_CONNECTION_STATUS: 'SET_CONNECTION_STATUS',
  INITIALIZE_CHAT: 'INITIALIZE_CHAT',
  CLEAR_CHAT: 'CLEAR_CHAT',
  LOAD_CHAT_HISTORY: 'LOAD_CHAT_HISTORY'
};

// Chat reducer
function chatReducer(state, action) {
  switch (action.type) {
    case CHAT_ACTIONS.SEND_MESSAGE_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case CHAT_ACTIONS.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
        lastMessageId: action.payload.id
      };

    case CHAT_ACTIONS.RECEIVE_MESSAGE:
    case CHAT_ACTIONS.SEND_MESSAGE_SUCCESS:
      return {
        ...state,
        messages: [...state.messages, action.payload.message],
        isLoading: false,
        error: null,
        kycData: action.payload.kycData || state.kycData,
        kycStep: action.payload.kycStep || state.kycStep,
        showRegisterButton: action.payload.showRegisterButton ?? state.showRegisterButton,
        lastMessageId: action.payload.message.id
      };

    case CHAT_ACTIONS.UPDATE_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id
            ? { ...msg, ...action.payload.updates }
            : msg
        )
      };

    case CHAT_ACTIONS.DELETE_MESSAGE:
      return {
        ...state,
        messages: state.messages.filter(msg => msg.id !== action.payload.id)
      };

    case CHAT_ACTIONS.SEND_MESSAGE_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload.error
      };

    case CHAT_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case CHAT_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case CHAT_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case CHAT_ACTIONS.UPDATE_KYC_DATA:
      return {
        ...state,
        kycData: { ...state.kycData, ...action.payload }
      };

    case CHAT_ACTIONS.UPDATE_KYC_STEP:
      return {
        ...state,
        kycStep: action.payload
      };

    case CHAT_ACTIONS.SET_SHOW_REGISTER_BUTTON:
      return {
        ...state,
        showRegisterButton: action.payload
      };

    case CHAT_ACTIONS.SET_TYPING:
      return {
        ...state,
        isTyping: action.payload
      };

    case CHAT_ACTIONS.SET_CONNECTION_STATUS:
      return {
        ...state,
        connectionStatus: action.payload
      };

    case CHAT_ACTIONS.INITIALIZE_CHAT:
      return {
        ...state,
        messages: action.payload.messages || [],
        connectionStatus: 'connected',
        error: null
      };

    case CHAT_ACTIONS.CLEAR_CHAT:
      return {
        ...initialChatState,
        connectionStatus: state.connectionStatus
      };

    case CHAT_ACTIONS.LOAD_CHAT_HISTORY:
      return {
        ...state,
        chatHistory: action.payload,
        messages: action.payload.slice(-10) // Show last 10 messages
      };

    default:
      return state;
  }
}

// Create chat context
const ChatContext = createContext();

/**
 * Chat provider component
 */
export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const { getSessionId, isAuthenticated, getAuthHeaders } = useAuthContext();

  // Initialize chat when component mounts
  useEffect(() => {
    initializeChat();
  }, []);

  /**
   * Initialize chat session
   */
  const initializeChat = async () => {
    try {
      dispatch({ type: CHAT_ACTIONS.SET_CONNECTION_STATUS, payload: 'connecting' });
      
      const sessionId = getSessionId();
      const response = await fetch(`/api/chat?sessionId=${sessionId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success && data.welcomeMessage) {
        const welcomeMessage = {
          id: Date.now(),
          content: data.welcomeMessage,
          type: 'ai',
          timestamp: new Date(),
          isWelcome: true
        };

        dispatch({
          type: CHAT_ACTIONS.INITIALIZE_CHAT,
          payload: {
            messages: [welcomeMessage]
          }
        });
      } else {
        // Fallback welcome message
        const fallbackMessage = {
          id: Date.now(),
          content: 'Welcome to Future University Egypt! 🎓\n\nI\'m here to help you with admission information. How can I assist you today?',
          type: 'ai',
          timestamp: new Date(),
          isWelcome: true
        };

        dispatch({
          type: CHAT_ACTIONS.INITIALIZE_CHAT,
          payload: {
            messages: [fallbackMessage]
          }
        });
      }

      dispatch({ type: CHAT_ACTIONS.SET_CONNECTION_STATUS, payload: 'connected' });

    } catch (error) {
      console.error('Error initializing chat:', error);
      dispatch({ type: CHAT_ACTIONS.SET_CONNECTION_STATUS, payload: 'disconnected' });
      dispatch({
        type: CHAT_ACTIONS.SET_ERROR,
        payload: 'Failed to initialize chat. Please refresh the page.'
      });
    }
  };

  /**
   * Send message to chat API
   */
  const sendMessage = async (content, options = {}) => {
    const { isAudio = false, fileAttachment = null } = options;

    if (!content && !fileAttachment) {
      return { success: false, error: 'Message content is required' };
    }

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      content: content,
      type: 'human',
      timestamp: new Date(),
      isAudio: isAudio,
      fileAttachment: fileAttachment
    };

    dispatch({ type: CHAT_ACTIONS.ADD_MESSAGE, payload: userMessage });
    dispatch({ type: CHAT_ACTIONS.SEND_MESSAGE_START });

    try {
      const sessionId = getSessionId();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: content,
          sessionId: sessionId,
          isAuthenticated: isAuthenticated,
          kycData: state.kycData,
          kycStep: state.kycStep,
          fileAttachment: fileAttachment
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          content: data.response,
          type: 'ai',
          timestamp: new Date()
        };

        dispatch({
          type: CHAT_ACTIONS.SEND_MESSAGE_SUCCESS,
          payload: {
            message: aiMessage,
            kycData: data.kycData,
            kycStep: data.kycStep,
            showRegisterButton: data.showRegisterButton
          }
        });

        return { success: true, response: data.response };
      } else {
        throw new Error(data.error || 'Failed to send message');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        content: 'Sorry, there was an error processing your message. Please try again.',
        type: 'ai',
        timestamp: new Date(),
        isError: true
      };

      dispatch({
        type: CHAT_ACTIONS.SEND_MESSAGE_FAILURE,
        payload: { error: error.message }
      });

      dispatch({ type: CHAT_ACTIONS.ADD_MESSAGE, payload: errorMessage });

      return { success: false, error: error.message };
    }
  };

  /**
   * Handle audio transcription and send as message
   */
  const sendAudioMessage = async (transcription) => {
    if (!transcription) return { success: false, error: 'No transcription provided' };

    return await sendMessage(transcription, { isAudio: true });
  };

  /**
   * Handle file upload and send as message
   */
  const sendFileMessage = async (file, fileType) => {
    const message = `I've uploaded a ${fileType} file: ${file.name}`;
    return await sendMessage(message, { fileAttachment: { name: file.name, type: fileType, size: file.size } });
  };

  /**
   * Update KYC data
   */
  const updateKycData = (newData) => {
    dispatch({
      type: CHAT_ACTIONS.UPDATE_KYC_DATA,
      payload: newData
    });
  };

  /**
   * Update KYC step
   */
  const updateKycStep = (step) => {
    dispatch({
      type: CHAT_ACTIONS.UPDATE_KYC_STEP,
      payload: step
    });
  };

  /**
   * Set typing indicator
   */
  const setTyping = (isTyping) => {
    dispatch({
      type: CHAT_ACTIONS.SET_TYPING,
      payload: isTyping
    });
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    dispatch({ type: CHAT_ACTIONS.CLEAR_ERROR });
  };

  /**
   * Clear entire chat
   */
  const clearChat = () => {
    dispatch({ type: CHAT_ACTIONS.CLEAR_CHAT });
    // Reinitialize with welcome message
    setTimeout(() => {
      initializeChat();
    }, 100);
  };

  /**
   * Load chat history
   */
  const loadChatHistory = async () => {
    try {
      const sessionId = getSessionId();
      const response = await fetch(`/api/chat/history?sessionId=${sessionId}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({
          type: CHAT_ACTIONS.LOAD_CHAT_HISTORY,
          payload: data.history || []
        });
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  /**
   * Retry failed message
   */
  const retryMessage = async (messageId) => {
    const message = state.messages.find(msg => msg.id === messageId);
    if (message && message.type === 'human') {
      // Remove the original message and error message
      dispatch({ type: CHAT_ACTIONS.DELETE_MESSAGE, payload: { id: messageId } });
      
      // Find and remove the corresponding error message
      const errorMessage = state.messages.find(msg => 
        msg.type === 'ai' && msg.isError && msg.id > messageId
      );
      if (errorMessage) {
        dispatch({ type: CHAT_ACTIONS.DELETE_MESSAGE, payload: { id: errorMessage.id } });
      }

      // Resend the message
      return await sendMessage(message.content, { isAudio: message.isAudio });
    }
  };

  /**
   * Get message statistics
   */
  const getMessageStats = () => {
    const totalMessages = state.messages.length;
    const userMessages = state.messages.filter(msg => msg.type === 'human').length;
    const aiMessages = state.messages.filter(msg => msg.type === 'ai').length;
    const audioMessages = state.messages.filter(msg => msg.isAudio).length;
    const errorMessages = state.messages.filter(msg => msg.isError).length;

    return {
      total: totalMessages,
      user: userMessages,
      ai: aiMessages,
      audio: audioMessages,
      errors: errorMessages
    };
  };

  const contextValue = {
    // State
    ...state,
    
    // Actions
    sendMessage,
    sendAudioMessage,
    sendFileMessage,
    updateKycData,
    updateKycStep,
    setTyping,
    clearError,
    clearChat,
    loadChatHistory,
    retryMessage,
    
    // Utilities
    getMessageStats,
    initializeChat
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

/**
 * Custom hook to use chat context
 */
export function useChatContext() {
  const context = useContext(ChatContext);
  
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  
  return context;
}

export default ChatContext;