# app/services/nlp_service.py
from typing import Dict, Any, List, Optional
import re
from app.utils.extract_text import extract_text
from app.utils.segmenter import segment_basic
from app.utils.normalize import (
    to_float, normalize_fecha, normalize_mes_texto, norm_forma, norm_molecula
)
from app.utils import patterns as P

def _clean_text(text: str) -> str:
    """Limpia caracteres de control y normaliza espacios"""
    t = text.replace('\x0c', '\n').replace('\r\n', '\n').replace('\r', '\n')
    t = re.sub(r' +', ' ', t)
    return t

# --- MOTOR DE EXTRACCIÓN POR BLOQUES (LA CLAVE) ---
def _extraer_seccion_inteligente(text: str, headers_inicio: List[str], headers_fin: List[str]) -> str:
    """
    Busca un bloque de texto que empiece con alguna palabra de 'headers_inicio'
    y termine cuando encuentre alguna de 'headers_fin' o el final del documento.
    """
    lines = text.splitlines()
    bloque = []
    capturando = False
    
    # Regex compilada para velocidad
    patron_inicio = "(" + "|".join(headers_inicio) + ")"
    
    for i, linea in enumerate(lines):
        low = linea.lower().strip()
        if not low: continue
        
        # 1. Detectar inicio
        if not capturando:
            # Buscamos si la línea contiene el título (ej: "Sintomas principales:")
            if re.search(patron_inicio, low):
                capturando = True
                # Limpiamos el título de la línea para dejar solo el contenido
                # Ej: "Sintomas: Dolor de cabeza" -> "Dolor de cabeza"
                contenido = re.sub(patron_inicio, "", linea, flags=re.IGNORECASE).strip()
                # Quitamos dos puntos o guiones iniciales sobrantes
                contenido = re.sub(r"^[:\-\.]+\s*", "", contenido)
                if contenido:
                    bloque.append(contenido)
                continue
        
        # 2. Capturar contenido
        if capturando:
            # Verificar si llegamos al fin (aparece otro título conocido)
            # Usamos headers_fin específicos o una lista general de secciones médicas
            if any(re.search(fin, low) for fin in headers_fin):
                break
            
            # Protección extra: si aparece cualquier título médico fuerte, cortamos
            titulos_generales = [r"diagn[oó]stico", r"tratamiento", r"s[ií]ntomas", r"antecedentes", r"estudios", r"laboratorio", r"atte\.", r"firma"]
            # Solo cortamos si NO es el título de nuestra propia sección (para evitar cortar prematuramente)
            if any(re.search(t, low) for t in titulos_generales) and not any(re.search(i, low) for i in headers_inicio):
                 # Doble chequeo: solo salir si parece un encabezado (corto o con dos puntos)
                 if len(linea) < 40 or ":" in linea:
                     break

            bloque.append(linea.strip())
            
    return "\n".join(bloque).strip()

def _find_fecha(text: str):
    # Prioridad 1: Texto ("12 de Diciembre")
    m = P.RE_FECHA_TXT.search(text)
    if m:
        d, mes_txt, y = m.groups()
        mes = normalize_mes_texto(mes_txt)
        return normalize_fecha(d, mes, y) if mes else None
    
    # Prioridad 2: Numérico (12/12/2011)
    m = P.RE_FECHA_NUM.search(text)
    if m:
        d, mo, y = m.groups()
        return normalize_fecha(d, mo, y)
        
    # Prioridad 3: Mes-Año
    m = P.RE_MES_ANO.search(text)
    if m:
        mes_txt, y = m.groups()
        mes = normalize_mes_texto(mes_txt)
        return normalize_fecha(1, mes, y) if mes else None
    return None

