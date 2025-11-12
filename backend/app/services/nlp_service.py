# Servicio de NLP/extracción (placeholder)
# app/services/nlp_service.py
from typing import Dict, Any, List
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
    if any(w in t for w in ["puncion", "lcr", "bandas", "oligoclonal"]):
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
    bloques = []
    for linea in (text or "").splitlines():
        low = linea.lower()
        if "rmn" in low or "resonancia" in low:
            act = None
            # primero chequeamos INACTIVA con palabra completa
            if re.search(r"\binactiva\b", low):
                act = "Inactiva"
            elif re.search(r"\bactiva\b", low):
                act = "Activa"

            if ("gd(+)" in low or "gd +" in low or "gadolinio (+)" in low or re.search(r"\bgd\s*\(\+\)", low)):
                gd = "Positiva"
            elif ("gd(-)" in low or "gd -" in low or re.search(r"\bgd\s*\(-\)", low)):
                gd = "Negativa"
            else:
                gd = None

            r = {
                "fecha": _find_fecha(linea),
                "actividad": act,
                "gd": gd,
                "regiones": [rg for rg in P.REGIONES_RMN if rg in low]
            }
            bloques.append(r)
# Filtrar renglones vacíos
    bloques = [b for b in bloques if b.get("fecha") or b.get("actividad") or b.get("gd") or b.get("regiones")]
    return bloques



def _extract_tratamientos(text: str) -> List[Dict[str, Any]]:
    t = (text or "")
    items = []
    for linea in t.splitlines():
        low = linea.lower()
        if any(v in low for v in ["inicia", "mantiene", "continua", "solicito", "continuidad de", "debe continuar"]):
            mol = norm_molecula(linea)
            if mol:
                estado = "Activo" if any(k in low for k in ["inicia", "mantiene", "continua", "continuidad"]) else "Suspendido" if "suspende" in low else None
                items.append({
                    "comercial": None,
                    "molecula": mol,
                    "inicio": _find_fecha(linea),
                    "estado": estado
                })
    return items

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
        if any(k in l for k in ["asistida desde", "inicio", "primer episodio", "desde", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre"]):
            # excluir bibliografía / leyes / PMO
            if any(b in l for b in ["boletin oficial", "bibliografia", "lancet", "neurology", "multiple sclerosis", "revista", "medicina (buenos aires)"]):
                continue
            f = _find_fecha(line)
            if f:
                cand.append(f)
    return sorted(cand)[0] if cand else None



def process(file_path: str) -> Dict[str, Any]:
    text, n_pages, tipo = extract_text(file_path)
    sections = segment_basic(text)

    # datos básicos (disponibles si el texto los trae)
    paciente_nombre = None
    dni = None
    m_dni = P.RE_DNI.search(text)
    if m_dni:
        dni = re.sub(r"\D", "", m_dni.group(2))

    # diagnóstico y forma
    diagnostico = None
    forma = None
    conf_forma = "Baja"
    for sec_name, sec_text in sections.items():
        m = P.RE_DX.search(sec_text)
        if m and not diagnostico:
            diagnostico = "Esclerosis múltiple" if "esclerosis" in m.group(2).lower() else m.group(2).strip()
        f = norm_forma(sec_text)
        if f and not forma:
            forma = f
            conf_forma = "Media" if "diagn" not in sec_name else "Alta"

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

    # Complementarios
    rmn = _extract_rmn(text)
    # Ordenar por fecha y deducir estado actual
    def _iso_or_min(f): 
        return f if isinstance(f, str) and len(f) == 10 else "0001-01-01"

    rmn_ordenada = sorted(rmn, key=lambda x: _iso_or_min(x.get("fecha")))
    rmn_actual = next((x for x in reversed(rmn_ordenada) if x.get("fecha")), None)

    # si te sirve en el front, podés incluir un resumen
    resumen_rmn = {
        "ultima_fecha": rmn_actual.get("fecha") if rmn_actual else None,
        "actividad_actual": rmn_actual.get("actividad") if rmn_actual else None,
        "gd_actual": rmn_actual.get("gd") if rmn_actual else None
    }

    puncion, conf_puncion = _extract_puncion(text)

    # Tratamientos
    tratamientos = _extract_tratamientos(sections.get("tratamiento","") + "\n" + text)

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
            "puncion_lumbar": puncion
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
