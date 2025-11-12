"use client"

import { useState, useEffect, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { type FiltrosHistoria, obtenerHistoriasClinicas } from "@/lib/almacen-datos"

interface FiltrosAvanzadosProps {
  filtros: FiltrosHistoria
  onFiltrosChange: (id: keyof FiltrosHistoria, value: string | number) => void
}

// Helper para generar el desplegable de EDSS
const generarOpcionesEDSS = () => {
  const opciones = [];
  for (let i = 0; i <= 10; i += 0.5) {
    opciones.push({ valor: i, etiqueta: i.toFixed(1) });
  }
  return opciones;
}
// Usamos useMemo para que esto no se recalcule en cada render
const opcionesEDSS = generarOpcionesEDSS();


export function FiltrosAvanzados({ filtros, onFiltrosChange }: FiltrosAvanzadosProps) {
  // Estado local para los dropdowns
  const [patologiasDisponibles, setPatologiasDisponibles] = useState<string[]>([])
  const [medicamentosDisponibles, setMedicamentosDisponibles] = useState<string[]>([])
  
  // Estado local para manejar los badges de selección múltiple
  const [patologiasSeleccionadas, setPatologiasSeleccionadas] = useState<string[]>([])
  const [medicamentosSeleccionados, setMedicamentosSeleccionados] = useState<string[]>([])

  useEffect(() => {
    const historias = obtenerHistoriasClinicas()
    const setPatologias = new Set<string>()
    const setMedicamentos = new Set<string>()

    historias.forEach((h) => {
      if (h.patologia) setPatologias.add(h.patologia)
      if (h.medicamentos) {
        h.medicamentos.forEach((m) => setMedicamentos.add(m.droga))
      }
    })
    setPatologiasDisponibles(Array.from(setPatologias).sort())
    setMedicamentosDisponibles(Array.from(setMedicamentos).sort())
    
    // Sincronizar estado local con los filtros que vienen de la página
    setPatologiasSeleccionadas(filtros.patologia?.split("|") || [])
    setMedicamentosSeleccionados(filtros.medicamento?.split("|") || [])

  }, [filtros.patologia, filtros.medicamento])

  
  // --- Handlers ---

  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    onFiltrosChange(id as keyof FiltrosHistoria, value);
  }

  const manejarCambioSelect = (id: keyof FiltrosHistoria, value: string) => {
    onFiltrosChange(id, value);
  }

  const manejarSeleccionMultiple = (
    id: "patologia" | "medicamento", 
    value: string, 
  ) => {
    const esTodos = value === "todos"
    const seleccionActual = id === 'patologia' ? patologiasSeleccionadas : medicamentosSeleccionados;
    const setSeleccionLocal = id === 'patologia' ? setPatologiasSeleccionadas : setMedicamentosSeleccionados;
    let nuevasSeleccionadas: string[] = []
    if (!esTodos) {
      nuevasSeleccionadas = seleccionActual.includes(value)
        ? seleccionActual.filter((p) => p !== value)
        : [...seleccionActual, value]
    }
    setSeleccionLocal(nuevasSeleccionadas)
    onFiltrosChange(id, nuevasSeleccionadas.length > 0 ? nuevasSeleccionadas.join("|") : "");
  }
  
  const removerBadge = (
    id: "patologia" | "medicamento",
    value: string
  ) => {
    const seleccionActual = id === 'patologia' ? patologiasSeleccionadas : medicamentosSeleccionados;
    const setSeleccionLocal = id === 'patologia' ? setPatologiasSeleccionadas : setMedicamentosSeleccionados;
    const nuevasSeleccionadas = seleccionActual.filter((p) => p !== value)
    setSeleccionLocal(nuevasSeleccionadas)
    onFiltrosChange(id, nuevasSeleccionadas.length > 0 ? nuevasSeleccionadas.join("|") : "");
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
      
      {/* --- FILTROS DE HISTORIA (Patología y Medicamento) --- */}
      <div className="space-y-2 md:col-span-2">
        <Label>Patologías</Label>
        <Select onValueChange={(v) => manejarSeleccionMultiple("patologia", v)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar patologías..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las patologías</SelectItem>
            {patologiasDisponibles.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {patologiasSeleccionadas.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {patologiasSeleccionadas.map((p) => (
              <Badge key={p} variant="secondary" className="gap-1">
                {p}
                <button onClick={() => removerBadge("patologia", p)} className="ml-1 hover:bg-muted rounded-full" aria-label={`Remover ${p}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      <div className="space-y-2 md:col-span-2">
        <Label>Medicamentos</Label>
        <Select onValueChange={(v) => manejarSeleccionMultiple("medicamento", v)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar medicamentos..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los medicamentos</SelectItem>
            {medicamentosDisponibles.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
         {medicamentosSeleccionados.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {medicamentosSeleccionados.map((m) => (
              <Badge key={m} variant="secondary" className="gap-1">
                {m}
                <button onClick={() => removerBadge("medicamento", m)} className="ml-1 hover:bg-muted rounded-full" aria-label={`Remover ${m}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      {/* --- FILTROS DE PACIENTE (Edad Actual y Sexo) --- */}
      <div className="space-y-2">
        <Label htmlFor="sexo">Sexo (Paciente)</Label>
        <Select value={filtros.sexo || "todos"} onValueChange={(v) => manejarCambioSelect("sexo", v)}>
          <SelectTrigger id="sexo"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Masculino">Masculino</SelectItem>
            <SelectItem value="Femenino">Femenino</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* --- CAMBIO: Input único para Edad Actual --- */}
      <div className="space-y-2">
        <Label htmlFor="edad">Edad Actual (años)</Label>
        <Input id="edad" type="number" placeholder="Ej: 42" min="0" value={filtros.edad || ""} onChange={manejarCambioInput} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="estado">Estado</Label>
        <Select value={filtros.estado || "todos"} onValueChange={(v) => manejarCambioSelect("estado", v)}>
          <SelectTrigger id="estado"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="validada">Validada</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="criticidad">Criticidad</Label>
        <Select value={filtros.criticidad || "todos"} onValueChange={(v) => manejarCambioSelect("criticidad", v)}>
          <SelectTrigger id="criticidad"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="critico">Crítico</SelectItem>
            <SelectItem value="alto">Alto</SelectItem>
            <SelectItem value="medio">Medio</SelectItem>
            <SelectItem value="bajo">Bajo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* --- FILTROS DE ENFERMEDAD (Valor único) --- */}
      
      <div className="space-y-2">
        <Label htmlFor="edadInicioEnfermedad">Edad Inicio Síntomas (años)</Label>
        <Input id="edadInicioEnfermedad" type="number" placeholder="Ej: 30" min="0" value={filtros.edadInicioEnfermedad || ""} onChange={manejarCambioInput} />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="tiempoEvolucion">Años de Evolución</Label>
        <Input id="tiempoEvolucion" type="number" placeholder="Ej: 5" min="0" value={filtros.tiempoEvolucion || ""} onChange={manejarCambioInput} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="escalaEDSS">Grado EDSS (desplegable)</Label>
        <Select
          value={filtros.escalaEDSS !== undefined ? String(filtros.escalaEDSS) : "todos"}
          onValueChange={(v) => manejarCambioSelect("escalaEDSS", v)}
        >
          <SelectTrigger id="escalaEDSS">
            <SelectValue placeholder="Seleccionar EDSS" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {opcionesEDSS.map(op => (
              <SelectItem key={op.valor} value={String(op.valor)}>
                {op.etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

    </div>
  )
}