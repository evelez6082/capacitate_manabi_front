export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const CAMPANA_SLUG = import.meta.env.VITE_CAMPANA_SLUG ?? "liderazgo-espam-001-2026";

export type CatalogItem = {
  id: number;
  nombre: string;
};

export type RegistrationPayload = Record<string, string | boolean>;

export type AdminUser = {
  id: number;
  email: string;
  nombre_visible: string;
  roles: string[];
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: AdminUser;
};

export type AdminResumen = {
  personas: number;
  inscripciones: number;
  campanas_activas: number;
  territorios: number;
};

export type InscripcionTerritorio = {
  provincia: string;
  canton: string;
  lat: number;
  lng: number;
  total: number;
  parroquias: { nombre: string; total: number }[];
};

export type InscripcionesTerritorioResponse = {
  items: InscripcionTerritorio[];
  total: number;
  center: { lat: number; lng: number };
};

export type AdminConsultaTipo =
  | "inscritos"
  | "aprobados"
  | "con-diploma"
  | "en-curso"
  | "aprobados-sin-diploma";

export type AdminConsultaResumenItem = {
  codigo: AdminConsultaTipo;
  nombre: string;
  total: number;
};

export type AdminConsultaRow = {
  cedula: string | null;
  nombre_completo: string | null;
  correo_principal: string | null;
  telefono_principal: string | null;
  provincia: string | null;
  canton: string | null;
  parroquia: string | null;
  curso: string | null;
  version_moodle: string | null;
  campana_inscripcion: string | null;
  fecha_inscripcion: string | null;
  porcentaje_avance: number | null;
  avance_reportado?: number | null;
  estado_avance: string | null;
  estado_aprobacion: string | null;
  cohorte_aprobacion: string | null;
  fecha_aprobacion: string | null;
  estado_solicitud_diploma: string | null;
  fecha_solicitud_diploma: string | null;
  numero_diploma: string | null;
  diploma_url: string | null;
};

export type AdminConsultaResponse = {
  tipo: AdminConsultaTipo;
  nombre: string;
  items: AdminConsultaRow[];
  total: number;
  limit: number;
  offset: number;
};

export type InscritosAgrupacion = "anio" | "mes" | "cohorte";

export type InscritoResumenItem = {
  anio?: number | null;
  mes?: number | null;
  clave?: string | number | null;
  nombre: string;
  total: number;
  campana_inscripcion_id?: number | null;
  primera_inscripcion?: string | null;
  ultima_inscripcion?: string | null;
};

export type InscritoRow = {
  inscripcion_id: number;
  persona_id: number;
  cedula: string | null;
  nombre_completo: string | null;
  correo_principal: string | null;
  telefono_principal: string | null;
  provincia: string | null;
  canton: string | null;
  parroquia: string | null;
  curso: string | null;
  version_moodle: string | null;
  campana_inscripcion_id: number | null;
  campana_inscripcion: string | null;
  fecha_inscripcion: string | null;
  estado: string | null;
  modalidad: string | null;
  ocupacion: string | null;
  institucion: string | null;
};

export type InscritoDetalle = {
  persona: Record<string, string | number | boolean | null>;
  trazabilidad: AdminConsultaRow[];
};

