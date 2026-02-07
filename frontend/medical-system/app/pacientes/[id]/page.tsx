"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, FileText, Plus, RefreshCw, Trash, User, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Importamos el nuevo servicio
import { 
  getPaciente, 
  getHistoriasDePaciente, 
  type PacienteBackend, 
  type HistoriaBackend 
} from "@/lib/api-pacientes"

export default function PaginaDetallePaciente() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // EL CAMBIO CLAVE: ID es string, no number
  const patientId = searchParams.get("id") 

  const [paciente, setPaciente] = useState<PacienteBackend | null>(null)
  const [historias, setHistorias] = useState<HistoriaBackend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (patientId) {
      cargarDatos()
    }
  }, [patientId])

  const cargarDatos = async () => {
    setLoading(true)
    if (!patientId) return;

    // 1. Cargar Paciente
    const dataPaciente = await getPaciente(patientId)
    setPaciente(dataPaciente)

    // 2. Cargar sus Historias
    if (dataPaciente) {
        const dataHistorias = await getHistoriasDePaciente(patientId)
        setHistorias(dataHistorias)
    }
    setLoading(false)
  }

  if (loading) {
     return (
       <MedicalLayout currentPage="pacientes">
         <div className="flex h-96 items-center justify-center">
           <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
       </MedicalLayout>
     )
  }

  if (!paciente) {
    return (
      <MedicalLayout currentPage="pacientes">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <h2 className="text-xl font-semibold">Paciente no encontrado</h2>
          <Button onClick={() => router.push("/pacientes")}>Volver al listado</Button>
        </div>
      </MedicalLayout>
    )
  }

  return (
    <MedicalLayout currentPage="pacientes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{paciente.nombre}</h1>
            <p className="text-muted-foreground">DNI: {paciente.dni}</p>
          </div>
          <Button variant="outline" onClick={cargarDatos}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Columna Izquierda: Datos Personales */}
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5"/> Datos Personales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                    <span className="text-sm text-muted-foreground block">Fecha de Nacimiento</span>
                    <span className="font-medium">{paciente.fecha_nacimiento || "-"}</span>
                </div>
                <div>
                    <span className="text-sm text-muted-foreground block">Obra Social</span>
                    <Badge variant="secondary" className="mt-1">{paciente.obra_social || "N/A"}</Badge>
                </div>
                <div>
                    <span className="text-sm text-muted-foreground block">Nro Afiliado</span>
                    <span className="font-mono text-sm">{paciente.nro_afiliado || "-"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha: Historias Clínicas */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5"/> Historias Clínicas
                </CardTitle>
                <CardDescription>{historias.length} documentos registrados</CardDescription>
              </CardHeader>
              <CardContent>
                {historias.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No hay historias asociadas a este paciente.</p>
                        <Button variant="link" onClick={() => router.push("/historias/importar")}>
                            Importar nueva historia
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Diagnóstico</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Ver</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historias.map(h => (
                                <TableRow key={h.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground"/>
                                            {h.fecha_consulta || "S/D"}
                                        </div>
                                    </TableCell>
                                    <TableCell>{h.diagnostico || "Sin Dx"}</TableCell>
                                    <TableCell>
                                        <Badge variant={h.estado === "validada" ? "default" : "outline"}>
                                            {h.estado}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => router.push(`/historias/${h.id}`)}>
                                            Abrir
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </MedicalLayout>
  )
}