def _extract_tratamientos_bloque(text: str) -> List[Dict[str, Any]]:
    # 1. Definimos títulos posibles para tratamientos
    inicios = [r"solicito\s*:", r"tratamiento\s*:", r"plan\s*:", r"rp\s*/", r"indicaciones\s*:", r"indico\s*:", r"recibe\s*:"]
    fines = [r"atte\.", r"dr\.", r"firma", r"bibliograf[ií]a", r"fecha", r"diagn[oó]stico"]
    
    # 2. Extraemos SOLO el texto del tratamiento
    texto_bloque = _extraer_seccion_inteligente(text, inicios, fines)
    texto_a_buscar = texto_bloque if texto_bloque else text
    
    items = []
    
    # --- CORRECCIÓN AQUÍ: Usamos Regex para soportar tildes ---
    farmacos_patterns = [
        (r"Interfer[oó]n", "Interferón"), 
        (r"Glatiramer", "Acetato de Glatiramer"), 
        (r"Fingolimod", "Fingolimod"), 
        (r"Natalizumab", "Natalizumab"), 
        (r"Ocrelizumab", "Ocrelizumab"), 
        (r"Rituximab", "Rituximab"), 
        (r"Teriflunomida", "Teriflunomida"), 
        (r"Dimetil", "Dimetil Fumarato"), 
        (r"Dimeful", "Dimetil Fumarato"), 
        (r"Rebif", "Interferón Beta-1a"), 
        (r"Blastofer[oó]n", "Interferón Beta-1a"),
        (r"Copaxone", "Acetato de Glatiramer"), 
        (r"Lemtrada", "Alemtuzumab"), 
        (r"Mavenclad", "Cladribina"), 
        (r"Tysabri", "Natalizumab")
    ]
    
    lines = texto_a_buscar.splitlines()
    es_bloque_especifico = bool(texto_bloque)
    found_drugs = set()

    for patron, nombre_normalizado in farmacos_patterns:
        # Buscamos el patrón (ej: Interfer[oó]n) en todo el bloque
        if re.search(patron, texto_a_buscar, re.IGNORECASE):
            
            # Si lo encontramos, buscamos la línea exacta para sacar detalles
            for linea in lines:
                if re.search(patron, linea, re.IGNORECASE):
                    # Evitar duplicados del mismo fármaco en el mismo bloque
                    if nombre_normalizado in found_drugs: continue
                    
                    estado = "Activo"
                    if any(neg in linea.lower() for neg in ["suspende", "previo", "rotar", "discontinuar"]):
                        estado = "Suspendido"
                    elif not es_bloque_especifico:
                        # Si no estamos en un bloque "Solicito", requerimos un verbo de confirmación
                        if not any(k in linea.lower() for k in ["inicia", "mantiene", "solicito", "indico", "recibe"]):
                            continue
                            
                    found_drugs.add(nombre_normalizado)
                    
                    # Extraer dosis
                    dosis = None
                    m_dosis = re.search(r"(\d+[.,]?\d*)\s*(mg|mcg|µg|g|mui)", linea, re.IGNORECASE)
                    if m_dosis: dosis = m_dosis.group(0)
                    
                    # Extraer fecha cercana
                    inicio = _find_fecha(linea)
                    
                    items.append({
                        "molecula": nombre_normalizado, 
                        "inicio": inicio,
                        "estado": estado,
                        "dosis": dosis,
                        "frecuencia": None
                    })
    return items


def _extract_diagnostico_bloque(text: str) -> Dict[str, Any]:
    inicios = [r"diagn[oó]stico\s*:", r"impresi[oó]n diagn[oó]stica\s*:"]
    fines = [r"tratamiento", r"solicito", r"nota", r"comentario"]
    
    bloque = _extraer_seccion_inteligente(text, inicios, fines)
    # Si no hay bloque, usamos una línea con regex
    origen = bloque if bloque else text
    
    res = {"diagnostico": None, "codigo": None}
    
    # Buscar Diagnóstico
    m_dx = P.RE_DX.search(origen)
    if m_dx: 
        res["diagnostico"] = m_dx.group(2).strip()
    elif bloque:
        # Si tenemos bloque pero no regex exacta, tomamos la primera línea del bloque
        lineas = bloque.splitlines()
        if lineas: res["diagnostico"] = lineas[0].strip()
        
    if res["diagnostico"] and "esclerosis" in res["diagnostico"].lower():
        res["diagnostico"] = "Esclerosis múltiple"
        
    # Buscar Código OMS/CIE
    m_oms = re.search(r"(?:OMS|CIE-10)[:\s]*([\w\d\.]+)", origen, re.IGNORECASE)
    if m_oms:
        res["codigo"] = f"OMS-{m_oms.group(1)}"
        
    return res

def _extract_antecedentes_bloque(text: str) -> str:
    inicios = [r"antecedentes", r"historia personal", r"historia cl[ií]nica"]
    fines = [r"s[ií]ntomas", r"enfermedad actual", r"examen f[ií]sico"]
    return _extraer_seccion_inteligente(text, inicios, fines)

def _extract_sintomas_bloque(text: str) -> str:
    inicios = [r"s[ií]ntomas", r"motivo de consulta", r"enfermedad actual", r"anamnesis"]
    fines = [r"antecedentes", r"estudios", r"examen", r"datos semiol[oó]gicos"]
    return _extraer_seccion_inteligente(text, inicios, fines)

