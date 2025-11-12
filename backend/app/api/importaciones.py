# app/api/importaciones.py
from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import json
from datetime import datetime
from app.services import nlp_service

router = APIRouter()
UPLOAD_DIR = "./uploads"
DATA_DIR = "./data/historias"


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

    # 3) Armar objeto historia pendiente de validación
    historia = {
        "id": ts,
        "estado": "pendiente_validacion",
        "borrador": borrador,
        "validada": None
    }

    # 4) Guardar historia en JSON
    historia_path = os.path.join(DATA_DIR, f"{ts}.json")
    with open(historia_path, "w", encoding="utf-8") as f:
        json.dump(historia, f, ensure_ascii=False, indent=2)

    # 5) Respuesta al frontend
    return {
        "id_importacion": ts,
        "nombre_archivo": new_filename,
        "estado": "pendiente_validacion",
        "ruta": file_path,
        "borrador": borrador
    }
