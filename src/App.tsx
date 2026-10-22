import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ApiProvider } from "./connected/ApiContext";
import Layout from "./connected/Layout";
import MeetingsPage from "./connected/MeetingsPage";
import MeetingEditor from "./connected/MeetingEditor";
import MeetingPage from "./connected/MeetingPage";
import PeoplePage from "./connected/PeoplePage";
import ReportsPage from "./connected/ReportsPage";
import { AboutPage, StudyPage } from "./connected/InfoPages";
import { Empty } from "./connected/Ui";

export default function App() {
  return <ApiProvider><Routes><Route element={<Layout />}>
    <Route index element={<Navigate to="/reunioes" replace />} />
    <Route path="reunioes" element={<MeetingsPage />} />
    <Route path="reunioes/nova" element={<MeetingEditor />} />
    <Route path="reunioes/:id" element={<MeetingPage />} />
    <Route path="reunioes/:id/editar" element={<MeetingEditor />} />
    <Route path="clientes" element={<PeoplePage key="clients" client />} />
    <Route path="equipe" element={<PeoplePage key="team" client={false} />} />
    <Route path="insights" element={<ReportsPage />} />
    <Route path="sobre" element={<AboutPage />} />
    <Route path="estudo" element={<StudyPage />} />
    <Route path="*" element={<Empty title="Página não encontrada"><Link className="button primary" to="/reunioes">Voltar às reuniões</Link></Empty>} />
  </Route></Routes></ApiProvider>;
}
