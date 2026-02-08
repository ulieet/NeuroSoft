import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, UserPlus, BarChart3, FileText, Users, Calendar, Clock } from "lucide-react"
import { listarHistorias, type HistoriaResumen } from "@/lib/api-historias"

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  let historias: HistoriaResumen[] = [];
  try {
    historias = await listarHistorias();
  } catch (error) {
    console.error("Error cargando el dashboard:", error);
  }

  const totalHistorias = historias.length;
  const pendientes = historias.filter(h => h.estado === 'pendiente_validacion');
  const totalPendientes = pendientes.length;
  
  const hoyStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const totalHoy = historias.filter(h => h.id.startsWith(hoyStr)).length;

  const conteoReal = () => {
    const dnis = new Set();
    historias.forEach(h => {
      const dniLimpio = h.paciente?.dni?.toString().replace(/\D/g, "").trim();
      if (dniLimpio && dniLimpio.length >= 6 && dniLimpio.length <= 9) {
        dnis.add(dniLimpio);
      }
    });
    return dnis.size;
  };

  const pacientesUnicos = conteoReal();

  return (
    <MedicalLayout currentPage="dashboard">
      <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* SECCIÓN PRINCIPAL: IMPORTACIÓN */}
      
        <Card className="relative overflow-hidden border-2 border-[#003e66]/20 bg-linear-to-r from-white to-slate-50 shadow-sm">
          <div className="pointer-events-none absolute top-0 right-0 p-4 opacity-5">
            <Upload size={120} />
          </div>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-[#003e66]">Gestión NeuroSoft</CardTitle>
            <CardDescription className="text-base text-slate-600">
              Procesamiento de historias clínicas y extracción de datos con IA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" className="h-20 w-full gap-4 text-xl shadow-md transition-all hover:shadow-lg" asChild>
              <a href="/historias/importar">
                <Upload className="h-10 w-10" />
                <div className="text-left">
                  <div className="font-bold">Importar Documentos .doc / .docx</div>
                  <div className="text-xs font-normal opacity-90">Extracción automática de diagnósticos y tratamientos</div>
                </div>
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* METRICAS DE COHORTE */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-[#003e66] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Pacientes Reales</CardTitle>
              <Users className="h-5 w-5 text-[#003e66]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pacientesUnicos}</div>
              <p className="mt-1 text-[10px] text-muted-foreground">Con identidad verificada</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Historias Totales</CardTitle>
              <FileText className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalHistorias}</div>
              <p className="mt-1 text-[10px] text-muted-foreground">Registros procesados</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Historias Hoy</CardTitle>
              <Calendar className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalHoy}</div>
              <p className="mt-1 text-[10px] text-muted-foreground">Cargas del día actual</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-dashed shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase text-amber-600">Pendientes</CardTitle>
              <Clock className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{totalPendientes}</div>
              <p className="mt-1 text-[10px] font-medium text-amber-600/70">Requieren validación</p>
            </CardContent>
          </Card>
        </div>

        {/* ACCIONES SECUNDARIAS */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Acciones de Navegación</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Button variant="outline" size="lg" className="flex h-24 flex-col gap-2 border-slate-200 transition-colors hover:bg-slate-50" asChild>
                <a href="/pacientes/nuevo">
                  <UserPlus className="h-8 w-8 text-[#003e66]" />
                  <span className="font-semibold text-slate-700">Nuevo Paciente</span>
                </a>
              </Button>
              
              <Button variant="outline" size="lg" className="flex h-24 flex-col gap-2 border-slate-200 transition-colors hover:bg-slate-50" asChild>
                <a href="/reportes">
                  <BarChart3 className="h-8 w-8 text-[#003e66]" />
                  <span className="font-semibold text-slate-700">Ver Analítica</span>
                </a>
              </Button>

              <Button variant="outline" size="lg" className="flex h-24 flex-col gap-2 border-slate-200 transition-colors hover:bg-slate-50" asChild>
                <a href="/historias">
                  <FileText className="h-8 w-8 text-[#003e66]" />
                  <span className="font-semibold text-slate-700">Explorar Archivos</span>
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MedicalLayout>
  )
}