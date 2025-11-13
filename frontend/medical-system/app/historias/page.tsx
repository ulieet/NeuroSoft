"use client";

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { MedicalLayout } from "@/components/medical-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Upload,
  Eye,
  Edit,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  RefreshCw,
  X,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

import {
  listarHistorias,
  importarHistoriaArchivo,
  type HistoriaResumen,
} from "@/lib/api-historias";

const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case "validada":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" /> Validada
        </Badge>
      );
    case "pendiente_validacion":
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" /> Pendiente
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" /> Error
        </Badge>
      );
    default:
      return <Badge variant="outline">{estado}</Badge>;
  }
};

export default function PaginaHistorias() {
  const [mounted, setMounted] = useState(false);
  const [historias, setHistorias] = useState<HistoriaResumen[]>([]);
  const [estaCargando, setEstaCargando] = useState(true);
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cargarHistorias = async () => {
    try {
      setEstaCargando(true);
      setError(null);
      const data = await listarHistorias();
      setHistorias(data);
    } catch (err: any) {
      setError(err.message ?? "Error inesperado al cargar historias");
    } finally {
      setEstaCargando(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    void cargarHistorias();
  }, [mounted]);

  const historiasFiltradas = useMemo(() => {
    let resultados = [...historias];

    if (terminoBusqueda) {
      const busq = terminoBusqueda.toLowerCase();
      resultados = resultados.filter((h) => {
        const diag = (h.diagnostico ?? "").toLowerCase();
        const forma = (h.forma ?? "").toLowerCase();
        const id = (h.id ?? "").toLowerCase();
        return (
          diag.includes(busq) ||
          forma.includes(busq) ||
          id.includes(busq)
        );
      });
    }

    resultados.sort((a, b) => {
      const diagA = (a.diagnostico ?? "").toLowerCase();
      const diagB = (b.diagnostico ?? "").toLowerCase();

      if (diagA < diagB) return sortOrder === "asc" ? -1 : 1;
      if (diagA > diagB) return sortOrder === "asc" ? 1 : -1;

      const fechaA = a.fecha_consulta ? new Date(a.fecha_consulta).getTime() : 0;
      const fechaB = b.fecha_consulta ? new Date(b.fecha_consulta).getTime() : 0;
      return fechaB - fechaA;
    });

    return resultados;
  }, [historias, terminoBusqueda, sortOrder]);

  const totalPendientes = useMemo(
    () =>
      historias.filter((h) => h.estado === "pendiente_validacion").length,
    [historias]
  );

  const totalValidadas = useMemo(
    () => historias.filter((h) => h.estado === "validada").length,
    [historias]
  );

  const hayFiltrosActivos = terminoBusqueda !== "";

  const limpiarFiltros = () => {
    setTerminoBusqueda("");
  };

  const manejarImportacion = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setEstaCargando(true);
      setError(null);
      await importarHistoriaArchivo(file);
      alert("Historia importada correctamente");
      await cargarHistorias();
    } catch (err: any) {
      alert(err.message ?? "Error al importar la historia");
    } finally {
      setEstaCargando(false);
      event.target.value = "";
    }
  };

  const manejarExportacion = () => {
    const jsonData = JSON.stringify(historias, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historias-clinicas-${new Date()
      .toISOString()
      .split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const manejarRefrescar = () => {
    void cargarHistorias();
  };

  if (!mounted)
    return <div className="p-6 text-muted-foreground">Cargando...</div>;

  return (
    <MedicalLayout currentPage="historias">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Historias Clínicas</h1>
            <p className="text-muted-foreground">
              Gestiona las historias clínicas importadas y validadas (backend
              fase 4.3)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={manejarRefrescar}
              disabled={estaCargando}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  estaCargando ? "animate-spin" : ""
                }`}
              />
              Refrescar
            </Button>
            <Button variant="outline" onClick={manejarExportacion}>
              <Download className="mr-2 h-4 w-4" />
              Exportar JSON (local)
            </Button>
            <label htmlFor="import-file">
              <Button asChild disabled={estaCargando} variant="outline">
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir PDF / DOCX
                </span>
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={manejarImportacion}
                disabled={estaCargando}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Historias</CardTitle>
              <CardDescription>
                <FileText className="inline h-4 w-4 mr-2" />
              </CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {historias.length}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pendientes</CardTitle>
              <CardDescription>
                <Clock className="inline h-4 w-4 mr-2" />
              </CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-orange-600">
              {totalPendientes}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validadas</CardTitle>
              <CardDescription>
                <CheckCircle className="inline h-4 w-4 mr-2" />
              </CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-green-600">
              {totalValidadas}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Buscar Historias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por diagnóstico, forma o ID de historia..."
                  className="pl-10"
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                />
              </div>

              <Button
                variant="outline"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="w-full sm:w-auto"
              >
                {sortOrder === "asc" ? (
                  <ArrowUp className="mr-2 h-4 w-4" />
                ) : (
                  <ArrowDown className="mr-2 h-4 w-4" />
                )}
                Diagnóstico ({sortOrder === "asc" ? "A-Z" : "Z-A"})
              </Button>

              {hayFiltrosActivos && (
                <Button variant="ghost" onClick={limpiarFiltros}>
                  <X className="mr-2 h-4 w-4" />
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Historias Clínicas</CardTitle>
            <CardDescription>
              {historiasFiltradas.length} historias encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 text-sm text-red-600">{error}</div>
            )}

            {estaCargando ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando datos...
              </div>
            ) : historiasFiltradas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {hayFiltrosActivos
                  ? "No se encontraron historias con los criterios seleccionados"
                  : "No hay historias clínicas registradas"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Fecha Consulta</TableHead>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead>Forma clínica</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historiasFiltradas.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-mono text-xs">
                          {h.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {h.fecha_consulta
                              ? new Date(
                                  h.fecha_consulta
                                ).toLocaleDateString("es-AR")
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div
                              className="truncate font-medium"
                              title={h.diagnostico ?? ""}
                            >
                              {h.diagnostico ?? "Sin diagnóstico"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {h.forma ? h.forma : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getEstadoBadge(h.estado)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/historias/detalle?id=${h.id}`}>
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            {h.estado === "pendiente_validacion" && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`/historias/validar?id=${h.id}`}>
                                  <Edit className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MedicalLayout>
  );
}
