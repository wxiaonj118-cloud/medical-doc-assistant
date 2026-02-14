"""
Medical Document Assistant - SIMPLE VERSION for Day 1
WITH Python path fix for Windows
"""
import sys
import os

# ========== CRITICAL: FIX PYTHON PATH FOR WINDOWS ==========
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
    print(f"✅ Added to Python path: {current_dir}")

# Debug imports
print("\n🔍 Testing imports from utils folder...")
try:
    from utils.document_parser import DocumentParser
    print("  ✅ document_parser import successful")
except ImportError as e:
    print(f"  ❌ document_parser import failed: {e}")

try:
    from utils.ai_analyzer import AIAnalyzer
    print("  ✅ ai_analyzer import successful")
except ImportError as e:
    print(f"  ❌ ai_analyzer import failed: {e}")
# ========== END PATH FIX ==========

# ========== PATCH MISSING STORAGE3 ==========
class MockStorage3:
    class utils:
        class StorageException(Exception):
            pass
    
    class StorageClient:
        def __init__(self, *args, **kwargs):
            pass
        def from_(self, bucket):
            return self
        def upload(self, path, data, **kwargs):
            return {"message": "Mock storage"}

sys.modules['storage3'] = MockStorage3
sys.modules['storage3.utils'] = MockStorage3.utils
print("✅ Patched missing storage3 module")
# ========== END PATCH ==========

from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_cors import CORS
from datetime import datetime
import logging

# Setup
app = Flask(__name__)
CORS(app)
app.secret_key = os.getenv('SECRET_KEY', 'dev-key-123')

# Now import utilities (should work after path fix)
try:
    from utils.document_parser import DocumentParser
    from utils.ai_analyzer import AIAnalyzer
    document_parser = DocumentParser()
    
    # Check if DeepSeek API key exists
    deepseek_key = os.getenv('DEEPSEEK_API_KEY')
    if deepseek_key:
        ai_analyzer = AIAnalyzer(api_key=deepseek_key)
        print("✅ AI analyzer initialized with API key")
    else:
        ai_analyzer = None
        print("⚠️  AI analyzer created but no API key in .env")
    
    print("✅ Utilities loaded successfully")
except ImportError as e:
    print(f"❌ Utilities import failed: {e}")
    print(f"   Current directory: {os.getcwd()}")
    print(f"   utils folder exists: {os.path.exists('utils')}")
    document_parser = None
    ai_analyzer = None

# Get Supabase credentials from .env
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
APP_NAME = os.getenv('APP_NAME', 'Medical Document Assistant')

# ========== CONTEXT PROCESSOR FOR TEMPLATES ==========
# This makes Supabase config available to ALL templates automatically
@app.context_processor
def inject_global_config():
    """Inject configuration variables into all templates"""
    return dict(
        supabase_url=SUPABASE_URL,
        supabase_key=SUPABASE_ANON_KEY,
        app_name=APP_NAME,
        version='1.0.0',
        supabase_configured=bool(SUPABASE_URL and SUPABASE_ANON_KEY)
    )
# ========== END CONTEXT PROCESSOR ==========

# ========== SIMPLE ROUTES ==========

@app.route('/')
def home():
    """Main web interface"""
    return render_template('index.html')

@app.route('/api/health')
def health():
    deepseek_ready = ai_analyzer is not None and os.getenv('DEEPSEEK_API_KEY') is not None
    parser_ready = document_parser is not None
    supabase_ready = SUPABASE_URL is not None and SUPABASE_ANON_KEY is not None
    
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "flask": "✅",
            "deepseek": "✅" if deepseek_ready else "❌ (check .env)",
            "document_parser": "✅" if parser_ready else "❌",
            "ai_analyzer": "✅" if deepseek_ready else "❌ (needs API key)",
            "supabase": "✅" if supabase_ready else "❌ (optional)"
        },
        "notes": {
            "deepseek_status": "Configured" if os.getenv('DEEPSEEK_API_KEY') else "Missing API key in .env",
            "parser_status": "Loaded" if parser_ready else "Failed to load",
            "supabase_status": "Configured" if supabase_ready else "Missing in .env (optional)"
        }
    })

@app.route('/web')
def web_interface():
    """Simple web interface"""
    return render_template('index.html', 
                         title="Medical Document Assistant",
                         endpoint_text="/api/test/text",
                         endpoint_upload="/api/test/upload")

@app.route('/api/test/upload', methods=['POST'])
def test_upload():
    """Simple upload test endpoint"""
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Check file type
    allowed = {'pdf', 'docx', 'doc', 'txt'}
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    
    if ext not in allowed:
        return jsonify({"error": f"File type .{ext} not allowed. Use: {', '.join(allowed)}"}), 400
    
    # Save temporarily
    import tempfile
    
    temp_path = None
    try:
        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{ext}') as tmp:
            file.save(tmp.name)
            temp_path = tmp.name
        
        # Parse document (if parser available)
        if document_parser:
            text, error = document_parser.extract_text(temp_path)
            
            if error:
                return jsonify({
                    "error": f"Document parsing failed: {error}",
                    "filename": file.filename,
                    "file_size": os.path.getsize(temp_path) if temp_path else 0
                }), 400
            
            response = {
                "success": True,
                "filename": file.filename,
                "file_size": os.path.getsize(temp_path),
                "text_preview": text[:500] + "..." if len(text) > 500 else text,
                "text_length": len(text),
                "parser": "document_parser"
            }
            
            # Add AI analysis if available
            if ai_analyzer and os.getenv('DEEPSEEK_API_KEY'):
                result = ai_analyzer.analyze_medical_text(text[:3000], "en")
                if result.get('success'):
                    response['ai_analysis'] = result['analysis']
                else:
                    response['ai_error'] = result.get('error', 'Unknown error')
            
            # Clean up
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)
            
            return jsonify(response)
        else:
            return jsonify({
                "error": "Document parser not available",
                "filename": file.filename,
                "file_size": os.path.getsize(temp_path) if temp_path else 0
            }), 500
            
    except Exception as e:
        # Clean up on error
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@app.route('/api/test/text', methods=['POST'])
def test_text():
    """Test endpoint with plain text (no file upload)"""
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400
    
    text = data['text']
    
    if ai_analyzer and os.getenv('DEEPSEEK_API_KEY'):
        result = ai_analyzer.analyze_medical_text(text[:3000], "en")
        if result.get('success'):
            return jsonify({
                "success": True,
                "text_length": len(text),
                "analysis": result['analysis']
            })
        else:
            return jsonify({
                "error": f"AI analysis failed: {result.get('error', 'Unknown error')}"
            }), 500
    else:
        return jsonify({
            "error": "AI analyzer not available. Check DEEPSEEK_API_KEY in .env",
            "text_received": text[:200]
        }), 500

@app.route('/result')
def result_page():
    """Results page"""
    return render_template('result.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('static', filename)

if __name__ == '__main__':
    print(f"\n{'='*60}")
    print("🏥 Medical Document Assistant - WITH PATH FIX")
    print('='*60)
    print(f"Current directory: {os.getcwd()}")
    print(f"Python version: {sys.version.split()[0]}")
    print(f"\nWeb Interface: http://localhost:5000/")
    print(f"API Health: http://localhost:5000/api/health")
    print(f"Upload test: POST to http://localhost:5000/api/test/upload")
    print(f"Text test: POST JSON to http://localhost:5000/api/test/text")
    
    # Show Supabase status
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        print(f"✅ Supabase: Configured")
    else:
        print(f"ℹ️  Supabase: Not configured (optional)")
    
    print('='*60)
    
    app.run(debug=True, host='127.0.0.1', port=5000)