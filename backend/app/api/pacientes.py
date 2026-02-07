# backend/app/api/pacientes.py
# (Este ya lo tienes bien, solo confírmalo)
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services import patient_service

router = APIRouter()

@router.get("/pacientes", summary="Listar todos los pacientes")
def listar_pacientes():
    pacientes = patient_service.get_all_pacientes()
    return {
        "total": len(pacientes),
        "items": pacientes
    }

@router.get("/pacientes/{id_paciente}", summary="Obtener detalle de paciente")
def obtener_paciente(id_paciente: str):
    paciente = patient_service.get_paciente_by_id(id_paciente)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return paciente


@router.delete("/pacientes/{id_paciente}", summary="Eliminar paciente permanentemente")
def eliminar_paciente(id_paciente: str):
    exito = patient_service.delete_paciente_by_id(id_paciente)
    if not exito:
        raise HTTPException(status_code=404, detail="Paciente no encontrado o no se pudo eliminar")
    return {"mensaje": "Paciente eliminado correctamente", "id": id_paciente}


# backend/app/api/pacientes.py

@router.put("/pacientes/{id_paciente}")
def actualizar_paciente(id_paciente: str, data: Dict[str, Any]):
    paciente = patient_service.update_paciente(id_paciente, data)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return paciente




    # backend/app/api/pacientes.py

@router.post("/pacientes")
def registrar_paciente(data: Dict[str, Any]):
    paciente = patient_service.crear_paciente_manual(data)
    if not paciente:
        raise HTTPException(status_code=400, detail="Error al crear el registro")
    return paciente