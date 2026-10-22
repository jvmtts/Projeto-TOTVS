import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronLeft, ChevronRight, FileText, Search, X, RefreshCw } from "lucide-react";
import { dateLabel, initials, type Meeting } from "./api";

export function Avatar({ name, client = false }: { name: string; client?: boolean }) { return <span className={`person-avatar ${client ? "client" : ""}`} aria-hidden="true">{initials(name)}</span>; }

export function Heading({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return <header className="page-heading"><div><h1>{title}</h1><p>{text}</p></div><div className="heading-actions">{children}</div></header>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-state" role="alert"><span>Não foi possível concluir</span><p>{message}</p>{retry && <button className="button secondary" onClick={retry}><RefreshCw size={15} />Tentar novamente</button>}</div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty-state"><span className="empty-symbol"><FileText size={28} strokeWidth={1.3} /></span><h2>{title}</h2>{children}</div>;
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="search"><Search size={17} /><span className="sr-only">{placeholder}</span><input type="search" value={value} onChange={event => onChange(event.target.value)} maxLength={120} placeholder={placeholder} /></label>;
}

export function Loading() { return <div className="loading-state" role="status"><span className="spinner" />Carregando…</div>; }

export function Pagination({ page, pages, total, onChange }: { page: number; pages: number; total: number; onChange: (page: number) => void }) {
  return <div className="pagination"><span>{total} {total === 1 ? "registro" : "registros"}</span><div><button className="icon-button" aria-label="Página anterior" disabled={page === 0} onClick={() => onChange(page - 1)}><ChevronLeft size={17} /></button><span>{page + 1} / {Math.max(1, pages)}</span><button className="icon-button" aria-label="Próxima página" disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}><ChevronRight size={17} /></button></div></div>;
}

export function MeetingTable({ meetings }: { meetings: Meeting[] }) {
  return <div className="meeting-table"><div className="table-head"><span>Reunião</span><span>Participantes</span><span>Relatórios</span><span>Data</span><span /></div>{meetings.map(meeting => <Link to={`/reunioes/${meeting.id}`} className="meeting-row" key={meeting.id}>
    <div className="meeting-cell"><span className="record-icon"><FileText size={20} strokeWidth={1.5} /></span><div><strong>{meeting.titulo}</strong><small>{meeting.participantes.filter(person => person.tipo === "CLIENTE").map(person => person.empresa || person.nome).join(" · ") || `Registro #${String(meeting.id).padStart(3, "0")}`}</small></div></div>
    <div className="table-people"><div className="avatar-stack">{meeting.participantes.slice(0, 3).map(person => <Avatar key={person.id} name={person.nome} client={person.tipo === "CLIENTE"} />)}</div><span>{meeting.participantes.length}</span></div>
    <span className={`report-badge ${meeting.relatorios ? "ready" : ""}`}><i />{meeting.relatorios ? `${meeting.relatorios} ${meeting.relatorios === 1 ? "relatório" : "relatórios"}` : "A gerar"}</span><time dateTime={meeting.data}>{dateLabel(meeting.data)}</time><ArrowUpRight size={18} className="row-arrow" />
  </Link>)}</div>;
}

export function Modal({ title, children, close, busy = false }: { title: string; children: ReactNode; close: () => void; busy?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="modal" aria-label={title} onCancel={event => { if (busy) event.preventDefault(); }} onClose={close}>
    <div className="modal-title"><h2>{title}</h2><button className="icon-button" aria-label="Fechar" disabled={busy} onClick={() => dialog.current?.close()}><X size={19} /></button></div>{children}
  </dialog>;
}
