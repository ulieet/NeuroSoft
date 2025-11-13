# app/api/importaciones.py
from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import json
from datetime import datetime
from typing import Dict, Any
import hashlib

from app.services import nlp_service

router = APIRouter()

UPLOAD_DIR = "./uploads"
DATA_DIR = "./data/historias"


def build_dedup_key(borrador: dict) -> str:
    """
    Construye una 'huella clínica' para detectar historias duplicadas,
    independiente del archivo (PDF, Word, etc.).
    """
    paciente = borrador.get("paciente", {}) or {}
    consulta = borrador.get("consulta", {}) or {}
    enf = borrador.get("enfermedad", {}) or {}

    dni = (paciente.get("dni") or "").strip()
    fecha_consulta = (consulta.get("fecha") or "").strip()
    dx = (enf.get("diagnostico") or "").strip().lower()

    # Caso 1: tenemos DNI y fecha -> llave fuerte
    if dni and fecha_consulta:
        return f"DNI:{dni}|F:{fecha_consulta}"

    # Caso 2: no hay DNI (como en tu modelo actual)
    # Usamos fecha + diagnóstico + hash del texto original
    texto = (borrador.get("texto_original") or "").strip().lower()
    h = hashlib.sha256(texto.encode("utf-8")).hexdigest() if texto else ""
    return f"F:{fecha_consulta}|DX:{dx}|H:{h}"


@router.post("/importaciones/historias", summary="Importar Historia Clínica")
async def importar_historia(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".docx", ".pdf"]:
        raise HTTPException(status_code=415, detail="Formato no permitido. Solo .docx o .pdf")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    new_filename = f"historia_{ts}{ext}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)

    # 1) Guardar archivo físico
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    # 2) Procesar con NLP (4.2)
    borrador = nlp_service.process(file_path)

    # 3) Construir huella clínica para detectar duplicados
    dedup_key = build_dedup_key(borrador)

    # 4) Verificar si ya existe una historia con esta huella
    for fname in os.listdir(DATA_DIR):
        if not fname.endswith(".json"):
            continue
        with open(os.path.join(DATA_DIR, fname), "r", encoding="utf-8") as f:
            h: Dict[str, Any] = json.load(f)
            if h.get("dedup_key") == dedup_key:
                # BORRAMOS el archivo recien subido porque no lo vamos a usar
                try:
                    os.remove(file_path)
                except OSError:
                    pass
                raise HTTPException(
                    status_code=409,
                    detail="Esta historia clínica ya fue importada previamente (misma consulta)."
                )

    # 5) Armar objeto historia pendiente de validación
    historia = {
        "id": ts,
        "estado": "pendiente_validacion",
        "dedup_key": dedup_key,
        "borrador": borrador,
        "validada": None
    }

    # 6) Guardar historia en JSON
    historia_path = os.path.join(DATA_DIR, f"{ts}.json")
    with open(historia_path, "w", encoding="utf-8") as f:
        json.dump(historia, f, ensure_ascii=False, indent=2)

    # 7) Respuesta al frontend / Swagger
    return {
        "id_importacion": ts,
        "nombre_archivo": new_filename,
        "estado": "pendiente_validacion",
        "ruta": file_path,
        "borrador": borrador
    }
