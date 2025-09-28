import chainlit as cl
from typing import Optional, Dict, Any
from auth_service import auth_service
from enum import Enum

class UserRole(Enum):
    GUEST = "guest"
    USER = "user"
    PREMIUM = "premium_user"
    ADMIN = "admin"

class AuthMiddleware:
    @staticmethod
    def get_current_user() -> Optional[Dict[str, Any]]:
        """Get current authenticated user from session"""
        try:
            # Check if user is authenticated in current session
            is_authenticated = cl.user_session.get("is_authenticated", False)
            if not is_authenticated:
                return None
            
            # Get stored user data
            user_data = cl.user_session.get("authenticated_user")
            if not user_data:
                return None
            
            # Verify token is still valid
            token = cl.user_session.get("auth_token")
            if token:
                verified_user = auth_service.verify_token(token)
                if verified_user:
                    # Update session with fresh user data
                    cl.user_session.set("authenticated_user", verified_user)
                    return verified_user
                else:
                    # Token is invalid, clear session
                    AuthMiddleware.clear_auth_session()
                    return None
            
            return user_data
            
        except Exception as e:
            print(f"DEBUG: Error getting current user: {e}")
            return None
    
    @staticmethod
    def set_authenticated_user(token: str, user_data: Dict[str, Any]) -> bool:
        """Set authenticated user in session"""
        try:
            cl.user_session.set("auth_token", token)
            cl.user_session.set("authenticated_user", user_data)
            cl.user_session.set("is_authenticated", True)
            
            # Set KYC data from authenticated user for consistency
            kyc_data = {
                "name": user_data.get("name"),
                "email": user_data.get("email"),
                "mobile": user_data.get("mobile"),
                "faculty": user_data.get("faculty")
            }
            cl.user_session.set("kyc", kyc_data)
            cl.user_session.set("is_kyc_complete", True)
            
            print(f"DEBUG: Set authenticated user: {user_data.get('username')}")
            return True
            
        except Exception as e:
            print(f"DEBUG: Error setting authenticated user: {e}")
            return False
    
    @staticmethod
    def clear_auth_session():
        """Clear authentication data from session"""
        try:
            cl.user_session.set("auth_token", None)
            cl.user_session.set("authenticated_user", None)
            cl.user_session.set("is_authenticated", False)
            print(f"DEBUG: Cleared authentication session")
        except Exception as e:
            print(f"DEBUG: Error clearing auth session: {e}")
    
    @staticmethod
    def is_authenticated() -> bool:
        """Check if current user is authenticated"""
        user = AuthMiddleware.get_current_user()
        return user is not None
    
    @staticmethod
    def get_user_role() -> UserRole:
        """Get current user's role"""
        user = AuthMiddleware.get_current_user()
        if not user:
            return UserRole.GUEST
        
        role_str = user.get("role", "user")
        try:
            return UserRole(role_str)
        except ValueError:
            return UserRole.USER
    
    @staticmethod
    def has_permission(required_role: UserRole) -> bool:
        """Check if current user has required permission"""
        user_role = AuthMiddleware.get_user_role()
        
        # Role hierarchy: ADMIN > PREMIUM > USER > GUEST
        role_hierarchy = {
            UserRole.GUEST: 0,
            UserRole.USER: 1,
            UserRole.PREMIUM: 2,
            UserRole.ADMIN: 3
        }
        
        return role_hierarchy[user_role] >= role_hierarchy[required_role]
    
    @staticmethod
    def require_auth():
        """Decorator to require authentication for certain functions"""
        def decorator(func):
            async def wrapper(*args, **kwargs):
                if not AuthMiddleware.is_authenticated():
                    await cl.Message(
                        content="🔒 Please log in to access this feature."
                    ).send()
                    await AuthMiddleware.show_login_prompt()
                    return
                return await func(*args, **kwargs)
            return wrapper
        return decorator
    
    @staticmethod
    def require_role(required_role: UserRole):
        """Decorator to require specific role"""
        def decorator(func):
            async def wrapper(*args, **kwargs):
                if not AuthMiddleware.has_permission(required_role):
                    user_role = AuthMiddleware.get_user_role()
                    await cl.Message(
                        content=f"🔒 This feature requires {required_role.value} access. You have {user_role.value} access."
                    ).send()
                    return
                return await func(*args, **kwargs)
            return wrapper
        return decorator
    
    @staticmethod
    async def show_login_prompt():
        """Show login prompt to user"""
        login_msg = await cl.Message(
            content="To continue, please log in by typing: **I want to login**\n\nOr create an account by typing: **I want to register**"
        ).send()
    
    @staticmethod
    def get_user_context() -> Dict[str, Any]:
        """Get user context for database operations"""
        user = AuthMiddleware.get_current_user()
        session_id = cl.user_session.get("id", "unknown")
        
        if user:
            return {
                "session_id": session_id,
                "is_authenticated": True,
                "user_id": user.get("user_id"),
                "username": user.get("username"),
                "email": user.get("email"),
                "role": user.get("role", "user")
            }
        else:
            return {
                "session_id": session_id,
                "is_authenticated": False,
                "user_id": None,
                "username": None,
                "email": None,
                "role": "guest"
            }

# Permission decorators for easy use
def require_auth(func):
    """Require authentication for this function"""
    return AuthMiddleware.require_auth()(func)

def require_user(func):
    """Require user role or higher"""
    return AuthMiddleware.require_role(UserRole.USER)(func)

def require_premium(func):
    """Require premium role or higher"""
    return AuthMiddleware.require_role(UserRole.PREMIUM)(func)

def require_admin(func):
    """Require admin role"""
    return AuthMiddleware.require_role(UserRole.ADMIN)(func)
