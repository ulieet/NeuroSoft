"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Phone } from "lucide-react" // Quitamos Mail
import type { Paciente } from "@/lib/almacen-datos"

interface InfoPersonalProps {
  paciente: Paciente
}

export function InfoPersonal({ paciente }: InfoPersonalProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Información Personal y Contacto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Nombre Completo</p>
            <p className="text-base">
              {paciente.nombre} {paciente.apellido}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">DNI</p>
            <p className="text-base font-mono">{paciente.dni}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</p>
            <p className="text-base">{new Date(paciente.fechaNacimiento).toLocaleDateString("es-AR")}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Sexo</p>
            <p className="text-base">{paciente.sexo}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
            <p className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {paciente.telefono}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}