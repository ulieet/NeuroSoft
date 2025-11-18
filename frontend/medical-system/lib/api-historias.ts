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

// 🔹 ya lo tenías:
export async function listarHistorias(): Promise<HistoriaResumen[]> {
  const res = await fetch(`${BASE_URL}/historias`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al obtener historias: ${text}`);
  }
  const data = await res.json();
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

// 🔹 NUEVO: tipo básico de borrador que trae la IA
export type HistoriaBorrador = {
  paciente?: {
    nombre?: string | null;
    dni?: string | null;
  };
  consulta?: {
    fecha?: string | null;
  };
  diagnostico?: string | null;
  forma?: string | null;
  // podés ir agregando más campos (rmn, punción, etc.) cuando los necesites
};

// 🔹 NUEVO: obtener borrador desde el backend (GET /historias/{id}/borrador)
export async function obtenerBorrador(id: string): Promise<HistoriaBorrador> {
  const res = await fetch(`${BASE_URL}/historias/${id}/borrador`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al obtener borrador: ${text}`);
  }

  const raw = await res.json();
  // console.log("RAW borrador backend", raw); // si querés verlo en consola

  // Caso 1: el backend devuelve { id, estado, borrador: { ... } }
  if (raw && raw.borrador) {
    const b = raw.borrador;
    return {
      paciente: b.paciente ?? {},
      consulta: b.consulta ?? {},
      diagnostico: b.enfermedad?.diagnostico ?? null,
      forma: b.enfermedad?.forma ?? null,
    };
  }

  // Caso 2: el backend devuelve directamente el borrador { paciente, consulta, enfermedad, ... }
  return {
    paciente: raw.paciente ?? {},
    consulta: raw.consulta ?? {},
    diagnostico: raw.enfermedad?.diagnostico ?? raw.diagnostico ?? null,
    forma: raw.enfermedad?.forma ?? raw.forma ?? null,
  };
}


// 🔹 NUEVO: enviar validación (PATCH /historias/{id}/validacion)
export async function validarHistoria(id: string, payload: any): Promise<void> {
  const res = await fetch(`${BASE_URL}/historias/${id}/validacion`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al validar historia: ${text}`);
  }
}
