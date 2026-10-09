'use strict';
/*
 * RLT-OPS-02: isolated shadow OCR reconciler endpoint.
 * NEVER returns official/print-authorized results or writes data.
 * Authentication via independent server-side random secret (Make HTTP header).
 */
const crypto = require('node:crypto');
const {reconcileOcrSpace} = require('../scripts/ocrspace-shadow-reconciler.cjs');
const roster = require('../data/print-brokers.json').brokers;
const MAX_BODY_BYTES = 120_000;
const EVENT_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{5,79}$/;
function reject(res, status, code) {
  return res.status(status).json({error:code});
}
function authenticated(req) {
  const secret = process.env.ROLETA_OCR_SHADOW_TOKEN;
  if (typeof secret !== 'string' || secret.length < 32 || secret.length > 512) return false;
  const h = req.headers.authorization;
  if (typeof h !== 'string' || !h.startsWith('Bearer ')) return false;
  const token = h.slice(7);
  if (token.length > 512) return false;
  const expected = crypto.createHash('sha256').update(secret).digest();
  const received = crypto.createHash('sha256').update(token).digest();
  return crypto.timingSafeEqual(expected, received);
}
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'none'");
  if (req.method !== 'POST') {
    res.setHeader('Allow','POST');return reject(res,405,'METHOD_NOT_ALLOWED');
  }
  if (!authenticated(req)) return reject(res,401,'UNAUTHORIZED');
  if (String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase() !== 'application/json')
    return reject(res,415,'JSON_REQUIRED');
  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return reject(res,413,'PAYLOAD_TOO_LARGE');
  try {
    // Vercel normally parses JSON body; support a JSON string to simplify isolated tests.
    let body=req.body;
    if (Buffer.isBuffer(body)) {
      if (body.length > MAX_BODY_BYTES) return reject(res,413,'PAYLOAD_TOO_LARGE');
      body=JSON.parse(body.toString('utf8'));
    } else if(typeof body === 'string') {
      if (Buffer.byteLength(body,'utf8') > MAX_BODY_BYTES) return reject(res,413,'PAYLOAD_TOO_LARGE');
      body=JSON.parse(body);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reject(res,422,'INVALID_PAYLOAD');
    const {event_id,parsedText} = body;
    if (typeof event_id !== 'string' || !EVENT_ID.test(event_id)) return reject(res,422,'INVALID_EVENT_ID');
    if (typeof parsedText !== 'string' || Buffer.byteLength(parsedText,'utf8') > 100_000 || parsedText.length < 1)
      return reject(res,422,'INVALID_OCR_TEXT');
    const diagnostic = reconcileOcrSpace({parsedText,brokers:roster});
    if (diagnostic.linhas.length === 0 || diagnostic.inconsistencias.includes('MISSING_CORRETOR_HEADER')) {
      return reject(res,422,'UNRECOGNIZED_LAYOUT');
    }
    return res.status(200).json({
      event_id, origin:'ocrspace', mode:'SHADOW', parser_version:'rlt-ops-02-shadow-v1',
      ...diagnostic
    });
  } catch {
    // Never leak user-supplied OCR text, internal file paths or exception details.
    return reject(res,422,'INVALID_OCR_PAYLOAD');
  }
};