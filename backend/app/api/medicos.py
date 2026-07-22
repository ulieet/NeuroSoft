from fastapi import APIRouter, HTTPException, Body
import os
import json
from typing import Dict, Any
from app.services.feedback_analyzer import analyze_feedback, FEEDBACK_DIR, PROFILES_DIR
from app.services import profile_service

router = APIRouter()

@router.get("/medicos/{medico_id}/sugerencias", summary="Obtener reporte de sugerencias de perfil (Solo Lectura)")
def obtener_sugerencias(medico_id: str):
    """
    Analiza el feedback acumulado del médico y devuelve el informe auditado de sugerencias de actualización
    en ./data/perfiles_medicos/{medico_id}_suggestions.json sin modificar el perfil activo.
    """
    try:
        reporte = analyze_feedback(medico_id)
        return reporte
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al analizar feedback del médico: {str(e)}")

@router.get("/medicos/{medico_id}/feedback", summary="Obtener historial crudo de feedback")
def obtener_feedback_crudo(medico_id: str):
    """
    Devuelve los eventos de feedback crudos almacenados en ./data/feedback_medicos/{medico_id}_feedback.json.
    """
    feedback_file = os.path.join(FEEDBACK_DIR, f"{medico_id}_feedback.json")
    if not os.path.exists(feedback_file):
        return {"medico_id": medico_id, "total_eventos": 0, "eventos": []}
    
    try:
        with open(feedback_file, "r", encoding="utf-8") as f:
            eventos = json.load(f)
            return {"medico_id": medico_id, "total_eventos": len(eventos), "eventos": eventos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer feedback: {str(e)}")

@router.get("/medicos/{medico_id}/perfil", summary="Obtener el perfil activo del médico")
def obtener_perfil_activo(medico_id: str):
    """
    Devuelve el perfil activo runtime del médico almacenado en ./data/perfiles_medicos/{medico_id}.json.
    """
    try:
        perfil = profile_service.get_active_profile(medico_id)
        return perfil
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el perfil activo: {str(e)}")

@router.get("/medicos/{medico_id}/historial", summary="Obtener el historial de auditoría de cambios del perfil")
def obtener_historial_perfil(medico_id: str):
    """
    Devuelve el historial de aprobaciones/rechazos del perfil en ./data/perfiles_medicos/{medico_id}_history.json.
    """
    history_file = os.path.join(PROFILES_DIR, f"{medico_id}_history.json")
    if not os.path.exists(history_file):
        return {"medico_id": medico_id, "total_cambios": 0, "historial": []}
    
    try:
        with open(history_file, "r", encoding="utf-8") as f:
            historial = json.load(f)
            return {"medico_id": medico_id, "total_cambios": len(historial), "historial": historial}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer historial: {str(e)}")

@router.post("/medicos/{medico_id}/sugerencias/aprobar", summary="Aprobar una sugerencia individual")
def aprobar_sugerencia(medico_id: str, sugerencia: Dict[str, Any] = Body(...)):
    """
    Aprueba una sugerencia de regla:
    1. Actualiza el perfil activo en perfiles_medicos/{medico_id}.json
    2. Incremente la versión del perfil
    3. Registra en el historial de auditoría perfiles_medicos/{medico_id}_history.json
    """
    try:
        resultado = profile_service.approve_suggestion(medico_id, sugerencia, aprobado_por=medico_id)
        return resultado
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al aprobar sugerencia: {str(e)}")

from app.services import eval_service

@router.post("/medicos/{medico_id}/evaluar", summary="Evaluación A/B Testing de efectividad del perfil (Sin afectar producción)")
def evaluar_efectividad_perfil(medico_id: str, file_path: str = Body(..., embed=True)):
    """
    Modo Evaluación A/B:
    Procesa un documento en Modo A (Baseline sin perfil) vs Modo B (Con perfil activo)
    y retorna la comparación detallada de reglas aplicadas, diferencias y tiempos.
    """
    try:
        resultado = eval_service.evaluar_historia(file_path, medico_id=medico_id)
        return resultado
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en evaluación A/B: {str(e)}")
