/**
 * ============================================================
 *  RADAR DE AUDIÊNCIAS — motor da planilha
 *  Diferencial Soluções
 * ============================================================
 *
 *  O que este motor faz
 *  --------------------
 *  • Confere a aba "Audiências" de hora em hora.
 *  • Avisa o escritório X dias antes de cada audiência (padrão: 3 dias úteis)
 *    e de novo na véspera — sem repetir aviso já enviado.
 *  • Entrega pelo Make (WhatsApp da Bruna + Gmail). Se o Make não confirmar,
 *    manda um e-mail de reserva pelo próprio Google.
 *  • Registra tudo na aba "Histórico de avisos".
 *  • Responde ao painel web (lista, verificar agora, nova audiência,
 *    marcar cliente avisado, lembrar o cliente pela Bruna).
 *
 *  Como instalar (uma vez só)
 *  --------------------------
 *  1. Na planilha: Extensões → Apps Script.
 *  2. Apague o conteúdo do arquivo Código.gs, cole este arquivo inteiro e salve.
 *  3. Escolha a função "instalarRadar" e clique em Executar. Autorize.
 *  4. (Painel) Implantar → Nova implantação → Tipo "App da Web"
 *     → Executar como: Eu → Quem pode acessar: Qualquer pessoa → Implantar.
 *     Copie a URL que termina em /exec e coloque no painel (variável RADAR_API_URL).
 *
 *  Todas as configurações ficam na aba "Configurações" da planilha.
 */

var RADAR = {
  versao: '1.0.0',
  fuso: 'America/Sao_Paulo',
  abas: {
    audiencias: 'Audiências',
    historico: 'Histórico de avisos',
    config: 'Configurações'
  },
  prefixoAviso: 'av|',
  historicoNoPainel: 60,
  maxFalhasPin: 8
};

var DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
var DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Cabeçalhos aceitos em cada coluna da aba Audiências (já normalizados). */
var COLUNAS = {
  id: ['id'],
  cliente: ['cliente', 'nome', 'nome do cliente'],
  whatsapp: ['whatsapp do cliente', 'whatsapp', 'telefone', 'celular'],
  processo: ['processo cnj', 'processo', 'numero do processo', 'n do processo'],
  data: ['data', 'data da audiencia'],
  hora: ['horario', 'hora'],
  tipo: ['tipo', 'tipo de audiencia'],
  local: ['vara local', 'vara', 'local', 'vara forum'],
  link: ['link da sala online', 'link da sala', 'link'],
  advogado: ['advogado a', 'advogado', 'advogada', 'responsavel'],
  situacao: ['situacao', 'status'],
  faltam: ['faltam'],
  radar: ['radar'],
  avisos: ['avisos enviados', 'avisos'],
  clienteAvisado: ['cliente avisado', 'cliente avisado?'],
  observacoes: ['observacoes', 'obs', 'observacao']
};

/** Rótulos (normalizados) da aba Configurações. */
var CFG = {
  escritorio: 'nome do escritorio',
  emails: 'e mail s do escritorio',
  whatsapp: 'whatsapp do escritorio',
  aviso1: '1o aviso dias antes',
  aviso2: '2o aviso dias antes',
  contagem: 'contar os dias como',
  inicio: 'enviar a partir de',
  fim: 'enviar ate',
  usarMake: 'enviar pelo make whatsapp e mail',
  webhook: 'webhook do make',
  reserva: 'e mail de reserva pelo google',
  lembrarCliente: 'lembrar o cliente pela bruna',
  modoTeste: 'modo teste',
  numeroTeste: 'numero de teste',
  pin: 'pin do painel',
  chave: 'chave de integracao',
  painel: 'endereco do painel',
  status: 'situacao',
  ultima: 'ultima verificacao',
  proxima: 'proxima verificacao',
  versao: 'versao do motor'
};

/* ============================================================
 *  MENU, INSTALAÇÃO E GATILHOS
 * ============================================================ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📡 Radar')
    .addItem('Verificar agora', 'verificarAgoraMenu')
    .addItem('Enviar aviso de teste', 'enviarAvisoTesteMenu')
    .addItem('Reenviar avisos da linha selecionada', 'reenviarLinhaSelecionada')
    .addItem('Abrir o painel', 'abrirPainel')
    .addSeparator()
    .addItem('Instalar / reparar o Radar', 'instalarRadar')
    .addItem('Desligar o Radar', 'desligarRadar')
    .addToUi();
}

function instalarRadar() {
  var ss = SpreadsheetApp.getActive();
  if (ss.getSpreadsheetTimeZone() !== RADAR.fuso) ss.setSpreadsheetTimeZone(RADAR.fuso);
  PropertiesService.getScriptProperties().setProperty('planilhaId', ss.getId());

  removerGatilhos_();
  ScriptApp.newTrigger('verificacaoAutomatica').timeBased().everyHours(1).create();

  var cfg = lerConfig_(ss);
  if (!cfg.chave) {
    escreverConfig_(ss, CFG.chave, Utilities.getUuid().replace(/-/g, ''));
    cfg = lerConfig_(ss);
  }
  var ids = atribuirIdsFaltando_(ss);
  escreverConfig_(ss, CFG.status, '✅ Ativo — confere a planilha de hora em hora');
  escreverConfig_(ss, CFG.proxima, 'por volta de ' + formatarHora_(new Date(Date.now() + 3600000)));
  escreverConfig_(ss, CFG.versao, RADAR.versao);

  registrarHistorico_(ss, [{
    quando: new Date(), id: '—', cliente: '—', audiencia: '—',
    aviso: 'Motor instalado', canal: '—', resultado: 'OK',
    detalhes: 'Gatilho de hora em hora criado.' + (ids ? ' ' + ids + ' ID(s) preenchido(s).' : '')
  }]);

  mostrarDialogoInstalacao_(cfg);
}

function verificacaoAutomatica() {
  verificarAudiencias({ manual: false });
}

function desligarRadar() {
  removerGatilhos_();
  var ss = SpreadsheetApp.getActive();
  escreverConfig_(ss, CFG.status, '⏸ Desligado — use o menu Radar → Instalar para religar');
  escreverConfig_(ss, CFG.proxima, '—');
  ss.toast('Radar desligado. Nenhum aviso automático será enviado.', 'Radar de Audiências', 6);
}

function removerGatilhos_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'verificacaoAutomatica' || f === 'verificarAudiencias') ScriptApp.deleteTrigger(t);
  });
}

function gatilhoAtivo_() {
  return ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'verificacaoAutomatica';
  });
}

/* ============================================================
 *  VERIFICAÇÃO — o coração do Radar
 * ============================================================ */

/**
 * Confere todas as audiências e envia os avisos pendentes.
 * @param {{manual?: boolean, ids?: string[]}} opcoes
 */
