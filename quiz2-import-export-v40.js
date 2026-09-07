/* ESI Quiz Studio Import/Export V40
   Safe client-side interchange layer. Heavy PDF/DOCX conversion stays behind the backend boundary.
*/
(function(){'use strict';
function text(v){return String(v??'').replace(/^\uFEFF/,'')}
function csvParse(csv){const rows=[];let row=[],cell='',quote=false;for(let i=0;i<text(csv).length;i++){const c=csv[i],n=csv[i+1];if(c==='"'&&quote&&n==='"'){cell+='"';i++;continue}if(c==='"'){quote=!quote;continue}if(c===','&&!quote){row.push(cell);cell='';continue}if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(v=>String(v).trim()!==''))rows.push(row);row=[];cell='';continue}cell+=c}if(cell!==''||row.length){row.push(cell);rows.push(row)}return rows}
function csvString(rows=[]){return rows.map(r=>r.map(v=>{const s=String(v??'');return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}).join(',')).join('\r\n')}
function questionsFromCSV(csv){const rows=csvParse(csv);if(!rows.length)return[];const head=rows.shift().map(x=>String(x).trim().toLowerCase());return rows.map(r=>{const q={};head.forEach((h,i)=>q[h]=r[i]??'');return{prompt:q.question||q.prompt||'',type:q.type||'multiple_choice',options:[q.option1,q.option2,q.option3,q.option4].filter(Boolean),correct:q.correct||'',explanation:q.explanation||''}}).filter(x=>x.prompt)}
function quizJSON(state){return JSON.stringify({format:'ESI-Quiz',version:40,exportedAt:Date.now(),quiz:state||{}},null,2)}
function importJSON(raw){const x=typeof raw==='string'?JSON.parse(raw):raw;return x?.quiz||x}
function gift(quiz={}){return(quiz.questions||[]).map((q,i)=>`::Q${i+1}:: ${String(q.prompt||'').replace(/\n/g,' ')} {${(q.options||[]).map(o=>`~${o}`).join(' ')} =${q.correct||''}}`).join('\n\n')}
function download(name,content,type='text/plain'){const b=new Blob([content],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);return true}
function exportCSV(quiz){const rows=[['question','type','option1','option2','option3','option4','correct','explanation'],...(quiz?.questions||[]).map(q=>[q.prompt,q.type,(q.options||[])[0],(q.options||[])[1],(q.options||[])[2],(q.options||[])[3],q.correct,q.explanation])];return csvString(rows)}
function audit(){return{version:40,formats:['ESI-JSON','CSV','GIFT'],serverFormats:['PDF','DOCX','PPTX','QTI','SCORM','xAPI'],safeClient:true}}
window.ESIQuizImportExportV40={csvParse,csvString,questionsFromCSV,quizJSON,importJSON,gift,download,exportCSV,audit};
})();
