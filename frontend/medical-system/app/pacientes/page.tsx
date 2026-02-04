"use client"

import { useEffect, useState, Suspense } from "react" 
import { useSearchParams, useRouter } from "next/navigation" // 🔹 Importamos useRouter
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Calendar, RefreshCw, Phone, CheckSquare, X } from "lucide-react" 
import { PacienteListadoSelector } from "@/app/pacientes/components/paciente-selector"
import { BarraBusquedaFiltros } from "@/app/pacientes/components/filtros"
import { usePacientesListado } from "@/hooks/use-pacientes-listado"

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

function PaginaPacientes() {
  const router = useRouter() // 🔹 Inicializamos router
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect_to")
  const [selectedPacienteId, setSelectedPacienteId] = useState<number | null>(null)

  // Usamos el Hook personalizado
  const {
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
    hayFiltrosActivos
  } = usePacientesListado()

  // Si estamos en modo "Seleccionar Paciente" (redirect_to), usamos el componente simplificado
  if (redirectTo === "nueva_historia") {
    return (
      <MedicalLayout currentPage="pacientes">
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">Seleccionar Paciente</h1>
                <p className="text-muted-foreground">Haz clic en una fila para seleccionar un paciente para la nueva historia.</p>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" asChild>
                  <a href="/historias">
                    <X className="mr-2 h-4 w-4" /> Cancelar
                  </a>
                </Button>
                <Button asChild disabled={!selectedPacienteId}>
                  <a href={`/historias/nuevo?pacienteId=${selectedPacienteId}`}>
                    <CheckSquare className="mr-2 h-4 w-4" /> Confirmar Selección
                  </a>
                </Button>
              </div>
            </div>
            
            <PacienteListadoSelector 
              onSelectPaciente={setSelectedPacienteId} 
              selectedPacienteId={selectedPacienteId} 
            />
        </div>
      </MedicalLayout>
    )
  }

  // --- VISTA NORMAL DE GESTIÓN DE PACIENTES ---
  return (
    <MedicalLayout currentPage="pacientes">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Pacientes</h1>
            <p className="text-muted-foreground">Administra la información de todos los pacientes registrados.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cargarPacientes} disabled={estaCargando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${estaCargando ? "animate-spin" : ""}`} />
              Refrescar
            </Button>
            <Button asChild>
              <a href="/pacientes/nuevo">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Paciente
              </a>
            </Button>
          </div>
        </div>

        <BarraBusquedaFiltros
          terminoBusqueda={terminoBusqueda}
          onTerminoBusquedaChange={setTerminoBusqueda}
          filtros={filtros}
          onFiltrosChange={manejarCambioFiltro}
          obrasSocialesDisponibles={obrasSocialesDisponibles}
          onLimpiarFiltros={limpiarFiltros}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
        />

        <Card>
          <CardHeader>
            <CardTitle>Lista de Pacientes</CardTitle>
            <CardDescription>{pacientesFiltrados.length} pacientes encontrados</CardDescription>
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
                    {/* 🔹 Eliminada columna Acciones */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estaCargando ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell></TableRow>
                  ) : pacientesFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {hayFiltrosActivos ? "No se encontraron pacientes con esos filtros" : "No hay pacientes registrados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pacientesFiltrados.map((paciente) => (
                      <TableRow 
                        key={paciente.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/pacientes/detalle?id=${paciente.id}`)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{paciente.apellido}, {paciente.nombre}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(paciente.fechaNacimiento).toLocaleDateString("es-AR")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{paciente.dni}</TableCell>
                        <TableCell><Badge variant="outline">{paciente.obraSocial}</Badge></TableCell>
                        <TableCell>
                           <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {paciente.telefono}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{obtenerConteoHistorias(paciente.id)} historias</Badge>
                        </TableCell>
                        {/* 🔹 Eliminada celda Acciones */}
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