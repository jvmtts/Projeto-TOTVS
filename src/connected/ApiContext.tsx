import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { request, messageOf, type Person, type ApiStatus } from "./api";

type Workspace = { people: Person[]; status: ApiStatus | null; loading: boolean; error: string; refresh: () => void; registerPerson: (person: Person) => void };
const Context = createContext<Workspace | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const registerPerson = useCallback((person: Person) => setPeople(previous => [...previous.filter(value => value.id !== person.id), person].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([request<ApiStatus>("/status", { signal: controller.signal }), request<Person[]>("/pessoas", { signal: controller.signal })])
      .then(([nextStatus, nextPeople]) => { if (!controller.signal.aborted) { setStatus(nextStatus); setPeople(nextPeople); setError(""); } })
      .catch(value => { if (!controller.signal.aborted) { setStatus(null); setError(messageOf(value)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  return <Context.Provider value={{ people, status, loading, error, refresh, registerPerson }}>{children}</Context.Provider>;
}

export function useApi() {
  const value = useContext(Context);
  if (!value) throw new Error("API indisponível fora do contexto da aplicação.");
  return value;
}

export function useResource<T>(path: string) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ path: string; data: T | null; loading: boolean; error: string }>({ path, data: null, loading: true, error: "" });
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ path, data: previous.path === path ? previous.data : null, loading: true, error: "" }));
    request<T>(path, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ path, data, loading: false, error: "" }); })
      .catch(error => { if (!controller.signal.aborted) setState(previous => ({ ...previous, path, loading: false, error: messageOf(error) })); });
    return () => controller.abort();
  }, [path, revision]);
  return { data: state.path === path ? state.data : null, loading: state.path !== path || state.loading, error: state.path === path ? state.error : "", reload };
}
