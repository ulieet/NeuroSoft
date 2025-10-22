"use client"

import { useEffect, useState } from "react"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, AlertTriangle, Activity, Pill, RefreshCw, User, Calendar, ArrowRight } from "lucide-react"
import {
  compareMedications,
  detectCriticalCases,
  initializeSampleData,
  type MedicationComparison,
  type CriticalCase,
} from "@/lib/data-store"
import { Progress } from "@/components/ui/progress"

export default function AnalisisPage() {
  const [medications, setMedications] = useState<MedicationComparison[]>([])
  const [criticalCases, setCriticalCases] = useState<CriticalCase[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadAnalysis = () => {
    setIsLoading(true)
    initializeSampleData()
    setMedications(compareMedications())
    setCriticalCases(detectCriticalCases())
    setIsLoading(false)
  }

  useEffect(() => {
    loadAnalysis()
  }, [])

  return (
    <MedicalLayout currentPage="analisis">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-balance">Análisis y Tendencias</h1>
            <p className="text-muted-foreground">
              Comparación de tratamientos y detección automática de casos críticos
            </p>
          </div>
          <Button variant="outline" onClick={loadAnalysis} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar Análisis
          </Button>
        </div>

        {/* Critical Cases Alert */}
        {criticalCases.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <AlertTriangle className="h-5 w-5" />
                Casos Críticos Detectados
              </CardTitle>
              <CardDescription className="text-orange-700">
                {criticalCases.length} casos requieren atención inmediata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {criticalCases.slice(0, 5).map((caso, idx) => (
                  <div key={idx} className="flex items-start justify-between p-3 bg-white rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={caso.prioridad === "alta" ? "destructive" : "secondary"}>
                          {caso.prioridad === "alta" ? "Prioridad Alta" : "Prioridad Media"}
                        </Badge>
                        <span className="font-medium">
                          {caso.paciente.apellido}, {caso.paciente.nombre}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{caso.razon}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          DNI: {caso.paciente.dni}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(caso.historia.fecha).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/pacientes/detalle?id=${caso.paciente.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
              {criticalCases.length > 5 && (
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  Y {criticalCases.length - 5} casos más...
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Medication Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Comparación de Medicamentos
            </CardTitle>
            <CardDescription>Análisis de efectividad y efectos secundarios por medicamento</CardDescription>
          </CardHeader>
          <CardContent>
            {medications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay suficientes datos para comparar medicamentos</p>
                <p className="text-sm mt-2">
                  Importa historias clínicas con información de medicamentos para ver análisis
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {medications.map((med, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{med.medicamento}</h3>
                        <p className="text-sm text-muted-foreground">
                          Utilizado en {med.totalPacientes} paciente{med.totalPacientes !== 1 ? "s" : ""} •{" "}
                          {med.historias.length} registro{med.historias.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge
                        variant={
                          med.mejoriaPromedio >= 70 ? "default" : med.mejoriaPromedio >= 40 ? "secondary" : "outline"
                        }
                      >
                        {med.mejoriaPromedio.toFixed(0)}% efectividad
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Tasa de mejoría</span>
                        <span className="font-medium">{med.mejoriaPromedio.toFixed(1)}%</span>
                      </div>
                      <Progress value={med.mejoriaPromedio} className="h-2" />
                    </div>

                    {med.efectosSecundarios > 0 && (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>
                          {med.efectosSecundarios} reporte{med.efectosSecundarios !== 1 ? "s" : ""} de efectos
                          secundarios
                        </span>
                      </div>
                    )}

                    {idx < medications.length - 1 && <div className="border-t pt-3" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medicamentos Analizados</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{medications.length}</div>
              <p className="text-xs text-muted-foreground">Diferentes tratamientos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Casos Críticos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{criticalCases.length}</div>
              <p className="text-xs text-muted-foreground">Requieren atención</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Efectividad Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {medications.length > 0
                  ? (medications.reduce((acc, m) => acc + m.mejoriaPromedio, 0) / medications.length).toFixed(0)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">De todos los tratamientos</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MedicalLayout>
  )
}
