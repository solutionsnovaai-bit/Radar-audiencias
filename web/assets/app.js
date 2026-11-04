/*
 * Radar de Audiências · Diferencial Soluções — painel
 */
import { montarDemo } from './demo.js';

const API = '/api/radar';
const FUSO = 'America/Sao_Paulo';
const SITUACOES = ['Agendada', 'Remarcada', 'Adiada', 'Realizada', 'Cancelada'];
const TIPOS = ['Una', 'Inicial', 'Instrução', 'Conciliação (CEJUSC)', 'Julgamento', 'Perícia', 'Outra'];
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DIAS_C = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const espera = ms => new Promise(r => setTimeout(r, ms));
const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;

const estado = { modo: null, pin: null, dados: null, lista: [], aba: 'geral', filtro: 'todas', busca: '', detalhe: null, abertura: null, ocupado: false };

/* ============================================================
   Ícones
   ============================================================ */
const IC = {
  radar: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l6-6"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  local: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.4"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  pessoa: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4"/>',
  whats: '<path d="M4 20l1.3-4.1A8 8 0 1 1 8.3 19z"/><path d="M9.3 8.8c.2 2.6 2.6 5 5.4 5.6l1.2-1.3-1.9-1.1-.8.8c-1-.5-1.8-1.3-2.3-2.3l.8-.8-1.1-1.9z"/>',
  enviar: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
  copiar: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8"/>',
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  atualizar: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  lua: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>',
  sino: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  engrenagem: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2 1.2M17.8 15.3l2 1.2M4.2 16.5l2-1.2M17.8 8.7l2-1.2"/><circle cx="12" cy="12" r="6.6"/>',
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l5-5-5-5M15 12H4"/>',
  planilha: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M4 9h16M4 14.5h16M10 9v11.5"/>',
  alerta: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.3"/>',
  balanca: '<path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-2.5 6a3 3 0 0 0 5 0zM19 7l-2.5 6a3 3 0 0 0 5 0z"/>',
  teste: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>'
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;

/* ============================================================
   Utilidades
   ============================================================ */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = s => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const isoSP = d => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const horaSP = d => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
const utc = iso => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d); };
const diff = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);
const dow = iso => new Date(utc(iso)).getUTCDay();
const somar = (iso, n) => new Date(utc(iso) + n * 864e5).toISOString().slice(0, 10);
const dataCurta = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '—';
const primeiroNome = n => String(n || '').trim().split(/\s+/)[0] || '';
const inicioDe = a => new Date(`${a.data}T${a.hora || '00:00'}:00-03:00`).getTime();
const plural = (n, um, varios) => n === 1 ? um : varios;

function diasUteis(de, ate, fer) {
  const total = diff(de, ate);
  if (total <= 0) return total < 0 ? -1 : 0;
  let n = 0;
  for (let i = 1; i <= Math.min(total, 400); i++) { const d = somar(de, i), w = dow(d); if (w !== 0 && w !== 6 && !fer.has(d)) n++; }
  return n;
}
function diaUtilAntes(iso, n, fer) {
  let atual = iso, faltam = n;
  while (faltam > 0) { atual = somar(atual, -1); const w = dow(atual); if (w !== 0 && w !== 6 && !fer.has(atual)) faltam--; }
  return atual;
}
function dataLonga(iso, comAno = false) {
  if (!iso) return 'sem data';
  const [a, m, d] = iso.split('-').map(Number);
  return `${DIAS_C[dow(iso)]}, ${String(d).padStart(2, '0')} ${MESES[m - 1]}${comAno ? ' ' + a : ''}`;
}
function relativo(isoTempo) {
  const t = new Date(isoTempo).getTime();
  if (!t) return '';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'agora há pouco';
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}
function quandoCurto(isoTempo) {
  const d = new Date(isoTempo);
  if (isNaN(d)) return '';
  return `${dataCurta(isoSP(d))} ${horaSP(d)}`;
}

/* Número CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO */
const RAMOS = { 1: 'Supremo Tribunal Federal', 2: 'Conselho Nacional de Justiça', 3: 'Superior Tribunal de Justiça', 4: 'Justiça Federal', 5: 'Justiça do Trabalho', 6: 'Justiça Eleitoral', 7: 'Justiça Militar da União', 8: 'Justiça Estadual', 9: 'Justiça Militar Estadual' };
const TRTS = { 1: 'Rio de Janeiro', 2: 'São Paulo · capital e região', 3: 'Minas Gerais', 4: 'Rio Grande do Sul', 5: 'Bahia', 6: 'Pernambuco', 7: 'Ceará', 8: 'Pará e Amapá', 9: 'Paraná', 10: 'Distrito Federal e Tocantins', 11: 'Amazonas e Roraima', 12: 'Santa Catarina', 13: 'Paraíba', 14: 'Rondônia e Acre', 15: 'Campinas · interior de SP', 16: 'Maranhão', 17: 'Espírito Santo', 18: 'Goiás', 19: 'Alagoas', 20: 'Sergipe', 21: 'Rio Grande do Norte', 22: 'Piauí', 23: 'Mato Grosso', 24: 'Mato Grosso do Sul' };
function lerCnj(s) {
  const m = String(s || '').match(/(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})/);
  if (!m) return null;
  const [, n, dv, ano, j, tr, o] = m;
  let valido = false;
  try { valido = BigInt(n + ano + j + tr + o + dv) % 97n === 1n; } catch (e) { valido = false; }
  const trN = Number(tr);
  const tribunal = j === '5' ? (trN === 0 ? 'TST' : `TRT-${trN}`) : j === '4' ? `TRF-${trN}` : j === '8' ? `TJ-${tr}` : '';
  return { n, dv, ano, j, tr, o, valido, tribunal, ramo: RAMOS[j] || '', regiao: j === '5' ? (TRTS[trN] || '') : '' };
}

/* ============================================================
   Regras do radar (as mesmas do motor da planilha)
   ============================================================ */
function enriquecer(d) {
  const hoje = isoSP(new Date());
  const fer = new Set(d.feriados || []);
  const cfg = Object.assign({ aviso1: 3, aviso2: 1, contagem: 'uteis', inicio: '08:00' }, d.config || {});
  const agora = Date.now();
  return (d.audiencias || []).map(a0 => {
    const a = Object.assign({}, a0);
    a.dc = a.data ? diff(hoje, a.data) : null;
    a.du = a.data ? diasUteis(hoje, a.data, fer) : null;
    a.ini = a.data ? inicioDe(a) : 0;
    const sit = norm(a.situacao);
    if (!a.data) a.zona = 'passou';
    else if (sit === 'realizada' || sit === 'cancelada') a.zona = 'encerrada';
    else if (sit === 'adiada') a.zona = 'adiada';
    else if (a.dc < 0) a.zona = 'passou';
    else if (a.dc === 0) a.zona = 'hoje';
    else {
      const dias = cfg.contagem === 'corridos' ? a.dc : a.du;
      if (dias <= cfg.aviso1) a.zona = a.dc === 1 ? 'amanha' : (dias === 1 ? 'vespera' : 'alerta');
      else if (a.dc <= 7) a.zona = 'semana';
      else a.zona = 'radar';
    }
    a.ativa = !['encerrada', 'adiada', 'passou'].includes(a.zona);
    a.naZona = ['hoje', 'amanha', 'vespera', 'alerta'].includes(a.zona);
    a.futura = a.ativa && a.ini > agora;
    a.online = !!a.link;
    a.cnj = lerCnj(a.processo);
    a.avisos = a.avisos || [];
    // previsão dos avisos ao escritório
    if (a.data && a.ativa) {
      const prev1 = cfg.contagem === 'corridos' ? somar(a.data, -cfg.aviso1) : diaUtilAntes(a.data, cfg.aviso1, fer);
      const prev2 = cfg.aviso2 ? (cfg.contagem === 'corridos' ? somar(a.data, -cfg.aviso2) : diaUtilAntes(a.data, cfg.aviso2, fer)) : null;
      a.previsto1 = prev1 < hoje ? hoje : prev1;
      a.previsto2 = prev2 && (prev2 < hoje ? hoje : prev2);
    }
    return a;
  }).sort((x, y) => (x.ini || 0) - (y.ini || 0));
}

