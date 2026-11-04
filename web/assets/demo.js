/*
 * Demonstração do painel — dados 100% fictícios.
 * As datas são sempre relativas ao dia de hoje, para a demonstração nunca envelhecer.
 */

export const FERIADOS = [
  '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
  '2026-12-20', '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-26', '2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
  '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04', '2027-01-05', '2027-01-06',
  '2027-02-08', '2027-02-09', '2027-03-26', '2027-04-21', '2027-05-01', '2027-05-27', '2027-09-07', '2027-10-12', '2027-11-02', '2027-11-15', '2027-11-20',
  '2027-12-20', '2027-12-21', '2027-12-22', '2027-12-23', '2027-12-24', '2027-12-25', '2027-12-26', '2027-12-27', '2027-12-28', '2027-12-29', '2027-12-30', '2027-12-31',
  '2028-01-01', '2028-01-02', '2028-01-03', '2028-01-04', '2028-01-05', '2028-01-06'
];

const BASE = [
  { id: 'AUD-0001', cliente: 'Cláudia Regina Melo', util: -5, hora: '10:00', processo: '0716663-73.2025.5.02.0018', tipo: 'Una', local: '18ª Vara do Trabalho de São Paulo', link: 'https://sala.exemplo.com/18vt-1000', advogado: 'Dra. Letícia Moraes', situacao: 'Realizada', clienteAvisado: true, observacoes: 'Acordo homologado em audiência.' },
  { id: 'AUD-0002', cliente: 'Mariana Albuquerque Rocha', util: 0, hora: 'dinamica', processo: '0758369-57.2025.5.02.0011', tipo: 'Una', local: '11ª Vara do Trabalho de São Paulo', link: 'https://sala.exemplo.com/11vt-0930', advogado: 'Dra. Letícia Moraes', situacao: 'Agendada', clienteAvisado: false, observacoes: 'Testemunha confirmada (ex-colega de setor).' },
  { id: 'AUD-0003', cliente: 'José Henrique Barbosa', util: 1, hora: '14:00', processo: '0713112-73.2025.5.02.0313', tipo: 'Instrução', local: '3ª Vara do Trabalho de Guarulhos · Fórum Trabalhista', link: '', advogado: 'Dr. André Siqueira', situacao: 'Agendada', clienteAvisado: false, observacoes: 'Levar CTPS original e os últimos holerites.' },
  { id: 'AUD-0004', cliente: 'Patrícia Gomes de Lima', util: 2, hora: '10:00', processo: '0844194-62.2026.5.02.0001', tipo: 'Conciliação (CEJUSC)', local: 'CEJUSC-JT · São Paulo', link: 'https://sala.exemplo.com/cejusc-1000', advogado: 'Dra. Letícia Moraes', situacao: 'Agendada', clienteAvisado: true, observacoes: 'Cliente aceita acordo a partir de R$ 18 mil.' },
  { id: 'AUD-0005', cliente: 'Edson Ferreira da Silva', util: 3, hora: '13:30', processo: '0828393-08.2025.5.02.0045', tipo: 'Instrução', local: '45ª Vara do Trabalho de São Paulo · Fórum Ruy Barbosa', link: '', advogado: 'Dr. André Siqueira', situacao: 'Agendada', clienteAvisado: false, observacoes: 'Duas testemunhas — confirmar presença na véspera.' },
  { id: 'AUD-0006', cliente: 'Luana Cristina Prado', util: 4, hora: '15:00', processo: '0817026-43.2025.5.02.0382', tipo: 'Una', local: '2ª Vara do Trabalho de Osasco', link: 'https://sala.exemplo.com/osasco-1500', advogado: 'Dra. Camila Duarte', situacao: 'Remarcada', clienteAvisado: false, observacoes: 'Remarcada a pedido da reclamada.' },
  { id: 'AUD-0007', cliente: 'Fábio Augusto Teixeira', util: 5, hora: '16:00', processo: '0773158-10.2026.5.02.0437', tipo: 'Julgamento', local: '7ª Vara do Trabalho de Santo André', link: '', advogado: 'Dr. André Siqueira', situacao: 'Agendada', clienteAvisado: false, observacoes: 'Leitura de sentença.' },
  { id: 'AUD-0008', cliente: 'Rafael Henrique Dias', util: 6, hora: '10:30', processo: '0715622-72.2026.5.02.0071', tipo: 'Instrução', local: '71ª Vara do Trabalho de São Paulo', link: '', advogado: 'Dr. André Siqueira', situacao: 'Cancelada', clienteAvisado: false, observacoes: 'Acordo extrajudicial — retirada de pauta.' },
  { id: 'AUD-0009', cliente: 'Simone Aparecida Torres', util: 9, hora: '09:00', processo: '0753736-44.2025.5.02.0062', tipo: 'Instrução', local: '62ª Vara do Trabalho de São Paulo · Fórum Ruy Barbosa', link: '', advogado: 'Dra. Camila Duarte', situacao: 'Agendada', clienteAvisado: false, observacoes: '' },
  { id: 'AUD-0010', cliente: 'Marcos Vinícius Araújo', util: 13, hora: '11:00', processo: '0985929-20.2025.5.02.0001', tipo: 'Conciliação (CEJUSC)', local: 'CEJUSC-JT · São Paulo', link: 'https://sala.exemplo.com/cejusc-1100', advogado: 'Dra. Letícia Moraes', situacao: 'Agendada', clienteAvisado: false, observacoes: '' },
  { id: 'AUD-0011', cliente: 'Wellington Souza Martins', util: 16, hora: '08:30', processo: '0921208-69.2025.5.02.0030', tipo: 'Perícia', local: 'Perícia médica · consultório do perito (Vila Mariana)', link: '', advogado: 'Dra. Camila Duarte', situacao: 'Agendada', clienteAvisado: false, observacoes: 'Levar exames, laudos e receitas.' },
  { id: 'AUD-0012', cliente: 'Juliana Ribeiro Costa', util: 20, hora: '14:30', processo: '0745580-85.2026.5.02.0465', tipo: 'Instrução', local: '5ª Vara do Trabalho de São Bernardo do Campo', link: '', advogado: 'Dr. André Siqueira', situacao: 'Agendada', clienteAvisado: false, observacoes: '' }
];

