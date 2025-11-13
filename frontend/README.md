
El frontend maneja esto principalmente en dos lugares:


En la página de detalles (app/historias/detalle/page.tsx): Si una historia está "pendiente", muestra un botón "Validar Historia". Al hacer clic, llama a la función handleValidarHistoria, que simplemente actualiza el estado a "validada" y llama a modificarHistoriaClinica.

2. En la página de edición (app/historias/editar/page.tsx): Permite cambiar el estado manualmente a través de un menú desplegable. Ambas acciones terminan llamando a modificarHistoriaClinica.


1. PROPÓSITO DEL SISTEMA
-------------------------

Este documento describe la arquitectura de datos y las funcionalidades esperadas del backend para el sistema NeuroSoft / NeuroClinic.

El objetivo es crear un Sistema de Gestión de Historias Clínicas (EHR) enfocado en neurología. El frontend (Next.js) está diseñado para:

- Gestionar pacientes (CRUD).
- Gestionar historias clínicas (CRUD).
- Importar historias clínicas desde archivos (.doc/.docx) y JSON.
- Exportar datos en JSON.
- Filtrar y buscar pacientes e historias con criterios complejos.
- Visualizar reportes y estadísticas sobre los datos.



3. EL "CONTRATO" DE LA API (EL ARCHIVO CLAVE)
--------------------------------------------

El archivo más importante para entender qué espera el frontend es: `lib/almacen-datos.ts`.

Este archivo simula la base de datos y la lógica de negocio usando localStorage. Las funciones y las interfaces (type o interface) exportadas en este archivo deben ser consideradas la especificación de la API.

El backend debe replicar la funcionalidad de cada función (ej. `obtenerPacientes`, `filtrarHistoriasClinicas`) y consumir/devolver datos que coincidan con las interfaces (`Paciente`, `HistoriaClinica`).


4. MODELOS DE DATOS PRINCIPALES
-------------------------------

Estas son las interfaces de `lib/almacen-datos.ts` que la API debe consumir y devolver.

---
Modelo de Datos: Paciente
---
export interface Paciente {
  id: number
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  sexo: string 
  telefono: string
  email: string
  direccion: string
  obraSocial: string
  numeroAfiliado: string
  fechaRegistro: string
  observaciones: string
}

---
Modelo de Datos: Historia Clínica y Sub-modelos
---
export interface Medicamento {
  droga: string
  molecula?: string
  dosis?: string
  frecuencia?: string
}

export interface EstudioComplementario {
  puncionLumbar: boolean
  examenLCR: boolean
  texto: string // Para RMN, Laboratorios, etc.
}

export interface HistoriaClinica {
  id: number
  pacienteId: number
  fecha: string // Formato ISO (YYYY-MM-DD)
  diagnostico: string
  codigoDiagnostico?: string // CIE-10
  formaEvolutiva?: string    
  fechaInicioEnfermedad?: string
  escalaEDSS?: number        
  estado: "validada" | "pendiente" | "error"
  medico: string
  motivoConsulta: string
  anamnesis: string // Síntomas
  examenFisico: string
  estudiosComplementarios?: EstudioComplementario
  medicamentos?: Medicamento[]
  tratamiento: string // Comentario general de tratamiento
  evolucion: string
  fechaImportacion: string // Fecha de creación del registro
  patologia?: string // Categoría (ej: Migraña, Esclerosis Múltiple)
  nivelCriticidad?: "bajo" | "medio" | "alto" | "critico"
  observacionesMedicacion?: string
  adjuntos?: { nombre: string; url: string }[]
}


5. ENDPOINTS REQUERIDOS (MAPEO DE FUNCIONES)
--------------------------------------------

A continuación, se mapean las funciones de `almacen-datos.ts` a los endpoints RESTful que el backend debe implementar.

---
Endpoints de Pacientes (CRUD)
---

