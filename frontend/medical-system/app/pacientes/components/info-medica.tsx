"use client" // <-- REQUERIDO

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Paciente } from "@/lib/almacen-datos"

interface InfoMedicaProps {
  paciente: Paciente
}

export function InfoMedica({ paciente }: InfoMedicaProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Médica</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-md font-medium text-muted-foreground">Obra Social</p>
          <Badge variant="outline" className="mt-1 text-md">
            {paciente.obraSocial}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Número de Afiliado</p>
          <p className="text-lg font-mono ">{paciente.numeroAfiliado || "N/A"}</p>
        </div>
      </CardContent>
    </Card>
  )
}