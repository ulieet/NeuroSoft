"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save, RefreshCw, Brain, Pill, FlaskConical, Stethoscope, ClipboardList, TrendingUp, User } from "lucide-react"

import {
  obtenerPacientePorId, // Actualizado
  agregarHistoriaClinica,
  type HistoriaClinica,
  type Paciente,
  type Medicamento,
  type EstudioComplementario,
} from "@/lib/almacen-datos"

// Helper para generar el desplegable de EDSS
const generarOpcionesEDSS = () => {
  const opciones = []
  for (let i = 0; i <= 10; i += 0.5) {
    opciones.push({ valor: i, etiqueta: i.toFixed(1) })
  }
  return opciones
}
const opcionesEDSS = generarOpcionesEDSS()

// --- Estado Inicial de la Historia ---
const estadoInicialHistoria: Partial<HistoriaClinica> = {
  fecha: new Date().toISOString().split("T")[0], 
  diagnostico: "",
  escalaEDSS: undefined,
  estado: "pendiente", 
  medico: "Dr. Rodríguez", 
  motivoConsulta: "",
  anamnesis: "",
  examenFisico: "",
  estudiosComplementarios: { puncionLumbar: false, examenLCR: false, texto: "" },
  tratamiento: "",
  evolucion: "",
  fechaImportacion: new Date().toISOString(),
  medicamentos: [],
  patologia: "",
  nivelCriticidad: "medio",
}


