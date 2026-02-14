"""
Simplified Supabase client for Day 1 testing
"""
class SupabaseClient:
    """Mock Supabase client for testing"""
    
    def __init__(self, url: str = None, anon_key: str = None, service_key: str = None):
        self.url = url
        print(f"[MOCK] Supabase client created (URL: {url})")
    
    def register_user(self, email: str, password: str, name: str):
        return {
            "success": True,
            "user_id": "mock_user_123",
            "email": email,
            "name": name
        }
    
    def login_user(self, email: str, password: str):
        return {
            "success": True,
            "user_id": "mock_user_123",
            "email": email,
            "name": "Test User"
        }
    
    def logout_user(self):
        return {"success": True}
    
    def store_document(self, user_id: str, file_data: bytes, filename: str):
        return {
            "success": True,
            "file_path": f"mock/{filename}",
            "filename": filename,
            "url": f"mock://storage/{filename}"
        }