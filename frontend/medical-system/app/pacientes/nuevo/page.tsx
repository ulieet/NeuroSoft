// frontend/medical-system/app/pacientes/nuevo/page.tsx

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation" 
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, RefreshCw } from "lucide-react"

// Usamos la API real
import { createPaciente } from "@/lib/api-pacientes"

export default function PaginaNuevoPaciente() {
  const router = useRouter()
  const [estaGuardando, setEstaGuardando] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    fecha_nacimiento: "",
    obra_social: "",
    nro_afiliado: "",
    observaciones: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, obra_social: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre || !formData.apellido || !formData.dni || !formData.fecha_nacimiento || !formData.obra_social) {
      alert("Por favor, complete todos los campos obligatorios (*)")
      return
    }

    setEstaGuardando(true)

    const payload = {
      nombre: `${formData.apellido}, ${formData.nombre}`, // Formato para el Detalle
      dni: formData.dni,
      fecha_nacimiento: formData.fecha_nacimiento,
      obra_social: formData.obra_social,
      nro_afiliado: formData.nro_afiliado,
      observaciones: formData.observaciones
    }

    const exito = await createPaciente(payload)
    
    if (exito) {
      alert("Paciente registrado con éxito")
      router.push(`/pacientes/detalle?id=${formData.dni}`) // Redirigir a su nueva ficha
    } else {
      alert("Error al guardar en el servidor")
      setEstaGuardando(false)
    }
  }

  return (
    <MedicalLayout currentPage="pacientes">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()} type="button">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Registrar Nuevo Paciente</h1>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle>Información Personal</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre *</Label>
                      <Input id="nombre" value={formData.nombre} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellido">Apellido *</Label>
                      <Input id="apellido" value={formData.apellido} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dni">DNI *</Label>
                      <Input id="dni" placeholder="Ej: 29371624" value={formData.dni} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</Label>
                      <Input id="fecha_nacimiento" type="date" value={formData.fecha_nacimiento} onChange={handleChange} required />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Cobertura Médica</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Obra Social *</Label>
                      <Select onValueChange={handleSelectChange}>
                        <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                        <SelectContent>
                          {["OSDE", "IOMA", "PAMI", "Swiss Medical", "Galeno", "Particular"].map(os => (
                            <SelectItem key={os} value={os}>{os}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nro_afiliado">Nro Afiliado</Label>
                      <Input id="nro_afiliado" value={formData.nro_afiliado} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea id="observaciones" rows={4} value={formData.observaciones} onChange={handleChange} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="sticky top-24">
                <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Button type="submit" className="w-full" disabled={estaGuardando}>
                    {estaGuardando ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Paciente
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