import chainlit as cl
import os
import json
import asyncio
import traceback
import tempfile
from langchain_core.messages import  HumanMessage
from langchain_core.messages.utils import count_tokens_approximately

from constants import MAX_INPUT_TOKENS,END_TOKEN
from utils import trim_chat_history, run_chain_with_retry, create_llm_chain, send_error_message, extract_variables_from_response, search_media_by_keywords
from utils import get_media_selector_llm_chain, get_cached_llm_chain, get_cached_media_llm_chain, get_cached_media_decision_chain, get_gemini_api_key_from_mongo
from kyc_util import handle_kyc, send_welcome_message
from vectordb_util import get_pinecone_vector_store
from mongo_util import get_mongo_client
from storage_util import get_storage_config, save_interaction_data
from speech_to_text import  record_audio_and_save, encode_audio_to_base64, transcribe_with_gemini
from auth_middleware import AuthMiddleware
import traceback

# Check if Gemini API key is available from MongoDB or environment
api_key = get_gemini_api_key_from_mongo()
if not api_key:
    error_msg = "❌ Gemini API key not found in MongoDB or environment variables. Please configure it in the dashboard."
    print(error_msg)
    # Don't raise error here - let it be handled gracefully when chains are used

# Initialize components with error handling
try:
    vectordb = get_pinecone_vector_store()
    print("✅ Vector database initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize vector database: {e}")
    vectordb = None

mongo_db = get_mongo_client()


# Global variable to store current recording session
current_session_audio_data = None

# Initialize auth middleware
auth_middleware = AuthMiddleware()

async def initialize_user_session():
    """Initialize user session and check for existing authentication"""
    try:
        # Initialize default session values
        cl.user_session.set("is_authenticated", False)
        cl.user_session.set("user_role", "guest")
        cl.user_session.set("kyc_step", 0)
        cl.user_session.set("kyc_data", {})
        cl.user_session.set("auth_mode", None)
        
        # Check if there's an existing JWT token (from cookies or session storage)
        # This would typically come from the frontend if implementing persistent sessions
        jwt_token = cl.user_session.get("jwt_token")
        
        if jwt_token:
            # Verify and restore user session
            user_data = auth_middleware.get_current_user()
            if user_data:
                cl.user_session.set("is_authenticated", True)
                cl.user_session.set("user_id", user_data["user_id"])
                cl.user_session.set("email", user_data["email"])
                cl.user_session.set("name", user_data["name"])
                cl.user_session.set("user_role", user_data.get("role", "user"))
                print(f"DEBUG: Restored authenticated session for {user_data['email']}")
            else:
                # Invalid token, clear it
                cl.user_session.set("jwt_token", None)
                print("DEBUG: Invalid JWT token, cleared session")
        
        print(f"DEBUG: Session initialized - authenticated: {cl.user_session.get('is_authenticated')}")
        
    except Exception as error:
        print(f"ERROR in initialize_user_session: {error}")
        # Set default values if initialization fails
        cl.user_session.set("is_authenticated", False)
        cl.user_session.set("user_role", "guest")


