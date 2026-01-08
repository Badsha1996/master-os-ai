import os
import logging
import win32com.client 

logger = logging.getLogger("tools")

def create_word_and_pdf(content_and_filename: str) -> str:
    try:
        import winshell
        import json
        desktop = winshell.desktop()
        
        if content_and_filename.startswith('{'):
            try:
                data = json.loads(content_and_filename)
                text_content = "\n\n".join([str(v) for v in data.values()])
                raw_filename = "AI_Document"
            except:
                text_content = content_and_filename
                raw_filename = "AI_Document"
        elif "|" in content_and_filename:
            parts = content_and_filename.split("|")
            text_content = parts[0].strip()
            raw_filename = parts[1].strip()
        else:
            text_content = content_and_filename
            raw_filename = "AI_Document"

        pdf_path = os.path.join(desktop, f"{raw_filename}.pdf")
        
        logger.info("Starting Word Application...")
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = True  

        doc = word.Documents.Add()
        
        word.Selection.Style = word.ActiveDocument.Styles("Heading 1")
        word.Selection.TypeText(f"Topic: {raw_filename}\n")
        word.Selection.TypeParagraph()
        
        word.Selection.Style = word.ActiveDocument.Styles("Normal")
        word.Selection.TypeText(text_content)

        doc.SaveAs2(pdf_path, FileFormat=17)
        
        doc.Close(SaveChanges=False) 
        word.Quit() 
        
        return f"✅ Success! PDF saved to: {pdf_path}"

    except Exception as e:
        logger.error(f"Word automation failed: {e}")
        return f"❌ Failed to create PDF: {e}"