'use strict';

/**
 * RLT-OPS-02 shadow-only OCR.space reconciler.
 * This module NEVER authorizes printing, modifies the official roster,
 * determines a draw number, or writes to statistical data.
 */
const DEFAULT_MAX_TEXT = 100_000;
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
function editDistance(a, b) {
  let previous = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}
function similarity(a, b) {
  const left = normalize(a), right = normalize(b);
  if (!left || !right) return 0;
  return 1 - editDistance(left, right) / Math.max(left.length, right.length);
}
function safeString(value, max = 120) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}
function loadRoster(brokers) {
  if (!Array.isArray(brokers) || brokers.length > 5000) throw new Error('Invalid roster');
  const byName = new Map();
  for (const entry of brokers) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const nome = safeString(entry.nome);
    const key = normalize(nome);
    if (!key) continue;
    const normalized = Object.freeze({
      nome, creci: safeString(entry.creci), status_creci: safeString(entry.status_creci),
      gerente: safeString(entry.gerente), diretor: safeString(entry.diretor),
      cargo: safeString(entry.cargo)
    });
    byName.set(key, [...(byName.get(key) || []), normalized]);
  }
  return [...byName.values()].flat();
}
function parseOcrSpaceText(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > DEFAULT_MAX_TEXT) throw new Error('Invalid OCR text');
  const lines = text.split(/\r?\n/).map(s => s.trim());
  const cleanHeader = s => s.replace(/\*/g, '').trim().toLowerCase();
  const header = lines.findIndex(s => cleanHeader(s) === 'corretor');
  if (header < 0) return {rows: [], issues: ['MISSING_CORRETOR_HEADER'], diretor_ocr_nao_vinculado: null, diretor_ocorrencias: 0};
  const rows = [], issues = [];
  let lastPosition = 0, seenNames = false;
  const meta = /^(?:n[º°o]\s*$|data\s*[-:]|per[ií]odo\s*[-:]|empreendimento\s*$)/i;
  const endSections = /^(?:\*{0,3}(?:gerente|diretor)\*{0,3}|corretores\s+helbor|sorteio\s+da\s+empresa)/i;
  for (const line of lines.slice(header + 1)) {
    if (endSections.test(line)) break;
    if (!line || meta.test(line)) continue;
    const match = line.match(/^(\d{1,3})(?:\s+(.+))?$/);
    if (!match) {
      if (seenNames && rows.length && /^[a-zA-Z]{2,}/.test(line)) {
        // Column interleaving can begin after the roster. Do not infer a name/number association.
        issues.push('OCR_COLUMN_ALIGNMENT_UNVERIFIED');
      }
      continue;
    }
    const posicao_fisica = Number(match[1]);
    if (posicao_fisica <= lastPosition && seenNames) {
      // OCR has returned to the start of the next column: stop the name block.
      issues.push('OCR_COLUMN_ALIGNMENT_UNVERIFIED');
      break;
    }
    if (posicao_fisica < 1 || posicao_fisica > 100 || posicao_fisica <= lastPosition) {
      issues.push('INVALID_OR_OUT_OF_ORDER_POSITION');
      continue;
    }
    if (lastPosition && posicao_fisica !== lastPosition + 1) issues.push('POSITION_GAP');
    rows.push({posicao_fisica, nome_ocr: safeString(match[2] || '')});
    lastPosition = posicao_fisica;
    seenNames = true;
  }
  // Director entries are observed but OCR.space provides no reliable row-level coordinates.
  // Never equate an occurrence count with the number of active salon brokers.
  const directorAt = lines.findIndex(s => cleanHeader(s) === 'diretor');
  let diretor_ocorrencias = 0;
  let diretor_ocr_nao_vinculado = null;
  if (directorAt >= 0) {
    const directorLines = lines.slice(directorAt + 1);
    const tokens = directorLines.filter(s => s && /^[a-zA-ZÀ-ÿ]{3,40}$/.test(s));
    diretor_ocorrencias = tokens.length;
    const exactRenan = tokens.filter(s => normalize(s) === 'renan').length;
    if (exactRenan > 0) diretor_ocr_nao_vinculado = 'Renan';
  }
  return {rows, issues: [...new Set(issues)], diretor_ocr_nao_vinculado, diretor_ocorrencias};
}
/**
 * Match policy: exact unique is accepted as roster identity; fuzzy is a
 * suggestion only, even if candidate is unique. No changes to numbers.
 * Manager is roster metadata, NOT a visually confirmed OCR-manager match.
 */
