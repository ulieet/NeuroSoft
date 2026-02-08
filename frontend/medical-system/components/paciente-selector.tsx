"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils" 
import { BarraBusquedaFiltros } from "@/app/pacientes/components/filtros"
import { usePacientesListado } from "@/hooks/use-pacientes-listado"

interface PacienteListadoSelectorProps {
    onSelectPaciente: (pacienteId: string) => void; 
    selectedPacienteId: string | null;            
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
        obtenerConteoHistorias,
        hayFiltrosActivos
    } = usePacientesListado()

    return (
        <div className="space-y-6">
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
                    <CardDescription>{pacientesFiltrados.length} pacientes encontrados en el servidor.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Obra Social</TableHead>
                                <TableHead className="text-right">Historias</TableHead> 
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {estaCargando ? (
                                <TableRow><TableCell colSpan={3} className="text-center py-8">Cargando datos reales...</TableCell></TableRow>
                            ) : (
                                pacientesFiltrados.map((paciente) => (
                                    <TableRow 
                                        key={paciente.id}
                                        onClick={() => onSelectPaciente(paciente.id)}
                                        className={cn(
                                            "cursor-pointer transition-colors hover:bg-muted/50", 
                                            selectedPacienteId === paciente.id && "bg-secondary" 
                                        )}
                                    >
                                        <TableCell>
                                            <div className="font-medium">{paciente.nombre}</div>
                                            <div className="text-xs text-muted-foreground font-mono">DNI: {paciente.dni}</div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{paciente.obra_social || "S/D"}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="secondary">{obtenerConteoHistorias(paciente.id)} historias</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};