function verificarAudiencias(opcoes) {
  opcoes = opcoes || {};
  var manual = opcoes.manual === true;
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(25000)) return { ok: false, erro: 'Outra verificação está em andamento. Tente de novo em instantes.' };

  try {
    var ctx = carregarContexto_();
    var agora = new Date();
    var pendentes = [];

    ctx.audiencias.forEach(function (a) {
      if (opcoes.ids && opcoes.ids.indexOf(a.id) < 0) return;
      var p = avisoPendente_(a, ctx);
      if (p) pendentes.push({ aud: a, estagio: p.estagio, rotulo: p.rotulo, cobre: p.cobre });
    });

    var resultado = {
      ok: true,
      quando: agora.toISOString(),
      manual: manual,
      verificadas: ctx.audiencias.length,
      pendentes: pendentes.length,
      enviados: 0,
      foraDaJanela: false,
      canal: null,
      detalhes: ''
    };

    if (pendentes.length && !manual && !dentroDaJanela_(agora, ctx.config)) {
      resultado.foraDaJanela = true;
      resultado.detalhes = 'Fora do horário de envio — os avisos saem a partir de ' + ctx.config.inicio + '.';
    } else if (pendentes.length) {
      pendentes.sort(function (x, y) { return x.aud.inicioMs - y.aud.inicioMs; });
      var envio = entregar_(montarLoteEscritorio_(pendentes, ctx), ctx);
      resultado.canal = envio.canal;
      resultado.detalhes = envio.resumo;

      if (envio.ok) {
        resultado.enviados = pendentes.length;
        var props = PropertiesService.getDocumentProperties();
        pendentes.forEach(function (p) {
          var registro = JSON.stringify({ q: agora.toISOString(), c: envio.canalCurto, r: p.rotulo });
          props.setProperty(chaveAviso_(p.aud, p.estagio), registro);
          (p.cobre || []).forEach(function (e) { props.setProperty(chaveAviso_(p.aud, e), registro); });
        });
        ctx.avisos = lerAvisos_();
      }

      registrarHistorico_(ctx.ss, pendentes.map(function (p) {
        return {
          quando: agora,
          id: p.aud.id,
          cliente: p.aud.cliente,
          audiencia: p.aud.dataCurta + ' ' + p.aud.hora,
          aviso: p.rotulo,
          canal: envio.canal,
          resultado: envio.ok ? 'Enviado' : 'Falhou — tenta de novo na próxima hora',
          detalhes: envio.resumo
        };
      }));
    }

    atualizarColunaAvisos_(ctx);
    atualizarStatus_(ctx, resultado);
    if (Math.random() < 0.15) limparAvisosAntigos_(ctx);
    return resultado;
  } catch (erro) {
    console.error(erro);
    return { ok: false, erro: String(erro && erro.message || erro) };
  } finally {
    lock.releaseLock();
  }
}

/** Decide se a audiência tem aviso para sair agora. */
function avisoPendente_(a, ctx) {
  if (!a.ativa || !a.dataISO || a.diasCorridos < 0) return null;
  if (a.inicioMs && a.inicioMs < Date.now() - 3600000) return null;

  var cfg = ctx.config;
  var dias = cfg.contagem === 'corridos' ? a.diasCorridos : a.diasUteis;
  var enviado1 = !!ctx.avisos[chaveAviso_(a, 1)];
  var enviado2 = !!ctx.avisos[chaveAviso_(a, 2)];

  if (cfg.aviso2 > 0 && dias <= cfg.aviso2 && !enviado2) {
    var rotulo = a.diasCorridos === 0 ? 'É hoje' : (a.diasCorridos === 1 ? 'Amanhã' : 'Próximo dia útil');
    return { estagio: 2, rotulo: rotulo, cobre: enviado1 ? [] : [1] };
  }
  if (cfg.aviso1 > 0 && dias <= cfg.aviso1 && !enviado1 && !enviado2) {
    var unidade = cfg.contagem === 'corridos' ? (dias === 1 ? ' dia' : ' dias') : (dias === 1 ? ' dia útil' : ' dias úteis');
    return { estagio: 1, rotulo: a.diasCorridos === 0 ? 'É hoje' : 'Faltam ' + dias + unidade, cobre: [] };
  }
  return null;
}

function dentroDaJanela_(agora, cfg) {
  var hm = Utilities.formatDate(agora, RADAR.fuso, 'HH:mm');
  return hm >= cfg.inicio && hm <= cfg.fim;
}

function chaveAviso_(a, estagio) {
  return RADAR.prefixoAviso + a.id + '|' + a.dataISO.replace(/-/g, '') + '|' + estagio;
}

function lerAvisos_() {
  var todas = PropertiesService.getDocumentProperties().getProperties();
  var avisos = {};
  Object.keys(todas).forEach(function (k) {
    if (k.indexOf(RADAR.prefixoAviso) === 0) avisos[k] = todas[k];
  });
  return avisos;
}

function avisosDaAudiencia_(a, avisos) {
  var lista = [];
  [1, 2].forEach(function (e) {
    var bruto = avisos[chaveAviso_(a, e)];
    if (!bruto) return;
    var r = tentarJSON_(bruto) || {};
    lista.push({ estagio: e, rotulo: r.r || (e === 1 ? '1º aviso' : 'Véspera'), quando: r.q || '', canal: r.c || '' });
  });
  // um mesmo envio pode cobrir os dois estágios: mostra só uma vez
  if (lista.length === 2 && lista[0].quando === lista[1].quando) lista = [lista[1]];
  return lista;
}

/** Reescreve a coluna "Avisos enviados" a partir do registro interno. */
function atualizarColunaAvisos_(ctx) {
  var col = ctx.mapa.col.avisos;
  if (col == null || !ctx.audiencias.length) return;
  var sh = ctx.abaAudiencias;
  var primeira = ctx.mapa.linhaCabecalho + 1;
  var total = ctx.ultimaLinha - ctx.mapa.linhaCabecalho;
  if (total <= 0) return;
  var atuais = sh.getRange(primeira, col + 1, total, 1).getValues();
  var novos = atuais.map(function (l) { return [l[0]]; });
  var mudou = false;
  ctx.audiencias.forEach(function (a) {
    var texto = avisosDaAudiencia_(a, ctx.avisos).map(function (v) {
      return '✓ ' + v.rotulo + ' · ' + formatarDataHoraCurta_(new Date(v.quando)) + (v.canal ? ' (' + v.canal + ')' : '');
    }).join('   ');
    var i = a.linha - primeira;
    if (novos[i][0] !== texto) { novos[i][0] = texto; mudou = true; }
  });
  if (mudou) sh.getRange(primeira, col + 1, total, 1).setValues(novos);
}

function limparAvisosAntigos_(ctx) {
  var props = PropertiesService.getDocumentProperties();
  var limite = isoDeData_(new Date(Date.now() - 90 * 86400000)).replace(/-/g, '');
  Object.keys(ctx.avisos).forEach(function (k) {
    var partes = k.split('|');
    if (partes.length === 4 && partes[2] < limite) props.deleteProperty(k);
  });
}

function atualizarStatus_(ctx, r) {
  var ss = ctx.ss;
  var agora = new Date();
  var texto = formatarDataHoraCurta_(agora) + ' · ' + r.verificadas + ' audiência(s) conferida(s)';
  if (r.enviados) texto += ' · ' + r.enviados + ' aviso(s) enviado(s)';
  else if (r.foraDaJanela) texto += ' · avisos guardados para o horário de envio';
  else if (r.pendentes) texto += ' · envio falhou, nova tentativa na próxima hora';
  else texto += ' · nada pendente';
  escreverConfig_(ss, CFG.ultima, texto);
  escreverConfig_(ss, CFG.proxima, gatilhoAtivo_() ? 'por volta de ' + formatarHora_(new Date(agora.getTime() + 3600000)) : 'gatilho desligado');
  PropertiesService.getScriptProperties().setProperty('ultimaVerificacao', JSON.stringify({
    quando: agora.toISOString(), enviados: r.enviados, pendentes: r.pendentes, canal: r.canal, foraDaJanela: r.foraDaJanela
  }));
}

/* ============================================================
 *  MENSAGENS (WhatsApp e e-mail)
 * ============================================================ */

