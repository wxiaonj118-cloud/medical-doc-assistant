"""
DeepSeek AI integration for medical document analysis
"""
from openai import OpenAI
from typing import Dict
import logging

logger = logging.getLogger(__name__)

class AIAnalyzer:
    """Analyze medical documents using DeepSeek AI"""
    
    def __init__(self, api_key: str, base_url: str = "https://api.deepseek.com", model: str = "deepseek-chat"):
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model
    
    def analyze_medical_text(self, text: str, language: str = "en") -> Dict:
        """Analyze medical text with enhanced clinical analysis"""
        if not text.strip():
            return {"error": "No text provided"}
        
        try:
            # Truncate if too long
            max_length = 8000
            if len(text) > max_length:
                text = text[:max_length] + "... [text truncated]"
            
            # Updated prompts with strict no-formatting rules
            if language == "zh":
                prompt = f"""作为一名医学信息专家，请分析这份医疗文档并提供专业的医学解读：

【文档内容】
{text}

请严格按照以下7个部分的格式进行分析，每个部分用简短的项目符号列出：

1. 📊 **关键数值**
- [项目名称]: [数值] [单位] ([简要解读])
- [项目名称]: [数值] [单位] ([简要解读])
- 其他正常值: [列出正常项目]

2. 🔍 **异常发现与意义**
- 主要异常: [简要描述]
- 异常模式: [具体模式]
- 临床意义: [对健康的具体影响]

3. 🏥 **可能的诊断方向**
- 更符合: [具体诊断]
- 支持: [结果提示什么]
- 排除: [排除了什么]

4. 💊 **当前治疗状态**
- [报告中是否使用相关药物]
- [数值对治疗决策的意义]

5. ⚠️ **紧迫性与随访**
- 紧急发现: [有/无及说明]
- 专科转诊: [需要/不需要及原因]
- 随访时间: [具体间隔和复查项目]

6. ❓ **向医生提问**
- [针对患者情况的5个具体问题]

7. 📋 **建议**
- 生活方式: [具体的饮食、运动建议]
- 监测: [具体检查项目和频率]
- 循证依据: [相关临床指南]

严格要求：
- 只有7个类别标题可以使用**加粗**，内容部分绝对不允许使用任何**加粗**、*斜体*、`代码`等格式
- 每个要点必须以"- "开头，后面直接跟纯文本
- 语言简明扼要，每项2-4个要点
- 直接呈现结果，无需开场白和结束语"""
            else:
                prompt = f"""As a medical information specialist, please analyze this medical document and provide a comprehensive clinical interpretation:

【MEDICAL DOCUMENT】
{text}

Please provide analysis in EXACTLY this format with 7 sections and bullet points:

1. 📊 **Key Values**
- [Test name]: [value] [units] ([brief interpretation])
- [Test name]: [value] [units] ([brief interpretation])
- Other values ([list normal tests]) are normal

2. 🔍 **Abnormalities & Significance**
- Primary abnormality: [brief description]
- Pattern: [specific pattern description]
- Clinical significance: [specific health impact]

3. 🏥 **Possible Diagnosis**
- More consistent with: [specific diagnosis]
- Supports: [what the results indicate]
- Rules out: [what is excluded]

4. 💊 **Current Treatment Status**
- [Whether medication is indicated in the report]
- [What the values mean for treatment decisions]

5. ⚠️ **Urgency & Follow-Up**
- Urgent findings: [yes/no and what]
- Specialist referral: [needed/not needed and why]
- Follow-up timeline: [specific interval and what to repeat]

6. ❓ **Questions to Ask Your Doctor**
- [Question 1 specific to the patient's situation]
- [Question 2 specific to the patient's situation]
- [Question 3 specific to the patient's situation]
- [Question 4 specific to the patient's situation]
- [Question 5 specific to the patient's situation]

7. 📋 **Recommendations**
- Lifestyle: [specific dietary and exercise recommendations]
- Monitoring: [specific tests and intervals]
- Evidence-based: [relevant clinical guidelines]

**IMPORTANT INTERPRETATION GUIDELINES FOR LIPID PANELS:**
When interpreting Non-HDL Cholesterol and LDL-C, pay close attention to patient-specific risk factors mentioned in the document:

- For Non-HDL Cholesterol:
  * General population target: <130 mg/dL
  * For high-risk patients (diabetes + 1 major ASCVD risk factor): target <100 mg/dL (therapeutic option)
  * For patients with CHD or diabetic patients with ≥2 CHD risk factors: LDL-C target <70 mg/dL

- When a value is flagged as elevated, ALWAYS specify WHICH target is being applied
- Example of CORRECT interpretation: "Non-HDL Cholesterol: 125 mg/dL (elevated for high-risk patients - target <100 mg/dL for diabetes with ASCVD risk factors)"
- Example of INCORRECT interpretation: "Non-HDL Cholesterol: 125 mg/dL (elevated, above target of <130 mg/dL)" - this is contradictory because 125 < 130

**CRITICAL FORMATTING RULES - READ CAREFULLY:**
1. ONLY the 7 section titles (1. 📊 **Key Values**, etc.) may have **double asterisks** for bold
2. NEVER use **bold**, *italic*, `code`, or any other markdown formatting in the bullet points
3. Bullet points must start with "- " followed by plain text only - no asterisks, no underscores, no backticks
4. Write medical terms, diagnoses, and values as plain text without any formatting
5. Be concise: 2-4 bullet points per section
6. No introductory sentences, no conclusions, no extra text
7. If data is insufficient, state "Not specified in report" as plain text

Example of CORRECT format (notice plain text in bullet points):
1. 📊 **Key Values**
- LDL-C: 102 mg/dL (above target of <100 mg/dL for high-risk patients)
- Non-HDL-C: 125 mg/dL (elevated for high-risk patients - target <100 mg/dL for diabetes with ASCVD risk factors)
- Other values (HDL, Triglycerides) are normal

Example of INCORRECT format (do NOT do this):
- LDL-C: **102 mg/dL** (above target)  ← NO bold in content
- Non-HDL-C: 125 mg/dL (elevated, above target of <130 mg/dL)  ← Logically incorrect if 125 < 130

Provide a concise, clinically-oriented analysis with absolutely no formatting in the bullet points."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": """You are an experienced clinical information specialist and medical educator. 
Your role is to help patients understand their medical documents by providing professional, evidence-based interpretation.

