import os
import sys
import re
import subprocess

# Ensure ReportLab is installed
try:
    import reportlab
except ImportError:
    print("ReportLab not found. Auto-installing reportlab via pip...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "reportlab"])

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to add professional header and footer with total page count.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#4B5563"))
        
        # Header (Only on page 2 onwards)
        if self._pageNumber > 1:
            self.drawString(54, 11 * inch - 36, "Blood Bank Management System — Senior Technical & AI Interview Study Guide")
            self.setStrokeColor(colors.HexColor("#E5E7EB"))
            self.setLineWidth(0.5)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)
        
        # Footer
        self.setStrokeColor(colors.HexColor("#E5E7EB"))
        self.setLineWidth(0.5)
        self.line(54, 45, 8.5 * inch - 54, 45)
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 32, page_str)
        self.drawString(54, 32, "CONFIDENTIAL — Technical Interview Preparation Suite (Senior Software Engineer & AI)")
        self.restoreState()

def clean_inline_formatting(text):
    """
    Converts markdown inline formatting to ReportLab XML/HTML compatible tags safely.
    """
    # 1. Extract and protect inline code spans first
    code_spans = []
    def save_code(match):
        code_text = match.group(1)
        code_text = code_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        code_spans.append(code_text)
        return f"__CODE_SPAN_{len(code_spans)-1}__"
    
    text = re.sub(r'`([^`]+)`', save_code, text)
    
    # 2. Escape remaining XML characters
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    
    # 3. Bold: **text** or __text__
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__(.*?)__', r'<b>\1</b>', text)
    
    # 4. Italic: *text* (avoid single underscores inside words like send_otp)
    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
    text = re.sub(r'(?:^|\s)_([^_]+)_(?:\s|$)', r' <i>\1</i> ', text)
    
    # 5. Restore protected code spans
    for idx, code_text in enumerate(code_spans):
        text = text.replace(f"__CODE_SPAN_{idx}__", f'<font face="Courier" color="#DC2626"><b>{code_text}</b></font>')
        
    return text.strip()

def build_pdf():
    brain_dir = r"C:\Users\Surendra Singh\.gemini\antigravity-ide\brain\5468b8ca-8620-48b1-9fbf-28bd10878642"
    file1 = os.path.join(brain_dir, "interview_study_guide.md")
    file2 = os.path.join(brain_dir, "interview_study_guide_part2.md")
    output_pdf = "Blood_Bank_Project_Interview_Preparation.pdf"

    if not os.path.exists(file1) or not os.path.exists(file2):
        print(f"Error: Missing input files in {brain_dir}")
        return

    with open(file1, "r", encoding="utf-8") as f:
        content1 = f.read()
    with open(file2, "r", encoding="utf-8") as f:
        content2 = f.read()

    full_content = content1 + "\n\n<PAGEBREAK>\n\n" + content2

    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=letter,
        leftMargin=54, rightMargin=54,
        topMargin=54, bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=colors.HexColor('#DC2626'), # Crimson Red
        alignment=1, # Centered
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor('#374151'),
        alignment=1,
        spaceAfter=30
    )

    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1E3A8A'), # Navy Blue
        spaceBefore=20,
        spaceAfter=10,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#B91C1C'), # Red
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'CustomH3',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#111827'),
        spaceBefore=12,
        spaceAfter=4,
        keepWithNext=True
    )

    q_style = ParagraphStyle(
        'QuestionStyle',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#991B1B'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#1F2937'),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#1F2937'),
        leftIndent=15,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1F2937'),
        backColor=colors.HexColor('#F3F4F6'),
        borderColor=colors.HexColor('#E5E7EB'),
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=6,
        spaceAfter=8
    )

    story = []
    
    # Cover / Header Title
    story.append(Paragraph("Blood Bank & Donor Management System", title_style))
    story.append(Paragraph("Senior Software Engineer & AI Technical Interview Preparation Suite<br/><b>End-to-End Codebase Analysis, Q&amp;As, Architecture &amp; System Design</b>", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#DC2626'), spaceAfter=20))

    lines = full_content.split('\n')
    in_code_block = False
    code_buffer = []

    i = 0
    while i < len(lines):
        line = lines[i]

        if line.strip() == "<PAGEBREAK>":
            story.append(PageBreak())
            i += 1
            continue

        # Handle Code Blocks
        if line.strip().startswith("```"):
            if not in_code_block:
                in_code_block = True
                code_buffer = []
            else:
                in_code_block = False
                code_text = "\n".join(code_buffer)
                code_text = code_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                code_text = code_text.replace("\n", "<br/>")
                story.append(Paragraph(code_text, code_style))
            i += 1
            continue

        if in_code_block:
            code_buffer.append(line)
            i += 1
            continue

        # Skip horizontal rules or plain spaces
        if line.strip() == "---" or not line.strip():
            story.append(Spacer(1, 4))
            i += 1
            continue

        # Headings
        if line.startswith("# "):
            text = clean_inline_formatting(line[2:].strip())
            story.append(Spacer(1, 10))
            story.append(Paragraph(text, h1_style))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1E3A8A'), spaceAfter=8))
            i += 1
            continue

        if line.startswith("## "):
            text = clean_inline_formatting(line[3:].strip())
            story.append(Spacer(1, 8))
            story.append(Paragraph(text, h2_style))
            i += 1
            continue

        if line.startswith("### "):
            text = clean_inline_formatting(line[4:].strip())
            story.append(Paragraph(text, h3_style))
            i += 1
            continue

        if line.startswith("#### Q") or line.startswith("#### "):
            text = clean_inline_formatting(line[5:].strip())
            story.append(Spacer(1, 6))
            story.append(Paragraph(f"<b>{text}</b>", q_style))
            i += 1
            continue

        # Bullet points
        if line.strip().startswith("- ") or line.strip().startswith("* "):
            text = clean_inline_formatting(line.strip()[2:].strip())
            story.append(Paragraph(f"&bull; {text}", bullet_style))
            i += 1
            continue

        # Numbered lists (e.g. 1. )
        match_num = re.match(r'^(\d+\.)\s+(.*)', line.strip())
        if match_num:
            num_prefix = match_num.group(1)
            text = clean_inline_formatting(match_num.group(2))
            story.append(Paragraph(f"<b>{num_prefix}</b> {text}", bullet_style))
            i += 1
            continue

        # Default Paragraph
        text = clean_inline_formatting(line.strip())
        story.append(Paragraph(text, body_style))
        i += 1

    print(f"Building {output_pdf} using ReportLab...")
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Successfully generated {output_pdf} in {os.path.abspath(output_pdf)}")

if __name__ == "__main__":
    build_pdf()
