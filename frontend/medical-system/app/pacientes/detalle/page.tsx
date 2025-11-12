"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, FileText, Plus, RefreshCw, TrendingUp } from "lucide-react"
import {
  getPatientById,
  getPatientTimeline,
  type Patient,
  type PatientTimeline as TimelineType,
} from "@/lib/data-store"
import { PatientInfoCard } from "../components/patient-info-card"
import { PatientMedicalCard } from "../components/patient-medical-card"
import { PatientHistoriesTable } from "../components/patient-histories-table"
import { Badge } from "@/components/ui/badge"

export default function DetallePacientePage() {
  const searchParams = useSearchParams()
  const patientId = Number(searchParams.get("id"))

  const [patient, setPatient] = useState<Patient | null>(null)
  const [timeline, setTimeline] = useState<TimelineType | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadPatientData()
  }, [patientId])

  const loadPatientData = () => {
    setIsLoading(true)
    const patientData = getPatientById(patientId)
    setPatient(patientData || null)

    if (patientData) {
      const timelineData = getPatientTimeline(patientId)
      setTimeline(timelineData)
    }
    setIsLoading(false)
  }

  if (!patient) {
    return (
      <MedicalLayout currentPage="pacientes">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card>
            <CardHeader>
              <CardTitle>Paciente no encontrado</CardTitle>
              <CardDescription>El paciente solicitado no existe en el sistema</CardDescription>
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <a href="/pacientes">
              <ArrowLeft className="h-4 w-4" />
            </a>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-balance">
              {patient.apellido}, {patient.nombre}
            </h1>
            <p className="text-muted-foreground">
              DNI: {patient.dni} • Registrado el {new Date(patient.fechaRegistro).toLocaleDateString("es-AR")}
            </p>
          </div>
          <Button asChild>
            <a href={`/pacientes/editar?id=${patient.id}`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Patient Information */}
          <div className="lg:col-span-2 space-y-6">
            <PatientInfoCard patient={patient} />

            <Card>
              <CardHeader>
                <CardTitle>Observaciones Médicas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{patient.observaciones}</p>
              </CardContent>
            </Card>

            {timeline && timeline.historias.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Evolución Temporal
                  </CardTitle>
                  <CardDescription>Análisis cronológico de {timeline.totalConsultas} consultas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Primera Consulta</p>
                      <p className="font-medium">{new Date(timeline.primeraConsulta).toLocaleDateString("es-AR")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Última Consulta</p>
                      <p className="font-medium">{new Date(timeline.ultimaConsulta).toLocaleDateString("es-AR")}</p>
                    </div>
                  </div>

                  {timeline.medicamentosUsados.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Medicamentos Utilizados</p>
                      <div className="flex flex-wrap gap-2">
                        {timeline.medicamentosUsados.map((med, idx) => (
                          <Badge key={idx} variant="secondary">
                            {med}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {timeline.diagnosticos.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Diagnósticos Registrados</p>
                      <div className="flex flex-wrap gap-2">
                        {timeline.diagnosticos.map((diag, idx) => (
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

            {/* Medical History */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Historias Clínicas (Orden Cronológico)
                    </CardTitle>
                    <CardDescription>{timeline?.historias.length || 0} historias clínicas registradas</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadPatientData} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!timeline || timeline.historias.length === 0 ? (
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
                  <PatientHistoriesTable historias={timeline.historias} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <PatientMedicalCard patient={patient} />

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
                  <a href={`/pacientes/editar?id=${patient.id}`}>
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
