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
import { ArrowLeft, Save, RefreshCw, AlertCircle } from "lucide-react"

// IMPORTANTE: Usamos la API real
import { 
  getPaciente, 
  updatePaciente, 
  type PacienteBackend 
} from "@/lib/api-pacientes"

function PaginaEditarPaciente() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // El ID ahora es un String (DNI)
  const patientId = searchParams.get("id")

  const [formData, setFormData] = useState<Partial<PacienteBackend> | null>(null)
  const [estaCargando, setEstaCargando] = useState(true)
  const [estaGuardando, setEstaGuardando] = useState(false)

  useEffect(() => {
    if (patientId) {
      cargarDatos()
    }
  }, [patientId])

  const cargarDatos = async () => {
    setEstaCargando(true)
    try {
      const data = await getPaciente(patientId!)
      if (data) {
        setFormData(data)
      }
    } catch (error) {
      console.error("Error al cargar paciente:", error)
    } finally {
      setEstaCargando(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => (prev ? { ...prev, [id]: value } : null))
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => (prev ? { ...prev, [id]: value } : null))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData || !patientId) return
    
    setEstaGuardando(true)
    try {
      // Llamada a la API para actualizar el JSON en el backend
      const exito = await updatePaciente(patientId, formData)
      
      if (exito) {
        alert("Paciente modificado con éxito")
        router.push(`/pacientes/detalle?id=${patientId}`)
      } else {
        alert("No se pudieron guardar los cambios en el servidor")
      }
    } catch (error) {
      console.error(error)
      alert("Error crítico al modificar el paciente")
    } finally {
      setEstaGuardando(false)
    }
  }

  if (estaCargando) {
    return (
      <MedicalLayout currentPage="pacientes">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando datos del servidor...</p>
        </div>
      </MedicalLayout>
    )
  }

  if (!formData) {
    return (
      <MedicalLayout currentPage="pacientes">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <CardHeader>
            <CardTitle>Paciente no encontrado</CardTitle>
            <CardDescription>No existe un registro con el DNI: {patientId}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/pacientes")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al listado
            </Button>
          </CardContent>
        </div>
      </MedicalLayout>
    )
  }

  return (
    <MedicalLayout currentPage="pacientes">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Cabecera */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()} type="button">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Editar Ficha de Paciente</h1>
              <p className="text-muted-foreground font-mono text-sm">DNI: {formData.dni}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre Completo *</Label>
                    <Input id="nombre" value={formData.nombre || ""} onChange={handleChange} required />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                      <Input id="fecha_nacimiento" value={formData.fecha_nacimiento || ""} onChange={handleChange} placeholder="DD/MM/AAAA" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="obra_social">Obra Social</Label>
                      <Input id="obra_social" value={formData.obra_social || ""} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nro_afiliado">Número de Afiliado</Label>
                    <Input id="nro_afiliado" value={formData.nro_afiliado || ""} onChange={handleChange} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observaciones">Observaciones Internas</Label>
                    <Textarea 
                      id="observaciones" 
                      rows={5} 
                      value={formData.observaciones || ""} 
                      onChange={handleChange} 
                      placeholder="Notas sobre el paciente, antecedentes relevantes, etc."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Panel de Acciones Lateral */}
            <div className="space-y-6">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Guardar Cambios</CardTitle>
                  <CardDescription>La actualización afectará a todas las historias clínicas relacionadas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button type="submit" className="w-full" disabled={estaGuardando}>
                    {estaGuardando ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Actualizar Servidor
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => router.back()} type="button">
                    Cancelar
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

export default function PaginaEditarPacienteSuspense() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Cargando...</div>}>
      <PaginaEditarPaciente />
    </Suspense>
  )
}