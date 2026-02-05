import os
from pathlib import Path
from typing import Tuple
import fitz  # PyMuPDF
from docx import Document

# Intentamos cargar la librería para leer .doc viejos (solo funciona en Windows con Word instalado)
try:
    import win32com.client as win32
    import pythoncom
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False
    print("⚠️ AVISO: pywin32 no está instalado. No se podrán leer archivos .doc antiguos.")

def extract_text_docx(path: str) -> Tuple[str, int]:
    """Lee archivos .docx (Word moderno)"""
    try:
        doc = Document(path)
        paras = [p.text for p in doc.paragraphs if p.text.strip()]
        text = "\n".join(paras)
        return text, 1
    except Exception as e:
        print(f"Error leyendo DOCX {path}: {e}")
        return "", 0

def extract_text_pdf(path: str) -> Tuple[str, int]:
    """Lee archivos .pdf"""
    try:
        doc = fitz.open(path)
        pages = []
        for page in doc:
            pages.append(page.get_text("text"))
        text = "\n".join(pages)
        return text, len(pages)
    except Exception as e:
        print(f"Error leyendo PDF {path}: {e}")
        return "", 0

def extract_text_doc(path: str) -> Tuple[str, int]:
    """
    Lee archivos .doc (Word 97-2003) usando la aplicación Microsoft Word instalada.
    """
    if not HAS_WIN32:
        return "", 0

    word = None
    try:
        # Inicializar COM para hilos de FastAPI
        pythoncom.CoInitialize()
        
        # Abrir una instancia de Word invisible
        word = win32.Dispatch("Word.Application")
        word.Visible = False
        
        # Word requiere rutas absolutas (C:\Users\...)
        abs_path = os.path.abspath(path)
        
        # Abrir, leer y cerrar sin guardar
        doc = word.Documents.Open(abs_path)
        text = doc.Range().Text
        doc.Close(SaveChanges=False)
        
        return text, 1
    except Exception as e:
        print(f"Error leyendo DOC nativo {path}: {e}")
        return "", 0
    finally:
        # Aseguramos cerrar Word para no dejar procesos colgados
        if word:
            try:
                word.Quit()
            except:
                pass

def extract_text(path: str) -> Tuple[str, int, str]:
    """Función MAESTRA: decide qué extractor usar según la extensión"""
    ext = Path(path).suffix.lower()
    
    if ext == ".docx":
        t, n = extract_text_docx(path)
        return t, n, "DOCX"
        
    elif ext == ".pdf":
        t, n = extract_text_pdf(path)
        return t, n, "PDF"
        
    elif ext == ".doc":
        # Aquí entra la lógica nueva
        t, n = extract_text_doc(path)
        # Validación extra: si devuelve vacío, avisamos
        if not t:
            print("⚠️ ALERTA: El archivo .doc se leyó vacío. Verifica instalación de Word.")
        return t, n, "DOC"
        
    else:
        return "", 0, "DESCONOCIDO"