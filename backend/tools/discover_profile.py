import os
import sys
import re
import json
from collections import Counter, defaultdict
from pathlib import Path

# Añadir directorio backend al sys.path para importar extract_text
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.utils.extract_text import extract_text

# Definición de moléculas y marcas conocidas de Esclerosis Múltiple (DMTs y Sintomáticos)
KNOWN_DRUGS = {
    "fingolimod": ["fng", "fingolimod", "lebrina", "gilenya"],
    "natalizumab": ["ntz", "natalizumab", "tysabri"],
    "ocrelizumab": ["ocr", "ocrelizumab", "ocrevus"],
    "teriflunomida": ["aubagio", "teriflunomida", "terflimida"],
    "interferon_beta_1a": ["rebif", "rebif-nf", "inmunomas", "blastoferon", "blastoferón", "inf b1ar", "interferon", "interferón"],
    "glatiramer": ["copaxone", "cop-i", "cop i"],
    "dimetilfumarato": ["dimeful", "datizic", "tecfidera"],
    "fampridina": ["4-ap", "4 ap", "escadra", "fampridina"],
    "cladribina": ["mavenclad", "cladribina"],
    "rituximab": ["rituximab", "mabthera"],
    "azatioprina": ["imuran", "azatioprina"],
    "baclofeno": ["baclofen", "baclofeno", "lioresal", "liore"],
    "gabapentina": ["gabapentin", "gabapentín", "neurontin"],
    "pregabalina": ["pregabalina", "lyrica"],
    "modafinilo": ["modafinilo", "visper"],
    "oxibutinina": ["oxibutinina"],
    "metilprednisolona": ["metilprednisolona", "metilpred", "pulso metilpred"],
}

# Subtipos / Marcas comerciales comunes en el corpus de NeuroSoft
KNOWN_BRANDS_AND_ACRONYMS = [
    "FNG", "NTZ", "OCR", "COP-I", "4-AP", "INF", "AUBAGIO", "REBIF", "BLASTOFERON", "BLASTOFERÓN",
    "INMUNOMAS", "DIMEFUL", "DATIZIC", "ESCADRA", "LIORESAL", "NEURONTIN", "PREGABALINA", "VISPER",
    "IMURAN", "POLI 40", "TERFLIMIDA", "LEBRINA"
]


def find_corpus_files(search_paths):
    files = []
    supported_exts = {".doc", ".docx", ".pdf", ".txt", ".json"}
    for sp in search_paths:
        path_obj = Path(sp)
        if not path_obj.exists():
            continue
        if path_obj.is_file() and path_obj.suffix.lower() in supported_exts:
            files.append(str(path_obj))
        elif path_obj.is_dir():
            for root, _, filenames in os.walk(sp):
                for fn in filenames:
                    ext = Path(fn).suffix.lower()
                    if ext in supported_exts:
                        files.append(os.path.join(root, fn))
    return list(set(files))


