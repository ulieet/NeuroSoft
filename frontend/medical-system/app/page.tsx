import { MedicalLayout } from "@/components/medical-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, UserPlus, BarChart3, FileText, Users, Calendar, Clock } from "lucide-react"

export default function Dashboard() {
  return (
    <MedicalLayout currentPage="dashboard">
      <div className="space-y-8">
        <Card className="border-2 border-secondary">
          <CardHeader>
            <CardTitle className="text-xl text-balance">Importar Historias Clínicas</CardTitle>
            <CardDescription>Función principal del sistema - Cargar y procesar archivos médicos</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" className="w-full h-16 text-lg" asChild>
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
              <div className="text-2xl font-bold">247</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Historias Clínicas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,429</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
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
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">López, Juan Carlos</p>
                    <p className="text-sm text-muted-foreground">hace 3 horas</p>
                  </div>
                  <Button size="sm" asChild>
                    <a href="/historias/validar/1">Validar</a>
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Fernández, María Elena</p>
                    <p className="text-sm text-muted-foreground">hace 5 horas</p>
                  </div>
                  <Button size="sm" asChild>
                    <a href="/historias/validar/2">Validar</a>
                  </Button>
                </div>
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                  <a href="/historias?filter=pendientes">Ver Todas</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MedicalLayout>
  )
}
