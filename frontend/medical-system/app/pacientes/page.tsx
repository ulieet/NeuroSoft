"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { useRouter } from "next/navigation"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserPlus, Calendar, RefreshCw } from "lucide-react"
import { BarraBusquedaFiltros } from "@/app/pacientes/components/filtros"
import { getPacientes } from "@/lib/api-pacientes"

// IMPORTANTE: Importamos el tipo exacto que espera el componente de filtros
import { type FiltrosPaciente } from "@/lib/almacen-datos"

interface PacienteFrontend {
  id: string
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  obraSocial: string
  telefono: string
  historialCount: number
}

type SortOrder = "asc" | "desc";

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
  const [pacientes, setPacientes] = useState<PacienteFrontend[]>([])
  const [estaCargando, setEstaCargando] = useState(true)
  const [terminoBusqueda, setTerminoBusqueda] = useState("")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")

  // 1. Inicializamos con undefined en lugar de "" para cumplir con el tipo number | undefined
  const [filtros, setFiltros] = useState<FiltrosPaciente>({ 
    obraSocial: "todas", 
    sexo: "todos", 
    edadMin: undefined, 
    edadMax: undefined 
  })

  useEffect(() => { cargarPacientes() }, [])

  const cargarPacientes = async () => {
    setEstaCargando(true)
    try {
      const dataBackend = await getPacientes()
      const pacientesMapeados: PacienteFrontend[] = dataBackend.map(p => {
        const partesNombre = p.nombre.includes(',') ? p.nombre.split(',') : [p.nombre, '']
        return {
          id: p.id,
          apellido: partesNombre[0].trim() || p.nombre,
          nombre: partesNombre.length > 1 ? partesNombre[1].trim() : '',
          dni: p.dni,
          fechaNacimiento: p.fecha_nacimiento || "",
          obraSocial: p.obra_social || "S/D",
          telefono: "-",
          historialCount: 0
        }
      })
      setPacientes(pacientesMapeados)
    } catch (error) {
      console.error("Error cargando pacientes:", error)
    } finally {
      setEstaCargando(false)
    }
  }

  // 2. Corregimos la firma de la función para que coincida con lo que espera BarraBusquedaFiltros
  const manejarCambioFiltro = (id: keyof FiltrosPaciente, value: string | number) => {
    setFiltros((prev) => ({
      ...prev,
      [id]: value === "" ? undefined : value
    }))
  }

  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter((p) => {
      const t = terminoBusqueda.toLowerCase()
      const coincide = `${p.nombre} ${p.apellido}`.toLowerCase().includes(t) || p.dni.includes(t)
      if (!coincide) return false
      
      if (filtros.obraSocial !== "todas" && p.obraSocial !== filtros.obraSocial) return false
      
      // Aquí podrías agregar lógica de filtrado por edad si calculas la edad del paciente
      
      return true
    }).sort((a, b) => {
      if (sortOrder === "asc") return a.apellido.localeCompare(b.apellido)
      return b.apellido.localeCompare(a.apellido)
    })
  }, [pacientes, terminoBusqueda, filtros, sortOrder])

  const hayFiltrosActivos = terminoBusqueda !== "" || filtros.obraSocial !== "todas" || filtros.edadMin !== undefined || filtros.edadMax !== undefined

  return (
    <MedicalLayout currentPage="pacientes">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Pacientes</h1>
            <p className="text-muted-foreground">Base de datos centralizada ({pacientes.length} registros)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cargarPacientes} disabled={estaCargando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${estaCargando ? "animate-spin" : ""}`} />
              Refrescar
            </Button>
            <Button onClick={() => router.push("/pacientes/nuevo")}>
              <UserPlus className="mr-2 h-4 w-4" /> Nuevo Paciente
            </Button>
          </div>
        </div>

        <BarraBusquedaFiltros
          terminoBusqueda={terminoBusqueda}
          onTerminoBusquedaChange={setTerminoBusqueda}
          filtros={filtros} // Ahora el tipo coincide
          onFiltrosChange={manejarCambioFiltro} // Ahora la firma coincide
          obrasSocialesDisponibles={Array.from(new Set(pacientes.map(p => p.obraSocial).filter(os => os !== "S/D")))}
          onLimpiarFiltros={() => {
            setTerminoBusqueda(""); 
            setFiltros({obraSocial: "todas", sexo: "todos", edadMin: undefined, edadMax: undefined})
          }}
          sortOrder={sortOrder}
          onSortOrderChange={(val) => setSortOrder(val as SortOrder)}
        />

        <Card>
          <CardHeader>
            <CardTitle>Lista de Pacientes</CardTitle>
            <CardDescription>{pacientesFiltrados.length} encontrados</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apellido y Nombre</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Obra Social</TableHead>
                    <TableHead>Nacimiento</TableHead> 
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estaCargando ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell></TableRow>
                  ) : pacientesFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {hayFiltrosActivos ? "No se encontraron resultados" : "No hay pacientes registrados."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pacientesFiltrados.map((p) => (
                      <TableRow 
                        key={p.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors" 
                        onClick={() => router.push(`/pacientes/detalle?id=${p.id}`)}
                      >
                        <TableCell className="font-medium">{p.apellido}, {p.nombre}</TableCell>
                        <TableCell className="font-mono">{p.dni}</TableCell>
                        <TableCell><Badge variant="outline">{p.obraSocial}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {p.fechaNacimiento || "-"}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary">Ver Ficha</Badge></TableCell>
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