function montarLoteEscritorio_(pendentes, ctx) {
  var cfg = ctx.config;
  var n = pendentes.length;
  var titulo = n === 1 ? '1 audiência na zona de alerta' : n + ' audiências na zona de alerta';

  var linhas = ['📡 *Radar de Audiências* — ' + cfg.escritorio, titulo, ''];
  pendentes.forEach(function (p) {
    var a = p.aud;
    var icone = a.diasCorridos === 0 ? '🔴' : (p.estagio === 2 ? '🟠' : '🟡');
    linhas.push(icone + ' *' + p.rotulo.toUpperCase() + ' · ' + a.diaCurto + ' ' + a.dataCurta + ' às ' + a.hora + '*');
    linhas.push('👤 ' + a.cliente);
    linhas.push('⚖️ ' + [a.tipo, a.local].filter(String).join(' · '));
    if (a.link) linhas.push('🖥️ Telepresencial — ' + a.link);
    if (a.processo) linhas.push('📄 ' + a.processo);
    if (a.advogado) linhas.push('👩‍⚖️ ' + a.advogado);
    linhas.push('📱 Cliente: ' + (a.whatsappFmt || 'sem número') + (a.clienteAvisado ? ' · já avisado ✅' : ' · ainda não avisado'));
    linhas.push('');
  });
  var faltam = pendentes.filter(function (p) { return !p.aud.clienteAvisado; }).length;
  if (faltam) linhas.push('👉 ' + (faltam === 1 ? '1 cliente ainda não sabe.' : faltam + ' clientes ainda não sabem.') + ' Encaminhe ao grupo e avise.');
  if (cfg.painel) linhas.push('🔎 Painel: ' + cfg.painel);
  if (cfg.modoTeste) linhas.push('', '🧪 Modo teste ligado');

  var clientes = [];
  if (cfg.lembrarCliente) {
    pendentes.forEach(function (p) {
      if (p.estagio === 1 || (p.cobre && p.cobre.length)) {
        var c = loteCliente_(p.aud, ctx);
        if (c) clientes.push(c);
      }
    });
  }

  return {
    evento: 'aviso_escritorio',
    assunto: (n === 1 ? '⚖️ Audiência ' + pendentes[0].rotulo.toLowerCase() + ': ' + pendentes[0].aud.cliente
      : '⚖️ ' + titulo) + ' — ' + cfg.escritorio,
    titulo: titulo,
    mensagem: linhas.join('\n').trim(),
    html: emailEscritorio_(pendentes, titulo, ctx),
    avisos: pendentes.map(function (p) {
      return { id: p.aud.id, cliente: p.aud.cliente, data: p.aud.dataISO, hora: p.aud.hora, rotulo: p.rotulo, estagio: p.estagio };
    }),
    clientes: clientes
  };
}

function loteCliente_(a, ctx) {
  var destino = ctx.config.modoTeste ? ctx.config.numeroTeste : a.whatsappDigitos;
  if (!destino) return null;
  return { id: a.id, cliente: a.cliente, whatsapp: destino, mensagem: mensagemCliente_(a, ctx) };
}

function mensagemCliente_(a, ctx) {
  var primeiro = String(a.cliente || '').split(' ')[0];
  var online = !!a.link;
  var partes = [
    'Olá, ' + primeiro + '! Aqui é a Bruna, da ' + ctx.config.escritorio + ' 😊',
    '',
    'Passando para lembrar da sua audiência:',
    '🗓️ ' + a.diaSemana + ', ' + a.dataCurta + ' às ' + a.hora,
    '📍 ' + (a.local || 'local a confirmar') + (online ? ' (online)' : '')
  ];
  if (online) partes.push('🔗 Link da sala: ' + a.link);
  partes.push('');
  partes.push(online
    ? 'Entre na sala 15 minutos antes, com câmera e microfone funcionando e um documento com foto em mãos.'
    : 'Chegue com 30 minutos de antecedência e leve um documento com foto.');
  partes.push('Qualquer dúvida, é só responder por aqui.');
  return partes.join('\n');
}

function emailEscritorio_(pendentes, titulo, ctx) {
  var cfg = ctx.config;
  var cards = pendentes.map(function (p) {
    var a = p.aud;
    var cor = a.diasCorridos === 0 ? '#B4441C' : (p.estagio === 2 ? '#C7702E' : '#C9974F');
    var linhas = [];
    linhas.push(linhaEmail_('Quando', a.diaSemana + ', ' + a.dataCurta + ' às ' + a.hora));
    linhas.push(linhaEmail_('Tipo', a.tipo || '—'));
    linhas.push(linhaEmail_('Local', (a.local || '—') + (a.link ? ' · telepresencial' : '')));
    if (a.link) linhas.push(linhaEmail_('Sala', '<a href="' + esc_(a.link) + '" style="color:#6B3A1F">' + esc_(a.link) + '</a>', true));
    if (a.processo) linhas.push(linhaEmail_('Processo', '<span style="font-family:Menlo,Consolas,monospace;font-size:13px">' + esc_(a.processo) + '</span>' + (a.tribunal ? ' <span style="color:#9A7D6A">· ' + esc_(a.tribunal) + '</span>' : ''), true));
    if (a.advogado) linhas.push(linhaEmail_('Responsável', a.advogado));
    linhas.push(linhaEmail_('Cliente', (a.whatsappFmt ? '<a href="https://wa.me/' + a.whatsappDigitos + '" style="color:#6B3A1F">' + esc_(a.whatsappFmt) + '</a>' : 'sem número') +
      (a.clienteAvisado ? ' <span style="color:#3E7B4F">· já avisado ✓</span>' : ' <span style="color:#B4441C">· ainda não avisado</span>'), true));
    return '<div style="border:1px solid #E6DACB;border-left:5px solid ' + cor + ';border-radius:12px;padding:16px 18px;margin:0 0 14px;background:#FFFFFF">' +
      '<div style="display:inline-block;background:' + cor + ';color:#FFF8F0;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;padding:4px 9px;border-radius:999px;font-weight:700">' + esc_(p.rotulo) + '</div>' +
      '<div style="font-size:19px;color:#2A1508;font-weight:700;margin:10px 0 8px">' + esc_(a.cliente) + '</div>' +
      '<table style="width:100%;border-collapse:collapse">' + linhas.join('') + '</table></div>';
  }).join('');

  var botoes = '';
  if (cfg.painel) botoes += '<a href="' + esc_(cfg.painel) + '" style="display:inline-block;background:#6B3A1F;color:#F5EDE3;text-decoration:none;padding:11px 18px;border-radius:10px;font-size:14px;margin:0 8px 8px 0">Abrir o painel</a>';
  botoes += '<a href="' + esc_(ctx.ss.getUrl()) + '" style="display:inline-block;border:1px solid #6B3A1F;color:#6B3A1F;text-decoration:none;padding:10px 17px;border-radius:10px;font-size:14px;margin:0 0 8px 0">Abrir a planilha</a>';

  return '<div style="background:#EFE8DC;padding:28px 12px;font-family:Helvetica,Arial,sans-serif">' +
    '<div style="max-width:580px;margin:0 auto;background:#FBF8F3;border:1px solid #DCCFBF;border-radius:16px;overflow:hidden">' +
    '<div style="padding:26px 28px 18px;text-align:center;border-bottom:1px solid #E6DACB">' +
    '<div style="font-family:Optima,Candara,\'Trebuchet MS\',sans-serif;font-size:26px;letter-spacing:3px;color:#6B3A1F;font-weight:700">DIFERENCIAL</div>' +
    '<div style="display:inline-block;margin-top:6px;background:#6B3A1F;color:#F5EDE3;font-family:Optima,Candara,\'Trebuchet MS\',sans-serif;font-size:12px;letter-spacing:4px;padding:5px 14px;border-radius:6px">SOLUÇÕES</div></div>' +
    '<div style="padding:26px 28px">' +
    '<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9A7D6A">📡 Radar de Audiências</div>' +
    '<div style="font-size:24px;color:#2A1508;margin:6px 0 4px;font-weight:700">' + esc_(titulo) + '</div>' +
    '<div style="font-size:14px;color:#6B3A1F;margin-bottom:20px">Verificação de ' + esc_(formatarDataHoraLonga_(new Date())) + '. Confira e avise quem ainda não sabe.</div>' +
    cards +
    '<div style="margin-top:18px">' + botoes + '</div>' +
    (cfg.modoTeste ? '<div style="margin-top:16px;font-size:12px;color:#9A7D6A">🧪 Modo teste ligado: os WhatsApps vão só para o número de teste.</div>' : '') +
    '</div>' +
    '<div style="padding:16px 28px;background:#F3ECE2;border-top:1px solid #E6DACB;color:#9A7D6A;font-size:12px;text-align:center">Radar de Audiências · ' + esc_(cfg.escritorio) + ' · mensagem automática</div>' +
    '</div></div>';
}

function linhaEmail_(rotulo, valor, html) {
  return '<tr><td style="padding:5px 0;color:#9A7D6A;font-size:13px;width:110px;vertical-align:top">' + esc_(rotulo) + '</td>' +
    '<td style="padding:5px 0;color:#2A1508;font-size:14px">' + (html ? valor : esc_(valor)) + '</td></tr>';
}

