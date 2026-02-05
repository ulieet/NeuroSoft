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
    Construye una 'huella clínica' única.
    Ahora incluye SIEMPRE un hash del contenido para permitir 
    varios archivos del mismo paciente/fecha si son distintos documentos.
    """
    paciente = borrador.get("paciente", {}) or {}
    consulta = borrador.get("consulta", {}) or {}
    enf = borrador.get("enfermedad", {}) or {}

    dni = (paciente.get("dni") or "").strip()
    fecha_consulta = (consulta.get("fecha") or "").strip()
    dx = (enf.get("diagnostico") or "").strip().lower()
    
    # Generamos una firma corta del contenido (primeros 10 caracteres del hash)
    texto = (borrador.get("texto_original") or "").strip().lower()
    h = hashlib.sha256(texto.encode("utf-8")).hexdigest()[:10] if texto else "vac"

    # Caso 1: tenemos DNI y fecha
    if dni and fecha_consulta:
        # ANTES: return f"DNI:{dni}|F:{fecha_consulta}"
        # AHORA: Agregamos el hash |H:{h} para diferenciar documentos
        return f"DNI:{dni}|F:{fecha_consulta}|H:{h}"

    # Caso 2: no hay DNI
    return f"F:{fecha_consulta}|DX:{dx}|H:{h}"


@router.post("/importaciones/historias", summary="Importar Historia Clínica")
async def importar_historia(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    # Permitimos .doc, .docx y .pdf
    if ext not in [".docx", ".pdf", ".doc"]:
        raise HTTPException(status_code=415, detail="Formato no permitido. Solo .doc, .docx o .pdf")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Agregamos un sufijo aleatorio para evitar colisiones de nombre en uploads muy rápidos
    random_suffix = hashlib.md5(file.filename.encode()).hexdigest()[:4]
    new_filename = f"historia_{ts}_{random_suffix}{ext}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)

    # 1) Guardar archivo físico
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    # 2) Procesar con NLP
    try:
        borrador = nlp_service.process(file_path)
    except Exception as e:
        # Si falla el NLP, borramos el archivo y avisamos
        os.remove(file_path)
        print(f"Error procesando NLP: {e}")
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {str(e)}")

    # 3) Construir huella clínica
    dedup_key = build_dedup_key(borrador)

    # 4) Verificar si ya existe (ahora será más permisivo)
    for fname in os.listdir(DATA_DIR):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(DATA_DIR, fname), "r", encoding="utf-8") as f:
                h_existente = json.load(f)
                if h_existente.get("dedup_key") == dedup_key:
                    # Es IDÉNTICO en contenido y fecha -> Duplicado real
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=409,
                        detail="Este documento exacto ya fue importado previamente."
                    )
        except json.JSONDecodeError:
            continue # Ignorar archivos corruptos

    # 5) Armar objeto historia
    historia = {
        "id": ts + "_" + random_suffix, # ID compuesto para evitar choque en batch
        "estado": "pendiente_validacion",
        "dedup_key": dedup_key,
        "borrador": borrador,
        "validada": None
    }

    # 6) Guardar historia en JSON
    historia_path = os.path.join(DATA_DIR, f"{historia['id']}.json")
    with open(historia_path, "w", encoding="utf-8") as f:
        json.dump(historia, f, ensure_ascii=False, indent=2)

    return {
        "id_importacion": historia["id"],
        "nombre_archivo": new_filename,
        "estado": "pendiente_validacion",
        "borrador": borrador
    }