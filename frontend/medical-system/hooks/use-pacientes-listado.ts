"use client"

import { useState, useEffect, useMemo } from "react"
import { getPacientes, getHistoriasDePaciente, PacienteBackend } from "@/lib/api-pacientes"
import { obtenerEdadPaciente } from "@/lib/almacen-datos"

export function usePacientesListado() {
  const [pacientes, setPacientes] = useState<PacienteBackend[]>([])
  const [estaCargando, setEstaCargando] = useState(false)
  const [conteosHistorias, setConteosHistorias] = useState<Record<string, number>>({})

  const [terminoBusqueda, setTerminoBusqueda] = useState("")
  const [filtros, setFiltros] = useState<any>({ obraSocial: "todas", sexo: "todos" })
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    cargarPacientes()
  }, [])

  const cargarPacientes = async () => {
    setEstaCargando(true)
    const data = await getPacientes()
    setPacientes(data)

    // Cargar conteos de historias para cada paciente en segundo plano
    const counts: Record<string, number> = {}
    await Promise.all(data.map(async (p) => {
      const historias = await getHistoriasDePaciente(p.dni)
      counts[p.id] = historias.length
    }))
    setConteosHistorias(counts)
    setEstaCargando(false)
  }

  const pacientesFiltrados = useMemo(() => {
    let resultado = pacientes.filter((p) => {
      const coincideBusqueda = 
        p.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase()) || 
        p.dni.includes(terminoBusqueda)
      
      const coincideOS = filtros.obraSocial === "todas" || p.obra_social === filtros.obraSocial
      
      return coincideBusqueda && coincideOS
    })

    resultado.sort((a, b) => {
      if (sortOrder === "asc") return a.nombre.localeCompare(b.nombre)
      return b.nombre.localeCompare(a.nombre)
    })

    return resultado
  }, [pacientes, terminoBusqueda, filtros, sortOrder])

  const manejarCambioFiltro = (id: string, value: string) => {
    setFiltros((prev: any) => ({ ...prev, [id]: value }))
  }

  return {
    pacientesFiltrados,
    estaCargando,
    obrasSocialesDisponibles: Array.from(new Set(pacientes.map(p => p.obra_social).filter(Boolean))) as string[],
    terminoBusqueda,
    setTerminoBusqueda,
    filtros,
    manejarCambioFiltro,
    sortOrder,
    setSortOrder,
    limpiarFiltros: () => { setTerminoBusqueda(""); setFiltros({ obraSocial: "todas" }) },
    cargarPacientes,
    obtenerConteoHistorias: (id: string) => conteosHistorias[id] || 0,
    hayFiltrosActivos: terminoBusqueda !== "" || filtros.obraSocial !== "todas"
  }
}