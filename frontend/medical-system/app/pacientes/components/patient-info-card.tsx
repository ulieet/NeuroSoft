import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User } from "lucide-react"
import type { Patient } from "@/lib/data-store"

interface PatientInfoCardProps {
  patient: Patient
}

export function PatientInfoCard({ patient }: PatientInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Información Personal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Nombre Completo</p>
            <p className="text-base">
              {patient.nombre} {patient.apellido}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">DNI</p>
            <p className="text-base font-mono">{patient.dni}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</p>
            <p className="text-base">{new Date(patient.fechaNacimiento).toLocaleDateString("es-AR")}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Sexo</p>
            <p className="text-base">{patient.sexo}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
