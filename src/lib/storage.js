import { getMongoClient } from './mongodb.js';
import {
  CHAT_HISTORY_COLLECTION,
  QUESTIONS_COLLECTION,
  CONFIG_COLLECTION,
  USERS_COLLECTION
} from './constants.js';

/**
 * Storage Strategy:
 * 1. User data (name, email, mobile, faculty) is stored once in USERS_COLLECTION when KYC is completed
 * 2. Chat history and questions only store session_id to link back to user data
 * 3. Use getChatHistoryWithUserData() or getQuestionsWithUserData() to retrieve enriched data
 * 4. This approach reduces storage redundancy and ensures data consistency
 */

/**
 * Get storage configuration from MongoDB config collection
 * @returns {Promise<string|null>} Storage mode or null if disabled
 */
export async function getStorageConfig() {
  try {
    const mongoDB = await getMongoClient();
    const configCollection = mongoDB.collection(CONFIG_COLLECTION);
    
    // Look for document with _id "app_settings"
    const config = await configCollection.findOne({ "_id": "app_settings" });
    
    if (config && config.chat_storage) {
      const chatStorage = config.chat_storage;
      
      // Check if chat storage is enabled
      if (!chatStorage.enabled) {
        console.log("DEBUG: Chat storage is disabled in configuration");
        return null;
      }
      
      // Determine storage mode based on configuration flags
      if (chatStorage.store_chat_history) {
        return "chat_history";
      } else if (chatStorage.store_questions_only) {
        return "questions";
      }
    } else {
      console.log("DEBUG: No chat storage configuration found, storage disabled");
      return null;
    }
    
  } catch (error) {
    console.error(`DEBUG: Error getting storage config: ${error}, storage disabled`);
    return null;
  }
}

/**
 * Save interaction data based on storage mode configuration
 * @param {string} userInput - User's input message
 * @param {string} aiResponse - AI's response
 * @param {string} storageMode - Storage mode ("chat_history" or "questions")
 * @param {string} sessionId - Session identifier
 * @param {object} userContext - Optional user context information
 */
export async function saveInteractionData(userInput, aiResponse, storageMode, sessionId, userContext = null) {
  console.log(`DEBUG: Saving interaction data with storage mode: ${storageMode}`);
  
  if (!storageMode) {
    console.log("DEBUG: Storage disabled, skipping save");
    return;
  }
  
  try {
    const mongoDB = await getMongoClient();
    const timestamp = new Date();
    
    // Prepare user information for storage
    let userInfo = {};
    if (userContext && userContext.user) {
      const user = userContext.user;
      userInfo = {
        user_id: user.user_id || null,
        name: user.name || null,
        email: user.email || null,
        mobile: user.mobile || null,
        faculty: user.faculty || null,
        role: user.role || "guest",
        is_authenticated: true
      };
    } else {
      // For non-authenticated users, try to get data from session
      userInfo = {
        user_id: null,
        name: userContext?.name || null,
        email: userContext?.email || null,
        mobile: userContext?.mobile || null,
        faculty: userContext?.faculty || null,
        role: "guest",
        is_authenticated: false
      };
    }
    
    if (storageMode === "chat_history") {
      const chatCollection = mongoDB.collection(CHAT_HISTORY_COLLECTION);
      
      const chatDocument = {
        session_id: sessionId,
        user_input: userInput,
        ai_response: aiResponse,
        timestamp: timestamp,
        user_info: userInfo,
        interaction_type: "chat",
        metadata: {
          response_length: aiResponse ? aiResponse.length : 0,
          has_media: aiResponse ? aiResponse.includes('[MEDIA]') : false,
          language: detectLanguage(userInput)
        }
      };
      
      await chatCollection.insertOne(chatDocument);
      console.log("DEBUG: Saved chat interaction to chat_history collection");
      
    } else if (storageMode === "questions") {
      const questionsCollection = mongoDB.collection(QUESTIONS_COLLECTION);
      
      const questionDocument = {
        session_id: sessionId,
        question: userInput,
        answer: aiResponse,
        timestamp: timestamp,
        user_info: userInfo,
        metadata: {
          question_length: userInput ? userInput.length : 0,
          answer_length: aiResponse ? aiResponse.length : 0,
          language: detectLanguage(userInput),
          category: categorizeQuestion(userInput)
        }
      };
      
      await questionsCollection.insertOne(questionDocument);
      console.log("DEBUG: Saved question to questions collection");
    }
    
  } catch (error) {
    console.error(`DEBUG: Error saving interaction data: ${error}`);
  }
}

