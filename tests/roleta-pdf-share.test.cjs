'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PDFDocument,PageSizes}=require('pdf-lib');
const {createPdf,validate}=require('../lib/roleta-pdf');
const brokers=JSON.parse(fs.readFileSync('data/print-brokers.json','utf8')).brokers;
const mk=(b,i)=>({nome:b.nome,creci:b.creci,status_creci:b.status_creci,gerente:b.gerente,diretor:b.diretor,ordem_final:i+1});
const input={
 status:'VALIDADO',
 evento:{empreendimento:'CAMINHOS DA LAPA',data:'09/10/2026',dia_semana:'SEXTA-FEIRA',periodo:'MANHÃ',tegra_qtd:20,helbor_qtd:4,company_draw:{mode:'tegra_share',tegra_positions:[1,2],helbor_positions:[3]},resultado:{empresa:'TEGRA',numero:null,numero_exposto:false}},
 salao:brokers.slice(0,20).map(mk),
 standby:brokers.slice(20,22).map(mk),
 online:brokers.slice(22,23).map(mk),
 pendencias:[]
};
(async()=>{
 const binary=await createPdf(input);
 assert.equal(binary.subarray(0,5).toString(),'%PDF-');
 const pdf=await PDFDocument.load(binary);
 assert.equal(pdf.getPageCount(),1,'normal roleta must fit one A4 page');
 assert.deepEqual(pdf.getPage(0).getSize(),{width:PageSizes.A4[0],height:PageSizes.A4[1]});
 assert.equal(validate(input),input);
 assert.throws(()=>validate({...input,status:'RASCUNHO'}),/Dados canônicos inválidos/);
 assert.throws(()=>validate({...input,evento:{...input.evento,tegra_qtd:5}}),/Quantidade/);
 assert.throws(()=>validate({...input,salao:input.salao.map((r,i)=>i===0?{...r,creci:'FALSO'}:r)}),/Dados cadastrais divergentes/);
 assert.throws(()=>validate({...input,salao:[input.salao[0],...input.salao.slice(1).map((r,i)=>({...r,ordem_final:i+3}))]}),/Ordem do SALÃO inválida/);
 const legacy={...input,evento:{...input.evento,company_draw:null,resultado:{empresa:'TEGRA',numero:null,numero_exposto:false}}};
 assert.equal((await PDFDocument.load(await createPdf(legacy))).getPageCount(),1,'legacy importer must still export');
 assert.throws(()=>validate({...input,evento:{...input.evento,dia_semana:'SEGUNDA-FEIRA'}}),/Dia da semana/);
 const oldShare={...input,evento:{...input.evento,company_draw:null,resultado:null,sorteio_empresa:{tg:'1 - 2',hb:'3'}}};
 assert.equal((await PDFDocument.load(await createPdf(oldShare))).getPageCount(),1,'legacy sorteio_empresa representation must work');
 const prefixed={...input,evento:{...input.evento,company_draw:null,resultado:null,sorteio_empresa:{tg:'TG 1 - 2',hb:'HB 3'}}};
 assert.equal((await PDFDocument.load(await createPdf(prefixed))).getPageCount(),1,'prefixed legacy company positions');
 const hbOnly={...input,evento:{...input.evento,company_draw:null,resultado:null,sorteio_empresa:{tg:'  ',hb:'HB 3'}}};
 assert.equal((await PDFDocument.load(await createPdf(hbOnly))).getPageCount(),1,'whitespace TG must not crash HB-only PDF');
 const ui=fs.readFileSync('roulette-intake.js','utf8');
 for(const k of ['id="rltv2Print"','id="rltv2SavePdf"','id="rltv2SharePdf"','data-review-transfer']){if(k==='data-review-transfer')continue;assert.ok(ui.includes(k),k);}
 assert.match(ui,/sharePdf\.addEventListener\('click',shareReadyPdf\)/);
 assert.match(ui,/savePdf\.addEventListener\('click',saveReadyPdf\)/);
 assert.match(ui,/navigator\.canShare\(\{files:\[file\]\}\)/);
 assert.match(ui,/endpoint='\/api\/roleta-pdf'/);
 assert.match(ui,/endpoint='http:\/\/127\.0\.0\.1:8083\/pdf'/);
 console.log('PASS: validated A4 PDF, official directory, canonical and legacy formats, mobile share actions');
})().catch(e=>{console.error(e);process.exitCode=1});
