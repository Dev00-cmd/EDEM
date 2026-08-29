// Verifie l historique de conversations de bout en bout.
import fs from 'fs';
const REF='qoyebljuvrxhcroxapys';
const URL=`https://${REF}.supabase.co`;
const ANON='sb_publishable_n6OP5Pk7jd-537IPq0UoKg_DJuB-6rv';
const token=(fs.readFileSync('.env.secrets','utf8').match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m)||[])[1]?.trim();
let bad=0;
const ok=(c,l,d='')=>{console.log(`  ${c?'ok   ':'ECHEC'} ${l}${d?` — ${d}`:''}`);if(!c)bad++;};
const sql=(q)=>fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:q})}).then(r=>r.json());

const email=`conv-${Date.now()}@edem-test.local`;
const up=await fetch(`${URL}/auth/v1/signup`,{method:'POST',headers:{apikey:ANON,'Content-Type':'application/json'},body:JSON.stringify({email,password:'MotDePasseTest2026!',data:{name:'Conv'}})}).then(r=>r.json());
const jwt=up.access_token, uid=up.user.id;
const H={apikey:ANON,Authorization:`Bearer ${jwt}`,'Content-Type':'application/json'};
const rpc=(n,a)=>fetch(`${URL}/rest/v1/rpc/${n}`,{method:'POST',headers:H,body:JSON.stringify(a)}).then(async r=>({s:r.status,b:await r.json().catch(()=>null)}));
const post=(p,body)=>fetch(`${URL}/rest/v1/${p}`,{method:'POST',headers:{...H,Prefer:'return=representation'},body:JSON.stringify(body)}).then(async r=>({s:r.status,b:await r.json().catch(()=>null)}));
const get=(p)=>fetch(`${URL}/rest/v1/${p}`,{headers:H}).then(async r=>({s:r.status,b:await r.json().catch(()=>null)}));
const del=(p)=>fetch(`${URL}/rest/v1/${p}`,{method:'DELETE',headers:H}).then(r=>({s:r.status}));

try{
  console.log('DEPART');
  let l=await rpc('conversation_list',{p_limit:20});
  ok(Array.isArray(l.b)&&l.b.length===0,'aucune conversation au depart');

  console.log('\nCREATION DE DEUX CONVERSATIONS');
  const c1=await post('conversations',{user_id:uid,subject_id:'math',title:'Les fractions'});
  const c2=await post('conversations',{user_id:uid,subject_id:'histoire',title:'1804'});
  const id1=c1.b?.[0]?.id, id2=c2.b?.[0]?.id;
  ok(!!id1&&!!id2,'deux conversations creees');

  await post('chat_messages',[
    {user_id:uid,conversation_id:id1,thread:'math',role:'user',text:'Explique les fractions'},
    {user_id:uid,conversation_id:id1,thread:'math',role:'tutor',text:'Une fraction, c est...'},
  ]);
  await post('chat_messages',[
    {user_id:uid,conversation_id:id2,thread:'histoire',role:'user',text:'Que s est-il passe en 1804 ?'},
  ]);

  console.log('\nLA LISTE');
  l=await rpc('conversation_list',{p_limit:20});
  ok(Array.isArray(l.b)&&l.b.length===2,'les deux apparaissent',`${l.b?.length}`);
  const first=l.b?.[0];
  ok(first?.id===id2,'la plus recente est en tete (trigger updated_at)');
  ok(first?.message_count===1,'compte de messages correct',`${first?.message_count}`);
  ok(!!first?.preview,'un apercu est fourni',JSON.stringify(first?.preview));

  console.log('\nMESSAGES D UNE CONVERSATION');
  const m=await get(`chat_messages?conversation_id=eq.${id1}&select=role,text&order=created_at`);
  ok(Array.isArray(m.b)&&m.b.length===2,'les 2 messages du fil maths',`${m.b?.length}`);

  console.log('\nSUPPRESSION EN CASCADE');
  await del(`conversations?id=eq.${id1}`);
  const rest=await get(`chat_messages?conversation_id=eq.${id1}&select=id`);
  ok(Array.isArray(rest.b)&&rest.b.length===0,'les messages partent avec la conversation');
  l=await rpc('conversation_list',{p_limit:20});
  ok(l.b?.length===1,'il en reste une');

  console.log('\nCONVERSATION D UN AUTRE ELEVE');
  const other=await sql(`insert into public.conversations (user_id, subject_id, title) select id,'math','Secret' from auth.users where id <> '${uid}' limit 1 returning id`);
  if(Array.isArray(other)&&other[0]?.id){
    const spy=await get(`conversations?id=eq.${other[0].id}&select=title`);
    ok(Array.isArray(spy.b)&&spy.b.length===0,'invisible');
    await sql(`delete from public.conversations where id='${other[0].id}'`);
  } else console.log('  (aucun autre compte — ignore)');
} finally {
  await sql(`delete from auth.users where id='${uid}'`);
  console.log('\nCompte de test supprime.');
}
console.log(bad===0?'\nTout est conforme.':`\n${bad} echec(s).`);
process.exit(bad===0?0:1);
