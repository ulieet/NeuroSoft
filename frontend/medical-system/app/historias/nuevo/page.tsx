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
import { ArrowLeft, Save, RefreshCw, Brain, Pill, FlaskConical, User, TrendingUp, ClipboardList } from "lucide-react"

import {
  obtenerPacientePorId, 
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
  
  // Nuevos campos iniciales vacíos
  sintomasPrincipales: "",
  antecedentes: "",
  agrupacionSindromica: "",
  
  examenFisico: "",
  estudiosComplementarios: { puncionLumbar: false, examenLCR: false, texto: "" },
  tratamiento: "", // Esto ahora será la justificación
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

  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null) 
  const [estaGuardando, setEstaGuardando] = useState(false)
  const [estaCargando, setEstaCargando] = useState(true)
  
  // Estado del formulario
  const [formData, setFormData] = useState<Partial<HistoriaClinica>>(estadoInicialHistoria)
  
  // Estado para medicamentos como string simple (separado por comas)
  const [medicamentosInput, setMedicamentosInput] = useState("")

  useEffect(() => {
    if (!pacienteIdParam) {
      router.replace("/pacientes?redirect_to=nueva_historia")
      return
    }
    
    // --- CORRECCIÓN: Ya no convertimos a Number ---
    // El ID se maneja como string directamente
    const pac = obtenerPacientePorId(pacienteIdParam)
    
    if (pac) {
      setPacienteSeleccionado(pac)
      // Asignamos el ID string directamente
      setFormData((prev) => ({ ...prev, pacienteId: pacienteIdParam }))
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

    if (!formData.pacienteId) {
      alert("Error: No hay paciente seleccionado.")
      setEstaGuardando(false)
      return
    }

    // Convertir string de medicamentos (separado por comas) a array de objetos
    const listaMedicamentos: Medicamento[] = medicamentosInput
      .split(",")
      .map(item => item.trim())
      .filter(item => item !== "")
      .map(nombre => ({
        droga: nombre,
        dosis: "",     // Valor por defecto
        estado: "Activo" // Valor por defecto
      }))

    const datosCompletos = {
      ...estadoInicialHistoria, 
      ...formData,
      medicamentos: listaMedicamentos,
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

  if (estaCargando) {
    return (
      <MedicalLayout currentPage="historias">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2">Cargando datos del paciente...</p>
        </div>
      </MedicalLayout>
    )
  }

  if (!pacienteSeleccionado) {
     // Fallback visual por si el redirect falla o tarda
     return null;
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
              <h1 className="text-2xl font-bold text-balance">Crear Resumen de Historia Clínica</h1>
              <p className="text-muted-foreground">Formulario para auditoría y solicitud de medicamentos</p>
            </div>
          </div>

          {/* Formulario */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Columna Izquierda (Campos) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Card: Paciente y Consulta */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Datos Generales</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pacienteNombre">Paciente *</Label>
                    <Input 
                      id="pacienteNombre" 
                      value={`${pacienteSeleccionado.apellido}, ${pacienteSeleccionado.nombre} (DNI: ${pacienteSeleccionado.dni})`} 
                      disabled 
                      className="font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fecha">Fecha de Emisión *</Label>
                    <Input id="fecha" type="date" value={formData.fecha} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medico">Médico Firmante</Label>
                    <Input id="medico" value={formData.medico} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>

              {/* Card: Cuadro Clínico */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Cuadro Clínico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* SÍNTOMAS PRINCIPALES (Ex Anamnesis) */}
                  <div className="space-y-2">
                    <Label htmlFor="sintomasPrincipales">Síntomas Principales / Enfermedad Actual</Label>
                    <Textarea id="sintomasPrincipales" placeholder="Describa los brotes, remisiones y síntomas actuales..." rows={5} value={formData.sintomasPrincipales} onChange={handleChange} />
                  </div>

                  {/* ANTECEDENTES */}
                  <div className="space-y-2">
                    <Label htmlFor="antecedentes">Antecedentes (Personales/Familiares)</Label>
                    <Textarea id="antecedentes" placeholder="Antecedentes relevantes..." rows={2} value={formData.antecedentes} onChange={handleChange} />
                  </div>

                  {/* AGRUPACIÓN SINDRÓMICA */}
                  <div className="space-y-2">
                    <Label htmlFor="agrupacionSindromica">Agrupación Sindrómica</Label>
                    <Textarea id="agrupacionSindromica" placeholder="Ej: Piramidalismo, Sensitivo, etc." rows={2} value={formData.agrupacionSindromica} onChange={handleChange} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="examenFisico">Examen Físico</Label>
                    <Textarea id="examenFisico" placeholder="Hallazgos del examen físico..." rows={3} value={formData.examenFisico} onChange={handleChange} />
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
                    <Input id="diagnostico" placeholder="Ej: Esclerosis Múltiple (OMS 340)" value={formData.diagnostico} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patologia">Categoría</Label>
                    <Input id="patologia" placeholder="Ej: Desmielinizante" value={formData.patologia} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="codigoDiagnostico">Código (CIE-10)</Label>
                    <Input id="codigoDiagnostico" placeholder="Ej: G35" value={formData.codigoDiagnostico} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="formaEvolutiva">Forma Evolutiva</Label>
                    <Input id="formaEvolutiva" placeholder="Ej: Recaídas y remisiones" value={formData.formaEvolutiva} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>
              
              {/* Card: Evolución y EDSS */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Evolución</CardTitle>
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
                    <Label htmlFor="evolucion">Resumen de Evolución</Label>
                    <Textarea id="evolucion" placeholder="Estabilidad clínica, recaídas recientes..." rows={3} value={formData.evolucion} onChange={handleChange} />
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
                  <div className="space-y-2">
                    <Label htmlFor="estudiosTexto">Notas (RMN, Laboratorios, Potenciales)</Label>
                    <Textarea
                      id="estudiosTexto"
                      placeholder="Detalles de RMN, laboratorio de rutina, bandas oligoclonales..."
                      rows={4}
                      value={formData.estudiosComplementarios?.texto}
                      onChange={(e) => handleEstudioChange("texto", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card: Tratamiento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Pill className="h-5 w-5" />Plan Terapéutico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Comentario Justificación (Crucial en los docs) */}
                  <div className="space-y-2">
                    <Label htmlFor="tratamiento">Comentario / Justificación Médica</Label>
                    <CardDescription>
                        Texto legal/médico justificando la continuidad del tratamiento.
                    </CardDescription>
                    <Textarea id="tratamiento" placeholder="El paciente debe continuar sin interrupción..." rows={4} value={formData.tratamiento} onChange={handleChange} />
                  </div>
                  
                  {/* INPUT SIMPLE PARA MEDICAMENTOS (Solicito) */}
                  <div className="space-y-2">
                    <Label htmlFor="medicamentosInput">Medicación Solicitada</Label>
                    <CardDescription>
                      Ingresa los medicamentos separados por comas.
                    </CardDescription>
                    <Input
                      id="medicamentosInput"
                      placeholder="Ej: Rebif 44mcg, Ibuprofeno"
                      value={medicamentosInput}
                      onChange={(e) => setMedicamentosInput(e.target.value)}
                    />
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
                        <SelectItem value="pendiente">Borrador</SelectItem>
                        <SelectItem value="validada">Finalizado</SelectItem>
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
                        <SelectItem value="critico">Crítico (Urgente)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={estaGuardando}>
                    <Save className="mr-2 h-4 w-4" />
                    {estaGuardando ? "Guardando..." : "Guardar Resumen"}
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