"use client";

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MedicalLayout } from "@/components/medical-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
  ArrowDown,
  ArrowUp,
  CheckCheck,
  Filter,
  FileInput,
  Plus,
  ChevronDown,
  ChevronUp
} from "lucide-react";

import {
  listarHistorias,
  validarHistoriasMasivas,
  type HistoriaResumen,
} from "@/lib/api-historias";

import { FiltrosAvanzados, type FiltrosHistoria } from "./components/filtros-avanzados"

interface HistoriaLocal extends Omit<HistoriaResumen, "paciente"> {
  paciente: {
    id?: string;
    nombre: string;
    dni?: string;
    fecha_nacimiento?: string; 
    fechaNacimiento?: string;  
  };
  nivel_criticidad?: string;
  patologia?: string;
  medicamentos?: Array<{ droga: string; estado: string }>;
  [key: string]: any; 
}


const calcularEdad = (fechaNacimientoStr?: string) => {
  if (!fechaNacimientoStr) return null;
  const hoy = new Date();
  const nac = new Date(fechaNacimientoStr);
  if (isNaN(nac.getTime())) return null;
  
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }
  return edad;
}

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
      return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" /> Validada</Badge>;
    case "pendiente_validacion":
    case "pendiente":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
    case "error":
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Error</Badge>;
    default:
      return <Badge variant="outline">{estado}</Badge>;
  }
};