/* ============================================================
 *  ENTREGA (Make → WhatsApp + Gmail; reserva pelo Google)
 * ============================================================ */

/**
 * Envia um lote ao Make. Se o Make não confirmar, manda o e-mail de reserva.
 * @return {{ok:boolean, canal:string, canalCurto:string, resumo:string}}
 */
function entregar_(lote, ctx, opcoes) {
  opcoes = opcoes || {};
  var cfg = ctx.config;
  var semEmail = opcoes.semEmail === true;
  var emails = cfg.emails.length ? cfg.emails : [emailDoDono_()].filter(String);
  var destinoEscritorio = cfg.modoTeste ? cfg.numeroTeste : cfg.whatsapp;
  var agora = new Date();

  var payload = {
    token: cfg.chave,
    evento: lote.evento,
    enviado_em: agora.toISOString(),
    enviado_em_epoch: Math.floor(agora.getTime() / 1000),
    escritorio: cfg.escritorio,
    modo_teste: cfg.modoTeste,
    whatsapp_escritorio: lote.mensagem ? destinoEscritorio : '',
    mensagem_whatsapp: lote.mensagem || '',
    mensagem_whatsapp_json: lote.mensagem ? jsonInterno_(lote.mensagem) : '',
    emails_texto: semEmail ? '' : emails.join(','),
    assunto: lote.assunto || '',
    html: semEmail ? '' : (lote.html || ''),
    quantidade: (lote.avisos || []).length,
    avisos: lote.avisos || [],
    clientes: (lote.clientes || []).map(function (c) {
      return { id: c.id, cliente: c.cliente, whatsapp: c.whatsapp, mensagem: c.mensagem, mensagem_json: jsonInterno_(c.mensagem) };
    }),
    tem_clientes: (lote.clientes || []).length > 0,
    painel_url: cfg.painel || '',
    planilha_url: ctx.ss.getUrl()
  };

  var make = 'desligado';
  var confirmado = false;
  if (cfg.usarMake && cfg.webhook) {
    try {
      var resp = UrlFetchApp.fetch(cfg.webhook, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      var codigo = resp.getResponseCode();
      var corpo = tentarJSON_(resp.getContentText());
      confirmado = codigo >= 200 && codigo < 300 && corpo && corpo.ok === true;
      make = confirmado ? 'confirmado' : (codigo >= 200 && codigo < 300 ? 'sem confirmação (cenário desligado?)' : 'erro HTTP ' + codigo);
    } catch (erro) {
      make = 'erro: ' + (erro && erro.message || erro);
    }
  }

  var email = 'não usado';
  if (!confirmado && cfg.reserva && !semEmail && payload.html && emails.length) {
    try {
      MailApp.sendEmail({
        to: emails.join(','),
        subject: payload.assunto,
        htmlBody: payload.html,
        name: 'Radar de Audiências · ' + cfg.escritorio
      });
      email = 'enviado';
    } catch (erro2) {
      email = 'erro: ' + (erro2 && erro2.message || erro2);
    }
  }

  var ok = confirmado || email === 'enviado';
  var canal = confirmado ? (semEmail ? 'WhatsApp (Bruna)' : 'WhatsApp + e-mail (Make)')
    : (email === 'enviado' ? 'E-mail de reserva (Google)' : 'Nenhum');
  var canalCurto = confirmado ? (semEmail ? 'WhatsApp' : 'WhatsApp + e-mail') : (email === 'enviado' ? 'e-mail' : '');
  return { ok: ok, canal: canal, canalCurto: canalCurto, resumo: 'Make: ' + make + ' · E-mail de reserva: ' + email };
}

/** Texto já escapado para entrar dentro de uma string JSON montada no Make. */
function jsonInterno_(texto) {
  return JSON.stringify(String(texto || '')).slice(1, -1);
}

function emailDoDono_() {
  try { return Session.getEffectiveUser().getEmail() || ''; } catch (e) { return ''; }
}

/* ============================================================
 *  AÇÕES DO MENU
 * ============================================================ */

function verificarAgoraMenu() {
  var r = verificarAudiencias({ manual: true });
  var ss = SpreadsheetApp.getActive();
  if (!r.ok) { ss.toast(r.erro, 'Radar de Audiências', 8); return; }
  var msg = r.enviados ? r.enviados + ' aviso(s) enviado(s) · ' + r.canal
    : (r.pendentes ? 'Não consegui enviar: ' + r.detalhes : 'Tudo em dia — nenhum aviso pendente.');
  ss.toast(msg, 'Radar de Audiências', 8);
}

function enviarAvisoTesteMenu() {
  var r = enviarAvisoTeste();
  SpreadsheetApp.getActive().toast(r.ok ? 'Teste enviado · ' + r.canal : 'Teste falhou · ' + r.resumo, 'Radar de Audiências', 10);
}

function enviarAvisoTeste() {
  var ctx = carregarContexto_();
  var cfg = ctx.config;
  var msg = [
    '✅ *Radar de Audiências conectado*',
    '',
    'Este é um aviso de teste da ' + cfg.escritorio + '.',
    'Quando uma audiência entrar na zona de alerta (' + cfg.aviso1 + (cfg.contagem === 'corridos' ? ' dias' : ' dias úteis') + ' antes), o resumo chega aqui.',
    cfg.painel ? '🔎 Painel: ' + cfg.painel : ''
  ].filter(function (l, i) { return l !== '' || i === 1; }).join('\n');
  var html = '<div style="background:#EFE8DC;padding:28px 12px;font-family:Helvetica,Arial,sans-serif"><div style="max-width:520px;margin:0 auto;background:#FBF8F3;border:1px solid #DCCFBF;border-radius:16px;padding:28px">' +
    '<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9A7D6A">📡 Radar de Audiências</div>' +
    '<div style="font-size:22px;color:#2A1508;margin:6px 0 10px;font-weight:700">Conexão funcionando ✅</div>' +
    '<div style="font-size:14px;color:#6B3A1F">Este é um e-mail de teste da ' + esc_(cfg.escritorio) + '. Os avisos de audiência chegarão neste formato.</div></div></div>';
  var r = entregar_({ evento: 'teste', assunto: '✅ Teste do Radar de Audiências — ' + cfg.escritorio, mensagem: msg, html: html, avisos: [], clientes: [] }, ctx);
  registrarHistorico_(ctx.ss, [{ quando: new Date(), id: '—', cliente: '—', audiencia: '—', aviso: 'Aviso de teste', canal: r.canal, resultado: r.ok ? 'Enviado' : 'Falhou', detalhes: r.resumo }]);
  return r;
}

function reenviarLinhaSelecionada() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getActiveSheet();
  if (sh.getName() !== RADAR.abas.audiencias) { ss.toast('Selecione uma linha na aba Audiências.', 'Radar', 6); return; }
  var ctx = carregarContexto_();
  var linha = sh.getActiveRange().getRow();
  var a = ctx.audiencias.filter(function (x) { return x.linha === linha; })[0];
  if (!a) { ss.toast('Essa linha não tem audiência.', 'Radar', 6); return; }
  apagarAvisos_(a);
  var r = verificarAudiencias({ manual: true, ids: [a.id] });
  ss.toast(r.enviados ? 'Aviso reenviado · ' + r.canal : 'Nada para enviar: a audiência não está na zona de alerta.', 'Radar', 8);
}

function apagarAvisos_(a) {
  var props = PropertiesService.getDocumentProperties();
  Object.keys(lerAvisos_()).forEach(function (k) {
    if (k.indexOf(RADAR.prefixoAviso + a.id + '|') === 0) props.deleteProperty(k);
  });
}

function abrirPainel() {
  var cfg = lerConfig_(SpreadsheetApp.getActive());
  if (!cfg.painel) { SpreadsheetApp.getActive().toast('Preencha "Endereço do painel" na aba Configurações.', 'Radar', 6); return; }
  var html = HtmlService.createHtmlOutput('<script>window.open(' + JSON.stringify(cfg.painel) + ',"_blank");google.script.host.close();</script>').setWidth(80).setHeight(40);
  SpreadsheetApp.getUi().showModalDialog(html, 'Abrindo o painel…');
}

