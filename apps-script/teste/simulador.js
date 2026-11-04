/*
 * Simulador local do motor (Radar.gs) — roda no Node, sem Google.
 * Cria uma planilha falsa com audiências fictícias, finge o Make e confere
 * se o motor escolhe os avisos certos, não repete aviso e responde ao painel.
 *
 *   node apps-script/teste/simulador.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const TZ = 'America/Sao_Paulo';
const AGORA = new Date(process.env.RADAR_AGORA || '2026-11-04T09:05:00-03:00');

/* ---------- Utilidades de data no fuso de São Paulo ---------- */
function partes(date, tz) {
  const p = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(date).forEach(x => { p[x.type] = x.value; });
  const nome = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(date).find(x => x.type === 'timeZoneName').value;
  const m = nome.match(/GMT([+-]\d{2}):?(\d{2})?/);
  p.off = m ? m[1] + ':' + (m[2] || '00') : '+00:00';
  return p;
}
function formatDate(date, tz, padrao) {
  const p = partes(date, tz);
  return padrao.replace(/yyyy|MM|dd|HH|mm|ss|XXX/g, t => ({ yyyy: p.year, MM: p.month, dd: p.day, HH: p.hour, mm: p.minute, ss: p.second, XXX: p.off })[t]);
}
const dia = iso => new Date(iso + 'T00:00:00-03:00');
// as datas precisam nascer no mesmo "mundo" do motor (instanceof Date)
const serialParaData = n => new sandbox.Date(Date.UTC(1899, 11, 30) + n * 86400000 + 3 * 3600000);

/* ---------- Planilha falsa ---------- */
class Faixa {
  constructor(aba, r, c, nr, nc) { Object.assign(this, { aba, r, c, nr: nr || 1, nc: nc || 1 }); }
  _mapa(fn) { const out = []; for (let i = 0; i < this.nr; i++) { const l = []; for (let j = 0; j < this.nc; j++) l.push(fn(this.r + i, this.c + j)); out.push(l); } return out; }
  getValues() { return this._mapa((r, c) => this.aba.valor(r, c)); }
  getDisplayValues() { return this._mapa((r, c) => this.aba.exibir(r, c)); }
  getValue() { return this.aba.valor(this.r, this.c); }
  setValues(v) { v.forEach((l, i) => l.forEach((x, j) => this.aba.escrever(this.r + i, this.c + j, x))); return this; }
  setValue(x) { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.aba.escrever(this.r + i, this.c + j, x); return this; }
  getFormula() { return this.aba.formulas[this.r + ':' + this.c] || ''; }
  copyTo(alvo) { const f = this.getFormula(); if (f) alvo.aba.formulas[alvo.r + ':' + alvo.c] = f; }
  getRow() { return this.r; } getColumn() { return this.c; } getNumRows() { return this.nr; } getNumColumns() { return this.nc; }
  getLastRow() { return this.r + this.nr - 1; } getSheet() { return this.aba; }
}
['setBackground', 'setFontColor', 'setFontWeight', 'setFontSize', 'setFontFamily', 'setVerticalAlignment', 'setWrap', 'setNumberFormat']
  .forEach(m => { Faixa.prototype[m] = function () { return this; }; });

