"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  Brain, 
  Pill, 
  ClipboardList, 
  TrendingUp, 
  User,
  Trash, 
  Plus,
  Activity,
  History,
  Stethoscope
} from "lucide-react"

import {
  obtenerHistoriaClinicaPorId,
  obtenerPacientePorId,
  obtenerHistoriasClinicas, // Importado para el fix de guardado
  guardarHistoriasClinicas, // Importado para el fix de guardado
  type HistoriaClinica,
  type Paciente,
  type Medicamento,
  type EstudioComplementario,
} from "@/lib/almacen-datos"

import { BASE_URL } from "@/lib/api-historias"

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
  const historiaId = searchParams.get("id") 

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [estaCargando, setEstaCargando] = useState(true)
  const [estaGuardando, setEstaGuardando] = useState(false);
  const [formData, setFormData] = useState<Partial<HistoriaClinica>>({})

  // --- EFECTO DE CARGA DE DATOS ---
  useEffect(() => {
    if (!historiaId) {
      setEstaCargando(false)
      return
    }

    const cargarDatos = async () => {
      setEstaCargando(true)

      // 1. INTENTO: Cargar desde Backend
      try {
        const res = await fetch(`${BASE_URL}/historias/${historiaId}/borrador`)
        
        if (res.ok) {
          const data = await res.json()
          const borrador = data.borrador || {}
          const pInfo = borrador.paciente || {}
          const enf = borrador.enfermedad || {}
          const cons = borrador.consulta || {}

          // Construir objeto Paciente visual
          let nombre = pInfo.nombre || ""
          let apellido = ""
          if (nombre.includes(",")) {
            const partes = nombre.split(",")
            apellido = partes[0].trim()
            nombre = partes[1].trim()
          }

          setPaciente({
            id: historiaId,
            nombre,
            apellido,
            dni: pInfo.dni || "",
            fechaNacimiento: pInfo.fecha_nacimiento || "",
            sexo: "", telefono: "", email: "", direccion: "", 
            obraSocial: pInfo.obra_social || "", 
            numeroAfiliado: pInfo.nro_afiliado || "", 
            fechaRegistro: "", observaciones: ""
          })

          // Mapear datos
          setFormData({
            id: data.id,
            pacienteId: historiaId,
            fecha: (cons.fecha || "").split('T')[0], 
            
            // Diagnóstico Completo
            diagnostico: enf.diagnostico || "",
            codigoDiagnostico: enf.codigo || "",
            formaEvolutiva: enf.forma || "",
            patologia: "Neurología", 
            
            // Evolución
            fechaInicioEnfermedad: (enf.fecha_inicio || "").split('T')[0],
            escalaEDSS: enf.edss,
            
            // Estado y Criticidad
            estado: data.estado === "pendiente_validacion" ? "pendiente" : data.estado,
            nivelCriticidad: "medio",

            // Cuadro Clínico
            sintomasPrincipales: borrador.secciones_texto?.sintomas_principales || borrador.texto_original || "",
            antecedentes: borrador.secciones_texto?.antecedentes || "",
            agrupacionSindromica: borrador.secciones_texto?.agrupacion_sindromica || "",
            examenFisico: borrador.secciones_texto?.examen_fisico || "",
            
            // Tratamiento
            tratamiento: borrador.secciones_texto?.comentario || "", // Justificación

            // Medicamentos
            medicamentos: (borrador.tratamientos || []).map((t: any) => ({
              droga: t.molecula || t.droga || "",
              dosis: t.dosis || "",
              frecuencia: t.frecuencia || "",
              estado: "Activo"
            })),

            // Estudios
            estudiosComplementarios: {
              puncionLumbar: borrador.complementarios?.puncion_lumbar?.realizada || false,
              examenLCR: false,
              texto: borrador.complementarios?.rmn ? JSON.stringify(borrador.complementarios.rmn) : ""
            }
          })

          setEstaCargando(false)
          return 
        }
      } catch (error) {
        console.warn("Backend error, local fallback...", error)
      }

      // 2. INTENTO: Local Storage
      const hist = obtenerHistoriaClinicaPorId(historiaId)
      if (hist) {
        setFormData({
          ...hist,
          medicamentos: hist.medicamentos || [],
          estudiosComplementarios: hist.estudiosComplementarios || { puncionLumbar: false, examenLCR: false, texto: "" },
          codigoDiagnostico: hist.codigoDiagnostico || "",
          formaEvolutiva: hist.formaEvolutiva || "",
          nivelCriticidad: hist.nivelCriticidad || "medio"
        });

        const pac = obtenerPacientePorId(hist.pacienteId)
        setPaciente(pac || null)
      }
      
      setEstaCargando(false)
    }

    cargarDatos()
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

  // --- FIX DE GUARDADO ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!historiaId) return;
    setEstaGuardando(true)

    try {
      // 1. Obtenemos todas las historias locales
      const historiasLocales = obtenerHistoriasClinicas();
      
      // 2. Buscamos si ya existe esta historia (por si viene del backend y es la primera vez que se edita)
      const index = historiasLocales.findIndex(h => h.id === historiaId);

      // 3. Preparamos el objeto completo
      const historiaA_Guardar = { ...formData } as HistoriaClinica;
      // Aseguramos que el ID no se pierda
      historiaA_Guardar.id = historiaId; 

      if (index >= 0) {
        // Si existe, actualizamos
        historiasLocales[index] = historiaA_Guardar;
      } else {
        // Si NO existe (era solo backend), la agregamos manualmente preservando el ID
        historiasLocales.push(historiaA_Guardar);
      }

      // 4. Guardamos todo el array en LocalStorage
      guardarHistoriasClinicas(historiasLocales);

      alert("Historia Clínica guardada con éxito")
      router.push(`/historias/detalle?id=${historiaId}`)
    } catch (error) {
      console.error(error)
      alert("Error al guardar la historia")
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

  if (!formData.id || !paciente) {
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
              <h1 className="text-2xl font-bold">Editar Historia Clínica</h1>
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
                  {/* Se elimina el campo Medico según solicitud */}
                </CardContent>
              </Card>

              {/* Cuadro Clínico */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Cuadro Clínico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sintomasPrincipales">Síntomas Principales / Enfermedad Actual</Label>
                    <Textarea id="sintomasPrincipales" rows={5} value={formData.sintomasPrincipales || ""} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="antecedentes" className="flex items-center gap-2"><History className="w-3 h-3" /> Antecedentes</Label>
                    <Textarea id="antecedentes" rows={2} value={formData.antecedentes || ""} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agrupacionSindromica" className="flex items-center gap-2"><Activity className="w-3 h-3" /> Agrupación Sindrómica</Label>
                    <Textarea id="agrupacionSindromica" rows={2} value={formData.agrupacionSindromica || ""} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="examenFisico">Examen Físico</Label>
                    <Textarea id="examenFisico" rows={3} value={formData.examenFisico || ""} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>

              {/* Diagnóstico Completo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" />Diagnóstico</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="diagnostico">Diagnóstico Principal *</Label>
                    <Input id="diagnostico" value={formData.diagnostico || ""} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="codigoDiagnostico">Código (CIE-10)</Label>
                    <Input id="codigoDiagnostico" value={formData.codigoDiagnostico || ""} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="formaEvolutiva">Forma Evolutiva</Label>
                    <Input id="formaEvolutiva" value={formData.formaEvolutiva || ""} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patologia">Categoría</Label>
                    <Input id="patologia" value={formData.patologia || ""} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>
              
              {/* Índices Clave */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Índices Clave</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fechaInicioEnfermedad">Fecha Inicio Síntomas</Label>
                    <Input id="fechaInicioEnfermedad" type="date" value={formData.fechaInicioEnfermedad || ""} onChange={handleChange} />
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Pill className="h-5 w-5" />Plan Terapéutico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Etiqueta corregida */}
                  <div className="space-y-2">
                    <Label htmlFor="tratamiento">Comentario / Justificación Médica</Label>
                    <Textarea id="tratamiento" rows={4} value={formData.tratamiento || ""} onChange={handleChange} />
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

            {/* Columna Derecha: Datos de la Consulta (Ex Acciones) */}
            <div className="space-y-6">
              <Card className="sticky top-24">
                <CardHeader>
                    {/* Título corregido */}
                    <CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5" />Datos de la Consulta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select value={formData.estado} onValueChange={(v) => handleSelectChange("estado", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="validada">Validada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nivelCriticidad">Nivel de Criticidad</Label>
                    <Select value={formData.nivelCriticidad} onValueChange={(v) => handleSelectChange("nivelCriticidad", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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