import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Plus, ListFilter } from "lucide-react";
import { useApi, useResource } from "./ApiContext";
import { type Meeting, type Page } from "./api";
import { Empty, ErrorState, Heading, Loading, MeetingTable, Pagination, SearchField } from "./Ui";

export default function MeetingsPage() {
  const { people, refresh } = useApi();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  function setQuery(value: string) { const next = new URLSearchParams(params); value ? next.set("q", value) : next.delete("q"); next.delete("page"); setParams(next, { replace: true }); }
  const page = Math.max(0, Number(params.get("page")) || 0);
  const state = ["all", "with", "without"].includes(params.get("estado") ?? "") ? params.get("estado")! : "all";
  const search = new URLSearchParams({ page: String(page), size: "12", q: debouncedQuery, estado: state });
  if (params.get("participante")) search.set("participante", params.get("participante")!);
  const { data, loading, error, reload } = useResource<Page<Meeting>>(`/reunioes?${search}`);
  function retry() { refresh(); reload(); }
  function filter(key: string, value: string) { const next = new URLSearchParams(params); value === "all" || !value ? next.delete(key) : next.set(key, value); if (key !== "page") next.delete("page"); setParams(next); }

  return <>
    <Heading title="Reuniões" text="O histórico das suas conversas comerciais."><Link className="button primary" to="/reunioes/nova"><Plus size={17} />Nova reunião</Link></Heading>
    <section className="surface">
      <div className="list-controls"><div className="filter-tabs" aria-label="Filtrar reuniões">{[{ value: "all", label: "Todas" }, { value: "with", label: "Com relatório" }, { value: "without", label: "A gerar" }].map(item => <button key={item.value} className={state === item.value ? "selected" : ""} aria-pressed={state === item.value} onClick={() => filter("estado", item.value)}>{item.label}</button>)}</div><div className="list-search"><SearchField value={query} onChange={setQuery} placeholder="Buscar por assunto…" /><label className="select-filter"><ListFilter size={16} /><span className="sr-only">Filtrar participante</span><select value={params.get("participante") ?? "all"} onChange={event => filter("participante", event.target.value)}><option value="all">Todos os participantes</option>{people.map(person => <option key={person.id} value={person.id}>{person.nome}</option>)}</select></label></div></div>
      {error ? <ErrorState message={error} retry={retry} /> : loading && !data ? <Loading /> : data && data.items.length ? <><div className={loading || query !== debouncedQuery ? "refreshing" : ""} aria-busy={loading || query !== debouncedQuery}><MeetingTable meetings={data.items} /></div><Pagination page={page} pages={data.pages} total={data.total} onChange={value => filter("page", String(value))} /></> : <Empty title="Nenhuma reunião por aqui"><p>{query || state !== "all" || params.get("participante") ? "Altere os filtros para encontrar outra conversa." : "Adicione uma transcrição para começar seu histórico."}</p><Link to="/reunioes/nova" className="text-link">Adicionar reunião <ArrowRight size={15} /></Link></Empty>}
    </section>
    <div className="page-caption"><span>{data && !error ? "Dados sincronizados com a API do projeto." : ""}</span><span>{data && !error ? `${data.total} ${data.total === 1 ? "reunião" : "reuniões"}` : ""}</span></div>
  </>;
}
