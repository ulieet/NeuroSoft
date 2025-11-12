"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, X, ArrowUp, ArrowDown } from "lucide-react"
import type { FiltrosPaciente } from "@/lib/almacen-datos" 

interface BarraBusquedaFiltrosProps {
  terminoBusqueda: string
  onTerminoBusquedaChange: (termino: string) => void
  
  filtros: FiltrosPaciente
  onFiltrosChange: (id: keyof FiltrosPaciente, value: string | number) => void
  
  obrasSocialesDisponibles: string[]
  
  onLimpiarFiltros: () => void

  // Props para ordenamiento
  sortOrder: "asc" | "desc"
  onSortOrderChange: (order: "asc" | "desc") => void
}

export function BarraBusquedaFiltros({
  terminoBusqueda,
  onTerminoBusquedaChange,
  filtros,
  onFiltrosChange,
  obrasSocialesDisponibles,
  onLimpiarFiltros,
  // Destructurar nuevas props
  sortOrder,
  onSortOrderChange
}: BarraBusquedaFiltrosProps) {
  
  const [mostrarFiltros, setMostrarFiltros] = useState(true); // MODIFICADO: Mostrar filtros por default
  
  const contadorFiltrosActivos = Object.values(filtros).some(v => v !== undefined && v !== 0);
  const SortIcon = sortOrder === "asc" ? ArrowUp : ArrowDown; // NUEVO: Icono dinámico
  const hayBusquedaActiva = contadorFiltrosActivos || terminoBusqueda !== "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buscar y Filtrar Pacientes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fila de Búsqueda y Botones */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, apellido o DNI..."
              className="pl-10"
              value={terminoBusqueda}
              onChange={(e) => onTerminoBusquedaChange(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
              <Filter className="mr-2 h-4 w-4" />
              {mostrarFiltros ? "Ocultar Filtros" : "Mostrar Filtros"}
            </Button>

            {/* --- NUEVO BOTÓN DE ORDENAR -- */}
            <Button
              variant="outline"
              onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
            >
              <SortIcon className="mr-2 h-4 w-4" />
              ({sortOrder === "asc" ? "A-Z" : "Z-A"})
            </Button>

            {hayBusquedaActiva && (
              <Button variant="ghost" onClick={onLimpiarFiltros}>
                <X className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
        
        {/* Sección de Filtros Avanzados (Ocultable) */}
        {mostrarFiltros && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            {/* Filtro Obra Social */}
            <div className="space-y-2">
              <Label htmlFor="filtro-obraSocial">Obra Social</Label>
              <Select
                value={filtros.obraSocial || "todos"}
                onValueChange={(v) => onFiltrosChange("obraSocial", v)}
              >
                <SelectTrigger id="filtro-obraSocial">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {obrasSocialesDisponibles.map(obra => (
                    <SelectItem key={obra} value={obra}>{obra}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Filtro Sexo */}
            <div className="space-y-2">
              <Label htmlFor="filtro-sexo">Sexo</Label>
              <Select
                value={filtros.sexo || "todos"}
                onValueChange={(v) => onFiltrosChange("sexo", v)}
              >
                <SelectTrigger id="filtro-sexo">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Femenino">Femenino</SelectItem>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Edad Mínima */}
            <div className="space-y-2">
              <Label htmlFor="filtro-edadMin">Edad Mínima</Label>
              <Input
                id="filtro-edadMin"
                type="number"
                placeholder="Ej: 18"
                min="0"
                value={filtros.edadMin || ""}
                onChange={(e) => onFiltrosChange("edadMin", e.target.value)}
              />
            </div>

            {/* Filtro Edad Máxima */}
            <div className="space-y-2">
              <Label htmlFor="filtro-edadMax">Edad Máxima</Label>
              <Input
                id="filtro-edadMax"
                type="number"
                placeholder="Ej: 65"
                min="0"
                value={filtros.edadMax || ""}
                onChange={(e) => onFiltrosChange("edadMax", e.target.value)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}