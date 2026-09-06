/* ESI Quiz Studio — production utility layer
 * Safe by design: no provider API keys or secrets are stored here.
 * This module is intentionally standalone so the HTML shell can adopt
 * production adapters incrementally without exposing credentials.
 */
(function(){
'use strict';
const VERSION='1.0.0';
const NS='esi.quiz2.production';
const clone=v=>JSON.parse(JSON.stringify(v));
const now=()=>Date.now();
const uid=(p='id')=>p+'_'+now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
const safe=(v,f='')=>v==null?f:String(v);
function normalizeQuiz(input){
 const q=clone(input||{});
 q.title=safe(q.title,'Untitled Quiz'); q.description=safe(q.description,'');
 q.questions=Array.isArray(q.questions)?q.questions:[];
 q.sections=Array.isArray(q.sections)?q.sections:[];
 q.bank=Array.isArray(q.bank)?q.bank:[];
 q.media=Array.isArray(q.media)?q.media:[];
 q.settings=Object.assign({time:0,pass:50,attempts:1,showScore:true,showAnswers:false,showExplain:true,randomQ:false,randomA:false,back:true,anonymous:false,leaderboard:false},q.settings||{});
 q.questions=q.questions.map((x,i)=>Object.assign({id:uid('q'),type:'multiple_choice',text:'',points:1,required:false,options:[],pairs:[],answer:'',explanation:'',hint:'',tags:[],media:'',interaction:''},x,{id:x.id||uid('q'),order:i}));
 return q;
}
function validate(quiz){
 const issues=[]; const q=normalizeQuiz(quiz);
 if(!q.title.trim())issues.push({level:'error',code:'TITLE_EMPTY',message:'Quiz title is empty.'});
 q.questions.forEach((x,i)=>{
   if(!x.text.trim())issues.push({level:'error',code:'PROMPT_EMPTY',index:i,message:`Question ${i+1} has no prompt.`});
   if((x.points??0)<0)issues.push({level:'error',code:'NEGATIVE_POINTS',index:i,message:`Question ${i+1} has negative points.`});
   if(['multiple_choice','multiple_select','true_false','yes_no'].includes(x.type)&&!x.options.some(o=>o.correct))issues.push({level:'error',code:'NO_KEY',index:i,message:`Question ${i+1} has no answer key.`});
   if(x.type==='multiple_choice'&&x.options.filter(o=>safe(o.text).trim()).length<2)issues.push({level:'warning',code:'FEW_OPTIONS',index:i,message:`Question ${i+1} has fewer than two filled options.`});
   if(x.type==='matching'&&x.pairs.some(p=>!safe(p.left).trim()||!safe(p.right).trim()))issues.push({level:'warning',code:'MATCH_EMPTY',index:i,message:`Question ${i+1} contains an incomplete matching pair.`});
 });
 return {ok:!issues.some(x=>x.level==='error'),issues};
}
function scoreQuestion(q,response){
 const type=q.type, opts=q.options||[];
 if(type==='multiple_select'){const a=(Array.isArray(response)?response:[]).slice().sort(),b=opts.map((o,i)=>o.correct?i:null).filter(i=>i!=null).sort();return JSON.stringify(a)===JSON.stringify(b)?1:0}
 if(['multiple_choice','true_false','yes_no','poll'].includes(type)){const key=opts.findIndex(o=>o.correct);return String(response)===String(key)||String(response)===String(opts[key]?.text)?1:0}
 if(type==='numeric'){const n=Number(response),key=Number(q.answer);const tol=Number(q.tolerance??0);return Number.isFinite(n)&&Number.isFinite(key)&&Math.abs(n-key)<=tol?1:0}
 if(type==='short_text'||type==='fill_blank'){const a=safe(response).trim().toLowerCase(),keys=Array.isArray(q.answers)?q.answers:[q.answer];return keys.some(k=>safe(k).trim().toLowerCase()===a)?1:0}
 if(type==='ordering'){return Array.isArray(response)&&response.join('|')===opts.map((_,i)=>i).join('|')?1:0}
 return null;
}
function grade(quiz,responses){
 const q=normalizeQuiz(quiz); let earned=0,total=0,graded=0;
 const items=q.questions.map((x,i)=>{const p=Math.max(0,Number(x.points)||0);total+=p;const r=scoreQuestion(x,responses?.[x.id]??responses?.[i]);if(r==null)return {id:x.id,index:i,graded:false,points:p};graded++;const e=p*r;earned+=e;return {id:x.id,index:i,graded:true,correct:r===1,points:p,earned:e};});
 const percent=total?earned/total*100:0;
 return {earned,total,percent,passed:percent>=Number(q.settings.pass||0),graded,items};
}
function shuffle(a,rng=Math.random){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function buildSession(quiz,opts={}){const q=normalizeQuiz(quiz),seed=opts.seed||Math.random().toString(36).slice(2);let questions=q.questions.slice();if(q.settings.randomQ)questions=shuffle(questions);return{id:uid('session'),seed,createdAt:now(),mode:q.mode||'classic',quizTitle:q.title,questionIds:questions.map(x=>x.id),expiresAt:q.settings.time?now()+q.settings.time*60000:null,attempt:Number(q.settings.attempts||1)};}
function exportCSV(quiz){const q=normalizeQuiz(quiz);const rows=[['No','Type','Question','Points','Required','Answer','Options','Tags']];q.questions.forEach((x,i)=>rows.push([i+1,x.type,x.text,x.points,x.required?'yes':'no',x.answer,(x.options||[]).map(o=>(o.correct?'*':'')+o.text).join(' | '),(x.tags||[]).join(' | ')]));return rows.map(r=>r.map(v=>'"'+safe(v).replace(/"/g,'""')+'"').join(',')).join('\n');}
function download(text,name,type='text/plain'){const b=new Blob([text],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),500);}
function storage(){return {save(k,v){localStorage.setItem(NS+'.'+k,JSON.stringify(v))},load(k,f){try{return JSON.parse(localStorage.getItem(NS+'.'+k))??f}catch(_){return f}},remove(k){localStorage.removeItem(NS+'.'+k)}}}
function createQueue(){let q=[];return {push(x){q.push(Object.assign({id:uid('job'),createdAt:now()},x));return q[q.length-1]},all(){return clone(q)},next(){return q.find(x=>x.status!=='done'&&x.status!=='failed')},complete(id){const x=q.find(x=>x.id===id);if(x)x.status='done'},fail(id,error){const x=q.find(x=>x.id===id);if(x){x.status='failed';x.error=safe(error,'Unknown error')}},clear(){q=[]}}}
function secureAdapter(url,opts={}){if(!/^https:\/\//i.test(url))throw new Error('Secure adapter requires HTTPS.');return fetch(url,Object.assign({method:'POST',headers:{'Content-Type':'application/json'}},opts));}
function csvToRows(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&quoted&&n==='"'){cell+='"';i++;continue}if(c==='"'){quoted=!quoted;continue}if(c===','&&!quoted){row.push(cell);cell='';continue}if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(x=>x.trim()))rows.push(row);row=[];continue}cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
function importCSV(text){const rows=csvToRows(text);if(!rows.length)return normalizeQuiz({});const h=rows[0].map(x=>x.trim().toLowerCase());const idx=k=>h.indexOf(k);const questions=rows.slice(1).map(r=>{const q={id:uid('q'),type:r[idx('type')]||'multiple_choice',text:r[idx('question')]||'',points:Number(r[idx('points')]||1),required:r[idx('required')]==='yes',answer:r[idx('answer')]||'',tags:(r[idx('tags')]||'').split('|').map(x=>x.trim()).filter(Boolean),options:[]};const os=(r[idx('options')]||'').split('|').filter(Boolean);q.options=os.map(x=>({text:x.replace(/^\*/,''),correct:x.startsWith('*')}));return q});return normalizeQuiz({title:'Imported Quiz',questions});}
window.ESIQuizEngine={VERSION,uid,normalizeQuiz,validate,scoreQuestion,grade,shuffle,buildSession,exportCSV,download,storage,createQueue,secureAdapter,csvToRows,importCSV};
})();
