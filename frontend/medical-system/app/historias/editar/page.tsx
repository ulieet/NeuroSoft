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
  ClipboardList, 
  TrendingUp, 
  User,
  Trash, 
  Plus   
} from "lucide-react"

import {
  obtenerHistoriaClinicaPorId,
  obtenerPacientePorId,
  modificarHistoriaClinica, 
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
  
  // --- CORRECCIÓN CLAVE ---
  // Capturamos el ID como string, ya no usamos Number()
  const historiaId = searchParams.get("id") 

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [estaCargando, setEstaCargando] = useState(true)
  const [estaGuardando, setEstaGuardando] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState<Partial<HistoriaClinica>>({})

  useEffect(() => {
    if (historiaId) {
      // historiaId ya es string aquí
      const hist = obtenerHistoriaClinicaPorId(historiaId) 
      if (hist) {
        setFormData({
          ...hist,
          medicamentos: hist.medicamentos || [],
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

  // --- Handlers ---
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

  const handleMedicamentoChange = (index: number, field: keyof Medicamento, value: string) => {
    setFormData(prev => {
      if (!prev || !prev.medicamentos) return prev;
      const nuevosMedicamentos = [...prev.medicamentos];
      nuevosMedicamentos[index] = { ...nuevosMedicamentos[index], [field]: value };
      return { ...prev, medicamentos: nuevosMedicamentos };
    });
  };

  const addMedicamento = () => {
    setFormData(prev => ({
      ...prev,
      medicamentos: [...(prev?.medicamentos || []), { droga: "", dosis: "", estado: "Activo" }]
    }));
  };

  const removeMedicamento = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicamentos: prev?.medicamentos?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!historiaId) return;
    setEstaGuardando(true)

    try {
      // Enviamos el historiaId como string
      modificarHistoriaClinica(historiaId, formData as HistoriaClinica)
      alert("Historia Clínica modificada con éxito")
      router.push(`/historias/detalle?id=${historiaId}`)
    } catch (error) {
      console.error(error)
      alert("Error al modificar la historia")
      setEstaGuardando(false)
    }
  }

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

  if (!formData || !paciente || !historiaId) {
    return (
      <MedicalLayout currentPage="historias">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card>
            <CardHeader><CardTitle>Historia no encontrada</CardTitle></CardHeader>
            <CardContent>
              <Button asChild>
                <a href="/historias"><ArrowLeft className="mr-2 h-4 w-4" />Volver</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MedicalLayout>
    )
  }

  return (
    <MedicalLayout currentPage="historias">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <a href={`/historias/detalle?id=${historiaId}`}><ArrowLeft className="h-4 w-4" /></a>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Editar Resumen de Historia</h1>
              <p className="text-muted-foreground">Paciente: {paciente.apellido}, {paciente.nombre}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Datos Generales</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

              {/* Sincronización con campos de Nueva Historia */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Cuadro Clínico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sintomasPrincipales">Síntomas Principales / Enfermedad Actual</Label>
                    <Textarea id="sintomasPrincipales" rows={5} value={formData.sintomasPrincipales} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="antecedentes">Antecedentes</Label>
                    <Textarea id="antecedentes" rows={2} value={formData.antecedentes} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agrupacionSindromica">Agrupación Sindrómica</Label>
                    <Textarea id="agrupacionSindromica" rows={2} value={formData.agrupacionSindromica} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="examenFisico">Examen Físico</Label>
                    <Textarea id="examenFisico" rows={3} value={formData.examenFisico} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>

              {/* Diagnóstico y Evolución */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" />Diagnóstico</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="diagnostico">Diagnóstico Principal *</Label>
                    <Input id="diagnostico" value={formData.diagnostico} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patologia">Categoría</Label>
                    <Input id="patologia" value={formData.patologia} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>
              
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
                      <SelectTrigger><SelectValue placeholder="N/A" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="na">N/A</SelectItem>
                        {opcionesEDSS.map(op => (
                          <SelectItem key={op.valor} value={String(op.valor)}>{op.etiqueta}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="evolucion">Resumen de Evolución</Label>
                    <Textarea id="evolucion" rows={3} value={formData.evolucion} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Pill className="h-5 w-5" />Plan Terapéutico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tratamiento">Justificación Médica</Label>
                    <Textarea id="tratamiento" rows={4} value={formData.tratamiento} onChange={handleChange} />
                  </div>
                  
                  <div className="space-y-4">
                    <Label>Medicación Solicitada</Label>
                    <div className="space-y-3">
                      {formData.medicamentos?.map((med, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input placeholder="Droga" value={med.droga} onChange={(e) => handleMedicamentoChange(index, 'droga', e.target.value)} className="flex-1" required />
                          <Input placeholder="Dosis" value={med.dosis || ""} onChange={(e) => handleMedicamentoChange(index, 'dosis', e.target.value)} className="w-1/3" />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeMedicamento(index)}>
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addMedicamento} className="mt-2">
                      <Plus className="mr-2 h-4 w-4" /> Añadir Medicamento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Acciones */}
            <div className="space-y-6">
              <Card className="sticky top-24">
                <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select value={formData.estado} onValueChange={(v) => handleSelectChange("estado", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Borrador</SelectItem>
                        <SelectItem value="validada">Finalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={estaGuardando}>
                    <Save className="mr-2 h-4 w-4" />
                    {estaGuardando ? "Guardando..." : "Guardar Cambios"}
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

export default function PaginaEditarHistoriaSuspenseWrapper() {
  return (
    <Suspense fallback={<MedicalLayout currentPage="historias"><div className="flex items-center justify-center min-h-[400px]"><RefreshCw className="h-8 w-8 animate-spin" /></div></MedicalLayout>}>
      <PaginaEditarHistoria />
    </Suspense>
  )
}