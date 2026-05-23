# Backend - NeuroSoft (Grupo 21 - Seminario)

**NeuroSoft — Backend del Sistema de Historias Clínicas**
**Proyecto Seminario – UTN FRLP – Grupo 21**
**FastAPI • NLP Clínico (IA simbólica) • SQLite (SQLAlchemy) • Faker Data**

---

##  Quick Start (Puesta en marcha rápida)

Sigue estos pasos para levantar el entorno completo con base de datos y datos de prueba:

```bash
# 1. Entrar al directorio
cd backend

# 2. Crear y activar entorno virtual (Windows Git Bash)
python -m venv venv
source venv/Scripts/activate

# 3. Instalar dependencias
pip install -r requirements.txt
# (Incluye: fastapi, uvicorn, sqlalchemy, faker, pdfplumber, python-docx, pywin32)

# 4. 🧪 (Opcional) Generar datos de prueba
# Crea 30 historias clínicas sintéticas con IA (Faker) para poblar el sistema
python factory.py --out data/historias

# 5. 🗄️ Inicializar y Migrar Base de Datos
# Lee los JSONs generados (o existentes) y crea el archivo 'neurosoft.db'
python migrar_db.py

# 6. Ejecutar el Servidor
python -m uvicorn app.main:app --reload --port 8000

backend/
│
├── app/
│   ├── api/
│   │   ├── historias.py        # Listado y acceso a historias (Lee de BD ahora)
│   │   ├── importaciones.py    # Importación de PDF/DOCX/DOC + deduplicación
│   │   ├── pacientes.py        #  Gestión de pacientes en BD
│   │   ├── reportes.py         #  Endpoints del Dashboard KPI
│   │
│   │
│   ├── mock/
│   │   └── historias_list.json # Datos de ejemplo / mocks
│   │
│   │
│   ├── schemas/                # Esquemas Pydantic (Validación de entrada/salida)
│   │   ├── diagnostico_schema.py
│   │   ├── estudio_schema.py
│   │   ├── historia_schema.py
│   │   ├── importacion_schema.py
│   │   ├── paciente_schema.py
│   │   └── tratamiento_schema.py
│   │
│   ├── services/
│   │   ├── import_service.py   # Orquestación de importaciones
│   │   ├── nlp_service.py      # Motor de IA/NLP clínico
│   │   └── report_service.py   #  Lógica de KPIs leyendo de SQL
│   │
│   ├── utils/
│   │   ├── conversions.py
│   │   ├── extract_text.py     # Lectura de PDF, DOCX y DOC
│   │   ├── normalize.py        # Normalizaciones
│   │   ├── parsing.py
│   │   ├── patterns.py         # Patrones clínicos
│   │   ├── regex_patterns.py
│   │   └── segmenter.py        # Segmentación en secciones
│   │
│   ├── tests/
│   │   └── test_placeholder.py
│   │
│   └── main.py                 # Punto de entrada FastAPI
│
├── data/
│   └── historias/              # (Temporal) Destino de los JSON generados por Factory
│
├── uploads/                    # Archivos subidos por los usuarios
│
├── factory.py                  # ✅ (Nuevo) Generador de datos con Faker
├── migrar_db.py                # ✅ (Nuevo) Script para pasar JSON -> SQLite
├── limpiar_db.py               # ✅ (Nuevo) Script opcional para vaciar la BD
├── neurosoft.db                # ✅ (Nuevo) Archivo de Base de Datos (Ignorar en Git)
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── README.md                   # Actualizado con instrucciones de DB y Faker
└── requirements.txt


📝 Descripción General
Este backend implementa el núcleo lógico de NeuroSoft, un sistema inteligente para la gestión de historias clínicas de Esclerosis Múltiple.

🔄 Evolución Técnica

El sistema ha evolucionado de una persistencia basada en archivos planos a una Base de Datos Relacional (SQLite) gestionada con SQLAlchemy. Esto permite:
Integridad Referencial: Relación sólida entre Pacientes e Historias.
Analítica en Tiempo Real: Cálculo inmediato de KPIs como NEDA (No Evidence of Disease Activity), prevalencia de brotes y adherencia al tratamiento.
Escalabilidad: Manejo eficiente de grandes volúmenes de historias sin depender del sistema de archivos.


El objetivo es asistir al neurólogo permitiéndole:

Importar historias históricas (PDF/Word) y extraer datos automáticamente.
Validar y corregir la información extraída por la IA.
Visualizar la evolución del paciente mediante un Dashboard analítico.

🌟 Características Clave
1. 🧠 Motor de NLP Clínico (IA Simbólica)
El motor de extracción (nlp_service.py) utiliza reglas heurísticas avanzadas y reconocimiento de patrones por bloques para estructurar texto libre:

Datos Filiatorios: Extrae DNI, Nombre, Obra Social y Nro de Afiliado.
Diagnóstico: Identifica el tipo (RR, SP, PP), códigos OMS y fechas de inicio.
Tratamientos (Extracción por Bloques): Busca cabeceras como "Solicito:", "Indico:" o "Rp/" y captura el contenido hasta la firma, detectando drogas comerciales, genéricos y dosis, incluso con errores de tipeo.
Neuroimágenes (RMN Multilínea): Analiza informes complejos detectando actividad (Gadolinio positivo / nuevas lesiones) a través de múltiples líneas de texto.

Brotes: Detecta recaídas clínicas en la evolución y descartando falsos positivos (ej. "libre de brotes").

2. 📊 Dashboard Estadístico (Nuevo)
Gracias a la integración con SQLite, el sistema genera reportes visuales en tiempo real:
NEDA-3: Cálculo automático basado en la triada: sin brotes, sin progresión de EDSS y sin actividad en RMN.
Uso de DMTs: Distribución de terapias (Alta eficacia vs. Moderada).
Motivos de Cambio: Análisis de rotación de tratamientos (Falla terapéutica, Seguridad, Planificación familiar).

3. 🧪 Generador de Datos (Faker)
Incluye un script (factory.py) capaz de generar cohortes de pacientes sintéticos indistinguibles de datos reales.
Genera nombres, fechas y evoluciones médicas coherentes.
Simula trayectorias de enfermedad (pacientes estables vs. activos).
Ideal para pruebas de estrés y demostraciones sin comprometer datos reales.

4. 🚫 Deduplicación Inteligente
El sistema genera una "huella clínica" (hash del contenido + DNI + fecha) para permitir cargar múltiples documentos del mismo paciente, pero rechazando duplicados exactos.

Método,Endpoint,Descripción
POST,/importaciones/historias,"Sube PDF/DOCX, procesa con IA, deduplica y guarda borrador."
GET,/historias,Lista historias paginadas leyendo directamente de la BD.
GET,/reportes/dashboard,"Devuelve JSON con KPIs calculados (NEDA, DMTs, Demografía)."
PATCH,/historias/{id}/validacion,Permite al médico corregir y validar el borrador de la IA.

Gemini said
Aquí tienes la fusión definitiva. He combinado la profundidad técnica de tu README antiguo (que explicaba muy bien el NLP y la lógica de extracción) con la arquitectura moderna del nuevo (SQLite, Faker, Reportes).

Este documento cuenta la historia completa de tu proyecto: desde la IA simbólica hasta la persistencia profesional en base de datos.

Copia y pega esto en tu README.md:

Markdown
# Backend - NeuroSoft (Grupo 21 - Seminario)

🧩 **NeuroSoft — Backend del Sistema de Historias Clínicas**
**Proyecto Seminario – UTN FRLP – Grupo 21**
**FastAPI • NLP Clínico (IA simbólica) • SQLite (SQLAlchemy) • Faker Data**

---

## 🚀 Quick Start (Puesta en marcha rápida)

Sigue estos pasos para levantar el entorno completo con base de datos y datos de prueba:

```bash
# 1. Entrar al directorio
cd backend

