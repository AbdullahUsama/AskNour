'use client';

import { useState } from 'react';

/**
 * Message bubble component for displaying chat messages
 * Supports both user and AI messages with proper styling
 */
export default function MessageBubble({ message, isUser }) {
  /**
   * Format timestamp for display
   */
  const formatTimestamp = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  /**
   * Detect if text contains Arabic characters
   */
  const containsArabic = (text) => {
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text);
  };

  /**
   * Process message content to handle special tokens and formatting
   */
  const processMessageContent = (content) => {
    if (!content) return '';

    // Remove [END_RESPONSE] token
    let processedContent = content.replace(/\[END_RESPONSE\]/g, '');
    
    // Remove completion status and register button variables
    processedContent = processedContent.replace(/COMPLETION_STATUS=(true|false)/g, '');
    processedContent = processedContent.replace(/SHOW_REGISTER_BUTTON=(true|false)/g, '');
    
    // Clean up extra whitespace
    processedContent = processedContent.trim();
    
    return processedContent;
  };

  /**
   * Split content into paragraphs and format them
   */
  const formatContent = (content) => {
    const processedContent = processMessageContent(content);
    const paragraphs = processedContent.split('\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, index) => {
      const trimmedParagraph = paragraph.trim();
      
      // Handle bullet points
      if (trimmedParagraph.startsWith('•') || trimmedParagraph.startsWith('-')) {
        return (
          <li key={index} className="ml-4 mb-1">
            {trimmedParagraph.substring(1).trim()}
          </li>
        );
      }
      
      // Handle numbered lists
      if (/^\d+\./.test(trimmedParagraph)) {
        return (
          <li key={index} className="ml-4 mb-1">
            {trimmedParagraph.replace(/^\d+\.\s*/, '')}
          </li>
        );
      }
      
      // Regular paragraphs
      return (
        <p key={index} className="mb-2 last:mb-0">
          {trimmedParagraph}
        </p>
      );
    });
  };

  const messageContent = processMessageContent(message.content);
  const isArabicMessage = containsArabic(messageContent);
  const textDirection = isArabicMessage ? 'rtl' : 'ltr';

  // User message - aligned to the right
  if (isUser) {
    return (
      <div className="flex justify-end mb-6 message-bubble">
        <div className="max-w-[70%] bg-blue-600/90 backdrop-blur-sm text-white rounded-3xl px-4 py-3 shadow-lg" style={{ direction: textDirection }}>
          <div className={`${isArabicMessage ? 'font-arabic' : ''}`}>
            {messageContent.includes('\n') ? (
              <div>
                {messageContent.includes('•') || messageContent.includes('-') || /^\d+\./.test(messageContent) ? (
                  <ul className="space-y-1 list-none">
                    {formatContent(messageContent)}
                  </ul>
                ) : (
                  <div className="space-y-2">
                    {formatContent(messageContent)}
                  </div>
                )}
              </div>
            ) : (
              <p>{messageContent}</p>
            )}
          </div>

          {/* Audio indicator */}
          {message.isAudio && (
            <div className="flex items-center mt-2 text-blue-200">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">Voice message</span>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-xs mt-2 text-blue-200 text-right">
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
        
        {/* User Avatar on the right */}
        <div className="flex-shrink-0 ml-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            U
          </div>
        </div>
      </div>
    );
  }

  // AI message - aligned to the left
  return (
    <div className="flex justify-start mb-6 message-bubble">
      <div className="flex-shrink-0 mr-3">
        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
          AI
        </div>
      </div>
      
      <div className="flex-1 max-w-[80%]">
        <div 
          className={`${
            message.isError
              ? 'bg-red-50/80 backdrop-blur-sm text-red-800 px-4 py-3 rounded-lg shadow-sm'
              : message.isWelcome
                ? 'bg-blue-50/80 backdrop-blur-sm text-gray-800 px-4 py-3 rounded-lg shadow-sm'
                : 'text-gray-800'
          }`}
          style={{ direction: textDirection }}
        >
          {/* Message Content */}
          <div className={`${isArabicMessage ? 'font-arabic' : ''} ${!isUser ? 'leading-relaxed' : ''}`}>
            {messageContent.includes('\n') ? (
              <div>
                {messageContent.includes('•') || messageContent.includes('-') || /^\d+\./.test(messageContent) ? (
                  <ul className="space-y-1 list-none">
                    {formatContent(messageContent)}
                  </ul>
                ) : (
                  <div className="space-y-2">
                    {formatContent(messageContent)}
                  </div>
                )}
              </div>
            ) : (
              <p>{messageContent}</p>
            )}
          </div>

          {/* Media Content Display */}
          {message.media && (message.media.images?.length > 0 || message.media.videos?.length > 0) && (
            <div className="mt-3 space-y-3">
              {/* Images */}
              {message.media.images && message.media.images.length > 0 && (
                <div className="space-y-2">
                  {message.media.images.map((imageUrl, index) => (
                    <div key={`image-${index}`} className="rounded-lg overflow-hidden">
                      <img 
                        src={imageUrl} 
                        alt={`Relevant image ${index + 1}`}
                        className="w-full max-w-sm h-auto object-cover hover:opacity-90 transition-opacity"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          console.log(`Failed to load image: ${imageUrl}`);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Videos */}
              {message.media.videos && message.media.videos.length > 0 && (
                <div className="space-y-3">
                  {message.media.videos.map((videoUrl, index) => {
                    const videoUrlLower = videoUrl.toLowerCase().trim();
                    
                    // Facebook Video
                    if (videoUrlLower.startsWith("facebook:")) {
                      const fbUrl = videoUrl.substring("facebook:".length).trim();
                      return (
                        <div key={`video-${index}`} className="aspect-video rounded-lg overflow-hidden">
                          <iframe
                            src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fbUrl)}&show_text=false&width=400`}
                            width="100%"
                            height="100%"
                            style={{ border: 'none', overflow: 'hidden' }}
                            scrolling="no"
                            frameBorder="0"
                            allowFullScreen={true}
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                          ></iframe>
                        </div>
                      );
                    }
                    
                    // YouTube Video
                    else if (videoUrlLower.startsWith("youtube:")) {
                      const ytUrl = videoUrl.substring("youtube:".length).trim();
                      const videoId = ytUrl.includes('watch?v=') 
                        ? ytUrl.split('watch?v=')[1].split('&')[0]
                        : ytUrl.split('/').pop();
                      
                      return (
                        <div key={`video-${index}`} className="aspect-video rounded-lg overflow-hidden">
                          <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          ></iframe>
                        </div>
                      );
                    }
                    
                    // Regular video file
                    else {
                      return (
                        <div key={`video-${index}`} className="rounded-lg overflow-hidden">
                          <video 
                            controls 
                            className="w-full max-w-sm h-auto"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              console.log(`Failed to load video: ${videoUrl}`);
                            }}
                          >
                            <source src={videoUrl} type="video/mp4" />
                            <source src={videoUrl} type="video/webm" />
                            <source src={videoUrl} type="video/ogg" />
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          )}

          {/* Audio indicator */}
          {message.isAudio && (
            <div className={`flex items-center mt-2 ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">Voice message</span>
            </div>
          )}

          {/* Timestamp */}
          <div className={`text-xs mt-2 ${
              isUser ? 'text-blue-200 text-right' : 'text-gray-400'
            }`}>
            {formatTimestamp(message.timestamp)}
          </div>

          {/* Message Status Indicators */}
          {message.isWelcome && (
            <div className="mt-1">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Welcome
              </span>
            </div>
          )}

          {message.isError && (
            <div className="mt-1">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Error
              </span>
            </div>
          )}
        </div>
      </div>

      {/* User Avatar on the right */}
      {isUser && (
        <div className="flex-shrink-0 ml-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            U
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Message bubble variants for different types of content
 */
export const SystemMessageBubble = ({ message, type = 'info' }) => {
  const typeStyles = {
    info: 'bg-blue-50 text-blue-800',
    success: 'bg-green-50 text-green-800',
    warning: 'bg-yellow-50 text-yellow-800',
    error: 'bg-red-50 text-red-800'
  };

  const typeIcons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };

  return (
    <div className="flex justify-center mb-4">
      <div className={`max-w-md px-4 py-3 rounded-lg text-sm ${typeStyles[type]}`}>
        <div className="flex items-center">
          <span className="mr-2">{typeIcons[type]}</span>
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Typing indicator component
 */
export const TypingIndicator = () => {
  return (
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
  );
};