async def handle_audio_transcription(message: cl.Message):
    """
    Handle audio transcription requests sent from the frontend
    """
    try:
        print("DEBUG: Processing audio transcription request")
        
        # Extract base64 audio data from the message
        audio_data_b64 = message.content[len("[AUDIO_TRANSCRIPTION_REQUEST]"):]
        print(f"DEBUG: Received base64 audio data, length: {len(audio_data_b64)}")
        
        # Show processing message
        processing_msg = cl.Message(content="🔄 Processing your voice message...")
        await processing_msg.send()
        
        # Decode base64 audio data
        import base64
        audio_data = base64.b64decode(audio_data_b64)
        print(f"DEBUG: Decoded audio data, length: {len(audio_data)} bytes")
        
        # Create a temporary file to save the audio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        print(f"DEBUG: Saved audio to temporary file: {temp_file_path}")
        
        # Convert WebM to WAV if needed (for now, try to transcribe directly)
        # Note: Gemini should be able to handle WebM format
        try:
            # First, try with the WebM file directly
            transcribed_text = await transcribe_audio_async(temp_file_path)
            
            if not transcribed_text:
                # If that fails, try converting to WAV first
                print("DEBUG: WebM transcription failed, attempting conversion...")
                wav_path = await convert_webm_to_wav(temp_file_path)
                if wav_path:
                    transcribed_text = await transcribe_audio_async(wav_path)
                    os.unlink(wav_path)  # Clean up WAV file
        
        except Exception as transcription_error:
            print(f"DEBUG: Transcription error: {transcription_error}")
            transcribed_text = None
        
        # Clean up the temporary file
        os.unlink(temp_file_path)
        
        if transcribed_text and transcribed_text.strip():
            print(f"DEBUG: Successfully transcribed: {transcribed_text}")
            
            # Remove the processing message
            await processing_msg.remove()
            
            # Send the transcribed text with a special prefix that JavaScript can detect
            transcription_msg = cl.Message(
                content=f"[TRANSCRIPTION_RESULT]{transcribed_text.strip()}"
            )
            await transcription_msg.send()
            
        else:
            print("DEBUG: Failed to transcribe audio or empty result")
            await processing_msg.update(content="❌ Sorry, I couldn't understand the audio. Please try speaking more clearly or check your microphone.")
    
    except Exception as e:
        print(f"DEBUG: Error in handle_audio_transcription: {e}")
        try:
            error_msg = cl.Message(content=f"❌ Error processing voice message: {str(e)}")
            await error_msg.send()
        except:
            pass


async def transcribe_audio_async(audio_file_path):
    """
    Async wrapper for the transcribe_with_gemini function
    """
    import asyncio
    import functools
    
    # Run the synchronous function in a thread pool
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, functools.partial(transcribe_with_gemini, audio_file_path))
    return result


async def convert_webm_to_wav(webm_path):
    """
    Convert WebM audio to WAV format (placeholder - would need ffmpeg or similar)
    For now, just return None to indicate conversion not available
    """
    # TODO: Implement WebM to WAV conversion using ffmpeg or similar
    # For now, we'll try to work with WebM directly
    return None


@cl.on_chat_start
async def on_chat_start():
    print("DEBUG: Chat session started")
    
    # UNCOMMENT THIS LINE TO TEST STREAMING IN PRODUCTION:
    # await test_streaming_debug()
    
    # Initialize session authentication state
    await initialize_user_session()
    
    print("DEBUG: Sending welcome message...")
    await send_welcome_message()

    # Get storage configuration once at session start
    storage_mode = get_storage_config()
    cl.user_session.set("storage_mode", storage_mode)
    print(f"DEBUG: Initialized user session - storage_mode: {storage_mode}")
    
    # Initialize streaming test to ensure connection is ready
    try:
        test_msg = cl.Message(content="")
        await test_msg.send()
        await asyncio.sleep(0.1)  # Small delay
        await test_msg.stream_token("✅")
        await asyncio.sleep(0.1)
        await test_msg.update()
        # Remove the test message immediately
        if cl.chat_context.remove(test_msg):
            print("DEBUG: Streaming test completed successfully and removed")
    except Exception as test_error:
        print(f"DEBUG: Streaming test failed: {test_error}, but continuing anyway")

