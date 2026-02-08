"use client"

import { useRouter } from "next/navigation"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PacienteListadoSelector } from '@/app/pacientes/components/paciente-selector'

export default function AnalisisPage() {
  const router = useRouter()

  return (
    <MedicalLayout currentPage="analisis">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#003e66]">Análisis de Progresión</h1>
          <p className="text-muted-foreground mt-2">
            Seleccione un paciente de la lista para ver su evolución clínica y estadísticas detalladas.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Búsqueda de Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <PacienteListadoSelector
              onSelectPaciente={(id) => router.push(`/analisis/detalle?id=${id}`)}
              selectedPacienteId={null}
            />
          </CardContent>
        </Card>
      </div>
    </MedicalLayout>
  )
}