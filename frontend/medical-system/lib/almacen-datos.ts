// frontend/medical-system/lib/almacen-datos.ts

"use client"

import datosDeEjemplo from "@/public/datos-ejemplo.json"

// --- INTERFACES ACTUALIZADAS (ID STRING) ---
export interface Paciente {
  id: string  
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
  tolerancia?: boolean
  estado?: string   
}

export interface EstudioComplementario {
  puncionLumbar: boolean
  examenLCR: boolean
  texto: string
}

export interface HistoriaClinica {
  id: string 
  pacienteId: string 
  fecha: string 
  diagnostico: string
  codigoDiagnostico?: string 
  formaEvolutiva?: string    
  fechaInicioEnfermedad?: string
  escalaEDSS?: number        
  estado: "validada" | "pendiente" | "error"
  medico: string
  
  // --- CAMPOS NUEVOS AGREGADOS ---
  sintomasPrincipales?: string
  antecedentes?: string
  agrupacionSindromica?: string
  // ------------------------------

  motivoConsulta?: string // <--- AHORA OPCIONAL
  anamnesis?: string      // <--- AHORA OPCIONAL
  
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
  tratamientosSoporte?: string[] 
  motivoCambioTratamiento?: string 
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

export function obtenerPacientePorId(id: string): Paciente | undefined {
  return obtenerPacientes().find((p) => p.id === id)
}

export function modificarPaciente(id: string, datosActualizados: Paciente): void {
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
  // Generamos ID string usando timestamp para evitar conflictos
  const nuevoPaciente: Paciente = {
    ...paciente,
    id: Date.now().toString(), 
  }
  guardarPacientes([...pacientes, nuevoPaciente])
  return nuevoPaciente
}

export function eliminarPaciente(id: string): void {
  let pacientes = obtenerPacientes()
  pacientes = pacientes.filter(p => p.id !== id)
  guardarPacientes(pacientes)

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

export function obtenerHistoriasPorPacienteId(pacienteId: string): HistoriaClinica[] {
  const historias = obtenerHistoriasClinicas()
  return historias.filter((h) => h.pacienteId === pacienteId).sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );
}

export function obtenerHistoriaClinicaPorId(id: string): HistoriaClinica | undefined {
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
    id: Date.now().toString(), // ID String
  }
  guardarHistoriasClinicas([...historias, nuevaHistoria])
  return nuevaHistoria
}

export function modificarHistoriaClinica(id: string, datosActualizados: HistoriaClinica): void {
  let historias = obtenerHistoriasClinicas()
  historias = historias.map(h => 
    h.id === id ? { ...datosActualizados, id: h.id } : h
  )
  guardarHistoriasClinicas(historias)
}

export function eliminarHistoriaClinica(id: string): void {
  let historias = obtenerHistoriasClinicas()
  historias = historias.filter(h => h.id !== id)
  guardarHistoriasClinicas(historias)
}

// --- IMPORTAR / EXPORTAR / INICIALIZAR ---
export function inicializarDatosDeEjemplo(): void {
  if (typeof window === "undefined") return;
  const pacientes = localStorage.getItem(CLAVES_STORAGE.PACIENTES)
  
  if (!pacientes) {
    const pacientesEjemplo = datosDeEjemplo.pacientes as unknown as Paciente[]
    const historiasEjemplo = datosDeEjemplo.historias as unknown as HistoriaClinica[] 
    
    // Convertimos IDs a string al vuelo para evitar conflictos
    const pacientesFixed = pacientesEjemplo.map(p => ({...p, id: String(p.id)}));
    const historiasFixed = historiasEjemplo.map(h => ({...h, id: String(h.id), pacienteId: String(h.pacienteId)}));

    guardarPacientes(pacientesFixed)
    guardarHistoriasClinicas(historiasFixed)
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
          ).map((p: any) => ({...p, id: String(p.id)})); // Asegurar ID string
          guardarPacientes([...pacientesExistentes, ...nuevosPacientes])
        }
        
        const historiasAImportar = (data.histories || data.historias) ?? []
        if (historiasAImportar.length > 0 && Array.isArray(historiasAImportar)) {
          const nuevasHistorias = historiasAImportar.filter(
            (h: HistoriaClinica) =>
              !historiasExistentes.some(
                (eh) => eh.pacienteId === String(h.pacienteId) && eh.fecha === h.fecha,
              ),
          ).map((h: any) => ({...h, id: String(h.id), pacienteId: String(h.pacienteId)})); // Asegurar ID string
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

// --- UTILIDADES ---
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
  // const hoy = new Date().toISOString(); 

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
  
  historias = historias.filter((historia) => {
    const paciente = pacientes.find((p) => p.id === historia.pacienteId)
    if (!paciente) return false
    return true
  })
  return historias
}

// --- ANÁLISIS ---
export function obtenerAnalisisDePaciente(pacienteId: string) { // ID String
  const paciente = obtenerPacientePorId(pacienteId)
  if (!paciente) return null

  const historias = obtenerHistoriasPorPacienteId(pacienteId).sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  )
  
  const dmtConFechas = historias.map(h => {
     const dmt = h.medicamentos && h.medicamentos.length > 0 
                ? h.medicamentos.map(m => m.droga).join(", ") 
                : h.tratamiento || "Sin Registro";
    const intoleranciaDetectada = h.medicamentos?.some(m => m.tolerancia === false);
    return {
      dmt: dmt,
      fecha: new Date(h.fecha).toLocaleDateString('es-AR'),
      edss: h.escalaEDSS || 0,
      tolerancia: !intoleranciaDetectada,
      estado: !intoleranciaDetectada ? 'Tolerado' : 'Intolerancia',
      motivo: h.motivoCambioTratamiento || h.motivoConsulta
    }
  })

  const progresionEDSS = historias.map(h => ({
    fecha: new Date(h.fecha).toLocaleDateString('es-AR'),
    edss: h.escalaEDSS || 0,
  }))

  let cambiosDMT = 0
  let intolerancia = 0
  for (let i = 1; i < historias.length; i++) {
    const tratamientoPrev = historias[i-1].tratamiento || (historias[i-1].medicamentos?.[0]?.droga || "");
    const tratamientoCurr = historias[i].tratamiento || (historias[i].medicamentos?.[0]?.droga || "");
    if (tratamientoCurr !== tratamientoPrev && tratamientoCurr !== "") cambiosDMT++
    const tieneIntolerancia = historias[i].medicamentos?.some(m => m.tolerancia === false);
    if (tieneIntolerancia) intolerancia++
  }

  const tratamientosSoporte = [...new Set(historias.flatMap(h => h.tratamientosSoporte || []))]

  return {
    paciente,
    dmtConFechas,
    progresionEDSS,
    cambiosDMT,
    intolerancia,
    tratamientosSoporte,
    totalHistorias: historias.length
  }
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

export function obtenerLineaTiempoPaciente(pacienteId: string): LineaTiempoPaciente | null { // ID String
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