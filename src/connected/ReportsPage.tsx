import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, FileText } from "lucide-react";
import { useApi, useResource } from "./ApiContext";
import { timestampLabel, type Page, type ReportItem } from "./api";
import { Empty, ErrorState, Heading, Loading, Pagination } from "./Ui";

export default function ReportsPage() {
  const { status } = useApi();
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useResource<Page<ReportItem>>(`/relatorios?page=${page}`);
  return <>
    <Heading title="Relatórios" text={status?.somenteLeitura ? "Os resumos e encaminhamentos preservados dos exemplos." : "As análises geradas a partir das reuniões."} />
    {error ? <ErrorState message={error} retry={reload} /> : loading ? <Loading /> : data?.items.length ? <section className="surface reports-list"><div className="reports-list-heading"><span>REUNIÃO / RELATÓRIO</span><span>REGISTRADO EM</span></div>{data.items.map(item => <Link key={item.relatorio.id} to={`/reunioes/${item.relatorio.reuniaoId}?relatorio=${item.relatorio.id}`} className="report-entry"><span className="record-icon"><FileText size={21} /></span><div><h2>{item.titulo}</h2><p>{item.relatorio.texto.replace(/[#*`]/g, "").slice(0, 150)}{item.relatorio.texto.length > 150 ? "…" : ""}</p><span className={`version-label ${item.relatorio.atual ? "current" : ""}`}>{item.relatorio.atual ? "Transcrição atual" : "Transcrição anterior ou não verificada"} <b>·</b> Relatório #{item.relatorio.id}</span></div><time>{timestampLabel(item.relatorio.criadoEm)}</time><ArrowUpRight size={18} /></Link>)}<Pagination page={page} pages={data.pages} total={data.total} onChange={setPage} /></section> : <section className="surface"><Empty title="As análises aparecerão aqui"><p>Abra uma reunião e gere seu primeiro relatório.</p><Link className="button primary" to="/reunioes">Consultar reuniões <ArrowUpRight size={15} /></Link></Empty></section>}
  </>;
}
