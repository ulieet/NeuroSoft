"use client"

// --- IMPORTS ---
import { useEffect, useState, useMemo, Suspense } from "react" 
import { useSearchParams } from "next/navigation" 
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Eye, Edit, Calendar, RefreshCw, Phone, CheckSquare, X, ArrowUp, ArrowDown } from "lucide-react" 
import { cn } from "@/lib/utils" // <-- Importamos 'cn' para clases condicionales

import {
  obtenerPacientes,
  obtenerHistoriasPorPacienteId,
  inicializarDatosDeEjemplo,
  obtenerEdadPaciente,
  type Paciente,
  type FiltrosPaciente, 
} from "@/lib/almacen-datos"

import { BarraBusquedaFiltros } from "@/app/pacientes/components/filtros"

// --- WRAPPER DE SUSPENSE ---
export default function PaginaPacientesSuspense() {
  return (
    <Suspense fallback={
      <MedicalLayout currentPage="pacientes">
         <div className="flex items-center justify-center min-h-[400px]">
           <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
           <p className="ml-2">Cargando pacientes...</p>
         </div>
      </MedicalLayout>
    }>
      <PaginaPacientes />
    </Suspense>
  )
}

// --- COMPONENTE PRINCIPAL ---
function PaginaPacientes() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect_to")
  
  // --- NUEVO ESTADO ---
  const [selectedPacienteId, setSelectedPacienteId] = useState<number | null>(null)

  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [estaCargando, setEstaCargando] = useState(false)
  const [obrasSocialesDisponibles, setObrasSocialesDisponibles] = useState<string[]>([])
  
  const [terminoBusqueda, setTerminoBusqueda] = useState("")
  const [filtros, setFiltros] = useState<FiltrosPaciente>({})
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc") // NUEVO: Estado de ordenamiento

  useEffect(() => {
    cargarPacientes()
  }, [])

  const cargarPacientes = () => {
    setEstaCargando(true)
    inicializarDatosDeEjemplo() 
    const data = obtenerPacientes()
    setPacientes(data)

    const obras = [...new Set(data.map(p => p.obraSocial).filter(Boolean))].sort()
    setObrasSocialesDisponibles(obras)
    
    setEstaCargando(false)
  }

  const pacientesFiltrados = useMemo(() => {
    let pacientesFiltrados = pacientes.filter(paciente => {
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
        if (
          !nombreCompleto.includes(busqueda) &&
          !paciente.dni.includes(terminoBusqueda)
        ) {
          return false
        }
      }
      return true
    });

    // NUEVA LÓGICA DE ORDENAMIENTO
    pacientesFiltrados.sort((a, b) => {
      const nombreA = `${a.apellido}, ${a.nombre}`.toLowerCase();
      const nombreB = `${b.apellido}, ${b.nombre}`.toLowerCase();
      
      if (nombreA < nombreB) {
        return sortOrder === "asc" ? -1 : 1;
      }
      if (nombreA > nombreB) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });
    
    return pacientesFiltrados;

  }, [pacientes, filtros, terminoBusqueda, sortOrder]); // <-- Dependencia añadida

  const manejarCambioFiltro = (id: keyof FiltrosPaciente, value: string | number) => {
    const valorLimpio = (value === "todos" || value === "") ? undefined : String(value);

    let valorFinal: string | number | undefined = valorLimpio;
    if (id.startsWith("edad")) {
      const valorNum = Number(valorLimpio);
      valorFinal = (valorNum && valorNum > 0) ? valorNum : undefined;
    }
    
    setFiltros(prev => ({ ...prev, [id]: valorFinal }))
  }

  const limpiarFiltros = () => {
    setFiltros({})
    setTerminoBusqueda("")
    setSelectedPacienteId(null) // Limpiar selección también
  }

  const obtenerConteoHistorias = (pacienteId: number) => {
    return obtenerHistoriasPorPacienteId(pacienteId).length
  }

  const hayFiltrosActivos = Object.values(filtros).some(v => v !== undefined) || terminoBusqueda !== "";

  return (
    <MedicalLayout currentPage="pacientes">
      <div className="space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-balance">
              {redirectTo === "nueva_historia" 
                ? "Seleccionar Paciente" 
                : "Gestión de Pacientes"}
            </h1>
            <p className="text-muted-foreground">
              {redirectTo === "nueva_historia"
                ? "Haz clic en una fila para seleccionar un paciente"
                : "Administra la información de todos los pacientes"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cargarPacientes} disabled={estaCargando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${estaCargando ? "animate-spin" : ""}`} />
              Refrescar
            </Button>
            
            {/* --- MODIFICACIÓN DE BOTONES EN CABECERA --- */}
            {redirectTo === "nueva_historia" ? (
              <>
                <Button variant="outline" asChild>
                  <a href="/historias">
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </a>
                </Button>
                <Button 
                  asChild 
                  disabled={!selectedPacienteId} // Deshabilitado si no hay selección
                >
                  <a href={`/historias/nuevo?pacienteId=${selectedPacienteId}`}>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Seleccionar
                  </a>
                </Button>
              </>
            ) : (
              <Button asChild>
                <a href="/pacientes/nuevo">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Paciente
                </a>
              </Button>
            )}
            {/* --- FIN DE MODIFICACIÓN --- */}
          </div>
        </div>

        {/* Componente de Búsqueda y Filtros */}
        <BarraBusquedaFiltros
          terminoBusqueda={terminoBusqueda}
          onTerminoBusquedaChange={setTerminoBusqueda}
          filtros={filtros}
          onFiltrosChange={manejarCambioFiltro}
          obrasSocialesDisponibles={obrasSocialesDisponibles}
          onLimpiarFiltros={limpiarFiltros}

          // Props para el ordenamiento
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
        />

        {/* Tabla de Pacientes */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pacientes</CardTitle>
            <CardDescription>
              {pacientesFiltrados.length} pacientes encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apellido y Nombre</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Obra Social</TableHead>
                    <TableHead>Teléfono</TableHead> 
                    <TableHead>Historias</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estaCargando ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Cargando...</TableCell></TableRow>
                  ) : pacientesFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {hayFiltrosActivos ? "No se encontraron pacientes con esos filtros" : "No hay pacientes registrados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pacientesFiltrados.map((paciente) => (
                      // --- MODIFICACIÓN DE FILA ---
                      <TableRow 
                        key={paciente.id}
                        onClick={() => {
                          if (redirectTo === "nueva_historia") {
                            setSelectedPacienteId(paciente.id)
                          }
                        }}
                        className={cn(
                          redirectTo === "nueva_historia" && "cursor-pointer",
                          selectedPacienteId === paciente.id && "bg-secondary" // Estilo de fila seleccionada
                        )}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {paciente.apellido}, {paciente.nombre}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(paciente.fechaNacimiento).toLocaleDateString("es-AR")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{paciente.dni}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{paciente.obraSocial}</Badge>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {paciente.telefono}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{obtenerConteoHistorias(paciente.id)} historias</Badge>
                        </TableCell>
                        {/* --- MODIFICACIÓN DE CELDA DE ACCIONES --- */}
                        <TableCell className="text-right">
                          {redirectTo === "nueva_historia" ? (
                            // En modo selección, mostramos un indicador si está seleccionado
                            selectedPacienteId === paciente.id && (
                              <span className="text-primary font-medium text-xs">Seleccionado</span>
                            )
                          ) : (
                            // Modo normal: botones de Ver y Editar
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`/pacientes/detalle?id=${paciente.id}`}>
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`/pacientes/editar?id=${paciente.id}`}>
                                  <Edit className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MedicalLayout>
  )
}