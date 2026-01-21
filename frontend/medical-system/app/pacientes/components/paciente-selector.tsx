
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
                                    <TableHead className="text-right">Selección</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {estaCargando ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-8">Cargando...</TableCell></TableRow>
                                ) : pacientesFiltrados.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            {hayFiltrosActivos ? "No se encontraron pacientes con esos filtros" : "No hay pacientes registrados"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pacientesFiltrados.map((paciente) => (
                                        <TableRow 
                                            key={paciente.id}
                                            onClick={() => onSelectPaciente(paciente.id)}
                                            className={cn(
                                                "cursor-pointer transition-colors hover:bg-muted/50", 
                                                selectedPacienteId === paciente.id && "bg-secondary hover:bg-secondary/80" 
                                            )}
                                        >
                                            <TableCell>
                                                <div className="font-medium">
                                                    {paciente.apellido}, {paciente.nombre}
                                                </div>
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