"use client";

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { MedicalLayout } from "@/components/medical-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  Upload,
  Eye,
  Edit,
  FileText,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  RefreshCw,
  Filter,
  X,
} from "lucide-react";

import {
  obtenerHistoriasClinicas,
  obtenerPacientes,
  inicializarDatosDeEjemplo,
  importarDesdeJSON,
  exportarAJSON,
  filtrarHistoriasClinicas,
  type HistoriaClinica,
  type Paciente,
  type FiltrosHistoria,
} from "@/lib/almacen-datos";

import { FiltrosAvanzados } from "./components/filtros-avanzados";

// --- Helpers visuales ---
const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case "validada":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" /> Validada
        </Badge>
      );
    case "pendiente":
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

const getCriticidadBadge = (nivel?: string) => {
  if (!nivel) return null;
  switch (nivel) {
    case "critico":
      return <Badge variant="destructive">Crítico</Badge>;
    case "alto":
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Alto</Badge>;
    case "medio":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medio</Badge>;
    case "bajo":
      return <Badge variant="outline">Bajo</Badge>;
    default:
      return null;
  }
};

// --- Componente principal ---
export default function PaginaHistorias() {
  // ✅ Estado base
  const [mounted, setMounted] = useState(false);
  const [historias, setHistorias] = useState<HistoriaClinica[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [estaCargando, setEstaCargando] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [filtros, setFiltros] = useState<FiltrosHistoria>({});

  // --- Montaje seguro ---
  useEffect(() => {
    setMounted(true);
  }, []);

  // --- Carga de datos una vez montado ---
  useEffect(() => {
    if (!mounted) return;
    inicializarDatosDeEjemplo();
    setHistorias(obtenerHistoriasClinicas());
    setPacientes(obtenerPacientes());
    setEstaCargando(false);
  }, [mounted]);

  // --- Helpers de pacientes ---
  const mapaPacientes = useMemo(() => new Map(pacientes.map(p => [p.id, p])), [pacientes]);

  const obtenerNombrePaciente = (pacienteId: number) => {
    const p = mapaPacientes.get(pacienteId);
    return p ? `${p.apellido}, ${p.nombre}` : "Desconocido";
  };

  const obtenerDNIPaciente = (pacienteId: number) =>
    mapaPacientes.get(pacienteId)?.dni || "N/A";

  // --- Lógica de filtrado ---
  const historiasFiltradas = useMemo(() => {
    if (!historias.length) return [];
    let resultados = filtrarHistoriasClinicas(filtros);

    if (terminoBusqueda) {
      const busqueda = terminoBusqueda.toLowerCase();
      resultados = resultados.filter((h) => {
        const nombre = obtenerNombrePaciente(h.pacienteId).toLowerCase();
        const dni = obtenerDNIPaciente(h.pacienteId);
        const diagnostico = h.diagnostico.toLowerCase();
        const patologia = h.patologia?.toLowerCase() || "";
        return (
          nombre.includes(busqueda) ||
          dni.includes(busqueda) ||
          diagnostico.includes(busqueda) ||
          patologia.includes(busqueda)
        );
      });
    }
    return resultados;
  }, [historias, filtros, terminoBusqueda, mapaPacientes]);

  // --- Handlers ---
  const manejarCambioFiltro = (id: keyof FiltrosHistoria, value: string | number) => {
    const valorLimpio = value === "todos" || value === "" ? undefined : String(value);
    const camposNumericos: (keyof FiltrosHistoria)[] = [
      "edad",
      "edadInicioEnfermedad",
      "tiempoEvolucion",
      "escalaEDSS",
    ];
    const valorFinal = camposNumericos.includes(id)
      ? Number(valorLimpio) || undefined
      : valorLimpio;
    setFiltros((prev) => ({ ...prev, [id]: valorFinal }));
  };

  const limpiarFiltros = () => {
    setFiltros({});
    setTerminoBusqueda("");
  };

  const manejarImportacion = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setEstaCargando(true);
    try {
      await importarDesdeJSON(file);
      inicializarDatosDeEjemplo();
      setHistorias(obtenerHistoriasClinicas());
      setPacientes(obtenerPacientes());
      alert("Datos importados correctamente");
    } catch (error) {
      alert("Error al importar el archivo JSON");
    } finally {
      setEstaCargando(false);
      event.target.value = "";
    }
  };

  const manejarExportacion = () => {
    const jsonData = exportarAJSON();
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historias-clinicas-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const manejarRefrescar = () => {
    setEstaCargando(true);
    inicializarDatosDeEjemplo();
    setHistorias(obtenerHistoriasClinicas());
    setPacientes(obtenerPacientes());
    setEstaCargando(false);
  };

  const hayFiltrosActivos =
    Object.values(filtros).some((v) => v !== undefined) || terminoBusqueda !== "";

  // --- 🔒 Evita errores de hidratación: no renderices hasta que esté montado ---
  if (!mounted) return <div className="p-6 text-muted-foreground">Cargando...</div>;

  // --- Render principal ---
  return (
    <MedicalLayout currentPage="historias">
      <div className="space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Historias Clínicas</h1>
            <p className="text-muted-foreground">
              Gestiona las historias clínicas importadas y validadas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={manejarRefrescar} disabled={estaCargando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${estaCargando ? "animate-spin" : ""}`} />
              Refrescar
            </Button>
            <Button variant="outline" onClick={manejarExportacion}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <label htmlFor="import-json">
              <Button asChild disabled={estaCargando}>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar JSON
                </span>
              </Button>
              <input
                id="import-json"
                type="file"
                accept=".json"
                className="hidden"
                onChange={manejarImportacion}
                disabled={estaCargando}
              />
            </label>
          </div>
        </div>

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Historias</CardTitle>
              <CardDescription>
                <FileText className="inline h-4 w-4 mr-2" />
              </CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{historias.length}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pendientes</CardTitle>
              <CardDescription>
                <Clock className="inline h-4 w-4 mr-2" />
              </CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-orange-600">
              {historias.filter((h) => h.estado === "pendiente").length}
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
              {historias.filter((h) => h.estado === "validada").length}
            </CardContent>
          </Card>
        </div>

        {/* Busqueda y filtros */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Buscar y Filtrar Historias</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {mostrarFiltros ? "Ocultar Filtros" : "Mostrar Filtros"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, diagnóstico, patología o DNI..."
                  className="pl-10"
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                />
              </div>
              {hayFiltrosActivos && (
                <Button variant="ghost" onClick={limpiarFiltros}>
                  <X className="mr-2 h-4 w-4" />
                  Limpiar Búsqueda y Filtros
                </Button>
              )}
            </div>

            {mostrarFiltros && (
              <FiltrosAvanzados filtros={filtros} onFiltrosChange={manejarCambioFiltro} />
            )}
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Historias Clínicas</CardTitle>
            <CardDescription>
              {historiasFiltradas.length} historias encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      <TableHead>Paciente</TableHead>
                      <TableHead>Fecha Consulta</TableHead>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead>EDSS</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Criticidad</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historiasFiltradas.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {obtenerNombrePaciente(h.pacienteId)}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              DNI: {obtenerDNIPaciente(h.pacienteId)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(h.fecha).toLocaleDateString("es-AR")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="truncate font-medium" title={h.diagnostico}>
                              {h.diagnostico}
                            </div>
                            {h.patologia && (
                              <div className="text-xs text-muted-foreground truncate">
                                {h.patologia}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {h.escalaEDSS !== undefined ? h.escalaEDSS.toFixed(1) : "N/A"}
                        </TableCell>
                        <TableCell>{getEstadoBadge(h.estado)}</TableCell>
                        <TableCell>{getCriticidadBadge(h.nivelCriticidad)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/historias/detalle?id=${h.id}`}>
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            {h.estado === "pendiente" && (
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
