# Backend - NeuroClinic (Grupo 21 - Seminario)

🧩 **README — Backend del Sistema de Historias Clínicas** Proyecto Seminario – Grupo 21  
**FastAPI • NLP Clínico (IA simbólica) • Validación • Deduplicación**

---

Quick start
-----------
1. cd backend
2. python -m venv venv && source venv/bin/activate
3. pip install -r requirements.txt
4. uvicorn app.main:app --reload --port 8000


## 📌 Descripción General

Este backend implementa la **Fase 4** del proyecto Seminario (Grupo 21), específicamente el **módulo de Historias Clínicas**, que incluye:

- Importación de archivos **PDF, DOCX y DOC (Word 97-2003)**.
- Extracción automática de información clínica (**NLP basado en reglas y bloques**).
- Generación de **borradores estructurados** a partir de texto libre.
- Validación y corrección manual por profesionales.
- Prevención de historias duplicadas (deduplicación clínica inteligente).
- Persistencia en **archivos JSON** (sin BD real todavía).

El objetivo es integrar este backend con el **frontend en React** que desarrolla el equipo para que el neurólogo pueda:

- Cargar historias clínicas históricas.
- Revisar / corregir lo que extrajo el módulo de IA.
- Guardar historias ya validadas.
- Usar esos datos más adelante (análisis, reportes, filtros, etc.).

---

## 📁 Estructura del Backend (real y actualizada)

