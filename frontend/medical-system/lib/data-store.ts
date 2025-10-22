"use client"

export interface Patient {
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

export interface MedicalHistory {
  id: number
  pacienteId: number
  fecha: string
  diagnostico: string
  estado: "validada" | "pendiente" | "error"
  medico: string
  motivoConsulta: string
  anamnesis: string
  examenFisico: string
  estudiosComplementarios: string
  tratamiento: string
  evolucion: string
  fechaImportacion: string
  medicamentos?: string[]
  patologia?: string
  nivelCriticidad?: "bajo" | "medio" | "alto" | "critico"
  observacionesMedicacion?: string
}

const STORAGE_KEYS = {
  PATIENTS: "neuroclinic_patients",
  HISTORIES: "neuroclinic_histories",
}

// Patient operations
export function getPatients(): Patient[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEYS.PATIENTS)
  return data ? JSON.parse(data) : []
}

export function getPatientById(id: number): Patient | undefined {
  const patients = getPatients()
  return patients.find((p) => p.id === id)
}

export function savePatients(patients: Patient[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients))
}

export function addPatient(patient: Omit<Patient, "id">): Patient {
  const patients = getPatients()
  const newPatient = {
    ...patient,
    id: patients.length > 0 ? Math.max(...patients.map((p) => p.id)) + 1 : 1,
  }
  savePatients([...patients, newPatient])
  return newPatient
}

// Medical History operations
export function getMedicalHistories(): MedicalHistory[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEYS.HISTORIES)
  return data ? JSON.parse(data) : []
}

export function getMedicalHistoriesByPatientId(pacienteId: number): MedicalHistory[] {
  const histories = getMedicalHistories()
  return histories.filter((h) => h.pacienteId === pacienteId)
}

export function getMedicalHistoryById(id: number): MedicalHistory | undefined {
  const histories = getMedicalHistories()
  return histories.find((h) => h.id === id)
}

export function saveMedicalHistories(histories: MedicalHistory[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.HISTORIES, JSON.stringify(histories))
}

export function addMedicalHistory(history: Omit<MedicalHistory, "id">): MedicalHistory {
  const histories = getMedicalHistories()
  const newHistory = {
    ...history,
    id: histories.length > 0 ? Math.max(...histories.map((h) => h.id)) + 1 : 1,
  }
  saveMedicalHistories([...histories, newHistory])
  return newHistory
}

// Import from JSON file
export async function importFromJSON(file: File): Promise<{ patients: Patient[]; histories: MedicalHistory[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)

        // Validate and merge patients
        if (data.patients && Array.isArray(data.patients)) {
          const existingPatients = getPatients()
          const newPatients = data.patients.filter((p: Patient) => !existingPatients.some((ep) => ep.dni === p.dni))
          savePatients([...existingPatients, ...newPatients])
        }

        // Validate and merge histories
        if (data.histories && Array.isArray(data.histories)) {
          const existingHistories = getMedicalHistories()
          const newHistories = data.histories.filter(
            (h: MedicalHistory) =>
              !existingHistories.some(
                (eh) => eh.pacienteId === h.pacienteId && eh.fecha === h.fecha && eh.diagnostico === h.diagnostico,
              ),
          )
          saveMedicalHistories([...existingHistories, ...newHistories])
        }

        resolve({
          patients: getPatients(),
          histories: getMedicalHistories(),
        })
      } catch (error) {
        reject(new Error("Error al parsear el archivo JSON"))
      }
    }
    reader.onerror = () => reject(new Error("Error al leer el archivo"))
    reader.readAsText(file)
  })
}

// Export to JSON file
export function exportToJSON(): string {
  const data = {
    patients: getPatients(),
    histories: getMedicalHistories(),
    exportDate: new Date().toISOString(),
  }
  return JSON.stringify(data, null, 2)
}