export type AprobadosAvanceResumen = {
  aprobados_por_cohorte: { cohorte: string; anio: number | null; mes: string | null; total: number }[];
  aprobados_por_anio: { anio: number | null; nombre: string; total: number }[];
  avance_por_rango: { rango: string; total: number }[];
};

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "No se pudo completar la solicitud.");
  }
  return data as T;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function submitRegistration(values: RegistrationPayload) {
  return requestJson(`${API_URL}/api/public/campanas/${CAMPANA_SLUG}/inscripciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
}

export async function getPublicCampaign() {
  return requestJson(`${API_URL}/api/public/campanas/${CAMPANA_SLUG}`);
}

export async function getProvincias(): Promise<CatalogItem[]> {
  const data = await requestJson<{ items: CatalogItem[] }>(`${API_URL}/api/public/catalogos/provincias`);
  return data.items;
}

export async function getCantones(provinciaId: number): Promise<CatalogItem[]> {
  const data = await requestJson<{ items: CatalogItem[] }>(
    `${API_URL}/api/public/catalogos/cantones?provincia_id=${provinciaId}`,
  );
  return data.items;
}

export async function getParroquias(cantonId: number): Promise<CatalogItem[]> {
  const data = await requestJson<{ items: CatalogItem[] }>(
    `${API_URL}/api/public/catalogos/parroquias?canton_id=${cantonId}`,
  );
  return data.items;
}

export async function getNacionalidades(): Promise<CatalogItem[]> {
  const data = await requestJson<{ items: CatalogItem[] }>(`${API_URL}/api/public/catalogos/nacionalidades`);
  return data.items;
}

export async function loginAdmin(email: string, password: string): Promise<LoginResponse> {
  return requestJson<LoginResponse>(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function getAdminMe(token: string): Promise<{ user: AdminUser }> {
  return requestJson<{ user: AdminUser }>(`${API_URL}/api/auth/me`, {
    headers: authHeaders(token),
  });
}

export async function getAdminResumen(token: string): Promise<AdminResumen> {
  return requestJson<AdminResumen>(`${API_URL}/api/admin/metricas/resumen`, {
    headers: authHeaders(token),
  });
}

export async function getInscripcionesTerritorio(token: string): Promise<InscripcionesTerritorioResponse> {
  return requestJson<InscripcionesTerritorioResponse>(`${API_URL}/api/admin/metricas/inscripciones-territorio`, {
    headers: authHeaders(token),
  });
}

export async function getAdminConsultasResumen(token: string): Promise<{ items: AdminConsultaResumenItem[] }> {
  return requestJson<{ items: AdminConsultaResumenItem[] }>(`${API_URL}/api/admin/consultas/resumen`, {
    headers: authHeaders(token),
  });
}

export async function getAdminConsulta(
  token: string,
  tipo: AdminConsultaTipo,
  params: { q?: string; limit?: number; offset?: number } = {},
): Promise<AdminConsultaResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.offset) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return requestJson<AdminConsultaResponse>(
    `${API_URL}/api/admin/consultas/${tipo}${query ? `?${query}` : ""}`,
    { headers: authHeaders(token) },
  );
}

export function getAdminConsultaExportUrl(tipo: AdminConsultaTipo, q?: string): string {
  const searchParams = new URLSearchParams();
  if (q) searchParams.set("q", q);
  const query = searchParams.toString();
  return `${API_URL}/api/admin/consultas/${tipo}/export.csv${query ? `?${query}` : ""}`;
}

export async function downloadAdminConsultaCsv(token: string, tipo: AdminConsultaTipo, q?: string): Promise<Blob> {
  const response = await fetch(getAdminConsultaExportUrl(tipo, q), {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "No se pudo exportar la consulta.");
  }
  return response.blob();
}

export async function getInscritosResumen(
  token: string,
  agruparPor: InscritosAgrupacion,
): Promise<{ agrupar_por: InscritosAgrupacion; items: InscritoResumenItem[] }> {
  return requestJson<{ agrupar_por: InscritosAgrupacion; items: InscritoResumenItem[] }>(
    `${API_URL}/api/admin/inscritos/resumen?agrupar_por=${agruparPor}`,
    { headers: authHeaders(token) },
  );
}

export async function getInscritos(
  token: string,
  params: { anio?: number | null; mes?: number | null; campana_id?: number | null; q?: string; limit?: number; offset?: number },
): Promise<{ items: InscritoRow[]; total: number; limit: number; offset: number }> {
  const searchParams = new URLSearchParams();
  if (params.anio) searchParams.set("anio", String(params.anio));
  if (params.mes) searchParams.set("mes", String(params.mes));
  if (params.campana_id) searchParams.set("campana_id", String(params.campana_id));
  if (params.q) searchParams.set("q", params.q);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.offset) searchParams.set("offset", String(params.offset));
  return requestJson(`${API_URL}/api/admin/inscritos?${searchParams.toString()}`, {
    headers: authHeaders(token),
  });
}

export async function getInscritoDetalle(token: string, personaId: number): Promise<InscritoDetalle> {
  return requestJson<InscritoDetalle>(`${API_URL}/api/admin/inscritos/${personaId}/detalle`, {
    headers: authHeaders(token),
  });
}

export async function getAprobadosAvanceResumen(token: string): Promise<AprobadosAvanceResumen> {
  return requestJson<AprobadosAvanceResumen>(`${API_URL}/api/admin/aprobados-avance/resumen`, {
    headers: authHeaders(token),
  });
}
