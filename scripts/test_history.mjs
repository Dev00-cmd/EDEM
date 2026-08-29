// Vérifie l'historique de quiz de bout en bout, sur un vrai compte.
import fs from 'fs';
const REF='qoyebljuvrxhcroxapys';
const URL=`https://${REF}.supabase.co`;
const ANON='sb_publishable_n6OP5Pk7jd-537IPq0UoKg_DJuB-6rv';
const token=(fs.readFileSync('.env.secrets','utf8').match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m)||[])[1]?.trim();
let bad=0;
const ok=(c,l,d='')=>{console.log(`  ${c?'ok   ':'ECHEC'} ${l}${d?` — ${d}`:''}`);if(!c)bad++;};
const sql=(q)=>fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:q})}).then(r=>r.json());

const email=`hist-${Date.now()}@edem-test.local`;
const up=await fetch(`${URL}/auth/v1/signup`,{method:'POST',headers:{apikey:ANON,'Content-Type':'application/json'},body:JSON.stringify({email,password:'MotDePasseTest2026!',data:{name:'Hist'}})}).then(r=>r.json());
const jwt=up.access_token, uid=up.user.id;
const H={apikey:ANON,Authorization:`Bearer ${jwt}`,'Content-Type':'application/json'};
const fn=(b)=>fetch(`${URL}/functions/v1/tutor`,{method:'POST',headers:H,body:JSON.stringify(b)}).then(async r=>({s:r.status,b:await r.json()}));
const rpc=(n,a)=>fetch(`${URL}/rest/v1/rpc/${n}`,{method:'POST',headers:H,body:JSON.stringify(a)}).then(async r=>({s:r.status,b:await r.json().catch(()=>null)}));
const rest=(p)=>fetch(`${URL}/rest/v1/${p}`,{headers:H}).then(async r=>({s:r.status,b:await r.json().catch(()=>null)}));

try{
  console.log('AVANT LE QUIZ');
  let h=await rpc('quiz_history',{p_limit:10});
  ok(Array.isArray(h.b)&&h.b.length===0,'historique vide au depart');

  console.log('\nGENERATION');
  const q=await fn({action:'quiz',subjectId:'histoire',difficulty:'moyen',prompt:'Genere un quiz de 3 questions.\n- Matiere : Histoire\n- Classe : 8e AF\n- Langue : francais'});
  const sid=q.b.sessionId, qs=q.b.questions||[];
  ok(!!sid&&qs.length>0,'quiz genere avec session',`${qs.length} questions`);

  console.log('\nFUITE AVANT REMISE');
  const leak=await rest(`quiz_sessions?id=eq.${sid}&select=questions`);
  ok(Array.isArray(leak.b)&&leak.b.length===0,'les reponses ne sont PAS lisibles avant remise');

  console.log('\nREMISE');
  // On repond juste aux deux premieres, faux a la troisieme.
  const picks=qs.map((x,i)=> i<2 ? x.answer : (x.answer+1)%4);
  const g=await rpc('grade_quiz',{p_session_id:sid,p_picked:picks});
  ok(g.s===200,'corrige',`${g.b?.pct}%`);
  ok(g.b?.session_id===sid,'l identifiant de session est renvoye');

  console.log('\nAPRES REMISE');
  h=await rpc('quiz_history',{p_limit:10});
  ok(Array.isArray(h.b)&&h.b.length===1,'le quiz apparait dans l historique');
  ok(h.b?.[0]?.subject_id==='histoire','bonne matiere');
  ok(h.b?.[0]?.total===qs.length,'bon nombre de questions',`${h.b?.[0]?.total}`);

  const det=await rest(`quiz_sessions?id=eq.${sid}&select=questions,picked,score_pct`);
  ok(Array.isArray(det.b)&&det.b.length===1,'le detail est maintenant lisible');
  ok((det.b?.[0]?.questions||[]).length===qs.length,'les enonces sont conserves');
  ok((det.b?.[0]?.picked||[]).length===qs.length,'les choix de l eleve sont conserves');
  ok(!!(det.b?.[0]?.questions||[])[0]?.explanation,'les explications sont conservees');

  console.log('\nQUIZ D UN AUTRE ELEVE');
  const other=await sql(`insert into public.quiz_sessions (user_id, subject_id, difficulty, answers, questions, graded_at, score_pct) select id,'math','moyen','[]'::jsonb,'[]'::jsonb,now(),50 from auth.users where id <> '${uid}' limit 1 returning id`);
  if(Array.isArray(other)&&other[0]?.id){
    const spy=await rest(`quiz_sessions?id=eq.${other[0].id}&select=questions`);
    ok(Array.isArray(spy.b)&&spy.b.length===0,'invisible');
    await sql(`delete from public.quiz_sessions where id='${other[0].id}'`);
  } else console.log('  (aucun autre compte — ignore)');
} finally {
  await sql(`delete from auth.users where id='${uid}'`);
  console.log('\nCompte de test supprime.');
}
console.log(bad===0?'\nTout est conforme.':`\n${bad} echec(s).`);
process.exit(bad===0?0:1);
