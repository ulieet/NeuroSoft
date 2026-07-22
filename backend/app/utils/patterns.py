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

RE_EDSS = re.compile(r"\bedss\s*[:\-]?\s*(\d+[.,]?\d*)", re.IGNORECASE)
RE_DNI = re.compile(r"\b(dni|documento)\s*[:\-]?\s*([0-9.\s]{6,12})", re.IGNORECASE)
RE_FECHA_NUM = re.compile(r"\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})")
RE_FECHA_TXT = re.compile(
    r"\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})", re.IGNORECASE
)
RE_MES_ANO = re.compile(r"\b([a-záéíóú]+)\s+(\d{4})", re.IGNORECASE)

RE_DX = re.compile(r"(diagn[oó]stico|impresi[oó]n diagn[oó]stica)\s*[:\-]?\s*(.+)", re.IGNORECASE)

VERBOS_TRATAMIENTO = ["inicia", "inició", "inicia tratamiento", "comienza", "mantiene", "continúa", "cambia a", "suspende"]

FAMILIAS_SECCIONES = {
    "sintomas": [r"s[ií]?ntomas", r"motivo de consulta", r"enfermedad actual", r"anamnesis", r"cuadro cl[ií]?nico"],
    "antecedentes": [r"antecedentes personales", r"antecedentes patol[oó]?gicos", r"antecedentes", r"app", r"historia personal"],
    "examen_fisico": [r"examen f[ií]?sico", r"examen neurol[oó]?gico", r"rasgos semiol[oó]?gicos"],
    "agrupacion_sindromica": [r"agrupaci[oó]?n\s+sindr[oó]?mica", r"s[ií]ndromes?\s*[:\.]"],
    "estudios": [r"estudios complementarios", r"estudios", r"laboratorio", r"rmn", r"potenciales"],
    "diagnostico": [r"diagn[oó]?stico\s+principal", r"diagn[oó]?stico", r"imp\.?\s*diag\.?", r"cuadro presuntivo"],
    "diagnosticos_diferenciales": [r"diagn[oó]?sticos?\s+(?:presuntivos?[/\s]*diferenciales?|diferenciales?|presuntivos?)", r"en\s+estudio\s+para\s+descartar", r"descarte\s+de"],
    "comentario": [r"comentarios?\s*m[eé]dicos?", r"comentarios?", r"conclusi[oó]?n", r"observaciones", r"discusi[oó]?n", r"nota\s+final", r"justificaci[oó]?n"],
    "evolucion": [r"evoluci[oó]?n\s*:", r"notas?\s+de\s+evoluci[oó]?n"],
    "tratamiento": [r"tratamiento", r"indicaciones", r"plan\s+terap[eé]?utico"]
}