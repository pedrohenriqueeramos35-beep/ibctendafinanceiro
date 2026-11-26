// Netlify Function: ponte segura entre o sistema e o Gemini (a chave nunca vai para o navegador)
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'Content-Type':'application/json'}});
export default async (req)=>{
  if(req.method!=='POST')return json({error:'Método não permitido'},405);
  // só quem está logado no Supabase pode usar a IA
  const u=await fetch(process.env.SUPABASE_URL+'/auth/v1/user',{headers:{Authorization:req.headers.get('authorization')||'',apikey:process.env.SUPABASE_ANON_KEY}});
  if(!u.ok)return json({error:'Não autorizado'},401);
  let b;try{b=await req.json()}catch{return json({error:'Pedido inválido'},400)}
  const system=String(b.system||'').slice(0,40000),msgs=(b.messages||[]).slice(-12);
  const model=process.env.GEMINI_MODEL||'gemini-2.5-flash';
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:msgs.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:String(m.content).slice(0,4000)}]})),generationConfig:{temperature:0.3,maxOutputTokens:900}})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)return json({error:(j.error&&j.error.message)||'Erro na IA'},502);
  const text=((j.candidates||[])[0]?.content?.parts||[]).map(p=>p.text||'').join('');
  return json({text});
};
