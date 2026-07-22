import os
import time
import json
from typing import Dict, Any, Optional
from app.services import nlp_service, profile_service

def evaluar_historia(file_path: str, medico_id: str = "dr_default") -> Dict[str, Any]:
    """
    Modo Evaluación (A/B Testing):
    - Modo A: Procesa la historia SIN aplicar el perfil activo (Baseline).
    - Modo B: Procesa la historia APLICANDO la Capa 1 del Perfil Activo.
    Retorna la comparación cuantitativa de resultados, reglas aplicadas y tiempos.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Archivo no encontrado: {file_path}")

    # --- MODO A: Sin Perfil (Baseline) ---
    t0_a = time.time()
    # Para desactivar temporalmente la Capa 1, se pasa medico_id "__disabled__"
    borrador_a = nlp_service.process(file_path, medico_id="__disabled__")
    t_a = round((time.time() - t0_a) * 1000, 2)

    # --- MODO B: Con Perfil Activo del Médico ---
    t0_b = time.time()
    borrador_b = nlp_service.process(file_path, medico_id=medico_id)
    t_b = round((time.time() - t0_b) * 1000, 2)

    meta_b = borrador_b.get("meta_perfil", {})
    reglas_aplicadas = meta_b.get("reglas_aplicadas", [])

    # Detección de cambios específicos en el borrador entre Modo A y Modo B
    diferencias = []
    
    # Comparar fármacos extraídos
    trats_a = [t.get("molecula") or t.get("droga") for t in borrador_a.get("tratamientos", [])]
    trats_b = [t.get("molecula") or t.get("droga") for t in borrador_b.get("tratamientos", [])]
    if trats_a != trats_b:
        diferencias.append({
            "campo": "tratamientos.molecula",
            "modo_a_baseline": trats_a,
            "modo_b_con_perfil": trats_b
        })

    # Comparar diagnóstico
    dx_a = borrador_a.get("enfermedad", {}).get("diagnostico")
    dx_b = borrador_b.get("enfermedad", {}).get("diagnostico")
    if dx_a != dx_b:
        diferencias.append({
            "campo": "enfermedad.diagnostico",
            "modo_a_baseline": dx_a,
            "modo_b_con_perfil": dx_b
        })

    perfil_activo = profile_service.get_active_profile(medico_id)

    return {
        "archivo": os.path.basename(file_path),
        "medico_id": medico_id,
        "version_perfil_activo": perfil_activo.get("version", 1),
        "resumen_comparativo": {
            "tiempo_modo_a_ms": t_a,
            "tiempo_modo_b_ms": t_b,
            "cantidad_reglas_aplicadas": len(reglas_aplicadas),
            "diferencias_detectadas_count": len(diferencias)
        },
        "reglas_aplicadas": reglas_aplicadas,
        "diferencias_campo_a_campo": diferencias,
        "borrador_modo_a": borrador_a,
        "borrador_modo_b": borrador_b
    }
