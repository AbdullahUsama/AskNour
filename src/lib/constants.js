// constants.js

// Text splitting - Optimized for admission assistance content
export const CHUNK_SIZE = 1500; // Increased for better context retention in educational content
export const CHUNK_OVERLAP = 200; // Increased overlap to maintain context across chunks

// Retriever - Increased for comprehensive admission information
export const RETRIEVER_K = 5; // Retrieve more chunks for thorough admission answers

export const MAX_HISTORY_TOKENS = 2000; // Increased to maintain longer conversation context
export const MAX_INPUT_TOKENS = 750; // Increased to allow longer questions
export const MAX_OUTPUT_TOKENS = 1500; // Increased for comprehensive responses

export const END_TOKEN = "[END_RESPONSE]";

// Collection names
export const USERS_COLLECTION = "user_details";
export const ADMIN_USERS_COLLECTION_NAME = "admin_users";
export const IMAGES_COLLECTION = "images";
export const VIDEOS_COLLECTION = "videos";
export const CONFIG_COLLECTION = "config";

export const CHAT_HISTORY_COLLECTION = "chat_history";
export const QUESTIONS_COLLECTION = "questions";

// Registration URL
export const REGISTER_BUTTON_URL = "https://bit.ly/fue_asknour";

// Auth Collections
export const USERS_AUTH_COLLECTION = "authenticated_users";
export const USER_SESSIONS_COLLECTION = "user_sessions";

// Default values
export const DEFAULT_MODEL = "gemini-2.0-flash";
export const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";

// Validation constants
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 255;

// Faculty list
export const FACULTIES = [
  "oral and dental",
  "pharmacy", 
  "commerce and business administration",
  "engineering",
  "computer science",
  "economics and political science"
];

// Audio processing
export const SUPPORTED_AUDIO_FORMATS = ['.webm', '.wav', '.mp3', '.m4a'];
export const MAX_AUDIO_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Rate limiting
export const RATE_LIMIT_REQUESTS = 100;
export const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

// Session settings
export const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
export const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour