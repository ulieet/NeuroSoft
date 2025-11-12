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
import { ArrowLeft, Save, RefreshCw } from "lucide-react"

import { 
  obtenerPacientePorId, 
  modificarPaciente, 
  type Paciente 
} from "@/lib/almacen-datos"

function PaginaEditarPaciente() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pacienteId = Number(searchParams.get("id"))

  // El formulario se carga con un Paciente completo
  const [formData, setFormData] = useState<Paciente | null>(null)
  const [estaCargando, setEstaCargando] = useState(true)

  useEffect(() => {
    if (pacienteId) {
      const paciente = obtenerPacientePorId(pacienteId)
      if (paciente) {
        setFormData(paciente)
      }
      setEstaCargando(false)
    }
  }, [pacienteId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => (prev ? { ...prev, [id]: value } : null))
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => (prev ? { ...prev, [id]: value } : null))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData) return
    
    // Validación
    if (!formData.nombre || !formData.apellido || !formData.dni || !formData.fechaNacimiento || !formData.sexo || !formData.telefono || !formData.obraSocial) {
      alert("Por favor, complete todos los campos marcados con *")
      return
    }

    try {
      modificarPaciente(pacienteId, formData)
      alert("Paciente modificado con éxito")
      router.push(`/pacientes/detalle?id=${pacienteId}`) // Volvemos al detalle
    } catch (error) {
      console.error(error)
      alert("Error al modificar el paciente")
    }
  }

  if (estaCargando) {
    return (
      <MedicalLayout currentPage="pacientes">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2">Cargando paciente...</p>
        </div>
      </MedicalLayout>
    )
  }

  if (!formData) {
    return (
      <MedicalLayout currentPage="pacientes">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card>
            <CardHeader><CardTitle>Paciente no encontrado</CardTitle></CardHeader>
            <CardContent>
              <Button asChild><a href="/pacientes"><ArrowLeft className="mr-2 h-4 w-4" />Volver</a></Button>
            </CardContent>
          </Card>
        </div>
      </MedicalLayout>
    )
  }

  return (
    <MedicalLayout currentPage="pacientes">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Cabecera */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <a href={`/pacientes/detalle?id=${pacienteId}`}>
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-balance">Editar Paciente</h1>
              <p className="text-muted-foreground">Modificando a: {formData.apellido}, {formData.nombre}</p>
            </div>
          </div>

          {/* Formulario */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Información Personal */}
              <Card>
                <CardHeader>
                  <CardTitle>Información Personal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre *</Label>
                      <Input id="nombre" value={formData.nombre} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellido">Apellido *</Label>
                      <Input id="apellido" value={formData.apellido} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dni">DNI * (No editable)</Label>
                      <Input id="dni" value={formData.dni} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaNacimiento">Fecha de Nacimiento *</Label>
                      <Input id="fechaNacimiento" type="date" value={formData.fechaNacimiento} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sexo">Sexo *</Label>
                      <Select value={formData.sexo} onValueChange={(v) => handleSelectChange("sexo", v)} required>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Femenino">Femenino</SelectItem>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono *</Label>
                      <Input id="telefono" placeholder="11-2345-6789" value={formData.telefono} onChange={handleChange} required />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Información Médica */}
              <Card>
                <CardHeader>
                  <CardTitle>Información Médica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="obraSocial">Obra Social *</Label>
                      <Select value={formData.obraSocial} onValueChange={(v) => handleSelectChange("obraSocial", v)} required>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OSDE">OSDE</SelectItem>
                          <SelectItem value="Swiss Medical">Swiss Medical</SelectItem>
                          <SelectItem value="Galeno">Galeno</SelectItem>
                          <SelectItem value="Medicus">Medicus</SelectItem>
                          <SelectItem value="Particular">Particular</SelectItem>
                          <SelectItem value="Otra">Otra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numeroAfiliado">Número de Afiliado</Label>
                      <Input id="numeroAfiliado" value={formData.numeroAfiliado} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea id="observaciones" rows={4} value={formData.observaciones} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Acciones */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Acciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button type="submit" className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </Button>
                  <Button variant="outline" className="w-full bg-transparent" asChild>
                    <a href={`/pacientes/detalle?id=${pacienteId}`}>Cancelar</a>
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

// Envolvemos en Suspense para que useSearchParams funcione
export default function PaginaEditarPacienteSuspense() {
  return (
    <Suspense fallback={
      <MedicalLayout currentPage="pacientes">
         <div className="flex items-center justify-center min-h-[400px]">
           <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
      </MedicalLayout>
    }>
      <PaginaEditarPaciente />
    </Suspense>
  )
}