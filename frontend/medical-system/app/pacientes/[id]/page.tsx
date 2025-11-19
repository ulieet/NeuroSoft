import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Edit, FileText, Calendar, Phone, Mail, MapPin, User } from "lucide-react"

type Historia = {
  id: number
  pacienteId: number
  fecha: string
  diagnostico: string
  estado: string
  medico: string
}

type Paciente = {
  id: number
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  sexo: string
  telefono: string
  email: string
  direccion: string
  obraSocial: string
  numeroAfiliado: string
  fechaRegistro: string
  observaciones: string
}

export default async function DetallePacientePage({ params }: { params: { id: string } }) {
  const resPacientes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/data/pacientes.json`)
  const pacientes: Paciente[] = await resPacientes.json()

  const resHistorias = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/data/historias.json`)
  const historias: Historia[] = await resHistorias.json()

  const patient = pacientes.find((p) => p.id === Number(params.id))
  const historiasPaciente = historias.filter((h) => h.pacienteId === Number(params.id))

  if (!patient) {
    return (
      <MedicalLayout currentPage="pacientes">
        <div className="p-8 text-center text-muted-foreground">Paciente no encontrado</div>
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
            <a href={`/pacientes/${patient.id}/editar`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Info principal */}
          <div className="lg:col-span-2 space-y-6">
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
                    <p>{patient.nombre} {patient.apellido}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">DNI</p>
                    <p className="font-mono">{patient.dni}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</p>
                    <p>{new Date(patient.fechaNacimiento).toLocaleDateString("es-AR")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sexo</p>
                    <p>{patient.sexo}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.telefono}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.direccion}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observaciones Médicas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{patient.observaciones}</p>
              </CardContent>
            </Card>

            {/* Historias clínicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Historias Clínicas
                </CardTitle>
                <CardDescription>{historiasPaciente.length} historias clínicas registradas</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Médico</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historiasPaciente.map((historia) => (
                      <TableRow key={historia.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(historia.fecha).toLocaleDateString("es-AR")}
                          </div>
                        </TableCell>
                        <TableCell>{historia.diagnostico}</TableCell>
                        <TableCell>
                          <Badge variant={historia.estado === "validada" ? "default" : "secondary"}>
                            {historia.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>{historia.medico}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/historias/${historia.id}`}>Ver Detalle</a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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

            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" asChild>
                  <a href="/historias/importar">
                    <FileText className="mr-2 h-4 w-4" />
                    Nueva Historia
                  </a>
                </Button>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <a href={`/pacientes/${patient.id}/editar`}>
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
