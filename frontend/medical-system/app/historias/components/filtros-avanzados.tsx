"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

export interface FiltrosHistoria {
  texto?: string
  estado?: string
  patologia?: string
  criticidad?: string
  edad?: string
  fecha?: string
  medicamento?: string
  escalaEDSS?: string
  edadInicioEnfermedad?: string
  tiempoEvolucion?: string
}

interface FiltrosAvanzadosProps {
  filtros: FiltrosHistoria
  onFiltrosChange: (id: keyof FiltrosHistoria, value: string | number) => void
  historias: any[] 
}

export function FiltrosAvanzados({ filtros, onFiltrosChange, historias = [] }: FiltrosAvanzadosProps) {
  const [patologiasDisponibles, setPatologiasDisponibles] = useState<string[]>([])
  const [patologiasSeleccionadas, setPatologiasSeleccionadas] = useState<string[]>([])

  useEffect(() => {
    const setPatologias = new Set<string>()

    historias.forEach((h) => {
      const pat = h.patologia || h.diagnostico
      if (pat) setPatologias.add(pat)
    })
    setPatologiasDisponibles(Array.from(setPatologias).sort())
    
    setPatologiasSeleccionadas(filtros.patologia?.split("|").filter(Boolean) || [])
  }, [historias, filtros.patologia])

  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltrosChange(e.target.id as keyof FiltrosHistoria, e.target.value);
  }

  const manejarCambioSelect = (id: keyof FiltrosHistoria, value: string) => {
    onFiltrosChange(id, value);
  }

  const manejarSeleccionMultiple = (id: "patologia", value: string) => {
    if (!value) return;
    const esTodos = value === "todos"
    
    let nuevas: string[] = [] 
    
    if (!esTodos) {
      nuevas = patologiasSeleccionadas.includes(value) 
        ? patologiasSeleccionadas.filter(p => p !== value) 
        : [...patologiasSeleccionadas, value]
    }
    
    setPatologiasSeleccionadas(nuevas)
    onFiltrosChange(id, nuevas.length > 0 ? nuevas.join("|") : "");
  }

  const removerBadge = (id: "patologia", value: string) => {
    const nuevas = patologiasSeleccionadas.filter(p => p !== value)
    setPatologiasSeleccionadas(nuevas)
    onFiltrosChange(id, nuevas.length > 0 ? nuevas.join("|") : "");
  }

  return (
    <div className="p-4 border rounded-lg bg-muted/20 animate-in fade-in slide-in-from-top-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="space-y-2">
            <Label className="text-sm font-medium">Patologías</Label>
            <Select value={""} onValueChange={(v) => manejarSeleccionMultiple("patologia", v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar patología..." /></SelectTrigger>
            <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {patologiasDisponibles.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
            </Select>
            {patologiasSeleccionadas.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                  {patologiasSeleccionadas.map(p => (
                    <Badge key={p} variant="secondary" className="text-xs h-6 px-2">
                        {p}
                        <X 
                            className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive" 
                            onClick={() => removerBadge("patologia", p)}
                        />
                    </Badge>
                  ))}
              </div>
            )}
        </div>

        <div className="space-y-2">
            <Label className="text-sm font-medium" htmlFor="criticidad">Criticidad</Label>
            <Select value={filtros.criticidad || "todos"} onValueChange={(v) => manejarCambioSelect("criticidad", v)}>
            <SelectTrigger id="criticidad" className="h-9"><SelectValue placeholder="Cualquiera" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="todos">Cualquiera</SelectItem>
                <SelectItem value="critico">Crítico</SelectItem>
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="medio">Medio</SelectItem>
                <SelectItem value="bajo">Bajo</SelectItem>
            </SelectContent>
            </Select>
        </div>
        
        <div className="space-y-2">
             <Label className="text-sm font-medium" htmlFor="edad">Edad Paciente</Label>
             <Input 
                id="edad" 
                type="number" 
                className="h-9" 
                placeholder="Ej: 45" 
                value={filtros.edad || ""} 
                onChange={manejarCambioInput} 
             />
             <p className="text-[10px] text-muted-foreground">Filtra por edad exacta.</p>
        </div>

      </div>
    </div>
  )
}