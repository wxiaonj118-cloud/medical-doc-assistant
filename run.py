"""
Development server runner for Medical Document Assistant
"""
from app import app
from config import config

if __name__ == '__main__':
    # Create necessary directories
    import os
    os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)
    
    # Run the application
    print(f"\n🚀 Starting {config.APP_NAME}...")
    print(f"📁 Upload folder: {os.path.abspath(config.UPLOAD_FOLDER)}")
    print(f"🔗 Local URL: http://localhost:5000")
    print(f"🔗 Health check: http://localhost:5000/api/health")
    print(f"🔗 Upload test: http://localhost:5000/upload")
    print("\nPress Ctrl+C to stop\n")
    
    app.run(
        debug=config.DEBUG,
        host='0.0.0.0',
        port=5000,
        threaded=True
    )