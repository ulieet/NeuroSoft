
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  obtenerPacientes,
  obtenerHistoriasPorPacienteId,
  inicializarDatosDeEjemplo,
  obtenerEdadPaciente,
  type Paciente,
  type FiltrosPaciente,
} from "@/lib/almacen-datos"

export function usePacientesListado() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [estaCargando, setEstaCargando] = useState(false)
  const [obrasSocialesDisponibles, setObrasSocialesDisponibles] = useState<string[]>([])

  const [terminoBusqueda, setTerminoBusqueda] = useState("")
  const [filtros, setFiltros] = useState<FiltrosPaciente>({})
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    cargarPacientes()
  }, [])

  const cargarPacientes = () => {
    setEstaCargando(true)
    inicializarDatosDeEjemplo()
    const data = obtenerPacientes()
    setPacientes(data)

    const obras = [...new Set(data.map((p) => p.obraSocial).filter(Boolean))].sort()
    setObrasSocialesDisponibles(obras)

    setEstaCargando(false)
  }

  const pacientesFiltrados = useMemo(() => {
    let resultado = pacientes.filter((paciente) => {
      // 1. Filtros avanzados
      if (filtros.obraSocial && paciente.obraSocial !== filtros.obraSocial) return false
      if (filtros.sexo && paciente.sexo !== filtros.sexo) return false
      if (filtros.edadMin || filtros.edadMax) {
        const edad = obtenerEdadPaciente(paciente.fechaNacimiento)
        if (filtros.edadMin && edad < filtros.edadMin) return false
        if (filtros.edadMax && edad > filtros.edadMax) return false
      }

      // 2. Búsqueda por término
      if (terminoBusqueda) {
        const busqueda = terminoBusqueda.toLowerCase()
        const nombreCompleto = `${paciente.apellido}, ${paciente.nombre}`.toLowerCase()
        const dni = paciente.dni.toString()
        if (!nombreCompleto.includes(busqueda) && !dni.includes(terminoBusqueda)) {
          return false
        }
      }
      return true
    })

    // 3. Ordenamiento
    resultado.sort((a, b) => {
      const nombreA = `${a.apellido}, ${a.nombre}`.toLowerCase()
      const nombreB = `${b.apellido}, ${b.nombre}`.toLowerCase()

      if (nombreA < nombreB) return sortOrder === "asc" ? -1 : 1
      if (nombreA > nombreB) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return resultado
  }, [pacientes, filtros, terminoBusqueda, sortOrder])

  const manejarCambioFiltro = (id: keyof FiltrosPaciente, value: string | number) => {
    const valorLimpio = value === "todos" || value === "" ? undefined : String(value)
    let valorFinal: string | number | undefined = valorLimpio
    
    if (id.startsWith("edad")) {
      const valorNum = Number(valorLimpio)
      valorFinal = valorNum && valorNum > 0 ? valorNum : undefined
    }

    setFiltros((prev) => ({ ...prev, [id]: valorFinal }))
  }

  const limpiarFiltros = () => {
    setFiltros({})
    setTerminoBusqueda("")
  }

  const obtenerConteoHistorias = (pacienteId: number) => {
    return obtenerHistoriasPorPacienteId(pacienteId).length
  }

  const hayFiltrosActivos = Object.values(filtros).some((v) => v !== undefined) || terminoBusqueda !== ""

  return {
    pacientesFiltrados,
    estaCargando,
    obrasSocialesDisponibles,
    terminoBusqueda,
    setTerminoBusqueda,
    filtros,
    manejarCambioFiltro,
    sortOrder,
    setSortOrder,
    limpiarFiltros,
    cargarPacientes,
    obtenerConteoHistorias,
    hayFiltrosActivos,
  }
}