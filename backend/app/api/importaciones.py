from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
import os
import json
import shutil
import uuid
import time
import zipfile
import hashlib
from datetime import datetime
from typing import List, Optional, Dict, Any

from app.services import nlp_service, patient_service 

router = APIRouter()

UPLOAD_DIR = "./uploads"
DATA_DIR = "./data/historias"
JOBS_DIR = "./data/jobs"


def build_dedup_key(borrador: dict) -> str:
    paciente = borrador.get("paciente", {}) or {}
    consulta = borrador.get("consulta", {}) or {}
    enf = borrador.get("enfermedad", {}) or {}

    dni = (paciente.get("dni") or "").strip()
    fecha_consulta = (consulta.get("fecha") or "").strip()
    dx = (enf.get("diagnostico") or "").strip().lower()
    
    texto = (borrador.get("texto_original") or "").strip().lower()
    h = hashlib.sha256(texto.encode("utf-8")).hexdigest()[:10] if texto else "vac"

    if dni and fecha_consulta:
        return f"DNI:{dni}|F:{fecha_consulta}|H:{h}"

    return f"F:{fecha_consulta}|DX:{dx}|H:{h}"


def procesar_job_lote_bg(job_id: str, upload_dir_for_job: str, files_metadata: list):
    # files_metadata tiene [{"filename": "...", "temp_path": "..."}]
    print(f"[JOB LOG {job_id}] ===== INICIO DE JOB DE IMPORTACIÓN =====")
    
    # Asegurar directorios
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(JOBS_DIR, exist_ok=True)

    job_status_path = os.path.join(JOBS_DIR, f"{job_id}.json")
    
    def save_job_status(status_dict):
        try:
            with open(job_status_path, "w", encoding="utf-8") as f:
                json.dump(status_dict, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[JOB LOG {job_id}] Error escribiendo estado del job: {e}")
            
    job_state = {
        "job_id": job_id,
        "status": "processing",
        "total": 0,
        "processed": 0,
        "successful": 0,
        "failed": 0,
        "successes": {},  # filename -> {paciente, fecha, diagnostico}
        "errors": []      # list of {filename, error}
    }
    save_job_status(job_state)

    try:
        all_files = []
        
        def is_allowed(fname):
            return os.path.splitext(fname)[1].lower() in [".doc", ".docx", ".pdf"]
            
        # 1. Desempaquetar ZIPs si existen
        for meta in files_metadata:
            filename = meta["filename"]
            temp_path = meta["temp_path"]
            
            ext = os.path.splitext(filename)[1].lower()
            if ext == ".zip":
                print(f"[JOB LOG {job_id}] Desempaquetando ZIP: {filename}")
                extract_dir = os.path.join(upload_dir_for_job, f"extracted_{uuid.uuid4().hex[:6]}")
                os.makedirs(extract_dir, exist_ok=True)
                try:
                    with zipfile.ZipFile(temp_path, 'r') as zip_ref:
                        zip_ref.extractall(extract_dir)
                    
                    for root, dirs, files in os.walk(extract_dir):
                        for file in files:
                            if is_allowed(file):
                                src_path = os.path.join(root, file)
                                unique_name = f"extracted_{int(time.time() * 1000)}_{uuid.uuid4().hex[:4]}_{file}"
                                dest_path = os.path.join(upload_dir_for_job, unique_name)
                                shutil.move(src_path, dest_path)
                                all_files.append({"filename": file, "path": dest_path})
                except Exception as e:
                    print(f"[JOB LOG {job_id}] Error al descomprimir zip {filename}: {e}")
                    job_state["errors"].append({
                        "filename": filename,
                        "error": f"Error descomprimiendo archivo ZIP: {str(e)}"
                    })
            elif is_allowed(filename):
                all_files.append({"filename": filename, "path": temp_path})
            else:
                try:
                    os.remove(temp_path)
                except:
                    pass

        total_files = len(all_files)
        job_state["total"] = total_files
        save_job_status(job_state)
        print(f"[JOB LOG {job_id}] Total de archivos a procesar: {total_files}")
        
        if total_files == 0:
            print(f"[JOB LOG {job_id}] No hay archivos válidos para procesar.")
            job_state["status"] = "completed"
            save_job_status(job_state)
            try:
                shutil.rmtree(upload_dir_for_job)
            except:
                pass
            return
            
        # Procesar archivos secuencialmente con nlp_service (Ollama + Reglas)
        for idx, file_meta in enumerate(all_files, start=1):
            orig_filename = file_meta["filename"]
            orig_path = file_meta["path"]
            print(f"[JOB LOG {job_id}] [{idx}/{total_files}] Procesando archivo: {orig_filename}")
            
            try:
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                random_suffix = hashlib.md5(orig_filename.encode()).hexdigest()[:4]
                perm_filename = f"historia_{ts}_{random_suffix}{os.path.splitext(orig_filename)[1].lower()}"
                perm_path = os.path.join(UPLOAD_DIR, perm_filename)
                shutil.copy(orig_path, perm_path)
                print(f"[JOB LOG {job_id}] Archivo copiado a UPLOAD_DIR: {perm_path}")
                
                print(f"[JOB LOG {job_id}] Invocando nlp_service.process()...")
                t_nlp0 = time.time()
                borrador = nlp_service.process(perm_path)
                t_nlp_elapsed = round(time.time() - t_nlp0, 2)
                print(f"[JOB LOG {job_id}] Extracción NLP completada en {t_nlp_elapsed}s.")
                
                if borrador.get("paciente"):
                    patient_service.upsert_paciente_from_nlp(borrador["paciente"])
                    print(f"[JOB LOG {job_id}] Paciente maestro actualizado/creado.")
                    
                dedup_key = build_dedup_key(borrador)
                
                is_dup = False
                for fname in os.listdir(DATA_DIR):
                    if not fname.endswith(".json"):
                        continue
                    try:
                        with open(os.path.join(DATA_DIR, fname), "r", encoding="utf-8") as f:
                            h_existente = json.load(f)
                            if h_existente.get("dedup_key") == dedup_key:
                                is_dup = True
                                break
                    except:
                        continue
                        
                if is_dup:
                    print(f"[JOB LOG {job_id}] Documento omitido por ser duplicado exacto.")
                    job_state["processed"] += 1
                    job_state["failed"] += 1
                    job_state["errors"].append({
                        "filename": orig_filename,
                        "error": "Este documento ya fue importado previamente (duplicado)."
                    })
                    save_job_status(job_state)
                    continue
                    
                historia = {
                    "id": ts + "_" + random_suffix,
                    "estado": "pendiente_validacion",
                    "dedup_key": dedup_key,
                    "borrador": borrador,
                    "validada": None
                }
                
                historia_path = os.path.join(DATA_DIR, f"{historia['id']}.json")
                with open(historia_path, "w", encoding="utf-8") as f:
                    json.dump(historia, f, ensure_ascii=False, indent=2)
                print(f"[JOB LOG {job_id}] Historia clínica persistida en {historia_path}")
                    
                summary = {
                    "paciente": borrador.get("paciente", {}).get("nombre") or "No detectado",
                    "fecha": borrador.get("consulta", {}).get("fecha") or "No detectada",
                    "diagnostico": borrador.get("enfermedad", {}).get("diagnostico") or "No detectado"
                }
                job_state["successes"][orig_filename] = summary
                
                job_state["processed"] += 1
                job_state["successful"] += 1
                print(f"[JOB LOG {job_id}] Progreso actualizado: {job_state['processed']}/{total_files} procesados.")
            except Exception as ex:
                print(f"[JOB LOG {job_id}] ERROR procesando archivo {orig_filename}: {ex}")
                job_state["processed"] += 1
                job_state["failed"] += 1
                job_state["errors"].append({
                    "filename": orig_filename,
                    "error": f"Falla de extracción individual: {str(ex)}"
                })
            save_job_status(job_state)
                
        # Marcar completado
        job_state["status"] = "completed"
        save_job_status(job_state)
        print(f"[JOB LOG {job_id}] ===== JOB FINALIZADO CON ÉXITO ({job_state['successful']} exitosos, {job_state['failed']} fallidos) =====")
        
        try:
            shutil.rmtree(upload_dir_for_job)
        except:
            pass

    except Exception as global_ex:
        print(f"[JOB LOG {job_id}] CRITICAL ERROR GLOBAL EN JOB: {global_ex}")
        job_state["status"] = "failed"
        job_state["errors"].append({"error_global": str(global_ex)})
        save_job_status(job_state)


@router.post("/importaciones/historias", summary="Importar Historia Clínica")
async def importar_historia(
    file: UploadFile = File(...),
    medico_id: Optional[str] = Form(None)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".docx", ".pdf", ".doc"]:
        raise HTTPException(status_code=415, detail="Formato no permitido. Solo .doc, .docx o .pdf")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    random_suffix = hashlib.md5(file.filename.encode()).hexdigest()[:4]
    new_filename = f"historia_{ts}_{random_suffix}{ext}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    try:
        borrador = nlp_service.process(file_path, medico_id=medico_id)
    except Exception as e:
        os.remove(file_path)
        print(f"Error procesando NLP: {e}")
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {str(e)}")

    try:
        if borrador.get("paciente"):
            patient_service.upsert_paciente_from_nlp(borrador["paciente"])
    except Exception as e:
        print(f"Advertencia: No se pudo guardar el paciente maestro: {e}")

    dedup_key = build_dedup_key(borrador)

    for fname in os.listdir(DATA_DIR):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(DATA_DIR, fname), "r", encoding="utf-8") as f:
                h_existente = json.load(f)
                if h_existente.get("dedup_key") == dedup_key:
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=409,
                        detail="Este documento exacto ya fue importado previamente."
                    )
        except json.JSONDecodeError:
            continue

    historia = {
        "id": ts + "_" + random_suffix,
        "estado": "pendiente_validacion",
        "dedup_key": dedup_key,
        "borrador": borrador,
        "validada": None
    }

    historia_path = os.path.join(DATA_DIR, f"{historia['id']}.json")
    with open(historia_path, "w", encoding="utf-8") as f:
        json.dump(historia, f, ensure_ascii=False, indent=2)

    return {
        "id_importacion": historia["id"],
        "nombre_archivo": new_filename,
        "estado": "pendiente_validacion",
        "borrador": borrador
    }


