// Use Edge Runtime to reduce bundle size
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

/**
 * Lightweight chat API using Edge Runtime
 * This avoids heavy dependencies like LangChain, MongoDB drivers, etc.
 */
export async function POST(request) {
  try {
    const { message, sessionId, chatHistory } = await request.json();

    // Simple response for now - you can integrate with external APIs
    const response = await generateResponseWithExternalAPI(message, chatHistory);

    return NextResponse.json({
      success: true,
      response: response,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process chat message'
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    return NextResponse.json({
      success: true,
      welcomeMessage: "Hello! 👋\n\nThank you for your interest in Future University in Egypt (FUE)! We're thrilled you're considering us for your academic journey. 😊\n\nI'm here to help you with any information you need regarding admissions. How can I assist you today? 🎓",
      isAuthenticated: false,
      userRole: 'guest',
      kycStep: 0
    });

  } catch (error) {
    console.error('Chat GET Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize chat'
    }, { status: 500 });
  }
}

/**
 * Generate response using external API (like OpenAI, Anthropic, etc.)
 * This avoids bundling heavy AI libraries
 */
async function generateResponseWithExternalAPI(message, chatHistory) {
  try {
    // Example using fetch to call external AI API
    // Replace with your preferred AI service
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return "I'm sorry, but I'm currently experiencing technical difficulties. Please try again later.";
    }

    // Simple fallback response for now
    // You can integrate with Gemini, OpenAI, or other APIs here
    const responses = [
      "Thank you for your question about Future University Egypt! I'd be happy to help you with information about our programs and admissions.",
      "Future University Egypt offers a wide range of undergraduate and graduate programs. What specific area are you interested in?",
      "Our admission requirements vary by program. Could you tell me which field of study interests you most?",
      "FUE has excellent facilities and a diverse student body. What aspects of university life would you like to know more about?"
    ];

    return responses[Math.floor(Math.random() * responses.length)];

  } catch (error) {
    console.error('External API Error:', error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
  }
}