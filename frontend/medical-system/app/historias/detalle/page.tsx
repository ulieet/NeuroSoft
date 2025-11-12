"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation" // <-- 1. Importar useRouter
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  Edit, 
  FileText, 
  User, 
  Calendar, 
  RefreshCw, 
  Stethoscope, 
  ClipboardList, 
  Brain,          
  Pill,           
  FlaskConical,   
  TrendingUp,     
  FileDown,       
  Check,
  Trash // <-- 2. Importar Trash
} from "lucide-react"

// 3. Importar AlertDialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Importaciones del almacén de datos
import {
  obtenerHistoriaClinicaPorId,
  obtenerPacientePorId,
  obtenerEdadPaciente,
  eliminarHistoriaClinica,
  modificarHistoriaClinica, // <-- NUEVA IMPORTACIÓN
  type HistoriaClinica,
  type Paciente,
} from "@/lib/almacen-datos"

/**
 * Calcula la diferencia de años entre dos fechas.
 * Si la fechaFin no se provee, usa la fecha actual (hoy).
 */
function calcularAnios(fechaInicioStr: string, fechaFinStr?: string): number {
  if (!fechaInicioStr) return 0;
  const fechaInicio = new Date(fechaInicioStr);
  const fechaFin = fechaFinStr ? new Date(fechaFinStr) : new Date(); // Hoy por defecto
  
  let anios = fechaFin.getFullYear() - fechaInicio.getFullYear();
  const mes = fechaFin.getMonth() - fechaInicio.getMonth();
  if (mes < 0 || (mes === 0 && fechaFin.getDate() < fechaInicio.getDate())) {
    anios--;
  }
  return anios > 0 ? anios : 0;
}

// --- Helpers para Badges ---
const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case "validada": return <Badge className="bg-green-100 text-green-800 border-green-200"><Check className="w-3 h-3 mr-1" />Validada</Badge>
    case "pendiente": return <Badge variant="secondary">Pendiente</Badge>
    default: return <Badge variant="destructive">Error</Badge>
  }
}
const getCriticidadBadge = (nivel?: string) => {
  if (!nivel) return <Badge variant="outline">N/A</Badge>
  switch (nivel) {
    case "critico": return <Badge variant="destructive">Crítico</Badge>
    case "alto": return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Alto</Badge>
    case "medio": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medio</Badge>
    case "bajo": return <Badge variant="outline">Bajo</Badge>
    default: return <Badge variant="outline">{nivel}</Badge>
  }
}
const getBadgeSiNo = (valor?: boolean) => {
  if (valor === undefined) return <Badge variant="outline">N/A</Badge>
  return valor 
    ? <Badge variant="secondary">Sí</Badge> 
    : <Badge variant="outline">No</Badge>
}

// --- Componente de la Página ---

