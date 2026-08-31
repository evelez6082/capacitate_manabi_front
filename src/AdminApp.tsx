import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  Modal,
  Paper,
  PasswordInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
  rem,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconCertificate,
  IconChartBar,
  IconDownload,
  IconEye,
  IconLogout,
  IconMap2,
  IconRefresh,
  IconSearch,
  IconShieldLock,
  IconUsers,
} from "@tabler/icons-react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import {
  getAdminMe,
  getAdminResumen,
  getAprobadosAvanceResumen,
  getAdminConsulta,
  getAdminConsultasResumen,
  getInscritoDetalle,
  getInscritos,
  getInscritosResumen,
  getInscripcionesTerritorio,
  loginAdmin,
  downloadAdminConsultaCsv,
  type AdminConsultaResponse,
  type AdminConsultaResumenItem,
  type AdminConsultaTipo,
  type AdminResumen,
  type AdminUser,
  type AprobadosAvanceResumen,
  type InscritoDetalle,
  type InscritoResumenItem,
  type InscritoRow,
  type InscritosAgrupacion,
  type InscripcionTerritorio,
} from "./api";

const TOKEN_KEY = "capacitate-manabi-admin-token";
const USER_KEY = "capacitate-manabi-admin-user";

type AdminSession = {
  token: string;
  user: AdminUser;
};

const CONSULTA_LIMIT = 50;
const INSCRITOS_LIMIT = 50;

const consultaLabels: Record<AdminConsultaTipo, string> = {
  inscritos: "Inscritos",
  aprobados: "Aprobados",
  "con-diploma": "Con diploma",
  "en-curso": "En curso",
  "aprobados-sin-diploma": "Aprobados sin diploma",
};

function readSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const userText = localStorage.getItem(USER_KEY);
  if (!token || !userText) return null;
  try {
    return { token, user: JSON.parse(userText) };
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function saveSession(session: AdminSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function AdminLogin({ onLogin }: { onLogin: (session: AdminSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await loginAdmin(email, password);
      const session = { token: response.access_token, user: response.user };
      saveSession(session);
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Center className="admin-login-screen">
      <Paper className="admin-login-card" radius="md" shadow="xl" p="xl" withBorder>
        <Stack gap="lg">
          <Group gap="sm">
            <Center className="admin-login-icon">
              <IconShieldLock size={28} stroke={1.8} />
            </Center>
            <Box>
              <Text size="xs" fw={800} tt="uppercase" c="teal.7" lts={1.6}>
                Capacitate Manabi
              </Text>
              <Title order={1} size="h2">
                Panel supervisor
              </Title>
            </Box>
          </Group>

          <Text c="dimmed" size="sm">
            Ingresa con un usuario supervisor o administrador para revisar las metricas de inscripciones.
          </Text>

          {error && (
            <Alert color="red" icon={<IconAlertCircle size={18} />}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack>
              <TextInput
                label="Correo"
                placeholder="supervisor@capacitate.ec"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                autoComplete="email"
                required
              />
              <PasswordInput
                label="Contrasena"
                placeholder="Tu contrasena"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                autoComplete="current-password"
                required
              />
              <Button type="submit" loading={loading} leftSection={<IconShieldLock size={18} />}>
                Ingresar
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Center>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: ReactNode }) {
  return (
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between" wrap="nowrap">
        <Box>
          <Text size="xs" fw={800} tt="uppercase" c="dimmed" lts={1}>
            {label}
          </Text>
          <Title order={2} mt={4}>
            {value}
          </Title>
        </Box>
        <Center className="admin-stat-icon">{icon}</Center>
      </Group>
    </Card>
  );
}

function TerritoryMap({ items }: { items: InscripcionTerritorio[] }) {
  const theme = useMantineTheme();
  const max = Math.max(...items.map((item) => item.total), 1);

  return (
    <MapContainer center={[-1.0546, -80.4545]} zoom={8} scrollWheelZoom className="admin-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {items.map((item) => (
        <CircleMarker
          key={`${item.provincia}-${item.canton}`}
          center={[item.lat, item.lng]}
          radius={Math.max(9, Math.min(32, 8 + (item.total / max) * 26))}
          pathOptions={{
            color: theme.colors.teal[8],
            fillColor: theme.colors.teal[5],
            fillOpacity: 0.55,
            weight: 2,
          }}
        >
          <Popup>
            <strong>{item.canton}</strong>
            <br />
            {item.provincia}
            <br />
            {item.total} inscripciones
            {item.parroquias.length > 0 && (
              <>
                <Divider my="xs" />
                {item.parroquias.slice(0, 5).map((parroquia) => (
                  <Text key={parroquia.nombre} size="xs">
                    {parroquia.nombre}: {parroquia.total}
                  </Text>
                ))}
              </>
            )}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-EC", { year: "numeric", month: "short", day: "2-digit" });
}

function consultaCount(resumen: AdminConsultaResumenItem[], tipo: AdminConsultaTipo) {
  return resumen.find((item) => item.codigo === tipo)?.total;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function ConsultasPanel({
  consulta,
  consultaResumen,
  consultaTipo,
  consultaSearch,
  consultaSearchDraft,
  consultaPage,
  consultaLoading,
  exporting,
  onTipoChange,
  onSearchDraftChange,
  onSearchSubmit,
  onClearSearch,
  onPageChange,
  onExport,
}: {
  consulta: AdminConsultaResponse | null;
  consultaResumen: AdminConsultaResumenItem[];
  consultaTipo: AdminConsultaTipo;
  consultaSearch: string;
  consultaSearchDraft: string;
  consultaPage: number;
  consultaLoading: boolean;
  exporting: boolean;
  onTipoChange: (tipo: AdminConsultaTipo) => void;
  onSearchDraftChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClearSearch: () => void;
  onPageChange: (page: number) => void;
  onExport: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil((consulta?.total ?? 0) / CONSULTA_LIMIT));
  const activeTotal = consulta?.total ?? consultaCount(consultaResumen, consultaTipo) ?? 0;

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text size="xs" fw={800} tt="uppercase" c="teal.7" lts={1.4}>
              Consultas operativas
            </Text>
            <Title order={2}>Participantes por estado</Title>
            <Text size="sm" c="dimmed">
              Busca por cedula, nombre, correo o telefono y exporta la vista activa.
            </Text>
          </Box>
          <Button
            variant="light"
            leftSection={<IconDownload size={18} />}
            onClick={onExport}
            loading={exporting}
            disabled={consultaLoading}
          >
            Exportar CSV
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, xs: 2, md: 5 }}>
          {(Object.keys(consultaLabels) as AdminConsultaTipo[]).map((tipo) => (
            <Card
              key={tipo}
              withBorder
              radius="md"
              p="md"
              className={tipo === consultaTipo ? "admin-consulta-card active" : "admin-consulta-card"}
              onClick={() => onTipoChange(tipo)}
            >
              <Text size="xs" fw={800} tt="uppercase" c="dimmed">
                {consultaLabels[tipo]}
              </Text>
              <Title order={3}>{consultaCount(consultaResumen, tipo) ?? "-"}</Title>
            </Card>
          ))}
        </SimpleGrid>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit();
          }}
        >
          <Group align="flex-end">
            <TextInput
              label="Buscar"
              placeholder="Cedula, nombre, correo o telefono"
              value={consultaSearchDraft}
              onChange={(event) => onSearchDraftChange(event.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1 }}
            />
            <Button type="submit" leftSection={<IconSearch size={18} />}>
              Buscar
            </Button>
            {consultaSearch && (
              <Button
                variant="subtle"
                color="gray"
                onClick={onClearSearch}
              >
                Limpiar
              </Button>
            )}
          </Group>
        </form>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {activeTotal} registros encontrados
          </Text>
          <Badge color="teal" variant="light">
            Pagina {consultaPage + 1} de {totalPages}
          </Badge>
        </Group>

        <Table.ScrollContainer minWidth={1180}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Participante</Table.Th>
                <Table.Th>Contacto</Table.Th>
                <Table.Th>Territorio</Table.Th>
                <Table.Th>Campana</Table.Th>
                <Table.Th>Avance</Table.Th>
                <Table.Th>Aprobacion</Table.Th>
                <Table.Th>Diploma</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {consultaLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Center py="xl">
                      <Loader color="teal" />
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : consulta?.items.length ? (
                consulta.items.map((row, index) => (
                  <Table.Tr key={`${row.cedula}-${row.fecha_inscripcion}-${index}`}>
                    <Table.Td>
                      <Text fw={700}>{row.nombre_completo || "Sin nombre"}</Text>
                      <Text size="xs" c="dimmed">
                        {row.cedula || "Sin cedula"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{row.correo_principal || "-"}</Text>
                      <Text size="xs" c="dimmed">
                        {row.telefono_principal || "-"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{row.canton || "Sin canton"}</Text>
                      <Text size="xs" c="dimmed">
                        {row.parroquia || row.provincia || "-"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{row.campana_inscripcion || "-"}</Text>
                      <Text size="xs" c="dimmed">
                        {formatDate(row.fecha_inscripcion)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={Number(row.porcentaje_avance || 0) >= 100 ? "green" : "yellow"} variant="light">
                        {row.porcentaje_avance ?? 0}%
                      </Badge>
                      <Text size="xs" c="dimmed" mt={4}>
                        {row.estado_avance || "Sin reporte"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{row.estado_aprobacion || "-"}</Text>
                      <Text size="xs" c="dimmed">
                        {row.cohorte_aprobacion || formatDate(row.fecha_aprobacion)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {row.diploma_url ? (
                        <Button
                          component="a"
                          href={row.diploma_url}
                          target="_blank"
                          rel="noreferrer"
                          size="xs"
                          variant="light"
                          leftSection={<IconCertificate size={14} />}
                        >
                          Ver diploma
                        </Button>
                      ) : (
                        <Text size="sm" c="dimmed">
                          {row.estado_solicitud_diploma || "Sin diploma"}
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Center py="xl">
                      <Text c="dimmed">No hay registros para esta consulta.</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Group justify="space-between">
          <Button variant="light" disabled={consultaPage === 0 || consultaLoading} onClick={() => onPageChange(consultaPage - 1)}>
            Anterior
          </Button>
          <Button
            variant="light"
            disabled={consultaPage + 1 >= totalPages || consultaLoading}
            onClick={() => onPageChange(consultaPage + 1)}
          >
            Siguiente
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

function groupFilterFromItem(agrupacion: InscritosAgrupacion, item: InscritoResumenItem) {
  if (agrupacion === "anio") return { anio: item.anio ?? Number(item.clave) };
  if (agrupacion === "mes") return { anio: item.anio ?? null, mes: item.mes ?? null };
  return { campana_id: item.campana_inscripcion_id ?? null };
}

function groupDisplayName(agrupacion: InscritosAgrupacion, item: InscritoResumenItem) {
  if (agrupacion !== "mes" || !item.anio || !item.mes) return item.nombre;
  const date = new Date(item.anio, item.mes - 1, 1);
  return date.toLocaleDateString("es-EC", { year: "numeric", month: "long" });
}

function InscritosPanel({ token }: { token: string }) {
  const [agrupacion, setAgrupacion] = useState<InscritosAgrupacion>("anio");
  const [resumen, setResumen] = useState<InscritoResumenItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<InscritoResumenItem | null>(null);
  const [rows, setRows] = useState<InscritoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [loadingRows, setLoadingRows] = useState(true);
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState<InscritoDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  useEffect(() => {
    setLoadingResumen(true);
    setError("");
    getInscritosResumen(token, agrupacion)
      .then((data) => {
        setResumen(data.items);
        setSelectedGroup(null);
        setPage(0);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el resumen."))
      .finally(() => setLoadingResumen(false));
  }, [agrupacion, token]);

  useEffect(() => {
    setLoadingRows(true);
    setError("");
    const filters = selectedGroup ? groupFilterFromItem(agrupacion, selectedGroup) : {};
    getInscritos(token, {
      ...filters,
      q,
      limit: INSCRITOS_LIMIT,
      offset: page * INSCRITOS_LIMIT,
    })
      .then((data) => {
        setRows(data.items);
        setTotal(data.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los inscritos."))
      .finally(() => setLoadingRows(false));
  }, [agrupacion, page, q, selectedGroup, token]);

  async function openDetalle(personaId: number) {
    setDetalleLoading(true);
    setError("");
    try {
      setDetalle(await getInscritoDetalle(token, personaId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el detalle.");
    } finally {
      setDetalleLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / INSCRITOS_LIMIT));

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" p="lg">
        <Stack>
          <Group justify="space-between" align="flex-end">
            <Box>
              <Text size="xs" fw={800} tt="uppercase" c="teal.7" lts={1.4}>
                Gestion de inscritos
              </Text>
              <Title order={2}>Resumen por cohortes y periodos</Title>
              <Text size="sm" c="dimmed">
                Agrupa por ano, mes o cohorte/campana y abre el detalle de cada inscrito.
              </Text>
            </Box>
            <SegmentedControl
              value={agrupacion}
              onChange={(value) => setAgrupacion(value as InscritosAgrupacion)}
              data={[
                { label: "Ano", value: "anio" },
                { label: "Mes", value: "mes" },
                { label: "Cohorte", value: "cohorte" },
              ]}
            />
          </Group>

          {error && (
            <Alert color="red" icon={<IconAlertCircle size={18} />}>
              {error}
            </Alert>
          )}

          {loadingResumen ? (
            <Center h={120}>
              <Loader color="teal" />
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>
              {resumen.map((item) => (
                <Card
                  key={`${agrupacion}-${item.clave ?? item.campana_inscripcion_id ?? item.nombre}`}
                  withBorder
                  radius="md"
                  p="md"
                  className={selectedGroup === item ? "admin-consulta-card active" : "admin-consulta-card"}
                  onClick={() => {
                    setSelectedGroup(item);
                    setPage(0);
                  }}
                >
                  <Text size="xs" fw={800} tt="uppercase" c="dimmed">
                    {agrupacion === "cohorte" ? "Cohorte/campana" : agrupacion}
                  </Text>
                  <Text fw={800} lineClamp={2}>
                    {groupDisplayName(agrupacion, item)}
                  </Text>
                  <Title order={3}>{item.total}</Title>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack>
          <Group justify="space-between" align="flex-end">
            <Box>
              <Title order={3}>Detalle de inscritos</Title>
              <Text size="sm" c="dimmed">
                {selectedGroup ? `Filtro activo: ${groupDisplayName(agrupacion, selectedGroup)}` : "Mostrando todos los inscritos."}
              </Text>
            </Box>
            {selectedGroup && (
              <Button variant="subtle" color="gray" onClick={() => setSelectedGroup(null)}>
                Ver todos
              </Button>
            )}
          </Group>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setQ(qDraft.trim());
              setPage(0);
            }}
          >
            <Group align="flex-end">
              <TextInput
                label="Buscar inscrito"
                placeholder="Cedula, nombre, correo o telefono"
                value={qDraft}
                onChange={(event) => setQDraft(event.currentTarget.value)}
                leftSection={<IconSearch size={16} />}
                style={{ flex: 1 }}
              />
              <Button type="submit" leftSection={<IconSearch size={18} />}>
                Buscar
              </Button>
              {q && (
                <Button
                  variant="subtle"
                  color="gray"
                  onClick={() => {
                    setQ("");
                    setQDraft("");
                    setPage(0);
                  }}
                >
                  Limpiar
                </Button>
              )}
            </Group>
          </form>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {total} inscritos encontrados
            </Text>
            <Badge color="teal" variant="light">
              Pagina {page + 1} de {totalPages}
            </Badge>
          </Group>

          <Table.ScrollContainer minWidth={980}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Inscrito</Table.Th>
                  <Table.Th>Territorio</Table.Th>
                  <Table.Th>Cohorte/campana</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loadingRows ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Center py="xl">
                        <Loader color="teal" />
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                ) : rows.length ? (
                  rows.map((row) => (
                    <Table.Tr key={row.inscripcion_id}>
                      <Table.Td>
                        <Text fw={700}>{row.nombre_completo || "Sin nombre"}</Text>
                        <Text size="xs" c="dimmed">
                          {row.cedula || "Sin cedula"} · {row.correo_principal || "Sin correo"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{row.canton || "-"}</Text>
                        <Text size="xs" c="dimmed">
                          {row.parroquia || row.provincia || "-"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" lineClamp={2}>
                          {row.campana_inscripcion || "-"}
                        </Text>
                      </Table.Td>
                      <Table.Td>{formatDate(row.fecha_inscripcion)}</Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="gray">
                          {row.estado || "registrada"}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconEye size={14} />}
                          onClick={() => openDetalle(row.persona_id)}
                        >
                          Ver
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Center py="xl">
                        <Text c="dimmed">No hay inscritos para este filtro.</Text>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          <Group justify="space-between">
            <Button variant="light" disabled={page === 0 || loadingRows} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button variant="light" disabled={page + 1 >= totalPages || loadingRows} onClick={() => setPage(page + 1)}>
              Siguiente
            </Button>
          </Group>
        </Stack>
      </Card>

      <Modal opened={Boolean(detalle) || detalleLoading} onClose={() => setDetalle(null)} title="Detalle del inscrito" size="xl">
        {detalleLoading ? (
          <Center h={180}>
            <Loader color="teal" />
          </Center>
        ) : detalle ? (
          <Stack>
            <Paper p="md" withBorder radius="md">
              <Title order={3}>{String(detalle.persona.nombre_completo || "Sin nombre")}</Title>
              <Text size="sm" c="dimmed">
                {String(detalle.persona.cedula || "Sin cedula")} · {String(detalle.persona.correo_principal || "Sin correo")} ·{" "}
                {String(detalle.persona.telefono_principal || "Sin telefono")}
              </Text>
              <Text size="sm" mt="xs">
                {String(detalle.persona.canton || "-")} / {String(detalle.persona.parroquia || "-")}
              </Text>
            </Paper>
            <Table.ScrollContainer minWidth={900}>
              <Table highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Campana</Table.Th>
                    <Table.Th>Version</Table.Th>
                    <Table.Th>Avance</Table.Th>
                    <Table.Th>Aprobacion</Table.Th>
                    <Table.Th>Diploma</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {detalle.trazabilidad.map((row, index) => (
                    <Table.Tr key={`${row.campana_inscripcion}-${index}`}>
                      <Table.Td>{row.campana_inscripcion || "-"}</Table.Td>
                      <Table.Td>{row.version_moodle || "-"}</Table.Td>
                      <Table.Td>{row.porcentaje_avance ?? row.avance_reportado ?? 0}%</Table.Td>
                      <Table.Td>{row.estado_aprobacion || "-"}</Table.Td>
                      <Table.Td>
                        {row.diploma_url ? (
                          <Button component="a" href={row.diploma_url} target="_blank" size="xs" variant="light">
                            Ver diploma
                          </Button>
                        ) : (
                          row.numero_diploma || "-"
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Stack>
        ) : null}
      </Modal>
    </Stack>
  );
}

function AprobadosAvancePanel({ token }: { token: string }) {
  const [resumen, setResumen] = useState<AprobadosAvanceResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getAprobadosAvanceResumen(token)
      .then(setResumen)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar aprobados y avance."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <Center h={320}>
        <Loader color="teal" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />}>
          {error}
        </Alert>
      )}
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Card withBorder radius="md" p="lg">
          <Text size="xs" fw={800} tt="uppercase" c="dimmed">
            Aprobados por ano
          </Text>
          {(resumen?.aprobados_por_anio || []).map((item) => (
            <Group key={item.nombre} justify="space-between" mt="sm">
              <Text>{item.nombre}</Text>
              <Badge color="teal">{item.total}</Badge>
            </Group>
          ))}
        </Card>
        <Card withBorder radius="md" p="lg">
          <Text size="xs" fw={800} tt="uppercase" c="dimmed">
            Avance sin aprobar
          </Text>
          {(resumen?.avance_por_rango || []).map((item) => (
            <Group key={item.rango} justify="space-between" mt="sm">
              <Text>{item.rango}</Text>
              <Badge color={item.rango === "100%" ? "green" : "yellow"}>{item.total}</Badge>
            </Group>
          ))}
        </Card>
        <Card withBorder radius="md" p="lg">
          <Text size="xs" fw={800} tt="uppercase" c="dimmed">
            Consultas clave
          </Text>
          <Text size="sm" c="dimmed" mt="sm">
            Usa las consultas de abajo para revisar aprobados, pendientes de diploma, participantes en curso y diplomas emitidos.
          </Text>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" p="lg">
        <Title order={3} mb="md">
          Aprobados por cohorte
        </Title>
        <Table.ScrollContainer minWidth={760}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Cohorte</Table.Th>
                <Table.Th>Ano</Table.Th>
                <Table.Th>Mes</Table.Th>
                <Table.Th>Total</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(resumen?.aprobados_por_cohorte || []).map((item) => (
                <Table.Tr key={item.cohorte}>
                  <Table.Td>{item.cohorte}</Table.Td>
                  <Table.Td>{item.anio || "-"}</Table.Td>
                  <Table.Td>{item.mes || "-"}</Table.Td>
                  <Table.Td>
                    <Badge color="teal">{item.total}</Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}

function AdminDashboard({ session, onLogout }: { session: AdminSession; onLogout: () => void }) {
  const [opened, { toggle }] = useDisclosure();
  const [activeView, setActiveView] = useState<"mapa" | "inscritos" | "aprobados" | "consultas">("mapa");
  const [resumen, setResumen] = useState<AdminResumen | null>(null);
  const [territorios, setTerritorios] = useState<InscripcionTerritorio[]>([]);
  const [consultaResumen, setConsultaResumen] = useState<AdminConsultaResumenItem[]>([]);
  const [consultaTipo, setConsultaTipo] = useState<AdminConsultaTipo>("inscritos");
  const [consultaSearchDraft, setConsultaSearchDraft] = useState("");
  const [consultaSearch, setConsultaSearch] = useState("");
  const [consultaPage, setConsultaPage] = useState(0);
  const [consulta, setConsulta] = useState<AdminConsultaResponse | null>(null);
  const [consultaLoading, setConsultaLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [nextResumen, nextTerritorios, nextConsultas] = await Promise.all([
        getAdminResumen(session.token),
        getInscripcionesTerritorio(session.token),
        getAdminConsultasResumen(session.token),
      ]);
      setResumen(nextResumen);
      setTerritorios(nextTerritorios.items);
      setConsultaResumen(nextConsultas.items);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las metricas.");
    } finally {
      setLoading(false);
    }
  }, [session.token]);

  const loadConsulta = useCallback(async () => {
    setConsultaLoading(true);
    setError("");
    try {
      const nextConsulta = await getAdminConsulta(session.token, consultaTipo, {
        q: consultaSearch,
        limit: CONSULTA_LIMIT,
        offset: consultaPage * CONSULTA_LIMIT,
      });
      setConsulta(nextConsulta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la consulta.");
    } finally {
      setConsultaLoading(false);
    }
  }, [consultaPage, consultaSearch, consultaTipo, session.token]);

  useEffect(() => {
    loadData();
    const timer = window.setInterval(loadData, 30000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    loadConsulta();
  }, [loadConsulta]);

  const topTerritories = useMemo(() => territorios.slice(0, 10), [territorios]);

  const viewTitle = {
    mapa: "Mapa de participantes",
    inscritos: "Gestion de inscritos",
    aprobados: "Aprobados y avance",
    consultas: "Consultas generales",
  }[activeView];

  const viewDescription = {
    mapa: "Se actualiza automaticamente cada 30 segundos.",
    inscritos: "Visualiza inscritos por ano, mes o cohorte y abre el detalle de cada participante.",
    aprobados: "Resumenes academicos, cohortes de aprobacion y avance de quienes siguen en curso.",
    consultas: "Visualiza estados academicos y exporta consultas para gestion.",
  }[activeView];

  function handleConsultaTipoChange(tipo: AdminConsultaTipo) {
    setConsultaTipo(tipo);
    setConsultaPage(0);
  }

  function handleSearchSubmit() {
    setConsultaSearch(consultaSearchDraft.trim());
    setConsultaPage(0);
  }

  function handleClearSearch() {
    setConsultaSearchDraft("");
    setConsultaSearch("");
    setConsultaPage(0);
  }

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const blob = await downloadAdminConsultaCsv(session.token, consultaTipo, consultaSearch);
      downloadBlob(blob, `capacitate-manabi-${consultaTipo}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo exportar la consulta.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell
      header={{ height: 66 }}
      navbar={{ width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <IconMap2 size={24} color="var(--mantine-color-teal-7)" />
            <Box>
              <Text fw={800}>Capacitate Manabi</Text>
              <Text size="xs" c="dimmed">
                Panel de supervision
              </Text>
            </Box>
          </Group>
          <Group gap="xs">
            <Badge color="teal" variant="light">
              {session.user.roles.join(", ") || "sin rol"}
            </Badge>
            <Tooltip label="Cerrar sesion">
              <Button variant="subtle" color="gray" onClick={onLogout} px="xs">
                <IconLogout size={20} />
              </Button>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack>
          <Text size="xs" fw={800} tt="uppercase" c="dimmed" lts={1}>
            Usuario
          </Text>
          <Paper p="md" radius="md" withBorder>
            <Text fw={700}>{session.user.nombre_visible || session.user.email}</Text>
            <Text size="sm" c="dimmed">
              {session.user.email}
            </Text>
          </Paper>
          <Button
            justify="flex-start"
            variant={activeView === "mapa" ? "light" : "subtle"}
            color={activeView === "mapa" ? "teal" : "gray"}
            leftSection={<IconChartBar size={18} />}
            onClick={() => setActiveView("mapa")}
          >
            Metricas
          </Button>
          <Button
            justify="flex-start"
            variant={activeView === "inscritos" ? "light" : "subtle"}
            color={activeView === "inscritos" ? "teal" : "gray"}
            leftSection={<IconUsers size={18} />}
            onClick={() => setActiveView("inscritos")}
          >
            Inscritos
          </Button>
          <Button
            justify="flex-start"
            variant={activeView === "aprobados" ? "light" : "subtle"}
            color={activeView === "aprobados" ? "teal" : "gray"}
            leftSection={<IconCertificate size={18} />}
            onClick={() => setActiveView("aprobados")}
          >
            Aprobados y avance
          </Button>
          <Button
            justify="flex-start"
            variant={activeView === "consultas" ? "light" : "subtle"}
            color={activeView === "consultas" ? "teal" : "gray"}
            leftSection={<IconUsers size={18} />}
            onClick={() => setActiveView("consultas")}
          >
            Consultas
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main className="admin-main">
        <Container size="xl">
          <Stack gap="lg">
            <Group justify="space-between" align="flex-end">
              <Box>
                <Text size="xs" fw={800} tt="uppercase" c="teal.7" lts={1.4}>
                  Panel administrativo
                </Text>
                <Title order={1}>{viewTitle}</Title>
                <Text c="dimmed" size="sm">
                  {viewDescription}
                </Text>
              </Box>
              <Button variant="light" leftSection={<IconRefresh size={18} />} onClick={loadData} loading={loading}>
                Actualizar
              </Button>
            </Group>

            {error && (
              <Alert color="red" icon={<IconAlertCircle size={18} />}>
                {error}
              </Alert>
            )}

            <Tabs
              value={activeView}
              onChange={(value) =>
                setActiveView((value as "mapa" | "inscritos" | "aprobados" | "consultas") || "mapa")
              }
            >
              <Tabs.List>
                <Tabs.Tab value="mapa" leftSection={<IconMap2 size={16} />}>
                  Mapa
                </Tabs.Tab>
                <Tabs.Tab value="inscritos" leftSection={<IconUsers size={16} />}>
                  Inscritos
                </Tabs.Tab>
                <Tabs.Tab value="aprobados" leftSection={<IconCertificate size={16} />}>
                  Aprobados y avance
                </Tabs.Tab>
                <Tabs.Tab value="consultas" leftSection={<IconUsers size={16} />}>
                  Consultas
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>

            <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
              <StatCard label="Personas" value={resumen?.personas ?? "-"} icon={<IconUsers size={26} />} />
              <StatCard label="Inscripciones" value={resumen?.inscripciones ?? "-"} icon={<IconChartBar size={26} />} />
              <StatCard label="Campanas activas" value={resumen?.campanas_activas ?? "-"} icon={<IconShieldLock size={26} />} />
              <StatCard label="Territorios" value={resumen?.territorios ?? "-"} icon={<IconMap2 size={26} />} />
            </SimpleGrid>

            {activeView === "inscritos" ? (
              <InscritosPanel token={session.token} />
            ) : activeView === "aprobados" ? (
              <>
                <AprobadosAvancePanel token={session.token} />
                <ConsultasPanel
                  consulta={consulta}
                  consultaResumen={consultaResumen}
                  consultaTipo={consultaTipo}
                  consultaSearch={consultaSearch}
                  consultaSearchDraft={consultaSearchDraft}
                  consultaPage={consultaPage}
                  consultaLoading={consultaLoading}
                  exporting={exporting}
                  onTipoChange={handleConsultaTipoChange}
                  onSearchDraftChange={setConsultaSearchDraft}
                  onSearchSubmit={handleSearchSubmit}
                  onClearSearch={handleClearSearch}
                  onPageChange={setConsultaPage}
                  onExport={handleExport}
                />
              </>
            ) : activeView === "consultas" ? (
              <ConsultasPanel
                consulta={consulta}
                consultaResumen={consultaResumen}
                consultaTipo={consultaTipo}
                consultaSearch={consultaSearch}
                consultaSearchDraft={consultaSearchDraft}
                consultaPage={consultaPage}
                consultaLoading={consultaLoading}
                exporting={exporting}
                onTipoChange={handleConsultaTipoChange}
                onSearchDraftChange={setConsultaSearchDraft}
                onSearchSubmit={handleSearchSubmit}
                onClearSearch={handleClearSearch}
                onPageChange={setConsultaPage}
                onExport={handleExport}
              />
            ) : loading ? (
              <Center h={420}>
                <Loader color="teal" />
              </Center>
            ) : (
              <Grid>
                <Grid.Col span={{ base: 12, lg: 8 }}>
                  <Card withBorder radius="md" p="sm">
                    <TerritoryMap items={territorios} />
                  </Card>
                </Grid.Col>
                <Grid.Col span={{ base: 12, lg: 4 }}>
                  <Card withBorder radius="md" h="100%">
                    <Group justify="space-between" mb="md">
                      <Box>
                        <Title order={3}>Top territorios</Title>
                        <Text size="sm" c="dimmed">
                          Cantones con mas inscripciones.
                        </Text>
                      </Box>
                      {lastUpdated && (
                        <Badge variant="light" color="gray">
                          {lastUpdated.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                        </Badge>
                      )}
                    </Group>
                    <Table highlightOnHover verticalSpacing="sm">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Canton</Table.Th>
                          <Table.Th style={{ width: rem(90), textAlign: "right" }}>Total</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {topTerritories.map((item) => (
                          <Table.Tr key={`${item.provincia}-${item.canton}`}>
                            <Table.Td>
                              <Text fw={700}>{item.canton}</Text>
                              <Text size="xs" c="dimmed">
                                {item.provincia}
                              </Text>
                            </Table.Td>
                            <Table.Td ta="right">
                              <Badge color="teal">{item.total}</Badge>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Card>
                </Grid.Col>
              </Grid>
            )}
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default function AdminApp() {
  const [session, setSession] = useState<AdminSession | null>(() => readSession());
  const [checking, setChecking] = useState(Boolean(session));

  useEffect(() => {
    if (!session) return;
    getAdminMe(session.token)
      .then(({ user }) => {
        const nextSession = { token: session.token, user };
        saveSession(nextSession);
        setSession(nextSession);
      })
      .catch(() => {
        clearSession();
        setSession(null);
      })
      .finally(() => setChecking(false));
  }, []);

  function handleLogout() {
    clearSession();
    setSession(null);
  }

  if (checking) {
    return (
      <Center className="admin-login-screen">
        <Loader color="teal" />
      </Center>
    );
  }

  if (!session) return <AdminLogin onLogin={setSession} />;

  return <AdminDashboard session={session} onLogout={handleLogout} />;
}
