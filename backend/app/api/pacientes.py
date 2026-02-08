from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import os
import json
from app.services import patient_service

router = APIRouter()

# Rutas de almacenamiento (asegúrate de que coincidan con tu estructura)
PATH_HISTORIAS = "./data/historias"

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

@router.delete("/pacientes/{id_paciente}", summary="Eliminar paciente e historias asociadas")
def eliminar_paciente(id_paciente: str):
    # 1. Primero obtenemos los datos del paciente para saber su DNI
    paciente = patient_service.get_paciente_by_id(id_paciente)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    dni_objetivo = paciente.get("dni")

    # 2. Lógica de Borrado en Cascada: Buscamos y borramos sus historias clínicas
    if dni_objetivo:
        try:
            if os.path.exists(PATH_HISTORIAS):
                archivos = os.listdir(PATH_HISTORIAS)
                for archivo in archivos:
                    if archivo.endswith(".json"):
                        ruta_h = os.path.join(PATH_HISTORIAS, archivo)
                        with open(ruta_h, "r", encoding="utf-8") as f_h:
                            historia_raw = json.load(f_h)
                            # Verificamos DNI en 'validada' o 'borrador'
                            h_info = historia_raw.get("validada") or historia_raw.get("borrador") or {}
                            dni_en_historia = h_info.get("paciente", {}).get("dni")
                            
                            # Si coinciden, borramos el archivo de la historia
                            if str(dni_en_historia) == str(dni_objetivo):
                                os.remove(ruta_h)
        except Exception as e:
            print(f"Error al limpiar historias en cascada: {e}")

    # 3. Finalmente eliminamos al paciente del registro
    exito = patient_service.delete_paciente_by_id(id_paciente)
    if not exito:
        raise HTTPException(status_code=500, detail="Error al eliminar el registro del paciente")
    
    return {
        "mensaje": "Paciente e historias asociadas eliminados correctamente",
        "id": id_paciente,
        "dni": dni_objetivo
    }

@router.put("/pacientes/{id_paciente}", summary="Actualizar datos de paciente")
def actualizar_paciente(id_paciente: str, data: Dict[str, Any]):
    paciente = patient_service.update_paciente(id_paciente, data)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return paciente

@router.post("/pacientes", summary="Registrar paciente manualmente")
def registrar_paciente(data: Dict[str, Any]):
    # El service debería encargarse de generar el ID y guardar el JSON
    paciente = patient_service.crear_paciente_manual(data)
    if not paciente:
        raise HTTPException(status_code=400, detail="Error al crear el registro del paciente")
    return paciente