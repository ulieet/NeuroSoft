"use client"

import datosDeEjemplo from "@/public/datos-ejemplo.json"

// --- INTERFACES EN ESPAÑOL ---
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
export interface Medicamento {
  droga: string
  molecula?: string
  dosis?: string
  frecuencia?: string
}
export interface EstudioComplementario {
  puncionLumbar: boolean
  examenLCR: boolean
  texto: string
}
export interface HistoriaClinica {
  id: number
  pacienteId: number
  fecha: string 
  diagnostico: string
  codigoDiagnostico?: string 
  formaEvolutiva?: string    
  fechaInicioEnfermedad?: string
  escalaEDSS?: number        
  estado: "validada" | "pendiente" | "error"
  medico: string
  motivoConsulta: string
  anamnesis: string 
  examenFisico: string
  estudiosComplementarios?: EstudioComplementario
  medicamentos?: Medicamento[]
  tratamiento: string 
  evolucion: string
  fechaImportacion: string 
  patologia?: string 
  nivelCriticidad?: "bajo" | "medio" | "alto" | "critico"
  observacionesMedicacion?: string
  adjuntos?: { nombre: string; url: string }[]
}

// --- CLAVES DE STORAGE ---
const CLAVES_STORAGE = {
  PACIENTES: "neuroclinic_pacientes",
  HISTORIAS: "neuroclinic_historias",
}



// --- FUNCIONES DE PACIENTES (CRUD) ---
export function obtenerPacientes(): Paciente[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(CLAVES_STORAGE.PACIENTES)
  return data ? JSON.parse(data) : []
}

export function obtenerPacientePorId(id: number): Paciente | undefined {
  return obtenerPacientes().find((p) => p.id === id)
}

export function modificarPaciente(id: number, datosActualizados: Paciente): void {
  let pacientes = obtenerPacientes()
  pacientes = pacientes.map(p => 
    p.id === id ? { ...datosActualizados, id: p.id } : p
  )
  guardarPacientes(pacientes)
}

export function guardarPacientes(pacientes: Paciente[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CLAVES_STORAGE.PACIENTES, JSON.stringify(pacientes))
}

export function agregarPaciente(paciente: Omit<Paciente, "id">): Paciente {
  const pacientes = obtenerPacientes()
  const nuevoPaciente: Paciente = {
    ...paciente,
    id: pacientes.length > 0 ? Math.max(...pacientes.map((p) => p.id)) + 1 : 1,
  }
  guardarPacientes([...pacientes, nuevoPaciente])
  return nuevoPaciente
}

// --- NUEVA FUNCIÓN ---


export function eliminarPaciente(id: number): void {
  // Elimina al paciente
  let pacientes = obtenerPacientes()
  pacientes = pacientes.filter(p => p.id !== id)
  guardarPacientes(pacientes)

  // Elimina todas sus historias asociadas (importante)
  let historias = obtenerHistoriasClinicas()
  historias = historias.filter(h => h.pacienteId !== id)
  guardarHistoriasClinicas(historias)
}

// --- FUNCIONES DE HISTORIAS (CRUD) ---
export function obtenerHistoriasClinicas(): HistoriaClinica[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(CLAVES_STORAGE.HISTORIAS)
  return data ? JSON.parse(data) : []
}

export function obtenerHistoriasPorPacienteId(pacienteId: number): HistoriaClinica[] {
  const historias = obtenerHistoriasClinicas()
  return historias.filter((h) => h.pacienteId === pacienteId).sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );
}

export function obtenerHistoriaClinicaPorId(id: number): HistoriaClinica | undefined {
  return obtenerHistoriasClinicas().find((h) => h.id === id)
}

export function guardarHistoriasClinicas(historias: HistoriaClinica[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CLAVES_STORAGE.HISTORIAS, JSON.stringify(historias))
}

export function agregarHistoriaClinica(historia: Omit<HistoriaClinica, "id">): HistoriaClinica {
  const historias = obtenerHistoriasClinicas()
  const nuevaHistoria: HistoriaClinica = {
    ...historia,
    id: historias.length > 0 ? Math.max(...historias.map((h) => h.id)) + 1 : 1,
  }
  guardarHistoriasClinicas([...historias, nuevaHistoria])
  return nuevaHistoria
}

