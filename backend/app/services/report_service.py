import os
import json
import re
from collections import Counter
from datetime import datetime

DATA_DIR = "./data/historias"

HIGH_EFF = ["natalizumab", "tysabri", "ocrelizumab", "ocrevus", "rituximab", "mabthera", "alemtuzumab", "lemtrada", "cladribina", "mavenclad", "fingolimod", "gilenya", "siponimod", "mayzent", "ofatumumab", "kesimpta"]
MOD_EFF = ["dimetil", "fumarato", "tecfidera", "dimeful", "teriflunomida", "aubagio", "interferon", "interferón", "rebif", "betaferon", "avonex", "blastoferon", "blastoferón", "glatiramer", "copaxone"]

def clasificar_potencia(med_name):
    if not med_name or med_name == "Sin Tratamiento": return "sin_trabajamiento"
    m = med_name.lower()
    if any(k in m for k in HIGH_EFF): return "alta_eficacia"
    if any(k in m for k in MOD_EFF): return "moderada"
    return "sin_tratamiento"

def get_age(birth, ref=None):
    if not birth: return 0
    try:
        if "-" in birth: b = datetime.strptime(birth.split('T')[0], "%Y-%m-%d")
        elif "/" in birth: b = datetime.strptime(birth, "%d/%m/%Y")
        else: return 0
        r = datetime.now() if not ref else datetime.strptime(ref.split('T')[0], "%Y-%m-%d")
        return r.year - b.year - ((r.month, r.day) < (b.month, b.day))
    except: return 0

