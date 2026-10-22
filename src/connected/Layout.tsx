import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AudioLines, Building2, UsersRound, Files, ArrowUpRight } from "lucide-react";
import { useApi } from "./ApiContext";

const links = [{ to: "/reunioes", title: "Reuniões", icon: AudioLines }, { to: "/insights", title: "Relatórios", icon: Files }, { to: "/clientes", title: "Clientes", icon: Building2 }, { to: "/equipe", title: "Equipe", icon: UsersRound }];

export default function Layout() {
  const { status, loading } = useApi();
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return <div className="app">
    <a className="skip-link" href="#main">Ir para conteúdo</a>
    <header className="app-header"><div className="header-inner"><Link to="/reunioes" className="brand" aria-label="Árion, reuniões"><span className="brand-mark"><AudioLines size={24} strokeWidth={1.8} /></span><span>árion<span>.</span></span><small>COMERCIAL</small></Link><nav aria-label="Navegação principal">{links.map(({ to, title, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}><Icon size={17} /><span>{title}</span></NavLink>)}</nav><Link className={`connection ${status ? "online" : ""}`} to="/sobre"><i /><span>{loading ? "Conectando" : status ? "Conectado" : "Sem conexão"}</span></Link></div></header>
    <main id="main" className="main"><Outlet /></main>
    <footer className="app-footer"><span>Árion <b>/</b> FIAP × TOTVS</span><Link to="/estudo">Estudo de Data Science <ArrowUpRight size={12} /></Link><Link to="/sobre">Sobre o projeto</Link></footer>
  </div>;
}
