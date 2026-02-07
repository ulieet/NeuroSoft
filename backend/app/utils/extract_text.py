# backend/app/utils/extract_text.py

import os
import subprocess
import logging
from docx import Document
import pdfplumber

# Configurar logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_text(file_path: str):
    """
    Extractor universal que decide qué herramienta usar según la extensión.
    Retorna: (texto_extraido, numero_de_paginas, tipo_de_archivo)
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".pdf":
        return _extract_from_pdf(file_path)
    elif ext == ".docx":
        return _extract_from_docx(file_path)
    elif ext == ".doc":
        return _extract_from_doc_antiword(file_path)
    elif ext == ".txt":
        return _extract_from_txt(file_path)
    else:
        return "", 0, "Desconocido"

def _extract_from_pdf(file_path: str):
    text = ""
    pages = 0
    try:
        with pdfplumber.open(file_path) as pdf:
            pages = len(pdf.pages)
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text, pages, "PDF"
    except Exception as e:
        logger.error(f"Error leyendo PDF {file_path}: {e}")
        return "", 0, "Error PDF"

def _extract_from_docx(file_path: str):
    text = ""
    try:
        doc = Document(file_path)
        # Extraer párrafos
        full_text = [para.text for para in doc.paragraphs]
        text = "\n".join(full_text)
        # Estimación aproximada de páginas (Word no guarda paginación fija en el XML)
        pages = max(1, len(text) // 3000) 
        return text, pages, "DOCX"
    except Exception as e:
        logger.error(f"Error leyendo DOCX {file_path}: {e}")
        return "", 0, "Error DOCX"

def _extract_from_doc_antiword(file_path: str):
    """
    Usa 'antiword' vía subprocess. Requiere tener 'antiword' instalado.
    Corrección: Maneja la decodificación manualmente para evitar crash en Windows (cp1252).
    """
    try:
        # IMPORTANTE: Quitamos text=True para recibir bytes crudos y evitar el UnicodeDecodeError automático
        result = subprocess.run(
            ['antiword', '-w', '0', file_path], 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE
        )
        
        if result.returncode != 0:
            err_msg = result.stderr.decode('utf-8', errors='ignore')
            logger.error(f"Antiword falló: {err_msg}")
            return "", 0, "Error DOC (Antiword)"
            
        # Decodificamos manualmente ignorando caracteres ilegales
        text = result.stdout.decode('utf-8', errors='ignore')
        
        # Si utf-8 falla (devuelve vacío), intentamos latin-1
        if not text.strip():
             text = result.stdout.decode('latin-1', errors='ignore')

        pages = max(1, len(text) // 3000)
        return text, pages, "DOC (Legacy)"
        
    except FileNotFoundError:
        logger.error("Error: 'antiword' no está instalado o no está en el PATH.")
        return "Error: Falta instalar antiword en el sistema.", 0, "Error Config"
    except Exception as e:
        logger.error(f"Error genérico leyendo DOC {file_path}: {e}")
        return "", 0, "Error DOC"

def _extract_from_txt(file_path: str):
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()
        return text, 1, "TXT"
    except Exception as e:
        return "", 0, "Error TXT"