export default function PaginaHistorias() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [historias, setHistorias] = useState<HistoriaLocal[]>([]);
  const [estaCargando, setEstaCargando] = useState(true);
  const [procesandoValidacion, setProcesandoValidacion] = useState(false);
  const [mostrarAvanzados, setMostrarAvanzados] = useState(false);

  const [filtros, setFiltros] = useState<FiltrosHistoria>({
    texto: "",
    estado: "todos",
    criticidad: "todos",
    edad: ""
  })
  
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cargarHistorias = async () => {
    try {
      setEstaCargando(true);
      setError(null);
      const respuesta: any = await listarHistorias();
      const listaItems = respuesta.items || respuesta;
      if (Array.isArray(listaItems)) {
        setHistorias(listaItems as HistoriaLocal[]);
      } else {
        setHistorias([]);
      }
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

  const handleFiltrosChange = (id: keyof FiltrosHistoria, value: string | number) => {
    setFiltros(prev => ({ ...prev, [id]: value }))
  }

  const historiasFiltradas = useMemo(() => {
    let resultados = [...historias];

    if (filtros.texto) {
      const busq = filtros.texto.toLowerCase();
      resultados = resultados.filter((h) => {
        const diag = (h.diagnostico ?? "").toLowerCase();
        const forma = (h.forma ?? "").toLowerCase();
        const id = (h.id ?? "").toLowerCase();
        const paciente = (h.paciente?.nombre ?? "").toLowerCase();
        const dni = (h.paciente?.dni ?? "").toLowerCase();
        return (
          diag.includes(busq) ||
          forma.includes(busq) ||
          id.includes(busq) ||
          paciente.includes(busq) ||
          dni.includes(busq)
        );
      });
    }

    if (filtros.estado && filtros.estado !== "todos") {
        if (filtros.estado === "pendiente") {
            resultados = resultados.filter(h => h.estado === "pendiente" || h.estado === "pendiente_validacion");
        } else {
            resultados = resultados.filter((h) => h.estado === filtros.estado);
        }
    }

    if (filtros.criticidad && filtros.criticidad !== "todos") {
        resultados = resultados.filter(h => h.nivel_criticidad === filtros.criticidad);
    }

    if (filtros.patologia) {
        const seleccionadas = filtros.patologia.split("|");
        resultados = resultados.filter(h => {
             const pat = h.patologia || h.diagnostico; 
             return pat && seleccionadas.includes(pat);
        });
    }

    if (filtros.edad && filtros.edad.trim() !== "") {
        const edadBuscada = parseInt(filtros.edad);
        if (!isNaN(edadBuscada)) {
            resultados = resultados.filter(h => {
                const fechaNac = h.paciente?.fecha_nacimiento || h.paciente?.fechaNacimiento;
                
                const edadReal = calcularEdad(fechaNac);
                
                if (edadReal === null) return false;
                
                return edadReal === edadBuscada;
            });
        }
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
  }, [historias, filtros, sortOrder]);

  const totalPendientes = useMemo(
    () => historias.filter((h) => h.estado === "pendiente_validacion" || h.estado === "pendiente").length,
    [historias]
  );

  const totalValidadas = useMemo(
    () => historias.filter((h) => h.estado === "validada").length,
    [historias]
  );

  const hayFiltrosAvanzadosActivos = filtros.criticidad !== "todos" || filtros.patologia || filtros.edad;
  
  const limpiarFiltros = () => {
    setFiltros({
        texto: "",
        estado: "todos",
        criticidad: "todos",
        edad: ""
    });
  };

  const manejarValidarTodas = async () => {
    if (totalPendientes === 0) {
      alert("No hay historias pendientes para validar.");
      return;
    }
    if (!confirm(`¿Confirmas la validación automática de todas las historias pendientes?`)) return;

    try {
      setProcesandoValidacion(true);
      const respuesta = await validarHistoriasMasivas();
      alert(`Validación completada. ${respuesta.mensaje}`);
      await cargarHistorias();
    } catch (error) {
      console.error(error);
      alert("Hubo un problema al conectar con el servidor para la validación masiva.");
    } finally {
      setProcesandoValidacion(false);
    }
  };

  const manejarRefrescar = () => { void cargarHistorias(); };

  if (!mounted) return <div className="p-6 text-muted-foreground">Cargando...</div>;

  return (
    <MedicalLayout currentPage="historias">
      <div className="space-y-6">
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Historias Clínicas</h1>
            <p className="text-muted-foreground">Gestiona las historias clínicas registradas</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={manejarRefrescar} disabled={estaCargando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${estaCargando ? "animate-spin" : ""}`} />
              Refrescar
            </Button>
            <Button asChild variant="secondary" size="sm">
                <a href="/pacientes?redirect_to=nueva_historia"><Plus className="mr-2 h-4 w-4"/>Nueva Manual</a>
            </Button>
            <Button asChild variant="default" size="sm">
              <a href="/historias/importar"><FileInput className="mr-2 h-4 w-4" /> Importar</a>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card><CardHeader className="py-4"><CardTitle className="text-sm font-medium">Total Historias</CardTitle></CardHeader><CardContent className="py-2 text-2xl font-bold">{historias.length}</CardContent></Card>
          <Card><CardHeader className="py-4"><CardTitle className="text-sm font-medium">Pendientes</CardTitle></CardHeader><CardContent className="py-2 text-2xl font-bold text-blue-600">{totalPendientes}</CardContent></Card>
          <Card><CardHeader className="py-4"><CardTitle className="text-sm font-medium">Validadas</CardTitle></CardHeader><CardContent className="py-2 text-2xl font-bold text-green-600">{totalValidadas}</CardContent></Card>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar por paciente, DNI, diagnóstico..." 
                    className="pl-9" 
                    value={filtros.texto || ""} 
                    onChange={(e) => handleFiltrosChange("texto", e.target.value)} 
                />
            </div>
            
            <Select value={filtros.estado || "todos"} onValueChange={(v) => handleFiltrosChange("estado", v)}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="validada">Validada</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                </SelectContent>
            </Select>

            <Button 
                variant={hayFiltrosAvanzadosActivos ? "secondary" : "outline"} 
                onClick={() => setMostrarAvanzados(!mostrarAvanzados)}
                className="whitespace-nowrap w-full md:w-auto"
            >
                <Filter className="mr-2 h-4 w-4" />
                Más Filtros
                {mostrarAvanzados ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
             
             {(filtros.texto || filtros.estado !== "todos" || hayFiltrosAvanzadosActivos) && (
                 <Button variant="ghost" size="icon" onClick={limpiarFiltros} title="Limpiar todo">
                     <X className="h-4 w-4" />
                 </Button>
             )}
        </div>

        {mostrarAvanzados && (
            <FiltrosAvanzados 
                filtros={filtros} 
                onFiltrosChange={handleFiltrosChange} 
                historias={historias} 
            />
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle>Listado</CardTitle>
              <CardDescription>{historiasFiltradas.length} resultados</CardDescription>
            </div>
            <div className="flex gap-2">
                 <Button variant="ghost" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                    {sortOrder === "asc" ? <ArrowUp className="mr-2 h-4 w-4" /> : <ArrowDown className="mr-2 h-4 w-4" />} A-Z
                </Button>
                <Button variant="default" size="sm" onClick={manejarValidarTodas} disabled={estaCargando || procesandoValidacion || totalPendientes === 0}>
                  <CheckCheck className={`mr-2 h-4 w-4 ${procesandoValidacion ? "animate-spin" : ""}`} />
                  Validar Todo
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
            {estaCargando ? (
              <div className="text-center py-8 text-muted-foreground">Cargando datos...</div>
            ) : historiasFiltradas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                 <p>No se encontraron historias.</p>
                 <Button variant="link" onClick={limpiarFiltros}>Limpiar filtros</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="table-fixed w-full"> 
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[90px]">ID</TableHead>
                      <TableHead className="w-[180px]">Paciente</TableHead>
                      <TableHead className="w-[100px]">Fecha</TableHead>
                      <TableHead className="w-[200px]">Diagnóstico</TableHead>
                      <TableHead className="w-[140px]">Forma</TableHead>
                      <TableHead className="w-[110px]">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historiasFiltradas.map((h) => (
                      <TableRow key={h.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push(`/historias/detalle?id=${h.id}`)}>
                        <TableCell className="font-mono text-[10px] text-muted-foreground truncate" title={h.id}>
    #{h.id} 
  </TableCell>
                        
                        <TableCell className="truncate max-w-[180px]">
                          <div className="font-medium truncate" title={h.paciente?.nombre || ""}>
                            {h.paciente?.nombre || "Desconocido"}
                          </div>
                          {h.paciente?.dni && <div className="text-xs text-muted-foreground">DNI: {h.paciente.dni}</div>}
                        </TableCell>
                        
                        <TableCell className="truncate text-xs">
                          {h.fecha_consulta ? new Date(h.fecha_consulta).toLocaleDateString("es-AR", {timeZone: 'UTC'}) : "-"}
                        </TableCell>
                        
                        <TableCell className="truncate max-w-[200px]" title={h.diagnostico ?? ""}>
                           {h.diagnostico ?? <span className="text-muted-foreground italic">Sin dx</span>}
                        </TableCell>
                        
                        <TableCell className="truncate max-w-[140px]" title={h.forma || ""}>
                           {h.forma || "-"}
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