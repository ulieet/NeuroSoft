"use client"

import { useState, useMemo } from "react"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { Download, TrendingUp, Clock, AlertTriangle, Pill } from 'lucide-react'

import { PacienteListadoSelector } from '@/app/pacientes/components/paciente-selector' 

const pacientesData = [
  {
    id: 1,
    nombre: "Juan García (EMRR - Switch)",
    historias: [
      { fecha: "2022-01-01", dmt: "Interferón Beta", edss: 2.0, tratamientosSoporte: ["Kinesiología"], tolerancia: true, motivo: "Inicio" },
      { fecha: "2022-06-01", dmt: "Interferón Beta", edss: 2.0, tratamientosSoporte: ["Kinesiología"], tolerancia: false, motivo: "Intolerancia" },
      { fecha: "2022-07-15", dmt: "Glatiramer", edss: 2.0, tratamientosSoporte: [], tolerancia: true, motivo: "Switch" },
      // Aquí salta a 2.5 después de probar 2 drogas
      { fecha: "2023-08-15", dmt: "Fingolimod", edss: 2.5, tratamientosSoporte: ["Kinesiología"], tolerancia: true, motivo: "Progresión" },
      { fecha: "2024-03-20", dmt: "Fingolimod", edss: 2.5, tratamientosSoporte: ["Terapia Cognitiva"], tolerancia: true, motivo: "Control" },
    ]
  },
  {
    id: 2,
    nombre: "María López (EMSP - Progresión Rápida)",
    historias: [
      { fecha: "2023-01-01", dmt: "Natalizumab", edss: 5.0, tratamientosSoporte: ["Fisioterapia"], tolerancia: true, motivo: "Inicio" },
      { fecha: "2023-06-01", dmt: "Natalizumab", edss: 5.5, tratamientosSoporte: ["Fisioterapia"], tolerancia: true, motivo: "Empeoramiento" },
      { fecha: "2023-12-01", dmt: "Ocrelizumab", edss: 6.0, tratamientosSoporte: ["Fisioterapia", "Fonoaudiología"], tolerancia: false, motivo: "Falla/Progresión" },
      { fecha: "2024-03-01", dmt: "Rituximab", edss: 6.5, tratamientosSoporte: ["Silla de ruedas"], tolerancia: true, motivo: "Switch" },
    ]
  },
]

// Función auxiliar para diferencia de meses
function diffMeses(fecha1: Date, fecha2: Date) {
    let meses = (fecha2.getFullYear() - fecha1.getFullYear()) * 12;
    meses -= fecha1.getMonth();
    meses += fecha2.getMonth();
    return meses <= 0 ? 0 : meses;
}