function rotuloZona(a) {
  const cfg = estado.dados?.config || {};
  switch (a.zona) {
    case 'hoje': return 'É hoje';
    case 'amanha': return 'Amanhã';
    case 'vespera': return 'Próximo dia útil';
    case 'alerta': return cfg.contagem === 'corridos' ? `Em ${a.dc} dias` : `Em ${a.du} dias úteis`;
    case 'semana': return `Em ${a.dc} dias`;
    case 'radar': return `Em ${a.dc} dias`;
    case 'encerrada': return a.situacao;
    case 'adiada': return 'Adiada';
    default: return 'Já passou';
  }
}

function mensagemCliente(a) {
  const escritorio = estado.dados?.escritorio || 'Diferencial Soluções';
  const linhas = [
    `Olá, ${primeiroNome(a.cliente)}! Aqui é a Bruna, da ${escritorio} 😊`,
    '',
    'Passando para lembrar da sua audiência:',
    `🗓️ ${a.data ? DIAS[dow(a.data)] : ''}, ${dataCurta(a.data)} às ${a.hora || '—'}`,
    `📍 ${a.local || 'local a confirmar'}${a.online ? ' (online)' : ''}`
  ];
  if (a.online) linhas.push(`🔗 Link da sala: ${a.link}`);
  linhas.push('');
  linhas.push(a.online
    ? 'Entre na sala 15 minutos antes, com câmera e microfone funcionando e um documento com foto em mãos.'
    : 'Chegue com 30 minutos de antecedência e leve um documento com foto.');
  linhas.push('Qualquer dúvida, é só responder por aqui.');
  return linhas.join('\n');
}

/* ============================================================
   Comunicação com o motor
   ============================================================ */
async function api(corpo) {
  const op = corpo ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) } : { method: 'GET', cache: 'no-store' };
  const r = await fetch(API, op);
  try { return await r.json(); } catch (e) { return { ok: false, erro: 'resposta_invalida' }; }
}

async function chamar(acao, extra = {}) {
  if (estado.modo === 'demo') return acaoDemo(acao, extra);
  const r = await api(Object.assign({ acao, pin: estado.pin }, extra));
  if (!r.ok && (r.erro === 'pin_invalido' || r.erro === 'bloqueado')) {
    esquecerPin();
    toast('Acesso expirado', 'O PIN mudou ou expirou. Entre de novo.', 'alerta');
    setTimeout(() => location.reload(), 1600);
  }
  return r;
}

const CHAVE_PIN = 'radar-pin';
function lerPin() { try { return sessionStorage.getItem(CHAVE_PIN) || localStorage.getItem(CHAVE_PIN); } catch (e) { return null; } }
function guardarPin(pin, lembrar) { try { sessionStorage.setItem(CHAVE_PIN, pin); if (lembrar) localStorage.setItem(CHAVE_PIN, pin); } catch (e) { /* sem armazenamento */ } }
function esquecerPin() { try { sessionStorage.removeItem(CHAVE_PIN); localStorage.removeItem(CHAVE_PIN); } catch (e) { /* sem armazenamento */ } }

/* Ações da demonstração: tudo acontece só neste navegador */
function acaoDemo(acao, extra) {
  const d = estado.dados;
  const achar = id => d.audiencias.find(a => a.id === id);
  const agora = new Date().toISOString();
  const registrar = (a, aviso, canal) => d.historico.unshift({ quando: agora, id: a ? a.id : '—', cliente: a ? a.cliente : '—', audiencia: a ? dataCurta(a.data) + ' ' + a.hora : '—', aviso, canal, resultado: 'Demonstração', detalhes: 'Nada foi enviado de verdade.' });
  if (acao === 'clienteAvisado') { const a = achar(extra.id); a.clienteAvisado = extra.valor; registrar(a, extra.valor ? 'Cliente marcado como avisado' : 'Marcação de cliente avisado removida', 'Painel'); }
  if (acao === 'situacao') { const a = achar(extra.id); a.situacao = extra.situacao; }
  if (acao === 'avisarCliente') { const a = achar(extra.id); a.clienteAvisado = true; registrar(a, 'Lembrete ao cliente', 'WhatsApp (Bruna)'); return Object.assign(d, { ok: true, acao: { ok: true, modoTeste: true, demo: true } }); }
  if (acao === 'salvar') {
    const s = extra.audiencia;
    let a = s.id ? achar(s.id) : null;
    if (!a) {
      const maior = Math.max(0, ...d.audiencias.map(x => Number(String(x.id).replace(/\D/g, '')) || 0));
      a = { id: 'AUD-' + String(maior + 1).padStart(4, '0'), avisos: [], clienteAvisado: false, whatsappFmt: '' };
      d.audiencias.push(a);
      registrar(Object.assign(a, s, { id: a.id }), 'Audiência cadastrada', 'Painel');
    } else {
      Object.assign(a, s); registrar(a, 'Audiência atualizada', 'Painel');
    }
    a.whatsappFmt = s.whatsapp || a.whatsappFmt;
    return Object.assign(d, { ok: true, acao: { ok: true, id: a.id } });
  }
  if (acao === 'verificar') {
    d.motor.ultimaVerificacao = { quando: agora, enviados: 0, pendentes: 0 };
    return Object.assign(d, { ok: true, verificacao: { ok: true, enviados: 0, pendentes: 0, demo: true } });
  }
  return Object.assign(d, { ok: true });
}

/* ============================================================
   Abertura
   ============================================================ */
function temaEscuro() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

function iniciarAbertura() {
  const el = $('#abertura'), barra = $('#abertura-barra'), status = $('#abertura-status');
  let rapido = false;
  try { rapido = sessionStorage.getItem('radar-visto') === '1'; } catch (e) { rapido = false; }
  const t0 = performance.now();
  const minimo = reduzido ? 350 : rapido ? 1200 : 2900;
  let cena = null;
  if (!reduzido) {
    import('./loader3d.js').then(m => {
      try { cena = m.iniciarLoader3D($('#cena3d'), { escuro: temaEscuro(), rapido }); el.classList.add('com-3d'); }
      catch (e) { console.info('3D indisponível neste aparelho — usando a abertura simples.'); }
    }).catch(() => {});
  }
  return {
    passo(txt, pct) { status.textContent = txt; barra.style.width = pct + '%'; },
    tema(escuro) { if (cena) cena.tema(escuro); },
    async sair() {
      const falta = minimo - (performance.now() - t0);
      if (falta > 0) await espera(falta);
      try { sessionStorage.setItem('radar-visto', '1'); } catch (e) { /* ok */ }
      if (cena) await cena.sair(rapido ? 600 : 850);
      el.classList.add('saindo');
      await espera(620);
      if (cena) cena.destruir();
      el.hidden = true;
    }
  };
}

/* ============================================================
   Início
   ============================================================ */
