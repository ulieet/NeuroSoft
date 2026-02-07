# app/api/historias.py
from fastapi import APIRouter, HTTPException
import os
import json
from typing import List, Dict, Any

DATA_DIR = "./data/historias"

router = APIRouter()

def _load_historia(id_historia: str) -> Dict[str, Any]:
    path = os.path.join(DATA_DIR, f"{id_historia}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Historia no encontrada")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_historia(historia: Dict[str, Any]):
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, f"{historia['id']}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(historia, f, ensure_ascii=False, indent=2)

@router.get("/historias", summary="Listar historias clínicas")
def listar_historias():
    if not os.path.exists(DATA_DIR):
        return {"total": 0, "items": []}

    items: List[Dict[str, Any]] = []
    for fname in os.listdir(DATA_DIR):
        if not fname.endswith(".json"):
            continue
        with open(os.path.join(DATA_DIR, fname), "r", encoding="utf-8") as f:
            try:
                h = json.load(f)
                # Priorizamos la data validada
                data_source = h.get("validada") or h.get("borrador") or {}
                enf = data_source.get("enfermedad", {})
                paciente = data_source.get("paciente", {})
                consulta = data_source.get("consulta", {})

                items.append({
                    "id": h.get("id"),
                    "estado": h.get("estado", "pendiente"),
                    "nivel_criticidad": h.get("nivel_criticidad", "medio"),
                    "paciente": paciente,
                    "diagnostico": enf.get("diagnostico"),
                    "forma": enf.get("forma"),
                    "fecha_consulta": consulta.get("fecha"),
                })
            except:
                continue

    return {
        "total": len(items),
        "items": items
    }



@router.get("/historias/{id_historia}/borrador", summary="Obtener borrador")
def obtener_borrador(id_historia: str):
    h = _load_historia(id_historia)
    return {
        "id": h["id"],
        "estado": h.get("estado", "pendiente"),
        "nivel_criticidad": h.get("nivel_criticidad", "medio"),
        "borrador": h.get("borrador"),
        "validada": h.get("validada")
    }

@router.patch("/historias/{id_historia}/validacion", summary="Validar historia individual")
def validar_historia(id_historia: str, historia_validada: Dict[str, Any]):
    h = _load_historia(id_historia)
    h["validada"] = historia_validada
    h["estado"] = historia_validada.get("estado", "validada") 
    h["nivel_criticidad"] = historia_validada.get("nivel_criticidad", "medio")
    _save_historia(h)
    return {"id": h["id"], "estado": h["estado"], "validada": h["validada"]}


@router.delete("/historias/{id_historia}", summary="Eliminar una historia clínica permanentemente")
def eliminar_historia(id_historia: str):
    path = os.path.join(DATA_DIR, f"{id_historia}.json")
    
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Historia no encontrada")
    
    try:
        os.remove(path)
        return {"mensaje": "Historia eliminada correctamente", "id": id_historia}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar el archivo: {str(e)}")

# --- NUEVO ENDPOINT PARA VALIDACIÓN MASIVA ---
@router.post("/historias/validacion-masiva", summary="Aprobar todos los pendientes")
def validar_todas_las_historias():
    if not os.path.exists(DATA_DIR):
        return {"procesadas": 0, "mensaje": "No hay directorio"}

    count = 0
    for fname in os.listdir(DATA_DIR):
        if not fname.endswith(".json"):
            continue
        
        path = os.path.join(DATA_DIR, fname)
        with open(path, "r", encoding="utf-8") as f:
            h = json.load(f)
        
        # Si no está validada, la aprobamos automáticamente
        if h.get("estado") != "validada":
            borrador = h.get("borrador")
            if borrador:
                h["validada"] = borrador
                h["estado"] = "validada"
                if "nivel_criticidad" not in h:
                    h["nivel_criticidad"] = "medio"
                
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(h, f, ensure_ascii=False, indent=2)
                count += 1

    return {"procesadas": count, "mensaje": "Validación masiva completada"}