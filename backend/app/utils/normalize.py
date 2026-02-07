# app/utils/normalize.py
from datetime import date
from .patterns import MESES_ES, FORMAS, MOLECULAS
from datetime import datetime

def to_float(s):
    if s is None: return None
    s = str(s).strip().replace(",", ".")
    try:
        return float(s)
    except:
        return None

def normalize_fecha(d, m, y):
    try:
        day = int(d)
        month = int(m)
        year = int(y)

        if year < 100:
            current_year = datetime.now().year % 100
            if year > current_year:
                year += 1900
            else:
                year += 2000
        
        # Validar rangos básicos
        if not (1 <= month <= 12): return None
        if not (1 <= day <= 31): return None
        if year < 1900 or year > 2100: return None

        return f"{year}-{month:02d}-{day:02d}"
    except:
        return None

def normalize_mes_texto(mes_txt):
    mes = mes_txt.lower().strip()
    mes = mes.replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u")
    return MESES_ES.get(mes)

def norm_forma(texto):
    t = (texto or "").lower()
    for forma, alias in FORMAS.items():
        if any(a in t for a in alias) or f" {forma.lower()} " in f" {t} ":
            return forma
    return None

def norm_molecula(texto):
    if not texto: return None
    for m in MOLECULAS:
        if m.lower().replace("-", "").replace(" ", "") in texto.lower().replace("-", "").replace(" ", ""):
            # Devolver versión prolija (la lista contiene variantes)
            if "interferon beta 1a" in m.lower():
                return "Interferón beta-1a"
            if "interferon beta 1b" in m.lower():
                return "Interferón beta-1b"
            return m
    return None