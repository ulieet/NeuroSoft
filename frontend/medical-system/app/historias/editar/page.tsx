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
import { 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  Brain, 
  Pill, 
  FlaskConical, 
  Stethoscope, 
  ClipboardList, 
  TrendingUp, 
  User,
  Trash, // <-- Importado
  Plus   // <-- Importado
} from "lucide-react"

import {
  obtenerHistoriaClinicaPorId,
  obtenerPacientePorId,
  modificarHistoriaClinica, // <-- Función clave para editar
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

function PaginaEditarHistoria() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const historiaId = Number(searchParams.get("id"))

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [estaCargando, setEstaCargando] = useState(true)
  const [estaGuardando, setEstaGuardando] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState<Partial<HistoriaClinica>>({})
  // --- Estado de JSON eliminado ---
  // const [medicamentosJson, setMedicamentosJson] = useState("[]")

  useEffect(() => {
    if (historiaId) {
      const hist = obtenerHistoriaClinicaPorId(historiaId)
      if (hist) {
        // Aseguramos que los campos anidados existan
        setFormData({
          ...hist,
          medicamentos: hist.medicamentos || [], // Asegurar que sea un array
          estudiosComplementarios: hist.estudiosComplementarios || { puncionLumbar: false, examenLCR: false, texto: "" }
        });

        const pac = obtenerPacientePorId(hist.pacienteId)
        setPaciente(pac || null)
      }
      setEstaCargando(false)
    } else {
      setEstaCargando(false)
    }
  }, [historiaId])

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

  // --- NUEVOS HANDLERS PARA MEDICAMENTOS ---
  const handleMedicamentoChange = (index: number, field: 'droga' | 'dosis', value: string) => {
    setFormData(prev => {
      if (!prev || !prev.medicamentos) return prev;
      
      const nuevosMedicamentos = [...prev.medicamentos];
      const med = { ...nuevosMedicamentos[index] };
      
      if (field === 'droga') {
        med.droga = value;
      } else if (field === 'dosis') {
        med.dosis = value;
      }
      nuevosMedicamentos[index] = med;
      
      return { ...prev, medicamentos: nuevosMedicamentos };
    });
  };

  const addMedicamento = () => {
    setFormData(prev => ({
      ...prev,
      medicamentos: [
        ...(prev?.medicamentos || []),
        // Añadimos un objeto vacío (el tipo base soporta campos opcionales)
        { droga: "", dosis: "" } 
      ]
    }));
  };

  const removeMedicamento = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicamentos: prev?.medicamentos?.filter((_, i) => i !== index) || []
    }));
  };
  // --- FIN DE NUEVOS HANDLERS ---


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setEstaGuardando(true)

    // --- SUBMIT SIMPLIFICADO ---
    // Ya no se parsea JSON
    const datosActualizados = {
      ...formData,
      // 'medicamentos' ya está actualizado en formData
    }

    try {
      // Usamos la función de MODIFICAR
      modificarHistoriaClinica(historiaId, datosActualizados as HistoriaClinica)
      alert("Historia Clínica modificada con éxito")
      router.push(`/historias/detalle?id=${historiaId}`) // Volvemos al detalle
    } catch (error) {
      console.error(error)
      alert("Error al modificar la historia")
      setEstaGuardando(false)
    }
  }

  // --- Renderizado de Carga y Error ---
  if (estaCargando) {
    return (
      <MedicalLayout currentPage="historias">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2">Cargando historia...</p>
        </div>
      </MedicalLayout>
    )
  }

  if (!formData || !paciente) {
    return (
      <MedicalLayout currentPage="historias">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card>
            <CardHeader>
              <CardTitle>Historia no encontrada</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a href="/historias">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MedicalLayout>
    )
  }

  // --- Renderizado Principal ---
  return (
    <MedicalLayout currentPage="historias">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Cabecera */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <a href={`/historias/detalle?id=${historiaId}`}>
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-balance">Editar Historia Clínica</h1>
              <p className="text-muted-foreground">Modificando la consulta del {new Date(formData.fecha || "").toLocaleDateString("es-AR")}</p>
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
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pacienteNombre">Paciente</Label>
                    <Input 
                      id="pacienteNombre" 
                      value={`${paciente.apellido}, ${paciente.nombre} (DNI: ${paciente.dni})`} 
                      disabled 
                      className="font-medium"
                    />
                  </div>
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
                    <Input id="fechaInicioEnfermedad" type="date" value={formData.fechaInicioEnfermedad || ''} onChange={handleChange} />
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
                      value={formData.estudiosComplementarios?.texto || ''}
                      onChange={(e) => handleEstudioChange("texto", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card: Tratamiento --- MODIFICADO --- */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Pill className="h-5 w-5" />Tratamiento y Medicación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tratamiento">Otras Terapias / Comentario General</Label>
                    <Textarea id="tratamiento" placeholder="Indicaciones generales, fisioterapia, etc." rows={3} value={formData.tratamiento} onChange={handleChange} />
                  </div>
                  
                  {/* --- INICIO DE SECCIÓN DE MEDICAMENTOS DINÁMICA --- */}
                  <div className="space-y-4">
                    <Label>Medicamentos</Label>
                    
                    {/* Lista de medicamentos */}
                    <div className="space-y-3">
                      {formData.medicamentos?.map((med, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            id={`med-droga-${index}`}
                            placeholder="Nombre de la droga"
                            value={med.droga}
                            onChange={(e) => handleMedicamentoChange(index, 'droga', e.target.value)}
                            className="flex-1"
                            required // Droga es requerida si la fila existe
                          />
                          <Input
                            id={`med-dosis-${index}`}
                            placeholder="Dosis"
                            value={med.dosis || ""}
                            onChange={(e) => handleMedicamentoChange(index, 'dosis', e.target.value)}
                            className="w-1/3"
                          />
                          <Button
                            type="button" // Prevenir que envíe el formulario
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMedicamento(index)}
                            aria-label="Eliminar medicamento"
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Botón para añadir */}
                    <Button
                      type="button" // Prevenir que envíe el formulario
                      variant="outline"
                      size="sm"
                      onClick={addMedicamento}
                      className="mt-2"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Añadir Medicamento
                    </Button>
                  </div>
                  {/* --- FIN DE SECCIÓN DE MEDICAMENTOS DINÁMICA --- */}

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
                    {estaGuardando ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                  <Button variant="outline" className="w-full bg-transparent" asChild>
                    <a href={`/historias/detalle?id=${historiaId}`}>Cancelar</a>
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
export default function PaginaEditarHistoriaSuspenseWrapper() {
  return (
    <Suspense
      fallback={
        <MedicalLayout currentPage="historias">
          <div className="flex items-center justify-center min-h-[400px]">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </MedicalLayout>
      }
    >
      <PaginaEditarHistoria />
    </Suspense>
  )
}