async function iniciar() {
  pintarBotoesFixos();
  const ab = estado.abertura = iniciarAbertura();
  ab.passo('Ligando o radar…', 14);

  let status = null;
  try { status = await api(null); } catch (e) { status = null; }

  if (status && status.configurado) {
    estado.modo = 'real';
    const pin = lerPin();
    if (pin) {
      ab.passo('Lendo a planilha…', 48);
      const r = await api({ acao: 'painel', pin }).catch(() => null);
      if (r && r.ok) {
        estado.pin = pin; estado.dados = r;
        ab.passo('Calculando dias úteis…', 82); await espera(250);
        ab.passo('Tudo pronto', 100);
        await ab.sair(); mostrarApp(); return;
      }
      esquecerPin();
    }
    ab.passo('Pronto para entrar', 100);
    await ab.sair();
    mostrarAcesso();
    return;
  }

  estado.modo = 'demo';
  ab.passo('Montando a demonstração…', 46); await espera(350);
  estado.dados = montarDemo();
  ab.passo('Calculando dias úteis e feriados…', 80); await espera(300);
  ab.passo('Tudo pronto', 100);
  await ab.sair();
  mostrarApp();
}

function mostrarAcesso() {
  const sec = $('#acesso'), form = $('#form-acesso'), erro = $('#acesso-erro'), campo = $('#campo-pin');
  sec.hidden = false;
  setTimeout(() => campo.focus(), 60);
  form.onsubmit = async ev => {
    ev.preventDefault();
    const pin = campo.value.trim();
    if (!pin) return;
    const bt = form.querySelector('button');
    bt.disabled = true; bt.innerHTML = `${ic('atualizar', 'girando')}<span>Entrando…</span>`; erro.textContent = '';
    const r = await api({ acao: 'painel', pin }).catch(() => ({ ok: false, erro: 'rede' }));
    bt.disabled = false; bt.innerHTML = '<span>Entrar</span>';
    if (r.ok) {
      estado.pin = pin; estado.dados = r; guardarPin(pin, $('#lembrar-pin').checked);
      sec.style.transition = 'opacity .5s'; sec.style.opacity = '0';
      await espera(450); sec.hidden = true; sec.style.opacity = '';
      mostrarApp();
      return;
    }
    const msgs = {
      pin_invalido: r.restantes != null ? `PIN incorreto. ${r.restantes} ${plural(r.restantes, 'tentativa restante', 'tentativas restantes')}.` : 'PIN incorreto.',
      bloqueado: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.',
      nao_autorizado: 'O painel não está autorizado no motor. Confira a chave de integração.',
      motor_indisponivel: 'O motor da planilha não respondeu. Tente de novo em instantes.',
      rede: 'Sem conexão. Confira a internet e tente de novo.'
    };
    erro.textContent = msgs[r.erro] || 'Não foi possível entrar agora.';
    form.classList.remove('tremer'); void form.offsetWidth; form.classList.add('tremer');
    campo.select();
  };
}

function mostrarApp() {
  const app = $('#app');
  app.hidden = false;
  app.classList.add('entrando');
  setTimeout(() => app.classList.remove('entrando'), 1200);
  render(true);
  posicionarIndicador();
  setInterval(tick, 1000);
  setInterval(() => atualizarSilencioso(), estado.modo === 'demo' ? 60000 : 240000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizarSilencioso(); });
  const hash = location.hash.replace('#', '');
  if (['agenda', 'historico'].includes(hash)) irPara(hash);
}

async function atualizarSilencioso() {
  if (estado.ocupado || document.hidden) return;
  if (estado.modo === 'real') {
    const r = await api({ acao: 'painel', pin: estado.pin }).catch(() => null);
    if (r && r.ok) estado.dados = r;
  }
  render(false);
}

/* ============================================================
   Desenho
   ============================================================ */
function render(animar) {
  estado.lista = enriquecer(estado.dados);
  pintarTopo();
  const c = $('#conteudo');
  const html = estado.aba === 'agenda' ? vistaAgenda() : estado.aba === 'historico' ? vistaHistorico() : vistaGeral();
  c.innerHTML = `<div class="vista${animar ? '' : ' quieta'}">${html}</div>`;
  if (!animar) $$('.vista.quieta, .vista.quieta *', c).forEach(n => { n.style.animation = 'none'; });
  $$('.vista.quieta .radar-varredura, .vista.quieta .ponto, .vista.quieta .onda, .vista.quieta .chip.pulsa', c).forEach(n => { n.style.animation = ''; });
  tick();
  if (estado.detalhe) abrirDetalhe(estado.detalhe, false);
}

function pintarBotoesFixos() {
  $('#bt-verificar').innerHTML = `${ic('atualizar')}<span>Verificar <span class="texto-longo">agora</span></span>`;
  $('#bt-nova').innerHTML = `${ic('mais')}<span>Nova <span class="texto-longo">audiência</span></span>`;
  pintarBotaoTema();
}
function pintarBotaoTema() { $('#bt-tema').innerHTML = temaEscuro() ? ic('sol') : ic('lua'); }

function pintarTopo() {
  const d = estado.dados;
  const st = $('#status-motor');
  st.classList.remove('ativo', 'demo', 'erro');
  if (estado.modo === 'demo') {
    st.classList.add('demo'); st.querySelector('span').textContent = 'Demonstração';
  } else if (d.motor && d.motor.gatilhoAtivo) {
    st.classList.add('ativo');
    const u = d.motor.ultimaVerificacao;
    st.querySelector('span').textContent = u && u.quando ? `Motor ativo · ${horaSP(new Date(u.quando))}` : 'Motor ativo';
  } else {
    st.classList.add('erro'); st.querySelector('span').textContent = 'Motor desligado';
  }
  const faixa = $('#faixa-demo');
  if (estado.modo === 'demo') {
    faixa.hidden = false;
    faixa.innerHTML = `${ic('teste')}<span><b>Demonstração</b> · dados fictícios, nada é enviado. Ligado ao motor da planilha, o painel mostra as audiências reais do escritório.</span>`;
  } else if (d.config && d.config.modoTeste) {
    faixa.hidden = false;
    faixa.innerHTML = `${ic('teste')}<span><b>Modo teste ligado</b> · todo WhatsApp vai só para o número de teste. Desligue na aba Configurações da planilha quando os dados forem reais.</span>`;
  } else faixa.hidden = true;
  const info = [];
  if (d.motor && d.motor.versao) info.push('motor ' + d.motor.versao);
  if (d.planilhaUrl) info.push(`<a href="${esc(d.planilhaUrl)}" target="_blank" rel="noopener">Abrir a planilha</a>`);
  if (estado.modo === 'real') info.push('<a href="#" data-sair>Sair</a>');
  $('#rodape-info').innerHTML = info.join(' · ');
}

function tick() {
  const agora = new Date();
  const rel = $('#topo-relogio');
  if (rel) rel.textContent = `${dataLonga(isoSP(agora))} · ${horaSP(agora)}`;
  $$('[data-ini]').forEach(el => {
    const falta = Number(el.dataset.ini) - Date.now();
    const p = falta > 0 ? falta : 0;
    const d = Math.floor(p / 864e5), h = Math.floor(p / 36e5) % 24, m = Math.floor(p / 6e4) % 60, s = Math.floor(p / 1e3) % 60;
    const set = (k, v) => { const n = el.querySelector(`[data-cd="${k}"]`); if (n) n.textContent = String(v).padStart(2, '0'); };
    set('d', d); set('h', h); set('m', m); set('s', s);
    if (falta <= 0) el.classList.add('acabou');
  });
}