const FINAIS = ['0142', '0318', '0457', '0563', '0629', '0771', '0846', '0915', '1034', '1188', '1260', '1347'];

const fer = new Set(FERIADOS);
const utc = iso => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d); };
const somar = (iso, n) => new Date(utc(iso) + n * 864e5).toISOString().slice(0, 10);
const util = iso => { const d = new Date(utc(iso)).getUTCDay(); return d !== 0 && d !== 6 && !fer.has(iso); };
const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/** Anda N dias úteis a partir de uma data (N pode ser negativo). */
function diasUteis(iso, n) {
  let atual = iso;
  if (n === 0) { while (!util(atual)) atual = somar(atual, 1); return atual; }
  const passo = n > 0 ? 1 : -1;
  let faltam = Math.abs(n);
  while (faltam > 0) { atual = somar(atual, passo); if (util(atual)) faltam--; }
  return atual;
}

function horaDinamica() {
  const agora = new Date();
  const hm = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(agora).split(':').map(Number);
  let min = hm[0] * 60 + hm[1] + 100;
  min = Math.ceil(min / 30) * 30;
  min = Math.max(9 * 60 + 30, Math.min(18 * 60 + 30, min));
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}

const iso8 = (iso, hhmm) => new Date(`${iso}T${hhmm}:00-03:00`).toISOString();