# --- (Funciones de soporte que ya tenías, RMN, Puncion, Fechas...) ---

def _extract_puncion(section_text: str):
    t = (section_text or "").lower()
    keywords = ["puncion", "punción", "lcr", "bandas", "oligoclonal", "cefalorraqui", "liquido cefalo"]
    if any(w in t for w in keywords):
        realizada = True
        bandas = "Sí" if ("oligoclonal" in t or "positiv" in t) else "No" if "negativ" in t else "No informado"
        return {"realizada": realizada, "bandas": bandas}, "Alta"
    return {"realizada": False, "bandas": "No informado"}, "Baja"

def _analizar_linea_rmn(linea: str, rmn_dict: Dict):
    low = linea.lower()
    if re.search(r"\binactiva\b", low): rmn_dict["actividad"] = "Inactiva"
    elif re.search(r"\bactiv[ao]s?\b", low) or "actividad actual" in low: rmn_dict["actividad"] = "Activa"
    if (re.search(r"gd[\.\s]*(?:iv)?\s*\(?\+\)?", low) or "realce con gd" in low or "captando gd" in low or "volcado de gd" in low):
        rmn_dict["gd"] = "Positiva"
    elif "gd(-)" in low or "gd -" in low: rmn_dict["gd"] = "Negativa"
    for rg in P.REGIONES_RMN:
        if rg in low and rg not in rmn_dict["regiones"]: rmn_dict["regiones"].append(rg)
    if "supra" in low and "supratentorial" not in rmn_dict["regiones"]: rmn_dict["regiones"].append("supratentorial")

def _extract_rmn(text: str) -> List[Dict[str, Any]]:
    bloques = []
    current_rmn = None
    for linea in text.splitlines():
        low = linea.strip().lower()
        if not low: continue
        if "rmn" in low or "resonancia" in low:
            if current_rmn: bloques.append(current_rmn)
            current_rmn = {"fecha": _find_fecha(linea), "actividad": None, "gd": None, "regiones": []}
            _analizar_linea_rmn(linea, current_rmn)
        elif current_rmn:
            if any(k in low for k in ["diagnostico", "tratamiento", "sintomas", "laboratorio", "potenciales", "solicito"]):
                bloques.append(current_rmn)
                current_rmn = None
                continue
            _analizar_linea_rmn(linea, current_rmn)
            if not current_rmn["fecha"]: current_rmn["fecha"] = _find_fecha(linea)
    if current_rmn: bloques.append(current_rmn)
    return [b for b in bloques if b.get("fecha") or b.get("actividad") or b.get("gd") or b.get("regiones")]

