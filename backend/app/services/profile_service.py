import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

FEEDBACK_DIR = os.getenv("FEEDBACK_DIR", "./data/feedback_medicos")
PROFILES_DIR = os.getenv("PROFILES_DIR", "./data/perfiles_medicos")
DEFAULT_MEDICO_ID = os.getenv("DEFAULT_MEDICO_ID", "dr_default")

def get_default_medico_id() -> str:
    """Retorna el medico_id desacoplado por defecto."""
    return DEFAULT_MEDICO_ID

def _sanitize_val(val: Any) -> Any:
    """Normaliza cadenas vacías o espacios a None para evitar falsas diferencias de formato del frontend."""
    if isinstance(val, str):
        cleaned = val.strip()
        return cleaned if cleaned else None
    return val

def _compute_diff(borrador: Dict[str, Any], validada: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compara el borrador original contra la versión validada de forma semántica y consistente.
    Filtra ruido del frontend (espacios, vacíos vs null) y genera llaves canónicas.
    """
    cambios = {}
    
    if not borrador or not validada:
        return cambios

    # 1. Comparar Enfermedad (EDSS, Diagnóstico, Forma, Fecha Inicio)
    enf_b = borrador.get("enfermedad", {}) or {}
    enf_v = validada.get("enfermedad", {}) or {}

    for key in ["edss", "diagnostico", "forma", "fecha_inicio"]:
        val_b = _sanitize_val(enf_b.get(key))
        val_v = _sanitize_val(enf_v.get(key))
        if val_b != val_v:
            cambios[f"enfermedad.{key}"] = {
                "anterior": val_b,
                "corregido": val_v
            }

    # 2. Comparar Datos de Paciente
    pac_b = borrador.get("paciente", {}) or {}
    pac_v = validada.get("paciente", {}) or {}

    for key in ["nombre", "dni", "obra_social", "nro_afiliado"]:
        val_b = _sanitize_val(pac_b.get(key))
        val_v = _sanitize_val(pac_v.get(key))
        if val_b != val_v:
            cambios[f"paciente.{key}"] = {
                "anterior": val_b,
                "corregido": val_v
            }

    # 3. Comparar Tratamientos (Detalle por fármaco/molécula)
    trats_b = borrador.get("tratamientos", []) or []
    trats_v = validada.get("tratamientos", []) or []

    len_max = max(len(trats_b), len(trats_v))
    trat_cambios = []
    for i in range(len_max):
        tb = trats_b[i] if i < len(trats_b) else {}
        tv = trats_v[i] if i < len(trats_v) else {}
        
        mol_b = _sanitize_val(tb.get("molecula") or tb.get("droga"))
        mol_v = _sanitize_val(tv.get("molecula") or tv.get("droga"))
        est_b = _sanitize_val(tb.get("estado"))
        est_v = _sanitize_val(tv.get("estado"))
        dos_b = _sanitize_val(tb.get("dosis"))
        dos_v = _sanitize_val(tv.get("dosis"))
        
        if mol_b != mol_v or est_b != est_v or dos_b != dos_v:
            trat_cambios.append({
                "indice": i,
                "molecula": {"anterior": mol_b, "corregido": mol_v},
                "estado": {"anterior": est_b, "corregido": est_v},
                "dosis": {"anterior": dos_b, "corregido": dos_v}
            })
            
    if trat_cambios:
        cambios["tratamientos.molecula"] = trat_cambios

    # 4. Comparar Estudios Complementarios
    comp_b = borrador.get("complementarios", {}) or {}
    comp_v = validada.get("complementarios", {}) or {}
    
    rmn_b = comp_b.get("rmn")
    rmn_v = comp_v.get("rmn")
    if _sanitize_val(json.dumps(rmn_b, sort_keys=True)) != _sanitize_val(json.dumps(rmn_v, sort_keys=True)):
        cambios["complementarios.rmn"] = {
            "anterior": rmn_b,
            "corregido": rmn_v
        }

    # 5. Comparar Secciones de Texto
    sec_b = borrador.get("secciones_texto", {}) or {}
    sec_v = validada.get("secciones_texto", {}) or {}

    for key in ["sintomas_principales", "antecedentes", "examen_fisico", "evolucion", "comentario", "estudios"]:
        val_b = _sanitize_val(sec_b.get(key))
        val_v = _sanitize_val(sec_v.get(key))
        if val_b != val_v:
            cambios[f"secciones_texto.{key}"] = {
                "anterior": val_b,
                "corregido": val_v
            }

    return cambios


def record_validation_feedback(
    historia_id: str,
    borrador: Dict[str, Any],
    validada: Dict[str, Any],
    medico_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Registra silenciosamente las correcciones realizadas por el médico en la validación.
    Persiste en ./data/feedback_medicos/{medico_id}_feedback.json.
    """
    target_medico_id = medico_id or get_default_medico_id()
    cambios = _compute_diff(borrador, validada)

    if not cambios:
        return None

    evento_feedback = {
        "historia_id": historia_id,
        "timestamp": datetime.now().isoformat(),
        "medico_id": target_medico_id,
        "cambios": cambios
    }

    try:
        os.makedirs(FEEDBACK_DIR, exist_ok=True)
        file_path = os.path.join(FEEDBACK_DIR, f"{target_medico_id}_feedback.json")
        
        historial_feedback = []
        if os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    historial_feedback = json.load(f)
                    if not isinstance(historial_feedback, list):
                        historial_feedback = []
            except Exception:
                historial_feedback = []

        historial_feedback.append(evento_feedback)

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(historial_feedback, f, ensure_ascii=False, indent=2)

        return evento_feedback

    except Exception as e:
        print(f"[WARN] No se pudo guardar el feedback de validación: {e}")
        return None


# --- GESTIÓN DE PERFILES ACTIVOS Y AUDITORÍA DE CAMBIOS (Fase 2.1) ---

def get_active_profile(medico_id: str = "dr_default") -> Dict[str, Any]:
    """Obtiene o inicializa el perfil activo en perfiles_medicos/{medico_id}.json."""
    os.makedirs(PROFILES_DIR, exist_ok=True)
    file_path = os.path.join(PROFILES_DIR, f"{medico_id}.json")

    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[WARN] Error leyendo perfil activo {medico_id}: {e}")

    # Estructura inicial limpia
    perfil_inicial = {
        "medico_id": medico_id,
        "version": 1,
        "fecha_actualizacion": datetime.now().isoformat(),
        "glosario": {},
        "secciones": {},
        "plantillas_descartables": []
    }
    _save_active_profile(medico_id, perfil_inicial)
    return perfil_inicial


def _save_active_profile(medico_id: str, perfil: Dict[str, Any]):
    os.makedirs(PROFILES_DIR, exist_ok=True)
    file_path = os.path.join(PROFILES_DIR, f"{medico_id}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(perfil, f, ensure_ascii=False, indent=2)


def _log_profile_history(medico_id: str, evento_historial: Dict[str, Any]):
    os.makedirs(PROFILES_DIR, exist_ok=True)
    history_file = os.path.join(PROFILES_DIR, f"{medico_id}_history.json")
    
    historial = []
    if os.path.exists(history_file):
        try:
            with open(history_file, "r", encoding="utf-8") as f:
                historial = json.load(f)
                if not isinstance(historial, list):
                    historial = []
        except Exception:
            historial = []

    historial.append(evento_historial)

    with open(history_file, "w", encoding="utf-8") as f:
        json.dump(historial, f, ensure_ascii=False, indent=2)


def approve_suggestion(medico_id: str, sugerencia: Dict[str, Any], aprobado_por: str = "dr_default") -> Dict[str, Any]:
    """
    Aprueba una sugerencia individual:
    1. Modifica perfiles_medicos/{medico_id}.json
    2. Incrementa la versión del perfil
    3. Registra en perfiles_medicos/{medico_id}_history.json
    """
    perfil = get_active_profile(medico_id)
    origen = sugerencia.get("origen")
    destino = sugerencia.get("destino")
    tipo = sugerencia.get("tipo", "abreviatura")

    if not origen or not destino:
        raise ValueError("La sugerencia debe incluir origen y destino válidos.")

    # 1. Aplicar cambio al perfil activo
    if "glosario" not in perfil:
        perfil["glosario"] = {}
    
    perfil["glosario"][origen] = destino
    perfil["version"] += 1
    perfil["fecha_actualizacion"] = datetime.now().isoformat()

    _save_active_profile(medico_id, perfil)

    # 2. Registrar en historial de auditoría
    evento_historial = {
        "timestamp": datetime.now().isoformat(),
        "accion": "agregar_glosario",
        "tipo": tipo,
        "origen": origen,
        "destino": destino,
        "aprobado_por": aprobado_por,
        "version_resultante": perfil["version"]
    }
    _log_profile_history(medico_id, evento_historial)

    return {
        "status": "aprobado",
        "medico_id": medico_id,
        "version_nueva": perfil["version"],
        "regla_agregada": {origen: destino},
        "evento": evento_historial
    }


def reject_suggestion(medico_id: str, sugerencia: Dict[str, Any], rechazado_por: str = "dr_default") -> Dict[str, Any]:
    """
    Rechaza una sugerencia individual registrando la decisión en el historial de auditoría.
    NO modifica el perfil activo.
    """
    origen = sugerencia.get("origen")
    destino = sugerencia.get("destino")
    tipo = sugerencia.get("tipo", "abreviatura")

    evento_historial = {
        "timestamp": datetime.now().isoformat(),
        "accion": "rechazar_sugerencia",
        "tipo": tipo,
        "origen": origen,
        "destino": destino,
        "rechazado_por": rechazado_por
    }
    _log_profile_history(medico_id, evento_historial)

    return {
        "status": "rechazado",
        "medico_id": medico_id,
        "evento": evento_historial
    }