function PaginaNuevaHistoria() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pacienteIdParam = searchParams.get("pacienteId")

  // --- ESTADO PARA MOSTRAR EL NOMBRE ---
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null) 
  const [estaGuardando, setEstaGuardando] = useState(false)
  const [estaCargando, setEstaCargando] = useState(true)
  
  // Estado del formulario
  const [formData, setFormData] = useState<Partial<HistoriaClinica>>(estadoInicialHistoria)
  // Estado para el JSON de medicamentos
  const [medicamentosJson, setMedicamentosJson] = useState("[]")

  useEffect(() => {
    // Si no hay ID en la URL, redirigir al selector
    if (!pacienteIdParam) {
      router.replace("/pacientes?redirect_to=nueva_historia")
      return
    }
    
    const idNum = Number(pacienteIdParam)
    if (isNaN(idNum)) {
      alert("ID de paciente inválido")
      router.replace("/pacientes?redirect_to=nueva_historia")
      return
    }

    const pac = obtenerPacientePorId(idNum)
    if (pac) {
      setPacienteSeleccionado(pac)
      setFormData((prev) => ({ ...prev, pacienteId: idNum }))
    } else {
      alert("Paciente no encontrado")
      router.replace("/pacientes?redirect_to=nueva_historia")
    }
    setEstaCargando(false)

  }, [pacienteIdParam, router])

  // --- Handlers del Formulario ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string) => {
    if (id === "escalaEDSS" && value === "na") {
      setFormData((prev) => ({ ...prev, escalaEDSS: undefined }))
      return
    }
    const valorNumerico = ["escalaEDSS"]
    if (valorNumerico.includes(id)) {
      setFormData((prev) => ({ ...prev, [id]: Number(value) }))
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }))
    }
  }

  const handleEstudioChange = (id: keyof EstudioComplementario, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      estudiosComplementarios: {
        ...(prev?.estudiosComplementarios || { puncionLumbar: false, examenLCR: false, texto: "" }),
        [id]: value,
      },
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setEstaGuardando(true)

    // La validación del ID ya se hizo en el useEffect
    if (!formData.pacienteId) {
      alert("Error: No hay paciente seleccionado.")
      setEstaGuardando(false)
      return
    }

    let medicamentosParseados: Medicamento[] = []
    try {
      medicamentosParseados = JSON.parse(medicamentosJson)
    } catch {
      alert("El formato JSON de los medicamentos es inválido. Por favor, corrígelo.")
      setEstaGuardando(false)
      return
    }

    const datosCompletos = {
      ...estadoInicialHistoria, 
      ...formData,
      medicamentos: medicamentosParseados,
    }

    try {
      const nuevaHistoria = agregarHistoriaClinica(datosCompletos as Omit<HistoriaClinica, "id">)
      alert("Historia Clínica creada con éxito")
      router.push(`/historias/detalle?id=${nuevaHistoria.id}`)
    } catch (error) {
      console.error(error)
      alert("Error al crear la historia")
      setEstaGuardando(false)
    }
  }

  // --- Renderizado de Carga ---
  if (estaCargando || !pacienteSeleccionado) {
    return (
      <MedicalLayout currentPage="historias">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2">Cargando datos del paciente...</p>
        </div>
      </MedicalLayout>
    )
  }

  return (
    <MedicalLayout currentPage="historias">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Cabecera */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <a href={"/pacientes?redirect_to=nueva_historia"}>
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-balance">Crear Nueva Historia Clínica</h1>
              <p className="text-muted-foreground">Complete el formulario para registrar una nueva consulta</p>
            </div>
          </div>

          {/* Formulario */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Columna Izquierda (Campos) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Card: Paciente y Consulta */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Paciente y Consulta</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* --- CAMPO DE PACIENTE (MODIFICADO) --- */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pacienteNombre">Paciente *</Label>
                    <Input 
                      id="pacienteNombre" 
                      value={`${pacienteSeleccionado.apellido}, ${pacienteSeleccionado.nombre} (DNI: ${pacienteSeleccionado.dni})`} 
                      disabled 
                      className="font-medium"
                    />
                    <CardDescription>
                      Para cambiar de paciente, <a href="/pacientes?redirect_to=nueva_historia" className="text-primary underline">vuelve a la selección</a>.
                    </CardDescription>
                  </div>
                  {/* --- FIN DE MODIFICACIÓN --- */}

                  <div className="space-y-2">
                    <Label htmlFor="fecha">Fecha de Consulta *</Label>
                    <Input id="fecha" type="date" value={formData.fecha} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medico">Médico Tratante</Label>
                    <Input id="medico" value={formData.medico} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>

              {/* Card: Anamnesis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Anamnesis y Examen Físico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="motivoConsulta">Motivo de Consulta</Label>
                    <Textarea id="motivoConsulta" placeholder="Motivo principal..." value={formData.motivoConsulta} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="anamnesis">Anamnesis / Síntomas</Label>
                    <Textarea id="anamnesis" placeholder="Detalle de síntomas, etc." rows={5} value={formData.anamnesis} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="examenFisico">Examen Físico</Label>
                    <Textarea id="examenFisico" placeholder="Resultados del examen físico" rows={3} value={formData.examenFisico} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>

              {/* Card: Diagnóstico */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" />Diagnóstico</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="diagnostico">Diagnóstico Principal *</Label>
                    <Input id="diagnostico" placeholder="Ej: Migraña con aura" value={formData.diagnostico} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patologia">Patología (Categoría)</Label>
                    <Input id="patologia" placeholder="Ej: Migraña" value={formData.patologia} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="codigoDiagnostico">Código (CIE-10)</Label>
                    <Input id="codigoDiagnostico" placeholder="Ej: G43.1" value={formData.codigoDiagnostico} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="formaEvolutiva">Forma Evolutiva</Label>
                    <Input id="formaEvolutiva" placeholder="Ej: Recaída" value={formData.formaEvolutiva} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>
              
              {/* Card: Evolución y EDSS */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Evolución y Escalas</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fechaInicioEnfermedad">Fecha Inicio Síntomas</Label>
                    <Input id="fechaInicioEnfermedad" type="date" value={formData.fechaInicioEnfermedad} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="escalaEDSS">Grado Discapacidad (EDSS)</Label>
                    <Select value={formData.escalaEDSS !== undefined ? String(formData.escalaEDSS) : "na"} onValueChange={(v) => handleSelectChange("escalaEDSS", v)}>
                      <SelectTrigger id="escalaEDSS"><SelectValue placeholder="N/A" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="na">N/A</SelectItem>
                        {opcionesEDSS.map(op => (
                          <SelectItem key={op.valor} value={String(op.valor)}>
                            {op.etiqueta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="evolucion">Evolución</Label>
                    <Textarea id="evolucion" placeholder="Comentarios sobre la evolución..." rows={3} value={formData.evolucion} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>

              {/* Card: Estudios */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5" />Estudios Complementarios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="puncionLumbar"
                      checked={formData.estudiosComplementarios?.puncionLumbar}
                      onCheckedChange={(checked) => handleEstudioChange("puncionLumbar", !!checked)}
                    />
                    <Label htmlFor="puncionLumbar" className="font-normal">Punción Lumbar</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="examenLCR"
                      checked={formData.estudiosComplementarios?.examenLCR}
                      onCheckedChange={(checked) => handleEstudioChange("examenLCR", !!checked)}
                    />
                    <Label htmlFor="examenLCR" className="font-normal">Examen LCR</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estudiosTexto">Notas (RMN, Laboratorios, etc.)</Label>
                    <Textarea
                      id="estudiosTexto"
                      placeholder="Detalles de otros estudios..."
                      rows={3}
                      value={formData.estudiosComplementarios?.texto}
                      onChange={(e) => handleEstudioChange("texto", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card: Tratamiento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Pill className="h-5 w-5" />Tratamiento y Medicación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tratamiento">Otras Terapias / Comentario General</Label>
                    <Textarea id="tratamiento" placeholder="Indicaciones generales, fisioterapia, etc." rows={3} value={formData.tratamiento} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medicamentosJson">Medicamentos (Formato JSON)</Label>
                   <CardDescription>
  Formato: [{`{"droga": "Ejemplo", "dosis": "10mg"}`}]
</CardDescription>



                    <Textarea
                      id="medicamentosJson"
                      placeholder='[{"droga": "SumaTriptan", "dosis": "50mg"}]'
                      rows={5}
                      value={medicamentosJson}
                      onChange={(e) => setMedicamentosJson(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="observacionesMedicacion">Observaciones (Medicación)</Label>
                    <Textarea id="observacionesMedicacion" placeholder="Efectos, adherencia..." rows={2} value={formData.observacionesMedicacion} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Columna Derecha (Acciones) */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Acciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select value={formData.estado} onValueChange={(v) => handleSelectChange("estado", v)}>
                      <SelectTrigger id="estado"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="validada">Validada</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nivelCriticidad">Nivel de Criticidad</Label>
                    <Select value={formData.nivelCriticidad} onValueChange={(v) => handleSelectChange("nivelCriticidad", v)}>
                      <SelectTrigger id="nivelCriticidad"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bajo">Bajo</SelectItem>
                        <SelectItem value="medio">Medio</SelectItem>
                        <SelectItem value="alto">Alto</SelectItem>
                        <SelectItem value="critico">Crítico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={estaGuardando}>
                    <Save className="mr-2 h-4 w-4" />
                    {estaGuardando ? "Guardando..." : "Guardar Historia"}
                  </Button>
                  <Button variant="outline" className="w-full bg-transparent" asChild>
                    <a href={"/pacientes?redirect_to=nueva_historia"}>Cancelar</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>
    </MedicalLayout>
  )
}

// Envolvemos el componente principal en Suspense
export default function PaginaNuevaHistoriaSuspenseWrapper() {
  return (
    <Suspense
      fallback={
        <MedicalLayout currentPage="historias">
          <div className="flex items-center justify-center min-h-[400px]">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2">Cargando formulario...</p>
          </div>
        </MedicalLayout>
      }
    >
      <PaginaNuevaHistoria />
    </Suspense>
  )
}