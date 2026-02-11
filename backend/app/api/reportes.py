from fastapi import APIRouter
from app.services import report_service

router = APIRouter()

@router.get("/general", summary="Obtener estadísticas globales de la cohorte")
def obtener_reporte_general():
    """
    Este endpoint activa el escaneo de todas las historias clínicas 
    para devolver los datos agregados en tiempo real.
    """
    return report_service.generar_estadisticas_generales()