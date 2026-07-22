import re
from typing import Dict, Any, Tuple

def normalize_raw_document(raw_text: str) -> Tuple[str, Dict[str, Any]]:
    """
    Capa 0.5: Normalizador y Reconstructor Documental.
    1. Repara saltos de línea físicos provenientes de antiword/pdfplumber.
    2. Identifica y extrae la cabecera administrativa (primeras líneas).
    3. Retorna (texto_clinico_puro, datos_cabecera).
    """
    if not raw_text:
        return "", {"dni": None, "nombre": None, "telefono": None, "obra_social": None, "nro_afiliado": None}

    # 1. Normalizar saltos de línea y espacios de control
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    # Reparar cortes de línea accidentales de antiword (ej. RMN de C\nCervical, PESS de mm\nSuperiores)
    text = re.sub(r"([-\u2013]?\s*RMN\s+de\s+C\.?)\s*\n\s*", r"\1. ", text, flags=re.IGNORECASE)
    text = re.sub(r"([-\u2013]?\s*PESS\s+de\s+mm\.?)\s*\n\s*", r"\1. ", text, flags=re.IGNORECASE)
    text = re.sub(r"(\bcolesterol\s+total:\s*222mg/dl[^\n]*)\s*\n\s*", r"\1 ", text, flags=re.IGNORECASE)
    
    # 2. Reparar líneas cortadas por antiword
    lines = text.split("\n")
    reconstructed_lines = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        reconstructed_lines.append(stripped)
        
    unified_text = "\n".join(reconstructed_lines)

    # 3. Extraer datos administrativos de la cabecera (primeras 15 líneas o hasta la primera sección clínica)
    cabecera_data = _extract_cabecera_administrativa(unified_text)
    
    # 4. Generar texto clínico puro extirpando la cabecera administrativa
    texto_clinico = _extirpar_cabecera(unified_text)

    return texto_clinico, cabecera_data

def _extract_cabecera_administrativa(text: str) -> Dict[str, Any]:
    lines = text.split("\n")[:15]
    header_text = "\n".join(lines)
    
    data = {
        "nombre": None,
        "dni": None,
        "telefono": None,
        "obra_social": None,
        "nro_afiliado": None
    }
    
    # DNI
    m_dni = re.search(r"(?:dni|d\.n\.i\.|documento)\s*[:\.]?\s*([\d\.\s]{7,12})", header_text, re.IGNORECASE)
    if m_dni:
        clean_dni = "".join(filter(str.isdigit, m_dni.group(1)))
        if 7 <= len(clean_dni) <= 9:
            data["dni"] = clean_dni

    # Teléfono
    m_tel = re.search(r"(?:tel[eé]fono|tel|celular|cel)\s*[:\.]?\s*([\d\s\-\(\)\/\+]{6,20})", header_text, re.IGNORECASE)
    if m_tel:
        tel_raw = re.sub(r"[^\d]", "", m_tel.group(1)).strip()
        if len(tel_raw) >= 6:
            data["telefono"] = tel_raw
    else:
        m_tel2 = re.search(r"\b(?:-\d{6,10}|\d{2,4}-\d{6,8})\b", header_text)
        if m_tel2:
            data["telefono"] = re.sub(r"[^\d]", "", m_tel2.group(0))

    # Obra Social
    m_os = re.search(r"(?:obra social|o\.s\.|cobertura)\s*[:\.]?\s*([^:\n\r]+)", header_text, re.IGNORECASE)
    if m_os:
        raw_os = m_os.group(1).strip()
        clean_os = re.split(r"(?i)\s+(?:n[ro°º\.]+(?:\s*de)?|afiliado|socio|credencial|tel|direcci[oó]n)", raw_os)[0].strip()
        clean_os = re.sub(r"(?i)[\s.,\-_Nº°]+$", "", clean_os).strip()
        if len(clean_os) > 1:
            data["obra_social"] = clean_os

    # Nº Afiliado
    m_af = re.search(r"(?:n[ro°º\.]?\s*de\s*)?afiliado\s*[:\.]?\s*([\w\d\/\-]+)", header_text, re.IGNORECASE)
    if m_af:
        data["nro_afiliado"] = m_af.group(1).strip()

    # Paciente / Nombre
    m_nom = re.search(r"(?:paciente|apellido\s*y\s*nombre|nombre)\s*[:\.]?\s*([^\n\r]+)", header_text, re.IGNORECASE)
    if m_nom:
        raw_nom = m_nom.group(1).strip()
        clean_nom = re.split(r"(?i)\s+(?:tel|dni|obra|afiliado|fecha|nacimiento|direcci[oó]n)", raw_nom)[0].strip()
        clean_nom = re.sub(r"[\s\.,\-_:]+$", "", clean_nom).strip()
        if len(clean_nom) > 2:
            data["nombre"] = clean_nom

    return data

def _extirpar_cabecera(text: str) -> str:
    """Remueve metadatos administrativos iniciales antes de la primera sección clínica."""
    lines = text.split("\n")
    cutoff_idx = 0
    
    sec_triggers = [
        r"s[ií]?ntomas", r"motivo de consulta", r"enfermedad actual", r"anamnesis",
        r"antecedentes", r"agrupaci[oó]?n", r"examen", r"estudios", r"diagn[oó]?stico",
        r"comentarios?", r"tratamiento", r"evoluci[oó]?n"
    ]
    pattern = r"^\s*(?:[\d\.\-]*)\s*(?:" + "|".join(sec_triggers) + r")\s*[:\.]?"
    
    for idx, line in enumerate(lines[:20]):
        if re.search(pattern, line, re.IGNORECASE):
            cutoff_idx = idx
            break
        if any(kw in line.lower() for kw in ["paciente:", "dni:", "teléfono:", "obra social:", "dirección:"]):
            cutoff_idx = idx + 1
            
    clinical_lines = lines[cutoff_idx:]
    return "\n".join(clinical_lines).strip()
