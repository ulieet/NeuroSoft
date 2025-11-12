"use client" // <-- REQUERIDO

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "lucide-react"
import type { HistoriaClinica } from "@/lib/almacen-datos"

interface TablaHistoriasProps {
  historias: HistoriaClinica[]
}

const getEstadoBadge = (estado: string) => {
   switch (estado) {
    case "validada":
      return <Badge className="bg-green-100 text-green-800 border-green-200">Validada</Badge>
    case "pendiente":
      return <Badge variant="secondary">Pendiente</Badge>
    case "error":
      return <Badge variant="destructive">Error</Badge>
    default:
      return <Badge variant="outline">{estado}</Badge>
  }
}

export function TablaHistorias({ historias }: TablaHistoriasProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Diagnóstico</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Médico</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {historias.map((historia) => (
          <TableRow key={historia.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {new Date(historia.fecha).toLocaleDateString("es-AR")}
              </div>
            </TableCell>
            <TableCell>{historia.diagnostico}</TableCell>
            <TableCell>
              {getEstadoBadge(historia.estado)}
            </TableCell>
            <TableCell>{historia.medico}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" asChild>
                <a href={`/historias/detalle?id=${historia.id}`}>Ver Detalle</a>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}