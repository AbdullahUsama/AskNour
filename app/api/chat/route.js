import { NextRequest, NextResponse } from 'next/server';
import { HumanMessage } from '@langchain/core/messages';

// Helper function to count tokens approximately (since the import might not be available)
async function countTokensApproximately(text) {
  // Simple approximation: roughly 4 characters per token for most languages
  // This is a fallback implementation
  return Math.ceil(text.length / 4);
}

// Import utility functions (to be converted)
import { 
  trimChatHistory, 
  runChainWithRetry, 
  runSimpleChainWithRetry,
  manualRagGeneration,
  createLlmChain, 
  sendErrorMessage, 
  extractVariablesFromResponse, 
  searchMediaByKeywords,
  getMediaSelectorLlmChain,
  getCachedLlmChain,
  getCachedMediaLlmChain,
  getCachedMediaDecisionChain,
  getGeminiApiKeyFromMongo
} from '../../../src/lib/utils';

import { handleKyc, sendWelcomeMessage } from '../../../src/lib/kyc';
import { getPineconeVectorStore } from '../../../src/lib/vectordb';
import { getMongoClient } from '../../../src/lib/mongodb';
import { getStorageConfig, saveInteractionData } from '../../../src/lib/storage';

import { 
  MAX_INPUT_TOKENS, 
  END_TOKEN 
} from '../../../src/lib/constants';

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

    // Initialize vector database with API key
    try {
      vectordb = await getPineconeVectorStore(apiKey);
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

/**
 * This is the Next.js equivalent of @cl.on_message from Chainlit
 * It handles all incoming messages and processes them according to the user's authentication state
 */
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
    const { 
      message, 
      sessionId, 
      isAuthenticated = false, 
      userRole = "guest", 
      kycStep = 0,
      kycData = {},
      chatHistory = [] 
    } = body;
    
    console.log(`DEBUG: User message: '${message.substring(0, 100)}...'`);
    console.log(`DEBUG: Current session state - is_authenticated: ${isAuthenticated}`);
    console.log(`DEBUG: Current user role: ${userRole}`);
    console.log(`DEBUG: KYC step: ${kycStep}`);

    // Check if this is an audio transcription request
    if (message.startsWith("[AUDIO_TRANSCRIPTION_REQUEST]")) {
      console.log("DEBUG: Audio transcription request detected");
      const transcriptionResult = await handleAudioTranscription({ content: message }, sessionId);
      return NextResponse.json(transcriptionResult);
    }

    // Handle authentication flow for non-authenticated users
    if (!isAuthenticated) {
      console.log("DEBUG: User not authenticated, checking KYC flow");
      
      try {
        const kycResult = await handleKyc(message, sessionId);
        if (kycResult && kycResult.isKycFlow) {
          console.log("DEBUG: KYC flow detected, returning KYC response");
          return NextResponse.json({
            success: true,
            response: kycResult.response,
            kycStep: kycResult.kycStep,
            isAuthenticated: kycResult.isAuthenticated,
            showRegisterButton: kycResult.showRegisterButton,
            kycData: kycResult.kycData
          });
        } else {
          console.log("DEBUG: Not a KYC request from anonymous user, proceeding with limited chat");
        }
      } catch (error) {
        console.error(`ERROR in KYC handling: ${error}`);
        return NextResponse.json({
          success: false,
          error: "An error occurred during registration process."
        });
      }
    } else {
      console.log("DEBUG: User is authenticated, proceeding with full chat access");
    }

    // Continue with normal chat flow (authenticated or anonymous)
    console.log("DEBUG: Proceeding with normal chat flow");

    // Get user context from kycData
    const userName = kycData?.name || null;
    const userFaculty = kycData?.faculty || 'Unknown';
    
    console.log(`DEBUG: Processing question from user: ${userName || 'Anonymous'}`);
    console.log(`DEBUG: User input: '${message}'`);
    console.log(`DEBUG: User faculty: ${userFaculty}`);

    // Check if input exceeds token limit
    const tokenCount = await countTokensApproximately(message);
    console.log(`DEBUG: Input token count: ${tokenCount}, Max allowed: ${MAX_INPUT_TOKENS}`);
    
    if (tokenCount > MAX_INPUT_TOKENS) {
      const error = `❌ Input too long! Please limit to ${MAX_INPUT_TOKENS} tokens.`;
      console.log("DEBUG: Input too long, sending error message");
      return NextResponse.json({
        success: false,
        error: error
      });
    }

    try {
      // Trim chat history 
      console.log(`DEBUG: Full chat history length: ${chatHistory.length} messages`);
      const trimmedHistory = await trimChatHistory(chatHistory);
      console.log(`DEBUG: Trimmed chat history: ${trimmedHistory.length} messages`);

      // STEP 1: Get media decision and keywords from Gemini (thinking step)
      console.log("DEBUG: ========== STEP 1: MEDIA DECISION ==========");
      console.log(`DEBUG: Starting media decision analysis for user input: '${message.substring(0, 100)}...'`);
      console.log(`DEBUG: User context - name: ${userName}, faculty: ${userFaculty}`);
      
      const mediaDecisionChain = await getCachedMediaDecisionChain();
      if (!mediaDecisionChain) {
        console.log("DEBUG: ERROR - Failed to get media decision chain");
        throw new Error("Unable to initialize media decision chain");
      }
      
      console.log("DEBUG: Successfully retrieved media decision chain");
      console.log("DEBUG: Invoking media decision chain...");
      
      // Media decision chain expects simple {question} format
      const thinkingResult = await runSimpleChainWithRetry(
        mediaDecisionChain, 
        message  // Just pass the message for simple chains
      );
      
      const thinkingResponse = thinkingResult.content || thinkingResult;
      console.log(`DEBUG: Media decision raw response: '${thinkingResponse}'`);
      
      // Extract media decision and keywords from thinking response
      const { includeMedia, keywords } = extractVariablesFromResponse(thinkingResponse);
      console.log("DEBUG: ========== STEP 1 RESULTS ==========");
      console.log(`DEBUG: includeMedia = ${includeMedia}`);
      console.log(`DEBUG: keywords = ${keywords}`);
      console.log(`DEBUG: keywords count = ${keywords ? keywords.length : 0}`);

      // STEP 2: Search for media if needed
      console.log("DEBUG: ========== STEP 2: MEDIA SEARCH ==========");
      let images = [];
      let videos = [];
      let selectedImages = [];
      let selectedVideos = [];
      let imageDescriptions = "";
      let videoDescriptions = "";
      
      if (includeMedia && keywords && keywords.length > 0) {
        console.log("DEBUG: Media is needed and keywords are available - proceeding with search");
        console.log(`DEBUG: Searching with keywords: ${keywords}`);
        
        const mediaResults = await searchMediaByKeywords(keywords, mongoDB);
        images = mediaResults.images || [];
        videos = mediaResults.videos || [];
        
        console.log(`DEBUG: Search results - Found ${images.length} images and ${videos.length} videos`);

        // Step 2.5: Select most relevant media if we have options
        if (images.length > 0 || videos.length > 0) {
          console.log("DEBUG: ========== STEP 2.5: MEDIA SELECTION ==========");
          console.log(`DEBUG: Proceeding with media selection from ${images.length} images and ${videos.length} videos`);
          
          const mediaSelectorChain = await getCachedMediaLlmChain();
          if (!mediaSelectorChain) {
            console.log("DEBUG: ERROR - Failed to get media selector chain");
            throw new Error("Unable to initialize media selector chain");
          }

          // Prepare media data for selection
          const videosData = videos.map(video => 
            `${video.video_url} (${video.video_description || 'No description'})`
          ).join(", ");
          
          const imagesData = images.map(image => 
            `${image.image_url} (${image.image_description || 'No description'})`
          ).join(", ");

          try {
            console.log("DEBUG: Invoking media selector chain...");
            const selectionResponse = await mediaSelectorChain.invoke({
              input: message,
              videos: videosData,
              images: imagesData
            });

            const selectionText = selectionResponse.content || selectionResponse;
            console.log(`DEBUG: Media selection raw response length: ${selectionText.length} characters`);
            
            // Parse the JSON response for selected media
            const selectionData = JSON.parse(selectionText);
            console.log("DEBUG: Successfully parsed JSON response");
            
            selectedImages = selectionData.selected_images || [];
            selectedVideos = selectionData.selected_videos || [];
            imageDescriptions = (selectionData.image_descriptions || []).join(", ");
            videoDescriptions = (selectionData.video_descriptions || []).join(", ");
            
            console.log("DEBUG: ========== STEP 2.5 RESULTS ==========");
            console.log(`DEBUG: Selected ${selectedImages.length} images: ${selectedImages}`);
            console.log(`DEBUG: Selected ${selectedVideos.length} videos: ${selectedVideos}`);
            
          } catch (jsonError) {
            console.log(`DEBUG: ERROR - Failed to parse media selection JSON: ${jsonError}`);
            // Fallback to using some of the found media
            selectedImages = images.slice(0, 3).map(img => img.image_url);
            selectedVideos = videos.slice(0, 3).map(vid => vid.video_url);
            imageDescriptions = images.slice(0, 3).map(img => img.image_description || 'No description').join(", ");
            videoDescriptions = videos.slice(0, 3).map(vid => vid.video_description || 'No description').join(", ");
          }
        }
      } else {
        if (!includeMedia) console.log("DEBUG: Media not needed for this query");
        if (!keywords || keywords.length === 0) console.log("DEBUG: No keywords provided for media search");
        console.log("DEBUG: Skipping media search and selection");
      }

      // STEP 3: Generate final response using manual RAG with vector database
      console.log("DEBUG: ========== STEP 3: RAG RESPONSE GENERATION ==========");
      console.log("DEBUG: Starting manual RAG response generation with vector database");
      
      if (!vectordb) {
        console.log("DEBUG: ERROR - Vector database not available for RAG");
        throw new Error("Vector database not initialized for RAG generation");
      }
      
      console.log("DEBUG: Using manual RAG generation...");
      
      let responseText = await manualRagGeneration(
        vectordb,
        message, 
        userName, 
        userFaculty, 
        trimmedHistory, 
        imageDescriptions, 
        videoDescriptions
      );
      
      console.log(`DEBUG: Manual RAG response received, length: ${responseText.length} characters`);
      console.log(`DEBUG: RAG response preview: '${responseText.substring(0, 200)}...'`);
      
      // Clean up the response (remove END_TOKEN if present)
      if (responseText.includes(END_TOKEN)) {
        console.log("DEBUG: Cleaning END_TOKEN from response");
        responseText = responseText.split(END_TOKEN)[0];
      }
      
      console.log("DEBUG: ========== STEP 3 COMPLETE ==========");

      // Get storage configuration and save interaction data
      const storageMode = await getStorageConfig();
      if (storageMode) {
        console.log("DEBUG: Saving interaction data...");
        await saveInteractionData(message, responseText, storageMode, sessionId);
        console.log("DEBUG: Successfully saved interaction data");
      }

      // Return the complete response with media
      const response = {
        success: true,
        response: responseText,
        sessionId: sessionId,
        media: {
          images: selectedImages,
          videos: selectedVideos
        }
      };

      console.log("DEBUG: ========== MESSAGE PROCESSING COMPLETE ==========");
      return NextResponse.json(response);

    } catch (error) {
      console.error("DEBUG: ========== CRITICAL ERROR ==========");
      console.error(`DEBUG: Error during chain execution: ${error.message}`);
      console.error(`DEBUG: Error type: ${error.constructor.name}`);
      
      return NextResponse.json({
        success: false,
        error: `❌ I apologize, but I encountered an error while processing your request. Please try again.\n\nError details: ${error.message}`
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