function reconcileOcrSpace({ parsedText, brokers }) {
  const roster = loadRoster(brokers);
  const {rows, issues, diretor_ocr_nao_vinculado, diretor_ocorrencias} = parseOcrSpaceText(parsedText);
  const result = [];
  const exactNames = new Map();
  for (const broker of roster) {
    const key = normalize(broker.nome);
    exactNames.set(key, [...(exactNames.get(key) || []), broker]);
  }
  for (const row of rows) {
    const raw = row.nome_ocr;
    const key = normalize(raw);
    if (!key) {
      result.push({...row, status: 'SEM_NOME', candidatos: [], confirmado: null}); continue;
    }
    const exact = exactNames.get(key) || [];
    if (exact.length === 1) {
      result.push({...row, status: 'CADASTRO_EXATO', confirmado: {...exact[0]}, candidatos: []}); continue;
    }
    if (exact.length > 1) {
      result.push({...row, status: 'AMBIGUO', confirmado: null, candidatos: exact.map(x => ({...x, similaridade: 1}))}); continue;
    }
    const ranked = roster.map(broker => ({...broker, similaridade: similarity(raw, broker.nome)}))
      .filter(x => x.similaridade >= 0.55)
      .sort((a, b) => b.similaridade - a.similaridade || a.nome.localeCompare(b.nome, 'pt-BR'))
      .slice(0, 5);
    result.push({...row, status: ranked.length ? 'REVISAO_HUMANA' : 'SEM_MATCH',
      confirmado: null, candidatos: ranked});
  }
  // Provenance boundary: an OCR column without verified coordinates cannot be joined
  // to a physical row, even when every candidate belongs to the same director.
  for (const line of result) {
    line.diretor_ocr = null;
    line.diretor_oficial = line.confirmado ? line.confirmado.diretor : null;
    line.gerente_ocr = null;
    line.gerente_oficial = line.confirmado ? line.confirmado.gerente : null;
  }
  const duplicate = new Map();
  for (const row of result) {
    if (row.confirmado) duplicate.set(normalize(row.confirmado.nome), (duplicate.get(normalize(row.confirmado.nome)) || 0) + 1);
  }
  if ([...duplicate.values()].some(n => n > 1)) issues.push('DUPLICATE_ROSTER_IDENTITY');
  return {
    schema: 'rlt-ops-02-shadow-v1',
    autorizado_impressao: false,
    autorizado_base_estatistica: false,
    referencia_cadastro: 'data/print-brokers.json',
    evidencia_diretor: {diretor_ocr_nao_vinculado, diretor_ocorrencias, alinhamento_por_linha: false},
    linhas: result,
    inconsistencias: [...new Set(issues)],
    resumo: {
      linhas: result.length,
      exatos: result.filter(r => r.status === 'CADASTRO_EXATO').length,
      revisao: result.filter(r => r.status === 'REVISAO_HUMANA').length,
      bloqueados: result.filter(r => ['SEM_MATCH', 'AMBIGUO', 'SEM_NOME'].includes(r.status)).length
    }
  };
}
function fromOcrSpaceResponse(payload, brokers) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.IsErroredOnProcessing !== false ||
      payload.OCRExitCode !== 1 || !Array.isArray(payload.ParsedResults) || payload.ParsedResults.length !== 1) {
    throw new Error('Untrusted OCR.space response');
  }
  const entry = payload.ParsedResults[0];
  if (!entry || entry.FileParseExitCode !== 1 || typeof entry.ParsedText !== 'string') throw new Error('Invalid OCR result');
  return reconcileOcrSpace({parsedText: entry.ParsedText, brokers});
}
module.exports = { normalize, similarity, parseOcrSpaceText, reconcileOcrSpace, fromOcrSpaceResponse };