function PaginaDetalleHistoria() {
  const searchParams = useSearchParams()
  const router = useRouter() // <-- 5. Inicializar router
  const historiaId = Number(searchParams.get("id"))

  const [historia, setHistoria] = useState<HistoriaClinica | null>(null)
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [estaCargando, setEstaCargando] = useState(true)

  // --- Carga de Datos ---
  useEffect(() => {
    if (!historiaId) {
      setEstaCargando(false)
      return
    }
    
    const cargarDatos = () => {
      setEstaCargando(true)
      const hist = obtenerHistoriaClinicaPorId(historiaId)
      
      setHistoria(hist || null) 
      
      if (hist) {
        const pac = obtenerPacientePorId(hist.pacienteId)
        setPaciente(pac || null)
      }
      setEstaCargando(false)
    }

    cargarDatos()
  }, [historiaId])

  // --- 6. Handler para eliminar ---
  const handleEliminarHistoria = () => {
    if (!historia || !paciente) return
    try {
      eliminarHistoriaClinica(historia.id)
      alert("Historia clínica eliminada.")
      // Volvemos al perfil del paciente
      router.push(`/pacientes/detalle?id=${paciente.id}`)
    } catch (error) {
      console.error(error)
      alert("Error al eliminar la historia.")
    }
  }

  // --- 8. Handler para validar ---
  const handleValidarHistoria = () => {
    if (!historia) return;

    // Creamos el objeto actualizado
    const historiaValidada = {
      ...historia,
      estado: "validada" as "validada", // Forzamos el tipo
    };

    try {
      modificarHistoriaClinica(historia.id, historiaValidada);
      // Actualizamos el estado local para que la UI reaccione
      setHistoria(historiaValidada);
      alert("Historia validada con éxito.");
    } catch (error) {
      console.error(error);
      alert("Error al validar la historia.");
    }
  }


  // --- Cálculos Derivados (basados en los requisitos del PDF) ---
  const edadInicioSintomas = (paciente && historia?.fechaInicioEnfermedad)
    ? calcularAnios(paciente.fechaNacimiento, historia.fechaInicioEnfermedad)
    : null

  const tiempoEvolucion = (historia?.fechaInicioEnfermedad)
    ? calcularAnios(historia.fechaInicioEnfermedad)
    : null

  // --- Renderizado de Carga y Error ---
  if (estaCargando) {
     return (
       <MedicalLayout currentPage="historias">
         <div className="flex items-center justify-center min-h-[400px]">
           <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
           <p className="ml-2">Cargando datos de la historia...</p>
         </div>
       </MedicalLayout>
     )
  }

  if (!historia || !paciente) {
    return (
      <MedicalLayout currentPage="historias">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card>
            <CardHeader>
              <CardTitle>Historia no encontrada</CardTitle>
              <CardDescription>La historia solicitada (ID: {historiaId}) no existe.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a href="/historias">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a Historias
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
      <div className="space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              {/* Botón para volver al perfil del paciente */}
              <a href={`/pacientes/detalle?id=${paciente.id}`}> 
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-balance">
                Resumen de Historia Clínica
              </h1>
              <p className="text-muted-foreground">
                Paciente: {paciente.apellido}, {paciente.nombre}
              </p>
              <p className="text-sm text-muted-foreground">
                Fecha de Consulta: {new Date(historia.fecha).toLocaleDateString("es-AR")}
              </p>
            </div>
          </div>
          {/* --- 7. BOTONES DE ACCIÓN (MODIFICADO) --- */}
          <div className="flex flex-wrap gap-2"> {/* flex-wrap para responsive */}
            
            {/* --- BOTÓN DE VALIDAR MODIFICADO --- */}
            {historia.estado === "pendiente" && (
              <Button onClick={handleValidarHistoria}>
                <Check className="mr-2 h-4 w-4" />
                Validar Historia
              </Button>
            )}
            {/* --- FIN DE MODIFICACIÓN --- */}

            <Button variant="outline" asChild>
              <a href={`/historias/editar?id=${historia.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </a>
            </Button>
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Exportar
            </Button>

            {/* --- BOTÓN DE ELIMINAR HISTORIA --- */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Está seguro de eliminar esta historia?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente la
                    historia clínica de la fecha <span className="font-bold">{new Date(historia.fecha).toLocaleDateString("es-AR")}</span> 
                    {" "}para el paciente <span className="font-bold">{paciente.apellido}, {paciente.nombre}</span>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEliminarHistoria}>
                    Confirmar Eliminación
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {/* --- FIN DEL BOTÓN --- */}

          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* --- Columna Principal (Orden del PDF) --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card: Datos Principales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Datos de la Consulta
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Médico</p>
                  <p className="text-base">{historia.medico}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  {getEstadoBadge(historia.estado)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nivel Criticidad</p>
                  {getCriticidadBadge(historia.nivelCriticidad)}
                </div>
              </CardContent>
            </Card>

            {/* Card: Síntomas y Evolución (del PDF) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Síntomas, Anamnesis y Evolución
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Motivo de Consulta</p>
                  <p className="text-base whitespace-pre-wrap">{historia.motivoConsulta}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Síntomas Principales / Anamnesis</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{historia.anamnesis}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Examen Físico</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{historia.examenFisico}</p>
                </div>
                 <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Evolución</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{historia.evolucion}</p>
                </div>
              </CardContent>
            </Card>

            {/* Card: Estudios Realizados (del PDF) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" />
                  Estudios Realizados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Punción Lumbar</span>
                  {getBadgeSiNo(historia.estudiosComplementarios?.puncionLumbar)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Examen LCR</span>
                  {getBadgeSiNo(historia.estudiosComplementarios?.examenLCR)}
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notas (RMN, Laboratorios, etc.)</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {historia.estudiosComplementarios?.texto || "Sin notas."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card: Diagnóstico (del PDF) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Diagnóstico
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Diagnóstico Principal</p>
                    <p className="text-base font-semibold">{historia.diagnostico}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Patología (Categoría)</p>
                    <p className="text-base">{historia.patologia || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Código (CIE-10 / OMS)</p>
                    <p className="text-base font-mono">{historia.codigoDiagnostico || "N/A"}</p>
                  </div>
                   <div>
                    <p className="text-sm font-medium text-muted-foreground">Forma Evolutiva</p>
                    <p className="text-base">{historia.formaEvolutiva || "N/A"}</p>
                  </div>
              </CardContent>
            </Card>

            {/* Card: Tratamiento y Comentario (del PDF) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Tratamiento y Solicitud
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Medicamentos Recetados</p>
                {(!historia.medicamentos || historia.medicamentos.length === 0) ? (
                  <p className="text-sm text-muted-foreground">No se registraron medicamentos.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Droga</TableHead>
                          <TableHead>Molécula</TableHead>
                          <TableHead>Dosis</TableHead>
                          <TableHead>Frecuencia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historia.medicamentos.map((med, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{med.droga}</TableCell>
                            <TableCell>{med.molecula || "N/A"}</TableCell>
                            <TableCell>{med.dosis || "N/A"}</TableCell>
                            <TableCell>{med.frecuencia || "N/A"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {historia.observacionesMedicacion && (
                   <div className="p-3 bg-muted rounded-md mt-2">
                     <p className="text-sm font-medium text-foreground">Observaciones (Medicación)</p>
                     <p className="text-sm text-muted-foreground whitespace-pre-wrap">{historia.observacionesMedicacion}</p>
                   </div>
                )}
                
                <Separator />
                
                <p className="text-sm font-medium text-muted-foreground">Otras Terapias / Comentario General</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{historia.tratamiento || "No se indicaron otras terapias."}</p>
              </CardContent>
            </Card>

          </div>

          {/* --- Barra Lateral --- */}
          <div className="space-y-6">
            
            {/* Card: Paciente (Info del PDF) */}
            <Card>
              <CardHeader>
                <CardTitle>Paciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-semibold">{paciente.apellido}, {paciente.nombre}</div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-mono">{paciente.dni}</span> • {obtenerEdadPaciente(paciente.fechaNacimiento)} años
                </div>
                 <div className="text-sm text-muted-foreground">
                  {paciente.obraSocial} • Afiliado: {paciente.numeroAfiliado || "N/A"}
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a href={`/pacientes/detalle?id=${paciente.id}`}>
                    <User className="mr-2 h-4 w-4" />
                    Ver Perfil Completo
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Card: Índices (Info de los PDF) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Índices Clave
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Grado Discapacidad (EDSS)</p>
                  <p className="text-xl font-bold">{historia.escalaEDSS?.toFixed(1) ?? "N/A"}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Edad Inicio de Síntomas</p>
                  <p className="text-base">{edadInicioSintomas ? `${edadInicioSintomas} años` : "N/A"}</p>
                </div>
                 <div>
                  <p className="text-sm font-medium text-muted-foreground">Tiempo de Evolución</p>
                  <p className="text-base">{tiempoEvolucion ? `${tiempoEvolucion} años` : "N/A"}</p>
                </div>
              </CardContent>
            </Card>
            
            {/* Card: Metadatos */}
             <Card>
              <CardHeader>
                <CardTitle>Metadatos de la Historia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Médico</p>
                  <p className="text-sm">{historia.medico}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  {getEstadoBadge(historia.estado)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID de Historia</p>
                  <p className="text-sm font-mono">{historia.id}</p>
                </div>
                 <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Importación</p>
                  <p className="text-sm">{new Date(historia.fechaImportacion).toLocaleString("es-AR")}</p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </MedicalLayout>
  )
}

// Exportamos el componente envuelto en Suspense
export default function PaginaDetalleHistoriaSuspenseWrapper() {
  return (
    <Suspense fallback={
      <MedicalLayout currentPage="historias">
        <div className="flex items-center justify-center min-h-[400px]">
           <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
           <p className="ml-2">Cargando...</p>
         </div>
      </MedicalLayout>
    }>
      <PaginaDetalleHistoria />
    </Suspense>
  )
}