```text
backend/
│
├── app/
│   ├── api/
│   │   ├── historias.py        # Listado y acceso a historias
│   │   ├── importaciones.py    # Importación de PDF/DOCX/DOC + deduplicación
│   │   ├── pacientes.py        # (reservado para futuras extensiones)
│   │   ├── reportes.py         # (fase 4.5, no implementado)
│   │   └── validaciones.py     # Endpoints de validación manual
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py         # Placeholder (futuro pasaje a BD real)
│   │   └── security.py         # Placeholder (autenticación futura)
│   │
│   ├── mock/
│   │   └── historias_list.json # Datos de ejemplo / mocks
│   │
│   ├── models/
│   │   ├── diagnostico.py
│   │   ├── estudio.py
│   │   ├── historia.py
│   │   ├── importacion.py
│   │   ├── paciente.py
│   │   └── tratamiento.py
│   │
│   ├── schemas/
│   │   ├── diagnostico_schema.py
│   │   ├── estudio_schema.py
│   │   ├── historia_schema.py
│   │   ├── importacion_schema.py
│   │   ├── paciente_schema.py
│   │   └── tratamiento_schema.py
│   │
│   ├── services/
│   │   ├── import_service.py   # Orquestación de importaciones
│   │   ├── nlp_service.py      # Motor de IA/NLP clínico (extracción inteligente)
│   │   └── report_service.py   # (reservado para reportes fase 4.5)
│   │
│   ├── utils/
│   │   ├── conversions.py
│   │   ├── extract_text.py     # Lectura de PDF, DOCX y DOC (vía pywin32)
│   │   ├── normalize.py        # Normalizaciones (fechas, moléculas, forma, etc.)
│   │   ├── parsing.py
│   │   ├── patterns.py         # Patrones clínicos (RMN, LCR, fármacos, etc.)
│   │   ├── regex_patterns.py
│   │   └── segmenter.py        # Segmentación en secciones (síntomas, estudios, dx, etc.)
│   │
│   ├── tests/
│   │   └── test_placeholder.py
│   │
│   └── main.py                 # Punto de entrada FastAPI
│
├── data/
│   └── historias/              # JSON de historias procesadas y validadas
│
├── uploads/                    # Archivos subidos por los usuarios
│
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── README.md
└── requirements.txt

🚀 Endpoints Implementados
📥 1. Importación de Historias
POST /importaciones/historias

Recibe un archivo PDF, DOCX o DOC (multipart/form-data).

Guarda el archivo físico en uploads/.

Procesa el documento con nlp_service.process().

Genera un borrador clínico estructurado.

Calcula una huella clínica (dedup_key) que incluye hash del contenido para permitir múltiples documentos por fecha.

Guarda la historia en data/historias/{id}.json.

Si la huella ya existe (mismo contenido exacto) → responde 409 Conflict.

🔍 2. Listar historias
GET /historias

Devuelve una lista con datos generales de todas las historias almacenadas:

id

estado (pendiente_validacion | validada)

diagnostico

forma (si está disponible)

fecha_consulta

otros metadatos básicos

🧠 3. Obtener borrador (salida de IA/NLP)
GET /historias/{id}/borrador

Devuelve el borrador bruto generado por el motor de IA, incluyendo:

Datos extendidos del paciente (nombre, DNI, nacimiento, obra social, afiliado).

Datos de la consulta (fecha inteligente).

Diagnóstico, código OMS y forma clínica sugerida.

Secciones de texto completas: Síntomas y Antecedentes.

Complementarios (RMN multilínea, Punción lumbar).

Tratamientos farmacológicos extraídos por bloques ("Solicito:", "Indicación:").

Texto original.

✏️ 4. Validar historia
PATCH /historias/{id}/validacion

Permite que el profesional corrija / complete la información.

Recibe un JSON con los campos corregidos.

Actualiza el archivo data/historias/{id}.json cambiando el estado a "validada".

🧠 Módulo de IA / NLP Clínico
El motor de IA se encuentra en app/services/nlp_service.py y ha sido potenciado para manejar documentos complejos y antiguos.

🔍 ¿Qué extrae automáticamente?
1. Paciente (Datos Filiatorios)

Nombre y Apellido.

DNI.

Fecha de Nacimiento (con lógica para no confundirla con la fecha de consulta).

Obra Social y Número de Afiliado.

2. Consulta

Fecha de consulta (prioriza encabezados como "La Plata, 11 de Octubre..." sobre otras fechas en el texto).

3. Enfermedad / Diagnóstico

Diagnóstico principal (ej. "Esclerosis múltiple").

Código CIE/OMS (ej. "OMS-340").

Forma clínica (RR, SP, PP) inferida del texto.

Fecha de inicio de la enfermedad.

EDSS (si se explicita).

4. Secciones de Texto (Nuevo)

Extrae bloques completos de "Síntomas" y "Antecedentes" para facilitar la lectura del médico sin tener que buscar en todo el documento.

5. Estudios Complementarios

RMN Inteligente:

Detecta múltiples estudios en el mismo documento.

Lee a través de múltiples líneas (memoria de contexto).

Identifica actividad ("Activa"/"Inactiva"), uso de Gadolinio (incluyendo variantes como "volcado de Gd", "Gd.IV (+)") y regiones afectadas.

Punción lumbar / LCR: Detección de bandas oligoclonales.

6. Tratamientos (Lógica de Bloques)

Utiliza una estrategia de "Extracción por Bloques": busca cabeceras como "Solicito:", "Tratamiento:", "Indico:", "Rp/" y captura todo el contenido hasta la firma.

Esto permite detectar medicamentos con errores de tipeo o variantes (ej. "Interferón" con tilde, "Dimeful" mapeado a Dimetil Fumarato).

Extrae: Molécula normalizada, Dosis, Estado (Activo/Suspendido) y Fecha de inicio si está cerca.

🚫 Sistema de Deduplicación
El sistema genera una huella clínica (dedup_key) robusta:

Combina DNI + Fecha Consulta + Hash del Texto.

Esto permite cargar múltiples documentos del mismo día (ej. un informe de RMN y una consulta) siempre que su contenido sea diferente, evitando bloqueos erróneos.

📄 Soporte de Archivos
PDF (texto seleccionable).

DOCX (Word moderno).

DOC (Word 97-2003): Soporte nativo en Windows mediante pywin32 para leer archivos antiguos de hospitales.

✔ Estado de Implementación – Fase 4

4.1✅ ListoImportación de PDF, DOCX y DOC, guardado en uploads/.
4.2✅ ListoMotor NLP avanzado: Bloques, RMN multilínea, Datos extra paciente.4.3✅ Backend listoEndpoints de listado, borrador y validación + persistencia JSON.
4.3✅ Frontend integradoPantallas de importación, listado, detalle y validación totalmente funcionales.
4.4⏳ PróximoMotor clínico avanzado (tendencias, actividad, progresión).4.5❌ No iniciadoReportes (gráficos, estadísticas).

🛠 Instalación y ejecución
Requerimientos Asegúrate de instalar las dependencias, incluyendo el soporte para .doc (pywin32):

pip install -r requirements.txt
# Si estás en Windows y vas a usar archivos .doc:
pip install pywin32

EJECUTAR SERVIDOR
uvicorn app.main:app --reload