/* ---------- Visão geral ---------- */
function vistaGeral() {
  const L = estado.lista, cfg = estado.dados.config || {};
  const zona = L.filter(a => a.naZona);
  const proxima = L.find(a => a.futura) || null;
  const hoje = L.filter(a => a.zona === 'hoje').length;
  const semana = L.filter(a => a.ativa && a.dc >= 0 && a.dc <= 7).length;
  const aAvisar = zona.filter(a => !a.clienteAvisado).length;
  const depois = L.filter(a => a.ativa && !a.naZona && a.dc >= 0).slice(0, 6);
  const unidade = cfg.contagem === 'corridos' ? 'dias' : 'dias úteis';

  return `
  <section class="heroi">
    <div class="bloco radar-bloco">
      <div class="bloco-cab"><span class="rotulo">${ic('radar')} Radar · próximos 30 dias</span><span class="rotulo">${zona.length} na zona de alerta</span></div>
      <div class="radar">${svgRadar(L, cfg)}<div class="radar-varredura" aria-hidden="true"></div></div>
      <div class="radar-legenda">
        <span><i style="background:var(--hoje)"></i>Hoje</span>
        <span><i style="background:var(--vespera)"></i>Amanhã / véspera</span>
        <span><i style="background:var(--alerta)"></i>Até ${cfg.aviso1 || 3} ${unidade}</span>
        <span><i style="background:var(--semana)"></i>Até 7 dias</span>
        <span><i style="background:var(--ok)"></i>No radar</span>
      </div>
    </div>
    <div class="lado">
      ${cartaoProxima(proxima)}
      <div class="numeros">
        ${numero(zona.length, 'Na zona de alerta', `até ${cfg.aviso1 || 3} ${unidade}`, 'z-vespera')}
        ${numero(hoje, plural(hoje, 'Audiência hoje', 'Audiências hoje'), dataLonga(isoSP(new Date())), 'z-hoje')}
        ${numero(semana, 'Próximos 7 dias', 'contando hoje', 'z-semana')}
        ${numero(aAvisar, 'Clientes a avisar', aAvisar ? 'na zona de alerta' : 'todos avisados', aAvisar ? 'z-hoje' : 'z-radar')}
      </div>
    </div>
  </section>

  <section class="secao">
    <div class="secao-cab">
      <div>
        <span class="rotulo">Zona de alerta</span>
        <h2 class="titulo-secao">Avisar agora <small>${zona.length} ${plural(zona.length, 'audiência', 'audiências')}</small></h2>
        <p>O escritório já recebe o aviso automático pelo WhatsApp da Bruna e por e-mail. Aqui você confere se cada cliente sabe.</p>
      </div>
    </div>
    ${zona.length ? `<div class="grade-cartoes" style="margin-top:14px">${zona.map(cartaoAud).join('')}</div>`
      : `<div class="bloco vazio" style="margin-top:14px"><b>Nada na zona de alerta</b><span>Nenhuma audiência nos próximos ${cfg.aviso1 || 3} ${unidade}. O radar continua de olho.</span></div>`}
  </section>

  <section class="bloco">
    <div class="bloco-cab" style="padding-bottom:12px">
      <div><span class="rotulo">Logo depois</span><h2 class="titulo-secao">Próximas semanas</h2></div>
      <button class="botao botao-contorno botao-p" type="button" data-ir="agenda">${ic('calendario')} Agenda completa</button>
    </div>
    <div class="lista">${depois.length ? depois.map(linhaAud).join('') : '<div class="vazio"><span>Sem audiências marcadas depois da zona de alerta.</span></div>'}</div>
  </section>`;
}

function numero(n, rotulo, sub, cls) {
  return `<div class="bloco numero ${cls}"><b>${n}</b><span>${esc(rotulo)}</span><small>${esc(sub)}</small></div>`;
}

function cartaoProxima(a) {
  if (!a) return `<div class="bloco proxima"><span class="rotulo">Próxima audiência</span><p class="proxima-nome">Agenda livre</p><p class="proxima-info">Nenhuma audiência futura na planilha.</p></div>`;
  return `
  <div class="bloco proxima z-${a.zona}">
    <span class="rotulo">Próxima audiência · ${esc(rotuloZona(a))}</span>
    <h2 class="proxima-nome">${esc(a.cliente)}</h2>
    <div class="proxima-info">${esc(dataLonga(a.data))} às <b>${esc(a.hora || '—')}</b> · ${esc(a.tipo || 'Audiência')} · ${esc(a.local || '')}${a.online ? ' · online' : ''}</div>
    <div class="contagem" data-ini="${a.ini}" aria-label="Contagem regressiva">
      <div><b data-cd="d">00</b><span>dias</span></div>
      <div><b data-cd="h">00</b><span>horas</span></div>
      <div><b data-cd="m">00</b><span>min</span></div>
      <div><b data-cd="s">00</b><span>seg</span></div>
    </div>
    <div class="acoes">
      <button class="botao botao-primario botao-p" type="button" data-abrir="${esc(a.id)}">${ic('doc')} Ver detalhes</button>
      <button class="botao botao-suave botao-p" type="button" data-acao="copiar" data-id="${esc(a.id)}">${ic('copiar')} Copiar mensagem</button>
    </div>
  </div>`;
}

function estadoEscritorio(a) {
  const ultimo = a.avisos && a.avisos.length ? a.avisos[a.avisos.length - 1] : null;
  if (ultimo) return `<div class="estado sim"><i>✓</i><span>Escritório avisado · ${esc(ultimo.rotulo)} · ${esc(quandoCurto(ultimo.quando))}</span></div>`;
  const cfg = estado.dados.config || {};
  return `<div class="estado espera"><i>…</i><span>Aviso ao escritório na próxima verificação${cfg.inicio ? ` (a partir das ${esc(cfg.inicio)})` : ''}</span></div>`;
}

function cartaoAud(a, i) {
  const t = a.cnj && a.cnj.tribunal ? `<span class="etiqueta ${a.cnj.valido ? '' : 'atencao'}" title="${a.cnj.valido ? 'Dígito verificador conferido' : 'Dígito verificador não confere'}">${esc(a.cnj.tribunal)}${a.cnj.valido ? '' : ' ?'}</span>` : '';
  return `
  <article class="cartao z-${a.zona}" style="--i:${i}">
    <div class="cartao-topo"><span class="chip${a.zona === 'hoje' ? ' pulsa' : ''}">${esc(rotuloZona(a))}</span><span class="cartao-hora">${esc(a.hora || '—')}</span></div>
    <h3 class="cartao-nome"><button type="button" data-abrir="${esc(a.id)}">${esc(a.cliente)}</button></h3>
    <div class="cartao-linhas">
      <div>${ic('calendario')}<span>${esc(dataLonga(a.data))} · ${esc(a.tipo || 'Audiência')}</span></div>
      <div>${ic(a.online ? 'video' : 'local')}<span>${esc(a.local || 'Local a confirmar')}${a.online ? ' · <b>online</b>' : ''}</span></div>
      ${a.processo ? `<div>${ic('doc')}<span class="processo-linha"><span class="mono">${esc(a.processo)}</span>${t}</span></div>` : ''}
      ${a.advogado ? `<div>${ic('pessoa')}<span>${esc(a.advogado)}</span></div>` : ''}
    </div>
    <div class="cartao-estado">
      ${estadoEscritorio(a)}
      ${a.clienteAvisado ? '<div class="estado sim"><i>✓</i><span>Cliente avisado</span></div>' : '<div class="estado nao"><i>!</i><span>Cliente ainda não avisado</span></div>'}
    </div>
    <div class="cartao-acoes">
      ${a.clienteAvisado ? '' : `<button class="botao botao-primario botao-p" type="button" data-acao="lembrar" data-id="${esc(a.id)}">${ic('whats')} Lembrar pela Bruna</button>`}
      <button class="botao botao-suave botao-p" type="button" data-acao="whats" data-id="${esc(a.id)}" title="Abre o seu WhatsApp com a mensagem pronta">${ic('enviar')} Meu WhatsApp</button>
      <button class="botao botao-contorno botao-p" type="button" data-acao="avisado" data-id="${esc(a.id)}">${a.clienteAvisado ? 'Desmarcar' : ic('check') + ' Avisado'}</button>
    </div>
  </article>`;
}

