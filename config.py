"""
Configuration loader for Medical Document Assistant
Loads settings from environment variables with defaults
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Application configuration"""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_ENV', 'development') == 'development'
    
    # File Upload
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_FILE_SIZE_MB', 10)) * 1024 * 1024  # 10MB default
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'static/uploads')
    ALLOWED_EXTENSIONS = set(os.getenv('ALLOWED_EXTENSIONS', 'pdf,docx,doc').split(','))
    
    # DeepSeek AI
    DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')
    DEEPSEEK_BASE_URL = os.getenv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com')
    DEEPSEEK_MODEL = os.getenv('DEEPSEEK_MODEL', 'deepseek-chat')
    
    # Supabase
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    # Application
    APP_NAME = os.getenv('APP_NAME', 'Medical Document Assistant')
    SESSION_TIMEOUT_HOURS = int(os.getenv('SESSION_TIMEOUT_HOURS', 24))
    
    # Security
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = os.getenv('SESSION_COOKIE_HTTPONLY', 'True').lower() == 'true'
    SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        errors = []
        
        if not cls.DEEPSEEK_API_KEY:
            errors.append("DEEPSEEK_API_KEY is not set in .env file")
        
        # Supabase is optional for Day 1
        # if not cls.SUPABASE_URL:
        #     errors.append("SUPABASE_URL is not set in .env file")
        
        if cls.SECRET_KEY == 'dev-secret-key-change-in-production':
            print("⚠️  WARNING: Using default SECRET_KEY. Change this in production!")
        
        if errors:
            raise ValueError("Configuration errors:\n" + "\n".join(f"  • {error}" for error in errors))
        
        return True

# Global config instance
config = Config()

# Print configuration status
print(f"🔧 Config loaded for: {config.APP_NAME}")
print(f"   DeepSeek API: {'✅' if config.DEEPSEEK_API_KEY else '❌'}")
print(f"   Supabase: {'✅' if config.SUPABASE_URL else '⚠️ (optional)'}")