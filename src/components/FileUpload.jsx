'use client';

import { useState, useRef } from 'react';

/**
 * File upload component for handling document attachments
 * Supports various file types with drag-and-drop functionality
 */
export default function FileUpload({ onFileUpload, acceptedTypes = null, maxSize = 10 * 1024 * 1024 }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  // Default accepted file types if none provided
  const defaultAcceptedTypes = [
    '.pdf',
    '.doc',
    '.docx',
    '.txt',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif'
  ];

  const acceptTypes = acceptedTypes || defaultAcceptedTypes;

  /**
   * Handle file selection via input or drag-and-drop
   */
  const handleFileSelection = async (files) => {
    const file = files[0];
    if (!file) return;

    // Reset previous state
    setError(null);
    setUploadProgress(0);

    try {
      // Validate file size
      if (file.size > maxSize) {
        throw new Error(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
      }

      // Validate file type
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      if (!acceptTypes.includes(fileExtension)) {
        throw new Error(`Unsupported file type. Accepted: ${acceptTypes.join(', ')}`);
      }

      // Start upload process
      setIsUploading(true);
      
      // Simulate upload progress (replace with actual upload logic)
      await simulateUpload(file);
      
      // Determine file type category
      const fileType = getFileTypeCategory(fileExtension);
      
      // Call parent handler
      await onFileUpload(file, fileType);
      
      setUploadProgress(100);
      
      // Reset after success
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);

    } catch (err) {
      console.error('File upload error:', err);
      setError(err.message);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Simulate upload progress (replace with actual upload implementation)
   */
  const simulateUpload = (file) => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          resolve();
        }
        setUploadProgress(progress);
      }, 200);
    });
  };

  /**
   * Get file type category for processing
   */
  const getFileTypeCategory = (extension) => {
    const categories = {
      document: ['.pdf', '.doc', '.docx', '.txt'],
      image: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'],
      audio: ['.mp3', '.wav', '.m4a', '.aac'],
      video: ['.mp4', '.avi', '.mov', '.wmv']
    };

    for (const [category, extensions] of Object.entries(categories)) {
      if (extensions.includes(extension)) {
        return category;
      }
    }

    return 'unknown';
  };

  /**
   * Handle drag and drop events
   */
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelection(files);
    }
    // Reset input value to allow same file selection
    e.target.value = '';
  };

  /**
   * Open file picker
   */
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="relative">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* Upload Button */}
      <button
        onClick={openFilePicker}
        disabled={isUploading}
        className={`p-2 rounded-lg transition-colors ${
          isUploading
            ? 'bg-yellow-500 text-white cursor-wait'
            : isDragging
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }`}
        title="Upload file"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        )}
      </button>

      {/* Upload Progress */}
      {isUploading && uploadProgress > 0 && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-2 rounded whitespace-nowrap">
          <div className="flex items-center space-x-2">
            <span>Uploading...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-20 h-1 bg-blue-300 rounded mt-1">
            <div 
              className="h-full bg-white rounded transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-dashed border-blue-500">
            <div className="text-center">
              <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium text-gray-900">Drop your file here</p>
              <p className="text-sm text-gray-500 mt-1">
                Accepted: {acceptTypes.join(', ')}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Max size: {formatFileSize(maxSize)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-3 py-2 rounded whitespace-nowrap max-w-64 text-center">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * File preview component for displaying uploaded files
 */
export const FilePreview = ({ file, onRemove }) => {
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    const icons = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      txt: '📄',
      png: '🖼️',
      jpg: '🖼️',
      jpeg: '🖼️',
      gif: '🖼️',
      mp3: '🎵',
      wav: '🎵',
      mp4: '🎥',
      avi: '🎥'
    };

    return icons[extension] || '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border">
      <div className="text-2xl">{getFileIcon(file.name)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(file.size)}
        </p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 p-1"
          title="Remove file"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};