import os
import wave
import pyaudio
import base64
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from utils import get_media_selector_llm_chain, get_cached_llm_chain, get_cached_media_llm_chain, get_cached_media_decision_chain, get_gemini_api_key_from_mongo

load_dotenv()
# os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")
os.environ["GOOGLE_API_KEY"] = get_gemini_api_key_from_mongo()
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

audio_dir = "audio"
if not os.path.exists(audio_dir):
    os.makedirs(audio_dir)

def record_audio_and_save(duration=5):
    """
    Records audio from the microphone for a specified duration and saves it to a file.
    The filename is a sequential number (e.g., 1.wav, 2.wav).
    """
    # Audio settings
    print("DEBUG:-------------Entered speech to text------------------------")
    chunk = 1024
    sample_format = pyaudio.paInt16
    channels = 1
    rate = 16000

    # Initialize PyAudio
    p = pyaudio.PyAudio()
    
    # Open a stream
    stream = p.open(format=sample_format,
                    channels=channels,
                    rate=rate,
                    input=True,
                    frames_per_buffer=chunk)
    
    print(f"Recording for {duration} seconds...")
    frames = []
    
    # Record audio data
    for _ in range(0, int(rate / chunk * duration)):
        data = stream.read(chunk)
        frames.append(data)
    
    print("Recording finished!")
    
    # Stop and close the stream
    stream.stop_stream()
    stream.close()
    p.terminate()
    
    # Determine the next sequential filename
    existing_files = [f for f in os.listdir(audio_dir) if f.endswith('.wav')]
    if not existing_files:
        next_number = 1
    else:
        file_numbers = [int(f.split('.')[0]) for f in existing_files if f.split('.')[0].isdigit()]
        if file_numbers:
            next_number = max(file_numbers) + 1
        else:
            next_number = 1
            
    filename = os.path.join(audio_dir, f"{next_number}.wav")

    # Save the recorded audio to a file
    with wave.open(filename, 'wb') as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(p.get_sample_size(sample_format))
        wf.setframerate(rate)
        wf.writeframes(b''.join(frames))
        
    print(f"Audio saved as '{filename}'")
    return filename

    
def encode_audio_to_base64(audio_file_path):
    """
    Encodes audio file to base64 for Gemini API
    """
    with open(audio_file_path, 'rb') as audio_file:
        audio_data = audio_file.read()
        encoded_audio = base64.b64encode(audio_data).decode('utf-8')
    return encoded_audio

def transcribe_with_gemini(audio_file_path):
    """
    Uses Gemini 2.0 Flash to both transcribe the audio and provide a response.
    Returns the transcribed text or None if there's an error.
    """
    try:
        print("Processing audio with Gemini...")
        
        # Determine the MIME type based on file extension
        if audio_file_path.endswith('.webm'):
            mime_type = "audio/webm"
        elif audio_file_path.endswith('.wav'):
            mime_type = "audio/wav"
        elif audio_file_path.endswith('.mp3'):
            mime_type = "audio/mp3"
        elif audio_file_path.endswith('.m4a'):
            mime_type = "audio/mp4"
        else:
            # Default to wav
            mime_type = "audio/wav"
        
        print(f"DEBUG: Using MIME type: {mime_type} for file: {audio_file_path}")
        
        # Encode audio to base64
        encoded_audio = encode_audio_to_base64(audio_file_path)
        
        # Create message with audio content
        message = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": "Please transcribe this audio and return only the transcribed text without any additional commentary."
                },
                {
                    "type": "media",
                    "mime_type": mime_type,
                    "data": encoded_audio
                }
            ]
        )
        
        # Get response from Gemini
        response = llm.invoke([message])
        
        print("\nGemini's Response:")
        print(response.content)
        
        # Return the transcribed text
        return response.content.strip()
        
    except Exception as e:
        print(f"An error occurred with Gemini API: {e}")
        return None

# --- Main execution loop ---
# if __name__ == "__main__":
#     while True:
#         try:
#             # Record a new audio file
#             recorded_file = record_audio_and_save(duration=8)
            
#             # Process the recorded file with Gemini
#             transcribe_with_gemini(recorded_file)
            
#             # Ask the user if they want to record again
#             choice = input("\nDo you want to record another query? (yes/no): ").lower()
#             if choice != 'yes':
#                 break
                
#         except Exception as e:
#             print(f"An unexpected error occurred: {e}")
#             break