function mostrarDialogoInstalacao_(cfg) {
  var urlWebApp = '';
  try { urlWebApp = ScriptApp.getService().getUrl() || ''; } catch (e) { urlWebApp = ''; }
  var passos = [
    ['✅', 'Gatilho criado', 'A planilha é conferida de hora em hora, todos os dias.'],
    ['✅', 'Configurações lidas', 'Aviso ' + cfg.aviso1 + (cfg.contagem === 'corridos' ? ' dias' : ' dias úteis') + ' antes' + (cfg.aviso2 ? ' e na véspera' : '') + ', das ' + cfg.inicio + ' às ' + cfg.fim + '.'],
    [cfg.usarMake && cfg.webhook ? '✅' : '⚠️', 'Envio pelo Make', cfg.usarMake && cfg.webhook ? 'WhatsApp da Bruna + Gmail.' : 'Desligado — só o e-mail de reserva será usado.'],
    [urlWebApp ? '✅' : '👉', 'Painel', urlWebApp ? 'App da Web já implantado.' : 'Falta implantar: Implantar → Nova implantação → App da Web → Executar como "Eu" → Acesso "Qualquer pessoa".']
  ];
  var itens = passos.map(function (p) {
    return '<div class="i"><span>' + p[0] + '</span><div><b>' + esc_(p[1]) + '</b><p>' + esc_(p[2]) + '</p></div></div>';
  }).join('');
  var html = '<style>body{margin:0;font-family:Helvetica,Arial,sans-serif;background:#FBF8F3;color:#2A1508}' +
    '.top{background:#6B3A1F;color:#F5EDE3;padding:18px 22px}.top small{letter-spacing:2px;text-transform:uppercase;opacity:.75;font-size:11px}' +
    '.top h1{margin:4px 0 0;font-size:20px;font-weight:700}.c{padding:14px 22px}.i{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #E6DACB}' +
    '.i span{font-size:18px;line-height:1.2}.i p{margin:3px 0 0;font-size:13px;color:#6B3A1F}.b{display:flex;gap:8px;padding:16px 22px}' +
    'button{flex:1;border:0;border-radius:10px;padding:11px;font-size:14px;cursor:pointer;background:#6B3A1F;color:#F5EDE3}' +
    'button.s{background:transparent;color:#6B3A1F;border:1px solid #6B3A1F}#m{padding:0 22px 14px;font-size:13px;color:#6B3A1F}</style>' +
    '<div class="top"><small>Diferencial Soluções</small><h1>📡 Radar de Audiências instalado</h1></div>' +
    '<div class="c">' + itens + '</div>' +
    '<div class="b"><button onclick="r(\'enviarAvisoTesteMenu\')">Enviar aviso de teste</button><button class="s" onclick="r(\'verificarAgoraMenu\')">Verificar agora</button></div><div id="m"></div>' +
    '<script>function r(f){document.getElementById("m").textContent="Trabalhando…";google.script.run.withSuccessHandler(function(){document.getElementById("m").textContent="Pronto! Veja o aviso no canto da planilha e o Histórico de avisos."}).withFailureHandler(function(e){document.getElementById("m").textContent="Erro: "+e.message})[f]()}</script>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(470).setHeight(500), 'Radar de Audiências');
}

/* ============================================================
 *  EDIÇÃO NA PLANILHA (IDs automáticos, remarcação)
 * ============================================================ */

function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet();
    if (sh.getName() !== RADAR.abas.audiencias) return;
    var mapa = lerCabecalho_(sh);
    if (!mapa) return;
    var inicio = Math.max(e.range.getRow(), mapa.linhaCabecalho + 1);
    var fim = e.range.getLastRow();
    if (fim < inicio) return;

    // Data alterada numa linha "Agendada" → vira "Remarcada"
    if (e.range.getNumRows() === 1 && e.range.getNumColumns() === 1 && e.range.getColumn() === mapa.col.data + 1 &&
        e.oldValue && e.value && mapa.col.situacao != null) {
      var cel = sh.getRange(inicio, mapa.col.situacao + 1);
      if (normalizar_(cel.getValue()) === 'agendada' || cel.getValue() === '') cel.setValue('Remarcada');
    }
    preencherIdsEFormulas_(sh, mapa, inicio, fim);
  } catch (erro) {
    console.warn(erro);
  }
}

function atribuirIdsFaltando_(ss) {
  var sh = ss.getSheetByName(RADAR.abas.audiencias);
  var mapa = lerCabecalho_(sh);
  if (!mapa) return 0;
  return preencherIdsEFormulas_(sh, mapa, mapa.linhaCabecalho + 1, sh.getLastRow());
}

function preencherIdsEFormulas_(sh, mapa, inicio, fim) {
  if (fim < inicio) return 0;
  var n = fim - inicio + 1;
  var colId = mapa.col.id, colCli = mapa.col.cliente, colData = mapa.col.data;
  if (colId == null) return 0;
  var vals = sh.getRange(inicio, 1, n, mapa.ncols).getValues();
  var todosIds = sh.getRange(mapa.linhaCabecalho + 1, colId + 1, Math.max(1, sh.getLastRow() - mapa.linhaCabecalho), 1).getValues();
  var maior = 0;
  todosIds.forEach(function (l) { var m = String(l[0]).match(/(\d+)\s*$/); if (m) maior = Math.max(maior, Number(m[1])); });
  var preenchidos = 0;
  for (var i = 0; i < n; i++) {
    var temConteudo = (colCli != null && vals[i][colCli] !== '') || (colData != null && vals[i][colData] !== '');
    if (temConteudo && !vals[i][colId]) {
      maior++;
      sh.getRange(inicio + i, colId + 1).setValue('AUD-' + ('000' + maior).slice(-4));
      preenchidos++;
    }
    if (temConteudo) garantirFormulas_(sh, mapa, inicio + i);
  }
  return preenchidos;
}

function garantirFormulas_(sh, mapa, linha) {
  var cols = [mapa.col.faltam, mapa.col.radar].filter(function (c) { return c != null; });
  if (!cols.length) return;
  var modelo = mapa.linhaCabecalho + 1;
  if (linha === modelo) return;
  cols.forEach(function (c) {
    var alvo = sh.getRange(linha, c + 1);
    if (!alvo.getFormula()) {
      var origem = sh.getRange(modelo, c + 1);
      if (origem.getFormula()) origem.copyTo(alvo, SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
    }
  });
}

/* ============================================================
 *  API DO PAINEL (App da Web)
 * ============================================================ */

function doGet() {
  return json_({ ok: true, app: 'Radar de Audiências', versao: RADAR.versao });
}

function doPost(e) {
  var req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (erro) { return json_({ ok: false, erro: 'requisicao_invalida' }); }
  try { return json_(atenderApi_(req)); }
  catch (erro2) { console.error(erro2); return json_({ ok: false, erro: 'erro_interno', detalhe: String(erro2 && erro2.message || erro2) }); }
}

function atenderApi_(req) {
  var ss = planilha_();
  var cfg = lerConfig_(ss);
  if (!cfg.chave || String(req.token || '') !== cfg.chave) return { ok: false, erro: 'nao_autorizado' };
  if (req.acao === 'ping') return { ok: true, escritorio: cfg.escritorio, versao: RADAR.versao };

  var cache = CacheService.getScriptCache();
  var falhas = Number(cache.get('falhasPin') || 0);
  if (falhas >= RADAR.maxFalhasPin) return { ok: false, erro: 'bloqueado', mensagem: 'Muitas tentativas. Aguarde 15 minutos.' };
  if (!cfg.pin || String(req.pin || '').trim() !== cfg.pin) {
    cache.put('falhasPin', String(falhas + 1), 900);
    return { ok: false, erro: 'pin_invalido', restantes: Math.max(0, RADAR.maxFalhasPin - falhas - 1) };
  }
  if (falhas) cache.remove('falhasPin');

  switch (req.acao) {
    case 'entrar': return { ok: true, escritorio: cfg.escritorio, versao: RADAR.versao };
    case 'painel': return montarPainel_();
    case 'verificar': {
      var r = verificarAudiencias({ manual: true });
      var p = montarPainel_();
      p.verificacao = r;
      return p;
    }
    case 'teste': {
      var t = enviarAvisoTeste();
      var p2 = montarPainel_();
      p2.teste = t;
      return p2;
    }
    case 'clienteAvisado': return comLock_(function () { return marcarClienteAvisado_(req.id, req.valor !== false, 'painel'); });
    case 'situacao': return comLock_(function () { return alterarSituacao_(req.id, req.situacao); });
    case 'salvar': return comLock_(function () { return salvarAudiencia_(req.audiencia || {}); });
    case 'avisarCliente': return comLock_(function () { return avisarCliente_(req.id); });
    default: return { ok: false, erro: 'acao_desconhecida' };
  }
}

function comLock_(fn) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) return { ok: false, erro: 'ocupado', mensagem: 'A planilha está ocupada. Tente de novo.' };
  try { var r = fn(); if (r && r.ok) { SpreadsheetApp.flush(); var p = montarPainel_(); p.acao = r; return p; } return r; }
  finally { lock.releaseLock(); }
}

