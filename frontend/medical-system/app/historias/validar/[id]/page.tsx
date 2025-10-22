"use client"

import { useState } from "react"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, FileText, User, Calendar, Stethoscope, Pill } from "lucide-react"

// Mock data - en una app real vendría de la base de datos
const mockHistoria = {
  id: 1,
  paciente: "González, María Elena",
  dni: "12.345.678",
  fechaConsulta: "2024-01-15",
  fechaImportacion: "2024-01-15",
  archivoOriginal: "historia_gonzalez_20240115.docx",
  datosExtraidos: {
    motivoConsulta:
      "Cefalea intensa de 3 días de evolución con características pulsátiles, acompañada de náuseas y fotofobia.",
    antecedentesFamiliares: "Madre con antecedentes de migraña. Padre hipertenso.",
    antecedentesPersonales: "Migraña desde los 20 años. Episodios mensuales. No alergias conocidas.",
    examenFisico:
      "Paciente consciente, orientada. Signos vitales normales. Examen neurológico sin alteraciones focales. Fondo de ojo normal.",
    sintomas: ["Cefalea pulsátil hemicraneal", "Náuseas", "Fotofobia", "Aura visual previa"],
    diagnostico: "Migraña con aura típica",
    tratamiento: "Sumatriptán 50mg vía oral para crisis aguda. Profilaxis con Topiramato 25mg/día. Control en 30 días.",
    observaciones: "Se indica diario de cefaleas. Evitar desencadenantes conocidos (estrés, ayuno prolongado).",
  },
}

export default function ValidarHistoriaPage() {
  const [formData, setFormData] = useState(mockHistoria.datosExtraidos)
  const [isEditing, setIsEditing] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSintomosChange = (value: string) => {
    const sintomas = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    setFormData((prev) => ({
      ...prev,
      sintomas,
    }))
  }

  const handleSave = () => {
    // Aquí se guardaría la historia validada
    console.log("Guardando historia validada:", formData)
    setIsEditing(false)
    // Redireccionar o mostrar mensaje de éxito
  }

  return (
    <MedicalLayout currentPage="historias">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <a href="/historias">
              <ArrowLeft className="h-4 w-4" />
            </a>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-balance">Validar Historia Clínica</h1>
            <p className="text-muted-foreground">Revisa y corrige los datos extraídos automáticamente</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Pendiente Validación</Badge>
            <Button onClick={() => setIsEditing(!isEditing)} variant="outline">
              {isEditing ? "Cancelar Edición" : "Editar"}
            </Button>
            <Button onClick={handleSave} disabled={!isEditing}>
              <Save className="mr-2 h-4 w-4" />
              Guardar Validación
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-6">
            {/* Patient Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información del Paciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Paciente</p>
                    <p className="text-base font-medium">{mockHistoria.paciente}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">DNI</p>
                    <p className="text-base font-mono">{mockHistoria.dni}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha Consulta</p>
                    <p className="text-base flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(mockHistoria.fechaConsulta).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clinical Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Datos Clínicos Extraídos
                </CardTitle>
                <CardDescription>Revisa y corrige la información extraída del documento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="motivoConsulta">Motivo de Consulta</Label>
                  {isEditing ? (
                    <Textarea
                      id="motivoConsulta"
                      value={formData.motivoConsulta}
                      onChange={(e) => handleInputChange("motivoConsulta", e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <div className="p-3 bg-muted rounded-lg text-sm">{formData.motivoConsulta}</div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="antecedentesFamiliares">Antecedentes Familiares</Label>
                    {isEditing ? (
                      <Textarea
                        id="antecedentesFamiliares"
                        value={formData.antecedentesFamiliares}
                        onChange={(e) => handleInputChange("antecedentesFamiliares", e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <div className="p-3 bg-muted rounded-lg text-sm">{formData.antecedentesFamiliares}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="antecedentesPersonales">Antecedentes Personales</Label>
                    {isEditing ? (
                      <Textarea
                        id="antecedentesPersonales"
                        value={formData.antecedentesPersonales}
                        onChange={(e) => handleInputChange("antecedentesPersonales", e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <div className="p-3 bg-muted rounded-lg text-sm">{formData.antecedentesPersonales}</div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="examenFisico">Examen Físico</Label>
                  {isEditing ? (
                    <Textarea
                      id="examenFisico"
                      value={formData.examenFisico}
                      onChange={(e) => handleInputChange("examenFisico", e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <div className="p-3 bg-muted rounded-lg text-sm">{formData.examenFisico}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sintomas">Síntomas (separados por comas)</Label>
                  {isEditing ? (
                    <Input
                      id="sintomas"
                      value={formData.sintomas.join(", ")}
                      onChange={(e) => handleSintomosChange(e.target.value)}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {formData.sintomas.map((sintoma, index) => (
                        <Badge key={index} variant="outline">
                          {sintoma}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diagnostico">Diagnóstico</Label>
                  {isEditing ? (
                    <Input
                      id="diagnostico"
                      value={formData.diagnostico}
                      onChange={(e) => handleInputChange("diagnostico", e.target.value)}
                    />
                  ) : (
                    <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-lg">
                      <p className="font-medium text-secondary-foreground">{formData.diagnostico}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tratamiento" className="flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Tratamiento
                  </Label>
                  {isEditing ? (
                    <Textarea
                      id="tratamiento"
                      value={formData.tratamiento}
                      onChange={(e) => handleInputChange("tratamiento", e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <div className="p-3 bg-muted rounded-lg text-sm">{formData.tratamiento}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  {isEditing ? (
                    <Textarea
                      id="observaciones"
                      value={formData.observaciones}
                      onChange={(e) => handleInputChange("observaciones", e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <div className="p-3 bg-muted rounded-lg text-sm">{formData.observaciones}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Información del Archivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Archivo Original</p>
                  <p className="text-sm flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {mockHistoria.archivoOriginal}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha Importación</p>
                  <p className="text-sm">{new Date(mockHistoria.fechaImportacion).toLocaleDateString("es-AR")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  <Badge variant="secondary">Pendiente Validación</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instrucciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold mt-0.5">
                    1
                  </div>
                  <p>Revisa cuidadosamente todos los datos extraídos</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold mt-0.5">
                    2
                  </div>
                  <p>Haz clic en "Editar" para corregir cualquier información incorrecta</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold mt-0.5">
                    3
                  </div>
                  <p>Guarda la validación para completar el proceso</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MedicalLayout>
  )
}
