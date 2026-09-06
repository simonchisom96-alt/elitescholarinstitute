/* ESI Quiz Studio Results Engine V10
 * Results intelligence: question/section mastery, timing, trends, Nexus metrics,
 * misconception summaries and learner-friendly review plans. API-free.
 */
(()=>{'use strict';
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(+n)?+n:0));
const num=(x,d=0)=>Number.isFinite(+x)?+x:d;
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const arr=x=>Array.isArray(x)?x:[];
const text=x=>String(x??'').trim();
const quiz=()=>window.state&&Array.isArray(window.state.questions)?window.state:read('esi.quiz2.draft',{questions:[],sections:[]});
const results=()=>arr(read('esi.quiz2.results',[])).concat(arr(read('esi.lastQuizResult',[])));
function normalize(r){if(!r||typeof r!=='object')return null;const answers=arr(r.answers||r.responses||r.questionResults||r.items);let correct=num(r.correct,r.correctAnswers);let total=num(r.total,r.totalQuestions||answers.length);if(!correct&&answers.length)correct=answers.filter(a=>a?.correct===true||a?.isCorrect===true).length;if(!total&&answers.length)total=answers.length;const score=clamp(r.score!=null?r.score:(total?correct/total*100:0));return {id:r.id||r.quizId||Date.now(),score,total,correct,time:num(r.time,r.duration||r.elapsed),answers,at:r.at||r.timestamp||Date.now()};}
function latest(){const rs=results().map(normalize).filter(Boolean);return rs.sort((a,b)=>num(b.at)-num(a.at))[0]||normalize(read('esi.quiz.result',null));}
function questionStats(r){const qs=arr(quiz().questions);return qs.map((q,i)=>{const a=r?.answers?.find(x=>String(x.questionId??x.id??x.qid)===String(q.id))||r?.answers?.[i]||{};const ok=a.correct===true||a.isCorrect===true||a.score>0;const t=num(a.time,a.timeSpent);return {id:q.id||'q'+i,index:i+1,text:text(q.text||q.question||q.title)||'Question '+(i+1),correct:ok,time:t,score:clamp(a.score!=null?a.score:(ok?100:0)),difficulty:num(q.difficulty,50),section:q.sectionId||q.section||'',tags:arr(q.tags),misconception:a.misconception||a.errorType||null};});}
function sections(stats){const map={};stats.forEach(s=>{const k=s.section||'General';(map[k]??={name:k,total:0,correct:0,time:0});map[k].total++;map[k].correct+=s.correct?1:0;map[k].time+=s.time});return Object.values(map).map(x=>({...x,accuracy:x.total?x.correct/x.total*100:0,avgTime:x.total?x.time/x.total:0}));}
function timing(stats){const t=stats.map(x=>x.time).filter(x=>x>0);if(!t.length)return {answered:stats.length,total:0,average:0,fastest:0,slowest:0};return {answered:stats.length,total:t.reduce((a,b)=>a+b,0),average:t.reduce((a,b)=>a+b,0)/t.length,fastest:Math.min(...t),slowest:Math.max(...t)};}
function mastery(stats){if(!stats.length)return 0;const accuracy=stats.reduce((a,b)=>a+b.score,0)/stats.length;const completed=stats.filter(x=>x.correct).length/stats.length*100;return clamp(accuracy*.7+completed*.3);}
function nexus(r,stats){const accuracy=num(r?.score,mastery(stats));const times=timing(stats);const speed=times.average?clamp(100-(times.average/60)*20):70;const consistency=stats.length?clamp(100-(Math.max(...stats.map(x=>x.score))-Math.min(...stats.map(x=>x.score)))*.35):70;const difficulty=stats.length?clamp(stats.reduce((a,b)=>a+b.difficulty,0)/stats.length):50;const m=mastery(stats);const vals=[speed,accuracy,difficulty,consistency,m];const mean=vals.reduce((a,b)=>a+b,0)/vals.length;const spread=Math.max(...vals)-Math.min(...vals);return {speed:Math.round(speed),accuracy:Math.round(accuracy),difficulty:Math.round(difficulty),consistency:Math.round(consistency),mastery:Math.round(m),score:Math.round(clamp(mean-spread*.12))};}
function trend(){const rs=results().map(normalize).filter(Boolean).sort((a,b)=>num(a.at)-num(b.at));return rs.slice(-10).map((r,i)=>({attempt:i+1,score:Math.round(r.score),time:r.time}));}
function review(stats){return stats.filter(x=>!x.correct).sort((a,b)=>b.difficulty-a.difficulty).slice(0,8).map(x=>({questionId:x.id,reason:x.misconception?'Misconception detected':'Needs review',suggestedAction:x.misconception?'Review the concept, then retry a similar question':'Retry after reviewing the explanation'}));}
function analyze(r=latest()){const stats=questionStats(r), out={available:!!r,latest:r,questions:stats,sections:sections(stats),timing:timing(stats),mastery:Math.round(mastery(stats)),trend:trend(),nexus:nexus(r,stats),review:review(stats),generatedAt:Date.now()};write('esi.quiz2.results.v10',out);window.ESIResultsV10=out;try{window.dispatchEvent(new CustomEvent('esi:results-ready',{detail:out}))}catch{};return out;}
function compare(a,b){const A=normalize(a),B=normalize(b);return {scoreDelta:Math.round(num(B?.score)-num(A?.score)),timeDelta:num(B?.time)-num(A?.time),improved:num(B?.score)>num(A?.score)};}
function report(){const o=analyze();return {summary:o.available?'Results analyzed':'No completed result found',score:o.latest?.score??0,mastery:o.mastery,sections:o.sections,nexus:o.nexus,trend:o.trend,review:o.review};}
window.ESIResultsV10={analyze,latest,questionStats,sections,timing,mastery,nexus,trend,review,compare,report};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>analyze());else analyze();
})();