/**
 * Retrieve user data from USERS_COLLECTION by session_id
 * @param {string} sessionId - Session identifier
 * @returns {Promise<object|null>} User data or null if not found
 */
export async function getUserDataBySession(sessionId) {
  try {
    const mongoDB = await getMongoClient();
    const usersCollection = mongoDB.collection(USERS_COLLECTION);
    
    const userData = await usersCollection.findOne({ session_id: sessionId });
    
    if (userData) {
      // Remove sensitive information
      const { password, ...safeUserData } = userData;
      return safeUserData;
    } else {
      console.log(`DEBUG: No user data found for session: ${sessionId}`);
      return null;
    }
    
  } catch (error) {
    console.error(`DEBUG: Error retrieving user data by session: ${error}`);
    return null;
  }
}

/**
 * Retrieve chat history with associated user data
 * @param {string} sessionId - Optional session ID filter
 * @param {number} limit - Optional limit for results
 * @returns {Promise<Array>} Chat history with user data
 */
export async function getChatHistoryWithUserData(sessionId = null, limit = null) {
  try {
    const mongoDB = await getMongoClient();
    const chatCollection = mongoDB.collection(CHAT_HISTORY_COLLECTION);
    
    // Build query
    const query = {};
    if (sessionId) {
      query.session_id = sessionId;
    }
    
    // Get chat history
    let cursor = chatCollection.find(query).sort({ timestamp: -1 });
    if (limit) {
      cursor = cursor.limit(limit);
    }
    
    const chatHistory = await cursor.toArray();
    
    // Chat history now includes user_info directly in each document
    // No need to enrich from separate collection
    
    console.log(`DEBUG: Retrieved ${chatHistory.length} chat history entries`);
    return chatHistory;
    
  } catch (error) {
    console.error(`DEBUG: Error retrieving chat history with user data: ${error}`);
    return [];
  }
}

/**
 * Retrieve questions with associated user data
 * @param {string} sessionId - Optional session ID filter
 * @param {number} limit - Optional limit for results
 * @returns {Promise<Array>} Questions with user data
 */
export async function getQuestionsWithUserData(sessionId = null, limit = null) {
  try {
    const mongoDB = await getMongoClient();
    const questionsCollection = mongoDB.collection(QUESTIONS_COLLECTION);
    
    // Build query
    const query = {};
    if (sessionId) {
      query.session_id = sessionId;
    }
    
    // Get questions
    let cursor = questionsCollection.find(query).sort({ timestamp: -1 });
    if (limit) {
      cursor = cursor.limit(limit);
    }
    
    const questions = await cursor.toArray();
    
    // Questions now include user_info directly in each document
    // No need to enrich from separate collection
    
    console.log(`DEBUG: Retrieved ${questions.length} questions`);
    return questions;
    
  } catch (error) {
    console.error(`DEBUG: Error retrieving questions with user data: ${error}`);
    return [];
  }
}

/**
 * Retrieve all interactions (chat history or questions) for a specific user by email
 * @param {string} email - User's email address
 * @param {number} limit - Optional limit for results
 * @returns {Promise<Array>} User interactions
 */
export async function getUserInteractionsByEmail(email, limit = null) {
  try {
    const mongoDB = await getMongoClient();
    const storageMode = await getStorageConfig();
    
    if (!storageMode) {
      console.log("DEBUG: Storage disabled, no interactions to retrieve");
      return [];
    }
    
    const results = [];
    
    if (storageMode === "chat_history") {
      const chatCollection = mongoDB.collection(CHAT_HISTORY_COLLECTION);
      let cursor = chatCollection
        .find({ "user_info.email": email })
        .sort({ timestamp: -1 });
      
      if (limit) {
        cursor = cursor.limit(limit);
      }
      
      const chatHistory = await cursor.toArray();
      results.push(...chatHistory);
      
    } else if (storageMode === "questions") {
      const questionsCollection = mongoDB.collection(QUESTIONS_COLLECTION);
      let cursor = questionsCollection
        .find({ "user_info.email": email })
        .sort({ timestamp: -1 });
      
      if (limit) {
        cursor = cursor.limit(limit);
      }
      
      const questions = await cursor.toArray();
      results.push(...questions);
    }
    
    console.log(`DEBUG: Retrieved ${results.length} interactions for user: ${email}`);
    return results;
    
  } catch (error) {
    console.error(`DEBUG: Error retrieving user interactions by email: ${error}`);
    return [];
  }
}

