import {randomUUID} from 'node:crypto';
import {clean,imageValid,rating} from './security.js';
import {validateQuestions,publicQuestion,validAnswer,isCorrect} from './questions.js';
import {generateQuestions} from './ai.js';
export function learningRoutes(ctx){
 const {app,db,row,many,auth,adult,limit,fail,profile}=ctx;
 const accessSql='(a.owner_id IS NULL OR a.owner_id=$1 OR a.id IN (SELECT sa.activity_id FROM shared_activities sa JOIN memberships m ON m.group_id=sa.group_id WHERE m.user_id=$1))';
 const getActivity=(id,user)=>row(`SELECT a.* FROM activities a WHERE a.id=$2 AND ${accessSql}`,[user,id]);
 async function pathFor(user){
  const query=`SELECT a.id,a.title,a.subject,a.topic,a.goal,a.grade_min,a.grade_max,a.reviewed,a.owner_id IS NULL AS general,a.owner_id=$1 AS owned,COALESCE(t.stars,0) AS stars FROM activities a LEFT JOIN attempts t ON t.activity_id=a.id AND t.user_id=$1 WHERE ${accessSql} AND ($2::int IS NULL OR a.owner_id=$1 OR $2 BETWEEN a.grade_min AND a.grade_max) ORDER BY a.path_order,a.id`;
  let list;
  if(user.role==='student'){
   list=await db.transaction(async tx=>{
    await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);
    const available=(await tx.query(query,[user.id,user.grade])).rows;
    const saved=(await tx.query('SELECT activity_id,position FROM learning_path WHERE user_id=$1 ORDER BY position',[user.id])).rows;
    const positions=new Map(saved.map(x=>[x.activity_id,x.position]));let last=saved.at(-1)?.position||0;
    for(const item of available.filter(a=>a.reviewed))if(!positions.has(item.id)){
     const position=++last;await tx.query('INSERT INTO learning_path(user_id,activity_id,position) VALUES($1,$2,$3)',[user.id,item.id,position]);positions.set(item.id,position);
    }
    return available.sort((a,b)=>(positions.get(a.id)||Infinity)-(positions.get(b.id)||Infinity));
   });
  }else list=await many(query,[user.id,null]);
  let blocked=false,position=0;
  return list.map(a=>{const locked=!a.reviewed||(user.role==='student'&&blocked&&a.stars<2);if(a.reviewed){position++;if(a.stars<2)blocked=true;}return {...a,position:a.reviewed?position:null,locked};});
 }
 async function playable(user,id){const path=await pathFor(user),item=path.find(a=>a.id===id);if(!item||!item.reviewed)fail(404,'Actividad no disponible para este alumno.');if(item.locked)fail(403,'Completa el nivel anterior con dos estrellas para abrir este reto.');return getActivity(id,user.id);}
 app.get('/api/activities',auth,async(req,res)=>res.json(await pathFor(req.user)));
 app.get('/api/activities/:id',auth,async(req,res)=>{
  let a=await getActivity(req.params.id,req.user.id);if(!a)fail(404,'Actividad no encontrada.');
  const review=req.query.review==='1'&&a.owner_id===req.user.id&&(req.user.role==='teacher'||req.user.role==='parent'||new Date(req.session.parent_until)>new Date());
  if(!review)a=await playable(req.user,a.id);
  res.json({id:a.id,title:a.title,subject:a.subject,topic:a.topic,goal:a.goal,gradeMin:a.grade_min,gradeMax:a.grade_max,reviewed:a.reviewed,questions:review?a.questions:a.questions.map(publicQuestion)});
 });
 function metadata(b){const min=Number(b.gradeMin??0),max=Number(b.gradeMax??11);if(String(b.gradeMin??0).trim()===''||String(b.gradeMax??11).trim()===''||!Number.isInteger(min)||!Number.isInteger(max)||min<0||max>11||min>max)fail(400,'Revisa los grados de la actividad.');return {min,max,title:clean(b.title,120)||'Mi actividad',subject:clean(b.subject,60),topic:clean(b.topic,120)};}
 app.post('/api/activities',auth,adult,async(req,res)=>{if(!validateQuestions(req.body.questions))fail(400,'Revisa las 3 a 12 preguntas, sus respuestas y explicaciones.');const m=metadata(req.body),id=randomUUID();if(!m.subject)fail(400,'Selecciona una materia.');await db.query('INSERT INTO activities(id,owner_id,title,subject,questions,reviewed,grade_min,grade_max,topic) VALUES($1,$2,$3,$4,$5,true,$6,$7,$8)',[id,req.user.id,m.title,m.subject,JSON.stringify(req.body.questions),m.min,m.max,m.topic]);res.status(201).json({id});});
 app.put('/api/activities/:id/draft',auth,adult,async(req,res)=>{const a=await row('SELECT * FROM activities WHERE id=$1 AND owner_id=$2',[req.params.id,req.user.id]);if(!a)fail(404,'Actividad no encontrada.');if(a.reviewed)fail(409,'Una actividad publicada conserva sus preguntas para proteger el historial. Crea una nueva versión.');if(!validateQuestions(req.body.questions))fail(400,'Revisa todas las preguntas y respuestas.');const m=metadata(req.body);await db.query('UPDATE activities SET title=$1,subject=$2,topic=$3,grade_min=$4,grade_max=$5,questions=$6 WHERE id=$7',[m.title,m.subject,m.topic,m.min,m.max,JSON.stringify(req.body.questions),a.id]);res.json({ok:true});});
 app.post('/api/activities/:id/review',auth,adult,async(req,res)=>{const a=await row('SELECT * FROM activities WHERE id=$1 AND owner_id=$2',[req.params.id,req.user.id]);if(!a)fail(404,'Actividad no encontrada.');if(!validateQuestions(a.questions))fail(400,'Corrige las preguntas antes de publicar.');await db.query("UPDATE activities SET path_order=CASE WHEN reviewed THEN path_order ELSE nextval(pg_get_serial_sequence('activities','path_order')) END,reviewed=true WHERE id=$1",[a.id]);res.json({ok:true});});
 app.post('/api/activities/:id/attempt',auth,async(req,res)=>{
  if(req.body.profileId&&req.body.profileId!==req.user.public_id)fail(409,'Este intento pertenece a otro alumno. Vuelve a su perfil para guardarlo.');
  if(req.user.role==='parent')fail(403,'Selecciona primero el perfil del alumno.');
  const a=await playable(req.user,req.params.id),answers=req.body.answers;
  if(!Array.isArray(answers)||answers.length!==a.questions.length||answers.some((v,i)=>!validAnswer(a.questions[i],v)))fail(400,'Responde todas las preguntas.');
  const submission=clean(req.body.submissionId,80)||randomUUID();
  const correct=a.questions.filter((q,i)=>isCorrect(q,answers[i])).length;
  let result={...rating(correct,a.questions.length),correct,total:a.questions.length,feedback:a.questions.map((q,i)=>({correct:isCorrect(q,answers[i]),prompt:q.prompt,explanation:q.explanation}))};
  await db.transaction(async tx=>{
   // A user-row lock makes retries and simultaneous submissions atomic.
   await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   const previous=(await tx.query('SELECT * FROM attempt_history WHERE user_id=$1 AND submission_id=$2',[req.user.id,submission])).rows[0];
   if(previous){if(previous.activity_id!==a.id||JSON.stringify(previous.answers)!==JSON.stringify(answers))fail(409,'Este intento ya fue guardado con otras respuestas.');result=previous.result;return;}
   await tx.query('INSERT INTO attempt_history(id,user_id,activity_id,submission_id,answers,result) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),req.user.id,a.id,submission,JSON.stringify(answers),JSON.stringify(result)]);
   await tx.query('INSERT INTO attempts(user_id,activity_id,stars,score) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,activity_id) DO UPDATE SET stars=GREATEST(attempts.stars,EXCLUDED.stars),score=GREATEST(attempts.score,EXCLUDED.score)',[req.user.id,a.id,result.stars,result.score]);
  });res.json({...result,profile:await profile(req.user,req.session)});
 });
 app.post('/api/reinforcement',auth,adult,limit('ai',6,3600000),async(req,res)=>{
  if(!imageValid(req.body.image))fail(400,'Sube una foto JPG, PNG o WebP de hasta 3 MB.');
  const subject=clean(req.body.subject,60),goal=clean(req.body.goal,80)||'Repasar la clase',grade=Number(req.user.grade??req.body.grade);
  if(!['Preparar evaluación','Repasar la clase','Reforzar errores'].includes(goal)||!Number.isInteger(grade)||grade<0||grade>11)fail(400,'Selecciona un objetivo y grado válidos.');
  let focus=[];if(goal==='Reforzar errores')focus=(await many('SELECT h.result FROM attempt_history h JOIN activities a ON a.id=h.activity_id WHERE h.user_id=$1 AND a.subject=$2 ORDER BY h.created_at DESC LIMIT 3',[req.user.id,subject])).flatMap(h=>h.result.feedback.filter(f=>!f.correct).map(f=>f.explanation)).slice(0,8);
  const questions=await generateQuestions(req.body.image,subject,grade,goal,focus),id=randomUUID(),title=clean(req.body.title,120)||'Refuerzo escolar';
  await db.query('INSERT INTO activities(id,owner_id,title,subject,questions,grade_min,grade_max,goal) VALUES($1,$2,$3,$4,$5,$6,$6,$7)',[id,req.user.id,title,subject,JSON.stringify(questions),grade,goal]);
  res.status(201).json({id,title,subject,questions,reviewed:false,goal,gradeMin:grade,gradeMax:grade});
 });
 app.post('/api/rewards/:id/claim',auth,adult,async(req,res)=>{const r=await row('SELECT * FROM rewards WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);if(!r)fail(404,'Premio no encontrado.');const total=await row('SELECT COALESCE(SUM(stars),0)::int AS stars FROM attempts WHERE user_id=$1',[req.user.id]);if(total.stars<r.target)fail(409,'Todavía no se ha alcanzado la meta de estrellas.');await db.query('UPDATE rewards SET claimed=true,claimed_at=COALESCE(claimed_at,now()),claimed_by=COALESCE(claimed_by,$1) WHERE id=$2',[(await row('SELECT parent_id FROM family_links WHERE child_id=$1',[req.user.id]))?.parent_id||req.user.id,r.id]);res.json({ok:true});});
 app.get('/api/progress',auth,async(req,res)=>{
  let user=req.user;
  if(req.query.child){const child=await row('SELECT u.* FROM users u JOIN family_links f ON f.child_id=u.id WHERE f.parent_id=$1 AND u.public_id=$2',[req.user.id,clean(req.query.child)]);if(req.user.role!=='parent'||!child)fail(403,'Solo puedes consultar a tus hijos vinculados.');user=child;}
  const history=await many('SELECT h.id,h.activity_id,h.result,h.created_at,a.title,a.subject,a.topic FROM attempt_history h JOIN activities a ON a.id=h.activity_id WHERE h.user_id=$1 ORDER BY h.created_at DESC LIMIT 100',[user.id]);
  const subjects=await many('SELECT a.subject,COUNT(h.id)::int AS attempts,ROUND(AVG((h.result->>\'score\')::numeric))::int AS average FROM attempt_history h JOIN activities a ON a.id=h.activity_id WHERE h.user_id=$1 GROUP BY a.subject ORDER BY a.subject',[user.id]);
  const path=await pathFor(user);res.json({profile:await profile(user),subjects,history,pending:path.filter(a=>a.reviewed&&a.stars<2).map(({id,title,subject,locked})=>({id,title,subject,locked})),historyLimit:100});
 });
 return {getActivity,pathFor,playable};
}