Función: obtenerPacientes()
Endpoint: GET /api/pacientes
Descripción: Devuelve una lista de todos los pacientes. Debe soportar query params para búsqueda y filtrado (ver `app/pacientes/page.tsx` y `app/pacientes/components/filtros.tsx`).

Función: obtenerPacientePorId(id)
Endpoint: GET /api/pacientes/:id
Descripción: Devuelve un único paciente por su ID.

Función: agregarPaciente(datos)
Endpoint: POST /api/pacientes
Descripción: Crea un nuevo paciente. El `id` y `fechaRegistro` deben ser generados por el backend. Devuelve el paciente creado.

Función: modificarPaciente(id, datos)
Endpoint: PUT /api/pacientes/:id
Descripción: Actualiza un paciente existente. Devuelve el paciente actualizado.

Función: eliminarPaciente(id)
Endpoint: DELETE /api/pacientes/:id
Descripción: Elimina un paciente y todas sus historias clínicas asociadas. Devuelve un status 204 o 200.

---
Endpoints de Historias Clínicas (CRUD)
---

Función: obtenerHistoriasClinicas()
Endpoint: GET /api/historias
Descripción: Devuelve una lista de *todas* las historias.

Función: obtenerHistoriaClinicaPorId(id)
Endpoint: GET /api/historias/:id
Descripción: Devuelve una única historia clínica por su ID.

Función: agregarHistoriaClinica(datos)
Endpoint: POST /api/historias
Descripción: Crea una nueva historia clínica (requiere un `pacienteId` válido). El `id` y `fechaImportacion` deben ser generados por el backend. Devuelve la historia creada.

Función: modificarHistoriaClinica(id, datos)
Endpoint: PUT /api/historias/:id
Descripción: **Endpoint Crítico.** Se utiliza tanto para la edición general de datos (visto en `app/historias/editar/page.tsx`) como para el flujo de **validación** (visto en `app/historias/detalle/page.tsx`), que consiste en cambiar el campo `estado` de `"pendiente"` a `"validada"`. Devuelve la historia actualizada.

Función: eliminarHistoriaClinica(id)
Endpoint: DELETE /api/historias/:id
Descripción: Elimina una única historia clínica. Devuelve un status 204 o 200.

---
Endpoints de Agregación y Búsqueda
---

Función: obtenerHistoriasPorPacienteId(pacienteId)
Endpoint: GET /api/pacientes/:id/historias
Descripción: Devuelve todas las historias de un paciente específico, ordenadas por fecha descendente.

Función: obtenerLineaTiempoPaciente(pacienteId)
Endpoint: GET /api/pacientes/:id/linea-tiempo
Descripción: Devuelve un objeto agregado con datos del paciente y resúmenes de sus historias (ver `LineaTiempoPaciente` en `almacen-datos.ts`).

Función: filtrarHistoriasClinicas(filtros)
Endpoint: GET /api/historias/filtrar
Descripción: **Endpoint clave.** Recibe todos los filtros de la interfaz `FiltrosHistoria` (ver `lib/almacen-datos.ts` y `app/historias/components/filtros-avanzados.tsx`) como *query params* (ej. `?patologia=Migraña&sexo=Femenino&edad=42...`) y devuelve la lista de historias filtradas.


6. TAREAS CRÍTICAS DEL BACKEND
------------------------------

Además de los endpoints CRUD, el backend es responsable de la lógica de negocio más pesada.

6.1. Importación de Archivos (.doc/.docx) - (Prioridad Alta)
- Página: `app/historias/importar/page.tsx`
- Estado Actual: El frontend *simula* la subida y el procesamiento.
- Tarea del Backend:
    1. Crear un endpoint (ej. `POST /api/historias/importar-doc`) que acepte `multipart/form-data`.
    2. Recibir el archivo `.doc` o `.docx`.
    3. Procesar el contenido: Extraer el texto del documento.
    4. Extracción de Datos (NLP): Esta es la parte más compleja. El backend debe analizar el texto extraído para identificar y estructurar la información en un objeto `HistoriaClinica` (paciente, diagnóstico, síntomas, medicamentos, etc.).
    5. Respuesta: Devolver los datos extraídos al frontend para que el usuario los valide (tal como muestra el mock) o crear directamente la historia en estado `"pendiente"`.

