"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast" // <--- IMPORTANTE: Agregar Toast
import { 
  ArrowLeft, 
  Edit, 
  User, 
  RefreshCw, 
  Stethoscope, 
  ClipboardList, 
  Brain,          
  Pill,            
  FlaskConical,    
  TrendingUp,      
  Check,
  Trash,
  Calendar,
  ScanEye,
  History,
  Activity,
  Clock
} from "lucide-react"

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

import {
  obtenerHistoriaClinicaPorId,
  obtenerPacientePorId,
  obtenerEdadPaciente,
  type HistoriaClinica,
  type Paciente,
} from "@/lib/almacen-datos"

// Importamos la nueva función para borrar en el servidor
import { BASE_URL, eliminarHistoriaRemota } from "@/lib/api-historias" 

// --- HELPERS VISUALES Y LÓGICOS ---

const mostrarDato = (dato: string | null | undefined) => {
  return dato && dato.trim() !== "" ? dato : "—";
}

function calcularAnios(fechaInicioStr?: string, fechaFinStr?: string): number | null {
  if (!fechaInicioStr) return null;
  const fechaInicio = new Date(fechaInicioStr);
  if (isNaN(fechaInicio.getTime())) return null;

  const fechaFin = fechaFinStr ? new Date(fechaFinStr) : new Date(); 
  let anios = fechaFin.getFullYear() - fechaInicio.getFullYear();
  const mes = fechaFin.getMonth() - fechaInicio.getMonth();
  if (mes < 0 || (mes === 0 && fechaFin.getDate() < fechaInicio.getDate())) {
    anios--;
  }
  return anios > 0 ? anios : 0;
}

const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case "validada": 
      return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100"><Check className="w-3 h-3 mr-1" />Validada</Badge>
    case "pendiente": 
    case "pendiente_validacion": 
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>
    default: 
      return <Badge variant="destructive">Error</Badge>
  }
}

const getCriticidadBadge = (nivel?: string) => {
  if (!nivel) return <Badge variant="outline">N/A</Badge>
  switch (nivel) {
    case "critico": return <Badge variant="destructive">Crítico</Badge>
    case "alto": return <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">Alto</Badge>
    case "medio": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">Medio</Badge>
    case "bajo": return <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-200">Bajo</Badge>
    default: return <Badge variant="outline">{nivel}</Badge>
  }
}

const getBadgeSiNo = (valor?: boolean) => {
  if (valor === undefined) return <Badge variant="outline">N/A</Badge>
  return valor 
    ? <Badge variant="secondary">Sí</Badge> 
    : <Badge variant="outline">No</Badge>
}

