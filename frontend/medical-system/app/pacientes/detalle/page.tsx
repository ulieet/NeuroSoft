"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation" // <-- 1. Importar useRouter
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, FileText, Plus, RefreshCw, TrendingUp, Trash } from "lucide-react" // <-- 2. Importar Trash
import { Badge } from "@/components/ui/badge"

// 3. Importar AlertDialog
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

// Importaciones en español
import {
  obtenerPacientePorId,
  obtenerLineaTiempoPaciente,
  eliminarPaciente, // <-- 4. Importar la nueva función
  type Paciente,
  type LineaTiempoPaciente,
} from "@/lib/almacen-datos"

// Componentes con nuevos nombres
import { InfoPersonal } from "../components/info-personal"
import { InfoMedica } from "../components/info-medica"
import { TablaHistorias } from "../components/tabla-historias"

// Envolvemos el componente principal en <Suspense>
export default function PaginaDetallePacienteSuspense() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <PaginaDetallePaciente />
    </Suspense>
  )
}

function PaginaDetallePaciente() {
  const searchParams = useSearchParams()
  const router = useRouter() // <-- 5. Inicializar router
  const patientId = Number(searchParams.get("id"))

  // Estado en español
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [lineaTiempo, setLineaTiempo] = useState<LineaTiempoPaciente | null>(null)
  const [estaCargando, setEstaCargando] = useState(false)

  useEffect(() => {
    if (patientId) {
      cargarDatosPaciente()
    }
  }, [patientId])

  const cargarDatosPaciente = () => {
    setEstaCargando(true)
    const datosPaciente = obtenerPacientePorId(patientId)
    setPaciente(datosPaciente || null)

    if (datosPaciente) {
      const datosLineaTiempo = obtenerLineaTiempoPaciente(patientId)
      setLineaTiempo(datosLineaTiempo)
    }
    setEstaCargando(false)
  }

  // --- 6. Handler para eliminar ---
  const handleEliminarPaciente = () => {
    if (!paciente) return
    try {
      eliminarPaciente(paciente.id)
      alert("Paciente y todas sus historias han sido eliminados.")
      router.push("/pacientes") // Redirigir a la lista
    } catch (error) {
      console.error(error)
      alert("Error al eliminar el paciente.")
    }
  }

  if (estaCargando && !paciente) {
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
        <div className="flex items-center justify-center min-h-[400px]">
          <Card>
            <CardHeader>
              <CardTitle>Paciente no encontrado</CardTitle>
              <CardDescription>El paciente solicitado (ID: {patientId}) no existe.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a href="/pacientes">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a Pacientes
                </a>
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
          <Button variant="ghost" size="sm" asChild>
            <a href="/pacientes">
              <ArrowLeft className="h-4 w-4" />
            </a>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-balance">
              {paciente.apellido}, {paciente.nombre}
            </h1>
            <p className="text-muted-foreground">
              DNI: {paciente.dni} • Registrado el {new Date(paciente.fechaRegistro).toLocaleDateString("es-AR")}
            </p>
          </div>
          <Button asChild>
            <a href={`/pacientes/editar?id=${paciente.id}`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">

            
            <InfoPersonal paciente={paciente} />


              <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Historias Clínicas (Más recientes primero)
                    </CardTitle>
                    <CardDescription>{lineaTiempo?.historias.length || 0} historias registradas</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={cargarDatosPaciente} disabled={estaCargando}>
                    <RefreshCw className={`h-4 w-4 ${estaCargando ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!lineaTiempo || lineaTiempo.historias.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay historias clínicas registradas para este paciente</p>
                    <div className="flex justify-center gap-4 mt-4">
                      <Button asChild>
                        <a href="/historias/importar">
                          <Plus className="mr-2 h-4 w-4" />
                          Importar Historia
                        </a>
                      </Button>
                      <Button variant="outline" asChild>
                        <a href={`/historias/nuevo?pacienteId=${paciente.id}`}>
                          <Plus className="mr-2 h-4 w-4" />
                          Crear de Cero
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <TablaHistorias historias={lineaTiempo.historias} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observaciones Médicas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{paciente.observaciones || "Sin observaciones."}</p>
              </CardContent>
            </Card>

            {lineaTiempo && lineaTiempo.historias.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Evolución Temporal
                  </CardTitle>
                  <CardDescription>Análisis cronológico de {lineaTiempo.totalConsultas} consultas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Primera Consulta</p>
                      <p className="font-medium">{new Date(lineaTiempo.primeraConsulta).toLocaleDateString("es-AR")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Última Consulta</p>
                      <p className="font-medium">{new Date(lineaTiempo.ultimaConsulta).toLocaleDateString("es-AR")}</p>
                    </div>
                  </div>

                  {lineaTiempo.medicamentosUsados.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Medicamentos Utilizados (Histórico)</p>
                      <div className="flex flex-wrap gap-2">
                        {lineaTiempo.medicamentosUsados.map((med, idx) => (
                          <Badge key={idx} variant="secondary">
                            {med}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {lineaTiempo.diagnosticos.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Diagnósticos (Histórico)</p>
                      <div className="flex flex-wrap gap-2">
                        {lineaTiempo.diagnosticos.map((diag, idx) => (
                          <Badge key={idx} variant="outline">
                            {diag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          
          </div>

         <div className="space-y-6">
            <InfoMedica paciente={paciente} />

            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" asChild>
                  <a href="/historias/importar">
                    <Plus className="mr-2 h-4 w-4" />
                    Importar Historia
                  </a>
                </Button>
                <Button className="w-full" variant="outline" asChild>
                  <a href={`/historias/nuevo?pacienteId=${paciente.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Historia de Cero
                  </a>
                </Button>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <a href={`/pacientes/editar?id=${paciente.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Datos Paciente
                  </a>
                </Button>
                
                {/* --- 7. BOTÓN DE ELIMINAR PACIENTE --- */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash className="mr-2 h-4 w-4" />
                      Eliminar Paciente
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente al paciente
                        <span className="font-bold"> {paciente.apellido}, {paciente.nombre}</span> y 
                        todas sus <span className="font-bold">{lineaTiempo?.historias.length || 0}</span> historias clínicas asociadas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleEliminarPaciente}>
                        Confirmar Eliminación
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {/* --- FIN DEL BOTÓN --- */}

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MedicalLayout>
  )
}