// Initialize with sample data if empty
export function initializeSampleData(): void {
  const patients = getPatients()
  if (patients.length === 0) {
    const samplePatients: Patient[] = [
      {
        id: 1,
        nombre: "María Elena",
        apellido: "González",
        dni: "12.345.678",
        fechaNacimiento: "1975-03-15",
        sexo: "Femenino",
        telefono: "11-2345-6789",
        email: "maria.gonzalez@email.com",
        direccion: "Av. Corrientes 1234, CABA",
        obraSocial: "OSDE",
        numeroAfiliado: "OS-123456",
        fechaRegistro: "2023-01-15",
        observaciones: "Paciente con antecedentes de migraña crónica.",
      },
      {
        id: 2,
        nombre: "Juan Carlos",
        apellido: "López",
        dni: "87.654.321",
        fechaNacimiento: "1968-07-22",
        sexo: "Masculino",
        telefono: "11-8765-4321",
        email: "juan.lopez@email.com",
        direccion: "Av. Santa Fe 5678, CABA",
        obraSocial: "Swiss Medical",
        numeroAfiliado: "SM-789012",
        fechaRegistro: "2023-02-20",
        observaciones: "Paciente con cefalea tensional recurrente.",
      },
    ]
    savePatients(samplePatients)

    const sampleHistories: MedicalHistory[] = [
      {
        id: 1,
        pacienteId: 1,
        fecha: "2024-01-15",
        diagnostico: "Migraña con aura",
        estado: "validada",
        medico: "Dr. Rodríguez",
        motivoConsulta: "Cefalea intensa con aura visual",
        anamnesis: "Paciente refiere episodios de cefalea hemicraneal pulsátil",
        examenFisico: "Examen neurológico normal",
        estudiosComplementarios: "RMN cerebral sin alteraciones",
        tratamiento: "Sumatriptán 50mg, profilaxis con topiramato",
        evolucion: "Buena respuesta al tratamiento",
        fechaImportacion: "2024-01-15",
        medicamentos: ["Sumatriptán", "Topiramato"],
        patologia: "Migraña",
        nivelCriticidad: "medio",
        observacionesMedicacion: "Sumatriptán efectivo, Topiramato preventivo",
      },
      {
        id: 2,
        pacienteId: 1,
        fecha: "2023-12-10",
        diagnostico: "Cefalea tensional",
        estado: "validada",
        medico: "Dr. Rodríguez",
        motivoConsulta: "Dolor de cabeza bilateral",
        anamnesis: "Cefalea tipo banda, relacionada con estrés laboral",
        examenFisico: "Contractura muscular cervical",
        estudiosComplementarios: "No requiere",
        tratamiento: "Relajantes musculares, fisioterapia",
        evolucion: "Mejoría progresiva",
        fechaImportacion: "2023-12-10",
        medicamentos: ["Relajantes musculares"],
        patologia: "Cefalea tensional",
        nivelCriticidad: "bajo",
        observacionesMedicacion: "Relajantes musculares efectivos",
      },
      {
        id: 3,
        pacienteId: 2,
        fecha: "2024-01-14",
        diagnostico: "Cefalea tensional episódica",
        estado: "pendiente",
        medico: "Dr. Rodríguez",
        motivoConsulta: "Dolor de cabeza frecuente",
        anamnesis: "Episodios de cefalea 2-3 veces por semana",
        examenFisico: "Pendiente de completar",
        estudiosComplementarios: "Pendiente",
        tratamiento: "Pendiente de validación",
        evolucion: "En evaluación",
        fechaImportacion: "2024-01-14",
        medicamentos: [],
        patologia: "Cefalea tensional episódica",
        nivelCriticidad: "pendiente",
        observacionesMedicacion: "",
      },
    ]
    saveMedicalHistories(sampleHistories)
  }
}

