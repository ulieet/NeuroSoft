from typing import Dict, Any, List, Optional
import re
import os
from app.utils.extract_text import extract_text
from app.utils.document_normalizer import normalize_raw_document
from app.utils.normalize import (
    to_float, normalize_fecha, normalize_mes_texto, norm_forma
)
from app.utils import patterns as P

# Cargar .env manualmente si existe para configuración local
def _cargar_env():
    directorios = [".", "backend", "..", "backend/.."]
    for d in directorios:
        env_path = os.path.join(d, ".env")
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            k, v = line.split("=", 1)
                            os.environ[k.strip()] = v.strip().strip('"').strip("'")
            except Exception:
                pass

_cargar_env()

def _clean_text(text: str) -> str:
    t = text.replace('\x0c', '\n').replace('\r\n', '\n').replace('\r', '\n')
    t = re.sub(r'([-\u2013]?\s*RMN\s+de\s+C\.?)\s*\n\s*(?:Cervical\s+y\s+Cerebro\s*)?', 'RMN Cervical y Cerebro ', t, flags=re.IGNORECASE)
    t = re.sub(r'([-\u2013]?\s*PESS\s+de\s+mm\.?)\s*\n\s*', r'\1 ', t, flags=re.IGNORECASE)
    t = re.sub(r'(222mg/dl[^\n]*)\s*\n\s*', r'\1 ', t, flags=re.IGNORECASE)
    t = re.sub(r'\.-\s*', '.\n', t)
    t = re.sub(r'[|]', ' ', t) 
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in t.split('\n')]
    return '\n'.join(lines)

def _get_logical_lines(text: str) -> List[str]:
    return re.split(r'\n|\.\s+(?=[A-Z"\(])', text)

def _extraer_seccion_inteligente(text: str, headers_inicio: List[str], headers_fin: List[str]) -> str:
    lines = _get_logical_lines(text)
    bloque = []
    capturando = False
    
    patron_inicio = r"(?:^|\s)(" + "|".join(headers_inicio) + r")\b[:\.\-]*"
    
    titulos_fuertes = [
        r"diagn[oó]?sticos?", r"tratamiento", r"plan", r"s[ií]?ntomas", r"motivo", r"enfermedad\s+actual",
        r"antecedentes", r"agrupaci[oó]?n\s+sindr[oó]?mica", r"examen f[ií]?sico", r"examen neurol[oó]?gico",
        r"estudios", r"rmn", r"laboratorio", r"conclusi[oó]?n", r"bibliograf[ií]?a", r"firma", r"dr\.", 
        r"comentarios?", r"rasgos semiol[oó]?gicos", r"evoluci[oó]?n", r"solicito"
    ]

    for linea in lines:
        low = linea.lower().strip()
        if not low: continue
        
        if not capturando:
            if re.search(patron_inicio, low):
                capturando = True
                content = re.sub(patron_inicio, "", linea, count=1, flags=re.IGNORECASE).strip()
                content = re.sub(r"^[:\-\.]+\s*", "", content)
                if content: bloque.append(content)
                continue
        
        if capturando:
            if any(re.search(r"\b" + fin + r"\b", low) for fin in headers_fin):
                break
            
            es_titulo_nuevo = any(re.search(r"(?:^|\s)" + t + r"\b[:\.\-]?", low) for t in titulos_fuertes)
            es_mismo_tipo = any(re.search(ini, low) for ini in headers_inicio)
            
            if es_titulo_nuevo and not es_mismo_tipo:
                if len(linea) < 50 or ":" in linea:
                    break

            bloque.append(linea.strip())
            
    return "\n".join(bloque).strip()

def _find_fecha(text: str):
    m = P.RE_FECHA_TXT.search(text)
    if m:
        d, mes_txt, y = m.groups()
        mes = normalize_mes_texto(mes_txt)
        return normalize_fecha(d, mes, y) if mes else None
    m = P.RE_FECHA_NUM.search(text)
    if m:
        d, mo, y = m.groups()
        return normalize_fecha(d, mo, y)
    m = P.RE_MES_ANO.search(text)
    if m:
        mes_txt, y = m.groups()
        mes = normalize_mes_texto(mes_txt)
        return normalize_fecha(1, mes, y) if mes else None
    return None

# --- DATOS PACIENTE ---

def _extract_paciente_nombre(text: str) -> Optional[str]:
    lineas = _get_logical_lines(text)
    patterns = [
        r"(?:paciente|nombre y apellido|apellido y nombre|nombre)\s*[:\.]?\s*(.+)$",
        r"(?:sr\.|sra\.)\s*(.+)$"
    ]
    for linea in lineas[:30]: 
        l = linea.strip()
        for pat in patterns:
            m = re.search(pat, l, flags=re.IGNORECASE)
            if m:
                raw_name = m.group(1).strip()
                cortar_en = re.split(r"\s+(?:-?\s*Edad|DNI|Fecha|HC|H\.C\.|OS|Obra\s+Social|Tel[eé]fono|Tel|Celular)\b", raw_name, flags=re.IGNORECASE)
                name = cortar_en[0].strip()
                clean_name = re.sub(r"[\d\.:\-\(\)]", "", name).strip()
                if len(clean_name) > 3:
                    return clean_name.strip(" ,.-")

    for i, linea in enumerate(lineas[:10]):
        l = linea.strip()
        if not l: continue
        if any(x in l.lower() for x in ["fecha", "informe", "historia", "neurología", "consultorio", "la plata", "buenos aires", "atención", "diagnóstico", "tratamiento"]):
            continue
        if 5 < len(l) < 40 and not re.search(r"\d", l):
            if l.lower() in ["motivo de consulta", "enfermedad actual", "antecedentes"]:
                continue
            return l
    return "Paciente Desconocido"

