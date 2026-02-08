"use client"

import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserPlus, FileText, RefreshCw } from "lucide-react"
import { BarraBusquedaFiltros } from "@/app/pacientes/components/filtros"

// IMPORTANTE: Usamos tu Hook que ya tiene la lógica de conteo de historias
import { usePacientesListado } from "@/hooks/use-pacientes-listado"

export default function PaginaPacientesSuspense() {
  return (
    <Suspense fallback={
      <MedicalLayout currentPage="pacientes">
          <div className="flex items-center justify-center min-h-[400px]">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2">Cargando módulo de pacientes...</p>
          </div>
      </MedicalLayout>
    }>
      <PaginaPacientes />
    </Suspense>
  )
}

function PaginaPacientes() {
  const router = useRouter()
  
  // Extraemos todo lo necesario de tu Hook
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
    obtenerConteoHistorias, // <--- Esta es la clave para el número de historias
    hayFiltrosActivos
  } = usePacientesListado()

  return (
    <MedicalLayout currentPage="pacientes">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Pacientes</h1>
            <p className="text-muted-foreground text-sm">
              Base de datos centralizada ({pacientesFiltrados.length} registros)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cargarPacientes} disabled={estaCargando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${estaCargando ? "animate-spin" : ""}`} />
              Refrescar
            </Button>
            <Button className="bg-[#003e66] hover:bg-[#002a45]" onClick={() => router.push("/pacientes/nuevo")}>
              <UserPlus className="mr-2 h-4 w-4" /> Nuevo Paciente
            </Button>
          </div>
        </div>

        <BarraBusquedaFiltros
          terminoBusqueda={terminoBusqueda}
          onTerminoBusquedaChange={setTerminoBusqueda}
          filtros={filtros} 
          // Ajustamos para que coincida con la firma del Hook (obra_social)
          onFiltrosChange={(id: any, val: any) => manejarCambioFiltro(id, val)}
          obrasSocialesDisponibles={obrasSocialesDisponibles}
          onLimpiarFiltros={limpiarFiltros}
          sortOrder={sortOrder}
          onSortOrderChange={(val) => setSortOrder(val as "asc" | "desc")}
        />

        <Card>
          <CardHeader>
            <CardTitle>Lista de Pacientes</CardTitle>
            <CardDescription>Haz clic en una fila para ver el detalle completo</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apellido y Nombre</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Obra Social</TableHead>
                    <TableHead className="text-center">Historias</TableHead> 
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estaCargando && pacientesFiltrados.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">Cargando pacientes...</TableCell></TableRow>
                  ) : pacientesFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {hayFiltrosActivos ? "No se encontraron coincidencias" : "No hay pacientes registrados."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pacientesFiltrados.map((p) => (
                      <TableRow 
                        key={p.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors" 
                        onClick={() => router.push(`/pacientes/detalle?id=${p.id}`)}
                      >
                        {/* Nombre: quitamos comas y ponemos en negrita sutil */}
                        <TableCell className="font-medium">
                           {p.nombre.replace(/,/g, '')}
                        </TableCell>
                        
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.dni}
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline" className="font-normal border-slate-200">
                            {p.obra_social || "Particular"}
                          </Badge>
                        </TableCell>

                        {/* CONTEO REAL: Usamos la función del Hook */}
                        <TableCell className="text-center">
                          <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                            <FileText className="h-3 w-3 opacity-50" />
                            {obtenerConteoHistorias(p.id)}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">Ficha</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
    </MedicalLayout>
  )
}