import { NextRequest, NextResponse } from 'next/server';
import { HumanMessage } from '@langchain/core/messages';
// Note: countTokensApproximately is not available in newer versions

// Import utility functions (to be converted)
import { 
  trimChatHistory, 
  runChainWithRetry, 
  createLlmChain, 
  sendErrorMessage, 
  extractVariablesFromResponse, 
  searchMediaByKeywords,
  getMediaSelectorLlmChain,
  getCachedLlmChain,
  getCachedMediaLlmChain,
  getCachedMediaDecisionChain,
  getGeminiApiKeyFromMongo
} from '../../../lib/utils';

import { handleKyc, sendWelcomeMessage } from '../../../lib/kyc';
import { getPineconeVectorStore } from '../../../lib/vectordb';
import { getMongoClient } from '../../../lib/mongodb';
import { getStorageConfig, saveInteractionData } from '../../../lib/storage';
import { 
  recordAudioAndSave, 
  encodeAudioToBase64, 
  transcribeWithGemini 
} from '../../../lib/speech-to-text';

import { 
  MAX_INPUT_TOKENS, 
  END_TOKEN 
} from '../../../lib/constants';

// Global variables
let currentSessionAudioData = null;
let vectordb = null;
let mongoDB = null;

// Initialize components
async function initializeComponents() {
  try {
    // Check if Gemini API key is available
    const apiKey = await getGeminiApiKeyFromMongo();
    if (!apiKey) {
      console.error("❌ Gemini API key not found in MongoDB or environment variables.");
      return { error: "API key not configured" };
    }

    // Initialize vector database
    try {
      vectordb = await getPineconeVectorStore();
      console.log("✅ Vector database initialized successfully");
    } catch (e) {
      console.error(`❌ Failed to initialize vector database: ${e}`);
      vectordb = null;
    }

    mongoDB = await getMongoClient();
    return { success: true };
  } catch (error) {
    console.error(`ERROR in initializeComponents: ${error}`);
    return { error: error.message };
  }
}

// Handle audio transcription
async function handleAudioTranscription(message, sessionId) {
  try {
    console.log("DEBUG: Processing audio transcription request");
    
    // Extract base64 audio data from the message
    const audioDataB64 = message.content.substring("[AUDIO_TRANSCRIPTION_REQUEST]".length);
    console.log(`DEBUG: Received base64 audio data, length: ${audioDataB64.length}`);
    
    // Decode base64 audio data
    const audioData = Buffer.from(audioDataB64, 'base64');
    console.log(`DEBUG: Decoded audio data, length: ${audioData.length} bytes`);
    
    // Create a temporary file path
    const tempFilePath = `/tmp/audio_${sessionId}_${Date.now()}.webm`;
    
    // Save audio data to temporary file
    const fs = require('fs').promises;
    await fs.writeFile(tempFilePath, audioData);
    console.log(`DEBUG: Saved audio to temporary file: ${tempFilePath}`);
    
    // Transcribe audio
    try {
      const transcribedText = await transcribeWithGemini(tempFilePath);
      
      // Clean up the temporary file
      await fs.unlink(tempFilePath);
      
      if (transcribedText && transcribedText.trim()) {
        console.log(`DEBUG: Successfully transcribed: "${transcribedText}"`);
        return {
          success: true,
          transcription: transcribedText,
          message: "🎤 Voice message transcribed successfully!"
        };
      } else {
        return {
          success: false,
          error: "Sorry, I couldn't understand your voice message. Please try again or type your question."
        };
      }
    } catch (transcriptionError) {
      console.error(`DEBUG: Transcription error: ${transcriptionError}`);
      // Clean up the temporary file
      try {
        await fs.unlink(tempFilePath);
      } catch {}
      
      return {
        success: false,
        error: "Sorry, there was an error processing your voice message. Please try again."
      };
    }
    
  } catch (error) {
    console.error(`DEBUG: Error in handleAudioTranscription: ${error}`);
    return {
      success: false,
      error: "An unexpected error occurred while processing your voice message."
    };
  }
}

// POST handler for chat messages
export async function POST(request) {
  try {
    console.log("DEBUG: ========== NEW MESSAGE ==========");
    
    // Initialize components if not already done
    const initResult = await initializeComponents();
    if (initResult.error) {
      return NextResponse.json(
        { error: "Service initialization failed" }, 
        { status: 500 }
      );
    }

    const body = await request.json();
    const { message, sessionId, isAuthenticated = false, userRole = "guest", kycStep = 0 } = body;
    
    console.log(`DEBUG: User message: '${message.substring(0, 100)}...'`);
    console.log(`DEBUG: Session state - isAuthenticated: ${isAuthenticated}`);

    // Check if this is an audio transcription request
    if (message.startsWith("[AUDIO_TRANSCRIPTION_REQUEST]")) {
      const transcriptionResult = await handleAudioTranscription({ content: message }, sessionId);
      return NextResponse.json(transcriptionResult);
    }

    // Handle KYC flow for non-authenticated users
    if (!isAuthenticated) {
      try {
        const kycResult = await handleKyc(message, sessionId);
        if (kycResult) {
          return NextResponse.json({
            success: true,
            response: kycResult.response,
            kycStep: kycResult.kycStep,
            isAuthenticated: kycResult.isAuthenticated,
            showRegisterButton: kycResult.showRegisterButton
          });
        }
      } catch (error) {
        console.error(`ERROR in KYC handling: ${error}`);
        return NextResponse.json({
          success: false,
          error: "An error occurred during registration process."
        });
      }
    }

    // Handle authenticated chat
    try {
      // Get storage configuration
      const storageMode = await getStorageConfig();
      
      // Process the message with vector store (matching Python approach)
      const vectorStore = await getCachedLlmChain(vectordb);
      if (!vectorStore) {
        throw new Error("Failed to initialize vector store");
      }

      // Run the chain with retry logic (matching Python parameter structure)
      const result = await runChainWithRetry(
        vectorStore, 
        message, 
        null, // userName - would come from session
        'Unknown', // userFaculty - would come from session
        [], // chatHistory - would be populated from session storage
        '', // imageDescriptions
        '' // videoDescriptions
      );

      const responseText = result.content || result;

      // Save interaction data
      if (storageMode) {
        await saveInteractionData(message, responseText, storageMode, sessionId);
      }

      return NextResponse.json({
        success: true,
        response: responseText,
        sessionId: sessionId
      });

    } catch (error) {
      console.error(`ERROR in chat processing: ${error}`);
      return NextResponse.json({
        success: false,
        error: "Sorry, I'm having trouble processing your message right now. Please try again."
      }, { status: 500 });
    }

  } catch (error) {
    console.error(`ERROR in POST handler: ${error}`);
    return NextResponse.json({
      success: false,
      error: "An unexpected error occurred."
    }, { status: 500 });
  }
}

// GET handler for session initialization
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    // Initialize session
    const initResult = await initializeComponents();
    if (initResult.error) {
      return NextResponse.json(
        { error: "Service initialization failed" }, 
        { status: 500 }
      );
    }

    // Send welcome message
    const welcomeMessage = await sendWelcomeMessage();
    
    return NextResponse.json({
      success: true,
      sessionId: sessionId || `session_${Date.now()}`,
      welcomeMessage: welcomeMessage,
      isAuthenticated: false,
      userRole: "guest",
      kycStep: 0
    });

  } catch (error) {
    console.error(`ERROR in GET handler: ${error}`);
    return NextResponse.json({
      success: false,
      error: "Failed to initialize chat session."
    }, { status: 500 });
  }
}