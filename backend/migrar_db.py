# backend/migrar_db.py
import os
import json
import re
from datetime import datetime
from app.core.database import engine, Base, SessionLocal
from app.models.models import Paciente, HistoriaClinica

# Importamos tu lógica de clasificación para llenar los campos
from app.services.report_service import clasificar_potencia 

# 1. Crear las tablas en el archivo .db
print("Creando tablas en neurosoft.db...")
Base.metadata.create_all(bind=engine)

def parse_fecha(fecha_str):
    if not fecha_str: return None
    try:
        # Intenta manejar formatos ISO con o sin hora
        clean = fecha_str.split("T")[0]
        return datetime.strptime(clean, "%Y-%m-%d").date()
    except: return None

def migrar_datos():
    db = SessionLocal()
    data_dir = "data/historias" # Asegúrate que esta ruta apunte a tus JSONs
    
    if not os.path.exists(data_dir):
        print(f"No se encontró la carpeta {data_dir}")
        return

    archivos = [f for f in os.listdir(data_dir) if f.endswith(".json") and not f.startswith("hc_bundle")]
    print(f"Procesando {len(archivos)} historias...")
    
    cont_pacientes = 0
    cont_historias = 0

    for archivo in archivos:
        try:
            with open(os.path.join(data_dir, archivo), 'r', encoding='utf-8') as f:
                raw = json.load(f)
                data = raw.get("borrador") or raw
                
                # --- 1. Gestionar Paciente ---
                pac_data = data.get("paciente", {})
                dni_raw = pac_data.get("dni", "")
                if not dni_raw: continue
                
                dni_limpio = dni_raw.replace(".", "").strip()
                
                # Buscamos si ya existe
                paciente = db.query(Paciente).filter(Paciente.dni == dni_limpio).first()
                
                if not paciente:
                    # Parsear nombre (Apellido, Nombre o Nombre Apellido)
                    nombre_full = pac_data.get("nombre", "Desconocido").replace(",", "")
                    partes = nombre_full.split()
                    # Heurística simple: Último es apellido, resto nombres (o al revés según tu factory)
                    # Dado tu factory (Apellido, Nombre), asumimos:
                    apellido = partes[0] if partes else ""
                    nombre = " ".join(partes[1:]) if len(partes) > 1 else ""

                    paciente = Paciente(
                        dni=dni_limpio,
                        nombre=nombre,
                        apellido=apellido,
                        fecha_nacimiento=parse_fecha(pac_data.get("fecha_nacimiento")),
                        obra_social=pac_data.get("obra_social"),
                        nro_afiliado=pac_data.get("nro_afiliado"),
                        sexo=pac_data.get("sexo") # Si lo tienes en el JSON
                    )
                    db.add(paciente)
                    db.commit()
                    db.refresh(paciente)
                    cont_pacientes += 1

                # --- 2. Gestionar Historia ---
                # Calcular datos derivados (reutilizando tu lógica de reportes para guardarla YA calculada)
                txt = data.get("secciones_texto", {}) or {}
                compl = data.get("complementarios", {})
                trats = data.get("tratamientos", [])
                
                # Droga
                droga = "Sin Tratamiento"
                if trats:
                    droga = trats[0].get("droga") or trats[0].get("molecula") or "Sin Tratamiento"
                if "(" in droga: droga = droga.split("(")[0].strip()
                
                categoria = clasificar_potencia(droga)
                
                # Lógica NEDA (Simplificada para migración)
                full_txt = (txt.get("evolucion") or "").lower() + (txt.get("comentario") or "").lower()
                
                tiene_brote = False
                if re.search(r"(present[oó]|nuevo|actual|reciente).{1,40}(brote|reca[ií]da|episodio)", full_txt):
                    tiene_brote = True
                if "libre de reca" in full_txt or "sin reca" in full_txt:
                    tiene_brote = False
                
                # RMN Activa
                rmn_activa = False
                rmn_list = compl.get("rmn", [])
                if rmn_list:
                    for r in rmn_list:
                        act = str(r.get("actividad", "")).lower()
                        gd = str(r.get("gd", "")).lower()
                        if "activa" in act and "inactiva" not in act: rmn_activa = True
                        if "positiva" in gd: rmn_activa = True

                es_neda = not (tiene_brote or rmn_activa)

                # Motivo (Básico)
                motivo = "Continuidad"
                if tiene_brote or rmn_activa or "falla" in full_txt: motivo = "Falla Terapéutica"
                elif "inicio" in full_txt: motivo = "Inicio Tratamiento"

                historia = HistoriaClinica(
                    paciente_id=paciente.id,
                    fecha_consulta=parse_fecha(data.get("consulta", {}).get("fecha")),
                    nombre_archivo=os.path.basename(archivo),
                    diagnostico=data.get("enfermedad", {}).get("diagnostico"),
                    edss=data.get("enfermedad", {}).get("edss"),
                    es_neda=es_neda,
                    tiene_brote=tiene_brote,
                    rmn_activa=rmn_activa,
                    dmt_droga=droga,
                    dmt_categoria=categoria,
                    motivo_cambio=motivo,
                    evolucion_texto=txt.get("evolucion"),
                    rmn_json=compl.get("rmn")
                )
                db.add(historia)
                cont_historias += 1
                
        except Exception as e:
            print(f"Error en {archivo}: {e}")

    db.commit()
    db.close()
    print(f"--- Éxito: {cont_pacientes} pacientes creados, {cont_historias} historias registradas. ---")

if __name__ == "__main__":
    migrar_datos()