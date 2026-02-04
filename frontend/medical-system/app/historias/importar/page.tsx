"use client"

import type React from "react"
import { useState } from "react"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from "lucide-react"

// CAMBIO 1: Agregamos fileObject para guardar el archivo binario real
interface UploadedFile {
  id: string
  name: string
  size: number
  status: "pending" | "processing" | "completed" | "error"
  progress: number
  fileObject: File // <--- Importante: Aquí guardamos el archivo real para enviarlo
  extractedData?: {
    paciente: string
    fecha: string
    diagnostico: string
    sintomas: string[]
    tratamiento: string
  }
  error?: string
}

export default function ImportarHistoriasPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      handleFiles(selectedFiles)
    }
  }

  const handleFiles = (fileList: File[]) => {
    const newFiles: UploadedFile[] = fileList.map((file) => {
      // 1. Validamos la extensión AQUÍ MISMO
      const name = file.name.toLowerCase();
      const esValido = name.endsWith(".doc") || name.endsWith(".docx") || name.endsWith(".pdf");

      return {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        // 2. Si es válido queda 'pending', si no, pasa directo a 'error'
        status: esValido ? "pending" : "error",
        progress: 0,
        fileObject: file,
        // 3. Mensaje de error explicativo si falla
        error: esValido ? undefined : "Error: Formato no permitido. Solo .doc, .docx o .pdf"
      };
    })

    setFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id))
  }

  // CAMBIO 2 y 3: Lógica real de procesamiento con Fetch al Backend
  const processFiles = async () => {
    setIsProcessing(true)

    for (const file of files) {
      if (file.status === "pending") {
        // 1. Actualizar estado a procesando
        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: "processing", progress: 50 } : f)))

        try {
          // 2. Preparar el envío del archivo
          const formData = new FormData()
          formData.append("file", file.fileObject) // 'file' debe coincidir con el parámetro en FastAPI

          // 3. Llamada al Backend (FastAPI)
          const response = await fetch("http://127.0.0.1:8000/importaciones/historias", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            // Manejar error si el backend responde 4xx o 5xx (ej. Duplicado 409)
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.detail || "Error al procesar en el servidor")
          }

          const backendData = await response.json()
          console.log("Respuesta Backend:", backendData)

          // 4. Mapear la respuesta del Backend a la estructura del Frontend
          // Nota: Ajusta estas claves según lo que devuelva exactamente tu 'borrador' de FastAPI
          const mappedData = {
            paciente: backendData.borrador?.paciente?.nombre || "No detectado",
            fecha: backendData.borrador?.consulta?.fecha || "No detectada",
            diagnostico: backendData.borrador?.diagnostico || "No detectado",
            // Si el backend devuelve array de sintomas, úsalo, si no, array vacío
            sintomas: backendData.borrador?.sintomas || [], 
            // Convertimos la lista de medicamentos a string si viene como array
            tratamiento: Array.isArray(backendData.borrador?.tratamientos) 
              ? backendData.borrador.tratamientos.map((t: any) => `${t.molecula} ${t.dosis || ''}`).join(", ") 
              : "No detectado"
          }

          // 5. Marcar como completado con datos reales
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? {
                    ...f,
                    status: "completed",
                    progress: 100,
                    extractedData: mappedData,
                  }
                : f,
            ),
          )
        } catch (error: any) {
          console.error("Error subiendo archivo:", error)
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? {
                    ...f,
                    status: "error",
                    progress: 0,
                    error: error.message || "Error de conexión",
                  }
                : f,
            ),
          )
        }
      }
    }

    setIsProcessing(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completado</Badge>
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Procesando</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Pendiente</Badge>
    }
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
          <div>
            <h1 className="text-2xl font-bold text-balance">Importar Historias Clínicas</h1>
            <p className="text-muted-foreground">
              Carga archivos .doc/.docx para extraer automáticamente los datos médicos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle>Seleccionar Archivos</CardTitle>
                <CardDescription>Arrastra archivos .doc/.docx aquí o haz clic para seleccionar</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? "border-secondary bg-secondary/10" : "border-border hover:border-secondary/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Arrastra archivos aquí</p>
                    <p className="text-sm text-muted-foreground">
                      Formatos soportados: .doc, .docx (máximo 10MB por archivo)
                    </p>
                    {/* LO NUEVO A PEGAR: */}
                  <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
                    
                    {/* Botón 1: Archivos Sueltos (El que ya tenías) */}
                    <Button asChild>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Seleccionar Archivos
                      </label>
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileInput}
                      className="hidden"
                    />

                    {/* Separador visual */}
                    <span className="text-xs text-muted-foreground">- O -</span>

                    {/* Botón 2: Carpeta Completa (El nuevo) */}
                    <Button asChild variant="secondary">
                      <label htmlFor="folder-upload" className="cursor-pointer">
                        Subir Carpeta Completa
                      </label>
                    </Button>
                    <input
                      id="folder-upload"
                      type="file"
                      // @ts-expect-error: atributo no estándar
                      webkitdirectory=""
                      directory=""
                      multiple
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    
                  </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Files List */}
            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Archivos Cargados ({files.length})</CardTitle>
                  <CardDescription>Lista de archivos listos para procesar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {files.map((file) => (
                      <div key={file.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(file.status)}
                            <div>
                              <p className="font-medium">{file.name}</p>
                              <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(file.status)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                              disabled={file.status === "processing"}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {file.status === "processing" && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Procesando...</span>
                              <span>{file.progress}%</span>
                            </div>
                            <Progress value={file.progress} className="h-2" />
                          </div>
                        )}

                        {file.status === "completed" && file.extractedData && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <h4 className="font-medium mb-2">Datos Extraídos (IA):</h4>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              <div>
                                <strong>Paciente:</strong> {file.extractedData.paciente}
                              </div>
                              <div>
                                <strong>Fecha:</strong> {file.extractedData.fecha}
                              </div>
                              <div>
                                <strong>Diagnóstico:</strong> {file.extractedData.diagnostico}
                              </div>
                              <div>
                                <strong>Síntomas:</strong> {file.extractedData.sintomas.length > 0 ? file.extractedData.sintomas.join(", ") : "-"}
                              </div>
                              <div>
                                <strong>Tratamiento:</strong> {file.extractedData.tratamiento}
                              </div>
                            </div>
                          </div>
                        )}

                        {file.status === "error" && (
                          <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <p className="text-sm text-destructive">
                              Error: {file.error || "No se pudo procesar el archivo"}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  className="w-full"
                  onClick={processFiles}
                  disabled={files.length === 0 || isProcessing || files.every((f) => f.status !== "pending")}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Procesar Archivos
                    </>
                  )}
                </Button>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <a href="/historias">Volver a Historias</a>
                </Button>
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
                  <p>Selecciona o arrastra archivos .doc/.docx con historias clínicas</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold mt-0.5">
                    2
                  </div>
                  <p>Haz clic en "Procesar Archivos" para extraer los datos automáticamente</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold mt-0.5">
                    3
                  </div>
                  <p>Revisa los datos extraídos y valida la información médica</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MedicalLayout>
  )
}