function linhaAud(a, i) {
  const [, m, d] = (a.data || '0000-00-00').split('-');
  const apagada = !a.ativa;
  const fim = [];
  fim.push(`<span class="chip">${esc(rotuloZona(a))}</span>`);
  if (a.ativa) fim.push(a.clienteAvisado ? '<span class="etiqueta ok">cliente avisado</span>' : (a.naZona ? '<span class="etiqueta atencao">avisar cliente</span>' : ''));
  if (a.online && a.ativa) fim.push('<span class="etiqueta">online</span>');
  return `
  <div class="linha-aud z-${a.zona}${apagada ? ' apagada' : ''}" style="--i:${i}" data-abrir="${esc(a.id)}" role="button" tabindex="0" aria-label="${esc(a.cliente)}, ${esc(dataLonga(a.data))} às ${esc(a.hora)}">
    <div class="linha-data"><b>${esc(d || '—')}</b><span>${a.data ? esc(DIAS_C[dow(a.data)] + ' · ' + MESES[Number(m) - 1]) : ''}</span></div>
    <div class="linha-hora">${esc(a.hora || '—')}</div>
    <div class="linha-meio"><strong>${esc(a.cliente)}</strong><span>${esc([a.tipo, a.local].filter(Boolean).join(' · '))}</span></div>
    <div class="linha-fim">${fim.join('')}</div>
  </div>`;
}

