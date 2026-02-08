"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X, Filter, ArrowUpDown } from "lucide-react"
import { type FiltrosPaciente } from "@/hooks/use-pacientes-listado"

interface BarraBusquedaFiltrosProps {
  terminoBusqueda: string
  onTerminoBusquedaChange: (value: string) => void
  filtros: FiltrosPaciente
  onFiltrosChange: (id: keyof FiltrosPaciente, value: string) => void
  obrasSocialesDisponibles: string[]
  onLimpiarFiltros: () => void
  sortOrder: "asc" | "desc"
  onSortOrderChange: (value: "asc" | "desc") => void
}

export function BarraBusquedaFiltros({
  terminoBusqueda,
  onTerminoBusquedaChange,
  filtros,
  onFiltrosChange,
  obrasSocialesDisponibles,
  onLimpiarFiltros,
  sortOrder,
  onSortOrderChange
}: BarraBusquedaFiltrosProps) {
  return (
    <div className="p-4 flex flex-col md:flex-row gap-3">
      
      {/* BUSCADOR */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por paciente o DNI..."
          value={terminoBusqueda}
          onChange={(e) => onTerminoBusquedaChange(e.target.value)}
          className="pl-9 h-10 border-slate-200 focus-visible:ring-[#003e66]"
        />
      </div>

      {/* SELECT OBRA SOCIAL AZUL MARINO */}
      <div className="w-full md:w-64">
        <Select
          value={filtros.obra_social}
          onValueChange={(val) => onFiltrosChange("obra_social", val)}
        >
          <SelectTrigger className="h-10 border-slate-200 text-slate-600 focus:ring-[#003e66]">
            <div className="flex items-center gap-2">
               <Filter className="h-4 w-4 text-[#003e66]" />
               <SelectValue placeholder="Obra Social" />
            </div>
          </SelectTrigger>
          <SelectContent className="border-slate-200 shadow-xl">
            <SelectItem value="todas" className="text-[#003e66] font-semibold border-b border-slate-100 rounded-none mb-1">
              Todas las Obras Sociales
            </SelectItem>
            {obrasSocialesDisponibles.sort().map((os) => (
              <SelectItem key={os} value={os}>{os}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* BOTONES AUXILIARES */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="icon"
          className="h-10 w-10 border-slate-200 text-slate-400 hover:text-[#003e66]"
          onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
        
        {(terminoBusqueda || filtros.obra_social !== "todas") && (
          <Button variant="ghost" size="icon" onClick={onLimpiarFiltros} className="h-10 w-10 text-slate-400 hover:text-red-500">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}