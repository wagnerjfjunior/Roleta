'use strict';
// Pure admission contract for the future asynchronous OCR shadow worker.
// This module NEVER uploads an image, writes to the database or trusts a
// browser-provided "saved" response as proof of persisted authority.
const crypto = require('node:crypto');
const IMAGE_TYPES = new Set(['image/jpeg','image/png','image/webp']);
const MAX_IMAGE_BYTES = 900000;
function reject(message) { throw Object.assign(new Error(message), {status:422}); }
function validImage(bytes, mime) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES || !IMAGE_TYPES.has(mime)) reject('Imagem inválida.');
  const jpeg = bytes.length>=3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
  const png = bytes.length>=8 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp = bytes.length>=12 && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP';
  if (!(mime==='image/jpeg'&&jpeg || mime==='image/png'&&png || mime==='image/webp'&&webp)) reject('Assinatura da imagem divergente.');
}
function expectFinal({eventId,version,operatorSub,reviewed,image,mime}) {
  if (!/^\d{4}-\d{2}-\d{2}-(M|T|I)$/.test(eventId||'')) reject('Identificador do evento inválido.');
  if (!Number.isSafeInteger(version) || version<1) reject('Versão final inválida.');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(operatorSub||'')) reject('Operador inválido.');
  if (!reviewed || reviewed.status!=='VALIDADO' || !reviewed.evento || !Array.isArray(reviewed.salao) || reviewed.pendencias?.length) reject('Roleta sem conferência humana.');
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(reviewed.evento.data||''));
  const map = {MANHA:'M',TARDE:'T',INTEGRAL:'I'};
  const period = String(reviewed.evento.periodo||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  if (!match || !map[period] || `${match[3]}-${match[2]}-${match[1]}-${map[period]}` !== eventId)
    reject('Evento divergente da folha conferida.');
  validImage(image,mime);
  return Object.freeze({
    event_id:eventId,
    final_version_id:String(version),
    image_sha256:crypto.createHash('sha256').update(image).digest('hex'),
    mime,
    image_bytes:image.length,
    submitted_by:operatorSub
  });
}
// IMPORTANT: only the server may construct values passed to expectFinal.
// Before storing the job it MUST re-read the authoritative persisted version
// from roleta_audit, check its ownership and event_id, check the source-photo
// session binding, and verify the image SHA-256 again after private upload.
module.exports={expectFinal,validImage,MAX_IMAGE_BYTES};
