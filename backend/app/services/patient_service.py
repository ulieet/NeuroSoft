import os
import json
from datetime import datetime
from typing import Dict, Any, List

PACIENTES_DIR = "./data/pacientes"

def _get_path(dni: str) -> str:
    # Limpiamos el DNI para usarlo de nombre de archivo
    clean_dni = "".join(filter(str.isdigit, str(dni)))
    if not clean_dni:
        return None
    return os.path.join(PACIENTES_DIR, f"{clean_dni}.json")

def upsert_paciente_from_nlp(paciente_data: Dict[str, Any]):
    """
    Recibe datos del paciente del NLP y crea/actualiza el registro maestro.
    """
    print(f"\n--- INTENTO DE REGISTRO DE PACIENTE ---")
    
    # 1. Asegurar que el directorio existe
    if not os.path.exists(PACIENTES_DIR):
        try:
            os.makedirs(PACIENTES_DIR, exist_ok=True)
            print(f"📁 Directorio creado: {PACIENTES_DIR}")
        except Exception as e:
            print(f" ERROR CRÍTICO: No se pudo crear directorio {PACIENTES_DIR}: {e}")
            return None

    dni = paciente_data.get("dni")
    nombre = paciente_data.get("nombre")
    
    print(f"DATOS RECIBIDOS -> Nombre: '{nombre}', DNI: '{dni}'")

    # 2. Validación estricta
    if not dni:
        print(" FALLO: No se guarda paciente porque el DNI es nulo o vacío.")
        return None
    
    clean_dni = "".join(filter(str.isdigit, str(dni)))
    if not clean_dni:
        print(" FALLO: El DNI no contiene números válidos.")
        return None

    if not nombre or "desconocido" in nombre.lower():
        print(f"⚠️ ADVERTENCIA: Nombre '{nombre}' parece inválido, pero se intentará guardar igual por tener DNI.")

    path = _get_path(clean_dni)
    
    paciente_existente = {}
    
    # 3. Intentar cargar existente para preservar datos viejos
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                paciente_existente = json.load(f)
                print(f"ℹ️ Paciente ya existe (ID: {paciente_existente.get('id')}). Actualizando datos...")
        except Exception as e:
            print(f"⚠️ Error leyendo paciente existente: {e}. Se sobrescribirá.")

    # 4. Mezclar datos (Prioridad a lo nuevo si existe, sino mantenemos lo viejo)
    nuevo_paciente = {
        "id": clean_dni, # Usamos DNI limpio como ID consistente
        "dni": dni,      # Guardamos el DNI original con puntos si se quiere mostrar así
        "nombre": paciente_data.get("nombre") or paciente_existente.get("nombre"),
        "fecha_nacimiento": paciente_data.get("fecha_nacimiento") or paciente_existente.get("fecha_nacimiento"),
        "obra_social": paciente_data.get("obra_social") or paciente_existente.get("obra_social"),
        "nro_afiliado": paciente_data.get("nro_afiliado") or paciente_existente.get("nro_afiliado"),
        "ultima_actualizacion": datetime.now().isoformat(),
        # Preservar observaciones si existían
        "observaciones": paciente_existente.get("observaciones", "")
    }

    # 5. Guardar
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(nuevo_paciente, f, ensure_ascii=False, indent=2)
        print(f" ÉXITO: Paciente guardado correctamente en: {path}")
        print("---------------------------------------\n")
        return nuevo_paciente
    except Exception as e:
        print(f" ERROR CRÍTICO escribiendo archivo JSON: {e}")
        return None

def get_all_pacientes() -> List[Dict[str, Any]]:
    if not os.path.exists(PACIENTES_DIR):
        return []
        
    lista = []
    for fname in os.listdir(PACIENTES_DIR):
        if not fname.endswith(".json"): continue
        try:
            with open(os.path.join(PACIENTES_DIR, fname), "r", encoding="utf-8") as f:
                data = json.load(f)
                # Asegurar ID
                if "id" not in data:
                    data["id"] = data.get("dni", "").replace(".", "")
                lista.append(data)
        except:
            continue
            
    return lista

def get_paciente_by_id(id_paciente: str):
    clean_id = "".join(filter(str.isdigit, str(id_paciente)))
    path = os.path.join(PACIENTES_DIR, f"{clean_id}.json")
    
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

def delete_paciente_by_id(id_paciente: str) -> bool:
    # Limpiamos el ID por seguridad para encontrar el archivo correcto
    clean_id = "".join(filter(str.isdigit, str(id_paciente)))
    path = os.path.join(PACIENTES_DIR, f"{clean_id}.json")
    
    if os.path.exists(path):
        try:
            os.remove(path)
            print(f"🗑️ Paciente eliminado: {path}")
            return True
        except Exception as e:
            print(f" Error al eliminar paciente: {e}")
            return False
    return False



def crear_nuevo_paciente(data: Dict[str, Any]):
    dni = str(data.get("dni", ""))
    clean_id = "".join(filter(str.isdigit, dni))
    
    if not clean_id:
        return None
        
    path = os.path.join(PACIENTES_DIR, f"{clean_id}.json")
    
    # Preparamos el objeto con la estructura correcta
    nuevo_paciente = {
        "id": clean_id,
        "dni": dni,
        "nombre": data.get("nombre"),
        "fecha_nacimiento": data.get("fecha_nacimiento"),
        "obra_social": data.get("obra_social"),
        "nro_afiliado": data.get("nro_afiliado"),
        "observaciones": data.get("observaciones", ""),
        "ultima_actualizacion": datetime.now().isoformat()
    }
    
    try:
        os.makedirs(PACIENTES_DIR, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(nuevo_paciente, f, ensure_ascii=False, indent=2)
        return nuevo_paciente
    except Exception as e:
        print(f"Error creando archivo: {e}")
        return None

# backend/app/services/patient_service.py


# backend/app/services/patient_service.py

def crear_paciente_manual(data: Dict[str, Any]):
    dni = str(data.get("dni", "")).strip()
    clean_dni = "".join(filter(str.isdigit, dni))
    
    if not clean_dni:
        return None
        
    path = os.path.join(PACIENTES_DIR, f"{clean_dni}.json")
    
    # Estructura idéntica a la que espera tu página de Detalle
    nuevo_paciente = {
        "id": clean_dni,
        "dni": dni,
        "nombre": data.get("nombre"),
        "fecha_nacimiento": data.get("fecha_nacimiento"),
        "obra_social": data.get("obra_social"),
        "nro_afiliado": data.get("nro_afiliado"),
        "observaciones": data.get("observaciones", ""),
        "ultima_actualizacion": datetime.now().isoformat()
    }
    
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(nuevo_paciente, f, ensure_ascii=False, indent=2)
        return nuevo_paciente
    except Exception as e:
        print(f"Error al guardar paciente: {e}")
        return None

def update_paciente(id_paciente: str, data: Dict[str, Any]):
    clean_id = "".join(filter(str.isdigit, str(id_paciente)))
    path = os.path.join(PACIENTES_DIR, f"{clean_id}.json")
    
    if not os.path.exists(path):
        return None

    try:
        # Cargamos lo que hay para no perder campos que no enviamos
        with open(path, "r", encoding="utf-8") as f:
            paciente_actual = json.load(f)
        
        # Actualizamos los campos recibidos
        paciente_actual.update(data)
        paciente_actual["ultima_actualizacion"] = datetime.now().isoformat()

        with open(path, "w", encoding="utf-8") as f:
            json.dump(paciente_actual, f, ensure_ascii=False, indent=2)
        
        return paciente_actual
    except Exception as e:
        print(f"Error actualizando: {e}")
        return None
    

    