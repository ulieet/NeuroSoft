import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, UserPlus, BarChart3, FileText, Users, Calendar, Clock } from "lucide-react"
import { listarHistorias, type HistoriaResumen } from "@/lib/api-historias"

export const dynamic = 'force-dynamic'

function obtenerTiempoTranscurrido(idTimestamp: string) {
  if (!idTimestamp || idTimestamp.length < 15) return "Fecha desconocida";
  
  try {
    const year = parseInt(idTimestamp.substring(0, 4));
    const month = parseInt(idTimestamp.substring(4, 6)) - 1;
    const day = parseInt(idTimestamp.substring(6, 8));
    const hour = parseInt(idTimestamp.substring(9, 11));
    const minute = parseInt(idTimestamp.substring(11, 13));
    
    const fechaHistoria = new Date(year, month, day, hour, minute);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fechaHistoria.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHrs < 1) return "hace menos de 1 hora";
    if (diffHrs === 1) return "hace 1 hora";
    if (diffHrs < 24) return `hace ${diffHrs} horas`;
    return `hace ${Math.floor(diffHrs / 24)} días`;
  } catch (e) {
    return "Fecha inválida";
  }
}

export default async function Dashboard() {
  // 2. Tipamos explícitamente la variable
  let historias: HistoriaResumen[] = [];
  
  try {
    historias = await listarHistorias();
  } catch (error) {
    console.error("Error cargando el dashboard:", error);
  }

  const totalHistorias = historias.length;
  
  const pendientes = historias.filter(h => h.estado === 'pendiente_validacion');
  const totalPendientes = pendientes.length;

  const hoyStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const totalHoy = historias.filter(h => h.id.startsWith(hoyStr)).length;

  const pacientesUnicos = new Set(
    historias.map(h => h.paciente?.dni || h.paciente?.nombre).filter(Boolean)
  ).size;

  const ultimasPendientes = [...pendientes]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 5);

  return (
    <MedicalLayout currentPage="dashboard">
      <div className="space-y-8">
        <Card className="border-2 border-secondary">
          <CardHeader>
            <CardTitle className="text-xl text-balance">Importar Historias Clínicas</CardTitle>
            <CardDescription>Función principal del sistema - Cargar y procesar archivos médicos</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" className="w-full h-16 text-lg [&_svg]:stroke-current [&_svg]:fill-current [&_div]:text-inherit" asChild>
              <a href="/historias/importar">
                <Upload className="mr-4 h-8 w-8" />
                <div className="text-left">
                  <div className="font-semibold">Importar Archivos .doc/.docx</div>
                  <div className="text-sm text-muted-foreground">Extracción automática de datos médicos</div>
                </div>
              </a>
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pacientesUnicos > 0 ? pacientesUnicos : "-"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Historias Clínicas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHistorias}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPendientes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHoy}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="lg" className="w-full justify-start bg-transparent" asChild>
                <a href="/pacientes/nuevo">
                  <UserPlus className="mr-3 h-5 w-5" />
                  Nuevo Paciente
                </a>
              </Button>
              <Button variant="outline" size="lg" className="w-full justify-start bg-transparent" asChild>
                <a href="/reportes">
                  <BarChart3 className="mr-3 h-5 w-5" />
                  Ver Reportes
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pendientes de Validación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ultimasPendientes.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>No hay historias pendientes.</p>
                  </div>
                ) : (
                  ultimasPendientes.map((historia) => (
                    <div key={historia.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {historia.paciente?.nombre 
                            ? historia.paciente.nombre 
                            : <span className="text-amber-600 italic">Nombre no detectado</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {obtenerTiempoTranscurrido(historia.id)}
                        </p>
                      </div>
                      <Button size="sm" asChild className="ml-2">
                        <a href={`/historias/validar?id=${historia.id}`}>Validar</a>
                      </Button>
                    </div>
                  ))
                )}
              </div>
              
              {totalPendientes > 5 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" asChild>
                    <a href="/historias?filter=pendientes">Ver Todas ({totalPendientes})</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MedicalLayout>
  )
}