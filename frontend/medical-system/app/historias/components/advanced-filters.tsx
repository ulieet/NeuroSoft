"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import type { HistoryFilters } from "@/lib/data-store"
import { getMedicalHistories } from "@/lib/data-store"

interface AdvancedFiltersProps {
  filters: HistoryFilters
  onFiltersChange: (filters: HistoryFilters) => void
}

export function AdvancedFilters({ filters, onFiltersChange }: AdvancedFiltersProps) {
  const [availablePathologies, setAvailablePathologies] = useState<string[]>([])
  const [availableMedications, setAvailableMedications] = useState<string[]>([])
  const [selectedPathologies, setSelectedPathologies] = useState<string[]>([])
  const [selectedMedications, setSelectedMedications] = useState<string[]>([])

  useEffect(() => {
    const histories = getMedicalHistories()
    const pathologiesSet = new Set<string>()
    const medicationsSet = new Set<string>()

    histories.forEach((h) => {
      if (h.patologia) pathologiesSet.add(h.patologia)
      if (h.medicamentos) {
        h.medicamentos.forEach((m) => medicationsSet.add(m))
      }
    })

    setAvailablePathologies(Array.from(pathologiesSet).sort())
    setAvailableMedications(Array.from(medicationsSet).sort())
  }, [])

  const handlePathologySelect = (pathology: string) => {
    if (pathology === "todas") {
      setSelectedPathologies([])
      onFiltersChange({ ...filters, patologia: undefined })
      return
    }

    const newSelected = selectedPathologies.includes(pathology)
      ? selectedPathologies.filter((p) => p !== pathology)
      : [...selectedPathologies, pathology]

    setSelectedPathologies(newSelected)
    onFiltersChange({
      ...filters,
      patologia: newSelected.length > 0 ? newSelected.join("|") : undefined,
    })
  }

  const handleMedicationSelect = (medication: string) => {
    if (medication === "todos") {
      setSelectedMedications([])
      onFiltersChange({ ...filters, medicamento: undefined })
      return
    }

    const newSelected = selectedMedications.includes(medication)
      ? selectedMedications.filter((m) => m !== medication)
      : [...selectedMedications, medication]

    setSelectedMedications(newSelected)
    onFiltersChange({
      ...filters,
      medicamento: newSelected.length > 0 ? newSelected.join("|") : undefined,
    })
  }

  const removePathology = (pathology: string) => {
    const newSelected = selectedPathologies.filter((p) => p !== pathology)
    setSelectedPathologies(newSelected)
    onFiltersChange({
      ...filters,
      patologia: newSelected.length > 0 ? newSelected.join("|") : undefined,
    })
  }

  const removeMedication = (medication: string) => {
    const newSelected = selectedMedications.filter((m) => m !== medication)
    setSelectedMedications(newSelected)
    onFiltersChange({
      ...filters,
      medicamento: newSelected.length > 0 ? newSelected.join("|") : undefined,
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
      <div className="space-y-2 md:col-span-2 lg:col-span-3">
        <Label>Patologías</Label>
        <Select onValueChange={handlePathologySelect}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar patologías..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las patologías</SelectItem>
            {availablePathologies.map((pathology) => (
              <SelectItem key={pathology} value={pathology}>
                {pathology}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPathologies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedPathologies.map((pathology) => (
              <Badge key={pathology} variant="secondary" className="gap-1">
                {pathology}
                <button
                  onClick={() => removePathology(pathology)}
                  className="ml-1 hover:bg-muted rounded-full"
                  aria-label={`Remover ${pathology}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Fecha Desde</Label>
        <Input
          type="date"
          value={filters.fechaDesde || ""}
          onChange={(e) => onFiltersChange({ ...filters, fechaDesde: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-2">
        <Label>Fecha Hasta</Label>
        <Input
          type="date"
          value={filters.fechaHasta || ""}
          onChange={(e) => onFiltersChange({ ...filters, fechaHasta: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-2">
        <Label>Sexo</Label>
        <Select
          value={filters.sexo || "todos"}
          onValueChange={(value) => onFiltersChange({ ...filters, sexo: value === "todos" ? undefined : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Masculino">Masculino</SelectItem>
            <SelectItem value="Femenino">Femenino</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Edad Mínima</Label>
        <Input
          type="number"
          placeholder="Ej: 18"
          min="0"
          max="120"
          value={filters.edadMin || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, edadMin: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Edad Máxima</Label>
        <Input
          type="number"
          placeholder="Ej: 65"
          min="0"
          max="120"
          value={filters.edadMax || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, edadMax: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </div>

      <div className="space-y-2 md:col-span-2 lg:col-span-3">
        <Label>Medicamentos</Label>
        <Select onValueChange={handleMedicationSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar medicamentos..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los medicamentos</SelectItem>
            {availableMedications.map((medication) => (
              <SelectItem key={medication} value={medication}>
                {medication}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedMedications.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedMedications.map((medication) => (
              <Badge key={medication} variant="secondary" className="gap-1">
                {medication}
                <button
                  onClick={() => removeMedication(medication)}
                  className="ml-1 hover:bg-muted rounded-full"
                  aria-label={`Remover ${medication}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Estado</Label>
        <Select
          value={filters.estado || "todos"}
          onValueChange={(value) => onFiltersChange({ ...filters, estado: value === "todos" ? undefined : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="validada">Validada</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Criticidad</Label>
        <Select
          value={filters.criticidad || "todos"}
          onValueChange={(value) => onFiltersChange({ ...filters, criticidad: value === "todos" ? undefined : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="critico">Crítico</SelectItem>
            <SelectItem value="alto">Alto</SelectItem>
            <SelectItem value="medio">Medio</SelectItem>
            <SelectItem value="bajo">Bajo</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
