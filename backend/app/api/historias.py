from fastapi import APIRouter, HTTPException, Body
import os
import json
import uuid
from typing import List, Dict, Any
from fastapi.responses import FileResponse 

DATA_DIR = "./data/historias"
UPLOAD_DIR = "./uploads"  

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

# --- NUEVO: Endpoint para guardar historia manual ---
@router.post("/historias", summary="Crear nueva historia clínica manual")
def crear_historia(historia: Dict[str, Any] = Body(...)):
    # 1. Generar ID si no existe
    if "id" not in historia or not historia["id"]:
        historia["id"] = str(uuid.uuid4())
    
    # 2. Asegurar campos mínimos
    if "estado" not in historia:
        historia["estado"] = "pendiente"
        
    # 3. Guardar
    try:
        _save_historia(historia)
        return historia
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar historia: {str(e)}")

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
                
                # Intentamos obtener datos de estructura importada (anidada)
                data_source = h.get("validada") or h.get("borrador") or {}
                enf = data_source.get("enfermedad", {})
                paciente = data_source.get("paciente", {})
                consulta = data_source.get("consulta", {})
                
                # Si no hay estructura anidada, buscamos en la raíz (historia manual)
                paciente_final = paciente if paciente else h.get("paciente_snapshot", {})
                diagnostico_final = enf.get("diagnostico") if enf.get("diagnostico") else h.get("diagnostico")
                forma_final = enf.get("forma") if enf.get("forma") else h.get("formaEvolutiva")
                fecha_final = consulta.get("fecha") if consulta.get("fecha") else h.get("fecha")

                items.append({
                    "id": h.get("id"),
                    "estado": h.get("estado", "pendiente"),
                    "nivel_criticidad": h.get("nivel_criticidad", "medio"),
                    "paciente": paciente_final,
                    "diagnostico": diagnostico_final,
                    "forma": forma_final,
                    "fecha_consulta": fecha_final,
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
    
    # Si la historia es manual (plana), simulamos la estructura "borrador"
    # para que el frontend (vista detalle) pueda leerla sin romperse.
    if "borrador" not in h and "validada" not in h:
        borrador_simulado = {
            "paciente": h.get("paciente_snapshot", {}),
            "enfermedad": {
                "diagnostico": h.get("diagnostico"),
                "codigo": h.get("codigoDiagnostico"),
                "forma": h.get("formaEvolutiva"),
                "fecha_inicio": h.get("fechaInicioEnfermedad"),
                "edss": h.get("escalaEDSS")
            },
            "consulta": {
                "fecha": h.get("fecha"),
                "medico": h.get("medico")
            },
            "secciones_texto": {
                "sintomas_principales": h.get("sintomasPrincipales"),
                "antecedentes": h.get("antecedentes"),
                "agrupacion_sindromica": h.get("agrupacionSindromica"),
                "examen_fisico": h.get("examenFisico"),
                "evolucion": h.get("evolucion"),
                "comentario": h.get("tratamiento")
            },
            "tratamientos": h.get("medicamentos", []),
            "complementarios": {
                "puncion_lumbar": {"realizada": h.get("estudiosComplementarios", {}).get("puncionLumbar", False)},
                "rmn": h.get("estudiosComplementarios", {}).get("texto") # Pasamos el texto directo
            },
            "nivel_criticidad": h.get("nivelCriticidad", "medio")
        }
        return {
            "id": h["id"],
            "estado": h.get("estado", "pendiente"),
            "nivel_criticidad": h.get("nivelCriticidad", "medio"),
            "borrador": borrador_simulado,
            "validada": None
        }

    return {
        "id": h["id"],
        "estado": h.get("estado", "pendiente"),
        "nivel_criticidad": h.get("nivel_criticidad", "medio"),
        "borrador": h.get("borrador"),
        "validada": h.get("validada")
    }

@router.get("/historias/{id_historia}", summary="Obtener historia completa")
def obtener_historia_completa(id_historia: str):
    h = _load_historia(id_historia)
    return h

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
    json_path = os.path.join(DATA_DIR, f"{id_historia}.json")
    
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Historia no encontrada")
    
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            historia = json.load(f)
        
        # Intentar borrar archivo adjunto si existe
        try:
            borrador = historia.get("borrador", {})
            if borrador:
                fuente = borrador.get("fuente", {})
                nombre_archivo = fuente.get("nombre_archivo")
                if nombre_archivo:
                    file_path = os.path.join(UPLOAD_DIR, nombre_archivo)
                    if os.path.exists(file_path):
                        os.remove(file_path)
        except Exception:
            pass

        os.remove(json_path)
        return {"mensaje": "Historia eliminada correctamente", "id": id_historia}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar la historia: {str(e)}")

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
        
        if h.get("estado") != "validada":
            borrador = h.get("borrador")
            # Autovalidación si es manual
            if not borrador: 
                h["validada"] = h.copy() 
            else:
                h["validada"] = borrador
            
            h["estado"] = "validada"
            if "nivel_criticidad" not in h:
                h["nivel_criticidad"] = "medio"
            
            with open(path, "w", encoding="utf-8") as f:
                json.dump(h, f, ensure_ascii=False, indent=2)
            count += 1

    return {"procesadas": count, "mensaje": "Validación masiva completada"}

@router.get("/historias/{id_historia}/archivo", summary="Descargar documento original")
def descargar_archivo_original(id_historia: str):
    try:
        historia = _load_historia(id_historia)
    except HTTPException:
        raise HTTPException(status_code=404, detail="Historia no encontrada")

    borrador = historia.get("borrador", {})
    fuente = borrador.get("fuente", {})
    nombre_archivo = fuente.get("nombre_archivo") or historia.get("nombre_archivo")

    if not nombre_archivo:
        raise HTTPException(status_code=404, detail="Esta historia no tiene un archivo original asociado")

    file_path = os.path.join(UPLOAD_DIR, nombre_archivo)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"El archivo '{nombre_archivo}' no se encuentra en el servidor")

    return FileResponse(
        path=file_path,
        filename=nombre_archivo,
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )