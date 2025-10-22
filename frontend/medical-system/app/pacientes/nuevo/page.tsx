import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"

export default function NuevoPacientePage() {
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
          <div>
            <h1 className="text-2xl font-bold text-balance">Registrar Nuevo Paciente</h1>
            <p className="text-muted-foreground">Completa la información del paciente</p>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Datos básicos del paciente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input id="nombre" placeholder="Ingrese el nombre" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido">Apellido *</Label>
                    <Input id="apellido" placeholder="Ingrese el apellido" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dni">DNI *</Label>
                    <Input id="dni" placeholder="12.345.678" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fechaNacimiento">Fecha de Nacimiento *</Label>
                    <Input id="fechaNacimiento" type="date" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sexo">Sexo *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el sexo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información de Contacto</CardTitle>
                <CardDescription>Datos de contacto y ubicación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono *</Label>
                    <Input id="telefono" placeholder="11-2345-6789" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="paciente@email.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input id="direccion" placeholder="Calle, número, ciudad" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información Médica</CardTitle>
                <CardDescription>Datos relacionados con la atención médica</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="obraSocial">Obra Social *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione la obra social" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="osde">OSDE</SelectItem>
                      <SelectItem value="swiss">Swiss Medical</SelectItem>
                      <SelectItem value="galeno">Galeno</SelectItem>
                      <SelectItem value="medicus">Medicus</SelectItem>
                      <SelectItem value="particular">Particular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeroAfiliado">Número de Afiliado</Label>
                  <Input id="numeroAfiliado" placeholder="Número de afiliado" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea id="observaciones" placeholder="Notas adicionales sobre el paciente..." rows={4} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Paciente
                </Button>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <a href="/pacientes">Cancelar</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MedicalLayout>
  )
}
