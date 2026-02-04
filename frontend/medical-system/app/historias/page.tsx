"use client";

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Upload,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
  ArrowDown,
  ArrowUp,
  CheckCheck,
  Filter,
  FileInput
} from "lucide-react";

import {
  listarHistorias,
  importarHistoriaArchivo,
  autoValidarHistoria,
  type HistoriaResumen,
} from "@/lib/api-historias";

const coincideFecha = (storedDate: string | null | undefined, search: string) => {
  if (!storedDate) return false;
  if (!search) return true;

  const cleanSearch = search.trim();
  
  if (storedDate.includes(cleanSearch)) return true;

  const partesFecha = storedDate.split("T")[0].split("-"); 
  if (partesFecha.length < 3) return false;

  const sYear = parseInt(partesFecha[0], 10);
  const sMonth = parseInt(partesFecha[1], 10);
  const sDay = parseInt(partesFecha[2], 10);

  const parts = cleanSearch.split(/[\/\-\.\s]+/).map(p => parseInt(p, 10)).filter(n => !isNaN(n));

  if (parts.length === 0) return false;

  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (y < 100) y += 2000; 
    return d === sDay && m === sMonth && y === sYear;
  }

  if (parts.length === 2) {
    const [p1, p2] = parts;
    if (p2 > 31) { 
       let y = p2;
       if (y < 100) y += 2000;
       return p1 === sMonth && y === sYear;
    }
    return p1 === sDay && p2 === sMonth;
  }

  if (parts.length === 1) {
    const p = parts[0];
    if (p > 31) return p === sYear; 
    return p === sDay || p === sMonth; 
  }

  return false;
};

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
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [historias, setHistorias] = useState<HistoriaResumen[]>([]);
  const [estaCargando, setEstaCargando] = useState(true);
  const [procesandoValidacion, setProcesandoValidacion] = useState(false);
  
  // Filtros
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("");
  
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

    // 1. Filtro Texto
    if (terminoBusqueda) {
      const busq = terminoBusqueda.toLowerCase();
      resultados = resultados.filter((h) => {
        const diag = (h.diagnostico ?? "").toLowerCase();
        const forma = (h.forma ?? "").toLowerCase();
        const id = (h.id ?? "").toLowerCase();
        const paciente = (h.paciente?.nombre ?? "").toLowerCase();
        return (
          diag.includes(busq) ||
          forma.includes(busq) ||
          id.includes(busq) ||
          paciente.includes(busq)
        );
      });
    }

    // 2. Filtro Estado
    if (filtroEstado !== "todos") {
      resultados = resultados.filter((h) => h.estado === filtroEstado);
    }

    // 3. Filtro Fecha Inteligente
    if (filtroFecha) {
      resultados = resultados.filter((h) => coincideFecha(h.fecha_consulta, filtroFecha));
    }

    // Ordenamiento
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
  }, [historias, terminoBusqueda, filtroEstado, filtroFecha, sortOrder]);

  const totalPendientes = useMemo(
    () => historias.filter((h) => h.estado === "pendiente_validacion").length,
    [historias]
  );

  const totalValidadas = useMemo(
    () => historias.filter((h) => h.estado === "validada").length,
    [historias]
  );

  const hayFiltrosActivos = terminoBusqueda !== "" || filtroEstado !== "todos" || filtroFecha !== "";

  const limpiarFiltros = () => {
    setTerminoBusqueda("");
    setFiltroEstado("todos");
    setFiltroFecha("");
  };

  const manejarValidarTodas = async () => {
    const pendientesParaValidar = historiasFiltradas.filter(h => h.estado === "pendiente_validacion");

    if (pendientesParaValidar.length === 0) {
      alert("No hay historias pendientes en la lista actual para validar.");
      return;
    }

    if (!confirm(`¿Confirmas la validación automática de ${pendientesParaValidar.length} historias?`)) {
      return;
    }

    try {
      setProcesandoValidacion(true);
      
      await Promise.all(
        pendientesParaValidar.map((h) => 
          autoValidarHistoria(h.id)
            .catch(e => console.error(`Error validando ${h.id}`, e))
        )
      );
      
      alert("Validación masiva finalizada. Recargando datos...");
      await cargarHistorias();
    } catch (error) {
      console.error(error);
      alert("Hubo un problema procesando algunas historias.");
    } finally {
      setProcesandoValidacion(false);
    }
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
              Gestiona las historias clínicas importadas y validadas
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
            
            <Button 
              asChild 
              variant="default" 
            >
              <a href="/historias/importar">
                <FileInput className="mr-2 h-4 w-4" />
                Importar Historias
              </a>
            </Button>

            <label htmlFor="import-file">
              <Button asChild disabled={estaCargando} variant="outline">
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir PDF
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
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros y Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, diagnóstico..."
                  className="pl-10"
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                />
              </div>

              <div className="w-full md:w-48">
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="validada">Validada</SelectItem>
                    <SelectItem value="pendiente_validacion">Pendiente</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-auto">
                <Input 
                  type="text" 
                  placeholder="Fecha (ej: 3/2/2024)"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="w-full md:w-48"
                />
              </div>

              <Button
                variant="outline"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="w-full md:w-auto"
              >
                {sortOrder === "asc" ? (
                  <ArrowUp className="mr-2 h-4 w-4" />
                ) : (
                  <ArrowDown className="mr-2 h-4 w-4" />
                )}
                A-Z
              </Button>

              {hayFiltrosActivos && (
                <Button variant="ghost" onClick={limpiarFiltros} className="px-2">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle>Lista de Historias Clínicas</CardTitle>
              <CardDescription>
                {historiasFiltradas.length} historias encontradas
              </CardDescription>
            </div>

            <Button 
              variant="default" 
              size="sm"
              onClick={manejarValidarTodas}
              disabled={estaCargando || procesandoValidacion || totalPendientes === 0}
            >
              <CheckCheck className={`mr-2 h-4 w-4 ${procesandoValidacion ? "animate-spin" : ""}`} />
              Validar Pendientes ({historiasFiltradas.filter(h => h.estado === 'pendiente_validacion').length})
            </Button>
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
                      <TableHead>Paciente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead>Forma clínica</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historiasFiltradas.map((h) => (
                      <TableRow 
                        key={h.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/historias/detalle?id=${h.id}`)}
                      >
                        <TableCell className="font-mono text-xs">
                          {h.id}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {h.paciente?.nombre ? h.paciente.nombre : <span className="text-muted-foreground italic">Desconocido</span>}
                          </div>
                          {h.paciente?.dni && (
                            <div className="text-xs text-muted-foreground">DNI: {h.paciente.dni}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {h.fecha_consulta
                              ? new Date(
                                  h.fecha_consulta
                                ).toLocaleDateString("es-AR", {timeZone: 'UTC'}) 
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