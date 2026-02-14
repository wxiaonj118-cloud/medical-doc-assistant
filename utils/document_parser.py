"""
Document parsing utilities for medical documents
"""
import os
import PyPDF2
from docx import Document
import pdfplumber
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class DocumentParser:
    """Parse medical documents (PDF/DOCX)"""
    
    def __init__(self):
        self.supported_extensions = {'.pdf', '.docx', '.doc'}
    
    def extract_text(self, file_path: str) -> Tuple[Optional[str], Optional[str]]:
        """Extract text from document"""
        if not os.path.exists(file_path):
            return None, "File not found"
        
        file_ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if file_ext == '.pdf':
                return self._extract_from_pdf(file_path), None
            elif file_ext in ['.docx', '.doc']:
                return self._extract_from_docx(file_path), None
            else:
                return None, f"Unsupported file type: {file_ext}"
                
        except Exception as e:
            logger.error(f"Error extracting text: {e}")
            return None, str(e)
    
    def _extract_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF"""
        text = ""
        
        try:
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            logger.warning(f"PyPDF2 failed: {e}")
            text = ""
        
        if not text.strip():
            try:
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
            except Exception as e:
                logger.error(f"pdfplumber failed: {e}")
        
        return text.strip()
    
    def _extract_from_docx(self, file_path: str) -> str:
        """Extract text from Word document"""
        try:
            doc = Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error reading DOCX: {e}")
            return ""
    
    def detect_language(self, text: str) -> str:
        """Simple language detection: 'zh' or 'en'"""
        if not text:
            return 'en'
        
        # Count Chinese characters
        chinese_chars = sum(1 for char in text if '\u4e00' <= char <= '\u9fff')
        total_chars = len(text)
        
        if total_chars > 0 and (chinese_chars / total_chars) > 0.2:
            return 'zh'
        
        return 'en'