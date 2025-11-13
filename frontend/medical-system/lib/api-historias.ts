// lib/api-historias.ts

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type PacienteResumen = {
  nombre: string | null;
  dni: string | null;
};

export type HistoriaResumen = {
  id: string;
  estado: string;
  paciente?: PacienteResumen;
  diagnostico?: string | null;
  forma?: string | null;
  fecha_consulta?: string | null;
};

export async function listarHistorias(): Promise<HistoriaResumen[]> {
  const res = await fetch(`${BASE_URL}/historias`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al obtener historias: ${text}`);
  }

  const data = await res.json();

  // Soporta ambas formas: array directo o { total, items }
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;

  return [];
}

export async function importarHistoriaArchivo(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/importaciones/historias`, {
    method: "POST",
    body: formData,
  });

  if (res.status === 409) {
    const text = await res.text();
    throw new Error(`Historia duplicada: ${text}`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al importar historia: ${text}`);
  }

  return res.json();
}
