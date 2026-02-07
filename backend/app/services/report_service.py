# backend/app/services/report_service.py
import os
import json

DATA_DIR = "./data/historias"

def generar_estadisticas_generales():
    if not os.path.exists(DATA_DIR):
        return {"total_historias": 0}

    total_historias = 0
    obras_sociales = {}

    for fname in os.listdir(DATA_DIR):
        if not fname.endswith(".json"): continue
        try:
            with open(os.path.join(DATA_DIR, fname), "r", encoding="utf-8") as f:
                data = json.load(f)
                total_historias += 1
                
                # Ejemplo simple de conteo
                contenido = data.get("validada") or data.get("borrador") or {}
                os_nombre = contenido.get("paciente", {}).get("obra_social", "Desconocida")
                obras_sociales[os_nombre] = obras_sociales.get(os_nombre, 0) + 1
        except:
            continue

    return {
        "total_historias": total_historias,
        "distribucion_obras_sociales": obras_sociales
    }