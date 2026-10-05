const fs=require('fs');
const path=require('path');

function csvNames(){
  try{
    const p=path.join(process.cwd(),'data','brokers-official.csv');
    const text=fs.readFileSync(p,'utf8');
    return text.split(/\r?\n/).slice(1).map(line=>{
      if(!line.trim())return '';
      let field='',quoted=false;
      for(let i=0;i<line.length;i++){
        const c=line[i],n=line[i+1];
        if(c==='"'&&quoted&&n==='"'){field+='"';i++;continue}
        if(c==='"'){quoted=!quoted;continue}
        if(c===','&&!quoted)break;
        field+=c;
      }
      return field.trim();
    }).filter(Boolean);
  }catch(_){return []}
}

function extractOutputText(payload){
  if(typeof payload.output_text==='string')return payload.output_text;
  for(const item of payload.output||[]){
    if(item.type!=='message')continue;
    for(const part of item.content||[]){
      if(part.type==='output_text'&&typeof part.text==='string')return part.text;
    }
  }
  return '';
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'OPENAI_API_KEY_NOT_CONFIGURED'});

  const imageDataUrl=req.body&&req.body.imageDataUrl;
  if(typeof imageDataUrl!=='string'||!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(imageDataUrl)){
    return res.status(400).json({error:'INVALID_IMAGE'});
  }
  if(imageDataUrl.length>4_000_000)return res.status(413).json({error:'IMAGE_TOO_LARGE'});

  const roster=csvNames();
  const rosterText=roster.join(', ');

  const schema={
    type:'object',
    properties:{
      metadata:{
        type:'object',
        properties:{
          empreendimento:{type:'string'},
          periodo:{type:'string'},
          data:{type:'string'},
          dia_semana:{type:'string'},
          tg_draw:{type:'string'},
          hb_draw:{type:'string'},
          company_draw_notes:{type:'string'}
        },
        required:['empreendimento','periodo','data','dia_semana','tg_draw','hb_draw','company_draw_notes'],
        additionalProperties:false
      },
      cutoff:{
        type:'object',
        properties:{
          detected:{type:'boolean'},
          after_physical_position:{anyOf:[{type:'integer'},{type:'null'}]},
          confidence:{type:'string',enum:['high','medium','low']},
          notes:{type:'string'}
        },
        required:['detected','after_physical_position','confidence','notes'],
        additionalProperties:false
      },
      rows:{
        type:'array',
        items:{
          type:'object',
          properties:{
            physical_position:{type:'integer'},
            raw_name:{type:'string'},
            drawn_number:{anyOf:[{type:'integer'},{type:'null'}]},
            manager_raw:{type:'string'},
            participation_class:{type:'string',enum:['salao','standby','online','unknown']},
            confidence:{type:'string',enum:['high','medium','low']},
            candidate_names:{type:'array',items:{type:'string'}},
            notes:{type:'string'}
          },
          required:['physical_position','raw_name','drawn_number','manager_raw','participation_class','confidence','candidate_names','notes'],
          additionalProperties:false
        }
      },
      warnings:{type:'array',items:{type:'string'}}
    },
    required:['metadata','cutoff','rows','warnings'],
    additionalProperties:false
  };

  const instructions=`Você analisa uma folha manual de roleta de corretores da Tegra. Esta é uma operação de alto risco: NÃO invente nomes nem números.

Regras de negócio:
- Corretores acima da barra de fechamento pertencem a SALÃO e participam do sorteio.
- Corretores abaixo da barra pertencem a STAND-BY, salvo se houver indicação explícita de ON-LINE.
- STAND-BY não participa do sorteio; drawn_number deve ser null.
- ON-LINE fica em bloco explicitamente identificado e drawn_number deve ser null, salvo evidência inequívoca em contrário.
- Gaps e linhas riscadas devem ser preservados; não invente participantes.
- Leia posição física, nome manuscrito, número sorteado ao lado do nome e gerente manuscrito quando legível.
- Se um nome estiver duvidoso, candidate_names deve conter no máximo 3 nomes plausíveis da lista oficial abaixo. Se não houver opção segura, deixe candidate_names vazio.
- confidence=low sempre que houver dúvida real.
- Metadados desconhecidos ficam como string vazia.
- tg_draw deve ser algo como "TG 2 - 3"; hb_draw algo como "HB 01", somente se legível.
- Detecte a barra horizontal de fechamento quando existir.

Lista oficial atual de corretores Tegra:
${rosterText}

Retorne exclusivamente o JSON estruturado.`;

  try{
    const upstream=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{
        'Authorization':'Bearer '+process.env.OPENAI_API_KEY,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        model:process.env.OPENAI_VISION_MODEL||'gpt-6-luna',
        store:false,
        reasoning:{effort:'medium'},
        input:[
          {role:'developer',content:[{type:'input_text',text:instructions}]},
          {role:'user',content:[
            {type:'input_text',text:'Analise esta folha de roleta e produza a prévia estruturada para validação humana antes de qualquer impressão.'},
            {type:'input_image',image_url:imageDataUrl,detail:'high'}
          ]}
        ],
        text:{format:{type:'json_schema',name:'roulette_sheet_preview',strict:true,schema}},
        max_output_tokens:6000
      })
    });

    const payload=await upstream.json();
    if(!upstream.ok){
      const code=payload?.error?.code||payload?.error?.type||'upstream_error';
      return res.status(upstream.status).json({error:'OPENAI_REQUEST_FAILED',code});
    }

    const output=extractOutputText(payload);
    if(!output)return res.status(502).json({error:'EMPTY_MODEL_OUTPUT'});
    let parsed;
    try{parsed=JSON.parse(output)}
    catch(_){return res.status(502).json({error:'INVALID_MODEL_JSON'});}
    return res.status(200).json(parsed);
  }catch(err){
    return res.status(500).json({error:'ANALYSIS_FAILED'});
  }
};