# ESTA ES LA FUNCIÓN QUE CORREGIMOS PARA QUE ENCUENTRE EL DNI
def _extract_dni(text: str) -> Optional[str]:
    lineas = _get_logical_lines(text)
    
    # Patrones más agresivos para encontrar el DNI en cualquier parte
    patterns = [
        r"DNI\s*[:\.\-]?\s*(\d{1,2}[\.,]?\d{3}[\.,]?\d{3})", # DNI explícito (ej: 29.371.624)
        r"(?:Documento|Doc)\s*[:\.\-]?\s*([\d\.]+(?:\s*\d)?)",
        r"(?:HC|H\.C\.|Historia Cl[ií]nica)\s*[:\.\-]?\s*([\d\.]+)",
        r"\bDNI\b.*?(\d{7,8})" # DNI mencionado en medio de texto
    ]
    
    for linea in lineas[:60]: # Buscamos en las primeras 60 líneas
        for pat in patterns:
            m = re.search(pat, linea, flags=re.IGNORECASE)
            if m:
                dni_limpio = re.sub(r"[^\d]", "", m.group(1))
                if 6 <= len(dni_limpio) <= 8:
                    return dni_limpio
    return None

def _clean_section_content(raw_content: str) -> str:
    """Elimina metadatos administrativos de cabecera y subtítulos internos sobrantes de los bloques clínicos."""
    if not raw_content:
        return ""
    
    cleaned = raw_content
    # 1. Remover patrones de teléfono explícitos (e.g. Teléfono: 482-9468)
    cleaned = re.sub(r"(?i)\b(?:tel[eé]fono|tel|celular|cel)\s*[:\.]?\s*[\d\s\-\(\)\/\+]+", "", cleaned)
    
    # 2. Remover cabeceras y subtítulos de sección sobrantes (e.g. principales:, personales:, según refiere:)
    cleaned = re.sub(r"^(?:[\d\s/\.:\-]*)(?:s[ií]?ntomas|motivo de consulta|enfermedad actual|anamnesis|antecedentes|antecedentes personales|antecedentes familiares|agrupaci[oó]?n sindr[oó]?mica|examen f[ií]?sico|evoluci[oó]?n|comentarios?|observaciones|principales|personales|familiares|seg[uú]n refiere)?\s*[:\.\-/]*\s*", "", cleaned, flags=re.IGNORECASE)
    
    lines = []
    for line in cleaned.split("\n"):
        stripped = line.strip()
        # Limpiar prefijos de subtítulo interno al inicio de línea
        stripped = re.sub(r"^(?:principales|personales|familiares|seg[uú]n refiere)\s*[:\.\-/]*\s*", "", stripped, flags=re.IGNORECASE)
        if stripped:
            lines.append(stripped)
            
    return "\n".join(lines).strip()

def _extract_datos_extra_paciente(text: str) -> Dict[str, Optional[str]]:
    data = {"fecha_nacimiento": None, "obra_social": None, "nro_afiliado": None, "telefono": None}
    
    m_fn = re.search(r"(?:nacimiento|f\. nac|nac)\s*[:\.\-]?\s*([\d]{1,2}[/\-][\d]{1,2}[/\-][\d]{2,4})", text, re.IGNORECASE)
    if m_fn:
        try:
            partes = re.split(r"[/\-]", m_fn.group(1))
            if len(partes) == 3:
                d, m, y = partes
                data["fecha_nacimiento"] = normalize_fecha(d, m, y)
        except: pass
        
    m_os = re.search(r"(?:obra social|o\.s\.|cobertura)\s*[:\.]\s*([^:\n\r]+)", text, re.IGNORECASE)
    if m_os:
        raw = m_os.group(1).strip()
        clean = re.split(r"(?i)\s+(?:n[ro°º\.]+(?:\s*de)?|afiliado|socio|credencial|beneficiario|plan|tel|direcci[oó]n)", raw)[0].strip()
        clean = re.sub(r"(?i)[\s.,\-_Nº°]+$", "", clean).strip()
        if len(clean) > 1:
            data["obra_social"] = clean

    m_af = re.search(r"(?:n[ro°º\.]?\s*de\s*)?afiliado\s*[:\.]?\s*([\w\d\/\-]+)", text, re.IGNORECASE)
    if m_af:
        data["nro_afiliado"] = m_af.group(1).strip()

    m_tel = re.search(r"(?:tel[eé]fono|tel|celular|cel)\s*[:\.]?\s*([\d\s\-\(\)\/\+]{6,20})", text, re.IGNORECASE)
    if m_tel:
        tel_raw = re.sub(r"[^\d]", "", m_tel.group(1)).strip()
        if len(tel_raw) >= 6:
            data["telefono"] = tel_raw
    else:
        m_tel2 = re.search(r"\b(?:-\d{6,10}|\d{2,4}-\d{6,8})\b", text)
        if m_tel2:
            data["telefono"] = re.sub(r"[^\d]", "", m_tel2.group(0))
        
    return data

# --- TRATAMIENTOS ---