# 2. Crear y activar entorno virtual (Windows Git Bash)
python -m venv venv
source venv/Scripts/activate

# 3. Instalar dependencias
pip install -r requirements.txt
# (Incluye: fastapi, uvicorn, sqlalchemy, faker, pdfplumber, python-docx, pywin32)

# 4. 🧪 (Opcional) Generar datos de prueba
# Crea 30 historias clínicas sintéticas con IA (Faker) para poblar el sistema
python factory.py --out data/historias

# 5. 🗄️ Inicializar y Migrar Base de Datos
# Lee los JSONs generados (o existentes) y crea el archivo 'neurosoft.db'
python migrar_db.py

# 6. Ejecutar el Servidor
python -m uvicorn app.main:app --reload --port 8000
📝 Descripción General
Este backend implementa el núcleo lógico de NeuroSoft, un sistema inteligente para la gestión de historias clínicas de Esclerosis Múltiple.

🔄 Evolución Técnica
El sistema ha evolucionado de una persistencia basada en archivos planos a una Base de Datos Relacional (SQLite) gestionada con SQLAlchemy. Esto permite:

Integridad Referencial: Relación sólida entre Pacientes e Historias.

Analítica en Tiempo Real: Cálculo inmediato de KPIs como NEDA (No Evidence of Disease Activity), prevalencia de brotes y adherencia al tratamiento.

Escalabilidad: Manejo eficiente de grandes volúmenes de historias sin depender del sistema de archivos.

El objetivo es asistir al neurólogo permitiéndole:

Importar historias históricas (PDF/Word) y extraer datos automáticamente.

Validar y corregir la información extraída por la IA.

Visualizar la evolución del paciente mediante un Dashboard analítico.

