import source from "./records.json";

export type DemoMeeting = {
  id: number;
  title: string;
  transcript: string;
  risk: boolean;
  upsell: boolean;
};

const titles: Record<number, string> = {
  1: "Lentidão e suporte",
  2: "Interesse em CRM",
  3: "Preço e concorrência",
  4: "Implantação de Techfin",
  5: "Mudança de ERP",
  6: "Novas licenças",
  7: "Demora no atendimento",
  8: "Integração com RH",
  9: "Desempenho do sistema",
  10: "Ampliação do pacote",
  11: "Custo da mensalidade",
  12: "CRM para vendas",
  13: "Falha e cancelamento",
  14: "Crescimento da equipe",
  15: "Interface e ERP",
  16: "Folha de pagamento",
  17: "Cobrança e concorrência",
  18: "Próximo passo com CRM",
  19: "Suporte e contrato",
  20: "Automação financeira",
};

export const meetings: DemoMeeting[] = source
  .map((item) => ({
    id: Number(item.id),
    title: titles[Number(item.id)] ?? "Conversa comercial",
    transcript: String(item.transcript),
    risk: item.risk === true,
    upsell: item.upsell === true,
  }))
  .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.transcript.trim().length > 0)
  .sort((a, b) => a.id - b.id);

export const demoStats = {
  meetings: meetings.length,
  risk: meetings.filter((meeting) => meeting.risk).length,
  upsell: meetings.filter((meeting) => meeting.upsell).length,
};

export type TermCount = { term: string; count: number };

const normalized = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export function countTerms(terms: string[], filter: (meeting: DemoMeeting) => boolean): TermCount[] {
  return terms
    .map((term) => ({
      term,
      count: meetings.filter((meeting) => filter(meeting) && normalized(meeting.transcript).includes(normalized(term))).length,
    }))
    .sort((a, b) => b.count - a.count);
}

export function matchesMeeting(meeting: DemoMeeting, query: string): boolean {
  const search = normalized(query.trim());
  return search.length === 0 || normalized(`${meeting.id} ${meeting.title} ${meeting.transcript}`).includes(search);
}

type DemoReport = { summary: string; nextStep: string };

const reports: Record<number, DemoReport> = {
  1: {
    summary: "A conversa menciona lentidão do sistema, demora no suporte e a possibilidade de cancelamento do contrato.",
    nextStep: "Confirmar o histórico de atendimento com a conta e entender o impacto da lentidão na operação.",
  },
  2: {
    summary: "O cliente relata satisfação com a solução atual e demonstra interesse em contratar CRM para a equipe comercial.",
    nextStep: "Entender o tamanho da equipe e quais processos o CRM precisaria atender.",
  },
  3: {
    summary: "Há uma objeção ao valor da mensalidade e uma menção explícita à avaliação de concorrentes.",
    nextStep: "Revisar as condições comerciais e conversar sobre os motivos da comparação.",
  },
  4: {
    summary: "A transcrição indica interesse em Techfin para antecipação de recebíveis.",
    nextStep: "Levantar o volume de recebíveis e apresentar as possibilidades adequadas à conta.",
  },
};

export function getDemoReport(meeting: DemoMeeting): DemoReport {
  if (reports[meeting.id]) return reports[meeting.id];
  if (meeting.risk) {
    return {
      summary: "O texto contém um possível sinal de insatisfação. A equipe deve revisar o contexto antes de tratar o caso como risco de cancelamento.",
      nextStep: "Ler a transcrição completa e confirmar a situação com o responsável pela conta.",
    };
  }
  return {
    summary: "A conversa sugere interesse em uma ampliação de produto ou serviço. Este apontamento precisa de confirmação comercial.",
    nextStep: "Entender a necessidade mencionada e verificar quais soluções podem atendê-la.",
  };
}