def _extract_tratamientos_bloque(text: str) -> List[Dict[str, Any]]:
    best_matches = {} 
    lines = _get_logical_lines(text)
    seccion_actual = ""

    farmacos_patterns = [
        (r"Interfer[oó]?n\s*beta[\s\-]*1a", "Interferón Beta-1a"),
        (r"Rebif", "Interferón Beta-1a"),
        (r"Blastofer[oó]?n", "Interferón Beta-1a"),
        (r"Interfer[oó]?n\s*beta[\s\-]*1b", "Interferón Beta-1b"),
        (r"Interfer[oó]?n", "Interferón"), 
        (r"Glatiramer", "Acetato de Glatiramer"), 
        (r"Copol[ií]?mero", "Acetato de Glatiramer"),
        (r"Copaxone", "Acetato de Glatiramer"),
        (r"Fingolimod", "Fingolimod"), 
        (r"Gilenya", "Fingolimod"),
        (r"Fibroneurina", "Fingolimod"), 
        (r"Natalizumab", "Natalizumab"), 
        (r"Tysabri", "Natalizumab"),
        (r"Ocrelizumab", "Ocrelizumab"), 
        (r"Ocrevus", "Ocrelizumab"),
        (r"Rituximab", "Rituximab"), 
        (r"Teriflunomida", "Teriflunomida"), 
        (r"Aubagio", "Teriflunomida"),
        (r"Dimetil", "Dimetil Fumarato"), 
        (r"Tecfidera", "Dimetil Fumarato"),
        (r"Dimeful", "Dimetil Fumarato"),
        (r"Lemtrada", "Alemtuzumab"), 
        (r"Alemtuzumab", "Alemtuzumab"),
        (r"Mavenclad", "Cladribina"), 
        (r"Cladribina", "Cladribina"),
        (r"Siponimod", "Siponimod"),
        (r"Ozanimod", "Ozanimod"),
        (r"Pregabalina", "Pregabalina"),
        (r"Gabapentin", "Gabapentina"),
        (r"Baclofeno", "Baclofeno"),
        (r"Fampiridina", "Fampiridina"),
        (r"Datizic", "Fampiridina"),
        (r"Fampyra", "Fampiridina"),
        (r"4-?Aminopiridina", "Fampiridina"),
        (r"\b4-?AP\b", "Fampiridina"),
        (r"Kinesiolog[ií]?a", "Kinesiología"),
        (r"Terapia\s*Ocupacional", "Terapia Ocupacional"),
        (r"Acompañante\s*Terap[eé]utico", "Acompañante Terapéutico"),
        (r"Cuidador", "Acompañante Terapéutico")
    ]
    
    for i, linea in enumerate(lines):
        low = linea.lower()
        if any(sec in low for sec in ["comentario", "discusión", "observaciones", "bibliografía", "referencias", "solicito"]):
            continue

        for patron, nombre_mol in farmacos_patterns:
            if re.search(patron, linea, re.IGNORECASE):
                dosis = None
                m_dosis = re.search(r"(\d+[\.,]?\d*)\s*(mg|mcg|µg|gr?|ml|ui)", linea, re.IGNORECASE)
                if m_dosis: dosis = f"{m_dosis.group(1)} {m_dosis.group(2)}"
                
                frecuencia = None
                if "dia" in low or "diario" in low: frecuencia = "Diario"
                elif "mes" in low or "mensual" in low: frecuencia = "Mensual"
                elif "semana" in low: frecuencia = "Semanal"

                estado = "Activo"
                fin = None
                motivo = None
                
                if any(neg in low for neg in ["hasta", "suspende", "suspendió", "previo", "rotar", "discontinuar", "anterior", "inicialmente"]):
                    if not any(act in low for act in ["hasta la fecha", "actualmente", "en curso"]):
                        estado = "Suspendido"
                        m_hasta = re.search(r"hasta\s+([^\s\.,;]+(?:\s+de\s+[^\s\.,;]+)?)", low)
                        if m_hasta:
                            fin = _find_fecha(m_hasta.group(1))

                m_motivo = re.search(r"(?:motivo|por|debido a|causa)\s*[:\.]?\s*([^,\.\n]+)", low)
                if m_motivo and estado == "Suspendido":
                    motivo = m_motivo.group(1).strip()

                fecha_inicio = _find_fecha(linea)
                
                if nombre_mol not in best_matches:
                    best_matches[nombre_mol] = {
                        "molecula": nombre_mol, "droga": nombre_mol,
                        "dosis": dosis, "frecuencia": frecuencia,
                        "estado": estado, "inicio": fecha_inicio,
                        "fin": fin, "motivo_suspension": motivo
                    }
                else:
                    current = best_matches[nombre_mol]
                    best_matches[nombre_mol].update({
                        "dosis": dosis or current["dosis"],
                        "frecuencia": frecuencia or current["frecuencia"],
                        "estado": estado,
                        "inicio": fecha_inicio or current["inicio"],
                        "fin": fin or current.get("fin"),
                        "motivo_suspension": motivo or current.get("motivo_suspension")
                    })

    return list(best_matches.values())