🏗 Arquitectura del Backend
Plaintext
backend/
│
├── app/
│   ├── api/
│   │   ├── historias.py        # Endpoints CRUD (Lee de SQLite)
│   │   ├── importaciones.py    # Subida de PDF/DOCX + Procesamiento NLP
│   │   ├── reportes.py         # ✅ Dashboard y estadísticas (SQL)
│   │   ├── pacientes.py        # Gestión de pacientes únicos
│   │   └── validaciones.py     # Endpoints de validación manual
│   │
│   ├── core/
│   │   ├── config.py
│   │   └── database.py         # 🔌 Conexión SQLAlchemy a 'neurosoft.db'
│   │
│   ├── models/                 # 🗄️ Modelos ORM (Tablas)
│   │   └── models.py           # Definición de tablas Paciente e HistoriaClinica
│   │
│   ├── services/
│   │   ├── nlp_service.py      # 🧠 Motor de IA/NLP clínico (Regex + Bloques)
│   │   └── report_service.py   # Lógica de KPIs (NEDA, EDSS, Drogas)
│   │
│   ├── utils/
│   │   ├── extract_text.py     # Lectura de PDF (pdfplumber) y DOCX
│   │   └── segmenter.py        # Segmentación inteligente de texto médico
│   │
│   └── main.py                 # Punto de entrada FastAPI
│
├── data/
│   └── historias/              # (Temporal) JSONs generados por el Factory
│
├── factory.py                  # 🏭 Generador de datos sintéticos (Faker)
├── migrar_db.py                # 🔄 Script de migración JSON -> SQLite
├── neurosoft.db                # 🗄️ Base de Datos (autogenerada)
├── requirements.txt
└── README.md
🌟 Características Clave
1. 🧠 Motor de NLP Clínico (IA Simbólica)
El motor de extracción (nlp_service.py) utiliza reglas heurísticas avanzadas y reconocimiento de patrones por bloques para estructurar texto libre:

Datos Filiatorios: Extrae DNI, Nombre, Obra Social y Nro de Afiliado.

Diagnóstico: Identifica el tipo (RR, SP, PP), códigos OMS y fechas de inicio.

Tratamientos (Extracción por Bloques): Busca cabeceras como "Solicito:", "Indico:" o "Rp/" y captura el contenido hasta la firma, detectando drogas comerciales, genéricos y dosis, incluso con errores de tipeo.

Neuroimágenes (RMN Multilínea): Analiza informes complejos detectando actividad (Gadolinio positivo / nuevas lesiones) a través de múltiples líneas de texto.

Brotes: Detecta recaídas clínicas en la evolución y descartando falsos positivos (ej. "libre de brotes").

2. 📊 Dashboard Estadístico (Nuevo)
Gracias a la integración con SQLite, el sistema genera reportes visuales en tiempo real:

NEDA-3: Cálculo automático basado en la triada: sin brotes, sin progresión de EDSS y sin actividad en RMN.

Uso de DMTs: Distribución de terapias (Alta eficacia vs. Moderada).

Motivos de Cambio: Análisis de rotación de tratamientos (Falla terapéutica, Seguridad, Planificación familiar).

3. 🧪 Generador de Datos (Faker)
Incluye un script (factory.py) capaz de generar cohortes de pacientes sintéticos indistinguibles de datos reales.

Genera nombres, fechas y evoluciones médicas coherentes.

Simula trayectorias de enfermedad (pacientes estables vs. activos).

Ideal para pruebas de estrés y demostraciones sin comprometer datos reales.

4. 🚫 Deduplicación Inteligente
El sistema genera una "huella clínica" (hash del contenido + DNI + fecha) para permitir cargar múltiples documentos del mismo paciente, pero rechazando duplicados exactos.

🚀 Endpoints Principales
Método	Endpoint	Descripción
POST	/importaciones/historias	Sube PDF/DOCX, procesa con IA, deduplica y guarda borrador.
GET	/historias	Lista historias paginadas leyendo directamente de la BD.
GET	/reportes/dashboard	Devuelve JSON con KPIs calculados (NEDA, DMTs, Demografía).
PATCH	/historias/{id}/validacion	Permite al médico corregir y validar el borrador de la IA.

✔ Estado de Implementación
✅ 4.1 Importación: Soporte robusto para PDF (pdfplumber), DOCX y DOC Legacy (pywin32).

✅ 4.2 Motor NLP: Extracción por bloques, RMN multilínea y heurísticas de fechas.

✅ 4.3 Persistencia: Migración completa a SQLite + SQLAlchemy.

✅ 4.4 Datos Sintéticos: Generador factory.py implementado.

✅ 4.5 Reportes: Dashboard completo funcionando con datos reales de la BD.

🛠 Requerimientos Técnicos
Lenguaje: Python 3.10+
Librerías Clave:
fastapi / uvicorn: API Server.
sqlalchemy: ORM para SQLite.
faker: Generación de datos sintéticos.
pdfplumber: Extracción de texto de PDFs modernos.
python-docx: Lectura de archivos Word modernos.
pywin32: Soporte exclusivo de Windows para archivos .doc antiguos (Word 97-2003).