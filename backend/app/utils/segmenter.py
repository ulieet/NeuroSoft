import re
from typing import Dict

HEADERS = [
    "datos", "filiatorios", "consulta", "evolución", "evolucion",
    "diagnóstico", "diagnostico", "impresión", "impresion",
    "tratamiento", "complementarios", "rmn", "punción", "puncion",
    "lcr", "laboratorio", "antecedentes", "episodios"
]

def segment_basic(text: str) -> Dict[str, str]:
    lines = [l for l in text.splitlines()]
    sections = {}
    current = "general"
    sections[current] = []

    for ln in lines:
        l = ln.strip()
        low = l.lower()
        if any(re.match(rf"^\s*{h}\b", low) for h in HEADERS):
            current = low.split(":")[0]
            sections.setdefault(current, [])
        sections[current].append(l)

    return {k: "\n".join(v).strip() for k, v in sections.items()}