// --- RENDERIZADOR ESPECIAL PARA RMN ---
const renderizarRMN = (textoJson?: string) => {
  if (!textoJson) return <p className="text-sm text-muted-foreground">Sin datos registrados.</p>;

  try {
    const datos = JSON.parse(textoJson);
    if (!Array.isArray(datos) || datos.length === 0) {
      return <p className="text-sm text-muted-foreground">Sin datos estructurados.</p>;
    }

    return (
      <div className="space-y-3">
        {datos.map((rmn: any, index: number) => (
          <div key={index} className="border rounded-md p-3 text-sm bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-2 font-medium text-primary">
              <Calendar className="h-4 w-4" />
              <span>{rmn.fecha ? rmn.fecha.split('-').reverse().join('/') : "Fecha desconocida"}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div>
                <span className="block text-xs font-semibold text-foreground">Actividad:</span>
                {rmn.actividad === "Activa" ? (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Activa</Badge>
                ) : (
                  rmn.actividad || "—"
                )}
              </div>
              <div>
                <span className="block text-xs font-semibold text-foreground">Gadolinio (Gd):</span>
                {rmn.gd === "Positiva" ? (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Positiva</Badge>
                ) : (
                  rmn.gd || "—"
                )}
              </div>
            </div>

            {rmn.regiones && rmn.regiones.length > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed">
                <span className="block text-xs font-semibold text-foreground mb-1">Regiones Afectadas:</span>
                <div className="flex flex-wrap gap-1">
                  {rmn.regiones.map((reg: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs px-1 py-0 h-5 bg-muted/50">
                      {reg}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  } catch (e) {
    return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{textoJson}</p>;
  }
};

function PaginaDetalleHistoria() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const historiaId = searchParams.get("id")
  const { toast } = useToast() // Hook de notificaciones

  const [historia, setHistoria] = useState<HistoriaClinica | null>(null)
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [estaCargando, setEstaCargando] = useState(true)
  const [estaEliminando, setEstaEliminando] = useState(false) // Nuevo estado para UI

  // --- LÓGICA DE CARGA DE DATOS ---
  useEffect(() => {
    if (!historiaId) {
      setEstaCargando(false)
      return
    }
    
    const cargarDatos = async () => {
      setEstaCargando(true)
      
      try {
        const res = await fetch(`${BASE_URL}/historias/${historiaId}/borrador`);
        
        if (res.ok) {
          const data = await res.json();
          const fuenteDatos = data.validada || data.borrador || {};
          const pInfo = fuenteDatos.paciente || {};
          const enf = fuenteDatos.enfermedad || {};
          const cons = fuenteDatos.consulta || {};
          
          let nombre = pInfo.nombre || "";
          let apellido = "";
          if (nombre.includes(",")) {
            const partes = nombre.split(",");
            apellido = partes[0].trim();
            nombre = partes[1].trim();
          }

          const pac: Paciente = {
            id: historiaId,
            nombre: nombre,
            apellido: apellido,
            dni: pInfo.dni || "",
            fechaNacimiento: pInfo.fecha_nacimiento || "", 
            sexo: "", telefono: "", email: "", direccion: "",
            obraSocial: pInfo.obra_social || "",           
            numeroAfiliado: pInfo.nro_afiliado || "",      
            fechaRegistro: new Date().toISOString(),
            observaciones: ""
          };
          setPaciente(pac);

          const hist: HistoriaClinica = {
            id: data.id,
            pacienteId: historiaId,
            fecha: cons.fecha || new Date().toISOString(),
            diagnostico: enf.diagnostico || "",
            codigoDiagnostico: enf.codigo,
            formaEvolutiva: enf.forma,
            fechaInicioEnfermedad: enf.fecha_inicio,
            escalaEDSS: enf.edss,
            estado: data.estado, 
            nivelCriticidad: data.nivel_criticidad || fuenteDatos.nivel_criticidad || "medio",
            medico: cons.medico || "",
            sintomasPrincipales: fuenteDatos.secciones_texto?.sintomas_principales || fuenteDatos.texto_original || "",
            antecedentes: fuenteDatos.secciones_texto?.antecedentes || "",
            agrupacionSindromica: fuenteDatos.secciones_texto?.agrupacion_sindromica || "",
            examenFisico: fuenteDatos.secciones_texto?.examen_fisico || "", 
            evolucion: fuenteDatos.secciones_texto?.evolucion || "", 
            fechaImportacion: new Date().toISOString(),
            medicamentos: (fuenteDatos.tratamientos || []).map((t: any) => ({
                droga: t.molecula || t.droga || "Sin nombre",
                molecula: t.molecula,
                dosis: t.dosis,
                frecuencia: t.frecuencia,
                estado: t.estado || "Activo",
                tolerancia: true 
            })),
            tratamiento: fuenteDatos.secciones_texto?.comentario || "", 
            estudiosComplementarios: {
              puncionLumbar: fuenteDatos.complementarios?.puncion_lumbar?.realizada || false,
              examenLCR: false,
              texto: fuenteDatos.complementarios?.rmn 
                ? JSON.stringify(fuenteDatos.complementarios.rmn) 
                : ""
            },
            patologia: "Neurología" 
          };
          setHistoria(hist);
          setEstaCargando(false);
          return; 
        }
      } catch (error) {
        console.warn("Backend falló, intentando local...", error);
      }

      // Fallback Local Storage
      const histLocal = obtenerHistoriaClinicaPorId(historiaId);
      if (histLocal) {
        setHistoria(histLocal);
        const pacLocal = obtenerPacientePorId(histLocal.pacienteId);
        setPaciente(pacLocal || null);
      }
      setEstaCargando(false)
    }

    cargarDatos()
  }, [historiaId])

  // --- LÓGICA DE ELIMINACIÓN ---
  const handleEliminarHistoria = async () => {
    if (!historiaId) return;
    setEstaEliminando(true);

    try {
      // 1. Intentar borrar del Backend
      await eliminarHistoriaRemota(historiaId);
      
      toast({
        title: "Historia eliminada",
        description: "El registro ha sido eliminado correctamente del servidor.",
      });

      // 2. Redirigir al listado
      router.push(`/historias`);

    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la historia del servidor.",
        variant: "destructive"
      });
    } finally {
      setEstaEliminando(false);
    }
  }

  const edadInicioSintomas = (paciente && historia?.fechaInicioEnfermedad)
    ? calcularAnios(paciente.fechaNacimiento, historia.fechaInicioEnfermedad)
    : null

  const tiempoEvolucion = (historia?.fechaInicioEnfermedad)
    ? calcularAnios(historia.fechaInicioEnfermedad)
    : null

  if (estaCargando) {
      return (
        <MedicalLayout currentPage="historias">
          <div className="flex items-center justify-center min-h-[400px]">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2">Cargando datos...</p>
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
            </CardHeader>
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
      <div className="space-y-6">
        
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <a href="/historias"><ArrowLeft className="h-4 w-4" /></a>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-balance">Resumen de Historia Clínica</h1>
              <p className="text-muted-foreground">Paciente: {paciente.apellido}, {paciente.nombre}</p>
              <p className="text-sm text-muted-foreground">Fecha: {new Date(historia.fecha).toLocaleDateString("es-AR")}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2"> 
            <Button variant="outline" asChild>
              <a href={`/historias/editar?id=${historia.id}`}><Edit className="mr-2 h-4 w-4" />Editar</a>
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={estaEliminando}>
                  {estaEliminando ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <Trash className="mr-2 h-4 w-4" />}
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar historia?</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción es irreversible y borrará el archivo del servidor.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEliminarHistoria} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Confirmar Eliminación
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* --- Columna Principal --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card Paciente MEJORADO */}
            <Card>
              <CardHeader>
                <CardTitle>Datos del Paciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-semibold text-lg">
                  {paciente.apellido} {paciente.nombre ? ", " + paciente.nombre : ""}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="font-bold text-foreground">DNI:</span> <span className="font-mono ml-1">{mostrarDato(paciente.dni)}</span>
                    </div>
                    <div>
                        <span className="font-bold text-foreground">Edad:</span> <span className="ml-1">{obtenerEdadPaciente(paciente.fechaNacimiento)} años</span>
                    </div>
                    <div>
                        <span className="font-bold text-foreground">Obra Social:</span> <span className="ml-1">{mostrarDato(paciente.obraSocial)}</span>
                    </div>
                    <div>
                        <span className="font-bold text-foreground">Nro. Afiliado:</span> <span className="ml-1">{mostrarDato(paciente.numeroAfiliado)}</span>
                    </div>
                </div>
                <Separator className="my-2"/>
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <a href={`/pacientes/detalle?id=${paciente.id}`}>
                    <User className="mr-2 h-4 w-4" />Ver Perfil Completo
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Card: Síntomas y Clínica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Cuadro Clínico y Antecedentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 
                 {/* Síntomas Principales */}
                 <div>
                    <h4 className="text-sm font-bold text-foreground mb-1">Síntomas Principales / Enfermedad Actual</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {mostrarDato(historia.sintomasPrincipales)}
                    </p>
                 </div>
                 
                 <Separator />

                 {/* Antecedentes */}
                 {historia.antecedentes && (
                   <>
                    <div>
                        <h4 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                            <History className="w-3 h-3" /> Antecedentes
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {historia.antecedentes}
                        </p>
                    </div>
                    <Separator />
                   </>
                 )}

                 {/* Agrupación Sindrómica */}
                 {historia.agrupacionSindromica && (
                   <>
                    <div>
                        <h4 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Agrupación Sindrómica
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {historia.agrupacionSindromica}
                        </p>
                    </div>
                    <Separator />
                   </>
                 )}

                 <div>
                    <h4 className="text-sm font-bold text-foreground mb-1">Examen Físico</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {mostrarDato(historia.examenFisico)}
                    </p>
                 </div>
              </CardContent>
            </Card>

            {/* Card: Diagnóstico */}
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
                    <p className="text-base font-semibold">{mostrarDato(historia.diagnostico)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Código (CIE-10)</p>
                    <p className="text-base font-mono">{mostrarDato(historia.codigoDiagnostico)}</p>
                  </div>
                   <div>
                    <p className="text-sm font-medium text-muted-foreground">Forma Evolutiva</p>
                    <p className="text-base">{mostrarDato(historia.formaEvolutiva)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Categoría</p>
                    <p className="text-base">{mostrarDato(historia.patologia)}</p>
                  </div>
              </CardContent>
            </Card>

            {/* Card: Tratamiento y Evolución */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Plan Terapéutico y Solicitud
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Tabla de Medicamentos */}
                <div>
                    <h4 className="text-sm font-bold text-foreground mb-2">Medicación Solicitada</h4>
                    {(!historia.medicamentos || historia.medicamentos.length === 0) ? (
                    <p className="text-sm text-muted-foreground">No se registraron medicamentos.</p>
                    ) : (
                    <div className="overflow-x-auto border rounded-md">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Droga/Molécula</TableHead>
                            <TableHead>Dosis/Frecuencia</TableHead>
                            <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historia.medicamentos.map((med: any, index: number) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{med.molecula || med.droga}</TableCell>
                                <TableCell>{med.dosis ? `${med.dosis}` : ""}{med.frecuencia ? ` - ${med.frecuencia}` : ""}</TableCell>
                                <TableCell>
                                    {med.estado === "Activo" 
                                        ? <Badge variant="secondary" className="bg-green-100 text-green-800">Activo</Badge> 
                                        : <Badge variant="outline">{med.estado || "—"}</Badge>
                                    }
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                    )}
                </div>

                <Separator />
                
                {/* Comentarios de Tratamiento / Justificación */}
                <div>
                    <h4 className="text-sm font-bold text-foreground mb-1">Comentario / Justificación Médica</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-primary/20 pl-3 italic">
                        {mostrarDato(historia.tratamiento)}
                    </p>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* --- Barra Lateral --- */}
          <div className="space-y-6">
            
            {/* Card: Datos de Consulta */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Datos de la Consulta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

            {/* Card: Índices Clave */}
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
                  <p className="text-xl font-bold">
                    {historia.escalaEDSS ?? <span className="text-sm font-normal text-muted-foreground italic">No reportado</span>}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Edad Inicio Síntomas</p>
                  <p className="text-base">{edadInicioSintomas !== null ? `${edadInicioSintomas} años` : "—"}</p>
                </div>
                 <div>
                  <p className="text-sm font-medium text-muted-foreground">Tiempo de Evolución</p>
                  <p className="text-base">{tiempoEvolucion !== null ? `${tiempoEvolucion} años` : "—"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Card: Estudios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <FlaskConical className="h-5 w-5" />
                   Estudios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Punción Lumbar</span>
                  {getBadgeSiNo(historia.estudiosComplementarios?.puncionLumbar)}
                </div>
                <Separator />
                 <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <ScanEye className="h-4 w-4"/> Resonancia Magnética
                  </p>
                  <div className="max-h-80 overflow-y-auto">
                    {renderizarRMN(historia.estudiosComplementarios?.texto)}
                  </div>
                </div>
              </CardContent>
            </Card>
            
             {/* Card: Metadatos */}
             <Card>
              <CardHeader>
                <CardTitle>Metadatos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID Interno</p>
                  <p className="text-xs font-mono break-all">{historia.id}</p>
                </div>
                 <div>
                  <p className="text-sm font-medium text-muted-foreground">Médico</p>
                  <p className="text-sm">{mostrarDato(historia.medico)}</p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </MedicalLayout>
  )
}

export default function PaginaDetalleHistoriaSuspenseWrapper() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <PaginaDetalleHistoria />
    </Suspense>
  )
}