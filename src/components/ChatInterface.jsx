'use client';

import { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import AudioRecorder from './AudioRecorder';
import FileUpload from './FileUpload';

/**
 * Main chat interface component
 * Handles the complete chat experience including KYC, authentication, and messaging
 */
export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('guest');
  const [kycStep, setKycStep] = useState(0);
  const [kycData, setKycData] = useState({});
  const [showRegisterButton, setShowRegisterButton] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat session
  useEffect(() => {
    initializeChat();
  }, []);

  /**
   * Initialize chat session and get welcome message
   */
  const initializeChat = async () => {
    try {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      const response = await fetch(`/api/chat?sessionId=${newSessionId}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (data.success) {
        setMessages([{
          id: 1,
          content: data.welcomeMessage,
          type: 'ai',
          timestamp: new Date(),
          isWelcome: true
        }]);
        setIsAuthenticated(data.isAuthenticated);
        setUserRole(data.userRole);
        setKycStep(data.kycStep);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      // Fallback welcome message
      setMessages([{
        id: 1,
        content: 'Welcome to Future University Egypt! 🎓\n\nI\'m here to help you with admission information. How can I assist you today?',
        type: 'ai',
        timestamp: new Date(),
        isWelcome: true
      }]);
    }
  };

  /**
   * Send message to the chat API - This is the Next.js equivalent of @cl.on_message
   * It processes messages the same way as handle_message() in the Python version
   */
  const sendMessage = async (messageContent = null, isAudio = false) => {
    const content = messageContent || inputMessage.trim();
    if (!content && !isAudio) return;

    const userMessage = {
      id: Date.now(),
      content: content,
      type: 'human',
      timestamp: new Date(),
      isAudio: isAudio
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare chat history in the format expected by the API
      const chatHistory = messages.map(msg => ({
        role: msg.type === 'human' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          sessionId: sessionId,
          isAuthenticated: isAuthenticated,
          userRole: userRole,
          kycStep: kycStep,
          kycData: kycData,
          chatHistory: chatHistory // Include chat history for context
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          content: data.response,
          type: 'ai',
          timestamp: new Date(),
          media: data.media // Include media if present
        };

        setMessages(prev => [...prev, aiMessage]);

        // Update session state based on response
        if (data.kycStep !== undefined) setKycStep(data.kycStep);
        if (data.isAuthenticated !== undefined) setIsAuthenticated(data.isAuthenticated);
        if (data.showRegisterButton !== undefined) setShowRegisterButton(data.showRegisterButton);
        if (data.kycData) setKycData(data.kycData);

        // Handle media display separately if present
        if (data.media && (data.media.images?.length > 0 || data.media.videos?.length > 0)) {
          const mediaMessage = {
            id: Date.now() + 2,
            content: "Here are some relevant media files:",
            type: 'ai',
            timestamp: new Date(),
            media: data.media,
            isMediaOnly: true
          };
          
          setTimeout(() => {
            setMessages(prev => [...prev, mediaMessage]);
          }, 500); // Small delay for better UX
        }

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
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle audio transcription
   */
  const handleAudioTranscription = async (transcription) => {
    if (transcription) {
      await sendMessage(transcription, true);
    }
  };

  /**
   * Handle file upload
   */
  const handleFileUpload = async (file, fileType) => {
    // For now, just notify that file upload is not implemented
    const message = {
      id: Date.now(),
      content: `File upload feature coming soon! You tried to upload: ${file.name}`,
      type: 'ai',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /**
   * Navigate to registration page
   */
  const handleRegisterClick = () => {
    const registerUrl = process.env.NEXT_PUBLIC_REGISTER_BUTTON_URL || '/auth/register';
    if (registerUrl.startsWith('http')) {
      window.open(registerUrl, '_blank');
    } else {
      window.location.href = registerUrl;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Welcome Banner (only for new users) */}
      {!isAuthenticated && messages.length <= 1 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎓</span>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-1">Welcome to FUE Admission Assistant!</h2>
                <p className="text-blue-100 text-sm">I can help you with programs, requirements, deadlines, and more in Arabic or English.</p>
              </div>
              {showRegisterButton && (
                <button
                  onClick={handleRegisterClick}
                  className="bg-white text-blue-600 text-sm px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  Complete Registration
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto chat-messages pb-24">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isUser={message.type === 'human'}
            />
          ))}
          
          {isLoading && (
            <div className="flex justify-start mb-6">
              <div className="flex-shrink-0 mr-3">
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  AI
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-500 ml-2">AI is thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-12 left-0 right-0 px-4 py-3 bg-gradient-to-br from-blue-50/80 via-indigo-50/80 to-purple-50/80 backdrop-blur-md z-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-2 border border-gray-200/50 shadow-lg">
            <div className="flex items-center space-x-2">
              {/* Audio Recorder */}
              <div className="flex-shrink-0">
                <div className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors">
                  <AudioRecorder 
                    onTranscription={handleAudioTranscription}
                    isRecording={isRecording}
                    setIsRecording={setIsRecording}
                  />
                </div>
              </div>

              {/* Text Input with File Upload inside */}
              <div className="flex-1 relative">
                {/* File Upload Button - Inside Input */}
                <button
                  onClick={() => document.getElementById('file-upload').click()}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-gray-100 hover:bg-gray-200 rounded-full p-1 text-gray-500 hover:text-gray-700 transition-colors z-10"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleFileUpload(file, file.type);
                  }}
                />
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isRecording ? "Recording..." : "Type your message here..."}
                  className="w-full pl-12 pr-4 py-3 bg-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all text-gray-900 placeholder-gray-500 outline-none"
                  rows={1}
                  disabled={isLoading || isRecording}
                  style={{
                    minHeight: '48px',
                    maxHeight: '120px',
                    resize: 'none'
                  }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                />
              </div>

              {/* Send Button */}
              <div className="flex-shrink-0">
                <button
                  onClick={() => sendMessage()}
                  disabled={!inputMessage.trim() || isLoading || isRecording}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-3 rounded-full transition-all shadow-sm hover:shadow-md disabled:hover:shadow-sm"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}