export default function AnalisisPage() {

  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<number | null>(null)
  
  // === LÓGICA DE ANÁLISIS ===
  const analisisPaciente = useMemo(() => {
    if (!pacienteSeleccionado) return null
    
    const paciente = pacientesData.find(p => p.id === pacienteSeleccionado)
    if (!paciente) return null

    // Ordenar cronológicamente
    const historias = [...paciente.historias].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    
    // 1. Datos básicos para tabla y gráfico
    const dmtConFechas = historias.map(h => ({
      dmt: h.dmt,
      fecha: new Date(h.fecha).toLocaleDateString('es-AR'),
      edss: h.edss,
      tolerancia: h.tolerancia,
      estado: h.tolerancia ? 'Tolerado' : 'Intolerancia',
      motivo: h.motivo
    }))

    const progresionEDSS = historias.map(h => ({
      fecha: new Date(h.fecha).toLocaleDateString('es-AR'),
      edss: h.edss,
    }))

    // 2. Cálculo Global
    let cambiosDMT = 0
    let intolerancia = 0
    for (let i = 1; i < historias.length; i++) {
      if (historias[i].dmt !== historias[i - 1].dmt) cambiosDMT++
      if (!historias[i].tolerancia) intolerancia++
    }
    // Revisar la primera historia también por intolerancia
    if (!historias[0].tolerancia) intolerancia++;

    const tratamientosSoporte = [...new Set(historias.flatMap(h => h.tratamientosSoporte))]

    // 3. NUEVO: Análisis de Intervalos de Progresión (EDSS a EDSS)
    // Agrupamos los periodos donde el EDSS se mantuvo o cambió
    const intervalos = [];
    
    // Si no hay historias, no hay intervalos
    if (historias.length > 0) {
        let edssInicial = historias[0].edss;
        let fechaInicio = new Date(historias[0].fecha);
        let dmtsEnIntervalo = new Set([historias[0].dmt]);
        let intoleranciasEnIntervalo = historias[0].tolerancia ? 0 : 1;
        
        for (let i = 1; i < historias.length; i++) {
            const h = historias[i];
            const fechaActual = new Date(h.fecha);

            // Si el EDSS cambia, cerramos el intervalo anterior
            if (h.edss !== edssInicial) {
                const meses = diffMeses(fechaInicio, fechaActual);
                intervalos.push({
                    cambio: `EDSS ${edssInicial} → ${h.edss}`,
                    tiempo: meses < 1 ? "< 1 mes" : `${meses} meses`,
                    dmtsUsados: Array.from(dmtsEnIntervalo).join(", "),
                    cantidadCambios: dmtsEnIntervalo.size > 0 ? dmtsEnIntervalo.size - 1 : 0, // -1 porque 1 es el base
                    intolerancias: intoleranciasEnIntervalo,
                    severidad: h.edss > edssInicial ? 'empeoro' : 'mejoro'
                });

                // Reset para el nuevo intervalo
                edssInicial = h.edss;
                fechaInicio = fechaActual;
                dmtsEnIntervalo = new Set([h.dmt]);
                intoleranciasEnIntervalo = h.tolerancia ? 0 : 1;
            } else {
                // Si el EDSS se mantiene, acumulamos datos del intervalo
                dmtsEnIntervalo.add(h.dmt);
                if (!h.tolerancia) intoleranciasEnIntervalo++;
            }
        }
        
        // Agregamos el intervalo final (hasta el presente/último registro)
        // Opcional: mostrar "Estable en X desde..."
        const ultimaFecha = new Date(historias[historias.length-1].fecha);
        const mesesFinales = diffMeses(fechaInicio, ultimaFecha);
        if (mesesFinales > 0) {
             intervalos.push({
                cambio: `Estable en EDSS ${edssInicial}`,
                tiempo: `${mesesFinales} meses (actual)`,
                dmtsUsados: Array.from(dmtsEnIntervalo).join(", "),
                cantidadCambios: dmtsEnIntervalo.size > 0 ? dmtsEnIntervalo.size - 1 : 0,
                intolerancias: intoleranciasEnIntervalo,
                severidad: 'neutral'
            });
        }
    }

    return {
      dmtConFechas,
      progresionEDSS,
      cambiosDMT,
      intolerancia,
      tratamientosSoporte,
      intervalos, // <--- Dato nuevo
      totalHistorias: historias.length
    }
  }, [pacienteSeleccionado])


  const exportarReporte = (formato: string) => {
    console.log(`Exportando reporte individual en formato ${formato}`)
  }


  return (
    <MedicalLayout currentPage="analisis">
      <div className="space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold">Análisis de Progresión por Paciente</h1>
          <p className="text-muted-foreground mt-2">
            Seguimiento individual de la progresión EDSS, cambios de terapias y tratamientos de soporte.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Opciones de Reporte</CardTitle>
          </CardHeader>
          <CardContent>
          
            <div className="mt-4 flex gap-2">
              <Button onClick={() => exportarReporte("pdf")} disabled={!analisisPaciente}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF individual
              </Button>
            </div>
          </CardContent>
        </Card>


        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Análisis Individualizado</h2>

          {!pacienteSeleccionado ? (
            
            <PacienteListadoSelector
              onSelectPaciente={setPacienteSeleccionado}
              selectedPacienteId={pacienteSeleccionado}
            />

          ) : (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">
                Detalles para {pacientesData.find(p => p.id === pacienteSeleccionado)?.nombre}
              </h3>

              <Button 
                variant="outline"
                onClick={() => setPacienteSeleccionado(null)}
              >
                ← Seleccionar Otro Paciente
              </Button>

              {analisisPaciente && (
                <>

                  {/* TARJETAS RESUMEN */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Historias Registradas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analisisPaciente.totalHistorias}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Cambios de DMT</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                          {analisisPaciente.cambiosDMT}
                        </div>
                        <p className="text-xs text-muted-foreground">Cantidad de switches de terapia.</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Reportes de Intolerancia</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {analisisPaciente.intolerancia}
                        </div>
                        <p className="text-xs text-muted-foreground">Casos de efectos adversos.</p>
                      </CardContent>
                    </Card>
                  </div>


                  {/* GRÁFICO EDSS */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Curva de Discapacidad (EDSS)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analisisPaciente.progresionEDSS}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="fecha" />
                            <YAxis domain={[0, 10]} ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} />
                            <Tooltip />
                            <Line type="stepAfter" dataKey="edss" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4}} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* NUEVA SECCIÓN: ANÁLISIS DE INTERVALOS (Lo que pediste) */}
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5" /> Análisis de Intervalos (Hitos EDSS)
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Detalle de tiempo, medicación e intolerancias entre cambios de discapacidad.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cambio EDSS</TableHead>
                                    <TableHead>Tiempo Transcurrido</TableHead>
                                    <TableHead>Medicamentos en el lapso</TableHead>
                                    <TableHead className="text-center">Intolerancias</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analisisPaciente.intervalos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            No hay suficientes datos para calcular intervalos de progresión.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    analisisPaciente.intervalos.map((intervalo, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-bold">
                                                <div className="flex items-center gap-2">
                                                    {intervalo.severidad === 'empeoro' && <TrendingUp className="h-4 w-4 text-red-500" />}
                                                    {intervalo.severidad === 'mejoro' && <TrendingUp className="h-4 w-4 text-green-500 rotate-180" />}
                                                    {intervalo.cambio}
                                                </div>
                                            </TableCell>
                                            <TableCell>{intervalo.tiempo}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm">{intervalo.dmtsUsados}</span>
                                                    {intervalo.cantidadCambios > 0 && (
                                                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded w-fit">
                                                            {intervalo.cantidadCambios} cambio(s)
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {intervalo.intolerancias > 0 ? (
                                                    <div className="flex items-center justify-center gap-1 text-red-600 font-medium">
                                                        <AlertTriangle className="h-4 w-4" />
                                                        {intervalo.intolerancias}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                  </Card>

                  {/* TABLA DE HISTÓRICO RAW (DMT) */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><Pill className="h-5 w-5"/> Histórico Detallado de Terapias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>DMT</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead className="text-center">EDSS</TableHead>
                              <TableHead>Motivo / Estado</TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {analisisPaciente.dmtConFechas.map((med, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{med.dmt}</TableCell>
                                <TableCell className="text-muted-foreground">{med.fecha}</TableCell>
                                <TableCell className="text-center font-semibold">{med.edss.toFixed(1)}</TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                      med.tolerancia
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {med.motivo || med.estado}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>


                  {/* TRATAMIENTOS DE SOPORTE */}
                  {analisisPaciente.tratamientosSoporte.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Tratamientos de Soporte Recibidos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {analisisPaciente.tratamientosSoporte.map((t) => (
                            <span
                              key={t}
                              className="inline-block bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-sm"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                </>
              )}

            </div>
          )}

        </div>

      </div>
    </MedicalLayout>
  )
}