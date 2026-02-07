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
import { useToast } from "@/components/ui/use-toast"
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
  obtenerHistoriasClinicas, 
  guardarHistoriasClinicas, 
  type HistoriaClinica,
  type Paciente,
  type Medicamento,
} from "@/lib/almacen-datos"

import { BASE_URL } from "@/lib/api-historias"

// --- HELPERS ---
const generarOpcionesEDSS = () => {
  const opciones = []
  for (let i = 0; i <= 10; i += 0.5) {
    opciones.push({ valor: i, etiqueta: i.toFixed(1) })
  }
  return opciones
}
const opcionesEDSS = generarOpcionesEDSS()

// --- COMPONENTE PRINCIPAL ---
function PaginaEditarHistoria() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const historiaId = searchParams.get("id") 
  const { toast } = useToast()

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [estaCargando, setEstaCargando] = useState(true)
  const [estaGuardando, setEstaGuardando] = useState(false);
  const [formData, setFormData] = useState<Partial<HistoriaClinica>>({})

  // --- 1. CARGA DE DATOS (Backend con Fallback a Local) ---
  useEffect(() => {
    if (!historiaId) {
      setEstaCargando(false)
      return
    }

    const cargarDatos = async () => {
      setEstaCargando(true)

      // A. Intentar cargar desde Backend (Python)
      try {
        const res = await fetch(`${BASE_URL}/historias/${historiaId}/borrador`)
        
        if (res.ok) {
          const data = await res.json()
          
          const fuenteDatos = data.validada || data.borrador || {}
          
          const pInfo = fuenteDatos.paciente || {}
          const enf = fuenteDatos.enfermedad || {}
          const cons = fuenteDatos.consulta || {}

          // Normalización de Nombre/Apellido
          let nombre = pInfo.nombre || ""
          let apellido = ""
          if (nombre && nombre.includes(",")) {
            const partes = nombre.split(",")
            apellido = partes[0].trim()
            nombre = partes[1].trim()
          } else if (nombre) {
            apellido = nombre 
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

          // Mapeo Backend -> Estado del Formulario
          setFormData({
            id: data.id,
            pacienteId: historiaId,
            fecha: (cons.fecha || "").split('T')[0], 
            
            // Diagnóstico
            diagnostico: enf.diagnostico || "",
            codigoDiagnostico: enf.codigo || "",
            formaEvolutiva: enf.forma || "",
            patologia: "Neurología", 
            
            // Evolución
            fechaInicioEnfermedad: (enf.fecha_inicio || "").split('T')[0],
            escalaEDSS: enf.edss,
            
            // --- CORRECCIÓN 1: Leer Estado y Criticidad correctamente ---
            // Normalizamos 'pendiente' a 'pendiente_validacion' para que el Select lo detecte
            estado: data.estado === "pendiente" ? "pendiente_validacion" : data.estado,
            // Priorizamos la criticidad de la raíz (guardada anteriormente) o del borrador
            nivelCriticidad: data.nivel_criticidad || fuenteDatos.nivel_criticidad || "medio",

            // Cuadro Clínico (Textos)
            sintomasPrincipales: fuenteDatos.secciones_texto?.sintomas_principales || fuenteDatos.texto_original || "",
            antecedentes: fuenteDatos.secciones_texto?.antecedentes || "",
            agrupacionSindromica: fuenteDatos.secciones_texto?.agrupacion_sindromica || "",
            examenFisico: fuenteDatos.secciones_texto?.examen_fisico || "",
            
            // Plan
            tratamiento: fuenteDatos.secciones_texto?.comentario || "", 

            // Medicamentos (Array)
            medicamentos: (fuenteDatos.tratamientos || []).map((t: any) => ({
              droga: t.molecula || t.droga || "",
              dosis: t.dosis || "",
              frecuencia: t.frecuencia || "",
              estado: "Activo"
            })),

            // Estudios
            estudiosComplementarios: {
              puncionLumbar: fuenteDatos.complementarios?.puncion_lumbar?.realizada || false,
              examenLCR: false,
              texto: fuenteDatos.complementarios?.rmn ? JSON.stringify(fuenteDatos.complementarios.rmn) : ""
            }
          })

          setEstaCargando(false)
          return 
        }
      } catch (error) {
        console.warn("Backend error, local fallback...", error)
      }

      // B. Fallback Local Storage (Si falla el backend)
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

  // --- HANDLERS DE CAMBIO ---
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

  // --- GESTIÓN DE MEDICAMENTOS (CRUD Array) ---
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

  // --- GUARDADO (Backend + Local Sync) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!historiaId) return;
    setEstaGuardando(true)

    // 1. Preparar Payload para api/historias.py
    const payloadBackend = {
      // --- CORRECCIÓN 2: Enviar explícitamente Estado y Criticidad ---
      estado: formData.estado, 
      nivel_criticidad: formData.nivelCriticidad, 
      
      paciente: {
        nombre: paciente ? `${paciente.apellido}, ${paciente.nombre}` : "",
        dni: paciente?.dni,
        obra_social: paciente?.obraSocial,
        nro_afiliado: paciente?.numeroAfiliado,
        fecha_nacimiento: paciente?.fechaNacimiento
      },
      enfermedad: {
        diagnostico: formData.diagnostico,
        codigo: formData.codigoDiagnostico,
        forma: formData.formaEvolutiva,
        fecha_inicio: formData.fechaInicioEnfermedad,
        edss: formData.escalaEDSS
      },
      consulta: {
        fecha: formData.fecha
      },
      secciones_texto: {
        sintomas_principales: formData.sintomasPrincipales,
        antecedentes: formData.antecedentes,
        agrupacion_sindromica: formData.agrupacionSindromica,
        examen_fisico: formData.examenFisico,
        comentario: formData.tratamiento 
      },
      tratamientos: formData.medicamentos?.map(m => ({
        droga: m.droga,
        dosis: m.dosis,
        frecuencia: m.frecuencia
      })),
      complementarios: {
        puncion_lumbar: { realizada: formData.estudiosComplementarios?.puncionLumbar }
      }
    };

    try {
      // 2. Enviar a Backend
      const res = await fetch(`${BASE_URL}/historias/${historiaId}/validacion`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBackend),
      });

      if (!res.ok) {
        throw new Error("Error al guardar en el servidor");
      }

      // 3. Actualizar Local Storage (Éxito)
      const historiasLocales = obtenerHistoriasClinicas();
      const index = historiasLocales.findIndex(h => h.id === historiaId);
      const historiaA_Guardar = { ...formData, id: historiaId } as HistoriaClinica;

      if (index >= 0) {
        historiasLocales[index] = historiaA_Guardar;
      } else {
        historiasLocales.push(historiaA_Guardar);
      }
      guardarHistoriasClinicas(historiasLocales);

      toast({
        title: "Guardado Exitoso",
        description: "La historia clínica ha sido validada en el servidor.",
      })
      
      // Redirigir al detalle
      setTimeout(() => {
        router.push(`/historias/detalle?id=${historiaId}`)
      }, 500)

    } catch (error) {
      console.error(error)
      toast({
        title: "Error de Conexión",
        description: "Se guardó una copia localmente, pero falló el servidor.",
        variant: "destructive"
      })
      
      // 4. Fallback: Guardar localmente aunque falle el back
      const historiasLocales = obtenerHistoriasClinicas();
      const index = historiasLocales.findIndex(h => h.id === historiaId);
      const historiaA_Guardar = { ...formData, id: historiaId } as HistoriaClinica;
      if (index >= 0) historiasLocales[index] = historiaA_Guardar;
      else historiasLocales.push(historiaA_Guardar);
      guardarHistoriasClinicas(historiasLocales);
      
      setEstaGuardando(false)
    }
  }

  // --- RENDER ---

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
          
          {/* Cabecera */}
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
            
            {/* COLUMNA IZQUIERDA (Datos Clínicos) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* 1. Datos Generales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Datos Generales</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fecha">Fecha de Emisión *</Label>
                    <Input id="fecha" type="date" value={formData.fecha} onChange={handleChange} required />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Cuadro Clínico (Textareas) */}
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

              {/* 3. Diagnóstico */}
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
              
              {/* 4. Índices Clave (EDSS) */}
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

              {/* 5. Plan Terapéutico (Medicamentos Dinámicos) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Pill className="h-5 w-5" />Plan Terapéutico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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

            {/* COLUMNA DERECHA (Datos de Estado / Sticky) */}
            <div className="space-y-6">
              <Card className="sticky top-24">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5" />Datos de la Consulta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select value={formData.estado} onValueChange={(v) => handleSelectChange("estado", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {/* CORRECCIÓN 3: Usar valor extendido para que coincida con el backend */}
                        <SelectItem value="pendiente_validacion">Pendiente</SelectItem>
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