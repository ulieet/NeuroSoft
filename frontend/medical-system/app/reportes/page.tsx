"use client"

import { useState, useEffect } from "react"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts"
import { Download, Users, FileText, Clock, FlaskConical, TrendingUp, ScatterChart, Shield, Activity, BrainCircuit } from 'lucide-react'

// --- Tipos de Datos Actualizados ---

type MotivoDMTEntry = { motivo: string; porcentaje: number; color: string };
type SoporteEntry = { name: string; value: number; color: string };

// Nuevo tipo para el gráfico cruzado (Forma vs Terapia)
type FormaTerapiaEntry = {
  forma: string;          // Eje X: "RR", "SP", "PP"
  alta_eficacia: number;  // Stack 1
  moderada: number;       // Stack 2
  sin_tratamiento: number;// Stack 3
};

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
    // CAMBIO: Datos para gráfico apilado
    relacion_forma_terapia: FormaTerapiaEntry[]; 
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
    // CAMBIO: Ahora son períodos bianuales (2 años)
    actividad_rmn_bianual: { periodo: string; activos: number; inactivos: number }[];
  };
  tratamiento_soporte: SoporteEntry[];
}

// --- MOCK DATA ACTUALIZADO (Simulando respuesta del backend) ---
// En producción, esto vendría del JSON o API real.
const MOCK_DATA_CORREGIDO: GeneralReportData = {
  resumen_general: {
    total_pacientes: 247,
    historias_registradas: 1429,
    promedio_edad_diagnostico: 32.4,
    promedio_edad_actual: 45.1,
    porcentaje_femenino: 68.5
  },
  kpis_em: {
    pacientes_neda3: 0.42,
    arr_promedio: 0.28,
    tiempo_a_edss_6_0_promedio: 18.5,
    porcentaje_boc_positivas: 85.2
  },
  discapacidad_y_progression: {
    // NUEVO: Cruce de Forma Evolutiva vs Terapia
    relacion_forma_terapia: [
      { forma: "Recaída-Remisión", alta_eficacia: 80, moderada: 45, sin_tratamiento: 10 },
      { forma: "Secundaria Prog.", alta_eficacia: 20, moderada: 15, sin_tratamiento: 30 },
      { forma: "Primaria Prog.", alta_eficacia: 15, moderada: 5, sin_tratamiento: 25 },
      { forma: "Sindrome Clínico Aislado", alta_eficacia: 5, moderada: 10, sin_tratamiento: 2 }
    ],
    edss_progresion_historica: []
  },
  tratamiento_dmt: {
    uso_dmt_actual: [
      { dmt: "Ocrelizumab", pacientes: 65, color: "#0ea5e9" },
      { dmt: "Natalizumab", pacientes: 40, color: "#22c55e" },
      { dmt: "Fingolimod", pacientes: 35, color: "#eab308" },
      { dmt: "Rituximab", pacientes: 30, color: "#f97316" },
      { dmt: "Interferones", pacientes: 25, color: "#64748b" },
      { dmt: "Cladribina", pacientes: 20, color: "#8b5cf6" },
    ],
    motivos_cambio_dmt: [
      { motivo: "Falla Terapéutica", porcentaje: 45, color: "#ef4444" },
      { motivo: "Efectos Adversos", porcentaje: 25, color: "#f97316" },
      { motivo: "Planificación Embarazo", porcentaje: 15, color: "#8b5cf6" },
      { motivo: "Conveniencia/Adherencia", porcentaje: 10, color: "#22c55e" },
      { motivo: "JCV Positivo", porcentaje: 5, color: "#0ea5e9" },
    ]
  },
  neuroimagen: {
    conteo_lcr: 189,
    conteo_rmn_total: 850,
    porcentaje_atrofia_reportada: 32.5,
    // CORREGIDO: Períodos Bienales (cada 2 años)
    actividad_rmn_bianual: [
      { periodo: "2018-2019", activos: 45, inactivos: 120 },
      { periodo: "2020-2021", activos: 38, inactivos: 145 },
      { periodo: "2022-2023", activos: 25, inactivos: 180 },
      { periodo: "2024-Actual", activos: 15, inactivos: 210 },
    ]
  },
  tratamiento_soporte: [
    { name: "Kinesiología Motora", value: 85, color: "#0ea5e9" },
    { name: "Rehabilitación Cognitiva", value: 45, color: "#8b5cf6" },
    { name: "Terapia Ocupacional", value: 30, color: "#22c55e" },
    { name: "Fonoaudiología", value: 20, color: "#f97316" },
    { name: "Psicología", value: 55, color: "#eab308" },
  ]
};

const useGeneralReportData = () => {
  const [data, setData] = useState<GeneralReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulamos carga (en el futuro esto será fetch al backend)
    setTimeout(() => {
        setData(MOCK_DATA_CORREGIDO);
        setLoading(false);
    }, 500);
  }, []);

  return { data, loading };
}

