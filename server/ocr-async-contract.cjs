'use strict';
// SFJM Gate 1: pure contract, no database writes or external calls.
const crypto=require('node:crypto');
const STATES=Object.freeze({QUEUED:'QUEUED',PROCESSING:'PROCESSING',READY_FOR_REVIEW:'READY_FOR_REVIEW',FAILED:'FAILED'});
const TRANSITIONS=Object.freeze({QUEUED:['PROCESSING','FAILED'],PROCESSING:['READY_FOR_REVIEW','FAILED'],READY_FOR_REVIEW:[],FAILED:[]});
function assertJobId(id){if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw Error('invalid job id');return id;}
function assertTransition(from,to){if(!TRANSITIONS[from]?.includes(to))throw Error('invalid state transition');return to;}
function imageDigest(bytes){if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>900000)throw Error('invalid image size');return crypto.createHash('sha256').update(bytes).digest('hex');}
function assertOwner(job,session){if(!job||!session||typeof job.operator_sub!=='string'||!job.operator_sub||job.operator_sub!==session.sub)throw Error('access denied');return true;}
function normalizeResult(result){if(!result||typeof result!=='object'||Array.isArray(result)||!Array.isArray(result.linhas)||result.linhas.length<1||result.linhas.length>100)throw Error('invalid OCR result');for(const row of result.linhas){if(!row||typeof row!=='object'||Array.isArray(row)||row.posicao_impressa!==null&&(!Number.isInteger(Number(row.posicao_impressa))||Number(row.posicao_impressa)<1||Number(row.posicao_impressa)>100)||row.nome_lido!==null&&typeof row.nome_lido!=='string'||row.numero_sorteado!==null&&!['string','number'].includes(typeof row.numero_sorteado))throw Error('invalid OCR row');}return result;}
module.exports={STATES,assertJobId,assertTransition,imageDigest,assertOwner,normalizeResult};
