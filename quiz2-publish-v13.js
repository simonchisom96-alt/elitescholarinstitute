/* ESI Quiz Studio Publish Engine V13 — API-free */
(()=>{'use strict';
const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const id=()=>`pub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
function current(){return window.state&&typeof window.state==='object'?clone(window.state):clone(read('esi.quiz2.draft',{title:'Untitled Quiz',questions:[],sections:[]}));}
function validate(q=current()){const e=[],w=[];if(!String(q.title||'').trim())w.push('Quiz has no title');if(!Array.isArray(q.questions)||!q.questions.length)e.push('Quiz must contain at least one question');(q.questions||[]).forEach((x,i)=>{if(!String(x.text||x.prompt||'').trim())e.push(`Question ${i+1} has no prompt`);if(x.options&&Array.isArray(x.options)&&x.options.length<2)w.push(`Question ${i+1} has fewer than two options`)});return{ready:!e.length,errors:e,warnings:w};}
function snapshot(label='Draft'){return{id:id(),label:String(label),createdAt:Date.now(),quiz:current()};}
function versions(){return read('esi.quiz2.publish.v13',[]);}
function saveVersion(label='Snapshot'){const v=[...versions(),snapshot(label)].slice(-30);write('esi.quiz2.publish.v13',v);return v[v.length-1];}
function preview(){const q=current();return{mode:'preview',title:q.title,description:q.description,questions:clone(q.questions||[]),settings:clone(q.settings||{})};}
function publish(meta={}){const gate=validate();if(!gate.ready)return{ok:false,gate};const v=saveVersion(meta.label||'Published');write('esi.quiz2.published.v13',v);return{ok:true,version:v,gate};}
function rollback(versionId){const v=versions().find(x=>x.id===versionId);if(!v)return{ok:false,error:'Version not found'};write('esi.quiz2.draft',clone(v.quiz));return{ok:true,version:v};}
function exportPackage(){const p={schema:'ESI-QUIZ-PACKAGE-V13',createdAt:Date.now(),quiz:current(),versions:versions()};return JSON.stringify(p,null,2);}
function importPackage(raw){let p;try{p=typeof raw==='string'?JSON.parse(raw):raw}catch{return{ok:false,error:'Invalid package'}};if(!p||!p.quiz)return{ok:false,error:'Missing quiz payload'};write('esi.quiz2.draft',clone(p.quiz));return{ok:true,quiz:clone(p.quiz)};}
window.ESIPublishV13={validate,snapshot,versions,saveVersion,preview,publish,rollback,exportPackage,importPackage};
})();