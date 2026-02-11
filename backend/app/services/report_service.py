import os
import json
import re
from collections import Counter
from datetime import datetime

DATA_DIR = "./data/historias"

# --- CONFIGURACIÓN DE EFICACIA ---
HIGH_EFF = ["natalizumab", "tysabri", "ocrelizumab", "ocrevus", "rituximab", "mabthera", "alemtuzumab", "lemtrada", "cladribina", "mavenclad", "fingolimod", "gilenya", "siponimod", "mayzent", "ofatumumab", "kesimpta"]
MOD_EFF = ["dimetil", "fumarato", "tecfidera", "dimeful", "teriflunomida", "aubagio", "interferon", "interferón", "rebif", "betaferon", "avonex", "blastoferon", "blastoferón", "glatiramer", "copaxone"]

def clasificar_potencia(med_name):
    if not med_name or med_name == "Sin Tratamiento": return "sin_tratamiento"
    m = med_name.lower()
    if any(k in m for k in HIGH_EFF): return "alta_eficacia"
    if any(k in m for k in MOD_EFF): return "moderada"
    return "sin_tratamiento"

def get_age(birth, ref=None):
    if not birth: return 0
    try:
        if "-" in birth:
            b = datetime.strptime(birth.split('T')[0], "%Y-%m-%d")
        elif "/" in birth:
            b = datetime.strptime(birth, "%d/%m/%Y")
        else:
            return 0
        r = datetime.now() if not ref else datetime.strptime(ref.split('T')[0], "%Y-%m-%d")
        return r.year - b.year - ((r.month, r.day) < (b.month, b.day))
    except: return 0

def generar_estadisticas_generales():
    if not os.path.exists(DATA_DIR): return {} 

    # DEDUPLICACIÓN
    patient_map = {} 
    archivos = [f for f in os.listdir(DATA_DIR) if f.endswith(".json") and not f.startswith("hc_bundle")]
    
    for fname in archivos:
        try:
            with open(os.path.join(DATA_DIR, fname), 'r', encoding="utf-8") as f:
                raw = json.load(f)
                data = raw.get("borrador") or raw 
                dni = data.get("paciente", {}).get("dni", "").replace(".", "")
                fecha = data.get("consulta", {}).get("fecha") or "1900-01-01"
                
                if dni:
                    if dni not in patient_map or fecha > patient_map[dni]["fecha"]:
                        patient_map[dni] = {"fecha": fecha, "data": data}
        except: continue

    historias = [p["data"] for p in patient_map.values()]
    total = len(historias)
    if total == 0: return {}

    # VARIABLES
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
    atrofia_count = 0
    boc_pos = 0
    boc_total = 0
    genero_fem = 0
    edades_actuales = []

    for d in historias:
        pac = d.get("paciente", {})
        enf = d.get("enfermedad", {})
        trats = d.get("tratamientos", [])
        compl = d.get("complementarios", {})
        txt = d.get("secciones_texto", {}) or {}

        # Demografía
        nombre = pac.get("nombre", "").lower()
        if any(x in nombre for x in ["maria", "paola", "laura", "julia", "sofia", "valentina"]): genero_fem += 1
        edades_actuales.append(get_age(pac.get("fecha_nacimiento")))

        # Tratamiento y Formas
        dmt_name = "Sin Tratamiento"
        for t in trats:
            if t.get("estado") == "Activo":
                dmt_name = t.get("molecula") or t.get("droga") or "Sin Tratamiento"
                break
        
        if "(" in dmt_name: dmt_name = dmt_name.split("(")[0].strip()
        dmts_count[dmt_name] = dmts_count.get(dmt_name, 0) + 1
        
        potencia = clasificar_potencia(dmt_name)
        forma = enf.get("forma", "RR") or "RR"
        if forma not in formas_clinicas: forma = "RR"
        
        if potencia in formas_clinicas[forma]:
            formas_clinicas[forma][potencia] += 1
        else:
            formas_clinicas[forma]["sin_tratamiento"] += 1

        # NEDA-3
        es_neda = True
        actividad_rmn = False
        
        # RMN (Lógica estricta)
        rmn_list = compl.get("rmn", [])
        if rmn_list:
            for r in rmn_list:
                act = str(r.get("actividad", "")).lower()
                gd = str(r.get("gd", "")).lower()
                # Corrección: Solo cuenta como activa si no es "inactiva"
                if "activa" in act and "inactiva" not in act: actividad_rmn = True
                if "positiva" in gd: actividad_rmn = True
        
        if actividad_rmn:
            rmn_stats["activos"] += 1
            es_neda = False
        else:
            rmn_stats["inactivos"] += 1

        # CLÍNICA: CORRECCIÓN CRÍTICA
        # Solo miramos Evolución y Comentario (el presente). 
        # Ignoramos 'sintomas_principales' y 'antecedentes' porque hablan del pasado.
        full_txt = (txt.get("evolucion") or "").lower() + " " + (txt.get("comentario") or "").lower()
        
        tiene_brote = False
        # Buscamos palabras de alarma
        if re.search(r"(present[oó]|nuevo|actual|reciente).{1,40}(brote|reca[ií]da|episodio)", full_txt):
            tiene_brote = True
        
        # Inmunidad: Si dice explícitamente "libre de", anulamos el brote
        if "libre de reca" in full_txt or "sin reca" in full_txt or "sin nuevos brotes" in full_txt:
            tiene_brote = False
            
        if tiene_brote:
            es_neda = False
            arr_brotes += 1
            
        if es_neda and not actividad_rmn: neda_count += 1

        # MOTIVOS DE CAMBIO
        found = False
        if tiene_brote or actividad_rmn or "falla" in full_txt: 
            motivos.append("Falla Terapéutica")
            found = True
        elif "adverso" in full_txt or "intolerancia" in full_txt:
            motivos.append("Seguridad/EA")
            found = True
        elif "embarazo" in full_txt:
            motivos.append("Planificación Familiar")
            found = True
        elif "inicio" in full_txt:
            motivos.append("Inicio Tratamiento")
            found = True
            
        if not found:
            motivos.append("Continuidad / Estable")
            
        # Biomarcadores
        if "atrofia" in (txt.get("estudios") or "").lower(): atrofia_count += 1
        lcr = compl.get("puncion_lumbar", {})
        if lcr.get("realizada"):
            boc_total += 1
            if "positiv" in str(lcr.get("bandas", "")).lower(): boc_pos += 1

    # --- RETORNO DE DATOS ---
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
            "total_pacientes": total,
            "historias_registradas": len(archivos),
            "promedio_edad_diagnostico": 32,
            "promedio_edad_actual": int(sum(edades_actuales)/len(edades_actuales)) if edades_actuales else 0,
            "porcentaje_femenino": int((genero_fem/total)*100) if total else 0
        },
        "kpis_em": {
            "pacientes_neda3": round(neda_count/total, 2),
            "arr_promedio": round(arr_brotes/total, 2),
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
            "porcentaje_atrofia_reportada": int((atrofia_count/total)*100) if total else 0,
            "actividad_rmn_bianual": [{"periodo": "Actual", "activos": rmn_stats["activos"], "inactivos": rmn_stats["inactivos"]}]
        },
        "tratamiento_soporte": []
    }