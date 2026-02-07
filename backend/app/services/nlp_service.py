# backend/app/services/nlp_service.py

from typing import Dict, Any, List, Optional
import re
import os
from app.utils.extract_text import extract_text
from app.utils.normalize import (
    to_float, normalize_fecha, normalize_mes_texto, norm_forma
)
from app.utils import patterns as P

def _clean_text(text: str) -> str:
    t = text.replace('\x0c', '\n').replace('\r\n', '\n').replace('\r', '\n')
    t = re.sub(r'\.-\s*', '.\n', t)
    t = re.sub(r'[|]', ' ', t) 
    t = re.sub(r'\s+', ' ', t) 
    return t

def _get_logical_lines(text: str) -> List[str]:
    return re.split(r'\n|\.\s+(?=[A-Z"\(])', text)

def _extraer_seccion_inteligente(text: str, headers_inicio: List[str], headers_fin: List[str]) -> str:
    lines = _get_logical_lines(text)
    bloque = []
    capturando = False
    
    patron_inicio = r"(?:^|\s)(" + "|".join(headers_inicio) + r")\b[:\.\-]*"
    
    titulos_fuertes = [
        r"diagn[oó]?sticos?", r"tratamiento", r"plan", r"s[ií]?ntomas", r"motivo", 
        r"antecedentes", r"examen f[ií]?sico", r"estudios", r"rmn", r"laboratorio", 
        r"conclusi[oó]?n", r"bibliograf[ií]?a", r"firma", r"dr\.", 
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
                cortar_en = re.split(r"\s+(?:-?\s*Edad|DNI|Fecha|HC|H\.C\.|OS|Obra Social)\b", raw_name, flags=re.IGNORECASE)
                name = cortar_en[0].strip()
                if len(name) > 3 and not re.search(r"\d", name):
                    return name

    for i, linea in enumerate(lineas[:10]):
        l = linea.strip()
        if not l: continue
        if any(x in l.lower() for x in ["fecha", "informe", "historia", "neurología", "consultorio", "la plata", "buenos aires", "atención"]):
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

def _extract_datos_extra_paciente(text: str) -> Dict[str, Optional[str]]:
    data = {"fecha_nacimiento": None, "obra_social": None, "nro_afiliado": None}
    
    m_fn = re.search(r"(?:nacimiento|f\. nac|nac)\s*[:\.\-]?\s*([\d]{1,2}[/\-][\d]{1,2}[/\-][\d]{2,4})", text, re.IGNORECASE)
    if m_fn:
        try:
            partes = re.split(r"[/\-]", m_fn.group(1))
            if len(partes) == 3:
                d, m, y = partes
                # Aquí llamamos a la función con la lógica del paso 1
                data["fecha_nacimiento"] = normalize_fecha(d, m, y)
        except: pass
        
    m_os = re.search(r"(?:obra social|o\.s\.|cobertura)\s*[:\.]\s*([^:\n\r]+)", text, re.IGNORECASE)
    if m_os:
        raw = m_os.group(1).strip()
        clean = re.split(r"(?i)\s+(?:n[ro°º\.]+(?:\s*de)?|afiliado|socio|credencial|beneficiario|plan)", raw)[0].strip()
        clean = re.sub(r"(?i)[\s.,\-_Nº°]+$", "", clean).strip()
        if len(clean) > 1:
            data["obra_social"] = clean

    m_af = re.search(r"(?:n[ro°º\.]?\s*de\s*)?afiliado\s*[:\.]?\s*([\w\d\/\-]+)", text, re.IGNORECASE)
    if m_af:
        data["nro_afiliado"] = m_af.group(1).strip()
        
    return data

# --- TRATAMIENTOS ---

def _extract_tratamientos_bloque(text: str) -> List[Dict[str, Any]]:
    best_matches = {} 
    lines = _get_logical_lines(text)
    seccion_actual = ""

    farmacos_patterns = [
        (r"Interfer[oó]?n\s*beta\s*1a", "Interferón Beta-1a"),
        (r"Rebif", "Interferón Beta-1a"),
        (r"Blastofer[oó]?n", "Interferón Beta-1a"),
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
        if "solicito" in low: seccion_actual = "solicito"
        if "bibliografa" in low or "referencias" in low: seccion_actual = "bibliografia"

        if seccion_actual == "bibliografia" or any(x in low for x in ["et al", "vol.", "pp.", "journal", "study", "trial", "comparado con", "versus", "vs.", "lancet", "neurology"]):
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
                if any(neg in low for neg in ["suspende", "previo", "rotar", "discontinuar", "anterior", "inicialmente"]):
                    estado = "Suspendido"
                
                if nombre_mol not in best_matches:
                    best_matches[nombre_mol] = {
                        "molecula": nombre_mol, "droga": nombre_mol,
                        "dosis": dosis, "frecuencia": frecuencia,
                        "estado": estado, "inicio": _find_fecha(linea)
                    }
                else:
                    current = best_matches[nombre_mol]
                    if (dosis and not current["dosis"]) or (seccion_actual == "solicito"):
                        best_matches[nombre_mol].update({
                            "dosis": dosis or current["dosis"],
                            "frecuencia": frecuencia or current["frecuencia"],
                            "estado": estado,
                            "inicio": _find_fecha(linea) or current["inicio"]
                        })

    return list(best_matches.values())

def _extract_diagnostico_bloque(text: str) -> Dict[str, Any]:
    inicios = [r"diagn[oó]?sticos?", r"impresi[oó]?n diagn[oó]?stica", r"problema", r"presuntivos?"]
    fines = [r"tratamiento", r"solicito", r"plan", r"s[ií]?ntomas", r"comentarios?", r"evoluci[oó]?n"]
    bloque = _extraer_seccion_inteligente(text, inicios, fines)
    res = {"diagnostico": None, "codigo": None}
    m_dx = re.search(r"(?:diagn[oó]?sticos?|imp\.? diag\.?)\s*(?:presuntivos?|diferenciales?)?[:\.]\s*(.+)", text, re.IGNORECASE)
    if m_dx: res["diagnostico"] = m_dx.group(1).strip()
    elif bloque: res["diagnostico"] = bloque.split('\n')[0]
    
    if res["diagnostico"] and re.search(r"esclerosis m[uú]?ltiple", res["diagnostico"], re.IGNORECASE):
        res["diagnostico"] = "Esclerosis Múltiple"
    if "G35" in text or "340" in text: res["codigo"] = "G35"
    return res

def _extract_sintomas_bloque(text: str) -> str:
    return _extraer_seccion_inteligente(text, [r"s[ií]?ntomas", r"motivo de consulta", r"enfermedad actual", r"anamnesis"], [r"antecedentes", r"examen", r"estudios", r"laboratorio", r"rasgos", r"evoluci[oó]?n", r"diagn[oó]?stico"])

def _extract_antecedentes_bloque(text: str) -> str:
    return _extraer_seccion_inteligente(text, [r"antecedentes", r"historia personal", r"app"], [r"s[ií]?ntomas", r"examen", r"evoluci[oó]?n"])

def _extract_examen_fisico_bloque(text: str) -> str:
    return _extraer_seccion_inteligente(text, [r"examen f[ií]?sico", r"examen neurol[oó]?gico", r"rasgos semiol[oó]?gicos"], [r"estudios", r"rmn", r"diagn[oó]?stico", r"plan", r"evoluci[oó]?n"])

def _extract_agrupacion_sindromica(text: str) -> str:
    return _extraer_seccion_inteligente(text, [r"agrupaci[oó]?n sindr[oó]?mica", r"s[ií]?ndromes?"], [r"estudios", r"examen", r"diagn[oó]?stico"])

def _extract_estudios_bloque(text: str) -> str:
    return _extraer_seccion_inteligente(text, [r"estudios", r"laboratorio", r"rmn", r"potenciales"], [r"diagn[oó]?stico", r"comentarios?", r"tratamiento", r"solicito", r"evoluci[oó]?n"])

def _extract_comentario_bloque(text: str) -> str:
    return _extraer_seccion_inteligente(text, [r"comentarios?", r"justificaci[oó]?n", r"observaciones", r"nota"], [r"solicito", r"bibliograf[ií]?a", r"atte", r"firma", r"evoluci[oó]?n"])

def _extract_evolucion_bloque(text: str) -> str:
    return _extraer_seccion_inteligente(text, [r"evoluci[oó]?n"], [r"atte", r"dr\.", r"firma", r"bibliograf[ií]?a", r"solicito"])

def _extract_puncion(text: str):
    t = text.lower()
    if "bandas oligoclonales" in t or "lcr" in t or "liquido cefalo" in t:
        bandas = "Positivas" if any(x in t for x in ["positiv", "tipo 2", "presencia"]) else "Negativas" if "negativ" in t else "No informado"
        return {"realizada": True, "bandas": bandas}
    return {"realizada": False, "bandas": None}

def _extract_rmn(text: str) -> List[Dict[str, Any]]:
    rmn_list = []
    lineas = _get_logical_lines(text)
    for i, linea in enumerate(lineas):
        if "rmn" in linea.lower() or "resonancia" in linea.lower():
            fecha = _find_fecha(linea)
            if not fecha and i > 0: fecha = _find_fecha(lineas[i-1]) 
            actividad = "Activa" if "activa" in linea.lower() else "Inactiva" if "inactiva" in linea.lower() else None
            gd = "Positiva" if "gd +" in linea.lower() or "realce" in linea.lower() else None
            regiones = [r for r in ["periventricular", "infratentorial", "medular", "cortical"] if r in linea.lower()]
            if fecha or actividad or gd or regiones:
                rmn_list.append({"fecha": fecha, "actividad": actividad, "gd": gd, "regiones": regiones})
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

def process(file_path: str) -> Dict[str, Any]:
    raw_text, n_pages, tipo = extract_text(file_path)
    text = _clean_text(raw_text)
    
    paciente_nombre = _extract_paciente_nombre(text)
    dni = _extract_dni(text)
    datos_extra = _extract_datos_extra_paciente(text)
    
    fecha_nac = datos_extra["fecha_nacimiento"]
    fecha_cons = _find_fecha_consulta(text, fecha_nac)
    fecha_ini = _find_fecha_inicio_sintomas(text)
    
    txt_sintomas = _extract_sintomas_bloque(text)
    txt_antecedentes = _extract_antecedentes_bloque(text)
    txt_examen = _extract_examen_fisico_bloque(text)
    txt_agrupacion = _extract_agrupacion_sindromica(text)
    txt_comentario = _extract_comentario_bloque(text)
    txt_estudios = _extract_estudios_bloque(text)
    txt_evolucion = _extract_evolucion_bloque(text)
    
    info_dx = _extract_diagnostico_bloque(text)
    tratamientos = _extract_tratamientos_bloque(text)
    
    edss = None
    m_edss = re.search(r"edss\s*[:\.]?\s*(\d+[\.,]?\d*)", text, re.IGNORECASE)
    if m_edss: 
        try: edss = to_float(m_edss.group(1))
        except: pass
        
    forma = None
    for f_key, f_names in P.FORMAS.items():
        if any(name in text.lower() for name in f_names):
            forma = f_key
            break

    puncion = _extract_puncion(text)
    rmn = _extract_rmn(text)

    borrador = {
        "estado": "Procesado",
        "fuente": {"tipo": tipo, "nombre_archivo": os.path.basename(file_path)},
        "paciente": {
            "nombre": paciente_nombre, 
            "dni": dni,
            "fecha_nacimiento": fecha_nac,
            "obra_social": datos_extra["obra_social"],
            "nro_afiliado": datos_extra["nro_afiliado"]
        },
        "consulta": {
            "fecha": fecha_cons, 
            "medico": None 
        },
        "enfermedad": {
            "diagnostico": info_dx["diagnostico"], 
            "codigo": info_dx["codigo"],
            "forma": forma, 
            "fecha_inicio": fecha_ini, 
            "edss": edss
        },
        "complementarios": {
            "rmn": rmn, 
            "puncion_lumbar": puncion
        },
        "tratamientos": tratamientos,
        "secciones_texto": {
            "sintomas_principales": txt_sintomas,
            "antecedentes": txt_antecedentes,
            "examen_fisico": txt_examen,
            "agrupacion_sindromica": txt_agrupacion,
            "comentario": txt_comentario,
            "estudios": txt_estudios,
            "evolucion": txt_evolucion
        },
        "texto_original": text[:5000],
        "confidencia": {"forma": "Media"}
    }
    
    return borrador