/**
 * Retrieve all interactions for a specific authenticated user by email
 * @param {string} email - User's email address
 * @param {number} limit - Optional limit for results
 * @returns {Promise<Array>} Authenticated user interactions
 */
export async function getAuthenticatedUserInteractions(email, limit = null) {
  try {
    const mongoDB = await getMongoClient();
    const storageMode = await getStorageConfig();
    
    if (!storageMode) {
      console.log("DEBUG: Storage disabled, no interactions to retrieve");
      return [];
    }
    
    const results = [];
    
    if (storageMode === "chat_history") {
      const chatCollection = mongoDB.collection(CHAT_HISTORY_COLLECTION);
      let cursor = chatCollection
        .find({ 
          "user_info.email": email,
          "user_info.is_authenticated": true 
        })
        .sort({ timestamp: -1 });
      
      if (limit) {
        cursor = cursor.limit(limit);
      }
      
      const chatHistory = await cursor.toArray();
      results.push(...chatHistory);
      
    } else if (storageMode === "questions") {
      const questionsCollection = mongoDB.collection(QUESTIONS_COLLECTION);
      let cursor = questionsCollection
        .find({ 
          "user_info.email": email,
          "user_info.is_authenticated": true 
        })
        .sort({ timestamp: -1 });
      
      if (limit) {
        cursor = cursor.limit(limit);
      }
      
      const questions = await cursor.toArray();
      results.push(...questions);
    }
    
    console.log(`DEBUG: Retrieved ${results.length} authenticated interactions for email: ${email}`);
    return results;
    
  } catch (error) {
    console.error(`DEBUG: Error retrieving authenticated user interactions: ${error}`);
    return [];
  }
}

/**
 * Get interaction statistics
 * @param {string} email - Optional email filter
 * @returns {Promise<object>} Statistics object
 */
export async function getInteractionStats(email = null) {
  try {
    const mongoDB = await getMongoClient();
    const storageMode = await getStorageConfig();
    
    if (!storageMode) {
      return { total: 0, authenticated: 0, guests: 0 };
    }
    
    const collection = mongoDB.collection(
      storageMode === "chat_history" ? CHAT_HISTORY_COLLECTION : QUESTIONS_COLLECTION
    );
    
    const pipeline = [
      ...(email ? [{ $match: { "user_info.email": email } }] : []),
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          authenticated: {
            $sum: { $cond: [{ $eq: ["$user_info.is_authenticated", true] }, 1, 0] }
          },
          guests: {
            $sum: { $cond: [{ $eq: ["$user_info.is_authenticated", false] }, 1, 0] }
          }
        }
      }
    ];
    
    const result = await collection.aggregate(pipeline).toArray();
    
    return result[0] || { total: 0, authenticated: 0, guests: 0 };
    
  } catch (error) {
    console.error(`DEBUG: Error getting interaction stats: ${error}`);
    return { total: 0, authenticated: 0, guests: 0 };
  }
}

// Helper functions

/**
 * Simple language detection based on character analysis
 * @param {string} text - Text to analyze
 * @returns {string} Detected language code
 */
function detectLanguage(text) {
  if (!text) return 'unknown';
  
  // Simple detection based on Arabic characters
  const arabicRegex = /[\u0600-\u06FF]/;
  if (arabicRegex.test(text)) {
    return 'ar';
  }
  
  return 'en'; // Default to English
}

/**
 * Simple question categorization
 * @param {string} question - Question text
 * @returns {string} Category
 */
function categorizeQuestion(question) {
  if (!question) return 'general';
  
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('admission') || lowerQuestion.includes('apply')) {
    return 'admissions';
  } else if (lowerQuestion.includes('fee') || lowerQuestion.includes('cost')) {
    return 'fees';
  } else if (lowerQuestion.includes('program') || lowerQuestion.includes('course')) {
    return 'programs';
  } else if (lowerQuestion.includes('scholarship')) {
    return 'scholarships';
  }
  
  return 'general';
}