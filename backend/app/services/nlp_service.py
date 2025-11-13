# Servicio de NLP/extracción
# app/services/nlp_service.py
from typing import Dict, Any, List, Optional
import re
from datetime import date
from app.utils.extract_text import extract_text
from app.utils.segmenter import segment_basic
from app.utils.normalize import (
    to_float, normalize_fecha, normalize_mes_texto, norm_forma, norm_molecula
)
from app.utils import patterns as P


def _find_fecha(text: str):
    # dd/mm/aaaa
    m = P.RE_FECHA_NUM.search(text)
    if m:
        d, mo, y = m.groups()
        return normalize_fecha(d, mo, y)
    # "16 de Noviembre de 2020"
    m = P.RE_FECHA_TXT.search(text)
    if m:
        d, mes_txt, y = m.groups()
        mes = normalize_mes_texto(mes_txt)
        return normalize_fecha(d, mes, y) if mes else None
    # "marzo 2017"
    m = P.RE_MES_ANO.search(text)
    if m:
        mes_txt, y = m.groups()
        mes = normalize_mes_texto(mes_txt)
        return normalize_fecha(1, mes, y) if mes else None
    return None


def _extract_puncion(section_text: str):
    t = (section_text or "").lower()
    # Consideramos punción/lcr en cualquier parte del texto
    if any(w in t for w in ["puncion", "punción", "lcr", "bandas", "oligoclonal"]):
        realizada = True
        if "oligoclonal" in t or "positiv" in t:
            bandas = "Sí"
        elif "negativ" in t:
            bandas = "No"
        else:
            bandas = "No informado"
        return {"realizada": realizada, "bandas": bandas}, "Alta"
    return {"realizada": False, "bandas": "No informado"}, "Baja"


def _extract_rmn(text: str) -> List[Dict[str, Any]]:
    """
    Extrae líneas relacionadas a RMN / resonancia y devuelve bloques
    con fecha, actividad, gadolinio y regiones.
    """
    bloques: List[Dict[str, Any]] = []
    for linea in (text or "").splitlines():
        low = linea.lower()
        if "rmn" in low or "resonancia" in low:
            act = None
            gd = None  # inicializar siempre

            # Actividad
            if re.search(r"\binactiva\b", low):
                act = "Inactiva"
            elif re.search(r"\bactiva\b", low):
                act = "Activa"

            # Gadolinio / Gd(+)
            if ("gd(+)" in low or "gd +" in low or "gadolinio (+)" in low or re.search(r"\bgd\s*\(\+\)", low)):
                gd = "Positiva"
            elif ("gd(-)" in low or "gd -" in low or re.search(r"\bgd\s*\(-\)", low)):
                gd = "Negativa"

            # Regiones
            regiones = [rg for rg in P.REGIONES_RMN if rg in low]
            # Extra: si aparece "supra", asumimos supratentorial
            if "supra" in low and "supratentorial" not in regiones:
                regiones.append("supratentorial")

            r = {
                "fecha": _find_fecha(linea),
                "actividad": act,
                "gd": gd,
                "regiones": regiones,
            }
            bloques.append(r)

    # Filtrar renglones completamente vacíos
    bloques = [
        b for b in bloques
        if b.get("fecha") or b.get("actividad") or b.get("gd") or b.get("regiones")
    ]
    return bloques


