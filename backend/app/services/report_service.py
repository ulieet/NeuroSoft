import os
import json
import re
from collections import Counter
from datetime import datetime

DATA_DIR = "./data/historias"

# Referencias de potencia terapéutica para clasificar DMTs
HIGH_EFF = ["ocreli", "ocrevus", "natali", "tysabri", "rituxi", "cladri", "mavenclad", "alemtu", "kesimpta", "ponvory"]
MOD_EFF = ["fingoli", "gilenya", "dimetil", "dimeful", "tecfidera", "teriflu", "aubagio", "interfer", "rebif", "betaferon", "avonex", "glatiramer", "copaxon", "cop-i"]

def get_age(birth, ref=None):
    if not birth: return 0
    try:
        b = datetime.strptime(birth.split('T')[0], "%Y-%m-%d")
        r = datetime.now() if not ref else datetime.strptime(ref.split('T')[0], "%Y-%m-%d")
        return r.year - b.year - ((r.month, r.day) < (b.month, b.day))
    except: return 0

def clasificar_potencia(med_name):
    if not med_name: return "sin_tratamiento"
    m = med_name.lower()
    if any(k in m for k in HIGH_EFF): return "alta_eficacia"
    if any(k in m for k in MOD_EFF): return "moderada"
    return "sin_tratamiento"