def _merge_rmn_por_fecha(rmn_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not rmn_list: return []
    agrupado = {}
    for item in rmn_list:
        f = item.get("fecha")
        if not f: continue
        if f not in agrupado: agrupado[f] = {"fecha": f, "actividad": None, "gd": None, "regiones": []}
        dest = agrupado[f]
        if item.get("actividad"): dest["actividad"] = item["actividad"]
        if item.get("gd"): dest["gd"] = item["gd"]
        for r in item.get("regiones", []):
             if r not in dest["regiones"]: dest["regiones"].append(r)
    return list(agrupado.values())

def _extract_paciente_nombre(text: str) -> Optional[str]:
    lineas = text.splitlines()
    patterns = [r"^\s*apellido[s]?\s+y\s+nombre[s]?\s*:?\s*(.+)$", r"paciente\s+(.+)$"]
    for i, linea in enumerate(lineas):
        l = linea.strip()
        for pat in patterns:
            m = re.search(pat, l, flags=re.IGNORECASE)
            if m:
                c = re.split(r"\s+(-?Edad|DNI|Fecha)\b", m.group(1).strip(), flags=re.IGNORECASE)[0].strip()
                if len(c) > 3: return c
    return None

def _extract_dni(text: str) -> Optional[str]:
    for linea in text.splitlines():
        m = re.search(r"DNI[:\.\s]*([\d\.\,]{6,12})", linea, flags=re.IGNORECASE)
        if m: return re.sub(r"\D", "", m.group(1))
    return None

def _extract_datos_extra_paciente(text: str) -> Dict[str, Optional[str]]:
    data = {"fecha_nacimiento": None, "obra_social": None, "nro_afiliado": None}
    m_fn = re.search(r"(?:fecha de nacimiento|nacimiento)[:\s]*([\d]{1,2}[/-][\d]{1,2}[/-][\d]{2,4})", text, re.IGNORECASE)
    if m_fn:
        try:
            d, m, y = m_fn.group(1).replace('-', '/').split('/')
            data["fecha_nacimiento"] = normalize_fecha(d, m, y)
        except: pass
    m_os = re.search(r"obra social[:\s]*([^:\n]+)", text, re.IGNORECASE)
    if m_os:
        raw = m_os.group(1).strip()
        if "afiliado" in raw.lower(): raw = re.split(r"n.?\s*de\s*afiliado", raw, flags=re.IGNORECASE)[0].strip()
        data["obra_social"] = raw
    m_af = re.search(r"(?:n.?\s*de\s*)?afiliado[:\s]*([\w\d\/-]+)", text, re.IGNORECASE)
    if m_af: data["nro_afiliado"] = m_af.group(1).strip()
    return data

def _find_fecha_consulta(text: str, fecha_nacimiento: str = None) -> Optional[str]:
    lines = text.splitlines()
    for line in lines[:20]:
        l_low = line.lower()
        if "nacimiento" in l_low or "nac." in l_low: continue
        if any(k in l_low for k in ["la plata", "buenos aires", "fecha", "resumen"]):
            f = _find_fecha(line)
            if f and f != fecha_nacimiento: return f
    for line in lines:
        if "nacimiento" in line.lower(): continue
        f = _find_fecha(line)
        if f and f != fecha_nacimiento: return f
    return None

def _find_fecha_inicio_por_contexto(text: str):
    cand = []
    for line in (text or "").splitlines():
        if "asistida desde" in line.lower() or "inicio" in line.lower():
            f = _find_fecha(line)
            if f: cand.append(f)
    return sorted(cand)[0] if cand else None

# --- FUNCIÓN PRINCIPAL ---
def process(file_path: str) -> Dict[str, Any]:
    raw_text, n_pages, tipo = extract_text(file_path)
    text = _clean_text(raw_text)
    
    # 1. Extracción de Datos Básicos
    paciente_nombre = _extract_paciente_nombre(text)
    dni = _extract_dni(text)
    datos_extra = _extract_datos_extra_paciente(text)
    
    # 2. Extracción Inteligente por Bloques
    tratamientos = _extract_tratamientos_bloque(text)
    info_dx = _extract_diagnostico_bloque(text)
    txt_sintomas = _extract_sintomas_bloque(text)
    txt_antecedentes = _extract_antecedentes_bloque(text)

    # EDSS y Forma (siguen siendo mejor por regex global o línea)
    edss = None
    m_edss = P.RE_EDSS.search(text)
    if m_edss: edss = to_float(m_edss.group(1))

    forma = None
    for line in text.splitlines():
        f = norm_forma(line)
        if f: 
            if f in ("SP", "PP") and "secundaria" not in text.lower(): continue
            forma = f
            break

    # Fechas
    fecha_nacimiento = datos_extra["fecha_nacimiento"]
    fecha_consulta = _find_fecha_consulta(text, fecha_nacimiento)
    fecha_inicio = _find_fecha_inicio_por_contexto(text)

    # Complementarios (RMN y Puncion)
    rmn = _merge_rmn_por_fecha(_extract_rmn(text))
    puncion, _ = _extract_puncion(text)

    # 3. Armado del JSON
    borrador = {
        "estado": "Procesado",
        "fuente": {"tipo": tipo, "nombre_archivo": file_path.split("/")[-1]},
        "paciente": {
            "nombre": paciente_nombre, "dni": dni,
            "fecha_nacimiento": fecha_nacimiento,
            "obra_social": datos_extra["obra_social"],
            "nro_afiliado": datos_extra["nro_afiliado"]
        },
        "consulta": {"fecha": fecha_consulta, "medico": None},
        "enfermedad": {
            "diagnostico": info_dx["diagnostico"], 
            "codigo": info_dx["codigo"],
            "forma": forma, "fecha_inicio": fecha_inicio, "edss": edss
        },
        "complementarios": {"rmn": rmn, "puncion_lumbar": puncion},
        "tratamientos": tratamientos,
        "episodios": [],
        # Enviamos los textos limpios por sección para mostrarlos mejor en el frontend si se quiere
        "secciones_texto": {
            "sintomas": txt_sintomas,
            "antecedentes": txt_antecedentes
        },
        # Mantenemos texto original completo como respaldo
        "texto_original": text[:10000],
        "confidencia": {"forma": "Alta"}
    }
    return borrador