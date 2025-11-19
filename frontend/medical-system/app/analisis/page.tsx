// frontend/medical-system/app/analisis/page.tsx

"use client"

import { useState, useMemo } from "react"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { Download, TrendingUp } from 'lucide-react'

import { PacienteListadoSelector } from '@/app/pacientes/components/paciente-selector' 


// --- MOCK DE PACIENTES ---
const pacientesData = [
  {
    id: 1,
    nombre: "Juan García (EMRR - Switch)",
    historias: [
      { fecha: "2023-01-01", dmt: "Interferón Beta", edss: 2.0, tratamientosSoporte: ["Kinesiología"], tolerancia: true, motivo: "Inicio" },
      { fecha: "2023-08-15", dmt: "Interferón Beta", edss: 2.5, tratamientosSoporte: ["Kinesiología"], tolerancia: false, motivo: "Intolerancia" },
      { fecha: "2024-03-20", dmt: "Fingolimod", edss: 2.0, tratamientosSoporte: ["Terapia Cognitiva"], tolerancia: true, motivo: "Switch por Intolerancia Previa" },
    ]
  },
  {
    id: 2,
    nombre: "María López (EMSP - Progresión)",
    historias: [
      { fecha: "2023-02-01", dmt: "Natalizumab", edss: 5.5, tratamientosSoporte: ["Fisioterapia"], tolerancia: true, motivo: "Inicio" },
      { fecha: "2023-08-01", dmt: "Natalizumab", edss: 6.0, tratamientosSoporte: ["Fisioterapia", "Fonoaudiología"], tolerancia: true, motivo: "Progresión (EDSS 6.0)" },
      { fecha: "2024-03-01", dmt: "Ocrelizumab", edss: 6.5, tratamientosSoporte: ["Fisioterapia", "Fonoaudiología"], tolerancia: true, motivo: "Switch por Falla Terapéutica" },
    ]
  },
  {
    id: 3,
    nombre: "Carlos Rodríguez (EMRR - Estable)",
    historias: [
      { fecha: "2023-05-20", dmt: "Teriflunomida", edss: 1.5, tratamientosSoporte: ["Rehabilitación"], tolerancia: true, motivo: "Inicio" },
      { fecha: "2024-01-10", dmt: "Teriflunomida", edss: 1.5, tratamientosSoporte: ["Rehabilitación"], tolerancia: true, motivo: "Estable" },
    ]
  },
]


export default function AnalisisPage() {

  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<number | null>(null)
  
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


  // === LÓGICA DE ANÁLISIS ===
  const analisisPaciente = useMemo(() => {
    if (!pacienteSeleccionado) return null
    
    const paciente = pacientesData.find(p => p.id === pacienteSeleccionado)
    if (!paciente) return null

    const historias = paciente.historias.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    
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

    let cambiosDMT = 0
    let intolerancia = 0
    for (let i = 1; i < historias.length; i++) {
      if (historias[i].dmt !== historias[i - 1].dmt) cambiosDMT++
      if (!historias[i].tolerancia) intolerancia++
    }

    const tratamientosSoporte = [...new Set(historias.flatMap(h => h.tratamientosSoporte))]

    return {
      dmtConFechas,
      progresionEDSS,
      cambiosDMT,
      intolerancia,
      tratamientosSoporte,
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
                        <TrendingUp className="h-4 w-4" /> Progresión EDSS
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analisisPaciente.progresionEDSS}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="fecha" />
                            <YAxis domain={[0, 7]} />
                            <Tooltip />
                            <Line type="monotone" dataKey="edss" stroke="#0ea5e9" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>


                  {/* TABLA DE HISTÓRICO DE DMT */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Histórico de Terapias DMT</CardTitle>
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
                        <CardTitle className="text-lg">Tratamientos de Soporte</CardTitle>
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