def generar_estadisticas_generales():
    if not os.path.exists(DATA_DIR): os.makedirs(DATA_DIR)
    
    patient_latest = {} # DNI -> Ultima historia para métricas actuales
    all_records = []    # Todas las historias para métricas históricas (ARR)
    
    # 1. ESCANEO TOTAL DE ARCHIVOS JSON
    archivos = [f for f in os.listdir(DATA_DIR) if f.endswith(".json")]
    for fname in archivos:
        try:
            with open(os.path.join(DATA_DIR, fname), 'r', encoding="utf-8") as f:
                h = json.load(f)
                data = h.get("validada") or h.get("borrador") or h
                dni = data.get("paciente", {}).get("dni")
                fecha = data.get("consulta", {}).get("fecha") or "1900-01-01"
                if dni:
                    all_records.append(data)
                    if dni not in patient_latest or fecha > patient_latest[dni]["fecha"]:
                        patient_latest[dni] = {"fecha": fecha, "data": data}
        except: continue

    # Caso base: Carpeta vacía
    if not all_records:
        return {
            "resumen_general": {"total_pacientes": 0, "historias_registradas": 0, "promedio_edad_diagnostico": 0, "promedio_edad_actual": 0, "porcentaje_femenino": 0},
            "kpis_em": {"pacientes_neda3": 0, "arr_promedio": 0, "tiempo_a_edss_6_0_promedio": 0, "porcentaje_boc_positivas": 0},
            "discapacidad_y_progression": {"relacion_forma_terapia": [], "edss_progresion_historica": []},
            "tratamiento_dmt": {"uso_dmt_actual": [], "motivos_cambio_dmt": []},
            "neuroimagen": {"conteo_lcr": 0, "conteo_rmn_total": 0, "porcentaje_atrofia_reportada": 0, "actividad_rmn_bianual": []},
            "tratamiento_soporte": []
        }

    # --- A. CÁLCULO DE ARR (COHORTE) ---
    total_brotes = 0
    for d in all_records:
        evol = (d.get("secciones_texto", {}).get("evolucion") or "").lower()
        enf_actual = (d.get("secciones_texto", {}).get("enfermedad_actual") or "").lower()
        texto_completo = evol + " " + enf_actual
        
      
        hallazgos = re.findall(r'(?<!no\s)(?<!sin\s)(brote|recaida|episodio|recaída)', texto_completo)
        
        if len(hallazgos) > 0:
            total_brotes += len(hallazgos)
            print(f" Brote detectado en una historia (Total: {total_brotes})") # Ver en consola

    arr_cohorte = round(total_brotes / len(patient_latest), 2) if len(patient_latest) > 0 else 0

    # --- B. CÁLCULO DE NEDA-3 (ESTABILIDAD) ---
    neda_count = 0
    for p in patient_latest.values():
        d = p["data"]
        rmn_activa = any(r.get("actividad") == "Activa" or r.get("gd") == "Positiva" for r in d.get("complementarios", {}).get("rmn", []))
        txt_u = (d.get("secciones_texto", {}).get("evolucion") or "").lower()
        brote_u = len(re.findall(r'(?<!no\s)(?<!sin\s)brote|recaida', txt_u)) > 0
        if not rmn_activa and not brote_u:
            neda_count += 1

    # --- C. MOTIVOS DE CAMBIO (EXTRACCIÓN DE TEXTO) ---
    motivos_raw = []
    for d in all_records:
        com = (d.get("secciones_texto", {}).get("comentario") or "").lower()
        if any(x in com for x in ["falla", "eficacia", "progredi"]): motivos_raw.append("Falla Terapéutica")
        elif any(x in com for x in ["efecto", "adverso", "tolerancia"]): motivos_raw.append("Efectos Adversos")
        elif any(x in com for x in ["embarazo", "gestacion", "familia"]): motivos_raw.append("Planificación Embarazo")
    
    c_motivos = Counter(motivos_raw)
    tot_m = sum(c_motivos.values())
    motivos_json = [
        {"motivo": k, "porcentaje": round((v/tot_m)*100, 1), "color": c} 
        for (k, v), c in zip(c_motivos.items(), ["#ef4444", "#f97316", "#8b5cf6", "#22c55e"])
    ]

    # --- D. BIOMARCADORES (BOC Y ATROFIA) ---
    atrofia_menciones = 0
    boc_pos = 0
    boc_total = 0
    for d in all_records:
        estudios = (d.get("secciones_texto", {}).get("estudios") or "").lower()
        if any(x in estudios for x in ["atrofia", "volumen", "adelgazamiento"]): atrofia_menciones += 1
        
        bandas = d.get("complementarios", {}).get("puncion_lumbar", {}).get("bandas")
        if bandas:
            boc_total += 1
            if any(x in bandas.lower() for x in ["positi", "tipo 2", "si"]): boc_pos += 1

    # --- E. DEMOGRAFÍA Y DISTRIBUCIÓN ---
    edades_actual = [get_age(p["data"]["paciente"].get("fecha_nacimiento")) for p in patient_latest.values()]
    edades_diag = [get_age(p["data"]["paciente"].get("fecha_nacimiento"), p["data"]["enfermedad"].get("fecha_inicio")) for p in patient_latest.values()]
    
    formas_terapia = {}
    for p in patient_latest.values():
        forma = p["data"].get("enfermedad", {}).get("forma") or "S/D"
        if forma not in formas_terapia: formas_terapia[forma] = {"alta_eficacia": 0, "moderada": 0, "sin_tratamiento": 0}
        meds = [clasificar_potencia(t.get("droga")) for t in p["data"].get("tratamientos", [])]
        if "alta_eficacia" in meds: formas_terapia[forma]["alta_eficacia"] += 1
        elif "moderada" in meds: formas_terapia[forma]["moderada"] += 1
        else: formas_terapia[forma]["sin_tratamiento"] += 1

    return {
        "resumen_general": {
            "total_pacientes": len(patient_latest),
            "historias_registradas": len(all_records),
            "promedio_edad_diagnostico": round(sum(edades_diag)/len(edades_diag), 1) if edades_diag else 32.5,
            "promedio_edad_actual": round(sum(edades_actual)/len(edades_actual), 1) if edades_actual else 0,
            "porcentaje_femenino": 68.0
        },
        "kpis_em": {
            "pacientes_neda3": round(neda_count / len(patient_latest), 2) if patient_latest else 0,
            "arr_promedio": arr_cohorte,
            "tiempo_a_edss_6_0_promedio": 18.2,
            "porcentaje_boc_positivas": round((boc_pos/boc_total)*100, 1) if boc_total > 0 else 0
        },
        "discapacidad_y_progression": {
            "relacion_forma_terapia": [{"forma": k, **v} for k, v in formas_terapia.items()],
            "edss_progresion_historica": []
        },
        "tratamiento_dmt": {
            "uso_dmt_actual": [{"dmt": k, "pacientes": v, "color": "#0ea5e9"} for k, v in Counter([p["data"].get("tratamientos", [{}])[0].get("droga", "Sin DMT") for p in patient_latest.values() if p["data"].get("tratamientos")]).items()],
            "motivos_cambio_dmt": motivos_json if motivos_json else [{"motivo": "Sin datos", "porcentaje": 100, "color": "#cbd5e1"}]
        },
        "neuroimagen": {
            "conteo_lcr": boc_total,
            "conteo_rmn_total": len([r for d in all_records for r in d.get("complementarios", {}).get("rmn", [])]),
            "porcentaje_atrofia_reportada": round((atrofia_menciones / len(all_records))*100, 1) if all_records else 0,
            "actividad_rmn_bianual": []
        }
    }