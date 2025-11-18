# app/utils/extract_text.py
from pathlib import Path
from typing import Tuple
import fitz  # PyMuPDF
from docx import Document

def extract_text_docx(path: str) -> Tuple[str, int]:
    doc = Document(path)
    paras = [p.text for p in doc.paragraphs if p.text.strip()]
    text = "\n".join(paras)
    return text, 1  # páginas aprox. (no aplica a docx)

def extract_text_pdf(path: str) -> Tuple[str, int]:
    doc = fitz.open(path)
    pages = []
    for page in doc:
        pages.append(page.get_text("text"))
    text = "\n".join(pages)
    return text, len(pages)

def extract_text(path: str) -> Tuple[str, int, str]:
    ext = Path(path).suffix.lower()
    if ext == ".docx":
        t, n = extract_text_docx(path)
        return t, n, "DOCX"
    elif ext == ".pdf":
        t, n = extract_text_pdf(path)
        return t, n, "PDF"
    else:
        return "", 0, "DESCONOCIDO"