6.2. Flujo de Validación de Historias (Importante)
- Estado Actual: El frontend implementa un flujo de validación. Las historias nuevas se crean con `estado: "pendiente"`. La página `app/historias/detalle/page.tsx` muestra un botón "Validar Historia" si el estado es "pendiente".
- Tarea del Backend: El endpoint `PUT /api/historias/:id` debe ser el mecanismo para esta validación. Al recibir una llamada, no solo actualiza los campos, sino que debe manejar la transición de `estado`. El frontend enviará el objeto completo de la historia con el campo `estado` modificado a `"validada"`. El backend podría añadir lógica adicional aquí si fuera necesario (ej. registrar quién validó, verificar campos obligatorios antes de validar, etc.).

6.3. Endpoints para Reportes y Dashboard
- Páginas: `app/page.tsx`, `app/reportes/page.tsx`
- Estado Actual: Usan datos falsos (hardcodeados).
- Tarea del Backend: Crear endpoints que realicen las agregaciones necesarias:
    - `GET /api/reportes/estadisticas-globales`: Devuelve conteos (total pacientes, total historias, pendientes).
    - `GET /api/reportes/diagnosticos`: Devuelve un conteo de historias agrupadas por `diagnostico` o `patologia` para el gráfico de torta.
    - `GET /api/reportes/consultas-mensuales`: Devuelve un conteo de historias agrupadas por mes para el gráfico de barras.

6.4. Lógica de Filtrado Compleja
- Páginas: `app/historias/page.tsx`, `app/pacientes/page.tsx`
- Estado Actual: El frontend filtra los datos *después* de traerlos todos. Esto no es escalable.
- Tarea del Backend: La lógica de `filtrarHistoriasClinicas` y el filtrado de pacientes debe ocurrir en la base de datos. Los endpoints `GET /api/pacientes` y `GET /api/historias/filtrar` deben aceptar *query parameters* para todos los criterios de búsqueda y filtro (fechas, edad, patología, etc.).

6.5. Paginación
- Estado Actual: No implementada. El frontend recibe *todos* los datos a la vez.
- Tarea del Backend: Los endpoints que devuelven listas (`/api/pacientes`, `/api/historias`, `/api/historias/filtrar`) deben implementar paginación (ej. `?page=1&limit=20`).

6.6. Autenticación y Autorización
- Estado Actual: Inexistente. El frontend simula un usuario "Dr. Rodríguez".
- Tarea del Backend: Implementar un sistema de autenticación (ej. JWT) para proteger todos los endpoints. El `medico` en `HistoriaClinica` debería asociarse al usuario autenticado.



