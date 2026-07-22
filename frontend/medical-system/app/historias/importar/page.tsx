"use client"

import type React from "react"
import { useState } from "react"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from "lucide-react"

interface UploadedFile {
  id: string
  name: string
  size: number
  status: "pending" | "processing" | "completed" | "error"
  progress: number
  fileObject: File 
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

  // Estados para el progreso global del lote
  const [globalProgress, setGlobalProgress] = useState(0)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [totalToProcess, setTotalToProcess] = useState(0)
  const [waitCountdown, setWaitCountdown] = useState<number | null>(null)
  const [currentActionMessage, setCurrentActionMessage] = useState("")

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
      const name = file.name.toLowerCase();
      const esValido = name.endsWith(".doc") || name.endsWith(".docx") || name.endsWith(".pdf") || name.endsWith(".zip");

      return {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        status: esValido ? "pending" : "error",
        progress: 0,
        fileObject: file,
        error: esValido ? undefined : "Error: Formato no permitido. Solo .doc, .docx, .pdf o .zip"
      };
    })

    setFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const processFiles = async () => {
    const pendingFiles = files.filter(f => f.status === "pending")
    if (pendingFiles.length === 0) return

    const total = pendingFiles.length
    const hasZip = pendingFiles.some(f => f.name.toLowerCase().endsWith(".zip"))

    const confirmText = hasZip
      ? `Has seleccionado un archivo ZIP. El servidor lo descomprimirá y procesará todas las historias clínicas contenidas usando Inteligencia Artificial.\n\nEsto se realiza en el servidor y es 100% gratuito.\n\n¿Deseas iniciar el procesamiento?`
      : `Has seleccionado ${total} archivos para procesar.\n\nSe enviarán en lote al servidor y se procesarán de forma optimizada utilizando Inteligencia Artificial (Smart Batching).\n\nEsto tardará aproximadamente 2 a 3 minutos y es 100% gratuito.\n\n¿Deseas iniciar el procesamiento?`;

    if (total > 1 && !window.confirm(confirmText)) return

    setIsProcessing(true)
    setTotalToProcess(total)
    setCurrentFileIndex(0)
    setGlobalProgress(0)
    setWaitCountdown(null)
    setCurrentActionMessage("Subiendo archivos al servidor...")

    // Poner todos los pendientes en "processing"
    setFiles((prev) =>
      prev.map((f) => f.status === "pending" ? { ...f, status: "processing", progress: 10 } : f)
    )

    try {
      const formData = new FormData()
      pendingFiles.forEach((file) => {
        formData.append("files", file.fileObject)
      })

      const uploadResponse = await fetch("http://127.0.0.1:8000/importaciones/lote", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.detail || "Error al iniciar el lote en el servidor")
      }

      const jobData = await uploadResponse.json()
      const jobId = jobData.job_id
      console.log("Job de importación creado:", jobId)

      setCurrentActionMessage("Procesando lote en segundo plano...")

      // Polling loop
      const pollInterval = setInterval(async () => {
        try {
          const pollResponse = await fetch(`http://127.0.0.1:8000/importaciones/job/${jobId}`)
          if (!pollResponse.ok) return

          const statusData = await pollResponse.json()
          console.log("Estado del Job:", statusData)

          const processed = statusData.processed || 0
          const totalCount = statusData.total || total
          const successes = statusData.successes || {}
          const errors = statusData.errors || []

          setTotalToProcess(totalCount)
          setCurrentFileIndex(processed)
          setGlobalProgress(totalCount > 0 ? Math.round((processed / totalCount) * 100) : 0)

          // Actualizar estado de archivos individuales
          setFiles((prev) => {
            const errorMap = new Map<string, string>()
            errors.forEach((err: any) => {
              if (err.filename) errorMap.set(err.filename, err.error || "Error desconocido")
            })

            // 1. Mapear archivos existentes en la interfaz
            let updatedFiles = prev.map((f) => {
              if (f.status === "completed" || f.status === "error") {
                return f
              }

              if (errorMap.has(f.name)) {
                return {
                  ...f,
                  status: "error" as const,
                  progress: 0,
                  error: errorMap.get(f.name),
                }
              }

              if (successes[f.name]) {
                const summary = successes[f.name]
                return {
                  ...f,
                  status: "completed" as const,
                  progress: 100,
                  extractedData: {
                    paciente: summary.paciente,
                    fecha: summary.fecha,
                    diagnostico: summary.diagnostico,
                    sintomas: [],
                    tratamiento: "",
                  },
                }
              }

              return {
                ...f,
                status: "processing" as const,
                progress: totalCount > 0 ? Math.round((processed / totalCount) * 100) : 50,
              }
            })

            // 2. Agregar archivos extraídos de ZIP procesados exitosamente
            Object.keys(successes).forEach((filename) => {
              const existe = updatedFiles.some((f) => f.name === filename)
              if (!existe) {
                updatedFiles.push({
                  id: Math.random().toString(36).substr(2, 9),
                  name: filename,
                  size: 0,
                  status: "completed",
                  progress: 100,
                  fileObject: new File([], filename),
                  extractedData: {
                    paciente: successes[filename].paciente,
                    fecha: successes[filename].fecha,
                    diagnostico: successes[filename].diagnostico,
                    sintomas: [],
                    tratamiento: "",
                  },
                })
              }
            })

            // 3. Agregar archivos extraídos de ZIP que fallaron
            errors.forEach((err: any) => {
              const filename = err.filename
              if (filename) {
                const existe = updatedFiles.some((f) => f.name === filename)
                if (!existe) {
                  updatedFiles.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: filename,
                    size: 0,
                    status: "error",
                    progress: 0,
                    fileObject: new File([], filename),
                    error: err.error || "Error de extracción",
                  })
                }
              }
            })

            return updatedFiles
          })

          if (statusData.status === "completed") {
            clearInterval(pollInterval)
            setCurrentActionMessage("¡Procesamiento finalizado!")
            setIsProcessing(false)
          }
        } catch (pollErr) {
          console.error("Error al consultar estado del job:", pollErr)
        }
      }, 2000)

    } catch (error: any) {
      console.error("Error al procesar lote:", error)
      setCurrentActionMessage(`Error: ${error.message || "No se pudo conectar con el servidor"}`)
      setIsProcessing(false)

      setFiles((prev) =>
        prev.map((f) => f.status === "processing" ? { ...f, status: "error", error: error.message || "Error al enviar lote" } : f)
      )
    }
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <a href="/historias">
              <ArrowLeft className="h-4 w-4" />
            </a>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-balance">Importar Historias Clínicas</h1>
            <p className="text-muted-foreground">
              Carga archivos .doc/.docx, .pdf o .zip para extraer automáticamente los datos médicos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Seleccionar Archivos</CardTitle>
                <CardDescription>Arrastra archivos .doc/.docx, .pdf o .zip aquí o haz clic para seleccionar</CardDescription>
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
                      Formatos soportados: .doc, .docx, .pdf, .zip (máximo 10MB por archivo)
                    </p>
                  <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
                    
                    <Button asChild>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Seleccionar Archivos
                      </label>
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".doc,.docx,.pdf,.zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,application/zip,application/x-zip-compressed"
                      onChange={handleFileInput}
                      className="hidden"
                    />

                    <span className="text-xs text-muted-foreground">- O -</span>

                    <Button asChild variant="secondary">
                      <label htmlFor="folder-upload" className="cursor-pointer">
                        Subir Carpeta Completa
                      </label>
                    </Button>
                    <input
                      id="folder-upload"
                      type="file"
                      // @ts-expect-error
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
                            <h4 className="font-medium mb-2">Datos Extraídos:</h4>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              <div>
                                <strong>Paciente:</strong> {file.extractedData.paciente}
                              </div>
                              <div>
                                <strong>Fecha:</strong> {file.extractedData.fecha}
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

          <div className="space-y-6">
            {isProcessing && (
              <Card className="border-blue-200 bg-blue-50/20 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Progreso General</span>
                    <Badge variant="secondary" className="font-mono">
                      {currentFileIndex} / {totalToProcess}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs flex items-center justify-between">
                    <span>{currentActionMessage}</span>
                    {waitCountdown !== null && (
                      <span className="font-bold text-blue-600 ml-1">
                        (esperando {waitCountdown}s...)
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={globalProgress} className="h-2" />
                  <div className="text-[10px] text-muted-foreground flex justify-between">
                    <span>Completado: {globalProgress}%</span>
                    <span>Modo Lote (Gratuito)</span>
                  </div>
                </CardContent>
              </Card>
            )}

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
                  <p>Selecciona o arrastra archivos .doc/.docx, .pdf o .zip con historias clínicas</p>
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