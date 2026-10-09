'use strict';
const { PDFDocument, StandardFonts, rgb, PageSizes }=require('pdf-lib');
const fs=require('node:fs');
const path=require('node:path');
const OFFICIAL=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/print-brokers.json'),'utf8')).brokers;
const NORM=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
function validate(p){
 const fail=x=>{throw Object.assign(new Error(x),{status:422});};
 if(!p||p.status!=='VALIDADO'||!p.evento||!Array.isArray(p.salao)||!Array.isArray(p.standby)||!Array.isArray(p.online))fail('Dados canônicos inválidos.');
 const e=p.evento;
 if(NORM(e.empreendimento)!=='CAMINHOS DA LAPA')fail('Empreendimento inválido.');
 const d=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(e.data||'');
 if(!d)fail('Data inválida.');
 const date=new Date(Date.UTC(+d[3],+d[2]-1,+d[1],12));
 if(date.getUTCDate()!==+d[1]||date.getUTCMonth()!==+d[2]-1||date.getUTCFullYear()!==+d[3])fail('Data inválida.');
 if(!['MANHA','MANHÃ','TARDE','INTEGRAL'].includes(NORM(e.periodo)))fail('Período inválido.');
 if(!Number.isInteger(Number(e.helbor_qtd))||Number(e.helbor_qtd)<0||Number(e.helbor_qtd)>100)fail('Quantidade HELBOR inválida.');
 if(!p.salao.length||p.salao.length>100||p.standby.length+p.online.length+p.salao.length>100||Number(e.tegra_qtd)!==p.salao.length)fail('Quantidade de corretores inválida.');
 if(Array.isArray(p.pendencias)&&p.pendencias.length)fail('Existem pendências.');
 const result=e.company_draw;
 if(!result||!['tegra_share','helbor_share','none'].includes(result.mode))fail('Sorteio de empresa incompleto.');
 const tg=result.tegra_positions,hb=result.helbor_positions;
 if(!Array.isArray(tg)||!Array.isArray(hb)||tg.some(x=>![1,2,3].includes(Number(x)))||hb.some(x=>![1,2,3].includes(Number(x))))fail('Posições de empresa inválidas.');
 if(result.mode==='tegra_share'&&(tg.length!==2||hb.length!==1)||result.mode==='helbor_share'&&(tg.length!==1||hb.length!==2)||result.mode==='none'&&(tg.length!==1||hb.length!==1))fail('Sorteio de empresa inválido.');
 const all=[...tg,...hb].map(Number);if(new Set(all).size!==all.length||result.mode!=='none'&&all.length!==3)fail('Posições sobrepostas.');
 const names=new Set(),positions=[];
 for(const [group,rows] of [['salao',p.salao],['standby',p.standby],['online',p.online]]){
  for(const row of rows){
   if(!row||typeof row.nome!=='string')fail('Corretor inválido.');
   const broker=OFFICIAL.find(x=>NORM(x.nome)===NORM(row.nome));
   if(!broker||names.has(NORM(row.nome)))fail('Corretor ausente ou duplicado no cadastro oficial.');
   for(const field of ['nome','creci','gerente','diretor','status_creci'])if(NORM(row[field])!==NORM(broker[field]))fail('Dados cadastrais divergentes: '+row.nome+'.');
   names.add(NORM(row.nome));
   if(group==='salao')positions.push(Number(row.ordem_final));
  }
 }
 positions.sort((a,b)=>a-b);
 if(positions.some((v,i)=>!Number.isInteger(v)||v!==i+1))fail('Ordem do SALÃO inválida.');
 return p;
}
const sanitize=x=>String(x??'').replace(/[^\u0020-\u007e\u00a0-\u00ff\u2013\u2014]/g,' ');
async function createPdf(p){
 validate(p);
 const doc=await PDFDocument.create();doc.setTitle('Roleta '+p.evento.data+' '+p.evento.periodo);doc.setCreator('Roleta Intelligence');
 const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const W=PageSizes.A4[0],H=PageSizes.A4[1],margin=13,width=W-2*margin, fractions=[.07,.21,.17,.19,.12,.24],cols=fractions.map(f=>f*width);
 const black=rgb(.03,.03,.03),white=rgb(1,1,1),grey=rgb(.92,.92,.92),yellow=rgb(1,.95,.08),blue=rgb(.72,.82,.93);
 let page,y;
 const maxWidth=(text,font,size,w)=>{let s=sanitize(text);while(s&&font.widthOfTextAtSize(s,size)>w-5)s=s.slice(0,-1);return s;};
 function cell(x,top,w,h,text,{fill=white,font=regular,fontSize=11.5,align='center'}={}){
  page.drawRectangle({x,y:top-h,width:w,height:h,color:fill,borderColor:black,borderWidth:.55});
  const t=maxWidth(text,font,fontSize,w),tw=font.widthOfTextAtSize(t,fontSize);
  page.drawText(t,{x:x+(align==='left'?3:Math.max(2,(w-tw)/2)),y:top-h+(h-fontSize)/2+1.7,size:fontSize,font,color:black});
 }
 function newPage(){page=doc.addPage(PageSizes.A4);y=H-margin;const l=['EMPREENDIMENTO','DATA','HELBOR '+p.evento.helbor_qtd,'PERÍODO','SORTEIO DE EMPRESA'];const v=['CAMINHOS DA LAPA',p.evento.data,p.evento.dia_semana,p.evento.periodo,
    ['TG '+p.evento.company_draw.tegra_positions.join(' - '),'HB '+p.evento.company_draw.helbor_positions.join(' - ') ]];
  let x=margin;cell(x,y,cols[0]+cols[1],21,l[0],{fill:grey,font:bold,fontSize:10});x+=cols[0]+cols[1];for(let i=1;i<5;i++){const cw=i===1?cols[2]:i===2?cols[3]:i===3?cols[4]:cols[5];cell(x,y,cw,21,l[i],{fill:grey,font:bold,fontSize:i===4?9.4:10});x+=cw}y-=21;
  x=margin;cell(x,y,cols[0]+cols[1],21,v[0],{font:bold,fontSize:11});x+=cols[0]+cols[1];cell(x,y,cols[2],21,v[1],{font:bold,fontSize:11});x+=cols[2];cell(x,y,cols[3],21,v[2],{font:bold,fontSize:10});x+=cols[3];cell(x,y,cols[4],21,v[3],{font:bold,fontSize:10});x+=cols[4];const halves=[cols[5]/2,cols[5]/2];cell(x,y,halves[0],21,v[4][0],{fill:yellow,font:bold,fontSize:10});cell(x+halves[0],y,halves[1],21,v[4][1],{fill:blue,font:bold,fontSize:10});y-=21;
 }
 function head(){const labels=['Nº','NOME','CRECI','GERENTE','DIRETOR','STATUS CRECI'];let x=margin;labels.forEach((t,i)=>{cell(x,y,cols[i],20,t,{font:bold,fill:grey,fontSize:10});x+=cols[i]});y-=20;}
 function row(r,i,withOrder){const values=[String(withOrder?r.ordem_final:i+1),r.nome,r.creci,r.gerente,r.diretor,r.status_creci];let x=margin;values.forEach((t,k)=>{cell(x,y,cols[k],18.8,t,{fill:i%2?grey:white,fontSize:12.0,align:k===1||k===3?'left':'center'});x+=cols[k]});y-=18.8;}
 function group(rows,title,ordered){if(!rows.length)return;const arr=ordered?[...rows].sort((a,b)=>a.ordem_final-b.ordem_final):rows;let i=0;while(i<arr.length){if(y<margin+60)newPage();if(title){cell(margin,y,width,18,title,{font:bold,fill:grey,fontSize:11});y-=18;}head();while(i<arr.length&&y>=margin+19){row(arr[i],i,ordered);i++;}if(i<arr.length)newPage();}}
 newPage();group(p.salao,'',true);group(p.standby,'STAND-BY',false);group(p.online,'ON-LINE',false);
 return Buffer.from(await doc.save());
}
module.exports={createPdf,validate};