def _merge_rmn_por_fecha(rmn_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Une entradas de RMN con la misma fecha, combinando actividad, gadolinio y regiones.
    Evita que la misma RMN (ej. 14/05/2021) aparezca duplicada en la estructura.
    """
    if not rmn_list:
        return []

    sin_fecha: List[Dict[str, Any]] = [r for r in rmn_list if not r.get("fecha")]
    agrupado: Dict[str, Dict[str, Any]] = {}

    for item in rmn_list:
        fecha = item.get("fecha")
        if not fecha:
            continue

        if fecha not in agrupado:
            agrupado[fecha] = {
                "fecha": fecha,
                "actividad": None,
                "gd": None,
                "regiones": []
            }

        dest = agrupado[fecha]

        # Actividad: priorizamos "Activa" sobre "Inactiva"
        actividad = item.get("actividad")
        if actividad:
            if dest["actividad"] is None:
                dest["actividad"] = actividad
            else:
                if dest["actividad"] != "Activa" and actividad == "Activa":
                    dest["actividad"] = "Activa"

        # Gd: priorizamos "Positiva"
        gd = item.get("gd")
        if gd:
            if dest["gd"] is None:
                dest["gd"] = gd
            else:
                if dest["gd"] != "Positiva" and gd == "Positiva":
                    dest["gd"] = "Positiva"

        # Regiones: unimos sin duplicar
        for reg in item.get("regiones") or []:
            if reg not in dest["regiones"]:
                dest["regiones"].append(reg)

    # Devolvemos las agrupadas + las que no tenían fecha
    return list(agrupado.values()) + sin_fecha


def _extract_paciente_nombre(text: str) -> Optional[str]:
    """
    Extrae nombre del paciente SOLO en casos donde:
    - La línea empieza con 'Apellido y Nombre:' / similares
    - O está en la línea siguiente a 'Apellido y Nombre:'
    - O la línea empieza con 'Paciente: ...'

    Evita agarrar frases del tipo 'La paciente presenta...'
    """

    lineas = text.splitlines()

    patron_apellido_nombre = re.compile(
        r"^\s*apellido[s]?\s+y\s+nombre[s]?\s*:?\s*(.+)$",
        flags=re.IGNORECASE,
    )
    patron_nombre_apellido = re.compile(
        r"^\s*nombre[s]?\s+y\s+apellido[s]?\s*:?\s*(.+)$",
        flags=re.IGNORECASE,
    )
    patron_paciente = re.compile(
        r"^\s*paciente\s*:?\s*(.+)$",
        flags=re.IGNORECASE,
    )

    for i, linea in enumerate(lineas):
        # Caso 1: todo en la misma línea
        for patron in (patron_apellido_nombre, patron_nombre_apellido, patron_paciente):
            m = patron.search(linea)
            if m:
                contenido = m.group(1).strip()
                if contenido:
                    return contenido

        # Caso 2: 'Apellido y Nombre:' en una línea y debajo el nombre
        low = linea.lower()
        if "apellido" in low and "nombre" in low and ":" in low:
            if i + 1 < len(lineas):
                siguiente = lineas[i + 1].strip()
                if len(siguiente) > 2:
                    return siguiente

    return None


def _extract_dni(text: str) -> Optional[str]:
    """
    Extrae DNI aunque esté en la misma línea o en la línea siguiente.
    Soporta formatos con puntos, comas, etc.
    Ejemplos:
      - 'DNI: 31.998.442'
      - 'DNI:\n38.765.432'
    """
    lineas = text.splitlines()

    # Caso 1: DNI en la misma línea → “DNI: 38.765.432”
    for linea in lineas:
        m = re.search(r"DNI[:\s]*([\d\.\,]+)", linea, flags=re.IGNORECASE)
        if m:
            return re.sub(r"\D", "", m.group(1))

    # Caso 2: DNI en la línea siguiente
    for i, linea in enumerate(lineas):
        if "dni" in linea.lower():
            if i + 1 < len(lineas):
                siguiente = lineas[i + 1].strip()
                m = re.search(r"([\d\.\,]+)", siguiente)
                if m:
                    return re.sub(r"\D", "", m.group(1))

    return None


def _extract_tratamientos(text: str) -> List[Dict[str, Any]]:
    """
    Extrae tratamientos a partir de líneas que hablen de medicación.
    En cada línea intenta identificar:
      - molécula (normalizada si norm_molecula la reconoce)
      - dosis (ej: '40 mg')
      - vía (SC, IV, VO, etc.)
      - frecuencia (ej: '3 veces por semana')
      - fecha de inicio (si hay fecha)
      - estado (Activo / Suspendido)
    """
    t = text or ""
    items: List[Dict[str, Any]] = []

    # Fármacos típicos de EM + DOACs + betabloqueantes
    farmacos = [
        r"Acetato de Glatiramer",
        r"Glatiramer",
        r"Interfer[oó]n beta ?-?1a",
        r"Interfer[oó]n beta ?-?1b",
        r"Fingolimod",
        r"Natalizumab",
        r"Ocrelizumab",
        r"Rituximab",
        r"Teriflunomida",
        r"Dimetil fumarato",
        # DOACs
        r"Apixaban",
        r"Rivaroxaban",
        r"Dabigatran",
        r"Edoxaban",
        # Betabloqueantes
        r"Metoprolol",
        r"Bisoprolol",
        r"Carvedilol",
    ]

    patron_farmacos = "(" + "|".join(farmacos) + ")"

    triggers_activo = [
        "inicia", "mantiene", "continua", "continúa",
        "debe continuar", "continuidad de", "tratamiento prolongado",
        "debe seguir"
    ]
    triggers_suspendido = [
        "suspende", "suspensión", "suspender"
    ]

    for linea in t.splitlines():
        linea_str = linea.strip()
        if not linea_str:
            continue

        low = linea_str.lower()

        # La línea tiene que sonar a tratamiento
        if not any(k in low for k in triggers_activo + triggers_suspendido + ["tratamiento", "medicación", "medicacion"]):
            continue

        # Buscar fármaco
        m_farm = re.search(patron_farmacos, linea_str, flags=re.IGNORECASE)
        if not m_farm:
            continue

        nombre_crudo = m_farm.group(1)
        # Intentamos normalizar, si no se puede usamos el texto crudo
        mol_norm = norm_molecula(nombre_crudo) or nombre_crudo

        # Estado del tratamiento
        estado = None
        if any(k in low for k in triggers_activo):
            estado = "Activo"
        elif any(k in low for k in triggers_suspendido):
            estado = "Suspendido"

        # Fecha en la línea (opcional, suele no estar)
        inicio = _find_fecha(linea_str)

                # Dosis: 40 mg / 0,5 mg / 250 mg / 8 MUI / etc.
        m_dosis = re.search(
            r"(\d+[.,]?\d*)\s*(mg|mcg|µg|g|mui)\b",
            linea_str,
            flags=re.IGNORECASE
        )
        dosis = m_dosis.group(0) if m_dosis else None


        # Vía: SC, IV, VO, IM, etc.
        m_via = re.search(
            r"\b(sc|subcut[aá]nea|iv|intravenosa|im|intramuscular|vo|oral)\b",
            low,
            flags=re.IGNORECASE
        )
        via = None
        if m_via:
            via = m_via.group(1).upper()
            if via.startswith("SUBCUT"):
                via = "SC"
            elif via.startswith("INTRAVEN"):
                via = "IV"
            elif via.startswith("INTRAMUS"):
                via = "IM"
            elif via == "ORAL":
                via = "VO"

        # Frecuencia: "tres veces por semana", "3 veces por semana", "3 aplicaciones/semana"
                # Frecuencia: "1 comprimido cada 12 horas", "2 tabletas cada 8 h", etc.
                # Frecuencia:
        #  - "tres veces por semana", "3 veces por semana", "3 aplicaciones/semana"
        #  - "día por medio"
        #  - "1 comprimido cada 12 horas", "2 tabletas cada 8 h", etc.
        m_freq = re.search(
            r"(\d+|una|dos|tres|cuatro)\s+(veces|aplicaciones?).*(d[ií]a|semana|mes)",
            low,
            flags=re.IGNORECASE,
        )

        if not m_freq:
            # día por medio
            m_freq = re.search(
                r"d[ií]a\s+por\s+medio",
                low,
                flags=re.IGNORECASE,
            )

        if not m_freq:
            # "1 comprimido cada 12 horas", "2 tabletas cada 8 h", etc.
            m_freq = re.search(
                r"(\d+)\s+(comprimidos?|tabletas?|c[aá]psulas?).*cada\s+(\d+)\s*(h|horas|d[ií]as)",
                low,
                flags=re.IGNORECASE,
            )

        frecuencia = m_freq.group(0) if m_freq else None



        items.append({
            "comercial": None,
            "molecula": mol_norm,
            "inicio": inicio,
            "estado": estado,
            "dosis": dosis,
            "via": via,
            "frecuencia": frecuencia,
        })

    # Eliminar duplicados por (molécula, estado, dosis, frecuencia)
        # Unificar tratamientos del mismo fármaco/estado, quedándonos con el más completo
    unicos: Dict[tuple, Dict[str, Any]] = {}
    for it in items:
        clave = (
            (it.get("molecula") or "").lower(),
            it.get("estado"),
        )

        existente = unicos.get(clave)
        if not existente:
            unicos[clave] = it
            continue

        # Si ya había uno, elegimos el que tenga más datos no nulos
        def info_score(t):
            score = 0
            if t.get("dosis"):
                score += 1
            if t.get("via"):
                score += 1
            if t.get("frecuencia"):
                score += 1
            if t.get("inicio"):
                score += 1
            return score

        if info_score(it) > info_score(existente):
            unicos[clave] = it

    return list(unicos.values())



def _find_fecha_en_linea_si_ciudad(line: str):
    l = (line or "").lower()
    # Caso encabezado: "La Plata, 16 de Noviembre de 2020"
    ciudades = ["la plata", "ciudad autonoma", "buenos aires", "caba", "mar del plata"]
    if any(c in l for c in ciudades):
        f = _find_fecha(line)
        if f:
            return f
    return None


def _find_fecha_inicio_por_contexto(text: str):
    cand = []
    for line in (text or "").splitlines():
        l = line.lower()
        # pistas fuertes de inicio
        if any(k in l for k in [
            "asistida desde", "asistido desde", "inicio",
            "primer episodio", "primer brote", "desde",
            "marzo", "abril", "mayo", "junio", "julio",
            "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        ]):
            # excluir bibliografía / leyes / PMO
            if any(b in l for b in [
                "boletin oficial", "bibliografia", "lancet",
                "neurology", "multiple sclerosis", "revista", "medicina (buenos aires)"
            ]):
                continue
            f = _find_fecha(line)
            if f:
                cand.append(f)
    return sorted(cand)[0] if cand else None


def process(file_path: str) -> Dict[str, Any]:
    """
    Procesa un archivo PDF/DOCX y devuelve un borrador estructurado
    con los datos clínicos relevantes.
    """
    text, n_pages, tipo = extract_text(file_path)
    sections = segment_basic(text)

    # datos básicos (disponibles si el texto los trae)
    paciente_nombre = _extract_paciente_nombre(text)
    dni = _extract_dni(text)

    # diagnóstico y forma
        # diagnóstico y forma
    diagnostico = None
    forma = None
    conf_forma = "Baja"
    for sec_name, sec_text in sections.items():
        m = P.RE_DX.search(sec_text)
        if m and not diagnostico:
            dx_txt = m.group(2).strip()
            # si menciona Esclerosis múltiple, normalizamos el texto base
            if "esclerosis" in dx_txt.lower():
                diagnostico = "Esclerosis múltiple"
            else:
                diagnostico = dx_txt

        f = norm_forma(sec_text)

        # solo usamos RR/SP/PP si el texto general habla de Esclerosis
        if f and not forma and "esclerosis" in text.lower():
            full = text.lower()

            if f in ("SP", "PP"):
                # Para poner SP/PP exigimos que el texto mencione explícitamente
                # formas progresivas (secundaria / primaria / progresiva...)
                if any(tok in full for tok in [
                    "secundariamente progresiva",
                    "secundaria progresiva",
                    "primaria progresiva",
                    "forma progresiva",
                    "em-sp",
                    "em sp",
                    "em-pp",
                    "em pp",
                    "spms",
                    "ppms",
                ]):
                    forma = f
                    conf_forma = "Media" if "diagn" not in sec_name.lower() else "Alta"
                else:
                    # si norm_forma dice SP/PP pero el diagnóstico explícito dice REMITENTE,
                    # lo pisamos a RR
                    if diagnostico and "remitent" in diagnostico.lower():
                        forma = "RR"
                        conf_forma = "Media" if "diagn" not in sec_name.lower() else "Alta"
                    # si no hay ninguna pista fuerte, preferimos dejar forma = None
            else:
                # RR u otras formas “remitentes”
                forma = f
                conf_forma = "Media" if "diagn" not in sec_name.lower() else "Alta"


    # EDSS
    edss = None
    conf_edss = "Baja"
    m = P.RE_EDSS.search(text)
    if m:
        edss = to_float(m.group(1))
        conf_edss = "Alta"

    # fechas
    fecha_consulta = None
    for line in text.splitlines():
        fecha_consulta = _find_fecha_en_linea_si_ciudad(line)
        if fecha_consulta:
            break
    if not fecha_consulta:
        fecha_consulta = _find_fecha(text)

    fecha_inicio = _find_fecha_inicio_por_contexto(text) or None
    for k in ["evolución", "evolucion", "consulta", "diagnóstico", "diagnostico", "general"]:
        if k in sections and not fecha_inicio:
            fecha_inicio = _find_fecha(sections[k])

    # Complementarios: RMN + punción lumbar
    rmn_raw = _extract_rmn(text)
    rmn = _merge_rmn_por_fecha(rmn_raw)

    # Ordenar por fecha y deducir estado actual de RMN (para futuros módulos)
    def _iso_or_min(f):
        return f if isinstance(f, str) and len(f) == 10 else "0001-01-01"

    rmn_ordenada = sorted(rmn, key=lambda x: _iso_or_min(x.get("fecha")))
    rmn_actual = next((x for x in reversed(rmn_ordenada) if x.get("fecha")), None)

    resumen_rmn = {
        "ultima_fecha": rmn_actual.get("fecha") if rmn_actual else None,
        "actividad_actual": rmn_actual.get("actividad") if rmn_actual else None,
        "gd_actual": rmn_actual.get("gd") if rmn_actual else None
    }

    puncion, conf_puncion = _extract_puncion(text)

    # Tratamientos (usamos sección específica si existe + texto completo como respaldo)
    tratamientos = _extract_tratamientos(sections.get("tratamiento", "") + "\n" + text)

    borrador = {
        "estado": "Procesado",
        "fuente": {"tipo": tipo, "nombre_archivo": file_path.split("/")[-1]},
        "paciente": {"nombre": paciente_nombre, "dni": dni},
        "consulta": {"fecha": fecha_consulta, "medico": None},
        "enfermedad": {
            "diagnostico": diagnostico,
            "forma": forma,
            "fecha_inicio": fecha_inicio,
            "edss": edss
        },
        "complementarios": {
            "rmn": rmn,
            "puncion_lumbar": puncion,
            # "resumen_rmn": resumen_rmn  # si después lo querés exponer
        },
        "tratamientos": tratamientos,
        "episodios": [],
        "texto_original": text[:20000],  # limitar tamaño por respuesta
        "confidencia": {
            "forma": conf_forma,
            "edss": conf_edss,
            "puncion_lumbar": conf_puncion
        }
    }
    return borrador