def run_discovery():
    root_dir = Path(__file__).resolve().parent.parent.parent
    historias_prueba = root_dir / "Historias de prueba"
    backend_data = root_dir / "backend" / "data" / "historias"

    corpus_files = find_corpus_files([str(historias_prueba), str(backend_data)])
    print(f"[*] Archivos encontrados en el corpus: {len(corpus_files)}")

    documents = []
    errors_count = 0

    for idx, filepath in enumerate(corpus_files, 1):
        filename = os.path.basename(filepath)
        ext = Path(filepath).suffix.lower()
        text = ""

        if ext == ".json":
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    text = data.get("texto_original", "") or json.dumps(data, ensure_ascii=False)
            except Exception:
                continue
        else:
            text, pages, ftype = extract_text(filepath)

        if text and len(text.strip()) > 20:
            documents.append({
                "id": idx,
                "file_path": filepath,
                "filename": filename,
                "ext": ext,
                "text": text
            })
        else:
            errors_count += 1

    print(f"[*] Documentos leídos exitosamente: {len(documents)} (Errores/Vacíos: {errors_count})")

    # Contadores y estructuras de recolección con ejemplos
    headers_counter = Counter()
    headers_examples = defaultdict(list)

    abbrev_counter = Counter()
    abbrev_examples = defaultdict(list)

    dates_counter = Counter()
    dates_examples = defaultdict(list)

    edss_counter = Counter()
    edss_examples = defaultdict(list)

    sentences_counter = Counter()
    sentences_examples = defaultdict(list)

    spelling_counter = Counter()
    spelling_examples = defaultdict(list)

    # Cobertura determinista
    docs_with_date = 0
    docs_with_edss = 0
    docs_with_em = 0
    docs_with_dmt = 0

    # Regex patterns
    date_regex = re.compile(
        r'\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+\d{2,4})?|(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s*[-/]?\s*\d{2,4})\b',
        re.IGNORECASE
    )
    edss_regex = re.compile(r'\b(?:edss|discapacidad)\s*[:=]?\s*(\d[.,]?\d?)\b', re.IGNORECASE)
    em_regex = re.compile(r'\b(?:esclerosis\s+múltiple|esclerosis\s+multiple|emrr|em-rr|cie-10\s*g35|g35)\b', re.IGNORECASE)

    # Errores comunes / Variantes típicas
    typo_patterns = [
        ("blastoferon", "Blastoferón"),
        ("terflimida", "Teriflunomida"),
        ("kinesio", "Kinesiología"),
        ("rehabil", "Rehabilitación"),
        ("inmunomas", "Inmunomas NF"),
        ("reahabilitación", "Rehabilitación"),
    ]

    for doc in documents:
        text = doc["text"]
        lines = [line.strip() for line in text.split("\n") if line.strip()]

        has_date = False
        has_edss = False
        has_em = False
        has_dmt = False

        # Check EM
        if em_regex.search(text):
            has_em = True
            docs_with_em += 1

        # Process lines
        for line in lines:
            # 1. Headers / Secciones
            if len(line) < 60 and (line.endswith(":") or line.isupper() or any(h in line.upper() for h in ["SOLICITUD", "CONTINUIDAD", "PASE A", "REITERACIÓN", "ESTUDIOS", "GRAL", "REHABIL"])):
                clean_header = line.strip().rstrip(":")
                if len(clean_header) >= 3:
                    headers_counter[clean_header] += 1
                    if len(headers_examples[clean_header]) < 3:
                        headers_examples[clean_header].append({
                            "filename": doc["filename"],
                            "snippet": line
                        })

            # 2. Fechas
            for m_date in date_regex.finditer(line):
                has_date = True
                date_str = m_date.group(0)
                dates_counter[date_str] += 1
                if len(dates_examples[date_str]) < 3:
                    dates_examples[date_str].append({
                        "filename": doc["filename"],
                        "context": line
                    })

            # 3. EDSS
            for m_edss in edss_regex.finditer(line):
                has_edss = True
                edss_str = m_edss.group(0)
                edss_counter[edss_str] += 1
                if len(edss_examples[edss_str]) < 3:
                    edss_examples[edss_str].append({
                        "filename": doc["filename"],
                        "context": line
                    })

            # 4. Abreviaturas y Medicamentos
            for token in re.findall(r'\b[A-Za-z0-9ÁÉÍÓÚáéíóúñÑ\-\.\+]{2,20}\b', line):
                token_upper = token.upper()
                token_lower = token.lower()

                # Check in known acronyms or drugs
                for canon_drug, brand_list in KNOWN_DRUGS.items():
                    if token_lower in brand_list or token_upper in [b.upper() for b in brand_list]:
                        has_dmt = True
                        abbrev_counter[token_upper] += 1
                        if len(abbrev_examples[token_upper]) < 3:
                            abbrev_examples[token_upper].append({
                                "expansion_candidata": canon_drug.capitalize(),
                                "filename": doc["filename"],
                                "context": line
                            })

            # 5. Errores / Variantes ortográficas
            line_lower = line.lower()
            for typo, correction in typo_patterns:
                if typo in line_lower:
                    spelling_counter[typo] += 1
                    if len(spelling_examples[typo]) < 3:
                        spelling_examples[typo].append({
                            "corregido_sugerido": correction,
                            "filename": doc["filename"],
                            "context": line
                        })

            # 6. Frases repetitivas / Boilerplate (frases de 5+ palabras)
            words = line.split()
            if 5 <= len(words) <= 25:
                # Normalizar frase para encontrar plantillas
                norm_phrase = " ".join(words).lower()
                if any(kw in norm_phrase for kw in ["solicito", "continuidad", "adjunto", "certifico", "paciente con diagnóstico", "tratamiento con", "pase a"]):
                    sentences_counter[norm_phrase] += 1
                    if len(sentences_examples[norm_phrase]) < 2:
                        sentences_examples[norm_phrase].append({
                            "filename": doc["filename"],
                            "texto_original": line
                        })

        if has_date:
            docs_with_date += 1
        if has_edss:
            docs_with_edss += 1
        if has_dmt:
            docs_with_dmt += 1

    total_docs = max(1, len(documents))

    pct_date = round((docs_with_date / total_docs) * 100, 1)
    pct_edss = round((docs_with_edss / total_docs) * 100, 1)
    pct_em = round((docs_with_em / total_docs) * 100, 1)
    pct_dmt = round((docs_with_dmt / total_docs) * 100, 1)

    # Estimación global determinista: Documentos que tienen fecha + DMT o EDSS mediante regex sin LLM
    docs_fully_deterministic = sum(
        1 for d in documents
        if (em_regex.search(d["text"]) or date_regex.search(d["text"])) and any(drug in d["text"].lower() for drug_list in KNOWN_DRUGS.values() for drug in drug_list)
    )
    pct_deterministic = round((docs_fully_deterministic / total_docs) * 100, 1)
    pct_llm = round(100.0 - pct_deterministic, 1)

    # Construir Perfil Descubierto JSON
    perfil_json = {
        "medico_id": "dr_perez_cohorte_inicial",
        "meta": {
            "fecha_analisis": "2026-07-21",
            "total_documentos_corpus": len(documents),
            "documentos_procesados_exito": len(documents),
            "cobertura_estatistica": {
                "porcentaje_regex_determinista": pct_deterministic,
                "porcentaje_requiere_llm": pct_llm
            }
        },
        "encabezados_secciones": [
            {
                "encabezado": h,
                "frecuencia": freq,
                "ejemplos_reales": headers_examples[h]
            }
            for h, freq in headers_counter.most_common(25)
        ],
        "glosario_abreviaturas_y_farmacos": [
            {
                "termino_detectado": term,
                "frecuencia": freq,
                "ejemplos_reales": abbrev_examples[term]
            }
            for term, freq in abbrev_counter.most_common(30)
        ],
        "formatos_fecha_detectados": [
            {
                "patron_ejemplo": df,
                "frecuencia": freq,
                "ejemplos_reales": dates_examples[df]
            }
            for df, freq in dates_counter.most_common(15)
        ],
        "expresiones_edss_detectadas": [
            {
                "expresion": ed,
                "frecuencia": freq,
                "ejemplos_reales": edss_examples[ed]
            }
            for ed, freq in edss_counter.most_common(15)
        ],
        "frases_boilerplate_plantillas": [
            {
                "frase_normalizada": phrase,
                "frecuencia": freq,
                "ejemplos_reales": sentences_examples[phrase]
            }
            for phrase, freq in sentences_counter.most_common(20) if freq >= 2
        ],
        "variantes_y_erratas_ortograficas": [
            {
                "variante_detectada": typo,
                "frecuencia": freq,
                "ejemplos_reales": spelling_examples[typo]
            }
            for typo, freq in spelling_counter.most_common(15)
        ]
    }

    # Guardar perfil JSON
    out_dir = backend_dir / "data" / "perfiles_medicos"
    out_dir.mkdir(parents=True, exist_ok=True)

    json_path = out_dir / "perfil_descubierto_inicial.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(perfil_json, f, ensure_ascii=False, indent=2)

    # Construir Reporte Estadístico Markdown
    md_content = f"""# 📊 Reporte Estadístico de Descubrimiento de Corpus - NeuroSoft

**Fecha de Generación**: 2026-07-21  
**Total de Historias Clínicas Analizadas**: {len(documents)}  
**Archivos con Extracción Exitosa**: {len(documents)} ({errors_count} omitidos por error/vacíos)  

---

## 📈 1. Cobertura Estimada del Engine (Regex Dinámico vs LLM)

| Métrica | Valor | Porcentaje del Corpus |
| :--- | :---: | :---: |
| **Historias con Fecha de Consulta Detectada por Regex** | {docs_with_date} | {pct_date}% |
| **Historias con Puntaje EDSS Detectado por Regex** | {docs_with_edss} | {pct_edss}% |
| **Historias con Diagnóstico EM / CIE-10 G35** | {docs_with_em} | {pct_em}% |
| **Historias con Fármaco DMT / Sintomático Reconocido** | {docs_with_dmt} | {pct_dmt}% |
| **⚡ Extracción Totalmente Determinista (Capa 1 Regex)** | **{docs_fully_deterministic}** | **{pct_deterministic}%** |
| **🤖 Extracción Requiere Inferencia (Capa 2 LLM)** | **{len(documents) - docs_fully_deterministic}** | **{pct_llm}%** |

> **Conclusión**: El **{pct_deterministic}%** de las historias del corpus actual contiene suficiente estructura estandarizada para resolverse en $< 10\\text{{ ms}}$ mediante Regex compiladas del Perfil sin necesidad de invocar al LLM Ollama.

---

## 🗂️ 2. Encabezados y Secciones Más Frecuentes (con Ejemplos Reales)

| Encabezado Detectado | Frecuencia | Ejemplo Real en Corpus |
| :--- | :---: | :--- |
"""
    for item in perfil_json["encabezados_secciones"][:15]:
        ex_text = item["ejemplos_reales"][0]["snippet"] if item["ejemplos_reales"] else "-"
        md_content += f"| `{item['encabezado']}` | **{item['frecuencia']}** | `{ex_text}` |\n"

    md_content += """
---

## 💊 3. Fármacos, Abreviaturas y Acrónimos Frecuentes (con Ejemplos Reales)

| Término / Abreviatura | Frecuencia | Expansión Candidata | Ejemplo de Uso en Contexto |
| :--- | :---: | :--- | :--- |
"""
    for item in perfil_json["glosario_abreviaturas_y_farmacos"][:15]:
        ex_data = item["ejemplos_reales"][0] if item["ejemplos_reales"] else {}
        exp = ex_data.get("expansion_candidata", "-")
        ctx = ex_data.get("context", "-")
        md_content += f"| **{item['termino_detectado']}** | **{item['frecuencia']}** | {exp} | `{ctx}` |\n"

    md_content += """
---

## 📊 4. Expresiones de EDSS Detectadas (con Ejemplos Reales)

| Expresión Exacta | Frecuencia | Ejemplo en Contexto |
| :--- | :---: | :--- |
"""
    for item in perfil_json["expresiones_edss_detectadas"][:10]:
        ctx = item["ejemplos_reales"][0]["context"] if item["ejemplos_reales"] else "-"
        md_content += f"| `{item['expresion']}` | **{item['frecuencia']}** | `{ctx}` |\n"

    md_content += """
---

## 📝 5. Frases Plantilla Repetitivas (Boilerplate)

| Frase Repetitiva Detectada | Frecuencia | Ejemplo Completo |
| :--- | :---: | :--- |
"""
    for item in perfil_json["frases_boilerplate_plantillas"][:10]:
        ex_orig = item["ejemplos_reales"][0]["texto_original"] if item["ejemplos_reales"] else "-"
        md_content += f"| *{item['frase_normalizada'][:40]}...* | **{item['frecuencia']}** | `{ex_orig}` |\n"

    md_content += """
---

## ⚠️ 6. Erratas y Variantes Ortográficas Frecuentes

| Variante / Tipeo Detectado | Frecuencia | Corrección Sugerida | Ejemplo |
| :--- | :---: | :--- | :--- |
"""
    for item in perfil_json["variantes_y_erratas_ortograficas"]:
        ex_data = item["ejemplos_reales"][0] if item["ejemplos_reales"] else {}
        corr = ex_data.get("corregido_sugerido", "-")
        ctx = ex_data.get("context", "-")
        md_content += f"| `{item['variante_detectada']}` | **{item['frecuencia']}** | **{corr}** | `{ctx}` |\n"

    md_path = out_dir / "reporte_estadistico_corpus.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"\n[✔] ¡Proceso completado exitosamente!")
    print(f"    - Perfil JSON guardado en: {json_path}")
    print(f"    - Reporte Markdown guardado en: {md_path}")


if __name__ == "__main__":
    run_discovery()
