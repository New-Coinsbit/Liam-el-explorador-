import {readFile,readdir} from 'node:fs/promises';
import pg from 'pg';
import {practice} from './seed.js';
export async function openDatabase(){
 let db;
 if(process.env.DATABASE_URL){
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:10000});
  db={query:(q,p)=>pool.query(q,p),close:()=>pool.end(),transaction:async fn=>{const client=await pool.connect();try{await client.query('BEGIN');const value=await fn(client);await client.query('COMMIT');return value;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}};
 }else if(process.env.NODE_ENV!=='production'){
  const {PGlite}=await import('@electric-sql/pglite');const local=new PGlite(process.env.LOCAL_DATA_DIR||'.local-data');await local.waitReady;
  db={query:(q,p)=>local.query(q,p),exec:q=>local.exec(q),transaction:fn=>local.transaction(fn),close:()=>local.close()};
 }else return null;
 const schema=await readFile(new URL('./schema.sql',import.meta.url),'utf8');
 if(db.exec)await db.exec(schema);else await db.query(schema);
 await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())');
 const folder=new URL('./migrations/',import.meta.url);
 for(const name of (await readdir(folder)).filter(n=>n.endsWith('.sql')).sort()){
  if((await db.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name])).rows.length)continue;
  const sql=await readFile(new URL(name,folder),'utf8');
  await db.transaction(async tx=>{if(tx.exec)await tx.exec(sql);else await tx.query(sql);await tx.query('INSERT INTO schema_migrations(name) VALUES($1)',[name]);});
 }
 for(const a of practice)await db.query('INSERT INTO activities(id,title,subject,questions,reviewed,grade_min,grade_max,topic) VALUES($1,$2,$3,$4,true,$5,$6,$7) ON CONFLICT(id) DO NOTHING',[a.id,a.title,a.subject,JSON.stringify(a.questions),a.gradeMin??0,a.gradeMax??11,a.topic||a.title]);
 return db;
}
