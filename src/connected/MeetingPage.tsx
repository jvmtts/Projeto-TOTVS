import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, FileText, AlignLeft, Pencil, Trash2, Sparkles, ArrowUpRight } from "lucide-react";
import { useApi, useResource } from "./ApiContext";
import { apiBase, dateLabel, messageOf, normalize, request, timestampLabel, type MeetingDetail, type Report } from "./api";
import { Avatar, Empty, ErrorState, Loading, Modal, SearchField } from "./Ui";

function InlineText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part)}</>;
}

function Markdown({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let paragraph: string[] = [];
  let items: string[] = [];
  function flushParagraph() { if (paragraph.length) { nodes.push(<p key={`p-${nodes.length}`}><InlineText text={paragraph.join("\n")} /></p>); paragraph = []; } }
  function flushList() { if (items.length) { nodes.push(<ul key={`ul-${nodes.length}`}>{items.map((item, index) => <li key={index}><InlineText text={item} /></li>)}</ul>); items = []; } }
  for (const line of text.split("\n")) {
    if (!line.trim()) { flushParagraph(); flushList(); }
    else if (/^#{1,6}\s+/.test(line)) { flushParagraph(); flushList(); nodes.push(<h3 key={`h-${nodes.length}`}>{line.replace(/^#{1,6}\s+/, "")}</h3>); }
    else if (/^\s*[-*]\s+/.test(line)) { flushParagraph(); items.push(line.replace(/^\s*[-*]\s+/, "")); }
    else { flushList(); paragraph.push(line); }
  }
  flushParagraph(); flushList();
  return <div className="markdown">{nodes}</div>;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const search = normalize(query.trim());
  if (!search) return <>{text}</>;
  const positions: { start: number; end: number }[] = [];
  let normalized = ""; let offset = 0;
  for (const character of text) {
    const value = normalize(character);
    if (!value && positions.length) positions[positions.length - 1].end = offset + character.length;
    for (let index = 0; index < value.length; index++) positions.push({ start: offset, end: offset + character.length });
    normalized += value; offset += character.length;
  }
  const pieces = []; let cursor = 0; let next = normalized.indexOf(search);
  while (next !== -1) {
    const start = positions[next].start; const end = positions[next + search.length - 1].end;
    pieces.push(<span key={`text-${next}`}>{text.slice(cursor, start)}</span>, <mark key={`mark-${next}`}>{text.slice(start, end)}</mark>);
    cursor = end; next = normalized.indexOf(search, next + search.length);
  }
  pieces.push(<span key="tail">{text.slice(cursor)}</span>);
  return <>{pieces}</>;
}

function MeetingContent({ meeting, reload }: { meeting: MeetingDetail; reload: () => void }) {
  const { status } = useApi();
  const [params] = useSearchParams();
  const [tab, setTab] = useState("report");
  const [reportId, setReportId] = useState(Number(params.get("relatorio")) || meeting.relatorios[0]?.id || 0);
  const [query, setQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const noteKey = `arion.api-notes.v1:${apiBase}:${status?.banco ?? "unknown"}:${meeting.id}`;
  const [note, setNote] = useState(() => { try { return localStorage.getItem(noteKey) ?? ""; } catch { return ""; } });
  const [noteStatus, setNoteStatus] = useState("");
  const navigate = useNavigate();
  const report = meeting.relatorios.find(item => item.id === reportId) ?? meeting.relatorios[0];
  const paragraphs = useMemo(() => meeting.transcricao.split(/\n\s*\n/), [meeting.transcricao]);
  const visible = paragraphs.filter(text => normalize(text).includes(normalize(query.trim())));
  useEffect(() => { if (!reportId && meeting.relatorios[0]) setReportId(meeting.relatorios[0].id); }, [meeting.relatorios, reportId]);

  async function generate() {
    setGenerating(true); setError("");
    try {
      const result = await request<Report>(`/reunioes/${meeting.id}/relatorios`, { method: "POST" });
      setReportId(result.id); setTab("report"); reload();
    } catch (value) { setError(messageOf(value)); }
    finally { setGenerating(false); }
  }

  async function remove() {
    setDeleting(true); setError("");
    try {
      await request<void>(`/reunioes/${meeting.id}`, { method: "DELETE" });
      try { localStorage.removeItem(noteKey); } catch { setNoteStatus(""); }
      navigate("/reunioes");
    } catch (value) { setError(messageOf(value)); setConfirming(false); }
    finally { setDeleting(false); }
  }

  function exportText() {
    try {
      const text = ["ÁRION / " + meeting.titulo, `Data: ${meeting.data}`, `Participantes: ${meeting.participantes.map(person => person.nome).join(", ")}`, "", "RELATÓRIO", report?.texto ?? "Nenhum relatório gerado.", "", "TRANSCRIÇÃO", meeting.transcricao, "", "NOTAS PESSOAIS (DESTE NAVEGADOR)", note].join("\n");
      const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `arion-reuniao-${meeting.id}.txt`; document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError("Não foi possível exportar o registro."); }
  }

  return <>
    <Link className="back-link" to="/reunioes"><ArrowLeft size={15} />Reuniões</Link>
    <header className="detail-header"><span className="record-number">REUNIÃO #{String(meeting.id).padStart(3, "0")}</span><h1>{meeting.titulo}</h1><div className="detail-meta"><span>{dateLabel(meeting.data)}</span><i /><span>{meeting.participantes.length} {meeting.participantes.length === 1 ? "participante" : "participantes"}</span><div className="detail-tools"><button className="button secondary small" onClick={exportText}><Download size={14} />Exportar</button>{!status?.somenteLeitura && <><Link className="icon-button" aria-label="Editar reunião" to={`/reunioes/${meeting.id}/editar`}><Pencil size={16} /></Link><button className="icon-button" aria-label="Excluir reunião" disabled={generating} onClick={() => setConfirming(true)}><Trash2 size={16} /></button></>}</div></div></header>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <div className="detail-grid"><section className="surface reading-surface"><div className="reading-tabs"><div><button className={tab === "report" ? "selected" : ""} aria-pressed={tab === "report"} onClick={() => setTab("report")}><FileText size={16} />Relatório</button><button className={tab === "transcript" ? "selected" : ""} aria-pressed={tab === "transcript"} onClick={() => setTab("transcript")}><AlignLeft size={17} />Transcrição</button></div><span>{tab === "report" ? `${meeting.relatorios.length} versões` : `${meeting.transcricao.length.toLocaleString("pt-BR")} caracteres`}</span></div>
      {tab === "report" ? report ? <><div className="report-toolbar"><label><span className="sr-only">Versão do relatório</span><select value={report.id} onChange={event => setReportId(Number(event.target.value))}>{meeting.relatorios.map(item => <option key={item.id} value={item.id}>Relatório #{item.id} · {timestampLabel(item.criadoEm)}</option>)}</select></label><span className={`version-label ${report.atual ? "current" : ""}`}>{report.atual ? "Transcrição atual" : "Transcrição anterior ou não verificada"}</span></div><article className="report-paper"><span className="paper-label">ÁRION / ANÁLISE DA REUNIÃO</span><Markdown text={report.texto} /><div className="paper-footer">Registrado em {timestampLabel(report.criadoEm)}. Revise as informações antes de tomar decisões.</div></article></> : <Empty title="Pronta para uma nova leitura"><p>Gere um relatório para organizar os pontos de atenção, as oportunidades e os próximos passos desta conversa.</p><button className="button primary" onClick={generate} disabled={generating || !status?.geracaoDisponivel}>{generating ? <><span className="spinner" />Gerando relatório…</> : <><Sparkles size={16} />Gerar relatório</>}</button>{!status?.geracaoDisponivel && <p className="generation-hint">A geração precisa ser configurada no backend. <Link to="/sobre">Ver configuração</Link></p>}</Empty> : <><div className="transcript-search"><SearchField value={query} onChange={setQuery} placeholder="Buscar na transcrição…" /></div><div className="transcript-document">{visible.length ? visible.map((text, index) => <p key={index}><Highlight text={text} query={query} /></p>) : <Empty title="Nenhum trecho encontrado"><button className="text-link" onClick={() => setQuery("")}>Limpar busca</button></Empty>}</div></>}
    </section><aside className="meeting-aside"><section className="surface people-panel"><div className="section-heading"><h2>Participantes</h2><span>{meeting.participantes.length}</span></div>{meeting.participantes.map(person => <Link key={person.id} className="participant-link" to={`/${person.tipo === "CLIENTE" ? "clientes" : "equipe"}?pessoa=${person.id}`}><Avatar name={person.nome} client={person.tipo === "CLIENTE"} /><span><strong>{person.nome}</strong><small>{person.tipo === "CLIENTE" ? person.empresa : person.cargo}</small></span><ArrowUpRight size={14} /></Link>)}</section>
      <section className="surface notes-panel"><label htmlFor="meeting-note">Notas pessoais</label><p>Salvas somente neste navegador.</p><textarea id="meeting-note" maxLength={4000} rows={6} value={note} onChange={event => { setNote(event.target.value); setNoteStatus(""); }} placeholder="O que retomar no próximo contato?" /><div><span role="status">{noteStatus || `${note.length}/4000`}</span><button className="button secondary small" onClick={() => { try { localStorage.setItem(noteKey, note); setNoteStatus("Notas salvas"); } catch { setNoteStatus("Não foi possível salvar"); } }}>Salvar notas</button></div></section>
      {meeting.relatorios.length > 0 && !status?.somenteLeitura && <button className="button secondary generate-again" onClick={generate} disabled={generating || !status?.geracaoDisponivel}>{generating ? "Gerando…" : "Gerar novo relatório"}<Sparkles size={15} /></button>}
    </aside></div>
    {confirming && <Modal title="Excluir reunião?" close={() => setConfirming(false)} busy={deleting}><p className="modal-description">A transcrição e todos os relatórios desta reunião serão excluídos da API. Esta ação não pode ser desfeita.</p><div className="modal-actions"><button className="button secondary" disabled={deleting} onClick={() => setConfirming(false)}>Cancelar</button><button className="button destructive" disabled={deleting} onClick={remove}>{deleting ? "Excluindo…" : "Excluir reunião"}</button></div></Modal>}
  </>;
}

export default function MeetingPage() {
  const { id } = useParams();
  const { loading: connecting, status, error: connectionError, refresh } = useApi();
  const { data, loading, error, reload } = useResource<MeetingDetail>(`/reunioes/${encodeURIComponent(id ?? "")}`);
  if (connecting) return <Loading />;
  if (!status) return <ErrorState message={connectionError || "Não foi possível verificar a conexão com a API."} retry={refresh} />;
  if (error) return <ErrorState message={error} retry={reload} />;
  if (!data && loading) return <Loading />;
  return data ? <MeetingContent key={data.id} meeting={data} reload={reload} /> : null;
}