def _extract_diagnostico_bloque(text: str) -> Dict[str, Any]:
    res = {"diagnostico": None, "codigo": None, "diagnosticos_diferenciales": []}
    
    # 1. Detectar código CIE-10 o presencia de EM / G35 / 340 / EMRR / EMSP / EMPP
    has_g35 = bool(re.search(r"\b(?:G35|340|EMRR|EMSP|EMPP|EM[\s\-]*RR|EM[\s\-]*SP|EM[\s\-]*PP|\bEM\b)\b", text, re.IGNORECASE))
    if has_g35:
        res["codigo"] = "G35"
        res["diagnostico"] = "Esclerosis Múltiple"

    # 2. Diagnóstico principal explícito si no era EM o si trae etiqueta Diagnóstico:
    m_dx = re.search(r"(?:diagn[oó]?stico(?:\s+principal)?|imp\.?\s*diag\.?)\s*[:\.]\s*([^\.\n\r]+)", text, re.IGNORECASE)
    if m_dx:
        raw_dx = m_dx.group(1).strip()
        if not any(w in raw_dx.lower() for w in ["déficit", "onda", "potencial", "rmn", "lcr", "análisis", "excesivo", "estudio"]):
            if re.search(r"esclerosis m[uú]?ltiple", raw_dx, re.IGNORECASE):
                res["diagnostico"] = "Esclerosis Múltiple"
            elif not res["diagnostico"]:
                res["diagnostico"] = raw_dx

    # 3. Fallback de descarte directo de enfermedades
    if not res["diagnostico"]:
        if re.search(r"\besclerosis\s+m[uú]?ltiple\b", text, re.IGNORECASE):
            res["diagnostico"] = "Esclerosis Múltiple"
            res["codigo"] = "G35"
        elif re.search(r"\bs[ií]ndrome\s+cl[ií]nico\s+aislado\b|\bcis\b", text, re.IGNORECASE):
            res["diagnostico"] = "Síndrome Clínico Aislado (CIS)"

    # 4. Diagnósticos Diferenciales / Presuntivos
    raw_dif = _extraer_seccion_inteligente(text, [r"diagn[oó]?sticos?\s+(?:presuntivos?[/\s]*diferenciales?|diferenciales?|presuntivos?)", r"en\s+estudio\s+para\s+descartar", r"descarte\s+de"], [r"comentarios?", r"tratamiento", r"estudios", r"evoluci[oó]?n", r"atte"])
    if raw_dif:
        lines = [line.strip() for line in raw_dif.split("\n") if line.strip()]
        difs = []
        for line in lines:
            if any(w in line.lower() for w in ["proceso en estudio", "diagnósticos presuntivos"]):
                continue
            clean_it = re.sub(r"^\s*-\s*", "", line).strip()
            clean_it = re.sub(r"[\?;\.\,\s\-]+$", "", clean_it).strip()
            if len(clean_it) > 2:
                difs.append(clean_it)
        res["diagnosticos_diferenciales"] = difs
        
    return res

def _extract_sintomas_bloque(text: str) -> str:
    raw = _extraer_seccion_inteligente(text, [r"s[ií]?ntomas", r"motivo de consulta", r"enfermedad actual", r"anamnesis"], [r"antecedentes", r"examen", r"estudios", r"laboratorio", r"rasgos", r"evoluci[oó]?n", r"diagn[oó]?stico"])
    return _clean_section_content(raw)

def _extract_antecedentes_bloque(text: str) -> Dict[str, str]:
    raw = _extraer_seccion_inteligente(text, [r"antecedentes", r"historia personal", r"app"], [r"s[ií]?ntomas", r"enfermedad actual", r"agrupaci[oó]?n", r"examen", r"evoluci[oó]?n", r"estudios"])
    cleaned = _clean_section_content(raw)
    
    pers = []
    fam = []
    in_fam = False
    
    for line in cleaned.split("\n"):
        low = line.lower().strip()
        if "antecedentes familiares" in low or low.startswith("familiares"):
            in_fam = True
            clean_line = re.sub(r"^(?:antecedentes\s+familiares|familiares)\s*[:\.\-,]*\s*", "", line, flags=re.IGNORECASE).strip()
            if clean_line: fam.append(clean_line)
            continue
        if in_fam:
            fam.append(line.strip())
        else:
            pers.append(line.strip())
            
    return {
        "antecedentes_personales": "\n".join(pers).strip(),
        "antecedentes_familiares": "\n".join(fam).strip()
    }

def _extract_examen_fisico_bloque(text: str) -> str:
    raw = _extraer_seccion_inteligente(text, [r"examen f[ií]?sico", r"examen neurol[oó]?gico", r"rasgos semiol[oó]?gicos"], [r"estudios", r"rmn", r"diagn[oó]?stico", r"plan", r"evoluci[oó]?n"])
    return _clean_section_content(raw)

def _extract_agrupacion_sindromica(text: str) -> str:
    raw = _extraer_seccion_inteligente(text, [r"agrupaci[oó]?n\s+sindr[oó]?mica", r"s[ií]ndromes?\s*[:\.]"], [r"enfermedad actual", r"s[ií]?ntomas", r"estudios", r"examen", r"diagn[oó]?stico"])
    return _clean_section_content(raw)

def _extract_estudios_bloque(text: str) -> str:
    raw = _extraer_seccion_inteligente(text, [r"estudios", r"laboratorio", r"rmn", r"potenciales"], [r"diagn[oó]?stico", r"comentarios?", r"tratamiento", r"solicito", r"evoluci[oó]?n"])
    return _clean_section_content(raw)

def _extract_comentario_bloque(text: str) -> str:
    raw = _extraer_seccion_inteligente(text, [r"comentarios?\s*m[eé]dicos?", r"comentarios?", r"observaciones", r"nota", r"justificaci[oó]?n"], [r"solicito", r"bibliograf[ií]?a", r"atte", r"firma", r"evoluci[oó]?n\s*:"])
    return _clean_section_content(raw)

