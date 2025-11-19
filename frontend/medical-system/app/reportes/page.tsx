"use client"

import { useState, useEffect } from "react"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts"
import { Download, Users, FileText, Clock, FlaskConical, TrendingUp, ScatterChart, Shield, Activity } from 'lucide-react'

type MotivoDMTEntry = { motivo: string; porcentaje: number; color: string };
type SoporteEntry = { name: string; value: number; color: string };
type FormaEvolutivaEntry = { forma: string; conteo: number; color: string };

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
    distribucion_formas_evolutivas: FormaEvolutivaEntry[];
    edss_progresion_historica: { periodo: string; edss_promedio: number; arr: number }[];
  };
  tratamiento_dmt: {
    uso_dmt_actual: { dmt: string; pacientes: number; color: string }[];
    motivos_cambio_dmt: MotivoDMTEntry[];
  };
  neuroimagen: {
    conteo_lcr: number;
    conteo_rmn_total: number;
    porcentaje_atrofia_reportada: number;
    actividad_rmn_bianual: { semestre: string; activos: number; inactivos: number }[];
  };
  tratamiento_soporte: SoporteEntry[];
}

// --- Custom Hook para la carga de datos generales desde JSON ---
const useGeneralReportData = () => {
  const [data, setData] = useState<GeneralReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/reporte_general_mock.json') 
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar datos del reporte mock');
        return res.json();
      })
      .then((mockData: GeneralReportData) => {
        setData(mockData);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Fallo al cargar datos mock:", error);
        setLoading(false);
      });
  }, []);

  return { data, loading };
}


export default function ReportesPage() {
  const { data: generalData, loading } = useGeneralReportData(); 
  
  const [filtros, setFiltros] = useState({
    fechaInicio: "",
    fechaFin: "",
  })

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor,
    }))
  }

  const exportarReporte = (formato: string) => {
    console.log(`Exportando reporte general en formato ${formato}`)
  }
  
  if (loading) {
    return (
      <MedicalLayout currentPage="reportes">
        <div className="p-6 text-center text-lg font-semibold text-cyan-600">
          Cargando Reportes Generales de Cohorte...
        </div>
      </MedicalLayout>
    );
  }

  if (!generalData) {
      return (
          <MedicalLayout currentPage="reportes">
              <div className="p-6 text-center text-lg font-semibold text-red-600">
                  No se pudieron cargar los datos del reporte general. Verifique la ruta del archivo mock.
              </div>
          </MedicalLayout>
      );
  }

  return (
    <MedicalLayout currentPage="reportes">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-balance">Reportes Generales de Cohorte (EM)</h1>
          <p className="text-muted-foreground mt-2">Métricas clave y estadísticas para la gestión de la cohorte de Esclerosis Múltiple.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Opciones:</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="hidden sm:block"></div> 
                 <div className="mt-4 flex gap-2">
              <Button onClick={() => exportarReporte("pdf")}>
                <Download className="mr-2 h-4 w-4" />
                Exportar datos anonimos en PDF
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Métricas de Rendimiento Clínico</h2>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{generalData.resumen_general.total_pacientes}</div>
                  <p className="text-xs text-muted-foreground">Historias: {generalData.resumen_general.historias_registradas}</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">NEDA-3 (Sin Actividad)</CardTitle>
                  <FlaskConical className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700">{(generalData.kpis_em.pacientes_neda3 * 100).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Sin brotes, progresión EDSS, o actividad RMN.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ARR Promedio</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{generalData.kpis_em.arr_promedio.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Tasa Anualizada de Recaídas (Baja es mejor).</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tiempo a EDSS 6.0</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{generalData.kpis_em.tiempo_a_edss_6_0_promedio.toFixed(1)} años</div>
                  <p className="text-xs text-muted-foreground">Tiempo promedio para alcanzar el uso de ayuda unilateral.</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* DISTRIBUCIÓN DE FORMAS EVOLUTIVAS */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5" /> Formas Evolutivas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={generalData.discapacidad_y_progression.distribucion_formas_evolutivas}
                          dataKey="conteo"
                          nameKey="forma"
                          cx="50%"
                          cy="45%" 
                          outerRadius={90}
                          label={(props) =>
                            `${String(props.name).substring(0, 10)}: ${props.value}`
                          }
                        >
                          {generalData.discapacidad_y_progression.distribucion_formas_evolutivas.map((entry, index) => (
                            <Cell key={`cell-forma-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [`${value} pacientes`, name]}/>
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* USO ACTUAL DE DMTS */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5" /> Uso Actual de Terapia Modificadora (DMTs)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={generalData.tratamiento_dmt.uso_dmt_actual} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="dmt" angle={-15} textAnchor="end" height={50} interval={0} style={{ fontSize: '10px' }}/>
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`${value} pacientes`, 'Total']} />
                        <Bar dataKey="pacientes" fill="#0ea5e9">
                          {generalData.tratamiento_dmt.uso_dmt_actual.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* MOTIVOS DE CAMBIO DE DMT */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Motivos de Cambio de DMT</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={generalData.tratamiento_dmt.motivos_cambio_dmt}
                          dataKey="porcentaje"
                          nameKey="motivo"
                          cx="50%"
                          cy="45%" 
                          outerRadius={80}
                        >
                          {generalData.tratamiento_dmt.motivos_cambio_dmt.map((entry, index) => (
                            <Cell key={`cell-cambio-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}/>
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* RMN: ACTIVIDAD BIANUAL */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><ScatterChart className="h-5 w-5" /> RMN: Actividad Lesional Bianual</CardTitle>
                  <p className="text-xs text-muted-foreground">Pacientes con nuevas lesiones T2 o captación de Gd por semestre.</p>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={generalData.neuroimagen.actividad_rmn_bianual} stackOffset="none">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="semestre" />
                        <YAxis label={{ value: 'Pacientes', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="activos" fill="#ef4444" name="Activos (Gd+ / Nuevas T2)" stackId="a" />
                        <Bar dataKey="inactivos" fill="#06b6d4" name="Inactivos" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* TRATAMIENTOS DE SOPORTE Y MÉTODOS COMPLEMENTARIOS */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" /> Métodos Complementarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-b pb-4">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Punción Lumbar/LCR (Total)</span>
                        <span className="text-sm text-muted-foreground">{generalData.neuroimagen.conteo_lcr}/{generalData.resumen_general.total_pacientes}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        **{generalData.kpis_em.porcentaje_boc_positivas.toFixed(1)}%** con Bandas Oligoclonales Positivas.
                      </p>
                    </div>
                    <div className="border-b pb-4 last:border-b-0">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">RMN con Atrofia Reportada</span>
                        <span className="text-sm text-muted-foreground">{generalData.neuroimagen.porcentaje_atrofia_reportada.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: `${generalData.neuroimagen.porcentaje_atrofia_reportada}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Porcentaje de RMN con mención explícita de atrofia.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* TRATAMIENTOS DE SOPORTE */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tratamientos de Soporte Solicitados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={generalData.tratamiento_soporte}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="45%" 
                          outerRadius={90}
                          label={(props) =>
                            `${String(props.name).substring(0, 10)}: ${props.value}`
                          }
                        >
                          {generalData.tratamiento_soporte.map((entry, index) => (
                            <Cell key={`cell-soporte-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        
      </div>
    </MedicalLayout>
  )
}
