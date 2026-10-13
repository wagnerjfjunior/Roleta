'use strict';
// OCR text is untrusted. This adapter never approves a line or infers missing numbers.
const MAX_TEXT=50000,MAX_WORDS=5000,MAX_ROWS=100;
const text=v=>typeof v==='string'?v.slice(0,300):'';
const normalized=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const integer=v=>/^\d{1,3}$/.test(String(v??'').trim())&&Number(v)>=1&&Number(v)<=100?Number(v):null;
const row=(position,name,number)=>({posicao_impressa:position,nome_lido:name||null,numero_sorteado:number===null?null:String(number).padStart(2,'0'),gerente:null,diretor:null,confianca:'baixa'});
function wordsFor(page){
 const lines=page?.TextOverlay?.Lines;
 if(!Array.isArray(lines))return [];
 const words=[];
 for(const line of lines)for(const word of Array.isArray(line.Words)?line.Words:[]){
  if(words.length>=MAX_WORDS)throw Error('Leitura OCR excedeu o limite de palavras.');
  const left=Number(word.Left),top=Number(word.Top??line.MinTop),width=Number(word.Width),height=Number(word.Height??line.MaxHeight);
  if([left,top,width,height].every(Number.isFinite)&&left>=0&&top>=0&&width>0&&height>0)words.push({t:text(word.WordText),x:left+width/2,y:top+height/2,left,top,width,height});
 }
 return words;
}
function fromOverlay(page){
 const words=wordsFor(page);
 const name=words.find(w=>normalized(w.t)==='CORRETOR'||normalized(w.t)==='CORRETORES');
 const manager=words.find(w=>normalized(w.t)==='GERENTE');
 const number=words.find(w=>/^(?:N[º°o]?|NÚMERO)$/i.test(w.t.replace(/\*/g,'').trim())&&(!name||Math.abs(w.y-name.y)<Math.max(w.height,name.height)*2));
 if(!name||!manager||!number||!(name.x<number.x&&number.x<manager.x))return [];
 const width=Math.max(...words.map(w=>w.left+w.width));
 const band=Math.max(number.height*1.8,width*.025);
 const leftBoundary=number.x-band,rightBoundary=number.x+band;
 // Printed indices must actually be read at the left of the name column.
 const anchors=words.filter(w=>w.y>name.y+name.height*.8&&w.x<name.left&&integer(w.t)!==null).sort((a,b)=>a.y-b.y);
 if(!anchors.length)return [];
 const rows=[];
 for(let i=0;i<anchors.length;i++){
  const a=anchors[i],prev=anchors[i-1],next=anchors[i+1];
  const low=prev?(prev.y+a.y)/2:a.y-a.height;
  const high=next?(next.y+a.y)/2:a.y+a.height;
  const near=words.filter(w=>w!==a&&w.y>=low&&w.y<high);
  const names=near.filter(w=>w.x>a.x+a.width/2&&w.x<leftBoundary).sort((a,b)=>a.x-b.x);
  const digits=near.filter(w=>w.x>=leftBoundary&&w.x<=rightBoundary);
  if(!names.length&&!digits.length)continue;
  const n=digits.length===1?integer(digits[0].t):null;
  rows.push(row(integer(a.t),names.map(w=>w.t).join(' '),n));
 }
 return rows;
}
function fromDelimited(raw){
 const rows=[];
 for(const line of raw.split(/\r?\n/)){
  if(!line.includes('|')&&!line.includes('\t'))continue;
  const cells=line.split(line.includes('|')?'|':'\t').map(s=>s.trim());
  if(line.includes('|')){if(cells[0]==='')cells.shift();if(cells[cells.length-1]==='')cells.pop();}
  if(cells.length<3||integer(cells[0])===null||!/[A-Za-zÀ-ÿ]/.test(cells[1]))continue;
  rows.push(row(integer(cells[0]),cells[1],integer(cells[2])));
 }
 return rows;
}
function fromText(raw){
 // No coordinates means no safe column mapping. Preserve uncertain fragments for correction.
 const ignored=/EMPREENDIMENTO|PER[IÍ]ODO|CORRETORES?\s+HELBOR|SORTEIO|DIRETOR|GERENTE|ELO\s+DUO|NOVA\s+VIVERE|GARDEN|^DATA\b|^TEGRA\b|^HELBOR\b/i;
 return raw.split(/\r?\n/).map(s=>s.trim()).filter(s=>/[A-Za-zÀ-ÿ]/.test(s)&&!ignored.test(s)&&!/^\*?\*?\*?CORRETOR/i.test(s)).map(s=>row(null,s,null));
}
function convertOcrSpace(value){
 const payload=value?.ocr??value;
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||payload.IsErroredOnProcessing===true)throw Error('OCR.space não conseguiu ler a fotografia.');
 if(!Array.isArray(payload.ParsedResults)||payload.ParsedResults.length!==1)throw Error('A leitura OCR deve conter uma única folha.');
 const page=payload.ParsedResults[0];
 if(page.FileParseExitCode!=null&&Number(page.FileParseExitCode)!==1)throw Error('OCR.space retornou uma leitura incompleta.');
 const raw=typeof page.ParsedText==='string'?page.ParsedText:'';
 if(raw.length>MAX_TEXT)throw Error('Texto OCR excedeu o limite permitido.');
 if(!raw.trim())throw Error('OCR.space não encontrou texto legível na fotografia.');
 let rows=fromOverlay(page),method='overlay';
 if(!rows.length){rows=fromDelimited(raw);method='delimited';}
 if(!rows.length){rows=fromText(raw);method='unstructured';}
 if(!rows.length)throw Error('Não foi possível separar participantes. Escolha uma fotografia mais nítida.');
 if(rows.length>MAX_ROWS)throw Error('Leitura OCR excedeu 100 linhas.');
 return {empreendimento:null,data:null,periodo:null,sorteio_empresa:null,quantidade_corretores:null,helbor_qtd_lida:null,linhas:rows,source:'ocr-space',parser_version:'ocr-space-draft-v1',metodo_leitura:method,texto_original:raw,inconsistencias:['Leitura de emergência: confira todas as linhas e acrescente participantes que não foram reconhecidos.','Posições e bolinhas ilegíveis permanecem vazias; não foram completadas por sequência.'],observacoes:['Os dois modelos Gemini falharam. O OCR.space é um rascunho e exige conferência humana completa.']};
}
module.exports={convertOcrSpace};
