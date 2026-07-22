"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { getPacientes, getHistoriasDePaciente, PacienteBackend } from "@/lib/api-pacientes"

export interface FiltrosPaciente {
  obra_social: string
}

export function usePacientesListado() {
  const [pacientes, setPacientes] = useState<PacienteBackend[]>([])
  const [estaCargando, setEstaCargando] = useState(true)
  const [conteosHistorias, setConteosHistorias] = useState<Record<string, number>>({})
  const [terminoBusqueda, setTerminoBusqueda] = useState("")
  const [filtros, setFiltros] = useState<FiltrosPaciente>({ obra_social: "todas" })
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const cargarPacientes = useCallback(async () => {
    setEstaCargando(true)
    try {
      const data = await getPacientes()
      setPacientes(data)
      setEstaCargando(false)

      const counts: Record<string, number> = {}
      for (const p of data) {
        const historias = await getHistoriasDePaciente(p.dni)
        counts[p.id] = historias.length
        setConteosHistorias(prev => ({ ...prev, [p.id]: historias.length }))
      }
    } catch (error) {
      console.error("Error:", error)
      setEstaCargando(false)
    }
  }, [])

  useEffect(() => { cargarPacientes() }, [cargarPacientes])

  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter((p) => {
      const nombrePaciente = p.nombre || "Paciente Desconocido"
      const nombreLimpio = nombrePaciente.toLowerCase().replace(/,/g, '')
      const terminoLimpio = terminoBusqueda.toLowerCase()
      const dniPaciente = p.dni || ""
      const coincideBusqueda = nombreLimpio.includes(terminoLimpio) || dniPaciente.includes(terminoBusqueda)
      const coincideOS = filtros.obra_social === "todas" || p.obra_social === filtros.obra_social
      return coincideBusqueda && coincideOS
    }).sort((a, b) => {
      const nombreA = a.nombre || "Paciente Desconocido"
      const nombreB = b.nombre || "Paciente Desconocido"
      return sortOrder === "asc" 
        ? nombreA.localeCompare(nombreB) 
        : nombreB.localeCompare(nombreA)
    })
  }, [pacientes, terminoBusqueda, filtros, sortOrder])

  return {
    pacientesFiltrados,
    estaCargando,
    obrasSocialesDisponibles: Array.from(new Set(pacientes.map(p => p.obra_social).filter(Boolean))) as string[],
    terminoBusqueda,
    setTerminoBusqueda,
    filtros,
    manejarCambioFiltro: (id: keyof FiltrosPaciente, value: string) => setFiltros(prev => ({ ...prev, [id]: value })),
    sortOrder,
    setSortOrder,
    limpiarFiltros: () => { setTerminoBusqueda(""); setFiltros({ obra_social: "todas" }) },
    cargarPacientes,
    obtenerConteoHistorias: (id: string) => conteosHistorias[id] || 0,
    hayFiltrosActivos: terminoBusqueda !== "" || filtros.obra_social !== "todas"
  }
}