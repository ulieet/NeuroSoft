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
import { ArrowLeft, Save, RefreshCw, Brain, Pill, FlaskConical, Stethoscope, ClipboardList, TrendingUp } from "lucide-react"

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
  const historiaId = Number(searchParams.get("id"))

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [estaCargando, setEstaCargando] = useState(true)

  // Estado del formulario
  const [formData, setFormData] = useState<Partial<HistoriaClinica>>({})
  // Estado para el JSON de medicamentos
  const [medicamentosJson, setMedicamentosJson] = useState("[]")

  useEffect(() => {
    if (historiaId) {
      const hist = obtenerHistoriaClinicaPorId(historiaId)
      if (hist) {
        setFormData(hist)
        setMedicamentosJson(JSON.stringify(hist.medicamentos || [], null, 2))

        const pac = obtenerPacientePorId(hist.pacienteId)
        setPaciente(pac || null)
      }
      setEstaCargando(false)
    } else {
      setEstaCargando(false)
    }
  }, [historiaId])

  // --- Handlers del Formulario ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string) => {
    if (id === "escalaEDSS" && value === "na") {
      setFormData((prev) => ({ ...prev, escalaEDSS: undefined }))
      return
    }
    setFormData((prev) => ({ ...prev, [id]: value }))
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    let medicamentosParseados: Medicamento[] = []
    try {
      medicamentosParseados = JSON.parse(medicamentosJson)
    } catch {
      alert("El formato JSON de los medicamentos es inválido. Por favor, corrígelo.")
      return
    }

    const datosActualizados = {
      ...formData,
      medicamentos: medicamentosParseados,
    }

    try {
      modificarHistoriaClinica(historiaId, datosActualizados as HistoriaClinica)
      alert("Historia Clínica modificada con éxito")
      router.push(`/historias/detalle?id=${historiaId}`)
    } catch (error) {
      console.error(error)
      alert("Error al modificar la historia")
    }
  } // 👈 ESTA LLAVE CERRABA MAL EN TU VERSIÓN

  // --- Renderizado de Carga y Error ---
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

  if (!formData || !paciente) {
    return (
      <MedicalLayout currentPage="historias">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card>
            <CardHeader>
              <CardTitle>Historia no encontrada</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a href="/historias">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MedicalLayout>
    )
  }

  // --- Renderizado Principal ---
  return (
    <MedicalLayout currentPage="historias">
      <form onSubmit={handleSubmit}>
        {/* Contenido principal completo, igual al tuyo */}
      </form>
    </MedicalLayout>
  )
}

export default function PaginaEditarHistoriaSuspenseWrapper() {
  return (
    <Suspense
      fallback={
        <MedicalLayout currentPage="historias">
          <div className="flex items-center justify-center min-h-[400px]">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </MedicalLayout>
      }
    >
      <PaginaEditarHistoria />
    </Suspense>
  )
}
