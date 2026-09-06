/* ESI Quiz Studio Accessibility & Localization Engine V17 */
(()=>{'use strict';
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch{return d}};const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return false}catch{return false}};
let s=read('esi.quiz2.a11y.v17',{reducedMotion:false,largeText:false,highContrast:false,keyboardMode:false,language:'en',direction:'ltr'});
function save(){write('esi.quiz2.a11y.v17',s);try{document.documentElement.dataset.esiReducedMotion=s.reducedMotion?'1':'0';document.documentElement.dataset.esiLargeText=s.largeText?'1':'0';document.documentElement.dataset.esiContrast=s.highContrast?'1':'0'}catch{};try{window.dispatchEvent(new CustomEvent('esi:a11y-change',{detail:{...s}}))}catch{};return{...s}}
function set(name,value){if(!(name in s))return{ok:false};s[name]=value;return save()}
function language(lang){const l=String(lang||'en').toLowerCase();s.language=l.slice(0,10);s.direction=['ar','he','fa','ur'].includes(s.language)?'rtl':'ltr';return save()}
function audit(){const issues=[];document.querySelectorAll('button,input,textarea,select,a,[role]').forEach((e,i)=>{if(!e.getAttribute('aria-label')&&!e.textContent.trim()&&!e.getAttribute('title')&&['BUTTON','A'].includes(e.tagName))issues.push({index:i,type:'missing-name'});if(e.tagName==='IMG'&&!e.getAttribute('alt'))issues.push({index:i,type:'missing-alt'})});return{ok:!issues.length,issues,count:issues.length}}
function apply(){return save()}
window.ESIAccessibilityV17={set,language,audit,apply,get state(){return{...s}}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();