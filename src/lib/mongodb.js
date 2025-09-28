/**
 * MongoDB client and connection handling for Next.js
 */

import { MongoClient } from 'mongodb';

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME;

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI not set in environment variables. Please configure it.");
}

if (!MONGO_DB_NAME) {
  throw new Error("❌ MONGO_DB_NAME not set in environment variables. Please configure it.");
}

// Global connection variables
let client = null;
let db = null;

/**
 * Get MongoDB database connection
 * Uses connection pooling and caching for optimal performance
 * 
 * @returns {Promise<Db>} MongoDB database instance
 * @throws {Error} If connection fails
 */
export async function getMongoClient() {
  try {
    // Return cached connection if available
    if (db && client && client.topology && client.topology.isConnected()) {
      return db;
    }

    console.log("DEBUG: Establishing new MongoDB connection...");

    // Create new client with minimal settings for compatibility
    client = new MongoClient(MONGODB_URI);

    // Connect to MongoDB
    await client.connect();

    // Get database instance
    db = client.db(MONGO_DB_NAME);

    console.log("✅ MongoDB connected successfully");

    // Handle connection events
    client.on('error', (error) => {
      console.error("❌ MongoDB connection error:", error);
    });

    client.on('close', () => {
      console.log("⚠️ MongoDB connection closed");
      client = null;
      db = null;
    });

    client.on('reconnect', () => {
      console.log("✅ MongoDB reconnected");
    });

    return db;

  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    
    // Clean up on error
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error("Error closing MongoDB client:", closeError);
      }
    }
    
    client = null;
    db = null;
    
    throw new Error(`❌ Failed to connect to MongoDB: ${error.message}`);
  }
}

/**
 * Close MongoDB connection
 * Should be called during application shutdown
 */
export async function closeMongoConnection() {
  try {
    if (client) {
      await client.close();
      console.log("✅ MongoDB connection closed successfully");
    }
  } catch (error) {
    console.error("❌ Error closing MongoDB connection:", error);
  } finally {
    client = null;
    db = null;
  }
}

/**
 * Check if MongoDB connection is healthy
 * 
 * @returns {Promise<boolean>} Connection health status
 */
export async function checkMongoConnection() {
  try {
    if (!db) {
      await getMongoClient();
    }
    
    // Ping the database
    await db.admin().ping();
    return true;
    
  } catch (error) {
    console.error("❌ MongoDB health check failed:", error);
    return false;
  }
}

/**
 * Get a specific collection
 * 
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Collection>} MongoDB collection instance
 */
export async function getCollection(collectionName) {
  try {
    const database = await getMongoClient();
    return database.collection(collectionName);
  } catch (error) {
    console.error(`❌ Failed to get collection ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Create indexes for better performance
 * Should be called during application initialization
 */
export async function createIndexes() {
  try {
    const database = await getMongoClient();
    
    // Index for authenticated users
    const usersCollection = database.collection('authenticated_users');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    await usersCollection.createIndex({ created_at: 1 });
    
    // Index for user sessions
    const sessionsCollection = database.collection('user_sessions');
    await sessionsCollection.createIndex({ user_id: 1 });
    await sessionsCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
    
    // Index for chat history
    const chatCollection = database.collection('chat_history');
    await chatCollection.createIndex({ session_id: 1 });
    await chatCollection.createIndex({ timestamp: 1 });
    await chatCollection.createIndex({ "user_info.email": 1 });
    
    // Index for questions
    const questionsCollection = database.collection('questions');
    await questionsCollection.createIndex({ session_id: 1 });
    await questionsCollection.createIndex({ timestamp: 1 });
    await questionsCollection.createIndex({ "user_info.email": 1 });
    
    console.log("✅ MongoDB indexes created successfully");
    
  } catch (error) {
    console.error("❌ Failed to create MongoDB indexes:", error);
    // Don't throw error - indexes are optional for functionality
  }
}

// Clean up connections when Node.js process exits
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await closeMongoConnection();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await closeMongoConnection();
    process.exit(0);
  });
}