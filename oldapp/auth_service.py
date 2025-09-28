import jwt
import bcrypt
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import chainlit as cl
from mongo_util import get_mongo_client
from constants import USERS_COLLECTION

# JWT Configuration - In production, these should be environment variables
JWT_SECRET_KEY = "your-secret-key-change-in-production-2024"  # Change this in production
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 24

# Collections
USERS_AUTH_COLLECTION = "authenticated_users"
USER_SESSIONS_COLLECTION = "user_sessions"

class AuthService:
    def __init__(self):
        self.db = get_mongo_client()
        self.users_collection = self.db[USERS_AUTH_COLLECTION]
        self.sessions_collection = self.db[USER_SESSIONS_COLLECTION]
        self.kyc_collection = self.db[USERS_COLLECTION]  # KYC collection for data migration
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        # Convert password to bytes and hash
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        try:
            password_bytes = password.encode('utf-8')
            hashed_bytes = hashed_password.encode('utf-8')
            return bcrypt.checkpw(password_bytes, hashed_bytes)
        except Exception as e:
            print(f"DEBUG: Error verifying password: {e}")
            return False
    
    def register_user(self, kyc_data: Dict[str, Any]) -> Optional[str]:
        """Register new user from KYC data"""
        try:
            # Check if user already exists
            existing_user = self.users_collection.find_one({
                "$or": [
                    {"email": kyc_data.get("email")},
                    {"username": kyc_data.get("email")}  # Use email as username initially
                ]
            })
            
            if existing_user:
                print(f"DEBUG: User already exists with email: {kyc_data.get('email')}")
                return None
            
            # Hash the password
            hashed_password = self.hash_password(kyc_data.get("password"))
            
            # Create user document
            user_doc = {
                "username": kyc_data.get("email"),  # Use email as username
                "email": kyc_data.get("email"),
                "password_hash": hashed_password,
                "name": kyc_data.get("name"),
                "mobile": kyc_data.get("mobile"),
                "faculty": kyc_data.get("faculty"),
                "role": "user",  # Default role
                "is_active": True,
                "created_at": datetime.utcnow(),
                "last_login": None,
                "session_id": cl.user_session.get("id", "unknown"),  # Link to original KYC session
            }
            
            result = self.users_collection.insert_one(user_doc)
            user_id = str(result.inserted_id)
            
            print(f"DEBUG: Successfully registered user with ID: {user_id}")
            return user_id
            
        except Exception as e:
            print(f"DEBUG: Error registering user: {e}")
            return None
    
    def authenticate_user(self, username: str, password: str) -> tuple[Optional[str], Optional[Dict]]:
        """Authenticate user and return JWT token and user data"""
        try:
            # Find user by username or email
            user = self.users_collection.find_one({
                "$or": [
                    {"username": username.lower()},
                    {"email": username.lower()}
                ],
                "is_active": True
            })
            
            if not user:
                print(f"DEBUG: User not found: {username}")
                return None, None
            
            # Verify password
            if not self.verify_password(password, user["password_hash"]):
                print(f"DEBUG: Invalid password for user: {username}")
                return None, None
            
            # Update last login
            self.users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            
            # Generate JWT token
            token = self.generate_jwt_token(user)
            
            # Remove sensitive data from user object
            user_data = {
                "user_id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "name": user.get("name"),
                "mobile": user.get("mobile"),
                "faculty": user.get("faculty"),
                "role": user.get("role", "user"),
                "last_login": user.get("last_login")
            }
            
            print(f"DEBUG: Successfully authenticated user: {username}")
            return token, user_data
            
        except Exception as e:
            print(f"DEBUG: Error authenticating user: {e}")
            return None, None
    
    def generate_jwt_token(self, user: Dict[str, Any]) -> str:
        """Generate JWT token for authenticated user"""
        try:
            # Create payload
            payload = {
                "user_id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "role": user.get("role", "user"),
                "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS),
                "iat": datetime.utcnow(),
                "session_id": cl.user_session.get("id", "unknown")
            }
            
            # Generate token
            token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
            
            # Store session in MongoDB
            session_doc = {
                "user_id": str(user["_id"]),
                "token": token,
                "session_id": cl.user_session.get("id", "unknown"),
                "created_at": datetime.utcnow(),
                "expires_at": payload["exp"],
                "is_active": True,
                "user_agent": "Chainlit-ChatBot",  # Could be enhanced with actual user agent
            }
            
            # Clean up old sessions for this user (keep only last 5)
            old_sessions = list(self.sessions_collection.find(
                {"user_id": str(user["_id"])},
                sort=[("created_at", -1)],
                skip=4  # Keep 4 most recent, delete the rest
            ))
            
            if old_sessions:
                old_session_ids = [session["_id"] for session in old_sessions]
                self.sessions_collection.delete_many({"_id": {"$in": old_session_ids}})
            
            # Insert new session
            self.sessions_collection.insert_one(session_doc)
            
            print(f"DEBUG: Generated JWT token for user: {user['username']}")
            return token
            
        except Exception as e:
            print(f"DEBUG: Error generating JWT token: {e}")
            return None
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return user data"""
        try:
            # Decode token
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            
            # Check if session exists and is active
            session = self.sessions_collection.find_one({
                "token": token,
                "is_active": True,
                "expires_at": {"$gt": datetime.utcnow()}
            })
            
            if not session:
                print(f"DEBUG: Session not found or expired for token")
                return None
            
            # Get current user data
            user = self.users_collection.find_one({
                "_id": session["user_id"],
                "is_active": True
            })
            
            if not user:
                print(f"DEBUG: User not found or inactive: {session['user_id']}")
                return None
            
            # Return user data
            user_data = {
                "user_id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "name": user.get("name"),
                "mobile": user.get("mobile"),
                "faculty": user.get("faculty"),
                "role": user.get("role", "user"),
                "session_id": payload.get("session_id"),
                "token": token
            }
            
            return user_data
            
        except jwt.ExpiredSignatureError:
            print(f"DEBUG: Token expired")
            return None
        except jwt.InvalidTokenError as e:
            print(f"DEBUG: Invalid token: {e}")
            return None
        except Exception as e:
            print(f"DEBUG: Error verifying token: {e}")
            return None
    
    def logout_user(self, token: str) -> bool:
        """Logout user by deactivating token"""
        try:
            # Deactivate session
            result = self.sessions_collection.update_one(
                {"token": token},
                {"$set": {"is_active": False, "logout_at": datetime.utcnow()}}
            )
            
            success = result.modified_count > 0
            print(f"DEBUG: Logout {'successful' if success else 'failed'}")
            return success
            
        except Exception as e:
            print(f"DEBUG: Error logging out user: {e}")
            return False
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user data by user ID"""
        try:
            user = self.users_collection.find_one({"_id": user_id, "is_active": True})
            if user:
                return {
                    "user_id": str(user["_id"]),
                    "username": user["username"],
                    "email": user["email"],
                    "name": user.get("name"),
                    "mobile": user.get("mobile"),
                    "faculty": user.get("faculty"),
                    "role": user.get("role", "user"),
                }
            return None
        except Exception as e:
            print(f"DEBUG: Error getting user by ID: {e}")
            return None
    
    def cleanup_expired_sessions(self):
        """Clean up expired sessions"""
        try:
            result = self.sessions_collection.delete_many({
                "expires_at": {"$lt": datetime.utcnow()}
            })
            print(f"DEBUG: Cleaned up {result.deleted_count} expired sessions")
            return result.deleted_count
        except Exception as e:
            print(f"DEBUG: Error cleaning up sessions: {e}")
            return 0

# Global auth service instance
auth_service = AuthService()
