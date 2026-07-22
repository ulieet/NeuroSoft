import os
import json
from datetime import datetime
from collections import Counter, defaultdict
from typing import Dict, Any, List, Optional

FEEDBACK_DIR = os.getenv("FEEDBACK_DIR", "./data/feedback_medicos")
PROFILES_DIR = os.getenv("PROFILES_DIR", "./data/perfiles_medicos")
MIN_OCCURRENCES = int(os.getenv("MIN_OCCURRENCES", "2"))
MIN_CONFIDENCE = float(os.getenv("MIN_CONFIDENCE", "0.80"))


def analyze_feedback(medico_id: str = "dr_default") -> Dict[str, Any]:
    """
    Analiza en modo SOLO LECTURA el archivo feedback_medicos/{medico_id}_feedback.json
    y genera el informe de sugerencias auditables en perfiles_medicos/{medico_id}_suggestions.json.
    NO modifica el perfil activo del médico.
    """
    feedback_file = os.path.join(FEEDBACK_DIR, f"{medico_id}_feedback.json")
    
    if not os.path.exists(feedback_file):
        reporte_vacio = {
            "medico_id": medico_id,
            "fecha_analisis": datetime.now().isoformat(),
            "estadisticas_generales": {
                "total_eventos_feedback": 0,
                "total_campos_corregidos": 0,
                "frecuencia_campos": {}
            },
            "sugerencias": []
        }
        _save_suggestions(medico_id, reporte_vacio)
        return reporte_vacio

    try:
        with open(feedback_file, "r", encoding="utf-8") as f:
            eventos = json.load(f)
            if not isinstance(eventos, list):
                eventos = []
    except Exception as e:
        print(f"[WARN] Error al leer feedback para {medico_id}: {e}")
        eventos = []

    total_eventos = len(eventos)
    total_campos_corregidos = 0
    frecuencia_campos = Counter()

    # Estructura para agrupamiento de transformaciones:
    # transformaciones[origen][destino] = count
    transformaciones_moleculas = defaultdict(Counter)
    transformaciones_diagnosticos = defaultdict(Counter)

    for ev in eventos:
        cambios = ev.get("cambios", {})
        for campo, diff in cambios.items():
            total_campos_corregidos += 1
            frecuencia_campos[campo] += 1

            # 1. Analizar correcciones de moléculas de tratamientos
            if campo == "tratamientos.molecula" and isinstance(diff, list):
                for item in diff:
                    mol_info = item.get("molecula", {})
                    orig = mol_info.get("anterior")
                    dest = mol_info.get("corregido")
                    if orig and dest and orig != dest:
                        transformaciones_moleculas[orig.upper()][dest] += 1

            # 2. Analizar correcciones de diagnósticos
            elif campo == "enfermedad.diagnostico":
                orig = diff.get("anterior")
                dest = diff.get("corregido")
                if orig and dest and orig != dest:
                    transformaciones_diagnosticos[orig.upper()][dest] += 1

    sugerencias = []

    # Evaluar reglas de aceptación para Abreviaturas / Fármacos
    for orig, destinos in transformaciones_moleculas.items():
        total_apariciones_origen = sum(destinos.values())
        for dest, ocurrencias in destinos.items():
            confianza = round(ocurrencias / total_apariciones_origen, 2)
            
            # Criterios mínimos de aceptación
            if ocurrencias >= MIN_OCCURRENCES and confianza >= MIN_CONFIDENCE:
                accion = "agregar_al_perfil"
            elif confianza < MIN_CONFIDENCE:
                accion = "conflicto_detectado"
            else:
                accion = "requiere_mas_ejemplos"

            sugerencias.append({
                "tipo": "abreviatura",
                "campo": "tratamientos.molecula",
                "origen": orig,
                "destino": dest,
                "ocurrencias": ocurrencias,
                "confianza": confianza,
                "accion_sugerida": accion
            })

    # Evaluar reglas de aceptación para Diagnósticos
    for orig, destinos in transformaciones_diagnosticos.items():
        total_apariciones_origen = sum(destinos.values())
        for dest, ocurrencias in destinos.items():
            confianza = round(ocurrencias / total_apariciones_origen, 2)
            
            if ocurrencias >= MIN_OCCURRENCES and confianza >= MIN_CONFIDENCE:
                accion = "agregar_al_perfil"
            elif confianza < MIN_CONFIDENCE:
                accion = "conflicto_detectado"
            else:
                accion = "requiere_mas_ejemplos"

            sugerencias.append({
                "tipo": "sinonimo_diagnostico",
                "campo": "enfermedad.diagnostico",
                "origen": orig,
                "destino": dest,
                "ocurrencias": ocurrencias,
                "confianza": confianza,
                "accion_sugerida": accion
            })

    # Ordenar sugerencias por ocurrencias desc
    sugerencias.sort(key=lambda x: x["ocurrencias"], reverse=True)

    reporte = {
        "medico_id": medico_id,
        "fecha_analisis": datetime.now().isoformat(),
        "estadisticas_generales": {
            "total_eventos_feedback": total_eventos,
            "total_campos_corregidos": total_campos_corregidos,
            "frecuencia_campos": dict(frecuencia_campos)
        },
        "sugerencias": sugerencias
    }

    _save_suggestions(medico_id, reporte)
    return reporte


def _save_suggestions(medico_id: str, reporte: Dict[str, Any]):
    """Guarda las sugerencias en ./data/perfiles_medicos/{medico_id}_suggestions.json sin tocar el perfil activo."""
    try:
        os.makedirs(PROFILES_DIR, exist_ok=True)
        file_path = os.path.join(PROFILES_DIR, f"{medico_id}_suggestions.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(reporte, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[WARN] Error al guardar sugerencias para {medico_id}: {e}")
