# backend/app/api/reportes.py
from fastapi import APIRouter
from app.services import report_service

router = APIRouter()

@router.get("/reportes/general", summary="Estadísticas globales")
def obtener_reporte_general():
    return report_service.generar_estadisticas_generales()