function montarPainel_() {
  var ctx = carregarContexto_();
  var cfg = ctx.config;
  var ultima = tentarJSON_(PropertiesService.getScriptProperties().getProperty('ultimaVerificacao') || '') || null;
  var hoje = isoDeData_(new Date());
  return {
    ok: true,
    agora: new Date().toISOString(),
    escritorio: cfg.escritorio,
    planilhaUrl: ctx.ss.getUrl(),
    config: {
      aviso1: cfg.aviso1, aviso2: cfg.aviso2, contagem: cfg.contagem,
      inicio: cfg.inicio, fim: cfg.fim, usarMake: cfg.usarMake && !!cfg.webhook,
      reserva: cfg.reserva, lembrarCliente: cfg.lembrarCliente, modoTeste: cfg.modoTeste
    },
    motor: { versao: RADAR.versao, gatilhoAtivo: gatilhoAtivo_(), ultimaVerificacao: ultima },
    feriados: ctx.feriadosLista.filter(function (d) { return d >= hoje; }).slice(0, 120),
    audiencias: ctx.audiencias.map(function (a) {
      return {
        id: a.id, linha: a.linha, cliente: a.cliente, whatsapp: a.whatsappDigitos, whatsappFmt: a.whatsappFmt,
        processo: a.processo, data: a.dataISO, hora: a.hora, tipo: a.tipo, local: a.local, link: a.link,
        advogado: a.advogado, situacao: a.situacao, clienteAvisado: a.clienteAvisado, observacoes: a.observacoes,
        avisos: avisosDaAudiencia_(a, ctx.avisos)
      };
    }),
    historico: lerHistorico_(ctx.ss, RADAR.historicoNoPainel)
  };
}

function marcarClienteAvisado_(id, valor, origem) {
  var ctx = carregarContexto_();
  var a = acharPorId_(ctx, id);
  if (!a) return { ok: false, erro: 'nao_encontrada' };
  if (ctx.mapa.col.clienteAvisado == null) return { ok: false, erro: 'sem_coluna' };
  ctx.abaAudiencias.getRange(a.linha, ctx.mapa.col.clienteAvisado + 1).setValue(!!valor);
  registrarHistorico_(ctx.ss, [{
    quando: new Date(), id: a.id, cliente: a.cliente, audiencia: a.dataCurta + ' ' + a.hora,
    aviso: valor ? 'Cliente marcado como avisado' : 'Marcação de cliente avisado removida',
    canal: origem === 'bruna' ? 'WhatsApp (Bruna)' : 'Painel', resultado: 'OK', detalhes: ''
  }]);
  return { ok: true, id: a.id };
}

function alterarSituacao_(id, situacao) {
  var validas = ['Agendada', 'Remarcada', 'Adiada', 'Realizada', 'Cancelada'];
  if (validas.indexOf(situacao) < 0) return { ok: false, erro: 'situacao_invalida' };
  var ctx = carregarContexto_();
  var a = acharPorId_(ctx, id);
  if (!a) return { ok: false, erro: 'nao_encontrada' };
  ctx.abaAudiencias.getRange(a.linha, ctx.mapa.col.situacao + 1).setValue(situacao);
  return { ok: true, id: a.id };
}

function avisarCliente_(id) {
  var ctx = carregarContexto_();
  var a = acharPorId_(ctx, id);
  if (!a) return { ok: false, erro: 'nao_encontrada' };
  var c = loteCliente_(a, ctx);
  if (!c) return { ok: false, erro: 'sem_whatsapp', mensagem: 'O cliente não tem WhatsApp na planilha.' };
  if (!ctx.config.usarMake || !ctx.config.webhook) return { ok: false, erro: 'make_desligado', mensagem: 'O envio pelo Make está desligado nas Configurações.' };
  var r = entregar_({ evento: 'aviso_cliente', assunto: '', mensagem: '', html: '', avisos: [], clientes: [c] }, ctx, { semEmail: true });
  registrarHistorico_(ctx.ss, [{
    quando: new Date(), id: a.id, cliente: a.cliente, audiencia: a.dataCurta + ' ' + a.hora,
    aviso: 'Lembrete ao cliente', canal: r.ok ? 'WhatsApp (Bruna)' : r.canal,
    resultado: r.ok ? 'Enviado' + (ctx.config.modoTeste ? ' (modo teste)' : '') : 'Falhou', detalhes: r.resumo
  }]);
  if (!r.ok) return { ok: false, erro: 'falhou', mensagem: 'O Make não confirmou o envio. ' + r.resumo };
  if (ctx.mapa.col.clienteAvisado != null) ctx.abaAudiencias.getRange(a.linha, ctx.mapa.col.clienteAvisado + 1).setValue(true);
  return { ok: true, id: a.id, modoTeste: ctx.config.modoTeste };
}

function salvarAudiencia_(dados) {
  var ctx = carregarContexto_();
  var sh = ctx.abaAudiencias, mapa = ctx.mapa;
  var cliente = limpar_(dados.cliente, 120);
  var dataISO = String(dados.data || '').match(/^\d{4}-\d{2}-\d{2}$/) ? dados.data : '';
  if (!cliente || !dataISO) return { ok: false, erro: 'dados_incompletos', mensagem: 'Informe pelo menos o cliente e a data.' };
  var hora = String(dados.hora || '').match(/^\d{1,2}:\d{2}$/) ? dados.hora : '';

  var linha;
  var existente = dados.id ? acharPorId_(ctx, dados.id) : null;
  if (existente) {
    linha = existente.linha;
  } else {
    linha = primeiraLinhaLivre_(sh, mapa);
  }
  // Data e hora entram como número de série da planilha: não dependem de fuso.
  var horaNum = '';
  if (hora) { var hm = hora.split(':').map(Number); horaNum = (hm[0] * 60 + hm[1]) / 1440; }
  var campos = {
    cliente: cliente,
    whatsapp: limpar_(dados.whatsapp, 30),
    processo: limpar_(dados.processo, 40),
    data: diferencaDias_('1899-12-30', dataISO),
    hora: horaNum,
    tipo: limpar_(dados.tipo, 40),
    local: limpar_(dados.local, 160),
    link: limpar_(dados.link, 300),
    advogado: limpar_(dados.advogado, 80),
    situacao: limpar_(dados.situacao, 20) || 'Agendada',
    observacoes: limpar_(dados.observacoes, 500)
  };
  if (existente && existente.dataISO && existente.dataISO !== dataISO && normalizar_(existente.situacao) === 'agendada' && !dados.situacao) {
    campos.situacao = 'Remarcada';
  }
  Object.keys(campos).forEach(function (k) {
    var c = mapa.col[k];
    if (c != null) sh.getRange(linha, c + 1).setValue(campos[k]);
  });
  if (!existente) {
    preencherIdsEFormulas_(sh, mapa, linha, linha);
    if (mapa.col.clienteAvisado != null) sh.getRange(linha, mapa.col.clienteAvisado + 1).setValue(false);
  } else {
    garantirFormulas_(sh, mapa, linha);
  }
  var id = String(sh.getRange(linha, mapa.col.id + 1).getValue());
  registrarHistorico_(ctx.ss, [{
    quando: new Date(), id: id, cliente: cliente, audiencia: formatarDataCurtaISO_(dataISO) + ' ' + hora,
    aviso: existente ? 'Audiência atualizada' : 'Audiência cadastrada', canal: 'Painel', resultado: 'OK', detalhes: ''
  }]);
  return { ok: true, id: id, nova: !existente };
}