/* ---------- Radar (SVG) ---------- */
function svgRadar(L, cfg) {
  const C = 300, R = 258, r0 = 30;
  const raio = d => r0 + (R - r0) * Math.sqrt(Math.min(Math.max(d, 0), 30) / 30);
  const fer = new Set(estado.dados.feriados || []);
  const hoje = isoSP(new Date());
  let limite = 0, conta = 0, dia = hoje;
  while (conta < (cfg.aviso1 || 3) && limite < 40) { dia = somar(dia, 1); limite++; const w = dow(dia); if (cfg.contagem === 'corridos' || (w !== 0 && w !== 6 && !fer.has(dia))) conta++; }
  const setores = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
  const ang0 = i => -90 + i * 72;
  const rad = g => g * Math.PI / 180;
  const P = (r, g) => [C + r * Math.cos(rad(g)), C + r * Math.sin(rad(g))];
  let s = `<svg viewBox="0 0 600 600" role="img" aria-label="Radar das próximas audiências: o centro é hoje, a borda é daqui a 30 dias">`;
  s += `<circle class="zona" cx="${C}" cy="${C}" r="${raio(limite + 0.5).toFixed(1)}"/>`;
  [[0, ''], [3, '3 dias'], [7, '1 semana'], [15, '15 dias'], [30, '30 dias']].forEach(([d, t]) => {
    if (d === 0) return;
    s += `<circle class="anel${d === 7 ? ' anel-forte' : ''}" cx="${C}" cy="${C}" r="${raio(d).toFixed(1)}"/>`;
    s += `<text class="txt-anel" x="${C + 6}" y="${(C - raio(d) + 13).toFixed(1)}">${t}</text>`;
  });
  setores.forEach((t, i) => {
    const [x1, y1] = P(r0, ang0(i)), [x2, y2] = P(R, ang0(i));
    s += `<line class="raio" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    const [tx, ty] = P(R + 22, ang0(i) + 36);
    s += `<text class="txt-dia" x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${t}</text>`;
  });
  const visiveis = L.filter(a => a.ativa && a.dc >= 0 && a.dc <= 30);
  const ocupados = [];
  visiveis.forEach(a => {
    const w = dow(a.data), idx = w === 0 ? 0 : w === 6 ? 4 : w - 1;
    const [h, m] = (a.hora || '12:00').split(':').map(Number);
    const frac = Math.min(1, Math.max(0, (h + m / 60 - 7.5) / 11));
    let g = ang0(idx) + 9 + frac * 54;
    let r = raio(a.dc + (h + m / 60) / 24);
    // afasta pontos que cairiam um em cima do outro
    for (let k = 0; k < 6; k++) {
      const [x, y] = P(r, g);
      if (!ocupados.some(([ox, oy]) => Math.hypot(ox - x, oy - y) < 16)) break;
      g += 7;
    }
    const [x, y] = P(r, g);
    ocupados.push([x, y]);
    const atraso = (((g + 90) % 360 + 360) % 360) / 360 * 6 - 6;
    const grande = a.naZona;
    s += `<g class="blip z-${a.zona}" tabindex="0" role="button" data-abrir="${esc(a.id)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" aria-label="${esc(a.cliente)} · ${esc(dataLonga(a.data))} às ${esc(a.hora)}">
      <title>${esc(a.cliente)} · ${esc(dataLonga(a.data))} às ${esc(a.hora)}</title>
      <circle class="halo" r="17" style="fill:var(--fundo)"/>
      ${grande ? '<circle class="onda" r="9" style="stroke:var(--cor)"/>' : ''}
      <circle class="ponto" r="${grande ? 7 : 5.5}" style="fill:var(--cor);animation-delay:${atraso.toFixed(2)}s"/>
      ${grande ? `<text x="13" y="4">${esc(primeiroNome(a.cliente))}</text>` : ''}
    </g>`;
  });
  s += `<circle class="centro" cx="${C}" cy="${C}" r="${r0 - 6}"/><text class="centro-txt" x="${C}" y="${C + 3}" text-anchor="middle">HOJE</text>`;
  return s + '</svg>';
}

/* ---------- Agenda ---------- */
const FILTROS = [
  ['todas', 'Próximas', a => a.ativa && a.dc >= 0],
  ['zona', 'Zona de alerta', a => a.naZona],
  ['avisar', 'Sem aviso ao cliente', a => a.ativa && a.dc >= 0 && !a.clienteAvisado],
  ['online', 'Online', a => a.ativa && a.dc >= 0 && a.online],
  ['encerradas', 'Encerradas', a => !a.ativa]
];

function vistaAgenda() {
  const L = estado.lista;
  const f = FILTROS.find(x => x[0] === estado.filtro) || FILTROS[0];
  const q = norm(estado.busca);
  let itens = L.filter(f[2]);
  if (q) itens = itens.filter(a => norm([a.cliente, a.processo, a.local, a.advogado, a.tipo].join(' ')).includes(q));
  if (estado.filtro === 'encerradas') itens = itens.slice().reverse();

  const hoje = isoSP(new Date());
  const segunda = iso => somar(iso, -((dow(iso) + 6) % 7));
  const semanaHoje = segunda(hoje);
  const grupos = [];
  itens.forEach(a => {
    const chave = estado.filtro === 'encerradas' ? 'enc' : segunda(a.data || hoje);
    let g = grupos.find(x => x.chave === chave);
    if (!g) {
      const nome = chave === 'enc' ? 'Encerradas e passadas' : chave === semanaHoje ? 'Esta semana' : chave === somar(semanaHoje, 7) ? 'Semana que vem' : `Semana de ${dataCurta(chave)}`;
      g = { chave, nome, itens: [] }; grupos.push(g);
    }
    g.itens.push(a);
  });

  const pilulas = FILTROS.map(([k, nome, fn]) => `<button type="button" data-filtro="${k}" aria-pressed="${estado.filtro === k}">${nome} <b>${L.filter(fn).length}</b></button>`).join('');
  let i = 0;
  const corpo = grupos.length ? grupos.map(g => `
      <div class="grupo-cab"><span class="rotulo">${esc(g.nome)}</span><span class="rotulo">${g.itens.length}</span></div>
      ${g.itens.map(a => linhaAud(a, i++)).join('')}`).join('')
    : `<div class="vazio"><b>Nada por aqui</b><span>${q ? 'Nenhuma audiência combina com a busca.' : 'Nenhuma audiência neste filtro.'}</span></div>`;

  return `
  <div class="secao-cab">
    <div><span class="rotulo">Agenda</span><h2 class="titulo-secao">Todas as audiências</h2><p>Clique numa audiência para ver o processo, a linha do tempo dos avisos e a mensagem pronta para o cliente.</p></div>
  </div>
  <div class="filtros">
    <div class="pilulas" role="group" aria-label="Filtrar audiências">${pilulas}</div>
    <label class="busca">${ic('busca')}<span class="sr">Buscar</span><input id="busca" type="search" placeholder="Buscar cliente, processo, vara…" value="${esc(estado.busca)}"></label>
  </div>
  <div class="bloco lista">${corpo}</div>`;
}

/* ---------- Histórico ---------- */
function vistaHistorico() {
  const H = estado.dados.historico || [];
  const icone = h => {
    const a = norm(h.aviso);
    if (a.includes('lembrete')) return 'whats';
    if (a.includes('instalado')) return 'engrenagem';
    if (a.includes('cadastrada') || a.includes('atualizada')) return 'mais';
    if (a.includes('avisado')) return 'check';
    if (a.includes('teste')) return 'teste';
    return 'sino';
  };
  const itens = H.map((h, i) => {
    const falhou = /falh/i.test(h.resultado);
    const ok = /enviado|ok/i.test(h.resultado);
    return `
    <div class="hist-item" style="--i:${i}">
      <div class="hist-ic ${falhou ? 'falha' : ok ? 'ok' : ''}">${ic(icone(h))}</div>
      <div class="hist-meio">
        <strong>${esc(h.aviso)}${h.cliente && h.cliente !== '—' ? ` · ${esc(h.cliente)}` : ''}</strong>
        <span>${[h.audiencia && h.audiencia !== '—' ? 'Audiência ' + esc(h.audiencia) : '', esc(h.canal && h.canal !== '—' ? h.canal : ''), esc(h.resultado)].filter(Boolean).join(' · ')}</span>
        ${h.detalhes ? `<small>${esc(h.detalhes)}</small>` : ''}
      </div>
      <div class="hist-quando" title="${esc(quandoCurto(h.quando))}">${esc(relativo(h.quando))}<br>${esc(quandoCurto(h.quando))}</div>
    </div>`;
  }).join('');
  const u = estado.dados.motor && estado.dados.motor.ultimaVerificacao;
  return `
  <div class="secao-cab">
    <div><span class="rotulo">Histórico de avisos</span><h2 class="titulo-secao">Tudo o que o radar fez</h2>
    <p>${u && u.quando ? `Última verificação ${esc(relativo(u.quando))} (${esc(quandoCurto(u.quando))}). ` : ''}O motor confere a planilha de hora em hora e registra cada aviso aqui e na aba “Histórico de avisos”.</p></div>
  </div>
  <div class="bloco hist">${itens || '<div class="vazio"><b>Sem registros ainda</b><span>Os avisos aparecem aqui assim que o motor enviar o primeiro.</span></div>'}</div>`;
}

/* ============================================================
   Detalhes (gaveta)
   ============================================================ */
function abrirDetalhe(id, animar = true) {
  const a = estado.lista.find(x => x.id === id);
  if (!a) { fecharDetalhe(); return; }
  estado.detalhe = id;
  const g = $('#gaveta'), fundo = $('#gaveta-fundo');
  const cfg = estado.dados.config || {};
  const cnj = a.cnj;
  const cnjHtml = cnj ? `
    <div class="cnj">
      <div class="cnj-partes"><span title="Número sequencial">${cnj.n}</span>-<span data-k="DV" class="${cnj.valido ? 'ok' : 'erro'}" title="Dígito verificador">${cnj.dv}</span>.<span title="Ano">${cnj.ano}</span>.<span data-k="J" title="Segmento da Justiça">${cnj.j}</span>.<span data-k="TR" title="Tribunal">${cnj.tr}</span>.<span title="Vara de origem">${cnj.o}</span></div>
      <small>${esc([cnj.tribunal, cnj.ramo, cnj.regiao].filter(Boolean).join(' · '))} · origem ${esc(cnj.o)} · ${cnj.valido ? 'dígito verificador conferido ✓' : 'dígito verificador não confere — revise o número'}</small>
    </div>` : esc(a.processo || '—');

  const passos = [];
  if (a.ativa) {
    const a1 = a.avisos.find(v => v.estagio === 1), a2 = a.avisos.find(v => v.estagio === 2);
    const um = a.avisos.length === 1 && a.avisos[0].estagio === 2;
    passos.push(a1 || um ? `<li class="feito"><b>Aviso ao escritório</b> · ${esc((a1 || a.avisos[0]).rotulo)} · ${esc(quandoCurto((a1 || a.avisos[0]).quando))}</li>`
      : `<li><b>Aviso ao escritório</b> · previsto para ${esc(dataLonga(a.previsto1))} a partir das ${esc(cfg.inicio || '08:00')}</li>`);
    if (cfg.aviso2) passos.push(a2 ? `<li class="feito"><b>Véspera</b> · ${esc(a2.rotulo)} · ${esc(quandoCurto(a2.quando))}</li>`
      : `<li><b>Véspera</b> · previsto para ${esc(dataLonga(a.previsto2))}</li>`);
    passos.push(a.clienteAvisado ? '<li class="feito"><b>Cliente avisado</b></li>' : '<li><b>Cliente</b> · ainda não avisado</li>');
  }
  passos.push(`<li class="agora"><b>Audiência</b> · ${esc(dataLonga(a.data, true))} às ${esc(a.hora || '—')}</li>`);

  const msg = mensagemCliente(a);
  g.className = `gaveta z-${a.zona}`;
  g.innerHTML = `
    <div class="gaveta-cab"><span class="chip${a.zona === 'hoje' ? ' pulsa' : ''}">${esc(rotuloZona(a))}</span><button class="botao-icone" type="button" data-fechar aria-label="Fechar">${ic('x')}</button></div>
    <h2 id="gaveta-titulo">${esc(a.cliente)}</h2>
    <p class="sub">${esc(dataLonga(a.data, true))} às <b>${esc(a.hora || '—')}</b> · ${esc(a.tipo || 'Audiência')}</p>
    ${a.futura ? `<div class="contagem" data-ini="${a.ini}"><div><b data-cd="d">00</b><span>dias</span></div><div><b data-cd="h">00</b><span>horas</span></div><div><b data-cd="m">00</b><span>min</span></div><div><b data-cd="s">00</b><span>seg</span></div></div>` : ''}
    <div class="acoes">
      ${a.ativa && !a.clienteAvisado ? `<button class="botao botao-primario botao-p" type="button" data-acao="lembrar" data-id="${esc(a.id)}">${ic('whats')} Lembrar pela Bruna</button>` : ''}
      <button class="botao botao-suave botao-p" type="button" data-acao="whats" data-id="${esc(a.id)}">${ic('enviar')} Meu WhatsApp</button>
      <button class="botao botao-contorno botao-p" type="button" data-acao="editar" data-id="${esc(a.id)}">${ic('editar')} Editar</button>
    </div>
    <dl class="ficha">
      <div><dt>Local</dt><dd>${esc(a.local || '—')}${a.online ? ' · online' : ''}</dd></div>
      ${a.link ? `<div><dt>Sala</dt><dd><a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.link)}</a></dd></div>` : ''}
      <div><dt>Processo</dt><dd>${cnjHtml}</dd></div>
      <div><dt>Responsável</dt><dd>${esc(a.advogado || '—')}</dd></div>
      <div><dt>WhatsApp</dt><dd>${esc(a.whatsappFmt || '—')}</dd></div>
      <div><dt>Situação</dt><dd>${esc(a.situacao || 'Agendada')}</dd></div>
      ${a.observacoes ? `<div><dt>Observações</dt><dd>${esc(a.observacoes)}</dd></div>` : ''}
      <div><dt>ID</dt><dd class="mono">${esc(a.id)}</dd></div>
    </dl>
    <div class="gaveta-secao"><h3>Linha do tempo</h3><ol class="linha-tempo">${passos.join('')}</ol></div>
    <div class="gaveta-secao">
      <h3>Mensagem para o cliente</h3>
      <div class="msg-cliente">${esc(msg)}</div>
      <div class="acoes">
        <button class="botao botao-contorno botao-p" type="button" data-acao="copiar" data-id="${esc(a.id)}">${ic('copiar')} Copiar</button>
        <button class="botao botao-contorno botao-p" type="button" data-acao="avisado" data-id="${esc(a.id)}">${a.clienteAvisado ? 'Desmarcar cliente avisado' : ic('check') + ' Marcar cliente avisado'}</button>
      </div>
    </div>
    <div class="gaveta-secao"><h3>Mudar situação</h3><div class="seletor">${SITUACOES.map(s => `<button type="button" data-situacao="${s}" data-id="${esc(a.id)}" aria-pressed="${norm(a.situacao) === norm(s)}">${s}</button>`).join('')}</div></div>`;
  if (g.hidden) { g.hidden = false; fundo.hidden = false; document.body.classList.add('travado'); }
  if (!animar) g.style.animation = 'none'; else g.style.animation = '';
  tick();
  if (animar) setTimeout(() => { const b = g.querySelector('[data-fechar]'); if (b) b.focus(); }, 50);
}

function fecharDetalhe() {
  estado.detalhe = null;
  $('#gaveta').hidden = true; $('#gaveta-fundo').hidden = true;
  document.body.classList.remove('travado');
}

/* ============================================================
   Formulário (nova / editar)
   ============================================================ */
function abrirFormulario(id) {
  const a = id ? estado.lista.find(x => x.id === id) : null;
  const m = $('#modal');
  const v = k => esc(a ? (a[k] ?? '') : '');
  const opcoes = (lista, atual) => lista.map(o => `<option${norm(o) === norm(atual) ? ' selected' : ''}>${o}</option>`).join('');
  m.innerHTML = `
  <form method="dialog" id="form-aud" novalidate>
    <div class="modal-cab"><h2 id="modal-titulo">${a ? 'Editar audiência' : 'Nova audiência'}</h2><button class="botao-icone" type="button" data-fechar-modal aria-label="Fechar">${ic('x')}</button></div>
    <div class="modal-corpo">
      <div class="campo inteiro"><label for="f-cliente">Cliente *</label><input id="f-cliente" name="cliente" required maxlength="120" value="${v('cliente')}" placeholder="Nome completo"></div>
      <div class="campo"><label for="f-data">Data *</label><input id="f-data" name="data" type="date" required value="${v('data')}"></div>
      <div class="campo"><label for="f-hora">Horário</label><input id="f-hora" name="hora" type="time" value="${v('hora')}"></div>
      <div class="campo"><label for="f-tipo">Tipo</label><select id="f-tipo" name="tipo">${opcoes(TIPOS, a ? a.tipo : 'Una')}</select></div>
      <div class="campo"><label for="f-situacao">Situação</label><select id="f-situacao" name="situacao">${opcoes(SITUACOES, a ? a.situacao : 'Agendada')}</select></div>
      <div class="campo inteiro"><label for="f-processo">Processo (CNJ)</label><input id="f-processo" name="processo" class="mono" maxlength="40" value="${v('processo')}" placeholder="0000000-00.0000.5.02.0000"><small id="f-cnj"></small></div>
      <div class="campo inteiro"><label for="f-local">Vara / Local</label><input id="f-local" name="local" maxlength="160" value="${v('local')}" placeholder="Ex.: 11ª Vara do Trabalho de São Paulo"></div>
      <div class="campo inteiro"><label for="f-link">Link da sala (se for online)</label><input id="f-link" name="link" type="url" maxlength="300" value="${v('link')}" placeholder="https://"></div>
      <div class="campo"><label for="f-advogado">Advogado(a)</label><input id="f-advogado" name="advogado" maxlength="80" value="${v('advogado')}"></div>
      <div class="campo"><label for="f-whatsapp">WhatsApp do cliente</label><input id="f-whatsapp" name="whatsapp" inputmode="tel" maxlength="30" value="${esc(a && estado.modo === 'real' ? a.whatsappFmt || '' : '')}" placeholder="(11) 91234-5678"></div>
      <div class="campo inteiro"><label for="f-obs">Observações</label><textarea id="f-obs" name="observacoes" maxlength="500">${v('observacoes')}</textarea></div>
    </div>
    <div class="modal-pe">
      <button class="botao botao-contorno" type="button" data-fechar-modal>Cancelar</button>
      <button class="botao botao-primario" type="submit">${ic('check')} ${a ? 'Salvar' : 'Cadastrar'}</button>
    </div>
  </form>`;
  const form = $('#form-aud', m);
  const cnjCampo = $('#f-processo', m), cnjInfo = $('#f-cnj', m);
  const conferir = () => {
    const c = lerCnj(cnjCampo.value);
    if (!cnjCampo.value.trim()) { cnjInfo.textContent = 'O painel confere o dígito e mostra o tribunal.'; cnjInfo.className = ''; return; }
    if (!c) { cnjInfo.textContent = 'Formato esperado: NNNNNNN-DD.AAAA.J.TR.OOOO'; cnjInfo.className = 'erro'; return; }
    cnjInfo.textContent = c.valido ? `✓ ${[c.tribunal, c.ramo, c.regiao].filter(Boolean).join(' · ')}` : '✗ O dígito verificador não confere. Revise o número.';
    cnjInfo.className = c.valido ? 'ok' : 'erro';
  };
  cnjCampo.addEventListener('input', conferir); conferir();
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const dados = Object.fromEntries(new FormData(form).entries());
    if (!dados.cliente.trim() || !dados.data) { toast('Faltou informação', 'Preencha pelo menos o cliente e a data.', 'alerta'); return; }
    if (a) dados.id = a.id;
    if (estado.modo !== 'real' && !dados.whatsapp && a) delete dados.whatsapp;
    const bt = form.querySelector('[type="submit"]');
    bt.disabled = true;
    const r = await chamar('salvar', { audiencia: dados });
    bt.disabled = false;
    if (!r.ok) { toast('Não salvou', r.mensagem || 'Tente de novo em instantes.', 'alerta'); return; }
    estado.dados = r; m.close();
    toast(a ? 'Audiência atualizada' : 'Audiência cadastrada', estado.modo === 'demo' ? 'Demonstração: salvo só neste navegador.' : 'Já está na planilha. O radar cuida dos avisos.', 'ok');
    render(false);
    if (r.acao && r.acao.id) abrirDetalhe(r.acao.id);
  });
  m.showModal();
  setTimeout(() => $('#f-cliente', m).focus(), 60);
}

/* ============================================================
   Ações
   ============================================================ */
async function executar(acao, id, botao) {
  const a = estado.lista.find(x => x.id === id);
  if (acao === 'copiar') {
    const msg = mensagemCliente(a);
    try { await navigator.clipboard.writeText(msg); toast('Mensagem copiada', 'Cole no WhatsApp do cliente.', 'ok'); }
    catch (e) { toast('Não deu para copiar', 'Selecione o texto em “Mensagem para o cliente”.', 'alerta'); abrirDetalhe(id); }
    return;
  }
  if (acao === 'whats') {
    const numero = estado.modo === 'real' && a.whatsapp ? a.whatsapp : '';
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagemCliente(a))}`;
    const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.click();
    return;
  }
  if (acao === 'editar') { abrirFormulario(id); return; }

  const original = botao ? botao.innerHTML : '';
  if (botao) { botao.disabled = true; botao.innerHTML = `${ic('atualizar', 'girando')} Enviando…`; }
  estado.ocupado = true;
  let r;
  try {
    if (acao === 'lembrar') r = await chamar('avisarCliente', { id });
    else if (acao === 'avisado') r = await chamar('clienteAvisado', { id, valor: !a.clienteAvisado });
  } finally { estado.ocupado = false; }
  if (botao) { botao.disabled = false; botao.innerHTML = original; }
  if (!r || !r.ok) { toast('Não deu certo', (r && r.mensagem) || 'O motor não respondeu. Tente de novo.', 'alerta'); return; }
  estado.dados = r;
  if (acao === 'lembrar') {
    toast('Lembrete enviado pela Bruna', estado.modo === 'demo' ? 'Demonstração: nada foi enviado de verdade.' : (r.acao && r.acao.modoTeste ? `Modo teste: foi para o número de teste, não para ${primeiroNome(a.cliente)}.` : `${primeiroNome(a.cliente)} recebeu a mensagem no WhatsApp.`), 'ok');
  } else {
    toast(!a.clienteAvisado ? 'Cliente marcado como avisado' : 'Marcação removida', '', 'ok');
  }
  render(false);
}

async function verificarAgora() {
  const bt = $('#bt-verificar');
  bt.disabled = true; bt.innerHTML = `${ic('atualizar', 'girando')}<span>Verificando…</span>`;
  estado.ocupado = true;
  const r = await chamar('verificar').catch(() => null);
  estado.ocupado = false;
  pintarBotoesFixos(); bt.disabled = false;
  if (!r || !r.ok) { toast('O motor não respondeu', 'Tente de novo em instantes.', 'alerta'); return; }
  estado.dados = r;
  const v = r.verificacao || {};
  if (estado.modo === 'demo') toast('Radar conferido', 'Demonstração: todos os avisos já estão em dia.', 'ok');
  else if (!v.ok) toast('Verificação com problema', v.erro || '', 'alerta');
  else if (v.enviados) toast(`${v.enviados} ${plural(v.enviados, 'aviso enviado', 'avisos enviados')}`, v.canal || '', 'ok');
  else if (v.pendentes) toast('Avisos pendentes', v.detalhes || 'O envio falhou; o motor tenta de novo na próxima hora.', 'alerta');
  else toast('Tudo em dia', `${v.verificadas || 0} audiências conferidas. Nenhum aviso pendente.`, 'ok');
  render(false);
}

function toast(titulo, sub, tipo) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${ic(tipo === 'alerta' ? 'alerta' : 'check')}<div>${esc(titulo)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('saindo'); setTimeout(() => el.remove(), 380); }, 4200);
}

