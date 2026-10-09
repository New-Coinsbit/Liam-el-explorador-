import nodemailer from 'nodemailer';

const unavailable=()=>Object.assign(new Error('El correo de recuperación está pendiente de activación.'),{status:503});
const deliveryError=()=>Object.assign(new Error('No se pudo enviar el correo. Intenta nuevamente más tarde.'),{status:503});

export function createMailer(override,{env=process.env,request=globalThis.fetch}={}){
 if(override)return {enabled:true,send:override};
 const {SMTP_HOST,SMTP_PORT='587',SMTP_USER,SMTP_PASSWORD,MAIL_FROM,APP_ORIGIN,RESEND_API_KEY}=env;
 const provider=env.MAIL_PROVIDER||(RESEND_API_KEY?'resend':SMTP_HOST?'smtp':'');
 const disabled={enabled:false,send:async()=>{throw unavailable();}};
 if(!MAIL_FROM||!APP_ORIGIN)return disabled;
 if(provider==='resend'){
  if(!RESEND_API_KEY)return disabled;
  return {enabled:true,send:async({to,subject,text})=>{
   try{
    const response=await request('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:MAIL_FROM,to:[to],subject,text})});
    if(!response.ok)throw deliveryError();
    const result=await response.json();if(typeof result.id!=='string'||!result.id)throw deliveryError();
    return {messageId:result.id};
   }catch{throw deliveryError();}
  }};
 }
 if(provider!=='smtp'||!SMTP_HOST||!/^\d+$/.test(SMTP_PORT)||Number(SMTP_PORT)<1||Number(SMTP_PORT)>65535)return disabled;
 const transport=nodemailer.createTransport({host:SMTP_HOST,port:Number(SMTP_PORT),secure:SMTP_PORT==='465',auth:SMTP_USER?{user:SMTP_USER,pass:SMTP_PASSWORD}:undefined,requireTLS:true,connectionTimeout:10000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true});
 return {enabled:true,send:({to,subject,text})=>transport.sendMail({from:MAIL_FROM,to,subject,text})};
}
