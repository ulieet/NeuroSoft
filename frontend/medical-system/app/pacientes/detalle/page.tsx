"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, FileText, Plus, RefreshCw, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Importaciones en español
import {
  obtenerPacientePorId,
  obtenerLineaTiempoPaciente,
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
                    <Button className="mt-4" asChild>
                      <a href="/historias/importar">
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Primera Historia
                      </a>
                    </Button>
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
                    Nueva Historia
                  </a>
                </Button>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <a href={`/pacientes/editar?id=${paciente.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Datos
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MedicalLayout>
  )
}