export function montarDemo() {
  const hoje = hojeSP();
  const audiencias = BASE.map((b, i) => {
    const data = diasUteis(hoje, b.util);
    return {
      id: b.id, linha: 6 + i, cliente: b.cliente, whatsapp: '', whatsappFmt: '(11) 9••••-' + FINAIS[i],
      processo: b.processo, data, hora: b.hora === 'dinamica' ? horaDinamica() : b.hora, tipo: b.tipo, local: b.local, link: b.link,
      advogado: b.advogado, situacao: b.situacao, clienteAvisado: b.clienteAvisado, observacoes: b.observacoes, avisos: []
    };
  });

  // Avisos que o motor já teria mandado até agora
  const historico = [];
  audiencias.forEach(a => {
    if (['Realizada', 'Cancelada', 'Adiada'].includes(a.situacao)) return;
    const d1 = diasUteis(a.data, -3), d2 = diasUteis(a.data, -1);
    const agora = Date.now();
    if (d1 <= hoje && new Date(iso8(d1, '08:01')).getTime() <= agora) {
      const q = iso8(d1, '08:01');
      a.avisos.push({ estagio: 1, rotulo: 'Faltam 3 dias úteis', quando: q, canal: 'WhatsApp + e-mail' });
      historico.push({ quando: q, id: a.id, cliente: a.cliente, audiencia: a.data.slice(8) + '/' + a.data.slice(5, 7) + ' ' + a.hora, aviso: 'Faltam 3 dias úteis', canal: 'WhatsApp + e-mail (Make)', resultado: 'Enviado', detalhes: 'Make: confirmado · E-mail de reserva: não usado' });
    }
    if (d2 <= hoje && a.data >= hoje && new Date(iso8(d2, '08:00')).getTime() <= agora) {
      const q = iso8(d2, '08:00');
      const amanha = somar(d2, 1) === a.data;
      a.avisos.push({ estagio: 2, rotulo: amanha ? 'Amanhã' : 'Próximo dia útil', quando: q, canal: 'WhatsApp + e-mail' });
      historico.push({ quando: q, id: a.id, cliente: a.cliente, audiencia: a.data.slice(8) + '/' + a.data.slice(5, 7) + ' ' + a.hora, aviso: amanha ? 'Amanhã' : 'Próximo dia útil', canal: 'WhatsApp + e-mail (Make)', resultado: 'Enviado', detalhes: 'Make: confirmado · E-mail de reserva: não usado' });
    }
  });
  const patricia = audiencias.find(a => a.id === 'AUD-0004');
  historico.push({ quando: iso8(diasUteis(hoje, -1), '10:12'), id: patricia.id, cliente: patricia.cliente, audiencia: patricia.data.slice(8) + '/' + patricia.data.slice(5, 7) + ' ' + patricia.hora, aviso: 'Lembrete ao cliente', canal: 'WhatsApp (Bruna)', resultado: 'Enviado', detalhes: '' });
  historico.push({ quando: iso8(diasUteis(hoje, -2), '16:40'), id: 'AUD-0012', cliente: 'Juliana Ribeiro Costa', audiencia: '', aviso: 'Audiência cadastrada', canal: 'Painel', resultado: 'OK', detalhes: '' });
  historico.push({ quando: iso8(diasUteis(hoje, -8), '09:00'), id: '—', cliente: '—', audiencia: '—', aviso: 'Motor instalado', canal: '—', resultado: 'OK', detalhes: 'Gatilho de hora em hora criado.' });
  historico.sort((x, y) => y.quando.localeCompare(x.quando));

  const ultima = new Date(); ultima.setMinutes(1, 0, 0);
  if (ultima > new Date()) ultima.setHours(ultima.getHours() - 1);

  return {
    ok: true,
    demo: true,
    agora: new Date().toISOString(),
    escritorio: 'Diferencial Soluções',
    planilhaUrl: '',
    config: { aviso1: 3, aviso2: 1, contagem: 'uteis', inicio: '08:00', fim: '19:00', usarMake: true, reserva: true, lembrarCliente: false, modoTeste: true },
    motor: { versao: '1.0.0', gatilhoAtivo: true, ultimaVerificacao: { quando: ultima.toISOString(), enviados: 0, pendentes: 0, canal: null } },
    feriados: FERIADOS.filter(f => f >= hoje),
    audiencias,
    historico
  };
}
