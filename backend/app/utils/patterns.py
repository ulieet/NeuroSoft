# app/utils/patterns.py
import re

MESES_ES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12
}

FORMAS = {
    "RR": ["recaídas y remisiones", "recaidas y remisiones", "rr", "recurrente-remitente"],
    "SP": ["progresión secundaria", "progresion secundaria", "sp"],
    "PP": ["primaria progresiva", "pp", "progresiva primaria"],
    "CIS": ["síndrome clínicamente aislado", "sindrome clinicamente aislado", "cis"]
}

MOLECULAS = [
    "Interferón beta-1a", "Interferon beta 1a", "Interferón beta-1b",
    "Acetato de glatiramero", "Fingolimod", "Teriflunomida", "Dimetilfumarato",
    "Natalizumab", "Ocrelizumab", "Alemtuzumab", "Cladribina", "Rituximab",
    "Siponimod", "Ozanimod"
]

REGIONES_RMN = ["periventricular", "yuxtacortical", "infratentorial", "medular"]
RMN_TRIGGERS = ["rmn", "resonancia", "gadolinio", "gd", "activa", "inactiva"]

# Regex útiles
RE_EDSS = re.compile(r"\bedss\s*[:\-]?\s*(\d+[.,]?\d*)", re.IGNORECASE)
RE_DNI = re.compile(r"\b(dni|documento)\s*[:\-]?\s*([0-9.\s]{6,12})", re.IGNORECASE)
RE_FECHA_NUM = re.compile(r"\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})")
RE_FECHA_TXT = re.compile(
    r"\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})", re.IGNORECASE
)
RE_MES_ANO = re.compile(r"\b([a-záéíóú]+)\s+(\d{4})", re.IGNORECASE)

# Para detectar diagnóstico EM y forma en una misma oración
RE_DX = re.compile(r"(diagn[oó]stico|impresi[oó]n diagn[oó]stica)\s*[:\-]?\s*(.+)", re.IGNORECASE)

VERBOS_TRATAMIENTO = ["inicia", "inició", "inicia tratamiento", "comienza", "mantiene", "continúa", "cambia a", "suspende"]