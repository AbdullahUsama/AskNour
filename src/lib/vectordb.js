import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { v4 as uuidv4 } from 'uuid';

import { CHUNK_OVERLAP, CHUNK_SIZE } from './constants.js';

/**
 * Get GoogleGenerativeAI embeddings with dynamic API key
 * @param {string} apiKey - Optional API key to use
 * @returns {GoogleGenerativeAIEmbeddings} Embeddings instance
 */
export function getGeminiEmbeddings(apiKey = null) {
  try {
    // Use provided API key or fallback to environment variable
    const finalApiKey = apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!finalApiKey) {
      throw new Error('Gemini API key not found in parameters or environment variables');
    }
    
    console.log('DEBUG: Creating GoogleGenerativeAIEmbeddings with API key');
    return new GoogleGenerativeAIEmbeddings({
      model: 'gemini-embedding-001',
      apiKey: finalApiKey
    });
  } catch (error) {
    console.error(`ERROR: Failed to create embeddings: ${error}`);
    throw error;
  }
}

// Note: Pinecone API key will be validated when needed

/**
 * Get Pinecone vector store instance
 * @param {string} geminiApiKey - Optional Gemini API key for embeddings
 * @returns {Promise<PineconeStore>} Pinecone vector store
 */
export async function getPineconeVectorStore(geminiApiKey = null) {
  console.log('DEBUG: Starting getPineconeVectorStore()');

  const pineconeApiKey = process.env.PINECONE_API_KEY;

  // Initialize Pinecone client
  const pc = new Pinecone({
    apiKey: pineconeApiKey
  });

  const indexName = process.env.PINECONE_INDEX_NAME || 'ask-nour';

  try {
    // Check if index exists
    const indexList = await pc.listIndexes();
    const indexExists = indexList.indexes?.some(index => index.name === indexName);

    if (!indexExists) {
      console.log(`DEBUG: Creating Pinecone index '${indexName}'`);
      
      // Create index with proper configuration
      await pc.createIndex({
        name: indexName,
        dimension: 3072, // Correct dimension for Gemini embeddings
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });

      // Wait for index to be ready
      console.log('DEBUG: Waiting for index to be ready...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }

    // Get the index
    const index = pc.index(indexName);

    // Create embeddings with provided API key
    console.log('DEBUG: Creating GoogleGenerativeAIEmbeddings with dynamic API key');
    const embeddings = getGeminiEmbeddings(geminiApiKey);

    // Create vector store
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      textKey: 'text',
      namespace: process.env.PINECONE_NAMESPACE || ''
    });

    console.log('✅ Pinecone vector store initialized successfully');
    return vectorStore;

  } catch (error) {
    console.error(`❌ Error initializing Pinecone vector store: ${error}`);
    throw error;
  }
}

/**
 * Add documents to the Pinecone vector store
 * @param {PineconeStore} vectorStore - The vector store instance
 * @param {string[]} documents - Array of document texts
 * @param {Object[]} metadatas - Array of metadata objects (optional)
 */
export async function addDocumentsToVectorStore(vectorStore, documents, metadatas = null) {
  if (!documents || documents.length === 0) {
    console.log('DEBUG: No documents to add.');
    return;
  }

  try {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP
    });

    console.log(`DEBUG: Splitting ${documents.length} documents into chunks`);
    
    // Create document objects
    const docs = await textSplitter.createDocuments(documents, metadatas);
    
    // Generate UUIDs for documents
    const uuids = docs.map(() => uuidv4());

    // Add documents to vector store
    await vectorStore.addDocuments(docs, { ids: uuids });
    
    console.log(`✅ Added ${docs.length} document chunks to the vector store`);
    
    return {
      success: true,
      documentsAdded: docs.length,
      chunks: docs.length
    };

  } catch (error) {
    console.error(`❌ Error adding documents to vector store: ${error}`);
    throw error;
  }
}

/**
 * Search similar documents in the vector store
 * @param {PineconeStore} vectorStore - The vector store instance
 * @param {string} query - Search query
 * @param {number} k - Number of results to return (default: 5)
 * @param {Object} filter - Optional filter object
 * @returns {Promise<Array>} Array of similar documents
 */
export async function searchSimilarDocuments(vectorStore, query, k = 5, filter = null) {
  try {
    // First, check if the index has any vectors at all
    const stats = await getVectorStoreStats(vectorStore);
    console.log(`DEBUG: Index statistics:`, stats);
    console.log(`DEBUG: Total vectors in index: ${stats.totalRecordCount || 0}`);
    
    if (!stats.totalRecordCount || stats.totalRecordCount === 0) {
      console.log("❌ ERROR: Vector database is completely empty!");
      return [];
    }
    
    console.log(`DEBUG: Searching for similar documents with query: "${query.substring(0, 50)}..."`);
    console.log(`DEBUG: Using k=${k}, filter=${filter ? JSON.stringify(filter) : 'none'}`);
    
    const results = await vectorStore.similaritySearch(query, k, filter);
    
    console.log(`DEBUG: Found ${results.length} similar documents`);
    return results;

  } catch (error) {
    console.error(`❌ Error searching similar documents: ${error}`);
    return [];
  }
}

/**
 * Delete documents from the vector store by IDs
 * @param {PineconeStore} vectorStore - The vector store instance
 * @param {string[]} ids - Array of document IDs to delete
 */
export async function deleteDocuments(vectorStore, ids) {
  try {
    if (!ids || ids.length === 0) {
      console.log('DEBUG: No document IDs provided for deletion.');
      return;
    }

    // Get the underlying Pinecone index
    const index = vectorStore.pineconeIndex;
    
    // Delete vectors by IDs
    await index.deleteMany(ids);
    
    console.log(`✅ Deleted ${ids.length} documents from vector store`);

  } catch (error) {
    console.error(`❌ Error deleting documents: ${error}`);
    throw error;
  }
}

/**
 * Get vector store statistics
 * @param {PineconeStore} vectorStore - The vector store instance
 * @returns {Promise<Object>} Statistics object
 */
export async function getVectorStoreStats(vectorStore) {
  try {
    // Get the underlying Pinecone index
    const index = vectorStore.pineconeIndex;
    
    // Get index statistics
    const stats = await index.describeIndexStats();
    
    console.log('DEBUG: Vector store statistics:', stats);
    return stats;

  } catch (error) {
    console.error(`❌ Error getting vector store statistics: ${error}`);
    throw error;
  }
}

/**
 * Clear all documents from the vector store (use with caution!)
 * @param {PineconeStore} vectorStore - The vector store instance
 */
export async function clearVectorStore(vectorStore) {
  try {
    console.log('⚠️ WARNING: Clearing all documents from vector store...');
    
    // Get the underlying Pinecone index
    const index = vectorStore.pineconeIndex;
    
    // Delete all vectors in the namespace
    await index.deleteAll();
    
    console.log('✅ Vector store cleared successfully');

  } catch (error) {
    console.error(`❌ Error clearing vector store: ${error}`);
    throw error;
  }
}