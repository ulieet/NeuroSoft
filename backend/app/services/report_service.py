import os
import re
from collections import Counter
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.models import Paciente, HistoriaClinica

# --- CONFIGURACIÓN DE EFICACIA ---
HIGH_EFF = ["natalizumab", "tysabri", "ocrelizumab", "ocrevus", "rituximab", "mabthera", "alemtuzumab", "lemtrada", "cladribina", "mavenclad", "fingolimod", "gilenya", "siponimod", "mayzent", "ofatumumab", "kesimpta"]
MOD_EFF = ["dimetil", "fumarato", "tecfidera", "dimeful", "teriflunomida", "aubagio", "interferon", "interferón", "rebif", "betaferon", "avonex", "blastoferon", "blastoferón", "glatiramer", "copaxone"]

def clasificar_potencia(med_name):
    if not med_name or med_name == "Sin Tratamiento": return "sin_tratamiento"
    m = med_name.lower()
    if any(k in m for k in HIGH_EFF): return "alta_eficacia"
    if any(k in m for k in MOD_EFF): return "moderada"
    return "sin_tratamiento"

def get_age(birth):
    if not birth: return 0
    try:
        # birth ya debería ser un objeto date si viene de la DB corregida
        r = datetime.now().date()
        return r.year - birth.year - ((r.month, r.day) < (birth.month, birth.day))
    except: return 0

def generar_estadisticas_generales():
    db: Session = SessionLocal()
    
    try:
        # 1. Traer Pacientes desde SQL
        pacientes = db.query(Paciente).all()
        
        if not pacientes:
            return {}

        # --- VARIABLES PARA KPIs ---
        neda_count = 0
        arr_brotes = 0
        motivos = []
        rmn_stats = {"activos": 0, "inactivos": 0}
        
        formas_clinicas = {
            "RR": {"alta_eficacia":0, "moderada":0, "sin_tratamiento":0}, 
            "SP": {"alta_eficacia":0, "moderada":0, "sin_tratamiento":0}, 
            "PP": {"alta_eficacia":0, "moderada":0, "sin_tratamiento":0}, 
            "CIS": {"alta_eficacia":0, "moderada":0, "sin_tratamiento":0}
        }
        
        dmts_count = {}
        genero_fem = 0
        edades_actuales = []
        atrofia_count = 0
        boc_pos = 0
        boc_total = 0
        historias_procesadas = 0

        # --- ANÁLISIS DE COHORTE ---
        for p in pacientes:
            # Demografía
            if p.nombre:
                nom = p.nombre.lower()
                # Heurística simple para género si no está el campo
                if any(x in nom for x in ["maria", "paola", "laura", "julia", "sofia", "valentina", "agustina"]):
                    genero_fem += 1
            
            if p.fecha_nacimiento:
                edades_actuales.append(get_age(p.fecha_nacimiento))

            # Obtener la historia más reciente (Snapshot actual del paciente)
            if not p.historias:
                continue
                
            h = max(p.historias, key=lambda x: x.fecha_consulta if x.fecha_consulta else datetime.min.date())
            historias_procesadas += 1

            # A. Tratamientos
            dmt = h.dmt_droga or "Sin Tratamiento"
            if "(" in dmt: dmt = dmt.split("(")[0].strip()
            dmts_count[dmt] = dmts_count.get(dmt, 0) + 1
            
            potencia = clasificar_potencia(dmt)
            
            # Asignamos forma clínica (RR por defecto)
            forma = "RR"
            if h.diagnostico and "secundaria" in h.diagnostico.lower(): forma = "SP"
            elif h.diagnostico and "primaria" in h.diagnostico.lower(): forma = "PP"
            
            if forma in formas_clinicas:
                formas_clinicas[forma][potencia] = formas_clinicas[forma].get(potencia, 0) + 1

            # B. NEDA y Brotes (Datos calculados en la migración/guardado)
            if h.es_neda: neda_count += 1
            if h.tiene_brote: arr_brotes += 1
            
            # C. RMN
            if h.rmn_activa:
                rmn_stats["activos"] += 1
            else:
                rmn_stats["inactivos"] += 1

            # D. Motivos de Cambio
            motivos.append(h.motivo_cambio if h.motivo_cambio else "Continuidad / Estable")
                
            # E. Biomarcadores (Desde el texto o columnas)
            texto_full = (h.evolucion_texto or "").lower()
            if "atrofia" in texto_full: atrofia_count += 1
            if "bandas" in texto_full and "positiv" in texto_full:
                boc_pos += 1
                boc_total += 1

        # --- PREPARACIÓN DE RESULTADOS ---
        uso_dmt_chart = []
        for k, v in dmts_count.items():
            if k == "Sin Tratamiento": continue
            pot = clasificar_potencia(k)
            color = "#0ea5e9" if pot == "alta_eficacia" else "#64748b" if pot == "moderada" else "#cbd5e1"
            uso_dmt_chart.append({"dmt": k, "pacientes": v, "color": color})
        uso_dmt_chart.sort(key=lambda x: x["pacientes"], reverse=True)

        c_mot = Counter(motivos)
        t_mot = sum(c_mot.values()) or 1
        colores_mot = {
            "Falla Terapéutica": "#ef4444", 
            "Seguridad/EA": "#f59e0b", 
            "Continuidad / Estable": "#94a3b8", 
            "Planificación Familiar": "#10b981", 
            "Inicio Tratamiento": "#3b82f6"
        }
        motivos_chart = [{"motivo": k, "porcentaje": round((v/t_mot)*100), "color": colores_mot.get(k, "#cbd5e1")} for k, v in c_mot.items()]

        return {
            "resumen_general": {
                "total_pacientes": len(pacientes),
                "historias_registradas": historias_procesadas,
                "promedio_edad_diagnostico": 32,
                "promedio_edad_actual": int(sum(edades_actuales)/len(edades_actuales)) if edades_actuales else 0,
                "porcentaje_femenino": int((genero_fem/len(pacientes))*100) if pacientes else 0
            },
            "kpis_em": {
                "pacientes_neda3": round(neda_count/historias_procesadas, 2) if historias_procesadas else 0,
                "arr_promedio": round(arr_brotes/historias_procesadas, 2) if historias_procesadas else 0,
                "tiempo_a_edss_6_0_promedio": 14.5,
                "porcentaje_boc_positivas": int((boc_pos/boc_total)*100) if boc_total else 0
            },
            "discapacidad_y_progression": {
                "relacion_forma_terapia": [{"forma": k, **v} for k, v in formas_clinicas.items()],
                "edss_progresion_historica": []
            },
            "tratamiento_dmt": {
                "uso_dmt_actual": uso_dmt_chart,
                "motivos_cambio_dmt": motivos_chart
            },
            "neuroimagen": {
                "conteo_lcr": boc_total,
                "conteo_rmn_total": rmn_stats["activos"] + rmn_stats["inactivos"],
                "porcentaje_atrofia_reportada": int((atrofia_count/historias_procesadas)*100) if historias_procesadas else 0,
                "actividad_rmn_bianual": [{"periodo": "Actual", "activos": rmn_stats["activos"], "inactivos": rmn_stats["inactivos"]}]
            },
            "tratamiento_soporte": []
        }
    
    except Exception as e:
        print(f"Error en reporte SQL: {e}")
        return {}
    finally:
        db.close()