**STRICT OUTPUT RULE**: ONLY the 7 section titles may have **bold** formatting. All bullet points must be plain text with no asterisks, no bold, no italics, no markdown of any kind.

**CLINICAL ACCURACY RULE**: When interpreting lab values, always ensure logical consistency. Never state that a value is "above target" when it is numerically below that target. If multiple targets exist (general vs. high-risk), clearly specify which target is being applied based on patient risk factors mentioned in the document.

Example:
✅ 1. 📊 **Key Values**  ← bold is OK here
- LDL-C: 102 mg/dL (above target of <100 mg/dL for high-risk patients)  ← plain text only, NO bold
- Non-HDL-C: 125 mg/dL (elevated for high-risk patients - target <100 mg/dL)  ← logically consistent

❌ DO NOT write:
- Non-HDL-C: 125 mg/dL (elevated, above target of <130 mg/dL)  ← logically contradictory
- LDL-C: **102 mg/dL** (above target)  ← NO bold in content

You translate complex medical information into understandable insights while maintaining clinical accuracy.
You always distinguish between confirmed findings and possibilities that need physician evaluation.
You empower patients to have more informed discussions with their doctors."""},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,
                max_tokens=2500
            )
            
            analysis = response.choices[0].message.content
            
            return {
                "success": True,
                "analysis": analysis,
                "language": language,
                "model": self.model,
                "disclaimer": "This analysis is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for medical concerns."
            }
            
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return {
                "success": False,
                "error": f"AI analysis failed: {str(e)}"
            }