// Utility functions for advanced filtering and analysis
export function getPatientAge(fechaNacimiento: string): number {
  const birthDate = new Date(fechaNacimiento)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export interface HistoryFilters {
  patologia?: string
  fechaDesde?: string
  fechaHasta?: string
  edadMin?: number
  edadMax?: number
  sexo?: string
  medicamento?: string
  estado?: string
  criticidad?: string
}

export function filterMedicalHistories(filters: HistoryFilters): MedicalHistory[] {
  let histories = getMedicalHistories()
  const patients = getPatients()

  if (filters.patologia) {
    if (filters.patologia.includes("|")) {
      const pathologies = filters.patologia.split("|")
      histories = histories.filter((h) =>
        pathologies.some(
          (p) =>
            h.patologia?.toLowerCase().includes(p.toLowerCase()) ||
            h.diagnostico.toLowerCase().includes(p.toLowerCase()),
        ),
      )
    } else {
      histories = histories.filter(
        (h) =>
          h.patologia?.toLowerCase().includes(filters.patologia!.toLowerCase()) ||
          h.diagnostico.toLowerCase().includes(filters.patologia!.toLowerCase()),
      )
    }
  }

  if (filters.fechaDesde) {
    histories = histories.filter((h) => new Date(h.fecha) >= new Date(filters.fechaDesde!))
  }

  if (filters.fechaHasta) {
    histories = histories.filter((h) => new Date(h.fecha) <= new Date(filters.fechaHasta!))
  }

  if (filters.medicamento) {
    if (filters.medicamento.includes("|")) {
      const medications = filters.medicamento.split("|")
      histories = histories.filter((h) =>
        h.medicamentos?.some((m) => medications.some((med) => m.toLowerCase().includes(med.toLowerCase()))),
      )
    } else {
      histories = histories.filter((h) =>
        h.medicamentos?.some((m) => m.toLowerCase().includes(filters.medicamento!.toLowerCase())),
      )
    }
  }

  if (filters.estado) {
    histories = histories.filter((h) => h.estado === filters.estado)
  }

  if (filters.criticidad) {
    histories = histories.filter((h) => h.nivelCriticidad === filters.criticidad)
  }

  if (filters.sexo || filters.edadMin !== undefined || filters.edadMax !== undefined) {
    histories = histories.filter((h) => {
      const patient = patients.find((p) => p.id === h.pacienteId)
      if (!patient) return false

      if (filters.sexo && patient.sexo !== filters.sexo) return false

      const age = getPatientAge(patient.fechaNacimiento)
      if (filters.edadMin !== undefined && age < filters.edadMin) return false
      if (filters.edadMax !== undefined && age > filters.edadMax) return false

      return true
    })
  }

  return histories
}

export interface MedicationComparison {
  medicamento: string
  totalPacientes: number
  historias: MedicalHistory[]
  mejoriaPromedio: number
  efectosSecundarios: number
}

export function compareMedications(): MedicationComparison[] {
  const histories = getMedicalHistories()
  const medicationMap = new Map<string, MedicalHistory[]>()

  histories.forEach((h) => {
    if (h.medicamentos && h.medicamentos.length > 0) {
      h.medicamentos.forEach((med) => {
        if (!medicationMap.has(med)) {
          medicationMap.set(med, [])
        }
        medicationMap.get(med)!.push(h)
      })
    }
  })

  const comparisons: MedicationComparison[] = []
  medicationMap.forEach((historias, medicamento) => {
    const pacientesUnicos = new Set(historias.map((h) => h.pacienteId)).size
    const mejoriaCount = historias.filter((h) =>
      h.evolucion.toLowerCase().includes("mejoría" || "mejoria" || "buena respuesta"),
    ).length
    const efectosCount = historias.filter((h) =>
      h.evolucion.toLowerCase().includes("efecto" && ("secundario" || "adverso")),
    ).length

    comparisons.push({
      medicamento,
      totalPacientes: pacientesUnicos,
      historias,
      mejoriaPromedio: historias.length > 0 ? (mejoriaCount / historias.length) * 100 : 0,
      efectosSecundarios: efectosCount,
    })
  })

  return comparisons.sort((a, b) => b.totalPacientes - a.totalPacientes)
}

export interface CriticalCase {
  paciente: Patient
  historia: MedicalHistory
  razon: string
  prioridad: "alta" | "media"
}

export function detectCriticalCases(): CriticalCase[] {
  const histories = getMedicalHistories()
  const patients = getPatients()
  const criticalCases: CriticalCase[] = []

  histories.forEach((h) => {
    const patient = patients.find((p) => p.id === h.pacienteId)
    if (!patient) return

    // Detect explicit critical level
    if (h.nivelCriticidad === "critico" || h.nivelCriticidad === "alto") {
      criticalCases.push({
        paciente: patient,
        historia: h,
        razon: "Nivel de criticidad marcado como alto o crítico",
        prioridad: h.nivelCriticidad === "critico" ? "alta" : "media",
      })
    }

    // Detect deterioration patterns
    const patientHistories = getMedicalHistoriesByPatientId(h.pacienteId).sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    )

    if (patientHistories.length >= 2) {
      const recent = patientHistories[0]
      const previous = patientHistories[1]

      if (
        recent.evolucion.toLowerCase().includes("empeoramiento" || "deterioro" || "sin mejoría") &&
        !previous.evolucion.toLowerCase().includes("empeoramiento" || "deterioro")
      ) {
        criticalCases.push({
          paciente: patient,
          historia: recent,
          razon: "Deterioro detectado en evolución reciente",
          prioridad: "alta",
        })
      }
    }

    // Detect pending validations for too long
    if (h.estado === "pendiente") {
      const daysSinceImport = Math.floor(
        (new Date().getTime() - new Date(h.fechaImportacion).getTime()) / (1000 * 60 * 60 * 24),
      )
      if (daysSinceImport > 7) {
        criticalCases.push({
          paciente: patient,
          historia: h,
          razon: `Historia pendiente de validación por ${daysSinceImport} días`,
          prioridad: "media",
        })
      }
    }
  })

  return criticalCases.sort((a, b) => (a.prioridad === "alta" ? -1 : 1))
}

export interface PatientTimeline {
  paciente: Patient
  historias: MedicalHistory[]
  totalConsultas: number
  primeraConsulta: string
  ultimaConsulta: string
  medicamentosUsados: string[]
  diagnosticos: string[]
}

export function getPatientTimeline(pacienteId: number): PatientTimeline | null {
  const patient = getPatientById(pacienteId)
  if (!patient) return null

  const historias = getMedicalHistoriesByPatientId(pacienteId).sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  )

  const medicamentosSet = new Set<string>()
  const diagnosticosSet = new Set<string>()

  historias.forEach((h) => {
    if (h.medicamentos) {
      h.medicamentos.forEach((m) => medicamentosSet.add(m))
    }
    diagnosticosSet.add(h.diagnostico)
  })

  return {
    paciente: patient,
    historias,
    totalConsultas: historias.length,
    primeraConsulta: historias.length > 0 ? historias[0].fecha : "",
    ultimaConsulta: historias.length > 0 ? historias[historias.length - 1].fecha : "",
    medicamentosUsados: Array.from(medicamentosSet),
    diagnosticos: Array.from(diagnosticosSet),
  }
}
