"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  Upload,
  Eye,
  Edit,
  FileText,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  RefreshCw,
  Filter,
  X,
} from "lucide-react"
import {
  getMedicalHistories,
  getPatients,
  initializeSampleData,
  importFromJSON,
  exportToJSON,
  filterMedicalHistories,
  type MedicalHistory,
  type Patient,
  type HistoryFilters,
} from "@/lib/data-store"
import { AdvancedFilters } from "./components/advanced-filters"

const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case "validada":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Validada
        </Badge>
      )
    case "pendiente":
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Pendiente
        </Badge>
      )
    case "error":
      return (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      )
    default:
      return <Badge variant="outline">{estado}</Badge>
  }
}

const getCriticidadBadge = (nivel?: string) => {
  if (!nivel) return null

  switch (nivel) {
    case "critico":
      return <Badge variant="destructive">Crítico</Badge>
    case "alto":
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Alto</Badge>
    case "medio":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medio</Badge>
    case "bajo":
      return <Badge variant="outline">Bajo</Badge>
    default:
      return null
  }
}

export default function HistoriasPage() {
  const [historias, setHistorias] = useState<MedicalHistory[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState<HistoryFilters>({})

  const loadData = () => {
    initializeSampleData()
    setHistorias(getMedicalHistories())
    setPatients(getPatients())
  }

  useEffect(() => {
    loadData()
  }, [])

  const getPatientName = (pacienteId: number) => {
    const patient = patients.find((p) => p.id === pacienteId)
    return patient ? `${patient.apellido}, ${patient.nombre}` : "Desconocido"
  }

  const getPatientDNI = (pacienteId: number) => {
    const patient = patients.find((p) => p.id === pacienteId)
    return patient?.dni || "N/A"
  }

  const filteredHistorias = (() => {
    let results = historias

    // Apply advanced filters first
    if (Object.keys(filters).length > 0) {
      const processedFilters = { ...filters }

      if (filters.patologia?.includes("|")) {
        const pathologies = filters.patologia.split("|")
        results = results.filter((h) =>
          pathologies.some(
            (p) =>
              h.patologia?.toLowerCase().includes(p.toLowerCase()) ||
              h.diagnostico.toLowerCase().includes(p.toLowerCase()),
          ),
        )
        delete processedFilters.patologia
      }

      if (filters.medicamento?.includes("|")) {
        const medications = filters.medicamento.split("|")
        results = results.filter((h) =>
          h.medicamentos?.some((m) => medications.some((med) => m.toLowerCase().includes(med.toLowerCase()))),
        )
        delete processedFilters.medicamento
      }

      results = filterMedicalHistories(processedFilters)
    }

    // Then apply search term
    if (searchTerm) {
      results = results.filter((historia) => {
        const patientName = getPatientName(historia.pacienteId).toLowerCase()
        const patientDNI = getPatientDNI(historia.pacienteId)
        const diagnostico = historia.diagnostico.toLowerCase()
        const patologia = historia.patologia?.toLowerCase() || ""
        const search = searchTerm.toLowerCase()

        return (
          patientName.includes(search) ||
          patientDNI.includes(search) ||
          diagnostico.includes(search) ||
          patologia.includes(search)
        )
      })
    }

    return results
  })()

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      await importFromJSON(file)
      loadData()
      alert("Datos importados correctamente")
    } catch (error) {
      alert("Error al importar el archivo JSON")
    } finally {
      setIsLoading(false)
      event.target.value = ""
    }
  }

  const handleExport = () => {
    const jsonData = exportToJSON()
    const blob = new Blob([jsonData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `historias-clinicas-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRefresh = () => {
    loadData()
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm("")
  }

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => filters[key as keyof HistoryFilters] !== undefined,
  ).length

  return (
    <MedicalLayout currentPage="historias">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-balance">Historias Clínicas</h1>
            <p className="text-muted-foreground">Gestiona las historias clínicas importadas y validadas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refrescar
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <label htmlFor="import-json">
              <Button asChild disabled={isLoading}>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar JSON
                </span>
              </Button>
              <input
                id="import-json"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
                disabled={isLoading}
              />
            </label>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Historias</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{historias.length}</div>
              <p className="text-xs text-muted-foreground">Registradas en el sistema</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {historias.filter((h) => h.estado === "pendiente").length}
              </div>
              <p className="text-xs text-muted-foreground">Requieren validación</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {historias.filter((h) => h.estado === "validada").length}
              </div>
              <p className="text-xs text-muted-foreground">Completadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Buscar y Filtrar Historias</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="mr-2 h-4 w-4" />
                Filtros Avanzados
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, diagnóstico, patología o DNI..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {activeFiltersCount > 0 && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpiar Filtros
                </Button>
              )}
            </div>

            {showFilters && <AdvancedFilters filters={filters} onFiltersChange={setFilters} />}
          </CardContent>
        </Card>

        {/* Histories Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Historias Clínicas</CardTitle>
            <CardDescription>
              {filteredHistorias.length === historias.length
                ? "Todas las historias clínicas importadas y procesadas"
                : `Mostrando ${filteredHistorias.length} de ${historias.length} historias`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredHistorias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || activeFiltersCount > 0
                  ? "No se encontraron historias clínicas con los criterios seleccionados"
                  : "No hay historias clínicas registradas"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Fecha Consulta</TableHead>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Criticidad</TableHead>
                      <TableHead>Médico</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistorias.map((historia) => (
                      <TableRow key={historia.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{getPatientName(historia.pacienteId)}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              DNI: {getPatientDNI(historia.pacienteId)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(historia.fecha).toLocaleDateString("es-AR")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="truncate font-medium" title={historia.diagnostico}>
                              {historia.diagnostico}
                            </div>
                            {historia.patologia && (
                              <div className="text-xs text-muted-foreground truncate">{historia.patologia}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getEstadoBadge(historia.estado)}</TableCell>
                        <TableCell>{getCriticidadBadge(historia.nivelCriticidad)}</TableCell>
                        <TableCell>{historia.medico}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/historias/detalle?id=${historia.id}`}>
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            {historia.estado === "pendiente" && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`/historias/validar?id=${historia.id}`}>
                                  <Edit className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MedicalLayout>
  )
}
