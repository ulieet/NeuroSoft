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
            h = json.load(f)
            borr = h.get("borrador", {})
            enf = borr.get("enfermedad", {})
            paciente = borr.get("paciente", {})
            items.append({
                "id": h.get("id"),
                "estado": h.get("estado"),
                "paciente": paciente,
                "diagnostico": enf.get("diagnostico"),
                "forma": enf.get("forma"),
                "fecha_consulta": borr.get("consulta", {}).get("fecha"),
            })

    return {
        "total": len(items),
        "items": items
    }


@router.get("/historias/{id_historia}/borrador", summary="Obtener borrador para validación")
def obtener_borrador(id_historia: str):
    h = _load_historia(id_historia)
    return {
        "id": h["id"],
        "estado": h["estado"],
        "borrador": h.get("borrador"),
        "validada": h.get("validada")
    }


@router.patch("/historias/{id_historia}/validacion", summary="Validar y corregir historia")
def validar_historia(id_historia: str, historia_validada: Dict[str, Any]):
    """
    historia_validada: objeto con la historia ya corregida por el médico.
    Puede tener la misma estructura que 'borrador', pero ajustada.
    """
    h = _load_historia(id_historia)

    h["validada"] = historia_validada
    h["estado"] = "validada"

    _save_historia(h)

    return {
        "id": h["id"],
        "estado": h["estado"],
        "validada": h["validada"]
    }
