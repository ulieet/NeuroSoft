"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { 
  Download, TrendingUp, Clock, AlertTriangle, Pill, 
  ArrowLeft, RefreshCw, Check, Activity, ShieldCheck
} from 'lucide-react'

import { getPaciente, getHistoriasDePaciente, PacienteBackend } from "@/lib/api-pacientes"
import { BASE_URL } from "@/lib/api-historias"

// --- MOTOR DE IDENTIFICACIÓN CLÍNICA ---
const DMT_KEYWORDS = [
  "interfer", "rebif", "betaferon", "avonex", "copaxon", "glatiramer", "cop-i",
  "natalizumab", "tysabri", "fingolimod", "gilenya", "ocrelizumab", "ocrevus", 
  "rituximab", "teriflunomida", "aubagio", "cladribina", "mavenclad", "alemtuzumab",
  "dimetil", "dimeful", "tecfidera", "ponvory", "kesimpta", "mayzent"
];

const normalizarTexto = (str: string) => 
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const identificarDMT = (tratamientos: any[]) => {
  if (!tratamientos || !Array.isArray(tratamientos)) return null;
  // Buscamos en toda la lista de la historia el primer fármaco que sea un modulador (DMT)
  return tratamientos.find((t: any) => {
    const txt = normalizarTexto(`${t.droga || ""} ${t.molecula || ""}`);
    return DMT_KEYWORDS.some(key => txt.includes(key));
  });
};

const normalizarNombreDMT = (nombre: string) => {
  const n = normalizarTexto(nombre);
  if (n.includes("interfer") || n.includes("rebif") || n.includes("betaferon") || n.includes("avonex")) return "Interferón Beta";
  if (n.includes("glatiramer") || n.includes("copaxon") || n.includes("cop-i")) return "Acetato de Glatiramer";
  if (n.includes("fingolimod") || n.includes("gilenya")) return "Fingolimod";
  if (n.includes("natalizumab") || n.includes("tysabri")) return "Natalizumab";
  if (n.includes("dimetil") || n.includes("dimeful")) return "Dimetilfumarato";
  if (n.includes("ocrelizumab") || n.includes("ocrevus")) return "Ocrelizumab";
  return nombre;
};

const formatearFechaVista = (fechaStr?: string | null) => {
  if (!fechaStr) return "—";
  const partes = fechaStr.split("T")[0].split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaStr;
};

function diffMeses(fecha1: Date, fecha2: Date) {
    let meses = (fecha2.getFullYear() - fecha1.getFullYear()) * 12;
    meses -= fecha1.getMonth();
    meses += fecha2.getMonth();
    return meses <= 0 ? 0 : meses;
}

function DetalleAnalisisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pacienteId = searchParams.get("id");

  const [paciente, setPaciente] = useState<PacienteBackend | null>(null);
  const [historiasRaw, setHistoriasRaw] = useState<any[]>([]);
  const [estaCargando, setEstaCargando] = useState(true);

  useEffect(() => {
    if (!pacienteId) return;
    const cargarTodo = async () => {
      setEstaCargando(true);
      try {
        const p = await getPaciente(pacienteId);
        setPaciente(p);
        const lista = await getHistoriasDePaciente(pacienteId);
        const detalles = await Promise.all(
          lista.map(async (h) => {
            const res = await fetch(`${BASE_URL}/historias/${h.id}/borrador`);
            const data = await res.json();
            return { id: h.id, ...(data.validada || data.borrador || {}) };
          })
        );
        setHistoriasRaw(detalles);
      } catch (e) { console.error(e); }
      finally { setEstaCargando(false); }
    };
    cargarTodo();
  }, [pacienteId]);

  const analisis = useMemo(() => {
    if (historiasRaw.length === 0) return null;

    // 1. Ordenar por fecha real del JSON
    const ordenadas = [...historiasRaw].sort((a, b) => 
      new Date(a.consulta?.fecha || 0).getTime() - new Date(b.consulta?.fecha || 0).getTime()
    );

    // 2. Extraer datos recorriendo el JSON
    const registros = ordenadas.map(h => {
      const todosTrats = h.tratamientos || [];
      const tDMT = identificarDMT(todosTrats);
      
      const drogaOriginal = tDMT?.droga || tDMT?.molecula || "Sin DMT";
      const dosis = tDMT?.dosis || "";
      const frecuencia = tDMT?.frecuencia || "";

      // Buscamos intolerancia en el campo o en el comentario médico
      const esIntolerante = tDMT?.tolerancia === false || 
                            (h.secciones_texto?.comentario || "").toLowerCase().includes("intolerancia");

      return {
        dmt: normalizarNombreDMT(drogaOriginal),
        dmtOriginal: drogaOriginal,
        dmtFull: `${drogaOriginal} ${dosis}`.trim(),
        esquema: frecuencia || "—",
        fecha: formatearFechaVista(h.consulta?.fecha),
        fechaRaw: h.consulta?.fecha,
        edss: parseFloat(h.enfermedad?.edss) || 0,
        tolerancia: !esIntolerante,
        soporte: todosTrats.filter((t: any) => {
           const txt = normalizarTexto(`${t.droga || ""} ${t.molecula || ""}`);
           return !DMT_KEYWORDS.some(key => txt.includes(key));
        }).map((t: any) => `${t.droga || t.molecula} ${t.dosis || ""}`.trim())
      };
    });

    // 3. Métricas
    let switches = 0;
    let intolerancias = 0;
    for (let i = 0; i < registros.length; i++) {
      // Solo cuenta switch si hay un cambio real entre dos drogas conocidas
      if (i > 0 && registros[i].dmt !== registros[i - 1].dmt && registros[i].dmt !== "Sin DMT") switches++;
      if (!registros[i].tolerancia) intolerancias++;
    }

    // 4. Intervalos (Hitos EDSS)
    const intervalos = [];
    if (registros.length > 0) {
      let edssActual = registros[0].edss;
      let fechaInicio = new Date(registros[0].fechaRaw || 0);
      let setDMTs = new Set([registros[0].dmt]);

      for (let i = 1; i < registros.length; i++) {
        if (registros[i].edss !== edssActual) {
          const fechaHito = new Date(registros[i].fechaRaw || 0);
          intervalos.push({
            cambio: `EDSS ${edssActual} → ${registros[i].edss}`,
            tiempo: `${diffMeses(fechaInicio, fechaHito)} meses`,
            medicacion: Array.from(setDMTs).filter(d => d !== "Sin DMT").join(", ") || "Ninguno",
            severidad: registros[i].edss > edssActual ? 'empeoro' : 'mejoro'
          });
          edssActual = registros[i].edss;
          fechaInicio = fechaHito;
          setDMTs = new Set([registros[i].dmt]);
        } else {
          setDMTs.add(registros[i].dmt);
        }
      }
    }

    return { registros, switches, intolerancias, intervalos, soporte: [...new Set(registros.flatMap(r => r.soporte))].filter(Boolean) };
  }, [historiasRaw]);

  if (estaCargando) return <div className="flex justify-center items-center py-40"><RefreshCw className="animate-spin h-12 w-12 text-[#003e66]" /></div>;
  if (!paciente || !analisis) return <div className="p-20 text-center text-muted-foreground">Historias clínicas sin datos estructurados suficientes.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#003e66]">{paciente.nombre}</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">DNI: {paciente.dni}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="default" className="bg-[#003e66]" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" /> Exportar Reporte</Button>
          <Button variant="outline" onClick={() => router.push("/analisis")}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
        </div>
      </div>

      {/* METRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-t-4 border-t-blue-500"><CardHeader className="pb-2 text-xs font-bold uppercase text-slate-500">Total Consultas</CardHeader><CardContent className="text-3xl font-bold">{historiasRaw.length}</CardContent></Card>
        <Card className="border-t-4 border-t-orange-500"><CardHeader className="pb-2 text-xs font-bold uppercase text-slate-500">Switches de DMT</CardHeader><CardContent className="text-3xl font-bold text-orange-600">{analisis.switches}</CardContent></Card>
        <Card className="border-t-4 border-t-red-500"><CardHeader className="pb-2 text-xs font-bold uppercase text-slate-500">Reportes Intolerancia</CardHeader><CardContent className="text-3xl font-bold text-red-600">{analisis.intolerancias}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-slate-700"><TrendingUp className="h-5 w-5 text-[#003e66]" /> Evolución de Discapacidad (Curva EDSS)</CardTitle></CardHeader>
        <CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={analisis.registros}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="fecha" tick={{fontSize: 12}}/><YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]}/><Tooltip/><Line type="stepAfter" dataKey="edss" stroke="#003e66" strokeWidth={4} dot={{r: 6, fill: "#003e66", strokeWidth: 2, stroke: "#fff"}}/></LineChart></ResponsiveContainer></div></CardContent>
      </Card>

      {/* --- SECCION SOPORTE Y REHABILITACION (GRANDE Y VISUAL) --- */}
      {analisis.soporte.length > 0 && (
        <Card className="border-l-8 border-l-cyan-500 bg-cyan-50/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3 text-cyan-900">
              <Activity className="h-7 w-7 text-cyan-600" /> 
              Soporte, Síntomas y Rehabilitación
            </CardTitle>
            <p className="text-sm text-cyan-700 font-medium">Tratamientos complementarios detectados en el historial completo.</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {analisis.soporte.map((t) => (
                <Badge key={t} className="text-lg py-3 px-6 bg-white border-2 border-cyan-200 text-cyan-900 shadow-sm hover:scale-105 transition-transform duration-200 cursor-default">
                  {t}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* HITOS EDSS */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-slate-700"><Clock className="h-5 w-5 text-[#003e66]" /> Hitos de Progresión y Estabilidad</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-50"><TableRow><TableHead>Cambio EDSS</TableHead><TableHead>Duración</TableHead><TableHead>DMT en el periodo</TableHead></TableRow></TableHeader>
            <TableBody>
              {analisis.intervalos.length > 0 ? analisis.intervalos.map((int, i) => (
                <TableRow key={i}>
                  <TableCell className="font-bold"><div className="flex items-center gap-2">{int.severidad === 'empeoro' ? <AlertTriangle className="h-4 w-4 text-red-500"/> : <Check className="h-4 w-4 text-green-500"/>}{int.cambio}</div></TableCell>
                  <TableCell className="font-medium">{int.tiempo}</TableCell>
                  <TableCell className="text-sm italic text-slate-500">{int.medicacion}</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-400 italic">No se detectaron cambios numéricos en la escala EDSS durante el periodo analizado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* HISTORICO DMT DETALLADO */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-slate-700"><Pill className="h-5 w-5 text-[#003e66]" /> Histórico Detallado de Inmunomoduladores (DMT)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Fármaco y Dosis</TableHead>
                <TableHead>Esquema</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-center">EDSS</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analisis.registros.map((reg, i) => (
                <TableRow key={i}>
                  <TableCell className="font-semibold text-slate-800">{reg.dmtFull}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-500">{reg.esquema}</TableCell>
                  <TableCell className="text-slate-600">{reg.fecha}</TableCell>
                  <TableCell className="text-center font-bold text-[#003e66]">{reg.edss.toFixed(1)}</TableCell>
                  <TableCell><Badge variant={reg.tolerancia ? "secondary" : "destructive"} className="font-bold">{reg.tolerancia ? "Tolerado" : "Intolerancia"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaginaDetalleAnalisis() {
  return (
    <MedicalLayout currentPage="analisis">
      <Suspense fallback={<div className="p-20 text-center"><RefreshCw className="animate-spin inline mr-2 text-[#003e66]"/>Procesando datos clínicos...</div>}>
        <DetalleAnalisisContent />
      </Suspense>
    </MedicalLayout>
  )
}