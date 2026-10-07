(function(global){
  'use strict';
  function parse(text){
    const rows=[];let row=[],field='',quoted=false;
    const src=String(text||'');
    for(let i=0;i<src.length;i++){
      const c=src[i],n=src[i+1];
      if(c==='"'&&quoted&&n==='"'){field+='"';i++;continue}
      if(c==='"'){quoted=!quoted;continue}
      if(c===','&&!quoted){row.push(field);field='';continue}
      if((c==='\n'||c==='\r')&&!quoted){
        if(c==='\r'&&n==='\n')i++;
        row.push(field);field='';
        if(row.some(v=>v!==''))rows.push(row);
        row=[];continue;
      }
      field+=c;
    }
    if(field||row.length){row.push(field);rows.push(row)}
    if(!rows.length)return[];
    const headers=rows.shift();
    return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
  }
  const api={parse};
  global.RoletaCSV=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
