import test from 'node:test';
import assert from 'node:assert/strict';
import webpush from 'web-push';
import {createMailer} from '../server/mail.js';
import {generateQuestions} from '../server/ai.js';
import {pushConfig} from '../server/notifications.js';

test('mail: HTTPS delivery, explicit provider selection and safe failures',async()=>{
 const env={MAIL_PROVIDER:'resend',RESEND_API_KEY:'test-secret',MAIL_FROM:'Liam <liam@example.invalid>',APP_ORIGIN:'https://liam.example.invalid'};
 const message={to:'adult@example.invalid',subject:'Recupera tu acceso',text:'Enlace de prueba'};
 let sent;
 const mail=createMailer(null,{env,request:async(url,options)=>{sent={url,options};return {ok:true,json:async()=>({id:'message-test-id'})};}});
 assert.equal(mail.enabled,true);assert.deepEqual(await mail.send({...message,from:'forged@example.invalid',attachments:[{path:'/etc/passwd'}]}),{messageId:'message-test-id'});
 assert.equal(sent.url,'https://api.resend.com/emails');assert.equal(sent.options.headers.Authorization,'Bearer test-secret');
 assert.deepEqual(JSON.parse(sent.options.body),{from:env.MAIL_FROM,to:[message.to],subject:message.subject,text:message.text});
 for(const settings of [{},{...env,MAIL_FROM:''},{...env,RESEND_API_KEY:''},{...env,MAIL_PROVIDER:'typo'},{...env,MAIL_PROVIDER:'smtp',SMTP_HOST:''}])assert.equal(createMailer(null,{env:settings}).enabled,false);
 for(const request of [async()=>({ok:false,status:429}),async()=>{throw new Error('SECRET PROVIDER DETAILS');},async()=>({ok:true,json:async()=>({})}),async()=>({ok:true,json:async()=>{throw new SyntaxError('bad provider response');}})]){
  await assert.rejects(createMailer(null,{env,request}).send(message),e=>e.status===503&&!/SECRET|test-secret|provider response/.test(e.message));
 }
});

test('AI: structured photo results, refusal, incomplete, timeout and malformed output',async()=>{
 const env={OPENAI_API_KEY:'unit-test-key'};
 const questions=Array.from({length:3},()=>({prompt:'¿Cuánto es 1 + 1?',options:['1','2','3','4'],answer:1,explanation:'Uno más uno es dos.'}));
 const completed=questions=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({questions})}]}]});
 const run=request=>generateQuestions('data:image/png;base64,test','Matemáticas',0,'Repasar la clase',[],{env,request});
 let payload;
 assert.deepEqual(await run(async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');payload=JSON.parse(options.body);return {ok:true,json:async()=>completed(questions)};}),questions);
 assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);assert.match(payload.input[0].content[0].text,/Grado: 0/);
 const cases=[
  [{status:'incomplete',output:completed(questions).output},422,/incompleto/],
  [{status:'completed',output:[{content:[{type:'refusal',refusal:'do not expose this'}]}]},422,/actividad escolar/],
  [completed([]),422,/claridad/],
  [completed(Array.from({length:9},()=>questions[0])),422,/claridad/],
  [completed([{...questions[0],answer:8},...questions.slice(1)]),422,/claridad/],
  [{output:[{content:[{type:'output_text',text:'{broken'}]}]},422,/válida/],
  [null,502,/respondió/],
  [{status:'failed',error:{message:'PRIVATE'}},503,/completar/]
 ];
 for(const [result,status,pattern] of cases)await assert.rejects(run(async()=>({ok:true,json:async()=>result})),e=>e.status===status&&pattern.test(e.message));
 await assert.rejects(run(async()=>{throw Object.assign(new Error('timeout'),{name:'TimeoutError'});}),e=>e.status===504&&/imágenes siguen/.test(e.message));
 await assert.rejects(run(async()=>{throw new Error('secret upstream text');}),e=>e.status===503&&!/secret/.test(e.message));
 await assert.rejects(run(async()=>({ok:false,status:401})),e=>e.status===503);
 await assert.rejects(generateQuestions('', '', 0, '', [],{env:{},request:()=>{throw new Error('must not call');}}),e=>e.status===503);
});

test('push: incomplete, malformed and mismatched key pairs stay disabled',()=>{
 const a=webpush.generateVAPIDKeys(),b=webpush.generateVAPIDKeys();
 const env={VAPID_SUBJECT:'https://liam.example.invalid',VAPID_PUBLIC_KEY:a.publicKey,VAPID_PRIVATE_KEY:a.privateKey};
 assert.equal(pushConfig(env).enabled,true);
 for(const settings of [{},{...env,VAPID_SUBJECT:'http://example.invalid'},{...env,VAPID_PRIVATE_KEY:'bad'},{...env,VAPID_PRIVATE_KEY:b.privateKey}])assert.deepEqual(pushConfig(settings),{enabled:false});
});