@cl.on_message
async def handle_message(message: cl.Message):

    print(f"DEBUG: ========== NEW MESSAGE ==========")
    print(f"DEBUG: User message: '{message.content[:100]}...'")
    
    # Check if this is an audio transcription request
    if message.content.startswith("[AUDIO_TRANSCRIPTION_REQUEST]"):
        print("DEBUG: Audio transcription request detected")
        await handle_audio_transcription(message)
        return
    
    print(f"DEBUG: Current session state - is_authenticated: {cl.user_session.get('is_authenticated', False)}")
    print(f"DEBUG: Current user: {cl.user_session.get('email', 'anonymous')}")
    print(f"DEBUG: Auth mode: {cl.user_session.get('auth_mode', 'None')}")
    print(f"DEBUG: KYC step: {cl.user_session.get('kyc_step', 0)}")

    # Check if user is already authenticated
    is_authenticated = cl.user_session.get("is_authenticated", False)
    
    if not is_authenticated:
        # Handle authentication flow
        is_kyc_flow, intent_type, response_message = await handle_kyc(message.content)
        
        if is_kyc_flow:
            if response_message:
                await cl.Message(content=response_message).send()
                
                # Check if authentication was successful and update session state
                if intent_type == "login_complete" and "✅ Login successful!" in response_message:
                    print("DEBUG: Login completed successfully, user should now be authenticated")
                    # Force refresh authentication state
                    is_authenticated = cl.user_session.get("is_authenticated", False)
                    print(f"DEBUG: Updated authentication state after login: {is_authenticated}")
                
            return
        else:
            # Not an authentication request and not authenticated
            # Continue with anonymous mode
            print("DEBUG: Anonymous user, proceeding with limited chat")
    else:
        print("DEBUG: User is authenticated, proceeding with full chat access")
    
    # Continue with normal chat flow (authenticated or anonymous)
    print("DEBUG: Proceeding with normal chat flow")
        # else:
        #     print("DEBUG: Failed to save user data")

        # return  # Don't process the message that completed KYC as a regular question

    # Normal chat processing for all users (KYC complete or no KYC needed)
    kyc = cl.user_session.get("kyc", {})
    user_input = message.content
    # Only use the name if it's actually provided and not None/empty
    user_name = kyc.get('name') if kyc and kyc.get('name') else None
    user_faculty = kyc.get('faculty', 'Unknown') if kyc else 'Unknown'
    
    print(f"DEBUG: Processing question from user: {user_name or 'Anonymous'}")
    print(f"DEBUG: User input: '{user_input}'")
    print(f"DEBUG: User faculty: {user_faculty}")

    # Check if input exceeds token limit
    token_count = count_tokens_approximately([HumanMessage(user_input)])
    print(f"DEBUG: Input token count: {token_count}, Max allowed: {MAX_INPUT_TOKENS}")
    if token_count > MAX_INPUT_TOKENS:
        error = f"❌ Input too long! Please limit to {MAX_INPUT_TOKENS} tokens."
        print(f"DEBUG: Input too long, sending error message")
        await send_error_message(error, message)
        return

    print("DEBUG: Creating spinner message...")
    # Create a message for streaming with better initialization
    msg = cl.Message(content="Thinking...")
    await msg.send()
    
    # Add a small delay to ensure the message is properly initialized
    await asyncio.sleep(0.1)
    
    # Clear the thinking message and prepare for streaming
    msg.content = ""
    await msg.update()
    await asyncio.sleep(0.05)  # Additional small delay

    try:
        history = cl.chat_context.to_openai()
        print(f"DEBUG: Full chat history length: {len(history)} messages")
        history = history[:-2]  # Exclude the last two message (the current user input and empty AI response which was sent just above)
        print(f"DEBUG: Chat history before trimming: {len(history)} messages")
        print(f"DEBUG: Chat history content: {history}")
        
        trimmed = trim_chat_history(history)
        print(f"DEBUG: Trimmed chat history: {len(trimmed)} messages")
        print(f"DEBUG: Trimmed history content: {trimmed}")
        
        # STEP 1: Get media decision and keywords from Gemini (thinking step)
        print(f"DEBUG: ========== STEP 1: MEDIA DECISION ==========")
        print(f"DEBUG: Starting media decision analysis for user input: '{user_input[:100]}...'")
        print(f"DEBUG: User context - name: {user_name}, faculty: {user_faculty}")
        
        # Get the cached media decision chain
        media_decision_chain = get_cached_media_decision_chain()
        if not media_decision_chain:
            print(f"DEBUG: ERROR - Failed to get media decision chain")
            await send_error_message("❌ Unable to initialize media decision chain. Please check API key configuration.", message)
            return
        else:
            print(f"DEBUG: Successfully retrieved media decision chain")
            
        # Use the dedicated media decision chain
        print(f"DEBUG: Invoking media decision chain...")
        thinking_result = run_chain_with_retry(media_decision_chain, user_input, user_name, user_faculty, trimmed)
        thinking_response = thinking_result.content if hasattr(thinking_result, 'content') else thinking_result
        print(f"DEBUG: Media decision raw response: '{thinking_response}'")
        
        # Extract media decision and keywords from thinking response
        include_media, keywords = extract_variables_from_response(thinking_response)
        print(f"DEBUG: ========== STEP 1 RESULTS ==========")
        print(f"DEBUG: include_media = {include_media}")
        print(f"DEBUG: keywords = {keywords}")
        print(f"DEBUG: keywords count = {len(keywords) if keywords else 0}")
        print(f"DEBUG: ==========================================")

        # STEP 2: Search for media if needed
        print(f"DEBUG: ========== STEP 2: MEDIA SEARCH ==========")
        images = []
        videos = []
        selected_images = []
        selected_videos = []
        image_descriptions = ""
        video_descriptions = ""
        
        if include_media and keywords:
            print(f"DEBUG: Media is needed and keywords are available - proceeding with search")
            print(f"DEBUG: Searching with keywords: {keywords}")
            images, videos = search_media_by_keywords(keywords, mongo_db)
            print(f"DEBUG: Search results - Found {len(images)} images and {len(videos)} videos")
            
            if images:
                print(f"DEBUG: Images found:")
                for i, img in enumerate(images[:3]):  # Show first 3 for debugging
                    print(f"DEBUG:   [{i}] URL: {img.get('image_url', 'N/A')}")
                    print(f"DEBUG:       Description: {img.get('image_description', 'No description')[:100]}...")
            
            if videos:
                print(f"DEBUG: Videos found:")
                for i, vid in enumerate(videos[:3]):  # Show first 3 for debugging
                    print(f"DEBUG:   [{i}] URL: {vid.get('video_url', 'N/A')}")
                    print(f"DEBUG:       Description: {vid.get('video_description', 'No description')[:100]}...")
            
            # Step 2.5: Select most relevant media if we have options
            if images or videos:
                print(f"DEBUG: ========== STEP 2.5: MEDIA SELECTION ==========")
                print(f"DEBUG: Proceeding with media selection from {len(images)} images and {len(videos)} videos")
                
                media_selector_chain = get_cached_media_llm_chain()
                if not media_selector_chain:
                    print(f"DEBUG: ERROR - Failed to get media selector chain")
                    await send_error_message("❌ Unable to initialize media selector chain. Please check API key configuration.", message)
                    return
                else:
                    print(f"DEBUG: Successfully retrieved media selector chain")
                    
                # Prepare media data for selection
                videos_data = ", ".join([f"{video['video_url']} ({video.get('image_description', 'No description')})" for video in videos])
                images_data = ", ".join([f"{image['image_url']} ({image.get('video_description', 'No description')})" for image in images])
                
                print(f"DEBUG: Prepared videos data length: {len(videos_data)} characters")
                print(f"DEBUG: Prepared images data length: {len(images_data)} characters")
                print(f"DEBUG: Videos data preview: {videos_data[:200]}..." if videos_data else "DEBUG: No videos data")
                print(f"DEBUG: Images data preview: {images_data[:200]}..." if images_data else "DEBUG: No images data")
                
                try:
                    print(f"DEBUG: Invoking media selector chain...")
                    selection_response = media_selector_chain.invoke({
                        "input": user_input,
                        "videos": videos_data,
                        "images": images_data
                    })

                    selection_text = selection_response.content
                    print(f"DEBUG: Media selection raw response length: {len(selection_text)} characters")
                    print(f"DEBUG: Media selection response preview: {selection_text[:300]}...")
                    
                    # Parse the JSON response for selected media
                    print(f"DEBUG: Attempting to parse JSON response...")
                    selection_data = json.loads(selection_text)
                    print(f"DEBUG: Successfully parsed JSON response")
                    print(f"DEBUG: JSON keys: {list(selection_data.keys())}")
                    
                    selected_images = selection_data.get("selected_images", [])
                    selected_videos = selection_data.get("selected_videos", [])
                    image_descriptions = ", ".join(selection_data.get("image_descriptions", []))
                    video_descriptions = ", ".join(selection_data.get("video_descriptions", []))
                    
                    print(f"DEBUG: ========== STEP 2.5 RESULTS ==========")
                    print(f"DEBUG: Selected {len(selected_images)} images: {selected_images}")
                    print(f"DEBUG: Selected {len(selected_videos)} videos: {selected_videos}")
                    print(f"DEBUG: Image descriptions: '{image_descriptions[:200]}...' ({len(image_descriptions)} chars)")
                    print(f"DEBUG: Video descriptions: '{video_descriptions[:200]}...' ({len(video_descriptions)} chars)")
                    print(f"DEBUG: ==========================================")
                    
                except json.JSONDecodeError as e:
                    print(f"DEBUG: ERROR - Failed to parse media selection JSON: {e}")
                    print(f"DEBUG: Raw response that failed to parse: '{selection_text}'")
                    print(f"DEBUG: Using fallback media selection...")
                    # Fallback to using some of the found media
                    selected_images = [image["image_url"] for image in images[:3]]
                    selected_videos = [video["video_url"] for video in videos[:3]]
                    image_descriptions = ", ".join([image.get('description', 'No description') for image in images[:3]])
                    video_descriptions = ", ".join([video.get('description', 'No description') for video in videos[:3]])
                    
                    print(f"DEBUG: Fallback selection - {len(selected_images)} images, {len(selected_videos)} videos")
            else:
                print(f"DEBUG: No media found to select from")
        else:
            if not include_media:
                print(f"DEBUG: Media not needed for this query")
            if not keywords:
                print(f"DEBUG: No keywords provided for media search")
            print(f"DEBUG: Skipping media search and selection")

        print(f"DEBUG: ========== STEP 2 FINAL STATE ==========")
        print(f"DEBUG: Final selected_images count: {len(selected_images)}")
        print(f"DEBUG: Final selected_videos count: {len(selected_videos)}")
        print(f"DEBUG: Final image_descriptions length: {len(image_descriptions)} chars")
        print(f"DEBUG: Final video_descriptions length: {len(video_descriptions)} chars")
        print(f"DEBUG: ==========================================")

        # STEP 3: Generate final response using original RAG chain with media context
        print(f"DEBUG: ========== STEP 3: RAG RESPONSE GENERATION ==========")
        print(f"DEBUG: Starting final response generation using original RAG chain")
        print(f"DEBUG: Input parameters:")
        print(f"DEBUG:   - user_input: '{user_input[:100]}...'")
        print(f"DEBUG:   - user_name: {user_name}")
        print(f"DEBUG:   - user_faculty: {user_faculty}")
        print(f"DEBUG:   - chat_history length: {len(trimmed)} messages")
        print(f"DEBUG:   - image_descriptions: '{image_descriptions[:100]}...' ({len(image_descriptions)} chars)")
        print(f"DEBUG:   - video_descriptions: '{video_descriptions[:100]}...' ({len(video_descriptions)} chars)")
        
        # Get the original RAG chain
        print(f"DEBUG: Retrieving original RAG chain...")
        rag_chain = get_cached_llm_chain()
        if not rag_chain:
            print(f"DEBUG: ERROR - Failed to get RAG chain")
            await send_error_message("❌ Unable to initialize RAG chain. Please check API key configuration.", message)
            return
        else:
            print(f"DEBUG: Successfully retrieved RAG chain")
            
        print(f"DEBUG: Extracting answer chain from RAG chain...")
        answer_chain = rag_chain.pick("answer")
        print(f"DEBUG: Successfully extracted answer chain")
        
        print(f"DEBUG: Invoking RAG chain with media context...")
        result = run_chain_with_retry(answer_chain, user_input, user_name, user_faculty, trimmed, image_descriptions, video_descriptions)
        response_text = result.content if hasattr(result, 'content') else result
        print(f"DEBUG: RAG response received, length: {len(response_text)} characters")
        print(f"DEBUG: RAG response preview: '{response_text[:200]}...'")
        
        # Extract the clean content (no END_TOKEN expected from new system)
        final_text = response_text
        print(f"DEBUG: Final text length: {len(final_text)} characters")
        print(f"DEBUG: ========== STEP 3 COMPLETE ==========")

        # STEP 4: Stream the response text
        print(f"DEBUG: ========== STEP 4: TEXT STREAMING ==========")
        if final_text.strip():
            print(f"DEBUG: Starting to stream response text")
            print(f"DEBUG: Text to stream length: {len(final_text)} characters")
            print(f"DEBUG: First 100 chars: '{final_text[:100]}...'")
            
            try:
                # Clear any existing content first
                msg.content = ""
                await msg.update()
                
                # Stream in larger, more reliable chunks
                chunk_size = 10  # Larger chunks for better reliability
                chunks_count = len(final_text) // chunk_size + (1 if len(final_text) % chunk_size else 0)
                print(f"DEBUG: Will stream in {chunks_count} chunks of {chunk_size} characters each")
                
                for i in range(0, len(final_text), chunk_size):
                    chunk = final_text[i:i + chunk_size]
                    try:
                        await msg.stream_token(chunk)
                        # Reduced delay for better responsiveness
                        await asyncio.sleep(0.01)
                        
                        # Log progress every 20 chunks
                        chunk_num = i // chunk_size + 1
                        if chunk_num % 20 == 0:
                            print(f"DEBUG: Streamed {chunk_num}/{chunks_count} chunks ({(chunk_num/chunks_count)*100:.1f}%)")
                    except Exception as chunk_error:
                        print(f"DEBUG: Error streaming chunk {chunk_num}: {chunk_error}")
                        # Try to continue streaming
                        continue
                
                print(f"DEBUG: Finished streaming {len(final_text)} characters in {chunks_count} chunks")
                
                # Ensure the message is properly finalized
                await msg.update()
                
            except Exception as stream_error:
                print(f"DEBUG: Streaming error: {stream_error}")
                # Fallback: send all content at once
                msg.content = final_text
                await msg.update()
                print(f"DEBUG: Fallback - sent entire content at once")
                
        else:
            print("DEBUG: No content to stream - sending fallback message")
            fallback_msg = "I apologize, but I couldn't generate a proper response. Could you please rephrase your question?"
            try:
                await msg.stream_token(fallback_msg)
            except Exception as fallback_error:
                print(f"DEBUG: Error streaming fallback: {fallback_error}")
                msg.content = fallback_msg
                await msg.update()
            print(f"DEBUG: Streamed fallback message: '{fallback_msg}'")


        # FINAL SAFETY CHECK: Ensure no END_TOKEN appears in the visible message
        print(f"DEBUG: ========== SAFETY CHECK ==========")
        current_message_content = msg.content if hasattr(msg, 'content') and msg.content else ""
        print(f"DEBUG: Current message content length: {len(current_message_content)} characters")
        
        if END_TOKEN in current_message_content:
            print(f"WARNING: END_TOKEN found in message content - cleaning it up")
            print(f"DEBUG: Message content before cleaning: '{current_message_content[:200]}...'")
            cleaned_content = current_message_content.split(END_TOKEN)[0]
            msg.content = cleaned_content
            await msg.update()
            print(f"DEBUG: Cleaned message content length: {len(cleaned_content)} characters")
            print(f"DEBUG: Cleaned content preview: '{cleaned_content[:200]}...'")
        else:
            print(f"DEBUG: No END_TOKEN found in message content - no cleaning needed")
        print(f"DEBUG: ========== SAFETY CHECK COMPLETE ==========")

        # STEP 5: Display media elements if available
        print(f"DEBUG: ========== STEP 5: MEDIA DISPLAY ==========")
        elements = []
        
        if selected_images:
            print(f"DEBUG: Processing {len(selected_images)} selected images")
            for i, image_url in enumerate(selected_images):
                print(f"DEBUG: Processing image {i+1}/{len(selected_images)}: {image_url}")
                try:
                    elements.append(cl.Image(url=image_url, name=f"image_{i}", display="inline"))
                    print(f"DEBUG: Successfully added image element {i}")
                except Exception as e:
                    print(f"DEBUG: ERROR - Failed to add image element {i}: {e}")
        else:
            print(f"DEBUG: No images to display")

        if selected_videos:
            print(f"DEBUG: Processing {len(selected_videos)} selected videos")
            for i, video_url in enumerate(selected_videos):
                print(f"DEBUG: Processing video {i+1}/{len(selected_videos)}: {video_url}")
                video_url_lower = video_url.lower().strip()
                
                try:
                    if video_url_lower.startswith("facebook:"):
                        video_url_clean = video_url[len("Facebook:"):]
                        print(f"DEBUG: Detected Facebook video, clean URL: {video_url_clean}")
                        elements.append(cl.CustomElement(name="FacebookVideoEmbed", props={"url": video_url_clean}, display="inline"))
                        print(f"DEBUG: Successfully added Facebook video element {i}")
                    elif video_url_lower.startswith("youtube:"):
                        video_url_clean = video_url[len("YouTube:"):]
                        print(f"DEBUG: Detected YouTube video, clean URL: {video_url_clean}")
                        elements.append(cl.CustomElement(name="YouTubeVideoEmbed", props={"url": video_url_clean}, display="inline"))
                        print(f"DEBUG: Successfully added YouTube video element {i}")
                    else:
                        print(f"DEBUG: Unknown video URL format: {video_url}, skipping")
                except Exception as e:
                    print(f"DEBUG: ERROR - Failed to add video element {i}: {e}")
        else:
            print(f"DEBUG: No videos to display")

        print(f"DEBUG: Total media elements created: {len(elements)}")
        
        # Send additional message with media if we have media elements
        if elements:
            print(f"DEBUG: Sending message with {len(elements)} media elements")
            try:
                # Apply RTL formatting for Arabic text
                media_text = "Here are some relevant media files:"
            
                await cl.Message(content=media_text, elements=elements).send()
                print(f"DEBUG: Successfully sent media message")
            except Exception as e:
                print(f"DEBUG: ERROR - Failed to send media message: {e}")
        else:
            print(f"DEBUG: No media elements to send")
        
        print(f"DEBUG: ========== STEP 5 COMPLETE ==========")

        # Save interaction data based on config (retrieved once at session start)
        print(f"DEBUG: ========== DATA STORAGE ==========")
        storage_mode = cl.user_session.get("storage_mode")
        print(f"DEBUG: Storage mode: {storage_mode}")
        print(f"DEBUG: Saving interaction data...")
        print(f"DEBUG: User input length: {len(user_input)} chars")
        print(f"DEBUG: Final text length: {len(final_text)} chars")
        
        try:
            save_interaction_data(user_input, final_text, storage_mode)
            print(f"DEBUG: Successfully saved interaction data")
        except Exception as e:
            print(f"DEBUG: ERROR - Failed to save interaction data: {e}")
        
        print(f"DEBUG: ========== DATA STORAGE COMPLETE ==========")

        
    except Exception as e:
        print(f"DEBUG: ========== CRITICAL ERROR ==========")
        print(f"DEBUG: Error during chain execution: {str(e)}")
        print(f"DEBUG: Error type: {type(e).__name__}")
        print(f"DEBUG: Error occurred in main message handling flow")
        try:
            import traceback
            print(f"DEBUG: Full traceback:")
            traceback.print_exc()
        except:
            print(f"DEBUG: Could not print traceback")
        
        # Ensure the message shows an error instead of being empty
        try:
            error_content = f"❌ I apologize, but I encountered an error while processing your request. Please try again.\n\nError details: {str(e)}"
            msg.content = error_content
            await msg.update()
            print(f"DEBUG: Updated message with error content")
        except Exception as msg_error:
            print(f"DEBUG: Failed to update message with error: {msg_error}")
            # Try sending a new error message as fallback
            try:
                await send_error_message(f"❌ Gemini quota or other error: {str(e)}", message)
            except Exception as send_error:
                print(f"DEBUG: Failed to send error message: {send_error}")
        
        print(f"DEBUG: ========== CRITICAL ERROR HANDLED ==========")
        return  # Return early to avoid trying to finalize a potentially broken message

    print("DEBUG: ========== FINALIZING MESSAGE ==========")
    print("DEBUG: Finalizing message...")
    
    # Enhanced finalization with retry logic
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Ensure message content is properly set
            if hasattr(msg, 'content') and msg.content:
                print(f"DEBUG: Message content length before finalization: {len(msg.content)} characters")
            else:
                print("DEBUG: Warning - Message content appears to be empty")
            
            # Finalize the message
            await msg.update()
            print(f"DEBUG: Message finalized successfully on attempt {attempt + 1}")
            break
            
        except Exception as e:
            print(f"DEBUG: ERROR - Failed to finalize message on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                print(f"DEBUG: Retrying message finalization in 0.2 seconds...")
                await asyncio.sleep(0.2)
            else:
                print(f"DEBUG: Failed to finalize message after {max_retries} attempts")
                # Try one last time with a fresh message if all retries failed
                try:
                    if hasattr(msg, 'content') and msg.content:
                        final_msg = cl.Message(content=msg.content)
                        await final_msg.send()
                        print("DEBUG: Successfully sent backup message")
                except Exception as backup_error:
                    print(f"DEBUG: Backup message also failed: {backup_error}")
    
    print("DEBUG: ========== MESSAGE PROCESSING COMPLETE ==========")
    print(f"DEBUG: Total processing complete for message: '{user_input[:50]}...'")
    print("DEBUG: ======================================================")