def _extract_evolucion_bloque(text: str) -> str:
    raw = _extraer_seccion_inteligente(text, [r"evoluci[oó]?n"], [r"atte", r"dr\.", r"firma", r"bibliograf[ií]?a", r"solicito"])
    return _clean_section_content(raw)

def _extract_puncion(text: str):
    t = text.lower()
    if "bandas oligoclonales" in t or "lcr" in t or "liquido cefalo" in t or "líquido cefalo" in t:
        if "pendiente" in t or "en trámite" in t or "en tramite" in t:
            return {"realizada": True, "bandas": "Pendiente"}
        bandas = "Positivas" if any(x in t for x in ["positiv", "tipo 2", "presencia"]) else "Negativas" if "negativ" in t else "No informado"
        return {"realizada": True, "bandas": bandas}
    return {"realizada": False, "bandas": None}

def _extract_potenciales(text: str) -> List[Dict[str, Any]]:
    pot_list = []
    lines = _get_logical_lines(text)
    for i, line in enumerate(lines):
        low = line.lower().strip()
        if any(bad in low for bad in ["antecedentes", "comentario", "diagnóstico", "diagnostico"]):
            continue
        if any(kw in low for kw in ["pess", "pev", "pea", "potenciales"]):
            fecha = _find_fecha(line)
            if not fecha and i > 0: fecha = _find_fecha(lines[i-1])
            
            sub_chunks = re.split(r"(?:;\s*|\.\s+)(?=[-\u2013]?\s*(?:PEA|PEV|PESS))|(?<=[^-\s\u2013])\s*[-\u2013](?=\s*(?:PEA|PEV|PESS))", line, flags=re.IGNORECASE)
            for chunk in sub_chunks:
                chunk_low = chunk.lower().strip()
                if not any(k in chunk_low for k in ["pea", "pev", "pess"]):
                    continue
                if "inferior" in chunk_low:
                    tipo = "PESS Inferiores"
                elif "superior" in chunk_low:
                    tipo = "PESS Superiores"
                elif "pess" in chunk_low:
                    tipo = "PESS"
                elif "pev" in chunk_low:
                    tipo = "PEV"
                elif "pea" in chunk_low:
                    tipo = "PEA"
                else:
                    tipo = "Potenciales Evocados"
                    
                clean_chunk = chunk.strip("- \u2013\t\r\n.")
                if len(clean_chunk) > 4 and not clean_chunk.lower().endswith("de mm"):
                    pot_list.append({
                        "tipo_estudio": tipo,
                        "fecha": fecha,
                        "hallazgos": clean_chunk
                    })
    return pot_list

def _extract_laboratorios(text: str) -> List[Dict[str, Any]]:
    labs = []
    lines = _get_logical_lines(text)
    in_estudios = False
    for i, line in enumerate(lines):
        low = line.lower().strip()
        if any(hdr in low for hdr in ["estudios realizados", "estudios:", "laboratorios:", "laboratorio:"]):
            in_estudios = True
        if any(hdr in low for hdr in ["diagnósticos", "diagnosticos", "comentario:", "comentarios:"]):
            in_estudios = False
            
        if any(bad in low for bad in ["diagnóstico", "diagnostico", "presuntivo", "diferencial", "comentario", "mandatorio", "proceso en estudio"]):
            continue
            
        if any(kw in low for kw in ["lyme", "borrelia", "vdrl", "fta-abs", "ácidos grasos", "adrenoleucodistrofia", "serología", "aqp4", "mog", "ers:", "fan"]):
            has_analytical_res = any(token in low for token in ["1/", "(+)", "(-)", "positi", "negati", "normal", "mg/dl", "gr/dl", "ifi", "elisa", "vdr", "fan", "ers"])
            fecha = _find_fecha(line)
            if not fecha and i > 0 and in_estudios:
                fecha = _find_fecha(lines[i-1])
                
            if in_estudios or (has_analytical_res and fecha):
                tipo = "Serología Lyme" if "lyme" in low or "borrelia" in low else "VDRL" if "vdrl" in low else "Ácidos Grasos Cadena Muy Larga" if "ácidos grasos" in low else "Laboratorio Especial"
                res_str = line.strip()
                if not any(r["resultado"] == res_str for r in labs):
                    labs.append({
                        "estudio": tipo,
                        "fecha": fecha,
                        "resultado": res_str
                    })
    return labs

def _extract_otros_estudios(text: str) -> List[Dict[str, Any]]:
    otros = []
    lines = _get_logical_lines(text)
    for i, line in enumerate(lines):
        low = line.lower().strip()
        if any(bad in low for bad in ["antecedentes", "comentario", "tec", "traumatismo", "párrafos"]):
            continue
        if re.search(r"\b(?:eeg|electroencefalograma|ecocardiograma|doppler|tac|tomograf[ií]a)\b", low):
            fecha = _find_fecha(line)
            if not fecha and i > 0: fecha = _find_fecha(lines[i-1])
            tipo = "EEG" if "eeg" in low or "electroencefalo" in low else "Ecocardiograma" if "ecocardio" in low else "TAC"
            otros.append({
                "tipo": tipo,
                "fecha": fecha,
                "hallazgos": line.strip()
            })
    return otros

