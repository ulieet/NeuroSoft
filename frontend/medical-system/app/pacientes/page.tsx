"use client"

import { useEffect, useState } from "react"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Eye, Edit, Phone, Calendar, RefreshCw } from "lucide-react"
import { getPatients, getMedicalHistoriesByPatientId, initializeSampleData, type Patient } from "@/lib/data-store"

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = () => {
    setIsLoading(true)
    initializeSampleData()
    const data = getPatients()
    setPatients(data)
    setIsLoading(false)
  }

  const filteredPatients = patients.filter((patient) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      patient.nombre.toLowerCase().includes(searchLower) ||
      patient.apellido.toLowerCase().includes(searchLower) ||
      patient.dni.includes(searchTerm)
    )
  })

  const getHistoryCount = (patientId: number) => {
    return getMedicalHistoriesByPatientId(patientId).length
  }

  return (
    <MedicalLayout currentPage="pacientes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-balance">Gestión de Pacientes</h1>
            <p className="text-muted-foreground">Administra la información de todos los pacientes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadPatients} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refrescar
            </Button>
            <Button asChild>
              <a href="/pacientes/nuevo">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Paciente
              </a>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, apellido o DNI..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pacientes</CardTitle>
            <CardDescription>
              {filteredPatients.length} pacientes {searchTerm && "encontrados"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apellido y Nombre</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Obra Social</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Historias</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {searchTerm ? "No se encontraron pacientes" : "No hay pacientes registrados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {patient.apellido}, {patient.nombre}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(patient.fechaNacimiento).toLocaleDateString("es-AR")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{patient.dni}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{patient.obraSocial}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {patient.telefono}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getHistoryCount(patient.id)} historias</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/pacientes/detalle?id=${patient.id}`}>
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/pacientes/editar?id=${patient.id}`}>
                                <Edit className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MedicalLayout>
  )
}
