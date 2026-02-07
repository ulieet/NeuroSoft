// frontend/medical-system/lib/api-historias.ts

import { 
  obtenerHistoriasClinicas, 
  obtenerPacientes, 
  inicializarDatosDeEjemplo,
  modificarHistoriaClinica, 
  obtenerHistoriaClinicaPorId
} from "@/lib/almacen-datos";

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

// 🔹 HELPER: Fetch con Timeout (falla rápido si no hay backend)
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 2000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// --- LISTAR (Con Timeout y Fallback) ---
export async function listarHistorias(): Promise<HistoriaResumen[]> {
  try {
    // Intentamos conectar por 2 segundos máximo
    const res = await fetchWithTimeout(`${BASE_URL}/historias`, { cache: "no-store" }, 2000);
    
    if (!res.ok) throw new Error("Backend error");
    
    const data = await res.json();
    // Aseguramos que data sea un array, o extraemos la propiedad correcta
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    return [];

  } catch (error) {
    // Si falla o tarda más de 2s, usamos datos locales al instante
    console.warn("Backend OFF o lento. Usando datos locales.");
    
    if (typeof window !== "undefined") {
      inicializarDatosDeEjemplo(); 
      const historiasLocales = obtenerHistoriasClinicas();
      const pacientesLocales = obtenerPacientes();

      return historiasLocales.map((h) => {
        // Ojo: h.pacienteId ahora es string en tu nuevo almacen-datos
        const paciente = pacientesLocales.find((p) => String(p.id) === String(h.pacienteId));
        let estadoMapped: string = h.estado;
        if (h.estado === "pendiente") estadoMapped = "pendiente_validacion";

        return {
          id: String(h.id), 
          estado: estadoMapped,
          paciente: paciente
            ? { nombre: `${paciente.nombre} ${paciente.apellido}`, dni: paciente.dni }
            : { nombre: "Desconocido", dni: null },
          diagnostico: h.diagnostico,
          forma: h.formaEvolutiva ?? null,
          fecha_consulta: h.fecha,
        };
      });
    }
    return [];
  }
}

export async function validarHistoriasMasivas() {
  const res = await fetch(`${BASE_URL}/historias/validacion-masiva`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Error al realizar la validación masiva");
  }

  return res.json();
}

export async function eliminarHistoriaRemota(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/historias/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Error al eliminar la historia del servidor");
  }
}

// --- IMPORTAR ---
export async function importarHistoriaArchivo(file: File) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    // Damos un poco más de tiempo para subir archivos (5s) por si hay que abrir Word
    const res = await fetchWithTimeout(`${BASE_URL}/importaciones/historias`, {
      method: "POST",
      body: formData,
    }, 5000);
    
    if (!res.ok) throw new Error("Backend error");
    return res.json();
  } catch (e) {
    console.warn("Backend OFF. Simulación de importación exitosa.");
    return { success: true, message: "Importación simulada en frontend" };
  }
}

export type HistoriaBorrador = {
  paciente?: { nombre?: string | null; dni?: string | null; };
  consulta?: { fecha?: string | null; };
  diagnostico?: string | null;
  forma?: string | null;
};

// --- OBTENER BORRADOR ---
export async function obtenerBorrador(id: string): Promise<HistoriaBorrador> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/historias/${id}/borrador`, { cache: "no-store" }, 2000);
    if (!res.ok) throw new Error("Backend error");
    const raw = await res.json();
    return raw.borrador || {};
  } catch (error) {
    console.warn("Usando borrador local (fallback)");
    if (typeof window !== "undefined") {
      // AQUÍ ESTABA EL ERROR: No usamos Number(id) ni parseInt
      const hLocal = obtenerHistoriaClinicaPorId(id); 
      if (hLocal) {
         return {
           paciente: { nombre: "Paciente Local", dni: "123" },
           consulta: { fecha: hLocal.fecha },
           diagnostico: hLocal.diagnostico,
           forma: hLocal.formaEvolutiva
         };
      }
    }
    return {};
  }
}

// --- VALIDAR (Con Timeout y Fallback) ---
export async function autoValidarHistoria(id: string): Promise<void> {
  try {
    // 1. Intento Backend (Rápido)
    const resBorrador = await fetchWithTimeout(`${BASE_URL}/historias/${id}/borrador`, { cache: "no-store" }, 2000);
    if (!resBorrador.ok) throw new Error("Backend offline");
    
    const data = await resBorrador.json();
    if (!data.borrador) throw new Error("Borrador vacío");

    const resValidar = await fetchWithTimeout(`${BASE_URL}/historias/${id}/validacion`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data.borrador),
    }, 3000);

    if (!resValidar.ok) throw new Error("Error validando en backend");

  } catch (error) {
    console.warn(`Backend OFF. Validando historia ${id} localmente.`);
    
    // 2. Fallback Local
    if (typeof window !== "undefined") {
      // AQUÍ TAMBIÉN: Usamos el ID como string directo
      const historiaLocal = obtenerHistoriaClinicaPorId(id);
      
      if (historiaLocal) {
        modificarHistoriaClinica(id, {
          ...historiaLocal,
          estado: "validada"
        });
        // Simulamos un mini delay para feedback visual (300ms)
        await new Promise(resolve => setTimeout(resolve, 300));
        return; 
      }
    }
    throw error;
  }
}

export async function validarHistoria(id: string, payload: any): Promise<void> {
   // Wrapper simple para validación manual
   try {
      const res = await fetchWithTimeout(`${BASE_URL}/historias/${id}/validacion`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }, 3000);
      if (!res.ok) throw new Error("Error backend");
   } catch (e) {
      // Fallback local para validación manual
      if (typeof window !== "undefined") {
        // AQUÍ TAMBIÉN: Usamos el ID como string
        const h = obtenerHistoriaClinicaPorId(id);
        if (h) {
           modificarHistoriaClinica(id, { ...h, ...payload, estado: "validada" });
           return;
        }
      }
      throw e;
   }
}