export default function ReportesPage() {
  const { data: generalData, loading } = useGeneralReportData(); 
  
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

  if (!generalData) return null;

  return (
    <MedicalLayout currentPage="reportes">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-balance">Reportes Generales de Cohorte (EM)</h1>
          <p className="text-muted-foreground mt-2">Métricas clave y estadísticas para la gestión de la cohorte de Esclerosis Múltiple.</p>
        </div>

        {/* KPI CARDS (Sin cambios, ya estaban bien) */}
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
                <CardTitle className="text-sm font-medium text-green-700">NEDA-3 (2 Años)</CardTitle>
                <FlaskConical className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-green-700">{(generalData.kpis_em.pacientes_neda3 * 100).toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Sin actividad de enfermedad en últimos 24 meses.</p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ARR Promedio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{generalData.kpis_em.arr_promedio.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Tasa Anualizada de Recaídas.</p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tiempo a EDSS 6.0</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{generalData.kpis_em.tiempo_a_edss_6_0_promedio.toFixed(1)} años</div>
                <p className="text-xs text-muted-foreground">Progresión a discapacidad moderada.</p>
            </CardContent>
            </Card>
        </div>

        {/* SECCIÓN 1: FORMAS EVOLUTIVAS Y TRATAMIENTOS (Mejorada) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* NUEVO GRÁFICO: Formas Evolutivas vs Terapia */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5" /> Formas Evolutivas y Terapia
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Distribución de tratamientos según fenotipo clínico.</p>
                </CardHeader>
                <CardContent>
                    <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                            data={generalData.discapacidad_y_progression.relacion_forma_terapia}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                            <XAxis dataKey="forma" tick={{fontSize: 12}} />
                            <YAxis tick={{fontSize: 12}} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                            <Bar dataKey="alta_eficacia" name="Alta Eficacia" stackId="a" fill="#0ea5e9" />
                            <Bar dataKey="moderada" name="Eficacia Moderada" stackId="a" fill="#64748b" />
                            <Bar dataKey="sin_tratamiento" name="Sin Tratamiento/Soporte" stackId="a" fill="#cbd5e1" />
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Uso General de DMTs */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5" /> Distribución Global de DMTs</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                        data={generalData.tratamiento_dmt.uso_dmt_actual} 
                        margin={{ top: 10, right: 20, left: 20, bottom: 40 }}
                        >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                            dataKey="dmt" 
                            angle={-25} 
                            textAnchor="end" 
                            height={60} 
                            interval={0} 
                            style={{ fontSize: '11px' }}
                        />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`${value} pacientes`, 'Total']} />
                        <Bar dataKey="pacientes" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
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

        {/* SECCIÓN 2: RMN BIANUAL Y CAMBIOS DE MEDICACIÓN */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* CORREGIDO: Actividad RMN Bianual */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5" /> Actividad Lesional Bianual
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Pacientes con actividad (Gd+ o nuevas T2) por período de 2 años.</p>
                </CardHeader>
                <CardContent>
                    <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                        data={generalData.neuroimagen.actividad_rmn_bianual} 
                        stackOffset="none"
                        margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                        >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="periodo" style={{ fontSize: '12px' }} />
                        <YAxis style={{ fontSize: '12px' }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar dataKey="activos" fill="#ef4444" name="Activos (Brotes/RMN+)" stackId="a" />
                        <Bar dataKey="inactivos" fill="#22c55e" name="NEDA (Sin Actividad)" stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

             {/* Motivos de Cambio */}
             <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Motivos de Cambio de DMT</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                        <Pie
                          data={generalData.tratamiento_dmt.motivos_cambio_dmt}
                          dataKey="porcentaje"
                          nameKey="motivo"
                          cx="50%"
                          cy="50%" 
                          outerRadius={75}
                        >
                          {generalData.tratamiento_dmt.motivos_cambio_dmt.map((entry, index) => (
                            <Cell key={`cell-cambio-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}/>
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
        </div>

        {/* SECCIÓN 3: MÉTODOS COMPLEMENTARIOS Y SOPORTE */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" /> Métodos Complementarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Punción Lumbar */}
                    <div className="border-b pb-4">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Punción Lumbar / LCR (Total)</span>
                        <span className="text-sm font-bold">{generalData.neuroimagen.conteo_lcr} / {generalData.resumen_general.total_pacientes}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(generalData.neuroimagen.conteo_lcr / generalData.resumen_general.total_pacientes) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        El {generalData.kpis_em.porcentaje_boc_positivas.toFixed(1)}% de las muestras resultaron positivas para Bandas Oligoclonales (BOC).
                      </p>
                    </div>

                    {/* Atrofia */}
                    <div className="pb-2">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">RMN con Atrofia Reportada</span>
                        <span className="text-sm font-bold">{generalData.neuroimagen.porcentaje_atrofia_reportada.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: `${generalData.neuroimagen.porcentaje_atrofia_reportada}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">Historias clínicas que mencionan explícitamente "atrofia cortical" o "pérdida de volumen".</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* TRATAMIENTOS DE SOPORTE (Kinesio, etc) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tratamientos de Soporte Solicitados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Pie
                          data={generalData.tratamiento_soporte}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%" 
                          outerRadius={80} 
                          label={false}
                        >
                          {generalData.tratamiento_soporte.map((entry, index) => (
                            <Cell key={`cell-soporte-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '11px'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
      </div>
    </MedicalLayout>
  )
}