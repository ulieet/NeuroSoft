import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "lucide-react"
import type { MedicalHistory } from "@/lib/data-store"

interface PatientHistoriesTableProps {
  historias: MedicalHistory[]
}

export function PatientHistoriesTable({ historias }: PatientHistoriesTableProps) {
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
              <Badge variant={historia.estado === "validada" ? "default" : "secondary"}>{historia.estado}</Badge>
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