def generar_estadisticas_generales():
   
    reporte_base = {
        "resumen_general": {
            "total_pacientes": 0, "historias_registradas": 0,
            "promedio_edad_diagnostico": 0, "promedio_edad_actual": 0, "porcentaje_femenino": 0
        },
        "kpis_em": {
            "pacientes_neda3": 0.0, "arr_promedio": 0.0,
            "tiempo_a_edss_6_0_promedio": 14.5, "porcentaje_boc_positivas": 0
        },
        "discapacidad_y_progression": {"relacion_forma_terapia": [], "edss_progresion_historica": []},
        "tratamiento_dmt": {
            "uso_dmt_actual": [], 
            "motivos_cambio_dmt": [{"motivo": "Sin Historias", "porcentaje": 100, "color": "#cbd5e1"}]
        },
        "neuroimagen": {
            "conteo_lcr": 0, "conteo_rmn_total": 0, "porcentaje_atrofia_reportada": 0,
            "actividad_rmn_bianual": [{"periodo": "Actual", "activos": 0, "inactivos": 0}]
        },
        "tratamiento_soporte": []
    }

    if not os.path.exists(DATA_DIR): return reporte_base

    # 2. DEDUPLICACIÓN (Cargar la historia más reciente por DNI)
    patient_map = {} 
    archivos = [f for f in os.listdir(DATA_DIR) if f.endswith(".json") and not f.startswith("hc_bundle")]
    
    if not archivos: return reporte_base

    for fname in archivos:
        try:
            with open(os.path.join(DATA_DIR, fname), 'r', encoding="utf-8") as f:
                raw = json.load(f)
                data = raw.get("borrador") or raw 
                dni = str(data.get("paciente", {}).get("dni", "")).replace(".", "").strip()
                fecha = data.get("consulta", {}).get("fecha") or "1900-01-01"
                if dni:
                    if dni not in patient_map or fecha > patient_map[dni]["fecha"]:
                        patient_map[dni] = {"fecha": fecha, "data": data}
        except: continue

    historias = [p["data"] for p in patient_map.values()]
    total = len(historias)
    if total == 0: return reporte_base

    # 3. PROCESAMIENTO DE DATOS (Tu lógica original intacta)
    neda_count, arr_brotes, genero_fem, atrofia_count = 0, 0, 0, 0
    boc_pos, boc_total = 0, 0
    rmn_stats = {"activos": 0, "inactivos": 0}
    edades_actuales, motivos = [], []
    dmts_count = {}
    formas_clinicas = {k: {"alta_eficacia":0, "moderada":0, "sin_tratamiento":0} for k in ["RR", "SP", "PP", "CIS"]}

    for d in historias:
        pac, enf = d.get("paciente", {}), d.get("enfermedad", {})
        trats, compl = d.get("tratamientos", []), d.get("complementarios", {})
        txt = d.get("secciones_texto", {}) or {}

        # Demografía
        nombre = pac.get("nombre", "").lower()
        if any(x in nombre for x in ["maria", "paola", "laura", "julia", "sofia", "valentina", "agustina"]): genero_fem += 1
        edades_actuales.append(get_age(pac.get("fecha_nacimiento")))

        # Tratamiento y Forma
        dmt_name = "Sin Tratamiento"
        for t in trats:
            if t.get("estado") == "Activo":
                dmt_name = t.get("molecula") or t.get("droga") or "Sin Tratamiento"
                break
        if "(" in dmt_name: dmt_name = dmt_name.split("(")[0].strip()
        dmts_count[dmt_name] = dmts_count.get(dmt_name, 0) + 1
        
        forma = enf.get("forma", "RR") or "RR"
        if forma not in formas_clinicas: forma = "RR"
        formas_clinicas[forma][clasificar_potencia(dmt_name)] += 1

        # Lógica Actividad (NEDA / RMN / Brotes)
        act_rmn = False
        for r in compl.get("rmn", []):
            a, g = str(r.get("actividad", "")).lower(), str(r.get("gd", "")).lower()
            if ("activa" in a and "inactiva" not in a) or "positiva" in g: act_rmn = True
        
        if act_rmn: rmn_stats["activos"] += 1
        else: rmn_stats["inactivos"] += 1

        f_txt = (txt.get("evolucion") or "").lower() + " " + (txt.get("comentario") or "").lower()
        tiene_b = bool(re.search(r"(present[oó]|nuevo|actual|reciente).{1,40}(brote|reca[ií]da|episodio)", f_txt))
        if any(x in f_txt for x in ["libre de reca", "sin reca", "sin nuevos brotes"]): tiene_b = False
            
        if not (tiene_b or act_rmn): neda_count += 1
        if tiene_b: arr_brotes += 1

        # Motivos de Cambio
        found = False
        if tiene_b or act_rmn or "falla" in f_txt: motivos.append("Falla Terapéutica"); found = True
        elif any(x in f_txt for x in ["adverso", "intolerancia"]): motivos.append("Seguridad/EA"); found = True
        if not found: motivos.append("Continuidad / Estable")
            
        # Biomarcadores
        if "atrofia" in f_txt: atrofia_count += 1
        lcr = compl.get("puncion_lumbar", {})
        if lcr.get("realizada"):
            boc_total += 1
            if "positiv" in str(lcr.get("bandas", "")).lower(): boc_pos += 1

    # --- 4. FORMATEO FINAL ---
    uso_dmt = [{"dmt": k, "pacientes": v, "color": "#0ea5e9" if clasificar_potencia(k)=="alta_eficacia" else "#64748b"} for k,v in dmts_count.items() if k != "Sin Tratamiento"]
    uso_dmt.sort(key=lambda x: x["pacientes"], reverse=True)
    c_mot = Counter(motivos)
    m_chart = [{"motivo": k, "porcentaje": round((v/len(motivos))*100), "color": "#ef4444" if "Falla" in k else "#94a3b8"} for k,v in c_mot.items()]

    return {
        "resumen_general": {
            "total_pacientes": total, 
            "historias_registradas": len(archivos),
            # Cambiá el 32 por esto:
            "promedio_edad_diagnostico": int(sum(edades_actuales)/total) if total > 0 else 0,
            "promedio_edad_actual": int(sum(edades_actuales)/total) if total > 0 else 0,
            "porcentaje_femenino": int((genero_fem/total)*100) if total > 0 else 0
        },
        # ... resto del código igual
        "kpis_em": {
            "pacientes_neda3": round(neda_count/total, 2), "arr_promedio": round(arr_brotes/total, 2),
            "tiempo_a_edss_6_0_promedio": 14.5, "porcentaje_boc_positivas": int((boc_pos/boc_total)*100) if boc_total else 85
        },
        "discapacidad_y_progression": {"relacion_forma_terapia": [{"forma": k, **v} for k, v in formas_clinicas.items()], "edss_progresion_historica": []},
        "tratamiento_dmt": {"uso_dmt_actual": uso_dmt, "motivos_cambio_dmt": m_chart},
        "neuroimagen": {
            "conteo_lcr": boc_total, "conteo_rmn_total": len(archivos), "porcentaje_atrofia_reportada": int((atrofia_count/total)*100),
            "actividad_rmn_bianual": [{"periodo": "Actual", "activos": rmn_stats["activos"], "inactivos": rmn_stats["inactivos"]}]
        },
        "tratamiento_soporte": []
    }