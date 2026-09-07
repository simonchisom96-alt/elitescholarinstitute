/* ESI Quiz Studio Media V33 */
(function(){'use strict';
const MAX=15*1024*1024;
const TYPES=['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/wav','audio/webm'];
function check(file){if(!file)return{ok:false,error:'No file selected',maxBytes:MAX};if(Number(file.size||0)>MAX)return{ok:false,error:'Maximum status upload is 15 MB.',maxBytes:MAX,size:file.size};if(file.type&&!TYPES.includes(file.type))return{ok:false,error:'Unsupported media type.',maxBytes:MAX,type:file.type};return{ok:true,maxBytes:MAX,size:Number(file.size||0),type:file.type||''}}
function input(opts={}){const x=document.createElement('input');x.type='file';x.accept=opts.accept||'image/*,video/*';if(opts.multiple)x.multiple=true;x.addEventListener('change',()=>{[...(x.files||[])].forEach(f=>{const r=check(f);if(!r.ok)alert(r.error)})});return x}
function warning(){return '15 MB maximum per status image/video.'}
window.ESIQuizMediaV33={MAX,TYPES,check,input,warning};
})();