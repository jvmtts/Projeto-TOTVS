export type Person = { id: number; nome: string; tipo: "CLIENTE" | "FUNCIONARIO"; idade: number | null; empresa: string | null; cnpj: string | null; cargo: string | null; perfil: string | null };
export type PersonInput = { nome: string; empresa?: string; cnpj?: string; cargo?: string; perfil?: string };
export type Report = { id: number; reuniaoId: number; texto: string; criadoEm: string | null; atual: boolean };
export type Meeting = { id: number; titulo: string; data: string; participantes: Person[]; relatorios: number };
export type MeetingDetail = Omit<Meeting, "relatorios"> & { transcricao: string; relatorios: Report[] };
export type MeetingInput = { titulo: string; data: string; transcricao: string; participantes: number[] };
export type Page<T> = { items: T[]; total: number; page: number; size: number; pages: number };
export type ApiStatus = { status: string; geracaoDisponivel: boolean; banco: string };
export type ReportItem = { relatorio: Report; titulo: string; data: string };
export const apiBase = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); this.name = "ApiError"; }
}

export async function request<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  let timedOut = false;
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 90000);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      method: options.method || "GET", signal: controller.signal,
      headers: options.body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (response.status === 204) return undefined as T;
    const content = await response.text();
    let data: unknown = null;
    try { data = JSON.parse(content); } catch {
      if (!response.ok) throw new ApiError("A API Java está indisponível. Abra o projeto com npm.cmd run dev e aguarde a inicialização.", response.status);
      throw new ApiError("O endereço configurado não retornou os dados da API. Confira VITE_API_URL e ARION_API_TARGET.", response.status);
    }
    if (!response.ok) {
      const message = data && typeof data === "object" && "message" in data && typeof data.message === "string" ? data.message : "Não foi possível concluir a operação.";
      throw new ApiError(message, response.status);
    }
    return data as T;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timedOut) throw new ApiError("A solicitação demorou mais que o esperado. Atualize a reunião antes de tentar novamente.");
    if (error instanceof ApiError) throw error;
    throw new ApiError("Não foi possível conectar à API Java. Abra o projeto com npm.cmd run dev e aguarde a inicialização.");
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}

export const messageOf = (error: unknown) => error instanceof Error ? error.message : "Não foi possível concluir a operação.";
export const initials = (name: string) => name.trim().split(/\s+/).map(word => word[0]).slice(0, 2).join("").toLocaleUpperCase("pt-BR");
export const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
export const dateLabel = (date: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
export const timestampLabel = (date: string | null) => date ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date)) : "Data não informada";
