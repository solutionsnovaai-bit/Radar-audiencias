/*
 * Ponte segura entre o painel e o motor da planilha (Google Apps Script).
 * O navegador nunca vê o endereço do motor nem a chave de integração:
 * os dois ficam nas variáveis de ambiente RADAR_API_URL e RADAR_TOKEN.
 */
const ACOES = new Set(['entrar', 'painel', 'verificar', 'teste', 'clienteAvisado', 'situacao', 'salvar', 'avisarCliente']);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const url = process.env.RADAR_API_URL || '';
  const token = process.env.RADAR_TOKEN || '';
  const configurado = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url) && token.length >= 16;

  if (req.method === 'GET') return res.status(200).json({ ok: true, configurado });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, erro: 'metodo_nao_permitido' });
  if (!configurado) return res.status(200).json({ ok: false, erro: 'nao_configurado' });

  let corpo = req.body;
  if (typeof corpo === 'string') { try { corpo = JSON.parse(corpo); } catch (e) { corpo = null; } }
  if (!corpo || typeof corpo !== 'object' || !ACOES.has(String(corpo.acao || ''))) {
    return res.status(400).json({ ok: false, erro: 'acao_invalida' });
  }

  const envio = Object.assign({}, corpo, { token });
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 55000);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(envio),
      redirect: 'follow',
      signal: controle.signal
    });
    const texto = await r.text();
    let dados;
    try { dados = JSON.parse(texto); } catch (e) {
      return res.status(502).json({ ok: false, erro: 'motor_resposta_invalida', status: r.status });
    }
    return res.status(200).json(dados);
  } catch (e) {
    return res.status(504).json({ ok: false, erro: 'motor_indisponivel' });
  } finally {
    clearTimeout(limite);
  }
};
