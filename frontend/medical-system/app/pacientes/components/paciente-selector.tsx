// frontend/medical-system/app/pacientes/components/paciente-selector.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw } from "lucide-react" 
import { cn } from "@/lib/utils" 

import { BarraBusquedaFiltros } from "@/app/pacientes/components/filtros"
import { usePacientesListado } from "@/hooks/use-pacientes-listado"

interface PacienteListadoSelectorProps {
    onSelectPaciente: (pacienteId: number) => void;
    selectedPacienteId: number | null; 
}

export const PacienteListadoSelector: React.FC<PacienteListadoSelectorProps> = ({ 
    onSelectPaciente, 
    selectedPacienteId
}) => {
    const {
        pacientesFiltrados,
        estaCargando,
        obrasSocialesDisponibles,
        terminoBusqueda,
        setTerminoBusqueda,
        filtros,
        manejarCambioFiltro,
        sortOrder,
        setSortOrder,
        limpiarFiltros,
        cargarPacientes,
        obtenerConteoHistorias,
        hayFiltrosActivos
    } = usePacientesListado()

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
            
            <BarraBusquedaFiltros
                terminoBusqueda={terminoBusqueda}
                onTerminoBusquedaChange={setTerminoBusqueda}
                filtros={filtros}
                onFiltrosChange={manejarCambioFiltro}
                obrasSocialesDisponibles={obrasSocialesDisponibles}
                onLimpiarFiltros={limpiarFiltros}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
            />

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
                                    {/* Columna "Selección" removida */}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {estaCargando ? (
                                    <TableRow><TableCell colSpan={3} className="text-center py-8">Cargando...</TableCell></TableRow>
                                ) : pacientesFiltrados.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                            {hayFiltrosActivos ? "No se encontraron pacientes con esos filtros" : "No hay pacientes registrados"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pacientesFiltrados.map((paciente) => {
                                        const count = obtenerConteoHistorias ? obtenerConteoHistorias(paciente.id) : (paciente.historias?.length ?? 0)
                                        return (
                                        <TableRow 
                                            key={paciente.id}
                                            onClick={() => onSelectPaciente(paciente.id)}
                                            className={cn(
                                                "cursor-pointer transition-colors hover:bg-muted/50", 
                                                selectedPacienteId === paciente.id && "bg-secondary hover:bg-secondary/80" 
                                            )}
                                        >
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{paciente.apellido}, {paciente.nombre} ({paciente.dni})</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {new Date(paciente.fechaNacimiento).toLocaleDateString("es-AR")}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline">{paciente.obraSocial}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                {/* Badge con fondo celeste claro y texto azul (simula el aspecto original) */}
                                                <Badge className="bg-sky-100 text-sky-800 border-0 px-2 py-1">
                                                    {count} {count === 1 ? "historia" : "historias"}
                                                </Badge>
                                            </TableCell>

                                            {/* Se eliminó la celda de selección (checkbox/botón) para dejar solo las 3 columnas */}
                                        </TableRow>
                                    )})
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}