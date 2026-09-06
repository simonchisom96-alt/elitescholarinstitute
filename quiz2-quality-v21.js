/* ESI Quiz Studio Quality Gate V21 — final runtime integrity and organization checks */
(()=>{'use strict';
const names=['ESIQuizEnginesV7','ESIQuizLogicV8','ESIQuizIntelligenceV9','ESIResultsV10','ESIMediaV11','ESILiveV12','ESIPublishV13','ESISyncV14','ESISecurityV15','ESICollaborationV16','ESIAccessibilityV17','ESINotificationsV18','ESIQuizIntegrationV19','ESIQuizDiagnosticsV20'];
const emit=(n,d)=>{try{window.dispatchEvent(new CustomEvent('esi:quality:'+n,{detail:d}))}catch{}};
function scripts(){return Array.from(document.scripts||[]).map(x=>x.src||'').filter(Boolean)}
function duplicateScripts(){const a=scripts(),seen=new Map(),dupes=[];a.forEach(src=>{const k=src.split('/').pop();if(!k)return;if(seen.has(k))dupes.push(k);else seen.set(k,1)});return dupes}
function credentialScan(){const blob=scripts().join('\n');const re=/(AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,})/g;return(blob.match(re)||[]).length}
function run(){const tests=[];const add=(name,ok,detail='')=>tests.push({name,ok:Boolean(ok),detail});
 names.forEach(n=>add(n.replace(/^ESI/,'').replace(/V\d+$/,''),!!window[n]));
 const dup=duplicateScripts();add('No duplicate engine script tags',dup.length===0,dup.join(', '));
 add('No credential-like client script strings',credentialScan()===0,'Credential-like matches: '+credentialScan());
 const rt=window.ESIQuizIntegrationV19?.audit?.();add('Runtime integration audit',!!rt?.ok,rt?JSON.stringify(rt.checks):'No runtime state available');
 const diag=window.ESIQuizDiagnosticsV20?.summary?.();add('Diagnostics engine available',!!diag&&typeof diag.ok==='boolean',diag?JSON.stringify(diag):'Unavailable');
 const result={ok:tests.every(x=>x.ok),passed:tests.filter(x=>x.ok).length,total:tests.length,tests,at:Date.now()};window.ESIQuizQualityV21=result;emit('complete',result);return result}
function summary(){const r=window.ESIQuizQualityV21||run();return{ok:r.ok,passed:r.passed,total:r.total,failed:r.tests.filter(x=>!x.ok)}}
window.ESIQuizQualityV21={run,summary};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();