@router.post("/importaciones/lote", summary="Importar Lote de Historias Clínicas (ZIP o Múltiples Archivos)")
async def importar_lote(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...)
):
    job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:4]}"
    job_dir = os.path.join(UPLOAD_DIR, "jobs", job_id)
    os.makedirs(job_dir, exist_ok=True)
    os.makedirs(JOBS_DIR, exist_ok=True)
    
    files_metadata = []
    
    for file in files:
        safe_filename = os.path.basename(file.filename)
        temp_path = os.path.join(job_dir, safe_filename)
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())
        files_metadata.append({
            "filename": safe_filename,
            "temp_path": temp_path
        })
        
    initial_status = {
        "job_id": job_id,
        "status": "received",
        "total": 0,
        "processed": 0,
        "successful": 0,
        "failed": 0,
        "successes": {},
        "errors": []
    }
    
    job_status_path = os.path.join(JOBS_DIR, f"{job_id}.json")
    with open(job_status_path, "w", encoding="utf-8") as f:
        json.dump(initial_status, f, ensure_ascii=False, indent=2)
        
    background_tasks.add_task(procesar_job_lote_bg, job_id, job_dir, files_metadata)
    
    return {
        "job_id": job_id,
        "status": "processing",
        "message": "El lote ha sido recibido y se está procesando en segundo plano."
    }


@router.get("/importaciones/job/{job_id}", summary="Obtener Estado de un Job de Importación")
async def obtener_estado_job(job_id: str):
    job_status_path = os.path.join(JOBS_DIR, f"{job_id}.json")
    if not os.path.exists(job_status_path):
        raise HTTPException(status_code=404, detail="Job no encontrado.")
        
    try:
        with open(job_status_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer el estado del job: {str(e)}")