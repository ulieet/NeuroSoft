"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, FileText, Plus, RefreshCw, Trash, User, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { 
  getPaciente, 
  getHistoriasDePaciente, 
  eliminarPacienteRemoto, 
  type PacienteBackend, 
  type HistoriaBackend 
} from "@/lib/api-pacientes"

import { eliminarHistoriaRemota } from "@/lib/api-historias"

// --- HELPER DE FORMATO DE FECHA ---
const formatearFechaVista = (fechaStr?: string | null) => {
  if (!fechaStr) return "-";
  // Si la fecha viene como YYYY-MM-DD
  if (fechaStr.includes("-")) {
    const partes = fechaStr.split("-");
    if (partes.length === 3 && partes[0].length === 4) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
  }
  return fechaStr;
};

export default function PaginaDetallePacienteSuspense() {
  return (
    <Suspense fallback={
      <MedicalLayout currentPage="pacientes">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MedicalLayout>
    }>
      <PaginaDetallePaciente />
    </Suspense>
  )
}

function PaginaDetallePaciente() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const patientId = searchParams.get("id")

  const [paciente, setPaciente] = useState<PacienteBackend | null>(null)
  const [historias, setHistorias] = useState<HistoriaBackend[]>([])
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (patientId) {
      cargarDatos()
    }
  }, [patientId])

  const cargarDatos = async () => {
    setLoading(true)
    if (!patientId) return

    try {
      const dataPaciente = await getPaciente(patientId)
      setPaciente(dataPaciente)

      if (dataPaciente) {
        const dataHistorias = await getHistoriasDePaciente(patientId)
        const historiasOrdenadas = dataHistorias.sort((a, b) => {
            const dateA = new Date(a.fecha_consulta || 0).getTime()
            const dateB = new Date(b.fecha_consulta || 0).getTime()
            return dateB - dateA
        })
        setHistorias(historiasOrdenadas)
      }
    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEliminarPaciente = async () => {
    if (!paciente) return
    setIsDeleting(true)
    try {
      if (historias.length > 0) {
        await Promise.all(historias.map(h => eliminarHistoriaRemota(h.id)));
      }
      const exito = await eliminarPacienteRemoto(paciente.id)
      if (exito) {
        router.push("/pacientes") 
      } else {
        alert("No se pudo eliminar el paciente del servidor.")
      }
    } catch (error) {
      console.error(error)
      alert("Ocurrió un error inesperado.")
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
     return (
       <MedicalLayout currentPage="pacientes">
         <div className="flex items-center justify-center min-h-[400px]">
           <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
       </MedicalLayout>
     )
  }

  if (!paciente) {
    return (
      <MedicalLayout currentPage="pacientes">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Paciente no encontrado</CardTitle>
              <CardDescription>ID: {patientId}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/pacientes")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </MedicalLayout>
    )
  }

  return (
    <MedicalLayout currentPage="pacientes">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{paciente.nombre}</h1>
            <p className="text-muted-foreground">DNI: {paciente.dni}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" /> Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                    <p>{paciente.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">DNI</p>
                    <p className="font-mono">{paciente.dni}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nacimiento</p>
                    {/* APLICACIÓN DEL FORMATO DD/MM/YYYY */}
                    <p>{formatearFechaVista(paciente.fecha_nacimiento)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Actualizado</p>
                    <p>{paciente.ultima_actualizacion ? new Date(paciente.ultima_actualizacion).toLocaleDateString("es-AR") : "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Historias Clínicas
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={cargarDatos}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>{historias.length} documentos</CardDescription>
              </CardHeader>
              <CardContent>
                {historias.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No hay historias.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Diagnóstico</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Ver</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historias.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {/* TAMBIÉN PODEMOS FORMATEAR AQUÍ SI ES NECESARIO */}
                              {formatearFechaVista(h.fecha_consulta)}
                            </div>
                          </TableCell>
                          <TableCell className="truncate max-w-[200px]">{h.diagnostico || "Sin Dx"}</TableCell>
                          <TableCell>
                            <Badge variant={h.estado === "validada" ? "default" : "outline"}>
                              {h.estado === "pendiente_validacion" ? "Pendiente" : h.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/historias/detalle?id=${h.id}`)}>
                              Ver Detalle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Cobertura</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-muted-foreground">Obra Social</p>
                <Badge variant="outline" className="mt-1">{paciente.obra_social || "N/A"}</Badge>
                <p className="text-sm font-medium text-muted-foreground mt-4">Nro Afiliado</p>
                <p className="font-mono">{paciente.nro_afiliado || "-"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={() => router.push("/historias/importar")}>
                  <Plus className="mr-2 h-4 w-4" /> Nueva Historia
                </Button>
                
                <Button variant="outline" className="w-full" onClick={() => router.push(`/pacientes/editar?id=${paciente.id}`)}>
                  <Edit className="mr-2 h-4 w-4" /> Editar Datos
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash className="mr-2 h-4 w-4" /> Eliminar Paciente
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                      <AlertDialogDescription>Esta acción eliminará todas las historias asociadas. Irreversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleEliminarPaciente} disabled={isDeleting}>
                        {isDeleting ? "Eliminando..." : "Confirmar"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MedicalLayout>
  )
}