def _extract_rmn(text: str) -> List[Dict[str, Any]]:
    rmn_list = []
    lineas = _get_logical_lines(text)
    for i, linea in enumerate(lineas):
        low = linea.lower().strip()
        if low in ["estudios rmn:", "estudios rmn", "rmn:", "rmn", "estudios:"]:
            continue
        if any(bad in low for bad in ["eeg:", "ecocardiograma:", "laboratorio:", "potenciales:"]):
            continue

        if any(w in low for w in ["rmn", "resonancia", "gadolinio"]):
            fecha = _find_fecha(linea)
            if not fecha and i > 0:
                prev_low = lineas[i-1].lower()
                if not any(bad in prev_low for bad in ["eeg", "ecocardiograma", "laboratorio", "potenciales"]):
                    fecha = _find_fecha(lineas[i-1])
            
            tipo_estudio = "RMN Cerebro"
            if "cerebro" in low and any(k in low for k in ["cervical", "medular", "dorsal", "columna"]):
                tipo_estudio = "RMN Cervical y Cerebro"
            elif any(k in low for k in ["medular", "cervical", "dorsal", "columna"]):
                tipo_estudio = "RMN Medular"

            actividad = None
            if "sin actividad" in low or "inactiva" in low or "sin lesiones nuevas" in low:
                actividad = "Sin actividad reportada"
            elif "activa" in low or "nuevas lesiones" in low or "brote" in low:
                actividad = "Activa"

            gd = None
            if "gd +" in low or "realce" in low or "capta" in low or "gadolinio +" in low:
                gd = "Captante"
            elif "sin realce" in low or "no capta" in low or "gd -" in low or "negativ" in low:
                gd = "No captante"

            regiones_list = ["periventricular", "subcortical", "yuxtacortical", "bifronto-parietal", "coronas radiatas", "centros semiovales", "centros ovales", "tapetum", "bioccipital", "infratentorial", "medular", "cuerpo calloso"]
            regiones = [r for r in regiones_list if r in low]
            if re.search(r"\b(?<!sub)(?<!yuxta)cortical(?:es)?\b", low):
                regiones.append("cortical")
            
            if not (fecha or actividad or gd or regiones or "rmn" in low):
                continue

            hallazgos = linea.strip()
            # Capturar oraciones continuas de hallazgos
            j = i + 1
            while j < len(lineas):
                next_line = lineas[j].strip()
                next_low = next_line.lower()
                if any(next_low.startswith(trig) for trig in ["-rmn", "rmn", "-angio", "-eeg", "-ecocardiograma", "-laboratorio", "-potenciales", "-0", "-1", "-2", "diagnósticos", "comentario"]):
                    break
                if len(next_line) > 2 and not any(k in next_low for k in ["eeg", "ecocardiograma", "pess", "pev"]):
                    hallazgos += " " + next_line
                    j += 1
                else:
                    break

            hallazgos = re.sub(r"(?i)^(?:RMN|Resonancia\s*Magn[eé]tica).*?[:\.]?\s*", "", hallazgos).strip()

            res = {
                "tipo_estudio": tipo_estudio
            }
            if fecha: res["fecha"] = fecha
            if hallazgos: res["hallazgos"] = hallazgos
            if actividad: res["actividad"] = actividad
            if gd: res["gd"] = gd
            if regiones: res["regiones"] = regiones
            
            if not any(r.get("fecha") == fecha and r.get("tipo_estudio") == tipo_estudio for r in rmn_list):
                rmn_list.append(res)
    return rmn_list

def _find_fecha_consulta(text: str, fecha_nacimiento: str = None) -> Optional[str]:
    lines = _get_logical_lines(text)
    for line in lines[:20]:
        low = line.lower()
        if any(x in low for x in ["nacimiento", "nac", "inicio", "comienzo", "diagn", "sintoma", "afeccion"]):
            continue
        f = _find_fecha(line)
        if f and f != fecha_nacimiento: return f
    for line in lines[-10:]:
        f = _find_fecha(line)
        if f and f != fecha_nacimiento: return f
    return None

def _find_fecha_inicio_sintomas(text: str):
    m = re.search(r"(?:inicio|comienzo)(?:\s+de)?(?:\s+(?:la|el|los|las|su|sus))?\s+(?:s[ií]?ntomas|enfermedad|cuadro|afecci[oó]?n)[:\.\s]*", text, re.IGNORECASE)
    if m:
        subtext = text[m.end():m.end()+100] 
        return _find_fecha(subtext)
    return None

