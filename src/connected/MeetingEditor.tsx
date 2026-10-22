import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, FileUp, Plus } from "lucide-react";
import { useApi, useResource } from "./ApiContext";
import { messageOf, request, type MeetingDetail } from "./api";
import { Avatar, Empty, ErrorState, Heading, Loading } from "./Ui";

function today() {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function EditorForm({ initial }: { initial?: MeetingDetail }) {
  const { people, loading, error: connectionError, refresh } = useApi();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState(initial?.titulo ?? "");
  const [date, setDate] = useState(initial?.data ?? today());
  const [text, setText] = useState(initial?.transcricao ?? "");
  const [selected, setSelected] = useState<number[]>(initial?.participantes.map(person => person.id) ?? (Number(params.get("participante")) > 0 ? [Number(params.get("participante"))] : []));
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");

  async function importText(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt") || file.size > 200000) { setError("Use um arquivo .txt de até 200 KB."); return; }
    setReading(true);
    try {
      const value = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      if (!value.trim() || value.length > 50000 || value.includes("\u0000")) throw new Error();
      setText(value); setError("");
    } catch { setError("Não foi possível importar. Use texto UTF-8 válido com até 50.000 caracteres."); }
    finally { setReading(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length || text.trim().length < 50 || text.length > 50000) { setError("Selecione ao menos um participante e informe uma transcrição de 50 a 50.000 caracteres."); return; }
    setBusy(true); setError("");
    try {
      const meeting = await request<MeetingDetail>(initial ? `/reunioes/${initial.id}` : "/reunioes", { method: initial ? "PUT" : "POST", body: { titulo: title, data: date, transcricao: text, participantes: selected } });
      navigate(`/reunioes/${meeting.id}`);
    } catch (value) { setError(messageOf(value)); }
    finally { setBusy(false); }
  }

  if (loading) return <Loading />;
  if (connectionError) return <ErrorState message={connectionError} retry={refresh} />;

  return <>
    <Link className="back-link" to={initial ? `/reunioes/${initial.id}` : "/reunioes"}><ArrowLeft size={15} />Reuniões</Link>
    <Heading title={initial ? "Editar reunião" : "Nova reunião"} text={initial ? "Atualize os dados e preserve o histórico dos relatórios anteriores." : "Adicione a conversa ao histórico comercial."} />
    {!people.length ? <section className="surface"><Empty title="Comece pelas pessoas"><p>Cadastre um cliente ou profissional para vinculá-lo à reunião.</p><div className="empty-actions"><Link className="button primary" to="/clientes?novo=1"><Plus size={15} />Cadastrar cliente</Link><Link className="button secondary" to="/equipe?novo=1">Cadastrar profissional</Link></div></Empty></section> : <form onSubmit={submit}>
      <fieldset className="editor-grid" disabled={busy || reading}>
        <section className="surface editor-info"><div className="section-heading"><h2>Dados da reunião</h2><span>01</span></div><label className="field">Assunto <span className="optional">opcional</span><input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} placeholder="Ex.: Acompanhamento da implantação" /></label><label className="field date-input">Data<input type="date" value={date} onChange={event => setDate(event.target.value)} min="2000-01-01" max="2100-12-31" required /></label></section>
        <section className="surface editor-people"><div className="section-heading"><h2>Participantes</h2><span>{selected.length} selecionados</span></div>{["FUNCIONARIO", "CLIENTE"].map(type => <div className="participant-group" key={type}><h3>{type === "CLIENTE" ? "Clientes" : "Equipe"}</h3>{people.filter(person => person.tipo === type).map(person => <label className={`participant-choice ${selected.includes(person.id) ? "selected" : ""}`} key={person.id}><input type="checkbox" checked={selected.includes(person.id)} onChange={() => setSelected(previous => previous.includes(person.id) ? previous.filter(id => id !== person.id) : [...previous, person.id])} /><Avatar name={person.nome} client={person.tipo === "CLIENTE"} /><span><strong>{person.nome}</strong><small>{person.tipo === "CLIENTE" ? person.empresa : person.cargo}</small></span><span className="selection-check">{selected.includes(person.id) && <Check size={12} />}</span></label>)}{!people.some(person => person.tipo === type) && <p className="participant-empty">Nenhum cadastro nesta categoria.</p>}</div>)}</section>
        <section className="surface editor-transcript"><div className="section-heading"><h2>Transcrição</h2><label className="button secondary small file-button"><FileUp size={15} />{reading ? "Lendo…" : "Importar .txt"}<input className="sr-only" type="file" accept=".txt,text/plain" onChange={importText} /></label></div><label className="sr-only" htmlFor="transcript">Texto da reunião</label><textarea id="transcript" value={text} onChange={event => setText(event.target.value)} maxLength={50000} required rows={12} placeholder="Cole a transcrição da conversa…" /><div className="field-hint"><span>Mínimo de 50 caracteres</span><span>{text.length.toLocaleString("pt-BR")} / 50.000</span></div></section>
      </fieldset>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="editor-footer"><p>{initial ? "Relatórios anteriores serão preservados e identificados se a transcrição mudar." : "A reunião será salva na API do projeto."}</p><div><Link className="button secondary" to={initial ? `/reunioes/${initial.id}` : "/reunioes"}>Cancelar</Link><button className="button primary" disabled={busy || reading} type="submit">{busy ? "Salvando…" : "Salvar reunião"}<ArrowRight size={16} /></button></div></div>
    </form>}
  </>;
}

function ExistingEditor({ id }: { id: string }) {
  const { data, loading, error, reload } = useResource<MeetingDetail>(`/reunioes/${encodeURIComponent(id)}`);
  if (error) return <ErrorState message={error} retry={reload} />;
  if (loading || !data) return <Loading />;
  return <EditorForm initial={data} />;
}

export default function MeetingEditor() {
  const { id } = useParams();
  return id ? <ExistingEditor id={id} /> : <EditorForm />;
}