class Aba {
  constructor(nome, linhas, colunasData, colunaHora) {
    this.nome = nome; this.linhas = linhas.map(l => l.slice()); this.formulas = {};
    this.colunasData = colunasData || []; this.colunaHora = colunaHora; this.maxLinhas = Math.max(60, linhas.length + 20);
  }
  getName() { return this.nome; }
  getRange(r, c, nr, nc) { return new Faixa(this, r, c, nr, nc); }
  valor(r, c) {
    const v = (this.linhas[r - 1] || [])[c - 1];
    if (v === undefined || v === null) return '';
    if (typeof v === 'number' && this.colunasData.includes(c) && v > 20000) return serialParaData(v);
    if (typeof v === 'number' && c === this.colunaHora && v < 1) return new sandbox.Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return v;
  }
  exibir(r, c) {
    const bruto = (this.linhas[r - 1] || [])[c - 1];
    if (bruto === undefined || bruto === null) return '';
    if (c === this.colunaHora && typeof bruto === 'number') { const m = Math.round(bruto * 1440); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
    const v = this.valor(r, c);
    if (v instanceof Date) return formatDate(v, TZ, 'dd/MM/yyyy');
    return String(v);
  }
  escrever(r, c, x) { while (this.linhas.length < r) this.linhas.push([]); this.linhas[r - 1][c - 1] = x; }
  getLastRow() { for (let i = this.linhas.length; i > 0; i--) if ((this.linhas[i - 1] || []).some(v => v !== '' && v !== undefined && v !== null && v !== false)) return i; return 0; }
  getLastColumn() { return Math.max(...this.linhas.map(l => l.length)); }
  getMaxRows() { return Math.max(this.maxLinhas, this.linhas.length); }
  getMaxColumns() { return this.getLastColumn(); }
  insertRowsAfter(depois, n) { const vazias = Array.from({ length: n }, () => []); this.linhas.splice(depois, 0, ...vazias); this.maxLinhas += n; }
  setRowHeights() { return this; }
  getActiveRange() { return new Faixa(this, 7, 1); }
}

/* ---------- Dados fictícios (mesma estrutura da planilha) ---------- */
const TEL = '(11) 90000-0000';
const cab = ['ID', 'Cliente', 'WhatsApp do cliente', 'Processo (CNJ)', 'Data', 'Horário', 'Tipo', 'Vara / Local', 'Link da sala (online)', 'Advogado(a)', 'Situação', 'Faltam', 'Radar', 'Avisos enviados', 'Cliente avisado?', 'Observações'];
const linha = (id, nome, iso, hora, situacao, avisado, link) => {
  const [h, m] = hora.split(':').map(Number);
  return [id, nome, TEL, '0758369-57.2025.5.02.0011', Math.round((dia(iso) - Date.UTC(1899, 11, 30)) / 86400000), (h * 60 + m) / 1440, 'Una', '11ª Vara do Trabalho de São Paulo', link || '', 'Dra. Exemplo', situacao, '', '', '', avisado, ''];
};
const abaAud = new Aba('Audiências', [
  ['', '', 'Radar de Audiências'], [''], ['COMO USAR'], [''], cab,
  linha('AUD-0001', 'Cliente Encerrada', '2026-10-28', '10:00', 'Realizada', true),
  linha('AUD-0002', 'Cliente Hoje', '2026-11-04', '09:30', 'Agendada', false, 'https://sala.exemplo.com/a'),
  linha('AUD-0003', 'Cliente Amanha', '2026-11-05', '14:00', 'Agendada', false),
  linha('AUD-0004', 'Cliente Sexta', '2026-11-06', '10:00', 'Agendada', true),
  linha('AUD-0005', 'Cliente Segunda', '2026-11-09', '13:30', 'Agendada', false),
  linha('AUD-0006', 'Cliente Terca', '2026-11-10', '15:00', 'Remarcada', false),
  linha('AUD-0007', 'Cliente Cancelada', '2026-11-05', '10:30', 'Cancelada', false)
], [5], 6);
abaAud.formulas['6:12'] = '=IF($E6="";"";"…")';
abaAud.formulas['6:13'] = '=IF($E6="";"";"…")';

const cfgLinhas = [
  ['Configurações do Radar'], [''], [''], ['Configuração', 'Valor'], ['QUEM RECEBE OS AVISOS'],
  ['Nome do escritório', 'Diferencial Soluções'], ['E-mail(s) do escritório', 'escritorio@exemplo.com'], ['WhatsApp do escritório', '(11) 90000-0001'],
  ['QUANDO AVISAR'], ['1º aviso — dias antes', '3'], ['2º aviso — dias antes', '1'], ['Contar os dias como', 'Dias úteis'],
  ['Enviar a partir de', '08:00'], ['Enviar até', '19:00'], ['COMO ENVIAR'], ['Enviar pelo Make (WhatsApp + e-mail)', 'Sim'],
  ['Webhook do Make', 'https://hook.exemplo.com/radar'], ['E-mail de reserva pelo Google', 'Sim'], ['Lembrar o cliente pela Bruna', 'Não'],
  ['Modo teste', 'Sim'], ['Número de teste', '(11) 90000-0002'], ['PAINEL E SEGURANÇA'], ['PIN do painel', '123456'],
  ['Chave de integração', 'chave-teste'], ['Endereço do painel', 'https://painel.exemplo.com'], ['STATUS DO MOTOR'],
  ['Situação', ''], ['Última verificação', ''], ['Próxima verificação', ''], ['Versão do motor', '']
];
const abaCfg = new Aba('Configurações', cfgLinhas, [], null);
const feriados = new Aba('_feriados', [[Math.round((dia('2026-11-20') - Date.UTC(1899, 11, 30)) / 86400000)]], [1], null);
const abaHist = new Aba('Histórico de avisos', [['Histórico de avisos'], [''], ['Quando', 'ID', 'Cliente', 'Audiência', 'Aviso', 'Canal', 'Resultado', 'Detalhes']], [], null);

const planilha = {
  getSheetByName: n => ({ 'Audiências': abaAud, 'Configurações': abaCfg, 'Histórico de avisos': abaHist })[n] || null,
  getRangeByName: n => n === 'Feriados' ? feriados.getRange(1, 1, 1, 1) : null,
  getSpreadsheetTimeZone: () => TZ, setSpreadsheetTimeZone: () => {}, getUrl: () => 'https://planilha.exemplo.com', getId: () => 'id-teste',
  toast: (m) => { registros.toasts.push(m); }, getActiveSheet: () => abaAud
};

/* ---------- Serviços do Google (falsos) ---------- */
const registros = { make: [], emails: [], toasts: [] };
let makeResponde = { codigo: 200, corpo: '{"ok":true}' };
const props = () => { const d = {}; return { getProperties: () => Object.assign({}, d), getProperty: k => (k in d ? d[k] : null), setProperty: (k, v) => { d[k] = String(v); }, deleteProperty: k => { delete d[k]; } }; };
const docProps = props(), scriptProps = props();
const cache = {};
const sandbox = {
  console, JSON, Math, Date: class extends Date { constructor(...a) { if (a.length) super(...a); else super(AGORA.getTime() + (sandbox.__avanco || 0)); } static now() { return AGORA.getTime() + (sandbox.__avanco || 0); } },
  SpreadsheetApp: { getActive: () => planilha, getActiveSpreadsheet: () => planilha, openById: () => planilha, flush: () => {}, CopyPasteType: { PASTE_FORMULA: 'f' }, getUi: () => ({ createMenu: () => ({ addItem() { return this; }, addSeparator() { return this; }, addToUi() {} }), showModalDialog: () => {} }) },
  PropertiesService: { getDocumentProperties: () => docProps, getScriptProperties: () => scriptProps },
  LockService: { getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
  CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
  UrlFetchApp: { fetch: (url, op) => { registros.make.push(JSON.parse(op.payload)); return { getResponseCode: () => makeResponde.codigo, getContentText: () => makeResponde.corpo }; } },
  MailApp: { sendEmail: (o) => { registros.emails.push(o); } },
  Utilities: { formatDate, getUuid: () => '00000000-0000-0000-0000-000000000000' },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'dono@exemplo.com' }) },
  ScriptApp: { getProjectTriggers: () => [{ getHandlerFunction: () => 'verificacaoAutomatica' }], deleteTrigger: () => {}, newTrigger: () => ({ timeBased: () => ({ everyHours: () => ({ create: () => {} }) }) }), getService: () => ({ getUrl: () => '' }) },
  ContentService: { createTextOutput: t => ({ texto: t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  HtmlService: { createHtmlOutput: () => ({ setWidth() { return this; }, setHeight() { return this; } }) }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Radar.gs'), 'utf8'), sandbox, { filename: 'Radar.gs' });

/* ---------- Testes ---------- */
let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✓ ' + nome); };
console.log('\nRadar de Audiências — simulador (agora = ' + formatDate(AGORA, TZ, 'dd/MM HH:mm') + ')\n');

teste('lê a configuração por rótulo', () => {
  const c = sandbox.lerConfig_(planilha);
  assert.strictEqual(c.aviso1, 3); assert.strictEqual(c.aviso2, 1); assert.strictEqual(c.contagem, 'uteis');
  assert.strictEqual(c.whatsapp, '5511900000001'); assert.strictEqual(c.modoTeste, true); assert.strictEqual(c.pin, '123456');
});

teste('conta dias úteis pulando fim de semana e feriado', () => {
  const f = { '2026-11-20': true };
  assert.strictEqual(sandbox.diasUteis_('2026-11-04', '2026-11-09', f), 3);   // qui, sex, seg
  assert.strictEqual(sandbox.diasUteis_('2026-11-19', '2026-11-23', f), 1);   // sex 20 é feriado
  assert.strictEqual(sandbox.diasUteis_('2026-11-04', '2026-11-04', f), 0);
});

teste('decodifica o número CNJ', () => {
  assert.strictEqual(sandbox.decodificarCnj_('0758369-57.2025.5.02.0011'), 'TRT-2');
  assert.strictEqual(sandbox.decodificarCnj_('1234567-89.2024.8.26.0100'), 'TJ');
});

let primeira;
teste('primeira verificação avisa só o que está na zona de alerta', () => {
  primeira = sandbox.verificarAudiencias({ manual: false });
  assert.strictEqual(primeira.ok, true, primeira.erro);
  const ids = registros.make[0].avisos.map(a => a.id).sort();
  assert.deepStrictEqual(ids, ['AUD-0002', 'AUD-0003', 'AUD-0004', 'AUD-0005']);
  const rot = Object.fromEntries(registros.make[0].avisos.map(a => [a.id, a.rotulo]));
  assert.strictEqual(rot['AUD-0002'], 'É hoje'); assert.strictEqual(rot['AUD-0003'], 'Amanhã');
  assert.strictEqual(rot['AUD-0004'], 'Faltam 2 dias úteis'); assert.strictEqual(rot['AUD-0005'], 'Faltam 3 dias úteis');
  assert.strictEqual(registros.make[0].whatsapp_escritorio, '5511900000002', 'modo teste manda para o número de teste');
  assert.ok(registros.make[0].mensagem_whatsapp_json.includes('\\n'), 'mensagem escapada para JSON');
  assert.strictEqual(registros.emails.length, 0, 'Make confirmou: sem e-mail de reserva');
});

teste('payload montado no Make vira JSON válido', () => {
  const p = registros.make[0];
  const corpo = '{"phone":"' + p.whatsapp_escritorio + '","message":"' + p.mensagem_whatsapp_json + '"}';
  const lido = JSON.parse(corpo);
  assert.strictEqual(lido.message, p.mensagem_whatsapp);
});

teste('registra histórico e coluna "Avisos enviados"', () => {
  assert.strictEqual(abaHist.valor(4, 7), 'Enviado');
  const n = abaAud.exibir(7, 14);
  assert.ok(n.startsWith('✓ É hoje'), n);
});

teste('segunda verificação não repete aviso', () => {
  const r = sandbox.verificarAudiencias({ manual: false });
  assert.strictEqual(r.pendentes, 0); assert.strictEqual(registros.make.length, 1);
});

teste('no dia seguinte manda a véspera de quem tinha recebido o aviso de 3 dias', () => {
  sandbox.__avanco = 86400000;  // quinta 05/11 09:05
  const r = sandbox.verificarAudiencias({ manual: false });
  const ids = registros.make[1].avisos.map(a => a.id + ':' + a.rotulo).sort();
  assert.deepStrictEqual(ids, ['AUD-0004:Amanhã', 'AUD-0006:Faltam 3 dias úteis']);
  assert.strictEqual(r.enviados, 2);
});

teste('fora do horário, segura os avisos (a não ser no modo manual)', () => {
  sandbox.__avanco = 86400000 * 4 + 13 * 3600000;  // segunda 09/11 22:05
  abaAud.escrever(12, 5, Math.round((dia('2026-11-10') - Date.UTC(1899, 11, 30)) / 86400000));
  const antes = registros.make.length;
  const r = sandbox.verificarAudiencias({ manual: false });
  assert.strictEqual(r.foraDaJanela, true); assert.strictEqual(registros.make.length, antes);
});

teste('se o Make não confirma, manda e-mail de reserva', () => {
  makeResponde = { codigo: 200, corpo: 'Accepted' };
  const r = sandbox.verificarAudiencias({ manual: true });
  assert.ok(r.enviados >= 1, JSON.stringify(r));
  assert.strictEqual(registros.emails.length, 1);
  assert.strictEqual(r.canal, 'E-mail de reserva (Google)');
  makeResponde = { codigo: 200, corpo: '{"ok":true}' };
});

teste('API: recusa chave errada e PIN errado', () => {
  assert.strictEqual(sandbox.atenderApi_({ token: 'x', acao: 'painel' }).erro, 'nao_autorizado');
  assert.strictEqual(sandbox.atenderApi_({ token: 'chave-teste', pin: '000', acao: 'painel' }).erro, 'pin_invalido');
});

teste('API: devolve o painel com audiências e histórico', () => {
  const p = sandbox.atenderApi_({ token: 'chave-teste', pin: '123456', acao: 'painel' });
  assert.strictEqual(p.ok, true); assert.ok(p.audiencias.length >= 7); assert.ok(p.historico.length >= 1);
  const hoje = p.audiencias.find(a => a.id === 'AUD-0002');
  assert.strictEqual(hoje.hora, '09:30'); assert.strictEqual(hoje.data, '2026-11-04'); assert.ok(hoje.avisos.length >= 1);
});

teste('API: cadastra audiência nova com ID e fórmulas', () => {
  const r = sandbox.atenderApi_({ token: 'chave-teste', pin: '123456', acao: 'salvar', audiencia: { cliente: '=HACK()', data: '2026-11-30', hora: '11:15', tipo: 'Instrução' } });
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  const nova = r.audiencias.find(a => a.id === r.acao.id);
  assert.strictEqual(nova.cliente, "'=HACK()", 'fórmula neutralizada');
  assert.strictEqual(nova.data, '2026-11-30'); assert.strictEqual(nova.hora, '11:15');
  assert.ok(abaAud.formulas[nova.linha + ':12'], 'fórmula copiada para a linha nova');
});

teste('API: lembra o cliente pela Bruna (modo teste → número de teste)', () => {
  const r = sandbox.atenderApi_({ token: 'chave-teste', pin: '123456', acao: 'avisarCliente', id: 'AUD-0005' });
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  const ult = registros.make[registros.make.length - 1];
  assert.strictEqual(ult.evento, 'aviso_cliente'); assert.strictEqual(ult.clientes[0].whatsapp, '5511900000002');
  assert.strictEqual(ult.emails_texto, ''); assert.strictEqual(ult.whatsapp_escritorio, '');
  assert.strictEqual(r.audiencias.find(a => a.id === 'AUD-0005').clienteAvisado, true);
});

teste('bloqueia depois de muitas tentativas de PIN', () => {
  for (let i = 0; i < 8; i++) sandbox.atenderApi_({ token: 'chave-teste', pin: 'errado', acao: 'painel' });
  assert.strictEqual(sandbox.atenderApi_({ token: 'chave-teste', pin: '123456', acao: 'painel' }).erro, 'bloqueado');
});

console.log('\n' + ok + ' testes passaram.\n');
