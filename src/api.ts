const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const CAMPANA_SLUG = import.meta.env.VITE_CAMPANA_SLUG ?? "liderazgo-espam-001-2026";

export type CatalogItem = {
  id: number;
  nombre: string;
};

export type RegistrationPayload = Record<string, string | boolean>;

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "No se pudo completar la solicitud.");
  }
  return data as T;
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
