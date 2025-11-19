// frontend/medical-system/components/shared/PacienteListadoSelector.tsx

"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, RefreshCw, Phone, Eye, Edit } from "lucide-react" 
import { cn } from "@/lib/utils" 

// Asumiendo que estas imports están disponibles:
import {
  obtenerPacientes,
  obtenerHistoriasPorPacienteId,
  inicializarDatosDeEjemplo,
  obtenerEdadPaciente,
  type Paciente,
  type FiltrosPaciente, 
} from "@/lib/almacen-datos"

import { BarraBusquedaFiltros } from "@/app/pacientes/components/filtros"

interface PacienteListadoSelectorProps {
    onSelectPaciente: (pacienteId: number) => void;
    selectedPacienteId: number | null; 
}

export const PacienteListadoSelector: React.FC<PacienteListadoSelectorProps> = ({ 
    onSelectPaciente, 
    selectedPacienteId
}) => {
    const isSelectionMode = true; 

    // --- ESTADOS DE LA LÓGICA DE PACIENTES ---
    const [pacientes, setPacientes] = useState<Paciente[]>([])
    const [estaCargando, setEstaCargando] = useState(false)
    const [obrasSocialesDisponibles, setObrasSocialesDisponibles] = useState<string[]>([])
    
    const [terminoBusqueda, setTerminoBusqueda] = useState("")
    const [filtros, setFiltros] = useState<FiltrosPaciente>({})
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc") 

    // --- CARGA DE DATOS ---
    useEffect(() => {
        cargarPacientes()
    }, [])

    const cargarPacientes = () => {
        setEstaCargando(true)
        inicializarDatosDeEjemplo() 
        const data = obtenerPacientes()
        setPacientes(data)

        const obras = [...new Set(data.map(p => p.obraSocial).filter(Boolean))].sort()
        setObrasSocialesDisponibles(obras)
        
        setEstaCargando(false)
    }

    // --- FILTRADO Y ORDENAMIENTO (useMemo) ---
    const pacientesFiltrados = useMemo(() => {
        let pacientesFiltrados = pacientes.filter(paciente => {
            if (filtros.obraSocial && paciente.obraSocial !== filtros.obraSocial) return false
            if (filtros.sexo && paciente.sexo !== filtros.sexo) return false
            if (filtros.edadMin || filtros.edadMax) {
                const edad = obtenerEdadPaciente(paciente.fechaNacimiento)
                if (filtros.edadMin && edad < filtros.edadMin) return false
                if (filtros.edadMax && edad > filtros.edadMax) return false
            }

            if (terminoBusqueda) {
                const busqueda = terminoBusqueda.toLowerCase()
                const nombreCompleto = `${paciente.apellido}, ${paciente.nombre}`.toLowerCase()
                const dni = paciente.dni.toString()
                if (
                    !nombreCompleto.includes(busqueda) &&
                    !dni.includes(terminoBusqueda)
                ) {
                    return false
                }
            }
            return true
        });

        pacientesFiltrados.sort((a, b) => {
            const nombreA = `${a.apellido}, ${a.nombre}`.toLowerCase();
            const nombreB = `${b.apellido}, ${b.nombre}`.toLowerCase();
            
            if (nombreA < nombreB) {
                return sortOrder === "asc" ? -1 : 1;
            }
            if (nombreA > nombreB) {
                return sortOrder === "asc" ? 1 : -1;
            }
            return 0;
        });
        
        return pacientesFiltrados;

    }, [pacientes, filtros, terminoBusqueda, sortOrder]);

    // --- MANEJADORES ---
    const manejarCambioFiltro = (id: keyof FiltrosPaciente, value: string | number) => {
        const valorLimpio = (value === "todos" || value === "") ? undefined : String(value);

        let valorFinal: string | number | undefined = valorLimpio;
        if (id.startsWith("edad")) {
            const valorNum = Number(valorLimpio);
            valorFinal = (valorNum && valorNum > 0) ? valorNum : undefined;
        }
        
        setFiltros(prev => ({ ...prev, [id]: valorFinal }))
    }

    const limpiarFiltros = () => {
        setFiltros({})
        setTerminoBusqueda("")
    }

    const obtenerConteoHistorias = (pacienteId: number) => {
        return obtenerHistoriasPorPacienteId(pacienteId).length
    }

    const hayFiltrosActivos = Object.values(filtros).some(v => v !== undefined) || terminoBusqueda !== "";


    return (
        <div className="space-y-6">
            
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-muted-foreground">
                    Búsqueda y Selección de Paciente
                </h3>
                <Button variant="outline" onClick={cargarPacientes} disabled={estaCargando}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${estaCargando ? "animate-spin" : ""}`} />
                    Refrescar
                </Button>
            </div>
            
            {/* Componente de Búsqueda y Filtros */}
            <BarraBusquedaFiltros
                terminoBusqueda={terminoBusqueda}
                onTerminoBusquedaChange={setTerminoBusqueda}
                filtros={filtros}
                onFiltrosChange={manejarCambioFiltro}
                obrasSocialesDisponibles={obrasSocialesDisponibles}
                onLimpiarFiltros={limpiarFiltros}

                // Props para el ordenamiento
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
            />

            {/* Tabla de Pacientes */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Pacientes</CardTitle>
                    <CardDescription>
                        {pacientesFiltrados.length} pacientes encontrados. **Haga click en la fila para seleccionar.**
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Apellido y Nombre (DNI)</TableHead>
                                    <TableHead>Obra Social</TableHead>
                                    <TableHead className="text-right">Historias</TableHead> 
                                    <TableHead className="text-right">Selección</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {estaCargando ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8">Cargando...</TableCell></TableRow>
                                ) : pacientesFiltrados.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            {hayFiltrosActivos ? "No se encontraron pacientes con esos filtros" : "No hay pacientes registrados"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pacientesFiltrados.map((paciente) => (
                                        <TableRow 
                                            key={paciente.id}
                                            onClick={() => isSelectionMode && onSelectPaciente(paciente.id)}
                                            className={cn(
                                                "cursor-pointer", // Siempre cursor-pointer en modo selección
                                                selectedPacienteId === paciente.id && "bg-secondary" 
                                            )}
                                        >
                                            <TableCell>
                                                <div className="font-medium">
                                                    {paciente.apellido}, {paciente.nombre}
                                                </div>
                                                {/* DNI integrado en la misma celda, sin ícono */}
                                                <div className="text-sm text-muted-foreground font-mono">
                                                    DNI: {paciente.dni}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{paciente.obraSocial}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="secondary">{obtenerConteoHistorias(paciente.id)} historias</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {/* Muestra el indicador de selección */}
                                                {selectedPacienteId === paciente.id && (
                                                    <span className="text-primary font-medium text-xs">Seleccionado</span>
                                                )}
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
    );
};