"use client" // <-- REQUERIDO

import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, AlertTriangle, Pill } from "lucide-react"

export default function PaginaAnalisis() {
  
  return (
    <MedicalLayout currentPage="analisis">
      <div className="space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-balance">Análisis y Tendencias</h1>
            <p className="text-muted-foreground">
              Módulo de análisis (Simplificado)
            </p>
          </div>
        </div>

        {/* Placeholder: Casos Críticos */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="h-5 w-5" />
              Detección de Casos Críticos (Próximamente)
            </CardTitle>
            <CardDescription className="text-orange-700">
              Esta sección mostrará automáticamente pacientes que requieran atención.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Placeholder: Comparación de Medicamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Comparación de Medicamentos (Próximamente)
            </CardTitle>
            <CardDescription>Análisis de efectividad y efectos secundarios por medicamento.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>El módulo de análisis estadístico se encuentra en desarrollo.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MedicalLayout>
  )
}