function primeiraLinhaLivre_(sh, mapa) {
  var inicio = mapa.linhaCabecalho + 1;
  var total = Math.max(1, sh.getMaxRows() - mapa.linhaCabecalho);
  var vals = sh.getRange(inicio, 1, total, mapa.ncols).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (vals[i][mapa.col.cliente] === '' && vals[i][mapa.col.data] === '') return inicio + i;
  }
  sh.insertRowsAfter(sh.getMaxRows(), 20);
  return inicio + vals.length;
}

function acharPorId_(ctx, id) {
  return ctx.audiencias.filter(function (a) { return a.id === String(id || ''); })[0] || null;
}

function limpar_(v, max) {
  var s = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;   // nunca deixa entrar fórmula pela API
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
 *  LEITURA DA PLANILHA
 * ============================================================ */

function planilha_() {
  var ss = null;
  try { ss = SpreadsheetApp.getActive(); } catch (e) { ss = null; }
  if (ss) return ss;
  var id = PropertiesService.getScriptProperties().getProperty('planilhaId');
  return SpreadsheetApp.openById(id);
}

function carregarContexto_() {
  var ss = planilha_();
  var config = lerConfig_(ss);
  var feriados = lerFeriados_(ss);
  var sh = ss.getSheetByName(RADAR.abas.audiencias);
  if (!sh) throw new Error('Não encontrei a aba "' + RADAR.abas.audiencias + '".');
  var mapa = lerCabecalho_(sh);
  if (!mapa) throw new Error('Não encontrei o cabeçalho (célula "ID") na aba Audiências.');
  var ctx = {
    ss: ss, config: config, abaAudiencias: sh, mapa: mapa, ultimaLinha: sh.getLastRow(),
    feriados: feriados.set, feriadosLista: feriados.lista, avisos: lerAvisos_(), hojeISO: isoDeData_(new Date())
  };
  ctx.audiencias = lerAudiencias_(ctx);
  return ctx;
}

function lerCabecalho_(sh) {
  var maxLinhas = Math.min(15, sh.getMaxRows());
  var ncols = sh.getLastColumn() || sh.getMaxColumns();
  var topo = sh.getRange(1, 1, maxLinhas, ncols).getDisplayValues();
  for (var r = 0; r < topo.length; r++) {
    if (normalizar_(topo[r][0]) === 'id') {
      var col = {};
      topo[r].forEach(function (h, i) {
        var n = normalizar_(h);
        Object.keys(COLUNAS).forEach(function (k) {
          if (col[k] == null && COLUNAS[k].indexOf(n) >= 0) col[k] = i;
        });
      });
      return { linhaCabecalho: r + 1, col: col, ncols: ncols };
    }
  }
  return null;
}

function lerAudiencias_(ctx) {
  var sh = ctx.abaAudiencias, mapa = ctx.mapa, cfg = ctx.config;
  var primeira = mapa.linhaCabecalho + 1;
  var total = ctx.ultimaLinha - mapa.linhaCabecalho;
  if (total <= 0) return [];
  var faixa = sh.getRange(primeira, 1, total, mapa.ncols);
  var vals = faixa.getValues();
  var exib = faixa.getDisplayValues();
  var fusoPlanilha = ctx.ss.getSpreadsheetTimeZone() || RADAR.fuso;
  var lista = [];

  for (var i = 0; i < vals.length; i++) {
    var v = vals[i], d = exib[i];
    var pega = function (k) { var c = mapa.col[k]; return c == null ? '' : v[c]; };
    var mostra = function (k) { var c = mapa.col[k]; return c == null ? '' : String(d[c]).trim(); };
    var cliente = String(pega('cliente')).trim();
    var dataBruta = pega('data');
    if (!cliente && dataBruta === '') continue;

    var dataISO = '';
    if (dataBruta instanceof Date && !isNaN(dataBruta)) dataISO = Utilities.formatDate(dataBruta, fusoPlanilha, 'yyyy-MM-dd');
    else dataISO = interpretarDataTexto_(String(dataBruta));

    var hora = interpretarHora_(mostra('hora'));
    var situacao = String(pega('situacao')).trim();
    var sitN = normalizar_(situacao);
    var ativa = ['realizada', 'cancelada', 'adiada'].indexOf(sitN) < 0;
    var whats = normalizarTelefone_(pega('whatsapp'));
    var a = {
      linha: primeira + i,
      id: String(pega('id')).trim() || ('LINHA-' + (primeira + i)),
      cliente: cliente || '(sem nome)',
      whatsappDigitos: whats,
      whatsappFmt: formatarTelefone_(whats) || String(pega('whatsapp')).trim(),
      processo: String(pega('processo')).trim(),
      dataISO: dataISO,
      hora: hora || '',
      tipo: String(pega('tipo')).trim(),
      local: String(pega('local')).trim(),
      link: String(pega('link')).trim(),
      advogado: String(pega('advogado')).trim(),
      situacao: situacao || 'Agendada',
      ativa: ativa,
      clienteAvisado: pega('clienteAvisado') === true || normalizar_(pega('clienteAvisado')) === 'sim',
      observacoes: String(pega('observacoes')).trim()
    };
    a.tribunal = decodificarCnj_(a.processo);
    if (dataISO) {
      a.diasCorridos = diferencaDias_(ctx.hojeISO, dataISO);
      a.diasUteis = diasUteis_(ctx.hojeISO, dataISO, ctx.feriados);
      a.inicioMs = dataHora_(dataISO, hora || '00:00').getTime();
      a.dataCurta = formatarDataCurtaISO_(dataISO);
      var dow = diaDaSemana_(dataISO);
      a.diaSemana = DIAS_SEMANA[dow];
      a.diaCurto = DIAS_CURTOS[dow];
    } else {
      a.diasCorridos = -1; a.diasUteis = -1; a.inicioMs = 0; a.dataCurta = '—'; a.diaSemana = ''; a.diaCurto = '';
    }
    lista.push(a);
  }
  return lista;
}

function lerConfig_(ss) {
  var sh = ss.getSheetByName(RADAR.abas.config);
  var mapa = {};
  if (sh) {
    var vals = sh.getRange(1, 1, Math.min(sh.getMaxRows(), 80), 2).getDisplayValues();
    vals.forEach(function (l) { var k = normalizar_(l[0]); if (k && !(k in mapa)) mapa[k] = String(l[1]).trim(); });
  }
  var sim = function (k, padrao) { var v = normalizar_(mapa[k]); return v === '' ? padrao : v === 'sim' || v === 'true' || v === 's'; };
  var num = function (k, padrao) { var n = parseInt(mapa[k], 10); return isNaN(n) ? padrao : Math.max(0, Math.min(30, n)); };
  var hora = function (k, padrao) { return interpretarHora_(mapa[k]) || padrao; };
  return {
    escritorio: mapa[CFG.escritorio] || 'Diferencial Soluções',
    emails: String(mapa[CFG.emails] || '').split(/[,;\s]+/).filter(function (x) { return /@/.test(x); }),
    whatsapp: normalizarTelefone_(mapa[CFG.whatsapp]),
    aviso1: num(CFG.aviso1, 3),
    aviso2: num(CFG.aviso2, 1),
    contagem: /corrid/.test(normalizar_(mapa[CFG.contagem])) ? 'corridos' : 'uteis',
    inicio: hora(CFG.inicio, '08:00'),
    fim: hora(CFG.fim, '19:00'),
    usarMake: sim(CFG.usarMake, true),
    webhook: /^https:\/\//.test(mapa[CFG.webhook] || '') ? mapa[CFG.webhook] : '',
    reserva: sim(CFG.reserva, true),
    lembrarCliente: sim(CFG.lembrarCliente, false),
    modoTeste: sim(CFG.modoTeste, false),
    numeroTeste: normalizarTelefone_(mapa[CFG.numeroTeste]),
    pin: String(mapa[CFG.pin] || '').trim(),
    chave: String(mapa[CFG.chave] || '').trim(),
    painel: /^https?:\/\//.test(mapa[CFG.painel] || '') ? mapa[CFG.painel] : ''
  };
}

function escreverConfig_(ss, chaveNormalizada, valor) {
  var sh = ss.getSheetByName(RADAR.abas.config);
  if (!sh) return;
  var vals = sh.getRange(1, 1, Math.min(sh.getMaxRows(), 80), 1).getDisplayValues();
  for (var i = 0; i < vals.length; i++) {
    if (normalizar_(vals[i][0]) === chaveNormalizada) { sh.getRange(i + 1, 2).setValue(valor); return; }
  }
}

function lerFeriados_(ss) {
  var set = {}, lista = [];
  var faixa = null;
  try { faixa = ss.getRangeByName('Feriados'); } catch (e) { faixa = null; }
  if (faixa) {
    var fuso = ss.getSpreadsheetTimeZone() || RADAR.fuso;
    faixa.getValues().forEach(function (l) {
      var v = l[0];
      var iso = v instanceof Date && !isNaN(v) ? Utilities.formatDate(v, fuso, 'yyyy-MM-dd') : interpretarDataTexto_(String(v || ''));
      if (iso && !set[iso]) { set[iso] = true; lista.push(iso); }
    });
  }
  lista.sort();
  return { set: set, lista: lista };
}

function registrarHistorico_(ss, linhas) {
  if (!linhas || !linhas.length) return;
  var sh = ss.getSheetByName(RADAR.abas.historico);
  if (!sh) return;
  var cab = 3;
  var topo = sh.getRange(1, 1, Math.min(10, sh.getMaxRows()), 1).getDisplayValues();
  for (var r = 0; r < topo.length; r++) if (normalizar_(topo[r][0]) === 'quando') { cab = r + 1; break; }
  sh.insertRowsAfter(cab, linhas.length);
  var faixa = sh.getRange(cab + 1, 1, linhas.length, 8);
  faixa.setValues(linhas.map(function (l) {
    return [l.quando, l.id, l.cliente, l.audiencia, l.aviso, l.canal, l.resultado, l.detalhes];
  }));
  faixa.setBackground('#FFFFFF').setFontColor('#2A1508').setFontWeight('normal').setFontSize(10).setFontFamily('Arial').setVerticalAlignment('middle').setWrap(false);
  sh.getRange(cab + 1, 1, linhas.length, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  sh.getRange(cab + 1, 2, linhas.length, 1).setFontFamily('Roboto Mono').setFontSize(9).setFontColor('#9A7D6A');
  sh.setRowHeights(cab + 1, linhas.length, 28);
}

function lerHistorico_(ss, max) {
  var sh = ss.getSheetByName(RADAR.abas.historico);
  if (!sh) return [];
  var cab = 3;
  var ultima = sh.getLastRow();
  if (ultima <= cab) return [];
  var n = Math.min(max, ultima - cab);
  return sh.getRange(cab + 1, 1, n, 8).getValues().filter(function (l) { return l[0] !== ''; }).map(function (l) {
    return {
      quando: l[0] instanceof Date ? l[0].toISOString() : String(l[0]),
      id: String(l[1]), cliente: String(l[2]), audiencia: String(l[3]), aviso: String(l[4]),
      canal: String(l[5]), resultado: String(l[6]), detalhes: String(l[7])
    };
  });
}

/* ============================================================
 *  DATAS, TELEFONE, CNJ E TEXTO
 * ============================================================ */

function normalizar_(s) {
  return String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isoDeData_(d) {
  return Utilities.formatDate(d, RADAR.fuso, 'yyyy-MM-dd');
}

function partesISO_(iso) {
  var p = iso.split('-').map(Number);
  return { a: p[0], m: p[1], d: p[2] };
}

function diferencaDias_(deISO, ateISO) {
  var a = partesISO_(deISO), b = partesISO_(ateISO);
  return Math.round((Date.UTC(b.a, b.m - 1, b.d) - Date.UTC(a.a, a.m - 1, a.d)) / 86400000);
}

function diaDaSemana_(iso) {
  var p = partesISO_(iso);
  return new Date(Date.UTC(p.a, p.m - 1, p.d)).getUTCDay();
}

function somarDiasISO_(iso, n) {
  var p = partesISO_(iso);
  var d = new Date(Date.UTC(p.a, p.m - 1, p.d + n));
  return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
}

/** Dias úteis depois de hoje até a data (inclusive). Pula fim de semana, feriado e recesso. */
function diasUteis_(hojeISO, dataISO, feriados) {
  var total = diferencaDias_(hojeISO, dataISO);
  if (total <= 0) return total < 0 ? -1 : 0;
  var uteis = 0;
  for (var i = 1; i <= Math.min(total, 400); i++) {
    var dia = somarDiasISO_(hojeISO, i);
    var dow = diaDaSemana_(dia);
    if (dow !== 0 && dow !== 6 && !feriados[dia]) uteis++;
  }
  return uteis;
}

/** Monta a data/hora real em São Paulo, respeitando o fuso oficial. */
function dataHora_(iso, hhmm) {
  var offset = Utilities.formatDate(new Date(iso + 'T12:00:00Z'), RADAR.fuso, 'XXX');
  return new Date(iso + 'T' + hhmm + ':00' + offset);
}

function interpretarDataTexto_(s) {
  s = String(s || '').trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?/);
  if (!m) return '';
  var ano = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : Utilities.formatDate(new Date(), RADAR.fuso, 'yyyy');
  return ano + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
}

function interpretarHora_(s) {
  var m = String(s || '').match(/(\d{1,2})\s*(?:[:hH]\s*(\d{2})?)?/);
  if (!m || !String(s).trim()) return '';
  var h = Number(m[1]), min = Number(m[2] || 0);
  if (h > 23 || min > 59) return '';
  return ('0' + h).slice(-2) + ':' + ('0' + min).slice(-2);
}

function normalizarTelefone_(v) {
  var d = String(v == null ? '' : v).replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return (d.length === 12 || d.length === 13) && d.indexOf('55') === 0 ? d : '';
}

function formatarTelefone_(d) {
  if (!d) return '';
  var ddd = d.slice(2, 4), resto = d.slice(4);
  return '(' + ddd + ') ' + (resto.length === 9 ? resto.slice(0, 5) + '-' + resto.slice(5) : resto.slice(0, 4) + '-' + resto.slice(4));
}

/** Lê o número CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO) e devolve o tribunal, ex.: "TRT-2". */
function decodificarCnj_(numero) {
  var m = String(numero || '').match(/(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})/);
  if (!m) return '';
  var j = m[4], tr = Number(m[5]);
  var ramos = { '1': 'STF', '2': 'CNJ', '3': 'STJ', '4': 'TRF-' + tr, '5': tr === 0 ? 'TST' : 'TRT-' + tr, '6': 'TRE', '7': 'STM', '8': 'TJ', '9': 'TJM' };
  return ramos[j] || '';
}

function formatarDataCurtaISO_(iso) {
  var p = partesISO_(iso);
  return ('0' + p.d).slice(-2) + '/' + ('0' + p.m).slice(-2);
}

function formatarHora_(d) { return Utilities.formatDate(d, RADAR.fuso, 'HH:mm'); }
function formatarDataHoraCurta_(d) { return Utilities.formatDate(d, RADAR.fuso, 'dd/MM HH:mm'); }
function formatarDataHoraLonga_(d) {
  var iso = isoDeData_(d);
  return DIAS_CURTOS[diaDaSemana_(iso)] + ', ' + formatarDataCurtaISO_(iso) + ' às ' + formatarHora_(d);
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tentarJSON_(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}