def _process_with_ollama(text: str, file_path: str, tipo: str, modelo: str = "qwen2.5:3b") -> Optional[Dict[str, Any]]:
    import urllib.request
    import json
    
    url = "http://localhost:11434/api/chat"
    
    prompt_sistema = (
        "Eres un asistente de NLP clínico experto en neurología y Esclerosis Múltiple. "
        "Analiza el texto médico provisto y extrae la información en un objeto JSON estricto. "
        "No agregues explicaciones, introducciones ni bloques markdown. Retorna ÚNICAMENTE el JSON estructurado. "
        "El JSON debe tener la siguiente estructura exacta:\n"
        "{\n"
        "  \"paciente\": {\n"
        "    \"nombre\": \"Nombre y Apellido del paciente (e.g., 'Juan Pérez') o null. Busca patrones como 'Paciente... Juan Pérez' o 'Sr. ...' y extrae el nombre completo. No devuelvas null si hay un nombre propio en el texto.\",\n"
        "    \"dni\": \"DNI numérico sin puntos o null\",\n"
        "    \"fecha_nacimiento\": \"YYYY-MM-DD o null\",\n"
        "    \"obra_social\": \"Nombre de obra social o null\",\n"
        "    \"nro_afiliado\": \"Número de afiliado o null\"\n"
        "  },\n"
        "  \"consulta\": {\n"
        "    \"fecha\": \"YYYY-MM-DD o null de la consulta actual\"\n"
        "  },\n"
        "  \"enfermedad\": {\n"
        "    \"diagnostico\": \"diagnóstico extraído conciso. NOTA: Si el diagnóstico no es definitivo, o si es presuntivo/diferencial/en estudio (e.g. proceso en estudio para descartar Lyme, vasculopatía, enfermedad desmielinizante), escribe una descripción muy breve como 'En estudio: Descarte de enfermedad desmielinizante vs infecciosa'. NUNCA pongas párrafos largos de laboratorio aquí.\",\n"
        "    \"codigo\": \"G35 o null\",\n"
        "    \"forma\": \"RR, SP, PP, CIS o null\",\n"
        "    \"fecha_inicio\": \"YYYY-MM-DD o null del inicio de síntomas\",\n"
        "    \"edss\": número flotante o null\n"
        "  },\n"
        "  \"complementarios\": {\n"
        "    \"rmn\": [\n"
        "      {\n"
        "        \"fecha\": \"YYYY-MM-DD o null\",\n"
        "        \"actividad\": \"Activa o Inactiva o null\",\n"
        "        \"gd\": \"Positiva o Negativa o null\",\n"
        "        \"regiones\": [\"lista de regiones encontradas de: periventricular, yuxtacortical, infratentorial, medular, cortical\"]\n"
        "      }\n"
        "    ],\n"
        "    \"puncion_lumbar\": {\n"
        "      \"realizada\": true o false,\n"
        "      \"bandas\": \"Positivas o Negativas o No informado o null\"\n"
        "    }\n"
        "  },\n"
        "  \"tratamientos\": [\n"
        "    {\n"
        "      \"molecula\": \"Nombre de la molécula/droga\",\n"
        "      \"droga\": \"Nombre de la droga (igual a molecula)\",\n"
        "      \"dosis\": \"dosis o null\",\n"
        "      \"frecuencia\": \"Diario, Semanal, Mensual o null\",\n"
        "      \"estado\": \"Activo o Suspendido\",\n"
        "      \"inicio\": \"YYYY-MM-DD o null\"\n"
        "    }\n"
        "  ],\n"
        "  \"secciones_texto\": {\n"
        "    \"sintomas_principales\": \"resumen de síntomas principales o null\",\n"
        "    \"antecedentes\": \"antecedentes médicos o null\",\n"
        "    \"examen_fisico\": \"examen físico/neurológico o null\",\n"
        "    \"agrupacion_sindromica\": \"agrupación sindrómica o null\",\n"
        "    \"comentario\": \"comentarios/justificación del médico o null\",\n"
        "    \"estudios\": \"estudios complementarios descritos o null\",\n"
        "    \"evolucion\": \"resumen de evolución clínica o null\"\n"
        "  }\n"
        "}"
    )
    
    data = {
        "model": modelo,
        "messages": [
            {"role": "system", "content": prompt_sistema},
            {"role": "user", "content": f"Texto de la consulta:\n{text[:4000]}"}
        ],
        "options": {
            "num_predict": 1024,
            "temperature": 0.1
        },
        "stream": False,
        "format": "json"
    }
    
    req = urllib.request.Request(
        url, 
        data=json.dumps(data).encode("utf-8"), 
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=25.0) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            content = res_data["message"]["content"]
            ollama_data = json.loads(content)
            
            ollama_data["estado"] = "Procesado"
            ollama_data["fuente"] = {"tipo": tipo, "nombre_archivo": os.path.basename(file_path)}
            ollama_data["texto_original"] = text[:5000]
            ollama_data["confidencia"] = {"forma": "Alta"}
            
            if "consulta" not in ollama_data or not ollama_data["consulta"]:
                ollama_data["consulta"] = {"fecha": None, "medico": None}
            else:
                ollama_data["consulta"]["medico"] = None
                
            if "enfermedad" not in ollama_data or not isinstance(ollama_data["enfermedad"], dict):
                ollama_data["enfermedad"] = {}
            if "diagnosticos_diferenciales" not in ollama_data["enfermedad"]:
                ollama_data["enfermedad"]["diagnosticos_diferenciales"] = []

            return ollama_data
    except Exception as e:
        print(f"Advertencia: No se pudo realizar la extracción con Ollama ({e}). Cayendo en procesamiento por reglas...")
        return None

from app.services import profile_service

def _apply_active_profile_rules(text: str, medico_id: str):
    """
    Capa 1: Aplica las reglas y glosario aprobados en el perfil activo perfiles_medicos/{medico_id}.json.
    Retorna: (texto_normalizado, reglas_aplicadas, version_perfil)
    """
    reglas_aplicadas = []
    version_perfil = 1
    
    try:
        perfil = profile_service.get_active_profile(medico_id)
        version_perfil = perfil.get("version", 1)
        glosario = perfil.get("glosario", {})
        
        for origen, destino in glosario.items():
            pattern = re.compile(r'\b' + re.escape(origen) + r'\b', re.IGNORECASE)
            if pattern.search(text):
                text = pattern.sub(destino, text)
                reglas_aplicadas.append({
                    "origen": origen,
                    "destino": destino,
                    "tipo": "glosario"
                })
    except Exception as e:
        print(f"[WARN] Fallo al aplicar perfil activo para {medico_id}: {e}")
        
    return text, reglas_aplicadas, version_perfil

