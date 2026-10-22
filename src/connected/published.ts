import snapshot from "../data/published-workspace.json";
import type { ApiStatus, MeetingDetail, Meeting, Page, ReportItem, Person } from "./api";

function person(value: typeof snapshot.people[number]): Person {
  if (value.tipo !== "CLIENTE" && value.tipo !== "FUNCIONARIO") throw new Error("Tipo de participante inválido na publicação.");
  return { ...value, tipo: value.tipo };
}
const people = snapshot.people.map(person);
const meetings: MeetingDetail[] = snapshot.meetings.map(meeting => ({ ...meeting, participantes: meeting.participantes.map(person) }));
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

function integer(value: string | null, fallback: number, minimum: number, maximum: number): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error("Filtro inválido.");
  return parsed;
}

function paginate<T>(items: T[], page: number, size: number): Page<T> {
  return { items: items.slice(page * size, (page + 1) * size), total: items.length, page, size, pages: Math.ceil(items.length / size) };
}

export function readPublishedData<T>(path: string): T {
  const url = new URL(path, "https://published.arion.invalid");
  const page = integer(url.searchParams.get("page"), 0, 0, 1000000);
  let result: unknown;
  if (url.pathname === "/status") {
    result = { status: "demonstracao", geracaoDisponivel: false, banco: "Exemplos publicados", somenteLeitura: true } satisfies ApiStatus;
  } else if (url.pathname === "/pessoas") {
    result = [...people].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  } else if (url.pathname === "/reunioes") {
    const size = integer(url.searchParams.get("size"), 20, 1, 50);
    const participant = url.searchParams.has("participante") ? integer(url.searchParams.get("participante"), 0, 1, Number.MAX_SAFE_INTEGER) : null;
    const state = url.searchParams.get("estado") ?? "all";
    if (!["all", "with", "without"].includes(state)) throw new Error("Filtro de relatório inválido.");
    const query = normalize(url.searchParams.get("q")?.trim() ?? "");
    const filtered = meetings.filter(meeting => normalize(meeting.titulo).includes(query) && (participant === null || meeting.participantes.some(person => person.id === participant)) && (state === "all" || (state === "with" ? meeting.relatorios.length > 0 : meeting.relatorios.length === 0))).sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
    result = paginate<Meeting>(filtered.map(({ transcricao: _transcript, relatorios, ...meeting }) => ({ ...meeting, relatorios: relatorios.length })), page, size);
  } else if (/^\/reunioes\/\d+$/.test(url.pathname)) {
    result = meetings.find(meeting => meeting.id === Number(url.pathname.split("/").pop()));
    if (!result) throw new Error("Reunião não encontrada nesta demonstração.");
  } else if (url.pathname === "/relatorios") {
    const reports: ReportItem[] = meetings.flatMap(meeting => meeting.relatorios.map(relatorio => ({ relatorio, titulo: meeting.titulo, data: meeting.data }))).sort((a, b) => b.relatorio.id - a.relatorio.id);
    result = paginate(reports, page, 12);
  } else throw new Error("Consulta não disponível nesta demonstração.");
  return structuredClone(result) as T;
}
