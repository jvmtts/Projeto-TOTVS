import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Plus, BriefcaseBusiness, Building2, Pencil } from "lucide-react";
import { useApi, useResource } from "./ApiContext";
import { messageOf, normalize, request, type Person, type Page, type Meeting } from "./api";
import { Avatar, Empty, ErrorState, Heading, Loading, MeetingTable, Modal, Pagination, SearchField } from "./Ui";

function PersonForm({ client, existing, close }: { client: boolean; existing?: Person; close: () => void }) {
  const { registerPerson } = useApi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const value = (key: string) => String(fields.get(key) ?? "").trim();
    setBusy(true); setError("");
    try {
      const person = await request<Person>(existing ? `/equipe/${existing.id}` : client ? "/clientes" : "/equipe", { method: existing ? "PATCH" : "POST", body: { nome: value("nome"), empresa: value("empresa"), cnpj: value("cnpj"), cargo: value("cargo"), perfil: value("perfil") } });
      registerPerson(person); close();
    } catch (value) { setError(messageOf(value)); }
    finally { setBusy(false); }
  }
  const title = existing ? "Editar profissional" : client ? "Cadastrar cliente" : "Cadastrar profissional";
  return <Modal title={title} close={close} busy={busy}><form onSubmit={submit}><fieldset disabled={busy} className="modal-fields">
    {!existing && <label className="field">{client ? "Nome do contato" : "Nome completo"}<input name="nome" maxLength={120} required autoFocus /></label>}
    {client ? <><label className="field">Empresa<input name="empresa" maxLength={120} required /></label><label className="field">CNPJ<input name="cnpj" maxLength={18} placeholder="00.000.000/0000-00" required inputMode="numeric" /></label></> : <><label className="field">Cargo<input name="cargo" maxLength={80} required defaultValue={existing?.cargo ?? ""} autoFocus={!!existing} /></label><label className="field">Perfil<select name="perfil" aria-label="Perfil" defaultValue={existing?.perfil ?? "Comercial"}><option>Comercial</option><option>Relacionamento</option><option>Gestão</option>{existing?.perfil && !["Comercial", "Relacionamento", "Gestão"].includes(existing.perfil) && <option>{existing.perfil}</option>}</select></label></>}
  </fieldset>{error && <p className="inline-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={close}>Cancelar</button><button className="button primary" type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar cadastro"}</button></div></form></Modal>;
}

function PersonHistory({ person }: { person: Person }) {
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useResource<Page<Meeting>>(`/reunioes?participante=${person.id}&size=6&page=${page}`);
  return <section className="surface person-history"><div className="section-heading"><h2>Reuniões com participação</h2><Link className="text-link" to={`/reunioes/nova?participante=${person.id}`}>Nova reunião <Plus size={15} /></Link></div>{error ? <ErrorState message={error} retry={reload} /> : loading ? <Loading /> : data?.items.length ? <><MeetingTable meetings={data.items} /><Pagination page={page} total={data.total} pages={data.pages} onChange={setPage} /></> : <Empty title="O histórico começa na primeira reunião"><p>As conversas com {person.nome.split(" ")[0]} aparecerão aqui.</p></Empty>}</section>;
}

export default function PeoplePage({ client }: { client: boolean }) {
  const { people, error, loading, refresh } = useApi();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(params.get("novo") === "1");
  const [editing, setEditing] = useState(false);
  const list = people.filter(person => person.tipo === (client ? "CLIENTE" : "FUNCIONARIO"));
  const visible = list.filter(person => normalize(`${person.nome} ${person.empresa ?? ""} ${person.cargo ?? ""} ${person.cnpj ?? ""}`).includes(normalize(query)));
  const selected = visible.find(person => person.id === Number(params.get("pessoa"))) ?? visible[0];
  useEffect(() => { setQuery(""); setCreating(params.get("novo") === "1"); setEditing(false); }, [client]);
  function closeCreate() { setCreating(false); if (params.has("novo")) { const next = new URLSearchParams(params); next.delete("novo"); setParams(next, { replace: true }); } }

  return <>
    <Heading title={client ? "Clientes" : "Equipe"} text={client ? "Pessoas, empresas e o histórico de cada relação." : "Os profissionais que participam das conversas."}><button className="button primary" onClick={() => setCreating(true)}><Plus size={17} />{client ? "Novo cliente" : "Novo profissional"}</button></Heading>
    {error ? <ErrorState message={error} retry={refresh} /> : loading ? <Loading /> : !list.length ? <section className="surface"><Empty title={client ? "Cadastre seu primeiro cliente" : "Quem faz parte da equipe?"}><p>{client ? "Organize os contatos e vincule cada um às suas reuniões." : "Adicione os profissionais para registrar sua participação nas reuniões."}</p><button className="button primary" onClick={() => setCreating(true)}><Plus size={15} />{client ? "Cadastrar cliente" : "Cadastrar profissional"}</button></Empty></section> : <>
      <div className="directory-toolbar"><SearchField value={query} onChange={setQuery} placeholder={client ? "Buscar empresa ou contato…" : "Buscar profissional…"} /><span>{visible.length} {client ? "clientes" : "profissionais"}</span></div>
      {client ? <div className="client-workspace"><section className="surface client-directory">{visible.map(person => <button key={person.id} className={`directory-person ${selected?.id === person.id ? "selected" : ""}`} onClick={() => setParams({ pessoa: String(person.id) })} aria-pressed={selected?.id === person.id}><Avatar name={person.empresa || person.nome} client /><span><strong>{person.empresa || person.nome}</strong><small>{person.nome}</small></span><ArrowUpRight size={16} /></button>)}</section><div className="person-workspace">{selected && <><section className="surface profile-header"><span className="profile-kicker"><Building2 size={15} />CONTA COMERCIAL</span><h2>{selected.empresa || selected.nome}</h2><div className="profile-facts"><div><span>Contato</span><strong>{selected.nome}</strong></div><div><span>CNPJ</span><strong>{selected.cnpj || "Não informado"}</strong></div></div></section><PersonHistory key={selected.id} person={selected} /></>}</div></div> : <><div className="team-directory">{visible.map(person => <button key={person.id} className={`staff-card ${selected?.id === person.id ? "selected" : ""}`} onClick={() => setParams({ pessoa: String(person.id) })} aria-pressed={selected?.id === person.id}><Avatar name={person.nome} /><span className="staff-role">{person.perfil || "Equipe"}</span><strong>{person.nome}</strong><small>{person.cargo}</small><ArrowUpRight size={16} /></button>)}</div>{selected && <><section className="staff-summary"><div><span className="profile-kicker"><BriefcaseBusiness size={15} />PROFISSIONAL SELECIONADO</span><h2>{selected.nome}</h2><p>{selected.cargo} <span>·</span> {selected.perfil}</p></div><button className="button secondary" onClick={() => setEditing(true)}><Pencil size={14} />Editar cargo e perfil</button></section><PersonHistory key={selected.id} person={selected} /></>}</>}
      {!visible.length && <Empty title="Nenhum cadastro encontrado"><p>Experimente outro termo de busca.</p></Empty>}
    </>}
    {creating && <PersonForm client={client} close={closeCreate} />}{editing && selected && <PersonForm client={false} existing={selected} close={() => setEditing(false)} />}
  </>;
}

