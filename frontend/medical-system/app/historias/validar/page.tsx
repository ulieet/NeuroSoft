"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MedicalLayout } from "@/components/medical-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import {
  obtenerBorrador,
  validarHistoria,
  type HistoriaBorrador,
} from "@/lib/api-historias";

export default function PaginaValidarHistoria() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<HistoriaBorrador | null>(null);

  const [form, setForm] = useState({
    paciente_nombre: "",
    paciente_dni: "",
    fecha_consulta: "",
    diagnostico: "",
    forma: "",
    observaciones: "",
  });

  useEffect(() => {
    const cargar = async () => {
      if (!id) {
        setError("Falta el parámetro id en la URL");
        setCargando(false);
        return;
      }

      try {
        setError(null);
        setCargando(true);
        const data = await obtenerBorrador(id);
        setBorrador(data);

        setForm({
          paciente_nombre: data.paciente?.nombre ?? "",
          paciente_dni: data.paciente?.dni ?? "",
          fecha_consulta: data.consulta?.fecha ?? "",
          diagnostico: data.diagnostico ?? "",
          forma: data.forma ?? "",
          observaciones: "",
        });
      } catch (err: any) {
        setError(err.message ?? "Error al cargar el borrador");
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setGuardando(true);
      setError(null);
      setExito(null);

      // ⚠️ Ajustar este payload si el backend espera otra estructura
      const payload = {
        paciente: {
          nombre: form.paciente_nombre || null,
          dni: form.paciente_dni || null,
        },
        consulta: {
          fecha: form.fecha_consulta || null,
        },
        diagnostico: form.diagnostico || null,
        forma: form.forma || null,
        observaciones: form.observaciones || null,
      };

      await validarHistoria(id, payload);
      setExito("Historia validada correctamente.");

      // Opcional: volver al listado después de unos segundos
      setTimeout(() => {
        router.push("/historias");
      }, 1200);
    } catch (err: any) {
      setError(err.message ?? "Error al guardar la validación");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <MedicalLayout currentPage="historias">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Validar historia clínica</h1>
          <p className="text-muted-foreground">
            Revisá y corregí la información extraída automáticamente por el sistema.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Datos extraídos</CardTitle>
            <CardDescription>
              Historia ID: <span className="font-mono text-xs">{id ?? "—"}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cargando && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando borrador...
              </div>
            )}

            {!cargando && error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {!cargando && !error && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {exito && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{exito}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="paciente_nombre">Nombre del paciente</Label>
                    <Input
                      id="paciente_nombre"
                      name="paciente_nombre"
                      value={form.paciente_nombre}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="paciente_dni">DNI</Label>
                    <Input
                      id="paciente_dni"
                      name="paciente_dni"
                      value={form.paciente_dni}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="fecha_consulta">Fecha de consulta</Label>
                    <Input
                      id="fecha_consulta"
                      name="fecha_consulta"
                      type="date"
                      value={form.fecha_consulta ?? ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="diagnostico">Diagnóstico</Label>
                    <Textarea
                      id="diagnostico"
                      name="diagnostico"
                      value={form.diagnostico}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="forma">Forma clínica</Label>
                    <Input
                      id="forma"
                      name="forma"
                      placeholder="RR, PP, SP, etc."
                      value={form.forma}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="observaciones">Observaciones / comentarios</Label>
                    <Textarea
                      id="observaciones"
                      name="observaciones"
                      value={form.observaciones}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/historias")}
                    disabled={guardando}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={guardando}>
                    {guardando && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Guardar validación
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </MedicalLayout>
  );
}