// --- NUEVA FUNCIÓN ---
export function modificarHistoriaClinica(id: number, datosActualizados: HistoriaClinica): void {
  let historias = obtenerHistoriasClinicas()
  historias = historias.map(h => 
    h.id === id ? { ...datosActualizados, id: h.id } : h
  )
  guardarHistoriasClinicas(historias)
}

export function eliminarHistoriaClinica(id: number): void {
  let historias = obtenerHistoriasClinicas()
  historias = historias.filter(h => h.id !== id)
  guardarHistoriasClinicas(historias)
}

// --- IMPORTAR / EXPORTAR / INICIALIZAR ---
export function inicializarDatosDeEjemplo(): void {
  if (typeof window === "undefined") return;
  const pacientes = localStorage.getItem(CLAVES_STORAGE.PACIENTES)
  if (!pacientes) {
    const pacientesEjemplo = datosDeEjemplo.pacientes as Paciente[]
    const historiasEjemplo = datosDeEjemplo.historias as HistoriaClinica[] 
    guardarPacientes(pacientesEjemplo)
    guardarHistoriasClinicas(historiasEjemplo)
  }
}

export async function importarDesdeJSON(file: File): Promise<{ pacientes: Paciente[]; historias: HistoriaClinica[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        const pacientesExistentes = obtenerPacientes()
        const historiasExistentes = obtenerHistoriasClinicas()

        if (data.pacientes && Array.isArray(data.pacientes)) {
          const nuevosPacientes = data.pacientes.filter(
            (p: Paciente) => !pacientesExistentes.some((ep) => ep.dni === p.dni)
          )
          guardarPacientes([...pacientesExistentes, ...nuevosPacientes])
        }
        
        const historiasAImportar = (data.histories || data.historias) ?? []
        if (historiasAImportar.length > 0 && Array.isArray(historiasAImportar)) {
          const nuevasHistorias = historiasAImportar.filter(
            (h: HistoriaClinica) =>
              !historiasExistentes.some(
                (eh) => eh.pacienteId === h.pacienteId && eh.fecha === h.fecha,
              ),
          )
          guardarHistoriasClinicas([...historiasExistentes, ...nuevasHistorias])
        }
        resolve({ pacientes: obtenerPacientes(), historias: obtenerHistoriasClinicas() })
      } catch (error) {
        reject(new Error("Error al parsear el archivo JSON"))
      }
    }
    reader.onerror = () => reject(new Error("Error al leer el archivo"))
    reader.readAsText(file)
  })
}

export function exportarAJSON(): string {
  const data = {
    pacientes: obtenerPacientes(),
    historias: obtenerHistoriasClinicas(),
    fechaExportacion: new Date().toISOString(),
  }
  return JSON.stringify(data, null, 2)
}

