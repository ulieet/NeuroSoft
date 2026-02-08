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
      // Solución al delay: Liberamos la UI apenas tenemos los pacientes
      setEstaCargando(false)

      // Los conteos se calculan después, sin bloquear la pantalla
      const counts: Record<string, number> = {}
      for (const p of data) {
        const historias = await getHistoriasDePaciente(p.dni)
        counts[p.id] = historias.length
        // Vamos actualizando de a poco para que se vea dinámico
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
      const nombreLimpio = p.nombre.toLowerCase().replace(/,/g, '')
      const terminoLimpio = terminoBusqueda.toLowerCase()
      const coincideBusqueda = nombreLimpio.includes(terminoLimpio) || p.dni.includes(terminoBusqueda)
      const coincideOS = filtros.obra_social === "todas" || p.obra_social === filtros.obra_social
      return coincideBusqueda && coincideOS
    }).sort((a, b) => {
      return sortOrder === "asc" 
        ? a.nombre.localeCompare(b.nombre) 
        : b.nombre.localeCompare(a.nombre)
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