/* ============================================================
   Navegação e eventos
   ============================================================ */
function irPara(aba) {
  if (aba === estado.aba) return;
  estado.aba = aba;
  $$('.abas button').forEach(b => b.setAttribute('aria-current', b.dataset.aba === aba ? 'page' : 'false'));
  posicionarIndicador();
  render(true);
  try { history.replaceState(null, '', aba === 'geral' ? location.pathname : '#' + aba); } catch (e) { /* ok */ }
  window.scrollTo({ top: 0, behavior: reduzido ? 'auto' : 'smooth' });
}

function posicionarIndicador() {
  const ativo = $(`.abas button[data-aba="${estado.aba}"]`), ind = $('.abas-indicador');
  if (!ativo || !ind) return;
  ind.style.width = ativo.offsetWidth + 'px';
  ind.style.transform = `translateX(${ativo.offsetLeft}px)`;
}

function alternarTema() {
  const escuro = !temaEscuro();
  document.documentElement.dataset.theme = escuro ? 'dark' : 'light';
  try { localStorage.setItem('radar-tema', escuro ? 'escuro' : 'claro'); } catch (e) { /* ok */ }
  pintarBotaoTema();
  if (estado.abertura) estado.abertura.tema(escuro);
}

document.addEventListener('click', ev => {
  const t = ev.target.closest('button, [data-abrir], [data-ir], [data-sair], a[href="#"]');
  if (!t) return;
  if (t.matches('[data-sair]')) { ev.preventDefault(); esquecerPin(); location.reload(); return; }
  if (t.id === 'bt-tema') return alternarTema();
  if (t.id === 'bt-verificar') return verificarAgora();
  if (t.id === 'bt-nova') return abrirFormulario(null);
  if (t.id === 'status-motor') {
    const d = estado.dados || {};
    const u = d.motor && d.motor.ultimaVerificacao;
    if (estado.modo === 'demo') toast('Demonstração', 'Ligado ao motor da planilha, aqui aparece a hora da última verificação.', 'ok');
    else toast(d.motor && d.motor.gatilhoAtivo ? 'Motor ativo' : 'Motor desligado', u && u.quando ? `Última verificação ${relativo(u.quando)} · confere de hora em hora` : 'Ainda sem verificação registrada.', d.motor && d.motor.gatilhoAtivo ? 'ok' : 'alerta');
    return;
  }
  if (t.dataset.aba) return irPara(t.dataset.aba);
  if (t.dataset.ir) return irPara(t.dataset.ir);
  if (t.dataset.filtro) { estado.filtro = t.dataset.filtro; return render(false); }
  if (t.dataset.situacao) {
    const id = t.dataset.id, situacao = t.dataset.situacao;
    chamar('situacao', { id, situacao }).then(r => {
      if (!r.ok) { toast('Não deu certo', r.mensagem || '', 'alerta'); return; }
      estado.dados = r; toast('Situação atualizada', `${situacao} · já está na planilha${estado.modo === 'demo' ? ' (demonstração)' : ''}.`, 'ok'); render(false);
    });
    return;
  }
  if (t.dataset.acao) { ev.stopPropagation(); return executar(t.dataset.acao, t.dataset.id, t); }
  if (t.matches('[data-fechar]')) return fecharDetalhe();
  if (t.matches('[data-fechar-modal]')) return $('#modal').close();
  if (t.dataset.abrir) return abrirDetalhe(t.dataset.abrir);
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && estado.detalhe) fecharDetalhe();
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('[data-abrir][role="button"]')) { ev.preventDefault(); abrirDetalhe(ev.target.dataset.abrir); }
});
document.addEventListener('input', ev => {
  if (ev.target.id === 'busca') {
    estado.busca = ev.target.value;
    const pos = ev.target.selectionStart;
    render(false);
    const b = $('#busca'); if (b) { b.focus(); try { b.setSelectionRange(pos, pos); } catch (e) { /* ok */ } }
  }
});
$('#gaveta-fundo').addEventListener('click', fecharDetalhe);
window.addEventListener('resize', posicionarIndicador);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!document.documentElement.dataset.theme) pintarBotaoTema(); });

iniciar();