ESTRUCTURA DE DIRECTORIOS
frontend/medical-system/
│
├── app/                            # App Router (Rutas y Páginas)
│   │
│   ├── analisis/
│   │   └── page.tsx                # Dashboard de análisis y tendencias (Placeholder).
│   │
│   ├── historias/                  # Módulo de Gestión de Historias Clínicas
│   │   ├── components/
│   │   │   └── filtros-avanzados.tsx # Filtros complejos (Patología, Medicamento, Rango Fechas).
│   │   ├── detalle/
│   │   │   └── page.tsx            # Vista individual. Botón "Validar" y "Eliminar".
│   │   ├── editar/
│   │   │   └── page.tsx            # Formulario de edición. Permite cambiar estado a "Validada".
│   │   ├── importar/
│   │   │   └── page.tsx            # UI de subida de archivos (Drag & Drop). Simula proceso NLP.
│   │   ├── nuevo/
│   │   │   └── page.tsx            # Creación de historia. Requiere ?pacienteId=...
│   │   └── page.tsx                # Listado general de historias con búsqueda.
│   │
│   ├── pacientes/                  # Módulo de Gestión de Pacientes
│   │   ├── components/
│   │   │   ├── filtros.tsx         # Barra de búsqueda y filtros demográficos (Edad, Sexo).
│   │   │   ├── info-medica.tsx     # Card de resumen (Obra Social, Afiliado).
│   │   │   ├── info-personal.tsx   # Card de datos filiatorios.
│   │   │   └── tabla-historias.tsx # Historial médico embebido en el perfil.
│   │   ├── detalle/
│   │   │   └── page.tsx            # Perfil 360° del paciente + Línea de tiempo.
│   │   ├── editar/
│   │   │   └── page.tsx            # Edición de datos demográficos.
│   │   ├── nuevo/
│   │   │   └── page.tsx            # Alta de paciente.
│   │   └── page.tsx                # Listado maestro de pacientes.
│   │
│   ├── reportes/
│   │   ├── loading.tsx             # Estado de carga para gráficos pesados.
│   │   └── page.tsx                # Dashboard estadístico (Recharts: Tortas y Barras).
│   │
│   ├── globals.css                 # Estilos globales y variables de Tailwind/Shadcn.
│   ├── layout.tsx                  # Root Layout. Envuelve la app (Fuentes, Analytics).
│   └── page.tsx                    # Dashboard Principal (Accesos directos, Resumen global).
│
├── components/                     # Componentes Reutilizables
│   │
│   ├── ui/                         # Biblioteca de componentes base (Shadcn/UI)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx              # Modales (usado en confirmaciones).
│   │   ├── table.tsx
│   │   ├── toast.tsx               # Notificaciones flotantes.
│   │   └── ... (otros primitivos de UI)
│   │
│   ├── medical-layout.tsx          # Shell principal de la App (Sidebar + Header responsive).
│   └── theme-provider.tsx          # Contexto para modo oscuro/claro.
│
├── hooks/                          # Hooks personalizados de React
│   ├── use-mobile.ts               # Detección de viewport móvil para el Sidebar.
│   └── use-toast.ts                # Hook para disparar notificaciones (success/error).
│
├── lib/                            # Lógica de Negocio y Utilidades
│   │
│   ├── almacen-datos.ts            # [CRÍTICO] Simulación de Backend/DB (LocalStorage).
│   │                               # Define interfaces: Paciente, HistoriaClinica.
│   │                               # Contiene funciones CRUD exportadas.
│   │
│   └── utils.ts                    # Helper 'cn' para fusionar clases Tailwind.
│
├── public/                         # Activos Estáticos
│   ├── datos-ejemplo.json          # Seed data (Datos semilla) para inicializar la app.
│   ├── placeholder-user.jpg        # Avatar por defecto.
│   └── ... (svgs, logos)
│
├── components.json                 # Configuración de Shadcn/UI.
├── next.config.mjs                 # Configuración de Next.js.
├── package.json                    # Dependencias (Recharts, Lucide, Hook Form, Zod).
├── postcss.config.mjs
├── tailwind.config.ts              # (Implícito/Integrado) Configuración de estilos.
└── tsconfig.json                   # Configuración de TypeScript.



FLUJOS DE UI CLAVE
1. NAVEGACIÓN PRINCIPAL
• Componente: components/medical-layout.tsx
• Lógica: Renderiza el Sidebar lateral en escritorio y un Drawer en móvil. Mantiene el estado activo de la ruta actual.
2. GESTIÓN DE DATOS (MOCK)
• Archivo: lib/almacen-datos.ts
• Funcionamiento: Al cargar la app, verifica si hay datos en LocalStorage. Si no, carga public/datos-ejemplo.json. Todas las páginas consumen funciones de este archivo en lugar de hacer fetch real (por ahora).
3. IMPORTACIÓN DE ARCHIVOS
• Ruta: app/historias/importar/page.tsx
• UI: Área de Drag & Drop.
• Simulación: Muestra una barra de progreso y al finalizar "extrae" datos hardcodeados para mostrar cómo se vería la respuesta del backend NLP.


