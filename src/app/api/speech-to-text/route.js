import { NextRequest, NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { getGeminiApiKeyFromMongo } from '../../../lib/utils';
import fs from 'fs/promises';
import path from 'path';

// Initialize LLM
let llm = null;

async function initializeLLM() {
  if (!llm) {
    const apiKey = await getGeminiApiKeyFromMongo();
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }
    llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      apiKey: apiKey
    });
  }
  return llm;
}

// Create audio directory if it doesn't exist
const audioDir = path.join(process.cwd(), 'tmp', 'audio');

async function ensureAudioDirectory() {
  try {
    await fs.mkdir(audioDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
    console.log('Audio directory setup:', error.message);
  }
}

function encodeAudioToBase64(audioBuffer) {
  /**
   * Encodes audio buffer to base64 for Gemini API
   */
  return audioBuffer.toString('base64');
}

async function transcribeWithGemini(audioFilePath) {
  /**
   * Uses Gemini 2.0 Flash to transcribe audio and provide a response.
   * Returns the transcribed text or null if there's an error.
   */
  try {
    console.log("Processing audio with Gemini...");
    
    await initializeLLM();
    
    // Read the audio file
    const audioBuffer = await fs.readFile(audioFilePath);
    
    // Determine the MIME type based on file extension
    let mimeType = "audio/wav"; // default
    const ext = path.extname(audioFilePath).toLowerCase();
    
    switch (ext) {
      case '.webm':
        mimeType = "audio/webm";
        break;
      case '.wav':
        mimeType = "audio/wav";
        break;
      case '.mp3':
        mimeType = "audio/mp3";
        break;
      case '.m4a':
        mimeType = "audio/mp4";
        break;
    }
    
    console.log(`DEBUG: Using MIME type: ${mimeType} for file: ${audioFilePath}`);
    
    // Encode audio to base64
    const encodedAudio = encodeAudioToBase64(audioBuffer);
    
    // Create message with audio content
    const message = new HumanMessage({
      content: [
        {
          type: "text",
          text: "Please transcribe this audio and return only the transcribed text without any additional commentary."
        },
        {
          type: "media",
          mime_type: mimeType,
          data: encodedAudio
        }
      ]
    });
    
    // Get response from Gemini
    const response = await llm.invoke([message]);
    
    console.log("\nGemini's Response:");
    console.log(response.content);
    
    // Return the transcribed text
    return response.content.trim();
    
  } catch (error) {
    console.error(`An error occurred with Gemini API: ${error}`);
    return null;
  }
}

export async function POST(request) {
  try {
    console.log("DEBUG: Processing speech-to-text request");
    
    await ensureAudioDirectory();
    
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    const sessionId = formData.get('sessionId') || `session_${Date.now()}`;
    
    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }
    
    // Convert the file to a buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    console.log(`DEBUG: Received audio file, size: ${audioBuffer.length} bytes`);
    
    // Create temporary file path
    const fileName = `audio_${sessionId}_${Date.now()}.webm`;
    const tempFilePath = path.join(audioDir, fileName);
    
    try {
      // Save audio file temporarily
      await fs.writeFile(tempFilePath, audioBuffer);
      console.log(`DEBUG: Saved audio to temporary file: ${tempFilePath}`);
      
      // Transcribe the audio
      const transcribedText = await transcribeWithGemini(tempFilePath);
      
      // Clean up the temporary file
      await fs.unlink(tempFilePath);
      
      if (transcribedText && transcribedText.trim()) {
        console.log(`DEBUG: Successfully transcribed: "${transcribedText}"`);
        return NextResponse.json({
          success: true,
          transcription: transcribedText,
          message: "🎤 Voice message transcribed successfully!"
        });
      } else {
        return NextResponse.json({
          success: false,
          error: "Sorry, I couldn't understand your voice message. Please try again or type your question."
        });
      }
      
    } catch (transcriptionError) {
      console.error(`DEBUG: Transcription error: ${transcriptionError}`);
      
      // Clean up the temporary file if it exists
      try {
        await fs.unlink(tempFilePath);
      } catch {}
      
      return NextResponse.json({
        success: false,
        error: "Sorry, there was an error processing your voice message. Please try again."
      });
    }
    
  } catch (error) {
    console.error(`DEBUG: Error in speech-to-text API: ${error}`);
    return NextResponse.json({
      success: false,
      error: "An unexpected error occurred while processing your voice message."
    }, { status: 500 });
  }
}

// Alternative endpoint for base64 audio data
export async function PUT(request) {
  try {
    console.log("DEBUG: Processing base64 audio transcription request");
    
    await ensureAudioDirectory();
    
    const body = await request.json();
    const { audioData, sessionId = `session_${Date.now()}`, mimeType = 'audio/webm' } = body;
    
    if (!audioData) {
      return NextResponse.json(
        { success: false, error: 'No audio data provided' },
        { status: 400 }
      );
    }
    
    // Decode base64 audio data
    const audioBuffer = Buffer.from(audioData, 'base64');
    console.log(`DEBUG: Decoded audio data, length: ${audioBuffer.length} bytes`);
    
    // Create temporary file path
    const extension = mimeType.includes('webm') ? '.webm' : '.wav';
    const fileName = `audio_${sessionId}_${Date.now()}${extension}`;
    const tempFilePath = path.join(audioDir, fileName);
    
    try {
      // Save audio data to temporary file
      await fs.writeFile(tempFilePath, audioBuffer);
      console.log(`DEBUG: Saved audio to temporary file: ${tempFilePath}`);
      
      // Transcribe audio
      const transcribedText = await transcribeWithGemini(tempFilePath);
      
      // Clean up the temporary file
      await fs.unlink(tempFilePath);
      
      if (transcribedText && transcribedText.trim()) {
        console.log(`DEBUG: Successfully transcribed: "${transcribedText}"`);
        return NextResponse.json({
          success: true,
          transcription: transcribedText,
          message: "🎤 Voice message transcribed successfully!"
        });
      } else {
        return NextResponse.json({
          success: false,
          error: "Sorry, I couldn't understand your voice message. Please try again or type your question."
        });
      }
      
    } catch (transcriptionError) {
      console.error(`DEBUG: Transcription error: ${transcriptionError}`);
      
      // Clean up the temporary file
      try {
        await fs.unlink(tempFilePath);
      } catch {}
      
      return NextResponse.json({
        success: false,
        error: "Sorry, there was an error processing your voice message. Please try again."
      });
    }
    
  } catch (error) {
    console.error(`DEBUG: Error in base64 audio transcription: ${error}`);
    return NextResponse.json({
      success: false,
      error: "An unexpected error occurred while processing your voice message."
    }, { status: 500 });
  }
}