// --- LÓGICA DE FILTRADO Y CÁLCULO ---
function calcularAnios(fechaInicioStr: string, fechaFinStr?: string): number {
  if (!fechaInicioStr) return 0;
  const fechaInicio = new Date(fechaInicioStr);
  const fechaFin = fechaFinStr ? new Date(fechaFinStr) : new Date(); 
  let anios = fechaFin.getFullYear() - fechaInicio.getFullYear();
  const mes = fechaFin.getMonth() - fechaInicio.getMonth();
  if (mes < 0 || (mes === 0 && fechaFin.getDate() < fechaInicio.getDate())) {
    anios--;
  }
  return anios > 0 ? anios : 0;
}
export function obtenerEdadPaciente(fechaNacimiento: string): number {
  return calcularAnios(fechaNacimiento);
}
export interface FiltrosPaciente {
  obraSocial?: string
  sexo?: string
  edadMin?: number
  edadMax?: number
}
export interface FiltrosHistoria {
  patologia?: string
  fechaDesde?: string
  fechaHasta?: string
  sexo?: string
  medicamento?: string
  estado?: string
  criticidad?: string
  edad?: number
  edadInicioEnfermedad?: number
  tiempoEvolucion?: number
  escalaEDSS?: number
}
export function filtrarHistoriasClinicas(filtros: FiltrosHistoria): HistoriaClinica[] {
  let historias = obtenerHistoriasClinicas()
  const pacientes = obtenerPacientes()
  const hoy = new Date().toISOString(); 

  // (Filtros simples: patologia, fecha, medicamento, estado, criticidad)
  if (filtros.patologia) {
    const patologias = filtros.patologia.split("|").map(p => p.toLowerCase())
    historias = historias.filter((h) =>
      patologias.some(
        (p) =>
          h.patologia?.toLowerCase().includes(p) ||
          h.diagnostico.toLowerCase().includes(p),
      ),
    )
  }
  if (filtros.fechaDesde) {
    historias = historias.filter((h) => new Date(h.fecha) >= new Date(filtros.fechaDesde!))
  }
  if (filtros.fechaHasta) {
    historias = historias.filter((h) => new Date(h.fecha) <= new Date(filtros.fechaHasta!))
  }
  if (filtros.medicamento) {
    const medicamentos = filtros.medicamento.split("|").map(m => m.toLowerCase())
    historias = historias.filter((h) =>
      h.medicamentos?.some((m) => medicamentos.some((med) => m.droga.toLowerCase().includes(med))),
    )
  }
  if (filtros.estado) {
    historias = historias.filter((h) => h.estado === filtros.estado)
  }
  if (filtros.criticidad) {
    historias = historias.filter((h) => h.nivelCriticidad === filtros.criticidad)
  }

  // (Filtros Complejos: Paciente y Cálculos)
  historias = historias.filter((historia) => {
    const paciente = pacientes.find((p) => p.id === historia.pacienteId)
    if (!paciente) return false
    if (filtros.sexo && paciente.sexo !== filtros.sexo) return false
    if (filtros.edad !== undefined) {
      const edadActual = obtenerEdadPaciente(paciente.fechaNacimiento);
      if (Math.floor(edadActual) !== filtros.edad) return false;
    }
    if (filtros.escalaEDSS !== undefined) {
      const edss = historia.escalaEDSS;
      if (edss === undefined || edss !== filtros.escalaEDSS) return false;
    }
    const fechaInicioEnf = historia.fechaInicioEnfermedad;
    if (filtros.edadInicioEnfermedad !== undefined) {
      if (!fechaInicioEnf) return false; 
      const edadInicio = calcularAnios(paciente.fechaNacimiento, fechaInicioEnf);
      if (Math.floor(edadInicio) !== filtros.edadInicioEnfermedad) return false;
    }
    if (filtros.tiempoEvolucion !== undefined) {
      if (!fechaInicioEnf) return false; 
      const tiempoEvolucion = calcularAnios(fechaInicioEnf, hoy);
      if (Math.floor(tiempoEvolucion) !== filtros.tiempoEvolucion) return false;
    }
    return true
  })
  return historias
}
export interface LineaTiempoPaciente {
  paciente: Paciente
  historias: HistoriaClinica[]
  totalConsultas: number
  primeraConsulta: string
  ultimaConsulta: string
  medicamentosUsados: string[]
  diagnosticos: string[]
}
export function obtenerLineaTiempoPaciente(pacienteId: number): LineaTiempoPaciente | null {
  const paciente = obtenerPacientePorId(pacienteId)
  if (!paciente) return null
  const historias = obtenerHistoriasPorPacienteId(pacienteId) 
  const medicamentosSet = new Set<string>()
  const diagnosticosSet = new Set<string>()
  historias.forEach((h) => {
    if (h.medicamentos) {
      h.medicamentos.forEach((m) => medicamentosSet.add(m.droga))
    }
    diagnosticosSet.add(h.diagnostico)
  })
  return {
    paciente: paciente,
    historias,
    totalConsultas: historias.length,
    primeraConsulta: historias.length > 0 ? historias[historias.length - 1].fecha : "", 
    ultimaConsulta: historias.length > 0 ? historias[0].fecha : "",
    medicamentosUsados: Array.from(medicamentosSet),
    diagnosticos: Array.from(diagnosticosSet),
  }
}