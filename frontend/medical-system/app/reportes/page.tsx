"use client"

import { useState, useEffect } from "react"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts"
import { 
  Download, Users, FileText, Clock, FlaskConical, TrendingUp, 
  Shield, Activity, BrainCircuit, RefreshCw, AlertTriangle 
} from 'lucide-react'

// --- Tipos de Datos (Coinciden con el Backend) ---
type MotivoDMTEntry = { motivo: string; porcentaje: number; color: string };
type SoporteEntry = { name: string; value: number; color: string };
type FormaTerapiaEntry = { forma: string; alta_eficacia: number; moderada: number; sin_tratamiento: number; };

interface GeneralReportData {
  resumen_general: {
    total_pacientes: number;
    historias_registradas: number;
    promedio_edad_diagnostico: number;
    promedio_edad_actual: number;
    porcentaje_femenino: number;
  };
  kpis_em: {
    pacientes_neda3: number;
    arr_promedio: number;
    tiempo_a_edss_6_0_promedio: number;
    porcentaje_boc_positivas: number;
  };
  discapacidad_y_progression: {
    relacion_forma_terapia: FormaTerapiaEntry[]; 
    edss_progresion_historica: any[];
  };
  tratamiento_dmt: {
    uso_dmt_actual: { dmt: string; pacientes: number; color: string }[];
    motivos_cambio_dmt: MotivoDMTEntry[];
  };
  neuroimagen: {
    conteo_lcr: number;
    conteo_rmn_total: number;
    porcentaje_atrofia_reportada: number;
    actividad_rmn_bianual: { periodo: string; activos: number; inactivos: number }[];
  };
  tratamiento_soporte: SoporteEntry[];
}

export default function ReportesPage() {
  const [generalData, setGeneralData] = useState<GeneralReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("http://localhost:8000/reportes/general", { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' } 
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setGeneralData(json);
    } catch (e) {
      console.error("Backend inaccesible");
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  // Estado de Error
  if (error) {
    return (
      <MedicalLayout currentPage="reportes">
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <h2 className="text-xl font-bold">Error de conexión</h2>
          <p className="text-muted-foreground">No se pudo contactar con el servidor de analítica.</p>
          <Button onClick={fetchStats} variant="outline" className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
          </Button>
        </div>
      </MedicalLayout>
    );
  }

  // Estado de Carga
  if (loading || !generalData) {
    return (
      <MedicalLayout currentPage="reportes">
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-[#003e66]" />
          <p className="text-lg font-medium text-muted-foreground animate-pulse">Analizando cohorte clínica...</p>
        </div>
      </MedicalLayout>
    );
  }

  return (
    <MedicalLayout currentPage="reportes">
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-[#003e66]">Reportes Generales de Cohorte</h1>
            <p className="text-muted-foreground mt-2">
              Basado en {generalData.resumen_general.historias_registradas} historias de {generalData.resumen_general.total_pacientes} pacientes únicos.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" /> Exportar PDF</Button>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Muestra</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{generalData.resumen_general.total_pacientes}</div>
                <p className="text-[10px] text-muted-foreground">Pacientes procesados</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50/50 border-green-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-green-700">Estabilidad NEDA-3</CardTitle>
                <FlaskConical className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{(generalData.kpis_em.pacientes_neda3 * 100).toFixed(1)}%</div>
                <p className="text-[10px] text-green-600">Sin actividad detectada</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">ARR Cohorte</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{generalData.kpis_em.arr_promedio.toFixed(2)}</div>
                <p className="text-[10px] text-muted-foreground">Tasa recaídas promedio</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Media Diagnóstico</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{generalData.resumen_general.promedio_edad_diagnostico} años</div>
                <p className="text-[10px] text-muted-foreground">Edad al inicio de síntomas</p>
              </CardContent>
            </Card>
        </div>

        {/* GRÁFICOS SECCIÓN 1 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                        <Activity className="h-5 w-5 text-[#003e66]" /> Formas Evolutivas y Terapia
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={generalData.discapacidad_y_progression.relacion_forma_terapia} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                            <XAxis dataKey="forma" tick={{fontSize: 10}} />
                            <YAxis />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Legend wrapperStyle={{fontSize: '11px', paddingTop: '10px'}}/>
                            <Bar dataKey="alta_eficacia" name="Alta Eficacia" stackId="a" fill="#0ea5e9" />
                            <Bar dataKey="moderada" name="Eficacia Moderada" stackId="a" fill="#64748b" />
                            <Bar dataKey="sin_tratamiento" name="Sin DMT" stackId="a" fill="#cbd5e1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                      <Shield className="h-5 w-5 text-[#003e66]" /> Distribución Global de DMTs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={generalData.tratamiento_dmt.uso_dmt_actual} margin={{ top: 10, right: 20, left: 20, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="dmt" angle={-25} textAnchor="end" height={60} interval={0} style={{ fontSize: '10px' }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="pacientes" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* GRÁFICOS SECCIÓN 2 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                        <BrainCircuit className="h-5 w-5 text-[#003e66]" /> Actividad Lesional Bianual
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={generalData.neuroimagen.actividad_rmn_bianual} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="periodo" style={{ fontSize: '12px' }} />
                            <YAxis />
                            <Tooltip />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Bar dataKey="activos" fill="#ef4444" name="Activos" stackId="a" />
                            <Bar dataKey="inactivos" fill="#22c55e" name="NEDA RMN" stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle className="text-lg text-slate-700">Motivos de Cambio</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                       <Pie 
                        data={generalData.tratamiento_dmt.motivos_cambio_dmt} 
                        dataKey="porcentaje" 
                        nameKey="motivo" 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={60} 
                        label={(props: any) => {
                          return `${(props.percent * 100).toFixed(0)}%`;
                        }}
                      >
                        {generalData.tratamiento_dmt.motivos_cambio_dmt.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                                            <Tooltip />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
        </div>

        {/* SECCIÓN 3: BIOMARCADORES Y SOPORTE */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-slate-700"><FileText className="h-5 w-5 text-[#003e66]" /> Biomarcadores e Imagen</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="border-b pb-4">
                      <div className="flex justify-between mb-2 text-sm">
                        <span className="font-medium">Positividad de BOC (LCR)</span>
                        <span className="font-bold">{generalData.kpis_em.porcentaje_boc_positivas}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${generalData.kpis_em.porcentaje_boc_positivas}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2 text-sm">
                        <span className="font-medium">Detección de Atrofia</span>
                        <span className="font-bold">{generalData.neuroimagen.porcentaje_atrofia_reportada}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${generalData.neuroimagen.porcentaje_atrofia_reportada}%` }}></div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 italic">Menciones de pérdida de volumen en informes escaneados.</p>
                    </div>
                </CardContent>
              </Card>

             
        </div>
      </div>
    </MedicalLayout>
  )
}