// frontend/medical-system/lib/api-pacientes.ts

// Usamos localhost para asegurar que coincida con el navegador
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- INTERFACES ---
export interface PacienteBackend {
  id: string; 
  nombre: string;
  dni: string;
  fecha_nacimiento: string | null;
  obra_social: string | null;
  nro_afiliado: string | null;
  ultima_actualizacion?: string;
  observaciones?: string;
}

export interface HistoriaBackend {
  id: string;
  fecha_consulta: string | null;
  diagnostico: string | null;
  estado: string;
  medico: string | null;
}

// --- FETCHERS ---

// 1. ESTA ES LA FUNCIÓN QUE FALTABA PARA VER LA LISTA
export async function getPacientes(): Promise<PacienteBackend[]> {
  try {
    const res = await fetch(`${API_URL}/pacientes`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error("Error conectando al backend:", error);
    return [];
  }
}

export async function getPaciente(id: string): Promise<PacienteBackend | null> {
  try {
    const res = await fetch(`${API_URL}/pacientes/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

export async function getHistoriasDePaciente(idPaciente: string): Promise<HistoriaBackend[]> {
  try {
    const res = await fetch(`${API_URL}/historias`, { cache: "no-store" });
    if (!res.ok) return [];
    
    const data = await res.json();
    const todasLasHistorias = data.items || [];

    const idBuscado = idPaciente.replace(/[\.\s]/g, "");

    return todasLasHistorias.filter((h: any) => {
       const dniHistoria = h.paciente?.dni || "";
       const dniNormalizado = dniHistoria.replace(/[\.\s]/g, "");
       return dniNormalizado === idBuscado;
    }).map((h: any) => ({
      id: h.id,
      fecha_consulta: h.fecha_consulta,
      diagnostico: h.diagnostico,
      estado: h.estado,
      medico: "Dr. Automático" 
    }));

  } catch (error) {
    return [];
  }
}


export async function eliminarPacienteRemoto(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/pacientes/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (error) {
    console.error("Error al eliminar paciente:", error);
    return false;
  }
}



export async function updatePaciente(id: string, data: Partial<PacienteBackend>): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/pacientes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (error) {
    return false;
  }
}



export async function createPaciente(data: Partial<PacienteBackend>): Promise<PacienteBackend | null> {
  try {
    const res = await fetch(`${API_URL}/pacientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error creating paciente:", error);
    return null;
  }
}









