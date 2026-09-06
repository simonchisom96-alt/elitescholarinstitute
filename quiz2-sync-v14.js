/* ESI Quiz Studio Sync Engine V14 — offline queue + deterministic conflict handling */
(()=>{'use strict';
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch{return d}};const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
const key='esi.quiz2.sync.v14';const base=()=>read(key,{revision:0,queue:[],applied:[],conflicts:[]});let s=base();
const id=()=>`op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
function persist(){write(key,s);return clone(s)}
function enqueue(type,payload,baseRevision=s.revision){const op={id:id(),type,payload:clone(payload),baseRevision:Number(baseRevision)||0,createdAt:Date.now(),status:'pending'};if(!s.queue.some(x=>x.id===op.id))s.queue.push(op);return persist()}
function apply(op,handler){if(!op||s.applied.includes(op.id))return{ok:true,duplicate:true};if(op.baseRevision!==s.revision){const c={id:id(),opId:op.id,reason:'revision-conflict',baseRevision:op.baseRevision,currentRevision:s.revision,at:Date.now()};s.conflicts.push(c);op.status='conflict';persist();return{ok:false,conflict:c}};const result=typeof handler==='function'?handler(clone(op.payload),op):true;s.revision++;s.applied.push(op.id);s.queue=s.queue.filter(x=>x.id!==op.id);op.status='applied';persist();return{ok:true,result,revision:s.revision}}
function flush(handler){const out=[];for(const op of [...s.queue])out.push(apply(op,handler));return out}
function resolve(conflictId,choice='keep-local'){const c=s.conflicts.find(x=>x.id===conflictId);if(!c)return{ok:false,error:'Conflict not found'};c.resolution=choice;c.resolvedAt=Date.now();return persist()}
function status(){return{revision:s.revision,pending:s.queue.filter(x=>x.status==='pending').length,conflicts:s.conflicts.filter(x=>!x.resolution).length,applied:s.applied.length}}
function exportQueue(){return JSON.stringify(s)}
window.ESISyncV14={enqueue,apply,flush,resolve,status,exportQueue,persist,get state(){return clone(s)}};
})();