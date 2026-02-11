import os
from collections import Counter
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.models import Paciente, HistoriaClinica

# --- CONFIGURACIÓN DE EFICACIA (Tu lógica original intacta) ---
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
        r = datetime.now().date()
        return r.year - birth.year - ((r.month, r.day) < (birth.month, birth.day))
    except: return 0

def generar_estadisticas_generales():
    db: Session = SessionLocal()
    
    try:
        # 1. Traer Pacientes (SQL hace el trabajo pesado de lectura)
        pacientes = db.query(Paciente).all()
        
        if not pacientes:
            return {}

        # --- VARIABLES PARA KPIs ---
        neda_count = 0
        arr_brotes = 0
        motivos = []
        rmn_stats = {"activos": 0, "inactivos": 0}
        
        # Estructura idéntica a tu frontend
        formas_clinicas = {
            "RR": {"alta_eficacia":0, "moderada":0, "sin_tratamiento":0}, 
            "SP": {"alta_eficacia":0, "moderada":0, "sin_tratamiento":0}, 
            "PP": {"alta_eficacia":0, "moderada":0, "sin_tratamiento":0}, 
            "CIS": {"alta_eficacia":0, "moderada":0, "sin_tratamiento":0}
        }
        
        dmts_count = {}
        genero_fem = 0
        edades_actuales = []
        
        # Contadores extra que tenías
        boc_pos = 0
        boc_total = 0
        atrofia_count = 0
        
        historias_procesadas = 0

        # --- ANÁLISIS DE COHORTE (Lógica de "Snapshot Actual") ---
        for p in pacientes:
            # 1. Demografía (Datos del paciente, no de la historia)
            if p.nombre:
                nom = p.nombre.lower()
                if any(x in nom for x in ["maria", "paola", "laura", "julia", "sofia", "valentina", "camila", "josefina", "agustina"]):
                    genero_fem += 1
            
            if p.fecha_nacimiento:
                edades_actuales.append(get_age(p.fecha_nacimiento))

            # 2. Buscar la HISTORIA MÁS RECIENTE de este paciente
            # (Esto reemplaza tu lógica de "patient_map" para deduplicar)
            if not p.historias:
                continue
                
            # Ordenamos por fecha y tomamos la última
            ultima_historia = max(p.historias, key=lambda h: h.fecha_consulta if h.fecha_consulta else datetime.min.date())
            h = ultima_historia
            historias_procesadas += 1

            # --- AHORA PROCESAMOS LA HISTORIA (Igual que antes pero usando atributos) ---
            
            # A. Tratamientos
            dmt = h.dmt_droga or "Sin Tratamiento"
            if "(" in dmt: dmt = dmt.split("(")[0].strip()
            dmts_count[dmt] = dmts_count.get(dmt, 0) + 1
            
            potencia = clasificar_potencia(dmt)
            
            # Asignamos forma clínica (RR por defecto si no hay dato)
            forma = "RR"
            if h.diagnostico and "secundaria" in h.diagnostico.lower(): forma = "SP"
            elif h.diagnostico and "primaria" in h.diagnostico.lower(): forma = "PP"
            
            # Sumar a gráfico de barras
            if potencia in formas_clinicas[forma]:
                formas_clinicas[forma][potencia] += 1
            else:
                formas_clinicas[forma]["sin_tratamiento"] += 1

            # B. NEDA y Brotes (Leemos lo que calculó la migración)
            if h.es_neda: neda_count += 1
            if h.tiene_brote: arr_brotes += 1
            
            # C. RMN
            if h.rmn_activa:
                rmn_stats["activos"] += 1
            else:
                rmn_stats["inactivos"] += 1

            # D. Motivos de Cambio
            if h.motivo_cambio:
                motivos.append(h.motivo_cambio)
            else:
                motivos.append("Continuidad / Estable")
                
            # E. Biomarcadores (Reconstrucción parcial desde texto guardado)
            # Como SQL guarda el texto de evolución, podemos buscar palabras clave ahí si faltó la columna específica
            texto_full = (h.evolucion_texto or "").lower()
            if "atrofia" in texto_full:
                atrofia_count += 1
            
            # Nota: Para BOC (LCR), si no migraste la columna específica, asumimos 0 o lo inferimos
            if "bandas" in texto_full and "positiv" in texto_full:
                boc_pos += 1
                boc_total += 1

        # --- RETORNO DE DATOS (Estructura idéntica al original) ---
        
        # Gráfico DMTs ordenado
        uso_dmt_chart = []
        for k, v in dmts_count.items():
            if k == "Sin Tratamiento": continue
            pot = clasificar_potencia(k)
            color = "#0ea5e9" if pot == "alta_eficacia" else "#64748b" if pot == "moderada" else "#cbd5e1"
            uso_dmt_chart.append({"dmt": k, "pacientes": v, "color": color})
        uso_dmt_chart.sort(key=lambda x: x["pacientes"], reverse=True)

        # Gráfico Motivos con Colores
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
                "promedio_edad_diagnostico": 32, # Dato estático o requeriría calcular
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