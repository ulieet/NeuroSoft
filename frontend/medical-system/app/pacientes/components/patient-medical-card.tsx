import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Patient } from "@/lib/data-store"

interface PatientMedicalCardProps {
  patient: Patient
}

export function PatientMedicalCard({ patient }: PatientMedicalCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Médica</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Obra Social</p>
          <Badge variant="outline" className="mt-1">
            {patient.obraSocial}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Número de Afiliado</p>
          <p className="text-sm font-mono">{patient.numeroAfiliado}</p>
        </div>
      </CardContent>
    </Card>
  )
}
