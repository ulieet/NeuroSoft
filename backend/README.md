# Backend - NeuroClinic (Grupo 21 - Seminario)

🧩 **README — Backend del Sistema de Historias Clínicas**  
Proyecto Seminario – Grupo 21  
**FastAPI • NLP Clínico (IA simbólica) • Validación • Deduplicación**

---

## 📌 Descripción General

Este backend implementa la **Fase 4** del proyecto Seminario (Grupo 21), específicamente el **módulo de Historias Clínicas**, que incluye:

- Importación de archivos **PDF/DOCX**
- Extracción automática de información clínica (**NLP basado en reglas**)
- Generación de **borradores estructurados** a partir de texto libre
- Validación y corrección manual por profesionales
- Prevención de historias duplicadas (deduplicación clínica)
- Persistencia en **archivos JSON** (sin BD real todavía)

El objetivo es integrar este backend con el **frontend en React** que desarrolla el equipo para que el neurólogo pueda:

- Cargar historias clínicas históricas
- Revisar / corregir lo que extrajo el módulo de IA
- Guardar historias ya validadas
- Usar esos datos más adelante (análisis, reportes, filtros, etc.)

---

## 📁 Estructura del Backend (real y actualizada)

```text
backend/
│
├── app/
│   ├── api/
│   │   ├── historias.py        # Listado y acceso a historias
│   │   ├── importaciones.py    # Importación de PDF/DOCX + deduplicación
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
│   │   ├── nlp_service.py      # Motor de IA/NLP clínico (extracción)
│   │   └── report_service.py   # (reservado para reportes fase 4.5)
│   │
│   ├── utils/
│   │   ├── conversions.py
│   │   ├── extract_text.py     # OCR / lectura de PDF/DOCX
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
├── uploads/                    # PDF/DOCX subidos por los usuarios
│
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── README.md
└── requirements.txt
🚀 Endpoints Implementados
📥 1. Importación de Historias
http
-------
POST /importaciones/historias
Recibe un archivo PDF o DOCX (multipart/form-data)

Guarda el archivo en uploads/

Pasa el documento a nlp_service.process()

Genera un borrador clínico estructurado

Calcula una huella clínica (dedup_key)

Guarda la historia en data/historias/{id}.json

Si la huella ya existe → responde 409 Conflict (historia duplicada)

🔍 2. Listar historias
http
--------
GET /historias
Devuelve una lista con datos generales de todas las historias almacenadas:

id

estado (pendiente_validacion | validada)

diagnostico

forma (si está disponible)

fecha_consulta

otros metadatos básicos

🧠 3. Obtener borrador (salida de IA/NLP)
http
--------
GET /historias/{id}/borrador
Devuelve el borrador bruto generado por el motor de IA, incluyendo:

Datos del paciente (nombre, DNI cuando se pudo extraer)

Datos de la consulta (fecha)

Diagnóstico y forma clínica sugerida (RR/SP/PP para EM, o null si no aplica)

Fecha de inicio de la enfermedad

Complementarios:

RMN: lista de estudios (fecha, actividad, gd, regiones)

Punción lumbar: realizada / bandas

Tratamientos farmacológicos:

Interferón beta-1b, Acetato de Glatiramer, y DOACs (Apixaban, Rivaroxaban, etc.)

Dosis, vía (SC/IV/VO/…), frecuencia (ej. “tres veces por semana”, “día por medio”, “1 comprimido cada 12 horas”)

Texto original (limitado para evitar respuestas gigantes)

Puntajes de confianza por campo (confidencia):

forma

EDSS

punción lumbar

Este endpoint es el que va a consumir el frontend de validación.

✏️ 4. Validar historia
http
--------
PATCH /historias/{id}/validacion
Permite que el profesional corrija / complete la información:

Recibe un JSON con los campos corregidos (ej. forma clínica, tratamientos, nombre si faltaba, etc.)

Actualiza el archivo data/historias/{id}.json

Cambia el estado a:

json
--------
"estado": "validada",
"validada": { ...datos corregidos... }
🧠 Módulo de IA / NLP Clínico
El motor de IA se encuentra en:

app/services/nlp_service.py
y utiliza utilidades de:

app/utils/extract_text.py

app/utils/segmenter.py

app/utils/patterns.py

app/utils/normalize.py

🔍 ¿Qué extrae automáticamente?
A partir del texto plano de la historia clínica (ej. “Resumen de historia clínica” de un hospital), el sistema intenta extraer:

👤 Paciente

Nombre (incluyendo casos multilinea tipo “Apellido y Nombre:\nPérez, X”)

DNI (en la misma línea o abajo de “DNI:”)

📅 Consulta

Fecha de consulta (normalizada a YYYY-MM-DD)

A partir de encabezados como “La Plata, 03 de Agosto de 2021”

🧠 Enfermedad / diagnóstico

Diagnóstico principal (ej. “Esclerosis múltiple”, “Fibrilación Auricular Paroxística (I48.0)”)

Forma clínica:

EM remitente-recurrente (RR)

EM secundariamente progresiva (SP)

EM primariamente progresiva (PP)

Solo se asigna SP/PP si el texto menciona explícitamente formas progresivas

Si hay diagnosticado “Esclerosis Múltiple Remitente”, puede inferir RR

Fecha de inicio (heurísticas basadas en frases tipo “Asistida desde:…”, “Inicio en…”, “Primer brote…”)

EDSS (si aparece en el texto)

🧪 Estudios complementarios

RMN:

Fechas de cada RMN

Actividad: Activa / Inactiva

Presencia de Gd(+)/Gd(-)

Regiones (ej. supratentorial, infratentorial, medular, etc.)

Agrupa varias menciones de la misma fecha → no duplica estudios

Punción lumbar / LCR:

Si está realizada o no

Si hay bandas oligoclonales positivas o no

💊 Tratamientos

Detecta líneas que indican inicio/continuidad de tratamiento, por ejemplo:

“Debe continuar con Acetato de Glatiramer 40 mg SC tres veces por semana.”

“Apixaban 5 mg, 1 comprimido cada 12 horas.”

“Continuar con Interferón Beta 1b 8 MUI SC día por medio.”

Reconoce moléculas como:

Acetato de Glatiramer

Interferón beta-1b

Fingolimod, Natalizumab, Ocrelizumab, Rituximab, Teriflunomida, Dimetil fumarato

DOACs: Apixaban, Rivaroxaban, Dabigatran, Edoxaban

Betabloqueantes básicos (Metoprolol, etc.)

Extrae:

Molécula (normalizada)

Estado: Activo / Suspendido

Dosis (ej. 40 mg, 8 MUI)

Vía (SC, IV, VO, IM…)

Frecuencia (tres veces por semana, día por medio, 1 comprimido cada 12 horas)

🧾 Texto original

Se guarda para trazabilidad y posibles re-procesamientos futuros.

🎚️ Confidencias

Cada campo clave tiene una etiqueta de confianza (Alta, Media, Baja) para guiar la revisión en la UI.

🔎 Importante: El módulo de IA es simbólico / basado en reglas, no es un modelo de ML pesado. Esto calza perfecto con el alcance del Seminario (explicable, acotado al dominio EM / cardiología).

🚫 Sistema de Deduplicación (Anti-doble carga)
Implementado en:

app/api/importaciones.py

(apoyado en nlp_service para la huella clínica)

El sistema genera una huella clínica (dedup_key) basada en:

Si hay DNI:

DNI + fecha de consulta

Si no hay DNI:

fecha de consulta + diagnóstico + hash del texto original

Si una nueva historia genera la misma dedup_key que una ya guardada:

❌ No se guarda una nueva historia

❌ No se duplica JSON ni archivo

✅ El endpoint responde 409 Conflict indicando “historia duplicada”

De esta forma, si el neurólogo sube la misma historia en PDF y en DOCX, el sistema la detecta como duplicada por su contenido clínico, no por el archivo.

🗂 Persistencia en JSON
Cada historia se guarda en:

text
--------
data/historias/{id}.json
Con estructura:

json
--------
{
  "id": "20251113_171545",
  "estado": "pendiente_validacion | validada",
  "dedup_key": "F:2022-03-22|DX:esclerosis múltiple|H:...",
  "borrador": { ... },   // salida del NLP
  "validada": null | { ... } // datos corregidos por el profesional
}
Esto permite:

Trabajar sin BD mientras dura el proyecto Seminario.

Migrar fácilmente a una BD real en una fase futura.

✔ Estado de Implementación – Fase 4
Fase	Estado	Detalles
4.1	✅ Listo	Importación de PDF/DOCX, guardado en uploads/
4.2	✅ Listo	Módulo de IA/NLP basado en reglas, validado con casos reales (EM + FA)
4.3	✅ Backend listo	Endpoints y persistencia de validación
4.3	⏳ Frontend pendiente	Falta pantalla React de revisión/edición
4.4	⏳ Próximo	Motor clínico avanzado (tendencias, actividad, progresión)
4.5	❌ No iniciado	Reportes (gráficos, estadísticas, exportaciones)
4.6	❌ No iniciado	Anonimización
4.7	❌ No iniciado	Filtros avanzados / exploración de cohortes

🧪 Pruebas
Swagger / OpenAPI disponible en:

text
--------
http://127.0.0.1:8000/docs
Desde ahí se puede probar:

Subir historias (POST /importaciones/historias)

Ver el borrador generado (GET /historias/{id}/borrador)

Validar historias (PATCH /historias/{id}/validacion)

Ver deduplicación en acción (subiendo la misma historia más de una vez)

🛠 Instalación y ejecución
Requerimientos
bash
--------
pip install -r requirements.txt
Ejecutar servidor de desarrollo
bash
--------
uvicorn app.main:app --reload