def process(file_path: str, medico_id: Optional[str] = None, use_ollama: bool = False) -> Dict[str, Any]:
    raw_text, n_pages, tipo = extract_text(file_path)
    
    # 0. Capa 0.5: Normalizador Documental & Aislamiento de Cabecera Administrativa
    text_clinico, cabecera_data = normalize_raw_document(raw_text)
    text = _clean_text(text_clinico)
    
    target_medico_id = medico_id or profile_service.get_default_medico_id()
    text, reglas_aplicadas, version_perfil = _apply_active_profile_rules(text, target_medico_id)
    
    meta_perfil = {
        "medico_id": target_medico_id,
        "version_perfil": version_perfil,
        "reglas_aplicadas": reglas_aplicadas
    }
    
    # 1. Extracción con Ollama solo si se solicita explícitamente (predeterminado: False para alta velocidad)
    if use_ollama:
        borrador = _process_with_ollama(text, file_path, tipo)
        if borrador:
            borrador["meta_perfil"] = meta_perfil
            return borrador
        
    # 2. Extractor Determinista Híbrido (Capas 1, 2 y 3)
    datos_extra = _extract_datos_extra_paciente(raw_text)
    
    dni = cabecera_data.get("dni") or _extract_dni(raw_text)
    paciente_nombre = cabecera_data.get("nombre") or _extract_paciente_nombre(raw_text)
    telefono = cabecera_data.get("telefono") or datos_extra.get("telefono")
    obra_social = cabecera_data.get("obra_social") or datos_extra.get("obra_social")
    nro_afiliado = cabecera_data.get("nro_afiliado") or datos_extra.get("nro_afiliado")
    
    fecha_nac = datos_extra.get("fecha_nacimiento")
    fecha_cons = _find_fecha_consulta(raw_text, fecha_nac)
    fecha_ini = _find_fecha_inicio_sintomas(raw_text)
    
    txt_sintomas = _extract_sintomas_bloque(text)
    ant_data = _extract_antecedentes_bloque(text)
    txt_examen = _extract_examen_fisico_bloque(text)
    txt_agrupacion = _extract_agrupacion_sindromica(text)
    txt_comentario = _extract_comentario_bloque(text)
    txt_estudios = _extract_estudios_bloque(text)
    txt_evolucion = _extract_evolucion_bloque(text)
    
    info_dx = _extract_diagnostico_bloque(raw_text)
    tratamientos = _extract_tratamientos_bloque(raw_text)
    
    edss = None
    m_edss = re.search(r"edss\s*[:\.]?\s*(\d+[\.,]?\d*)", raw_text, re.IGNORECASE)
    if m_edss: 
        try: edss = to_float(m_edss.group(1))
        except: pass
        
    forma = None
    if re.search(r"\b(?:emrr|rr|reca[ií]das?\s*y\s*remisiones|recurrente[\s\-]*remitente)\b", raw_text, re.IGNORECASE):
        forma = "RR"
    elif re.search(r"\b(?:emsp|sp|progresi[oó]n\s+secundaria|secundariamente\s+progresiva)\b", raw_text, re.IGNORECASE):
        forma = "SP"
    elif re.search(r"\b(?:empp|pp|primaria\s+progresiva|progresiva\s+primaria)\b", raw_text, re.IGNORECASE):
        forma = "PP"
    elif re.search(r"\b(?:cis|s[ií]ndrome\s+cl[ií]nico\s+aislado)\b", raw_text, re.IGNORECASE):
        forma = "CIS"
     
    puncion = _extract_puncion(text)
    rmn = _extract_rmn(text)
    potenciales = _extract_potenciales(text)
    laboratorios = _extract_laboratorios(text)
    otros_estudios = _extract_otros_estudios(text)
 
    borrador = {
        "estado": "Procesado",
        "fuente": {"tipo": tipo, "nombre_archivo": os.path.basename(file_path)},
        "meta_perfil": meta_perfil,
        "paciente": {
            "nombre": paciente_nombre, 
            "dni": dni,
            "fecha_nacimiento": fecha_nac,
            "obra_social": obra_social,
            "nro_afiliado": nro_afiliado,
            "telefono": telefono
        },
        "consulta": {
            "fecha": fecha_cons, 
            "medico": None 
        },
        "enfermedad": {
            "diagnostico": info_dx["diagnostico"], 
            "codigo": info_dx["codigo"],
            "diagnosticos_diferenciales": info_dx.get("diagnosticos_diferenciales", []),
            "forma": forma, 
            "fecha_inicio": fecha_ini, 
            "edss": edss
        },
        "complementarios": {
            "rmn": rmn, 
            "puncion_lumbar": puncion,
            "potenciales_evocados": potenciales,
            "laboratorios": laboratorios,
            "otros_estudios": otros_estudios
        },
        "tratamientos": tratamientos,
        "secciones_texto": {
            "sintomas_principales": txt_sintomas,
            "antecedentes": ant_data.get("antecedentes_personales", ""),
            "antecedentes_familiares": ant_data.get("antecedentes_familiares", ""),
            "examen_fisico": txt_examen,
            "agrupacion_sindromica": txt_agrupacion,
            "comentario": txt_comentario,
            "estudios": txt_estudios,
            "evolucion": txt_evolucion
        },
        "texto_original": raw_text[:5000],
        "confidencia": {"forma": "Alta"}
    }
    
    return borrador