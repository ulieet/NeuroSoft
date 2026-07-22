# Backend - NeuroSoft

**NeuroSoft — Backend de Procesamiento de Historias Clínicas y NLP**

---

## 🛠️ Arquitectura Real del Sistema

El backend de **NeuroSoft** está desarrollado en **Python (FastAPI)** y sigue una arquitectura desacoplada y orientada a resiliencia y ejecución 100% local/offline:

1. **Persistencia Basada en Archivos JSON**:
   * Los registros de pacientes se persisten en `./backend/data/pacientes/{clean_dni}.json`.
   * Las historias clínicas importadas y validadas se persisten en `./backend/data/historias/{id}.json`.
   * Los archivos físicos subidos se conservan de forma permanente en `./backend/uploads/`.

2. **Procesamiento NLP Híbrido (Dual Engine)**:
   * **Capa 1 (Ollama Local)**: Intenta conectarse a una instancia de Ollama en `http://localhost:11434` (modelo `qwen2.5:3b` o equivalente) para estructurar datos complejos.
   * **Capa 2 (Fallback Determinista / Reglas)**: Si Ollama no está disponible o falla, el sistema aplica automáticamente expresiones regulares precompiladas (`patterns.py`) y normalizaciones (`normalize.py`).
   * **Sin dependencias externas pagas**: Opera a costo $0 y sin llamadas a APIs en la nube (como Gemini).

3. **Lectura Universal de Documentos**:
   * Archivos `.pdf`: `pdfplumber`.
   * Archivos `.docx`: `python-docx`.
   * Archivos `.doc` antiguos: Herramienta Unix `antiword` invocada mediante subproceso Linux.

4. **Deduplicación de Historias**:
   * Generación de clave hash única (`dedup_key`) basada en DNI, fecha de consulta y hash del texto original para evitar la ingesta de documentos duplicados.

---

## 📁 Estructura del Backend

```
backend/
├── app/
│   ├── api/
│   │   ├── historias.py        # CRUD y validación individual/masiva de historias
│   │   ├── importaciones.py    # Endpoint multipart de subida y procesamiento NLP
│   │   ├── pacientes.py        # CRUD maestro de pacientes (con borrado en cascada en JSON)
│   │   └── reportes.py         # Estadísticas globales de cohorte (NEDA-3, ARR, DMTs)
│   │
│   ├── services/
│   │   ├── nlp_service.py      # Motor de NLP híbrido (Ollama + Reglas deterministas)
│   │   ├── patient_service.py  # Persistencia JSON del maestro de pacientes
│   │   └── report_service.py   # Agregación y cálculo de métricas clínicas
│   │
│   ├── utils/
│   │   ├── extract_text.py     # Lectura física (pdfplumber, docx, antiword)
│   │   ├── normalize.py        # Normalizadores de fechas, EDSS y moléculas
│   │   └── patterns.py         # Expresiones regulares precompiladas
│   │
│   └── main.py                 # Punto de entrada FastAPI
│
├── data/                       # Almacenamiento JSON persistente
│   ├── historias/
│   ├── pacientes/
│   └── perfiles_medicos/       # [Fase 0] Perfiles de extracción descubiertos
│
├── tools/
│   └── discover_profile.py     # Herramienta CLI para análisis empírico de corpus (~600 historias)
│
├── uploads/                    # Almacenamiento de archivos físicos subidos
├── .env                        # Variables de configuración local
└── requirements.txt
```

---

## 🚀 Puesta en Marcha Rápida

```bash
# 1. Entrar al directorio del backend
cd backend

# 2. Activar entorno virtual
source venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Ejecutar servidor de desarrollo
uvicorn app.main:app --reload --port 8000
```

---

## 🧪 Herramienta de Descubrimiento de Corpus (Fase 0)

Para analizar el patrón de redacción de las historias médicas y generar el Perfil de Extracción inicial:

```bash
./backend/venv/bin/python backend/tools/discover_profile.py
```

Esto generará los siguientes informes en `backend/data/perfiles_medicos/`:
* `perfil_descubierto_inicial.json`: Estructura JSON del perfil del médico.
* `reporte_estadistico_corpus.md`: Reporte con métricas de cobertura y ejemplos reales.