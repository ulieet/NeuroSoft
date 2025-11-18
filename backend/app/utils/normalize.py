# app/utils/normalize.py
from datetime import date
from .patterns import MESES_ES, FORMAS, MOLECULAS

def to_float(s):
    if s is None: return None
    s = str(s).strip().replace(",", ".")
    try:
        return float(s)
    except:
        return None

def normalize_fecha(d, m, y):
    # d/m/y pueden venir como str
    try:
        d = int(d) if d else 1
        m = int(m) if m else 1
        y = int(y)
        if y < 100:  # 17 -> 2017
            y += 2000 if y < 50 else 1900
        return date(y, m, d).isoformat()
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
