"""
DeepSeek AI integration for medical document analysis
"""
from openai import OpenAI
from typing import Dict
import logging
import re

logger = logging.getLogger(__name__)

class AIAnalyzer:
    """Analyze medical documents using DeepSeek AI"""
    
    def __init__(self, api_key: str, base_url: str = "https://api.deepseek.com", model: str = "deepseek-chat"):
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model
    
    def detect_language(self, text: str) -> str:
        """Detect if text contains Chinese characters"""
        # Check for Chinese characters (Unicode range for CJK)
        chinese_pattern = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff\u2f800-\u2fa1f]')
        if chinese_pattern.search(text):
            return "zh"
        return "en"
    
    def analyze_medical_text(self, text: str, language: str = None) -> Dict:
        """Analyze medical text with enhanced clinical analysis - bilingual output"""
        if not text.strip():
            return {"error": "No text provided"}
        
        try:
            # Auto-detect language if not specified (for internal use)
            if language is None:
                language = self.detect_language(text)
                print(f"🌐 Detected document language: {language}")
            
            # Truncate if too long
            max_length = 8000
            if len(text) > max_length:
                text = text[:max_length] + "... [text truncated]"
            
            # Updated prompt for bilingual output
            prompt = f"""As a medical information specialist, please analyze this medical document and provide a comprehensive clinical interpretation:

【MEDICAL DOCUMENT】
{text}

Please provide analysis in EXACTLY this format with 7 sections and bullet points, with EACH LINE in BOTH English and Chinese (English first, then Chinese on the same line):

1. 📊 **Key Values / 关键数值**
- [Test name]: [value] [units] ([brief interpretation]) / [项目名称]: [数值] [单位] ([简要解读])
- [Test name]: [value] [units] ([brief interpretation]) / [项目名称]: [数值] [单位] ([简要解读])
- Other values ([list normal tests]) are normal / 其他正常值: [列出正常项目]

2. 🔍 **Abnormalities & Significance / 异常发现与意义**
- Primary abnormality: [brief description] / 主要异常: [简要描述]
- Pattern: [specific pattern description] / 异常模式: [具体模式]
- Clinical significance: [specific health impact] / 临床意义: [对健康的具体影响]

3. 🏥 **Possible Diagnosis / 可能的诊断方向**
- More consistent with: [specific diagnosis] / 更符合: [具体诊断]
- Supports: [what the results indicate] / 支持: [结果提示什么]
- Rules out: [what is excluded] / 排除: [排除了什么]

4. 💊 **Current Treatment Status / 当前治疗状态**
- [Whether medication is indicated in the report] / [报告中是否使用相关药物]
- [What the values mean for treatment decisions] / [数值对治疗决策的意义]

5. ⚠️ **Urgency & Follow-Up / 紧迫性与随访**
- Urgent findings: [yes/no and what] / 紧急发现: [有/无及说明]
- Specialist referral: [needed/not needed and why] / 专科转诊: [需要/不需要及原因]
- Follow-up timeline: [specific interval and what to repeat] / 随访时间: [具体间隔和复查项目]

6. ❓ **Questions to Ask Your Doctor / 向医生提问**
- [Question 1] / [问题1]
- [Question 2] / [问题2]
- [Question 3] / [问题3]
- [Question 4] / [问题4]
- [Question 5] / [问题5]

7. 📋 **Recommendations / 建议**
- Lifestyle: [specific recommendations] / 生活方式: [具体的饮食、运动建议]
- Monitoring: [specific tests and intervals] / 监测: [具体检查项目和频率]
- Evidence-based: [relevant clinical guidelines] / 循证依据: [相关临床指南]

**IMPORTANT INTERPRETATION GUIDELINES FOR LIPID PANELS:**
When interpreting Non-HDL Cholesterol and LDL-C, pay close attention to patient-specific risk factors mentioned in the document:

- For Non-HDL Cholesterol:
  * General population target: <130 mg/dL
  * For high-risk patients (diabetes + 1 major ASCVD risk factor): target <100 mg/dL (therapeutic option)
  * For patients with CHD or diabetic patients with ≥2 CHD risk factors: LDL-C target <70 mg/dL

- When a value is flagged as elevated, ALWAYS specify WHICH target is being applied
- Example of CORRECT interpretation: "Non-HDL Cholesterol: 125 mg/dL (elevated for high-risk patients - target <100 mg/dL for diabetes with ASCVD risk factors)" / "非高密度脂蛋白胆固醇: 125 mg/dL (对高风险患者而言偏高 - 对于伴有ASCVD危险因素的糖尿病患者，目标值应<100 mg/dL)"

**CRITICAL FORMATTING RULES - READ CAREFULLY:**
1. ONLY the 7 section titles may have **double asterisks** for bold
2. For ALL bullet points, you MUST write BOTH English and Chinese versions separated by " / "
3. Bullet points must start with "- " followed by plain text only - no asterisks, no underscores, no backticks
4. Write medical terms, diagnoses, and values as plain text without any formatting
5. Be concise: 2-4 bullet points per section
6. No introductory sentences, no conclusions, no extra text
7. If data is insufficient, state "Not specified in report" / "报告中未说明" as plain text

Provide a concise, clinically-oriented bilingual analysis with absolutely no formatting in the bullet points."""
            
            # System message for bilingual output
            system_content = """You are an experienced clinical information specialist and medical educator. 
Your role is to help patients understand their medical documents by providing professional, evidence-based interpretation.

**STRICT OUTPUT RULE**: 
1. ONLY the 7 section titles may have **bold** formatting
2. ALL bullet points must contain BOTH English and Chinese versions, separated by " / "
3. English must come FIRST, followed by Chinese
4. All bullet point text must be plain with no asterisks, no bold, no italics, no markdown of any kind

**CLINICAL ACCURACY RULE**: When interpreting lab values, always ensure logical consistency. Never state that a value is "above target" when it is numerically below that target. If multiple targets exist (general vs. high-risk), clearly specify which target is being applied based on patient risk factors mentioned in the document.

**LANGUAGE RULE**: You MUST provide EVERY line of analysis in BOTH English and Chinese, with English first and Chinese after the " / " separator."""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,
                max_tokens=3500  # Increased token limit for bilingual content
            )
            
            analysis = response.choices[0].message.content
            
            return {
                "success": True,
                "analysis": analysis,
                "language": "bilingual",  # Changed to indicate bilingual output
                "model": self.model,
                "disclaimer": "此分析仅供信息参考，不能替代专业医疗建议、诊断或治疗。如有医疗问题，请务必咨询合格的医疗保健提供者。" + 
                             " This analysis is for informational purposes only and is not a substitute for professional medical advice, " +
                             "diagnosis, or treatment. Always consult with a qualified healthcare provider for medical concerns."
            }
            
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return {
                "success": False,
                "error": f"AI analysis failed: {str(e)}"
            }