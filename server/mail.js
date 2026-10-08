import nodemailer from 'nodemailer';
export function createMailer(override){
 if(override)return {enabled:true,send:override};
 const {SMTP_HOST,SMTP_PORT='587',SMTP_USER,SMTP_PASSWORD,MAIL_FROM,APP_ORIGIN}=process.env;
 if(!SMTP_HOST||!MAIL_FROM||!APP_ORIGIN)return {enabled:false,send:async()=>{throw Object.assign(new Error('El correo de recuperación está pendiente de activación.'),{status:503});}};
 const transport=nodemailer.createTransport({host:SMTP_HOST,port:Number(SMTP_PORT),secure:SMTP_PORT==='465',auth:SMTP_USER?{user:SMTP_USER,pass:SMTP_PASSWORD}:undefined,requireTLS:true,connectionTimeout:10000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true});
 return {enabled:true,send:message=>transport.sendMail({from:MAIL_FROM,...message})};
}
