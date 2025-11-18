"use client"

import { useState } from "react"
import { useRouter } from "next/navigation" 
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import { agregarPaciente, type Paciente } from "@/lib/almacen-datos"

export default function PaginaNuevoPaciente() {
  const router = useRouter()
  // Estado del formulario (sin email y direccion)
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    fechaNacimiento: "",
    sexo: "",
    telefono: "",
    // email: "", // ELIMINADO
    // direccion: "", // ELIMINADO
    obraSocial: "",
    numeroAfiliado: "",
    observaciones: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validación actualizada
    if (!formData.nombre || !formData.apellido || !formData.dni || !formData.fechaNacimiento || !formData.sexo || !formData.telefono || !formData.obraSocial) {
      alert("Por favor, complete todos los campos marcados con *")
      return
    }

    const nuevoPaciente: Omit<Paciente, "id"> = {
      ...formData,
      // Agregamos campos vacíos para que coincida con la interfaz
      email: "", 
      direccion: "",
      fechaRegistro: new Date().toISOString(),
    }

    try {
      agregarPaciente(nuevoPaciente)
      alert("Paciente registrado con éxito")
      router.push("/pacientes") 
    } catch (error) {
      console.error(error)
      alert("Error al registrar el paciente")
    }
  }

  return (
    <MedicalLayout currentPage="pacientes">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Cabecera */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <a href="/pacientes">
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-balance">Registrar Nuevo Paciente</h1>
              <p className="text-muted-foreground">Completa la información del paciente</p>
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
                      <Input id="nombre" placeholder="Ingrese el nombre" value={formData.nombre} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellido">Apellido *</Label>
                      <Input id="apellido" placeholder="Ingrese el apellido" value={formData.apellido} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dni">DNI *</Label>
                      <Input id="dni" placeholder="12.345.678" value={formData.dni} onChange={handleChange} required />
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
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione el sexo" />
                        </SelectTrigger>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione la obra social" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OSDE">OSDE</SelectItem>
                          <SelectItem value="OSPE">OSPE</SelectItem>
                          <SelectItem value="OSPSA">OSPSA</SelectItem>
                          <SelectItem value="OSPOCE">OSPOCE</SelectItem>
                          <SelectItem value="Swiss Medical">Swiss Medical</SelectItem>
                          <SelectItem value="Galeno">Galeno</SelectItem>
                          <SelectItem value="Medicus">Medicus</SelectItem>
                          <SelectItem value="IOMA">IOMA</SelectItem>
                          <SelectItem value="OSECAC">OSECAC</SelectItem>
                          <SelectItem value="UOCRA">UOCRA</SelectItem>
                          <SelectItem value="PAMI">PAMI</SelectItem>
                          <SelectItem value="Particular">Particular</SelectItem>
                          <SelectItem value="Otra">Otra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numeroAfiliado">Número de Afiliado</Label>
                      <Input id="numeroAfiliado" placeholder="Número de afiliado" value={formData.numeroAfiliado} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea id="observaciones" placeholder="Notas adicionales sobre el paciente..." rows={4} value={formData.observaciones} onChange={handleChange} />
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
                    Guardar Paciente
                  </Button>
                  <Button variant="outline" className="w-full bg-transparent" asChild>
                    <a href="/pacientes">Cancelar</a>
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