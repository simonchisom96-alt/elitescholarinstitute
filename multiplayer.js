/* ================================================================
   ELITE SCHOLAR INSTITUTE — multiplayer.js
   All Firebase config/API keys and app logic previously inline in
   quiz.html now live here instead. Loaded once, at the same point in
   the document where the main app script used to run (end of body,
   after every HTML element it references already exists).
   NOTE ON API KEYS: Firebase *client* web API keys are not secret by
   design — they identify the project, they don't grant access by
   themselves. The database rules are what actually protect data
   (see firebase_rules_updated.json). Moving them here is good
   organization, not a security fix by itself — real protection was,
   and remains, the rules file.
   ================================================================ */

    // ===== MULTIPLAYER Firebase project — presence, friends, chat, rooms, matches, tournaments, MP leaderboard =====
    const firebaseConfig = {
  apiKey: "AIzaSyCj-zqKRfpcGVRvfq6vJtk9OXLp0G4n7BU",
  authDomain: "project-76067.firebaseapp.com",
  projectId: "project-76067",
  storageBucket: "project-76067.firebasestorage.app",
  messagingSenderId: "625734125340",
  appId: "1:625734125340:web:66f843e0b1e41f7baa5cd9"
};
    try{
        firebase.initializeApp(firebaseConfig);
    }catch(e){
        console.error('[Firebase] main app init failed:', e);
    }
    const mdb = firebase.database();
    const mauth = firebase.auth();

    // ===== QUESTION BANK Firebase — SAME shared bank the single-player app reads/writes.
    // Multiplayer only ever READS full question objects (incl. answer) here, then strips
    // the answer before broadcasting to the match node. It never writes answers to a path
    // both match players can read pre-reveal — see mp_matches/$mid/answerKey in the rules.
    const qbConfig = {
      apiKey: "AIzaSyCEk7uQ48p4roHr0UCtiLrkOiRDDNjOlNo",
      authDomain: "elitequestionbank-d6b6d.firebaseapp.com",
      databaseURL: "https://elitequestionbank-d6b6d-default-rtdb.firebaseio.com/",
      projectId: "elitequestionbank-d6b6d",
      storageBucket: "elitequestionbank-d6b6d.firebasestorage.app",
      messagingSenderId: "1095669206258",
      appId: "1:1095669206258:web:bf3c00ccc812175f98546b"
    };
    const qbApp = firebase.initializeApp(qbConfig, "questionBank");
    const qbDb = qbApp.database();

    async function qbGetBank(subject, subMode, diff){
        let path = `elite_subject_database/${subject}/${subMode}/${diff}/question_bank`;
        try{
            let snap = await qbDb.ref(path).get();
            return snap.exists() ? (snap.val()||{}) : {};
        }catch(e){
            console.warn('[QuestionBank] read failed for "'+path+'":', e && e.message);
            return {};
        }
    }
    function qbSaveQuestions(subject, subMode, diff, questions){
        if(!questions || !questions.length) return;
        let path = `elite_subject_database/${subject}/${subMode}/${diff}/question_bank`;
        let updates = {};
        questions.forEach(q=>{
            if(!q || !q.q || !Array.isArray(q.options)) return;
            updates[hashQ(q.q)] = {subject:subject, q:q.q, options:q.options, answer:q.answer, explanation:q.explanation};
        });
        if(!Object.keys(updates).length) return;
        qbDb.ref(path).update(updates).catch(e=>console.warn('[QuestionBank] save failed for "'+path+'":', e && e.message));
    }


    /* ===== GATE (single-player + multiplayer-unlock landing) SCRIPT ===== */

const gateFirebaseConfig = {
  apiKey: "AIzaSyBsSYE9AjKH1KIyGKIbnvxTFhIfNa6Ise8",
  authDomain: "passcode-3de5f.firebaseapp.com",
  databaseURL: "https://passcode-3de5f-default-rtdb.firebaseio.com",
  projectId: "passcode-3de5f",
  storageBucket: "passcode-3de5f.firebasestorage.app",
  messagingSenderId: "266272652210",
  appId: "1:266272652210:web:ea10c960415222f1e4c2ab"
};
const gateApp = firebase.initializeApp(gateFirebaseConfig, "gateApp"); // named app — avoids colliding with multiplayer's default app
const db = gateApp.database();

const WHATSAPP_NUMBER = "2348108391083";
const UNLOCK_STORAGE_KEY = "elite_mp_unlock_v6";
const UNLOCK_KEY_STORAGE = "elite_mp_key_v6";

function gateToast(msg){
    const t = document.getElementById('gateToast');
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._t);
    t._t = setTimeout(()=> t.style.display='none', 3000);
}
function showStatus(msg, type){
    const box = document.getElementById('statusBox');
    box.style.display = 'block';
    box.className = 'status-box ' + type;
    box.textContent = msg;
}
function generateRandomKey(len=28){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for(let i=0;i<len;i++) s += chars.charAt(Math.floor(Math.random()*chars.length));
    return s.match(/.{1,4}/g).join('-');
}
function isUnlocked(){
    return localStorage.getItem(UNLOCK_STORAGE_KEY) === 'true' && localStorage.getItem(UNLOCK_KEY_STORAGE);
}

function updateUI(){
    const multiBtn = document.getElementById('multiBtn');
    const multiSub = document.getElementById('multiSub');
    const multiTitle = document.getElementById('multiTitle');
    const multiIcon = document.getElementById('multiIcon');
    const multiArrow = document.getElementById('multiArrow');
    const unlockCard = document.getElementById('unlockCard');
    const statusPill = document.getElementById('statusPill');
    const faq = document.getElementById('faqSection');

    if(isUnlocked()){
        multiBtn.className = 'mode-btn multi';
        multiIcon.textContent = '👥';
        multiTitle.textContent = 'Multiplayer';
        multiSub.textContent = 'Unlocked • Tap to enter';
        multiArrow.textContent = '→';
        unlockCard.style.display = 'none';
        statusPill.className = 'status-pill unlocked';
        statusPill.textContent = '👥 Multiplayer Unlocked';
        faq.style.display = 'none';
    } else {
        multiBtn.className = 'mode-btn unlock';
        multiIcon.textContent = '👥';
        multiTitle.textContent = 'Multiplayer';
        multiSub.textContent = 'Locked • ₦3,500 one-time';
        multiArrow.textContent = '→';
        unlockCard.style.display = 'block';
        statusPill.className = 'status-pill locked';
        statusPill.textContent = '🔒 Multiplayer Locked';
        faq.style.display = 'block';
    }
}

function handleMultiClick(){
    if(isUnlocked()){
        enterMultiplayer();
    } else {
        document.getElementById('unlockCard').scrollIntoView({behavior:'smooth', block:'start'});
        gateToast('Complete the steps below to unlock');
    }
}

// Swaps from the gate screen to the embedded multiplayer app in place — no page navigation,
// so there is no separate multiplayer.html URL left for anyone to bypass to directly.
function enterMultiplayer(){
    document.getElementById('gateScreen').style.display = 'none';
    document.getElementById('multiplayerApp').style.display = 'block';
    window.scrollTo(0,0);
}

function openWhatsApp(){
    const text = encodeURIComponent(
`Hello, Elite Scholar Institute! I am ready to the unlock the *Multiplayer* quiz mode.

I am ready to pay for the ₦3,500 passcode unlock key. 

Please send me the one-time passcode key after payment. Thank you.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
    gateToast('Redirecting to WhatsApp...');
}

async function redeemPasscode(){
    const input = document.getElementById('passcodeInput');
    let code = (input.value || '').trim().toUpperCase().replace(/\s+/g,'');
    if(!code){
        showStatus('Please enter the passcode first.', 'err');
        return;
    }

    showStatus('Checking passcode...', 'info');

    try{
        const ref = db.ref('passcodes/' + code);
        const snap = await ref.once('value');

        if(!snap.exists()){
            showStatus('Invalid passcode. Please check and try again.', 'err');
            return;
        }

        const data = snap.val();
        if(data.status === 'used'){
            showStatus('This passcode has already been used.', 'err');
            return;
        }

        const unlockKey = generateRandomKey(28);

        await ref.update({
            status: 'used',
            usedAt: Date.now(),
            unlockKey: unlockKey
        });

        document.getElementById('generatedKey').textContent = unlockKey;
        document.getElementById('unlockKeyBox').style.display = 'block';
        document.getElementById('unlockKeyInput').value = unlockKey;

        showStatus('Passcode accepted! Copy the Unlock Key below, then click (Unlock Multiplayer Now).', 'ok');
        gateToast('Passcode redeemed successfully');

        input.value = '';
        input.disabled = true;

    }catch(err){
        console.error(err);
        showStatus('Network error. Check your internet and try again.', 'err');
    }
}

function copyUnlockKey(){
    const key = document.getElementById('generatedKey').textContent;
    if(!key) return;
    navigator.clipboard.writeText(key).then(()=>{
        gateToast('Unlock Key copied!');
    }).catch(()=>{
        const ta = document.createElement('textarea');
        ta.value = key;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        gateToast('Unlock Key copied!');
    });
}

async function applyUnlockKey(){
    const key = (document.getElementById('unlockKeyInput').value || '').trim();
    if(!key || key.length < 10){
        showStatus('Please paste a valid Unlock Key.', 'err');
        return;
    }

    localStorage.setItem(UNLOCK_STORAGE_KEY, 'true');
    localStorage.setItem(UNLOCK_KEY_STORAGE, key);

    showStatus('🎉 Multiplayer unlocked successfully on this device!', 'ok');
    gateToast('');
    updateUI();

    setTimeout(()=>{
        window.scrollTo({top:0, behavior:'smooth'});
    }, 900);
}

updateUI();

    

    /* ===== MULTIPLAYER APP SCRIPT (unchanged) ===== */

// ============================================================================================
// ===== CORE HELPERS & STATE ================================================================
// ============================================================================================
const $=id=>document.getElementById(id);
document.addEventListener('contextmenu',e=>e.preventDefault());

const ALL=["Mathematics","English","Physics","Chemistry","Biology","Economics","Government","Literature","Commerce","Accounting","Geography","CRS","History","Civic Education","Further Maths","Agric Science","Computer Studies","Marketing"];
const hashQ=s=>{let h=0;for(let ci=0;ci<s.length;ci++){h=((h<<5)-h)+s.charCodeAt(ci);h|=0}return h.toString(36)};
const toast=m=>{let e=$('toast');if(!e)return;e.textContent=m;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',2600)};

// The countdown timer and answer-speed scoring compare against Firebase SERVER timestamps —
// if a player's device clock is off (common on phones), Date.now() alone would make the
// countdown run fast/slow or wrong. This tracks the live offset so we always compute the
// same "now" the server would, regardless of the device's own clock.
let serverTimeOffset=0;
mdb.ref('.info/serverTimeOffset').on('value', snap=>{ serverTimeOffset = snap.val()||0; });
const serverNow=()=>Date.now()+serverTimeOffset;
const uid4=()=>Math.random().toString(36).slice(2,6).toUpperCase();
const fmtTime=ts=>{if(!ts)return'';let d=new Date(ts);let now=new Date();let sameDay=d.toDateString()===now.toDateString();return sameDay?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString();};

// ============================================================================================
// ===== SOUND EFFECTS — small synthesized tones via WebAudio, no external audio files needed.
// ============================================================================================
let sfxCtx=null, sfxEnabled=(localStorage.getItem('mp_sfx')!=='off');
function ensureSfxCtx(){ if(!sfxCtx){ try{ sfxCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return sfxCtx; }
function playSfx(type){
    if(!sfxEnabled)return;
    let ctx=ensureSfxCtx(); if(!ctx)return;
    if(ctx.state==='suspended') ctx.resume().catch(()=>{});
    let now=ctx.currentTime;
    function tone(freq,start,dur,vol,wave){
        try{
            let osc=ctx.createOscillator(), gain=ctx.createGain();
            osc.type=wave||'sine'; osc.frequency.value=freq;
            gain.gain.setValueAtTime(0.0001,now+start);
            gain.gain.linearRampToValueAtTime(vol,now+start+0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001,now+start+dur);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(now+start); osc.stop(now+start+dur+0.03);
        }catch(e){}
    }
    if(type==='correct'){ tone(660,0,0.12,0.16); tone(880,0.09,0.16,0.16); }
    else if(type==='wrong'){ tone(220,0,0.28,0.14,'sawtooth'); }
    else if(type==='tick'){ tone(1000,0,0.05,0.05); }
    else if(type==='click'){ tone(700,0,0.05,0.07); }
    else if(type==='matchstart'){ tone(440,0,0.1,0.12); tone(660,0.1,0.1,0.12); tone(880,0.2,0.16,0.12); }
    else if(type==='victory'){ [523,659,784,1047].forEach((f,i)=>tone(f,i*0.12,0.22,0.14)); }
    else if(type==='defeat'){ tone(392,0,0.2,0.12,'sawtooth'); tone(311,0.16,0.32,0.12,'sawtooth'); }
    else if(type==='notify'){ tone(880,0,0.08,0.1); tone(1108,0.08,0.12,0.1); }
    else if(type==='powerup'){ tone(500,0,0.06,0.1); tone(750,0.06,0.06,0.1); tone(1000,0.12,0.1,0.1); }
    else if(type==='levelup'){ [523,659,784,1047,1319].forEach((f,i)=>tone(f,i*0.1,0.28,0.15)); }
}
function toggleSfx(){
    sfxEnabled=!sfxEnabled;
    localStorage.setItem('mp_sfx', sfxEnabled?'on':'off');
    let btn=$('sfxBtn'); if(btn) btn.textContent=sfxEnabled?'🔊':'🔇';
    if(sfxEnabled) playSfx('click');
}
document.addEventListener('DOMContentLoaded',()=>{ let btn=$('sfxBtn'); if(btn) btn.textContent=sfxEnabled?'🔊':'🔇'; });
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// Strips invisible Unicode bidi-control characters (LRM/RLM/embedding/override/isolate marks).
// A stray RTL-override character sneaking in from a keyboard/clipboard is the only realistic way
// plain Latin text like "Simon" can visually render backwards as "nomiS" — this neutralizes that
// regardless of where it came from, on every message before it's ever stored or shown.
function sanitizeChatText(s){
    return String(s==null?'':s).replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,'').trim();
}
function shuffleArr(a){for(let k=a.length-1;k>0;k--){let j=Math.floor(Math.random()*(k+1));[a[k],a[j]]=[a[j],a[k]];}return a;}
function shuffleOptionsFisherYates(q){
    if(!q||!Array.isArray(q.options))return;
    let correctVal=q.options[q.answer];
    for(let k=q.options.length-1;k>0;k--){let j=Math.floor(Math.random()*(k+1));[q.options[k],q.options[j]]=[q.options[j],q.options[k]];}
    q.answer=q.options.indexOf(correctVal);
}

// ---- Global runtime state ----
let ME=null;                 // {uid, username, elo, wins, losses, ...} — my profile row
let MY_UID=null;
let currentScreen='hub';
let friendsCache={};         // uid -> {username, online, ...}
let friendReqIncoming={};
let friendReqSent={};
let notifCache={};
let chatOpenWith=null;       // uid of friend whose chat modal is open
let chatModalUnsub=null;
let selSubjects={qm:new Set(['Mathematics']), cr:new Set(['Mathematics']), ch:new Set(['Mathematics']), ct:new Set(['Mathematics'])};
let crMode='spak';
let currentRoomId=null;
let roomUnsub=null;
let lastRoomPlayers={};
let lastRoomHostUid=null;
let lobbyChatUnsub=null;
let quickMatchTicket=null;
let quickMatchUnsub=null;
let currentMatchId=null;
let lastMatchSnapshot=null;
let lastSoundedResultId=null;
let matchUnsub=null;
let matchPresenceUnsub=null;
let matchLocalState={};      // per-match local (non-synced) helper state: timer handle, myLocked, etc.
let currentTournamentId=null;
let tournamentUnsub=null;
let pendingIncomingChallengeId=null;
// Same storage key/shape as the single-player page, so a question flagged during a multiplayer
// match shows up in the exact same "Flagged Questions" review bank there (same origin = shared
// localStorage) instead of living in a separate, disconnected list.
const FLAG_KEY='elite_flagged_v54';
const getFlagged=()=>{try{let v=localStorage.getItem(FLAG_KEY);if(!v)return[];let p=JSON.parse(v);return Array.isArray(p)?p:[]}catch(e){localStorage.removeItem(FLAG_KEY);return[]}};
const saveFlagged=a=>{try{localStorage.setItem(FLAG_KEY,JSON.stringify(a))}catch(e){}};
function isMatchQFlagged(q){ if(!q)return false; return getFlagged().some(x=>x&&x.q===q.q); }
function toggleMatchFlag(){
    let q=matchLocalState.currentQData;
    if(!q){toast('No question loaded');return;}
    let arr=getFlagged();
    let found=arr.findIndex(x=>x&&x.q===q.q);
    if(found===-1){ arr.push({subject:q.subject, q:q.q, options:[...q.options], answer:(q.answer!==undefined?q.answer:-1), explanation:q.explanation||''}); toast('🚩 Flagged'); }
    else{ arr.splice(found,1); toast('Flag removed'); }
    saveFlagged(arr);
    let btn=$('mFlagBtn'); if(btn) btn.classList.toggle('flagged', found===-1);
}
const ELO_TIERS=[
[0,'Bronze','#cd7f32','🥉'],[300,'Silver','#c0c0c0','🥈'],[600,'Gold','#ffd700','🥇'],
[950,'Platinum','#7fdfff','💠'],[1300,'Diamond','#8a7fff','💎'],[1700,'Gem','#00e6a8','💍'],
[2150,'Ruby','#ff4d6d','❤️‍🔥'],[2650,'Emerald','#00c46e','✴️'],[3200,'Sapphire','#3b82f6','☢️'],
[3800,'Legend','#ff9f1c','⚜️'],[4450,'Mythic','#c837ab','☣️'],[5150,'Titan','#8b5cf6','⚔️'],
[5900,'Immortal','#ff4757','🔱'],[6700,'Celestial','#fff1a8','🥷'],[7600,'Elite Master','#ffffff','🫅']
];
function tierFor(elo){let t=ELO_TIERS[0];for(let x of ELO_TIERS){if(elo>=x[0])t=x;}return t;}
function eloInfo(){toast('It goes up when you beat someone rated near or above you, and down when you lose. Each tier needs a bigger jump than the last, so climbing gets harder the further you go — 15 tiers from Bronze all the way to Elite Master.');}

// ============================================================================================
// ===== AUTH, PROFILE, USERNAME, PRESENCE ====================================================
// ============================================================================================
const AVATAR_POOL=['🎓','🦞','🐯','🦅','🐺','🦁','🧑‍🎤','🧕','🔥','🌟','🧠','🚀','👤','🏹','🧑‍⚕️',
    '🧚','🧛','🧒','🐊','🕴️','🧔','💃','🐐','🧟','👼','🧓','👳','🦇','🕺','🧑‍💼',
    '👹','👺','☠️','👻','🤖','⛄','🧑‍🎄','😈','👽','🎃','🥷','🧙','🧛','🦸','🦹','🧞','🧌','🧑‍🎓'];

// ---- Quick-match "no opponent yet" backup fill. Picks a human-sounding name so the wait
// never feels like it dead-ends; never touches mp_users, so it can never appear on the
// leaderboard or receive/send a friend request — it simply doesn't exist as an account. ----
const BOT_NAMES=['Simon','Solomon','Samuel','Daniel','David','Michael','Isaac','Josh','Aaron','Noah',
    'Lucas','Ethan','Ryan','Mason','Caleb','Leo','Ade','Femi','Chidi','Tunde',
    'Uche','Chikito','Omar','Amara','Zara','Christus','Bennedeth','Nina','Sofia','Elena',
    'Grace','Hannah','Ruth','Esther','Priya','Anika','Wei','Mitchelle','Tanjiro','Yuki',
    'Marcus','Victor','Diego','Chioma','Felix','Oscar','Jonah','Nonso','Theo','Milo',
    'Oliver','George','Henry','William','Charlotte','Nduka','Emily','Sophie','Jack','Harry',
    'Alfie','Freddie','Poppy','Zenistu','Florence','Arthur','Edward','Rossie','Eleanor','Thomas',
    'James','John','Robert','Charles','Joseph','Andrew','Benjamin','Matthew','Christopher','Nathan',
    'Adam','Peter','Patrick','Alexander','Dominic','Sebastian','Nicholas','Jacob','Owen','Toby',
    'Max','Louis','Hugo','Rupert','Julian','Vincent','Gregory','Timothy','Stephen','Anthony',
     'Emmanuel','Samuel','David','Joseph','Daniel','Joshua','Isaac','John','Peter','Paul',
     
'Solomon','Israel','Jacob','Michael','Gabriel','Victor','Godwin','Goodluck','Gift','Favour',

'Blessing','Patience','Peace','Grace','Glory','Precious','Destiny','Success','Wisdom','Prosper',

'Miracle','Rejoice','Praise','Divine','Testimony','Marvelous','Excellent','Faith','Hope','Charity',

'Emeka','Chinedu','Tunde','Femi','Segun','Wale','Kunle','Dayo','Seyi','Lekan',

'Chidi','Uche','Nonso','Obinna','Ikenna','Chidera','Kelechi','Tochukwu','Chibuzor','Ebuka',

'Ayodeji','Olamide','Oluwaseun','Temitope','Damilola','Opeyemi','Ayodele','Adebayo','Kayode','Babatunde',

'Chiamaka','Adaeze','Ngozi','Nneka','Chinyere','Ifeoma','Amara','Chidinma','Ogechukwu','Ujunwa',

'Zainab','Aisha','Fatima','Hauwa','Amina','Maryam','Hadiza','Halima','Safiya','Hafsat',

'Ibrahim','Musa','Abubakar','Usman','Yusuf','Aliyu','Sani','Nasir','Bello','Garba',

'Abdul','Abdullahi','Mustapha','Haruna','Suleiman','Ismail','Kabiru','Idris','Yakubu','Umar',
    'Nathaniel','Elliot','Spencer','Wesley','Barnaby','Elizabeth','Margaret','Victoria','Alice','Beatrice',
    'Jessica','Olivia','Isabella','Lily','Rose','Muzan','Daisy','Ivy','Willow','Chloe'];
const BOT_AVATARS=['🧑‍🎓','☣️','🔱','🌠','🐯','🔥','⚜️','🦁','🧑‍🏫','🥷','🧙','🦸','🦞','🐯','🦅','🐺','🦁','🧑‍🎤','🧕','🔥','👱','🧠','🚀','👤','🏹','🧑‍⚕️',
    '🧚','🧛','🧒','🤵','🕴️','🧔','💃','🐐','🧟','👼','🧓','👳','🦇','🕺','🧑‍💼',
    '👹','👺','☠️','👻','🤖','⛄','🧑‍🎄','😈','👽','🎃','🥷','🧙','🧛','🦸','🦹','🧞','🧌','🧑‍🎓'];
function pickBotIdentity(){
    let name=BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)];
    let avatarEmoji=BOT_AVATARS[Math.floor(Math.random()*BOT_AVATARS.length)];
    return {name, avatarEmoji};
}
// Newcomers (fewer than 5 recorded matches) get a friendly ~70% bot. Beyond that the bot
// scales with the player's own ELO so it stays a fair, relevant practice opponent instead of
// always being trivially easy or impossibly hard.
function computeBotAccuracy(){
    let matches=((ME&&ME.wins)||0)+((ME&&ME.losses)||0)+((ME&&ME.draws)||0);
    if(!ME || !ME.elo || matches<5) return 0.70;
    let acc=0.45 + ((ME.elo-800)/1200)*0.45;
    return Math.max(0.35, Math.min(0.92, acc));
}

function setupPresence(uid){
    let myPresRef=mdb.ref('mp_presence/'+uid);
    mdb.ref('.info/connected').on('value', snap=>{
        let dot=$('net'); if(!dot)return;
        if(snap.val()===true){
            myPresRef.onDisconnect().update({online:false,lastChanged:firebase.database.ServerValue.TIMESTAMP}).then(()=>{
                myPresRef.update({online:true,lastChanged:firebase.database.ServerValue.TIMESTAMP});
            });
            dot.style.background='var(--success)';
        }else{
            dot.style.background='var(--error)';
        }
    });
}

async function initAfterAuth(uid){
    MY_UID=uid;
    let splash=$('loadingSplash'); if(splash) splash.style.display='none';
    setupPresence(uid);
    let snap=await mdb.ref('mp_users/'+uid).get();
    if(snap.exists()){
        ME=snap.val();ME.uid=uid;
        onProfileReady();
        checkDailyStreak();
    }else{
        $('nameModal').classList.add('active');
    }
}

// ============================================================================================
// ===== DAILY LOGIN STREAK — small coin bonus for coming back day after day, capped so it
// never becomes a bigger reward source than actually playing matches. =======================
// ============================================================================================
function todayStr(d){ d=d||new Date(); return d.toISOString().slice(0,10); }
async function checkDailyStreak(){
    if(!ME)return;
    let today=todayStr();
    if(ME.lastLoginDate===today)return; // already claimed today
    let yesterday=todayStr(new Date(Date.now()-86400000));
    let newStreak = (ME.lastLoginDate===yesterday) ? (ME.loginStreak||0)+1 : 1;
    let bonus = Math.min(20 + (newStreak-1)*10, 200);
    let updates={lastLoginDate:today, loginStreak:newStreak, coins:(ME.coins||0)+bonus};
    try{
        await mdb.ref('mp_users/'+MY_UID).update(updates);
        Object.assign(ME, updates);
        renderHubProfileHeader();
        setTimeout(()=>{
            toast(`🔥 Day ${newStreak} streak! +${bonus} coins`);
            playSfx('notify');
        }, 900);
    }catch(e){ console.warn('[Streak] update failed', e); }
}

async function confirmMPName(){
    let raw=$('mpNameInput').value.trim();
    let err=$('mpNameErr');
    let cleaned=raw.replace(/[^A-Za-z0-9_]/g,'').slice(0,20);
    $('mpNameInput').value=cleaned;
    if(cleaned.length<3){err.style.display='block';err.textContent='Username must be at least 3 characters.';return;}
    let lower=cleaned.toLowerCase();
    err.style.display='block';err.textContent='Checking availability…';
    try{
        let existingSnap=await mdb.ref('mp_usernames/'+lower).get();
        if(existingSnap.exists() && existingSnap.val()!==MY_UID){
            err.textContent='That username is already taken. Try another.';return;
        }
        let newProfile={
            username:cleaned, usernameLower:lower, uid:MY_UID,
            createdAt:firebase.database.ServerValue.TIMESTAMP,
            elo:0, wins:0, losses:0, draws:0, totalMatches:0,
            bestStreak:0, xp:0, level:1, coins:0,
            avatarEmoji:AVATAR_POOL[Math.floor(Math.random()*AVATAR_POOL.length)],
            achievements:{}, favoriteSubject:null
        };
        let updates={};
        updates['mp_usernames/'+lower]=MY_UID;
        updates['mp_users/'+MY_UID]=newProfile;
        await mdb.ref().update(updates);
        ME=newProfile;ME.uid=MY_UID;
        $('nameModal').classList.remove('active');
        err.style.display='none';
        toast('Welcome to the Arena, '+cleaned+'!');
        onProfileReady();
    }catch(e){
        err.textContent='Connection issue — please try again.';
        console.warn(e);
    }
}

async function changeUsername(){
    let raw=$('profNewName').value.trim();
    let cleaned=raw.replace(/[^A-Za-z0-9_]/g,'').slice(0,20);
    if(cleaned.length<3){toast('Username must be at least 3 characters.');return;}
    let lower=cleaned.toLowerCase();
    try{
        let existingSnap=await mdb.ref('mp_usernames/'+lower).get();
        if(existingSnap.exists() && existingSnap.val()!==MY_UID){toast('That username is taken.');return;}
        let updates={};
        if(ME.usernameLower) updates['mp_usernames/'+ME.usernameLower]=null;
        updates['mp_usernames/'+lower]=MY_UID;
        updates['mp_users/'+MY_UID+'/username']=cleaned;
        updates['mp_users/'+MY_UID+'/usernameLower']=lower;
        await mdb.ref().update(updates);
        ME.username=cleaned;ME.usernameLower=lower;
        $('profNewName').value='';
        toast('Username updated to '+cleaned);
        onProfileReady();
    }catch(e){toast('Could not update username right now.');}
}

function onProfileReady(){
    renderHubProfileHeader();
    renderProfileScreen();
    attachFriendsListener();
    attachNotificationsListener();
    attachIncomingChallengeListener();
    refreshPublicRooms();
    refreshTournamentsList();
    checkTrophyBadge();
    openHistoryScreen();
}

function renderHubProfileHeader(){
    if(!ME)return;
    $('myAvatar').textContent=ME.avatarEmoji||'🎓';
    $('myNameDisp').textContent=ME.username;
    $('myEloDisp').textContent=`ELO ${ME.elo} • ${ME.wins||0}W / ${ME.losses||0}L`;
    let t=tierFor(ME.elo);
    let tEl=$('myTierDisp');tEl.textContent=t[3]+' '+t[1];tEl.style.background=t[2]+'33';tEl.style.color=t[2];tEl.style.border='1px solid '+t[2];
}

function renderProfileScreen(){
    if(!ME)return;
    $('profAvatar').textContent=ME.avatarEmoji||'🎓';
    $('profName').textContent=ME.username;
    $('profName').style.cssText=nameColorStyle(ME);
    let t=tierFor(ME.elo);
    let tEl=$('profTier');tEl.textContent=t[3]+' '+t[1];tEl.style.background=t[2]+'33';tEl.style.color=t[2];tEl.style.border='1px solid '+t[2];
    let titleEl=$('profTitleBadge');
    if(titleEl){
        let titleObj=SHOP_TITLES.find(x=>x.id===ME.equippedTitle);
        titleEl.style.display=titleObj?'inline':'none';
        titleEl.textContent=titleObj?('🏷️ '+titleObj.label):'';
    }
    $('profElo').textContent=ME.elo;
    $('profWins').textContent=ME.wins||0;
    $('profLosses').textContent=ME.losses||0;
    let tot=(ME.wins||0)+(ME.losses||0)+(ME.draws||0);
    $('profWinRate').textContent=tot?Math.round((ME.wins||0)/tot*100)+'%':'0%';
    $('profStreak').textContent=ME.bestStreak||0;
    $('profMatches').textContent=ME.totalMatches||0;
    $('profXP').textContent=ME.xp||0;
    $('profLevel').textContent=ME.level||1;
    $('profCoins').textContent=ME.coins||0;
    let lsEl=$('profLoginStreak'); if(lsEl) lsEl.textContent=ME.loginStreak||0;
    let ach=ME.achievements||{};
    let names={
        first_win:'🥇 First Victory', win_streak_5:'🔥 5-Win Streak', win_streak_10:'🔥 10-Win Streak',
        perfect_match:'💯 Perfect Match', tournament_champ:'🏆 Tournament Champion',
        ten_matches:'🎖️ 10 Matches Played', fifty_matches:'🎖️ 50 Matches Played', hundred_matches:'🎖️ 100 Matches — Legend',
        team_player:'🛡️ Team Battle Winner', mvp_teammate:'⭐ MVP Teammate',
        elite_master:'👑 Elite Master Tier', platinum_tier:'💎 Platinum Tier',
        answer_streak_8:'⚡ 8-Answer Streak', coin_collector:'🪙 1000+ Coins Earned', welcome_aboard:'🎉 Welcome Aboard'
    };
    let html=Object.keys(names).map(k=>`<span class="chip-mini" style="${ach[k]?'':'opacity:.3'}">${names[k]}</span>`).join('');
    $('profAchievements').innerHTML=html||'<span class="muted" style="font-size:10px">No achievements yet.</span>';
}

function toggleAvatarPicker(){
    let p=$('avatarPicker'); if(!p)return;
    let show=p.style.display==='none';
    p.style.display=show?'block':'none';
    if(show){
        $('avatarGrid').innerHTML=AVATAR_POOL.map(a=>`<div onclick="pickAvatar('${a}')" style="font-size:20px;text-align:center;padding:6px 0;border-radius:8px;cursor:pointer;background:${a===ME.avatarEmoji?'rgba(255,215,0,0.18)':'var(--card2)'};border:1.5px solid ${a===ME.avatarEmoji?'var(--accent)':'var(--border)'}">${a}</div>`).join('');
    }
}
async function pickAvatar(a){
    await mdb.ref('mp_users/'+MY_UID+'/avatarEmoji').set(a);
    ME.avatarEmoji=a;
    renderProfileScreen();renderHubProfileHeader();
    toggleAvatarPicker();
    toast('Avatar updated!');
}

// ============================================================================================
// ===== SHOP — gives the coins earned from matches an actual use: cosmetic name colors and
// avatar frames, shown on the leaderboard, lobby, and profile. =============================
// ============================================================================================
const SHOP_TAGS=[
    {id:'tag_gold',label:'Gold',color:'#ffd700',price:1300},
    {id:'tag_red',label:'Crimson',color:'#ff4757',price:1400},
    {id:'tag_blue',label:'Azure',color:'#00bfff',price:1400},
    {id:'tag_green',label:'Emerald',color:'#00ff88',price:1600},
    {id:'tag_purple',label:'Violet',color:'#c084fc',price:1600},
    {id:'tag_rainbow',label:'Rainbow',color:'linear-gradient(90deg,#ff4757,#ffd700,#00ff88,#00bfff,#c084fc)',price:2000}
];
const SHOP_FRAMES=[
    {id:'frame_bronze',label:'Bronze Ring',color:'#cd7f32',price:1350},
    {id:'frame_silver',label:'Silver Ring',color:'#c0c0c0',price:1000},
    {id:'frame_gold',label:'Gold Ring',color:'#ffd700',price:1500},
    {id:'frame_diamond',label:'Diamond Ring',color:'#7dd3ff',price:2500}
];
const SHOP_TITLES=[
    {id:'title_challenger',label:'Challenger',price:3000},
    {id:'title_scholar',label:'Scholar',price:3000},
    {id:'title_strategist',label:'Strategist',price:4000},
    {id:'title_ace',label:'Ace',price:4500},
    {id:'title_legend',label:'Legend',price:6000},
    {id:'title_grandmaster',label:'Grandmaster',price:9000}
];
const SHOP_REACTIONS=[
    {id:'react_heart',emoji:'❤️',label:'Heart',price:5000},
    {id:'react_100',emoji:'💯',label:'100',price:8000},
    {id:'react_skull',emoji:'💀',label:'Skull',price:4500},
    {id:'react_crown',emoji:'👑',label:'Crown',price:6000},
    {id:'react_clap',emoji:'👏',label:'Clap',price:6000},
    {id:'react_mind',emoji:'🤯',label:'Mind Blown',price:8000}
];
const SHOP_EFFECTS=[
    {id:'fx_confetti',label:'Confetti',icon:'🎊',price:1000},
    {id:'fx_fireworks',label:'Fireworks',icon:'🎆',price:3000},
    {id:'fx_coins',label:'Coin Rain',icon:'🪙',price:3500},
    {id:'fx_stars',label:'Starburst',icon:'✨',price:4000}
];
function openShopModal(){
    openModal('shopModal');
    renderShop();
}
function renderShop(){
    $('shopBalance').textContent='🪙 '+(ME.coins||0)+' coins';
    let owned=ME.shopOwned||{};
    $('shopTagGrid').innerHTML=SHOP_TAGS.map(item=>{
        let isOwned=!!owned[item.id], isEq=ME.equippedNameColor===item.id;
        return `<div class="shop-item ${isOwned?'owned':''} ${isEq?'equipped':''}" onclick="${isOwned?`equipShopItem('${item.id}','nameColor')`:`buyShopItem('${item.id}','nameColor',${item.price})`}">
            <div class="swatch" style="background:${item.color}"></div>
            <div style="font-size:9.5px;font-weight:700">${item.label}</div>
            <div class="price">${isEq?'✅ Equipped':isOwned?'Tap to equip':'🪙 '+item.price}</div>
        </div>`;
    }).join('');
    $('shopFrameGrid').innerHTML=SHOP_FRAMES.map(item=>{
        let isOwned=!!owned[item.id], isEq=ME.equippedFrame===item.id;
        return `<div class="shop-item ${isOwned?'owned':''} ${isEq?'equipped':''}" onclick="${isOwned?`equipShopItem('${item.id}','frame')`:`buyShopItem('${item.id}','frame',${item.price})`}">
            <div class="swatch" style="background:transparent;border:3px solid ${item.color}"></div>
            <div style="font-size:9.5px;font-weight:700">${item.label}</div>
            <div class="price">${isEq?'✅ Equipped':isOwned?'Tap to equip':'🪙 '+item.price}</div>
        </div>`;
    }).join('');
    $('shopTitleGrid').innerHTML=SHOP_TITLES.map(item=>{
        let isOwned=!!owned[item.id], isEq=ME.equippedTitle===item.id;
        return `<div class="shop-item ${isOwned?'owned':''} ${isEq?'equipped':''}" onclick="${isOwned?`equipShopItem('${item.id}','title')`:`buyShopItem('${item.id}','title',${item.price})`}">
            <div style="font-size:16px">🏷️</div>
            <div style="font-size:9.5px;font-weight:700">${item.label}</div>
            <div class="price">${isEq?'✅ Equipped':isOwned?'Tap to equip':'🪙 '+item.price}</div>
        </div>`;
    }).join('');
    $('shopReactGrid').innerHTML=SHOP_REACTIONS.map(item=>{
        let isOwned=!!owned[item.id];
        return `<div class="shop-item ${isOwned?'owned':''}" onclick="${isOwned?'':`buyShopItem('${item.id}','reaction',${item.price})`}">
            <div style="font-size:20px">${item.emoji}</div>
            <div style="font-size:9.5px;font-weight:700">${item.label}</div>
            <div class="price">${isOwned?'✅ Owned — usable in-match':'🪙 '+item.price}</div>
        </div>`;
    }).join('');
    let fxGrid=$('shopEffectGrid');
    if(fxGrid){
        fxGrid.innerHTML=SHOP_EFFECTS.map(item=>{
            let isOwned=!!owned[item.id], isEq=ME.equippedEffect===item.id;
            return `<div class="shop-item ${isOwned?'owned':''} ${isEq?'equipped':''}" onclick="${isOwned?`equipShopItem('${item.id}','effect')`:`buyShopItem('${item.id}','effect',${item.price})`}">
                <div style="font-size:20px">${item.icon}</div>
                <div style="font-size:9.5px;font-weight:700">${item.label}</div>
                <div class="price">${isEq?'✅ Equipped':isOwned?'Tap to equip':'🪙 '+item.price}</div>
            </div>`;
        }).join('');
    }
}
async function buyShopItem(id,type,price){
    if((ME.coins||0)<price){toast('Not enough coins — win more matches!');return;}
    let owned=Object.assign({}, ME.shopOwned||{});
    owned[id]=true;
    let updates={coins:(ME.coins||0)-price, shopOwned:owned};
    await mdb.ref('mp_users/'+MY_UID).update(updates);
    Object.assign(ME, updates);
    toast('Purchased! Tap it again to equip.');
    renderShop();renderProfileScreen();renderHubProfileHeader();
}
async function equipShopItem(id,type){
    let field = type==='nameColor' ? 'equippedNameColor' : type==='title' ? 'equippedTitle' : type==='effect' ? 'equippedEffect' : 'equippedFrame';
    let newVal = ME[field]===id ? null : id; // tap again to unequip
    await mdb.ref('mp_users/'+MY_UID+'/'+field).set(newVal);
    ME[field]=newVal;
    renderShop();renderProfileScreen();renderHubProfileHeader();
    await updateMPLeaderboard();
    toast(newVal?'Equipped!':'Unequipped.');
}
function nameColorStyle(uidOrProfile){
    let tagId = typeof uidOrProfile==='string' ? null : uidOrProfile.equippedNameColor;
    let tag = SHOP_TAGS.find(t=>t.id===tagId);
    if(!tag) return '';
    if(tag.color.startsWith('linear-gradient')) return `background:${tag.color};-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900`;
    return `color:${tag.color};font-weight:900`;
}

// ============================================================================================
// ===== VICTORY EFFECTS — a purchasable particle burst shown when you win a match. Pure CSS
// animation, no canvas/library needed, auto-cleans itself up. ================================
// ============================================================================================
function fireVictoryEffect(effectId){
    let layer=$('fxLayer'); if(!layer)return;
    let sets={
        fx_confetti:{glyphs:['🟨','🟥','🟦','🟩','🟪'],count:60},
        fx_fireworks:{glyphs:['🎆','✨','💥'],count:35},
        fx_coins:{glyphs:['🪙'],count:45},
        fx_stars:{glyphs:['✨','⭐','🌟'],count:50}
    };
    let set=sets[effectId]||sets.fx_confetti;
    for(let i=0;i<set.count;i++){
        let el=document.createElement('div');
        el.className='fx-piece';
        el.textContent=set.glyphs[Math.floor(Math.random()*set.glyphs.length)];
        el.style.left=(Math.random()*100)+'vw';
        el.style.fontSize=(14+Math.random()*14)+'px';
        let dur=(2.2+Math.random()*1.6);
        el.style.animationDuration=dur+'s';
        el.style.animationDelay=(Math.random()*0.6)+'s';
        layer.appendChild(el);
        setTimeout(()=>el.remove(), (dur+1)*1000);
    }
}

async function checkTrophyBadge(){
    let badge=$('trophyBadge');if(!badge)return;
    try{
        let hof=await mdb.ref('mp_lb_hof').get();
        let v=hof.exists()?hof.val():null;
        if(v && Date.now()<v.expires) badge.classList.add('show'); else badge.classList.remove('show');
    }catch(e){badge.classList.remove('show');}
}

// ============================================================================================
// ===== NAVIGATION, THEME, MODALS ============================================================
// ============================================================================================
function showScreen(name){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    let el=$('screen_'+name);if(el)el.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.nav===name));
    currentScreen=name;
    window.scrollTo({top:0,behavior:'smooth'});
    if(name==='friends')renderFriendsList();
    if(name==='rooms'){refreshPublicRooms();refreshLiveSearches();}
    if(name==='tournaments')refreshTournamentsList();
    if(name==='profile')renderProfileScreen();
    if(name==='hub')refreshHub();
}
function refreshHub(){renderHubProfileHeader();refreshPublicRooms(true);openHistoryScreen();refreshPlayersOnlineCount();refreshMyTournamentWidget();}
// Keeps any tournament you're registered/playing in visible from the home screen, not just
// from inside the Tournaments tab — as requested, so the host (or any registrant) can jump
// straight back in without hunting for it.
async function refreshMyTournamentWidget(){
    if(!ME || !MY_UID)return;
    try{
        let snap=await mdb.ref('mp_tournaments').limitToLast(50).get();
        let all=snap.val()||{};
        let mine=Object.entries(all).filter(([id,t])=>t.players && t.players[MY_UID] && (t.status==='registration'||t.status==='active'));
        let widget=$('myTournamentWidget'), list=$('myTournamentWidgetList');
        if(!mine.length){ widget.style.display='none'; return; }
        widget.style.display='block';
        list.innerHTML=mine.map(([id,t])=>{
            let statusTxt = t.status==='active' ? '🔴 Live now' : ('Starts '+new Date(t.scheduledStart).toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}));
            return `<div class="room-card"><div class="room-title">🏅 ${esc(t.name)} ${t.hostUid===MY_UID?'👑':''}</div>
                <div class="room-meta">${esc(statusTxt)}</div>
                <button class="btn btn-p btn-sm" style="margin-top:6px" onclick="openTournamentDetail('${id}')">Open</button>
            </div>`;
        }).join('');
    }catch(e){ console.warn('[Tournament] widget refresh failed', e); }
}
let playersOnlineInterval=null;
async function refreshPlayersOnlineCount(){
    let el=$('playersOnlineCount'); if(!el)return;
    try{
        let snap=await mdb.ref('mp_presence').get();
        let val=snap.val()||{};
        let count=Object.values(val).filter(p=>p&&p.online).length;
        el.textContent=count;
    }catch(e){ el.textContent='—'; }
    if(!playersOnlineInterval) playersOnlineInterval=setInterval(refreshPlayersOnlineCount, 30000);
}
function closeModal(id){$(id).classList.remove('active');}
function openModal(id){$(id).classList.add('active');}

function toggleTheme(){
    let cur=document.documentElement.getAttribute('data-theme');
    let next=cur==='light'?'':'light';
    if(next)document.documentElement.setAttribute('data-theme','light');else document.documentElement.removeAttribute('data-theme');
    $('themeMeta').setAttribute('content', next?'#d7e2f0':'#04142f');
    try{localStorage.setItem('esi_mp_theme', next);}catch(e){}
}
(function(){try{let t=localStorage.getItem('esi_mp_theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');$('themeMeta') && $('themeMeta').setAttribute('content','#d7e2f0');}}catch(e){}})();

function toggleCalc(){let c=$('calc');c.style.display=c.style.display==='none'?'block':'none';}
(function(){
    let d=$('calcD');let g=$('cg');if(!g)return;
    let keys=['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+','C','⌫','(',')'];
    keys.forEach(k=>{
        let b=document.createElement('button');b.textContent=k;
        b.style.cssText='padding:8px 0;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-weight:700;font-size:11px;cursor:pointer';
        b.onclick=()=>{
            if(k==='C')d.value='';
            else if(k==='⌫')d.value=d.value.slice(0,-1);
            else if(k==='='){try{d.value=Function('"use strict";return('+d.value+')')();}catch{d.value='Syntax error';}}
            else d.value+=k;
        };
        g.appendChild(b);
    });
})();
(function(){
    let calc=$('calc'),head=$('calcH'),isDown=false,offX=0,offY=0;
    if(!calc||!head)return;
    head.style.cursor='move';head.style.touchAction='none';
    head.addEventListener('pointerdown',e=>{isDown=true;let r=calc.getBoundingClientRect();offX=e.clientX-r.left;offY=e.clientY-r.top;calc.setPointerCapture(e.pointerId);});
    window.addEventListener('pointermove',e=>{if(!isDown)return;calc.style.left=(e.clientX-offX)+'px';calc.style.top=(e.clientY-offY)+'px';calc.style.right='auto';calc.style.bottom='auto';calc.style.position='fixed';});
    window.addEventListener('pointerup',()=>isDown=false);
})();

document.addEventListener('DOMContentLoaded', ()=>{
    let sBtn=$('openSuggestionBtn');if(sBtn)sBtn.addEventListener('click',()=>openModal('suggestionModal'));
    let form=$('suggestionForm');
    if(form)form.addEventListener('submit',e=>{
        e.preventDefault();
        let cat=$('category').value;let msg=$('message').value;
        let formattedText=`*ELITE ARENA - REPORT*\n\n• *Category:* ${cat}\n• *Message:* ${msg}\n• *From:* ${ME?ME.username:'guest'}`;
        let encodedText=encodeURIComponent(formattedText);
        window.open(`https://wa.me/2348108391083?text=${encodedText}`,'_blank');
        toast('Redirecting to WhatsApp…');
        closeModal('suggestionModal');form.reset();
    });
});

// Subject multi-select mini-chip builder — reused across quick-match / create-room / challenge / tournament modals
// Subject multi-select DROPDOWN — reused across quick-match / create-room / challenge / tournament
// modals. Shows a summary button ("3 subjects selected ▾") that expands into a checklist, instead
// of a permanently-expanded row of chips, so the person can pick multiple subjects compactly.
function buildSubjectMini(containerId, setKey){
    let wrap=$(containerId);if(!wrap)return;
    let arr=[...selSubjects[setKey]];
    let label = !arr.length ? 'Choose subject(s)' : (arr.length<=2 ? arr.join(', ') : arr.length+' subjects selected');
    let isOpen = wrap.dataset.open==='1';
    wrap.innerHTML = `
        <div class="subj-dd-btn" onclick="toggleSubjectDropdown('${containerId}')"><span>${esc(label)}</span><span class="subj-dd-arrow">${isOpen?'▴':'▾'}</span></div>
        <div class="subj-dd-panel ${isOpen?'open':''}">${ALL.map(s=>`<label class="subj-dd-item"><input type="checkbox" ${selSubjects[setKey].has(s)?'checked':''} onchange="toggleSubj('${containerId}','${setKey}','${esc(s)}')"> ${esc(s)}</label>`).join('')}</div>`;
}
function toggleSubjectDropdown(containerId){
    let wrap=$(containerId);if(!wrap)return;
    let willOpen = wrap.dataset.open!=='1';
    document.querySelectorAll('.subj-dd').forEach(el=>{
        el.dataset.open='0';
        let p=el.querySelector('.subj-dd-panel'); if(p)p.classList.remove('open');
        let a=el.querySelector('.subj-dd-arrow'); if(a)a.textContent='▾';
    });
    wrap.dataset.open = willOpen?'1':'0';
    let panel=wrap.querySelector('.subj-dd-panel'); if(panel)panel.classList.toggle('open', willOpen);
    let arrow=wrap.querySelector('.subj-dd-arrow'); if(arrow)arrow.textContent = willOpen?'▴':'▾';
}
function toggleSubj(containerId, setKey, subj){
    let set=selSubjects[setKey];
    if(set.has(subj)){ if(set.size>1) set.delete(subj); else { toast('Keep at least one subject selected.'); return; } }
    else set.add(subj);
    let wrap=$(containerId);
    let wasOpen = wrap && wrap.dataset.open==='1';
    buildSubjectMini(containerId, setKey);
    if(wasOpen){
        wrap.dataset.open='1';
        let p=wrap.querySelector('.subj-dd-panel'); if(p)p.classList.add('open');
        let a=wrap.querySelector('.subj-dd-arrow'); if(a)a.textContent='▴';
    }
}
document.addEventListener('click', e=>{
    if(e.target.closest('.subj-dd'))return;
    document.querySelectorAll('.subj-dd').forEach(el=>{
        el.dataset.open='0';
        let p=el.querySelector('.subj-dd-panel'); if(p)p.classList.remove('open');
        let a=el.querySelector('.subj-dd-arrow'); if(a)a.textContent='▾';
    });
});

// ============================================================================================
// ===== NOTIFICATIONS ========================================================================
// ============================================================================================
let notifFirstLoad=true, prevUnreadCount=0;
function attachNotificationsListener(){
    mdb.ref('mp_notifications/'+MY_UID).limitToLast(60).on('value', snap=>{
        notifCache=snap.val()||{};
        renderNotifPanel();
    });
}
function renderNotifPanel(){
    let ids=Object.keys(notifCache).sort((a,b)=>(notifCache[b].createdAt||0)-(notifCache[a].createdAt||0));
    let unread=ids.filter(id=>!notifCache[id].read).length;
    if(!notifFirstLoad && unread>prevUnreadCount) playSfx('notify');
    prevUnreadCount=unread; notifFirstLoad=false;
    let badge1=$('notifBadge'),badge2=$('navFriendBadge'),badge3=$('friendReqBadge');
    if(badge1){badge1.textContent=unread;badge1.classList.toggle('show',unread>0);}
    if(!ids.length){$('notifList').innerHTML='<div class="empty-hint">No notifications yet.</div>';return;}
    $('notifList').innerHTML=ids.map(id=>{
        let n=notifCache[id];
        let icon={friend_request:'👥',friend_accept:'🤝',challenge:'⚔️',challenge_accepted:'✅',challenge_rejected:'✖️',tournament:'🏅',match_invite:'🎮',system:'🔔'}[n.type]||'🔔';
        return `<div class="notif-item ${n.read?'':'unread'}" onclick="markNotifRead('${id}')">
            <div>${icon} ${esc(n.text||'')}</div>
            <div class="t">${fmtTime(n.createdAt)}</div>
        </div>`;
    }).join('');
}
function markNotifRead(id){mdb.ref('mp_notifications/'+MY_UID+'/'+id+'/read').set(true);}
function clearAllNotifs(){mdb.ref('mp_notifications/'+MY_UID).remove();}
function sendNotif(toUid, type, text, data){
    let ref=mdb.ref('mp_notifications/'+toUid).push();
    ref.set({type,text,data:data||null,from:MY_UID,fromName:ME?ME.username:'?',createdAt:firebase.database.ServerValue.TIMESTAMP,read:false});
}

// ============================================================================================
// ===== FRIENDS ===============================================================================
// ============================================================================================
let friendTab='all';
let friendPresenceUnsubs={};

function attachFriendsListener(){
    mdb.ref('mp_friends/'+MY_UID).on('value', async snap=>{
        let ids=snap.exists()?Object.keys(snap.val()):[];
        // detach presence listeners for friends no longer in list
        Object.keys(friendPresenceUnsubs).forEach(fid=>{
            if(!ids.includes(fid)){ mdb.ref('mp_presence/'+fid).off('value', friendPresenceUnsubs[fid]); delete friendPresenceUnsubs[fid]; delete friendsCache[fid]; }
        });
        for(let fid of ids){
            if(!friendsCache[fid]) friendsCache[fid]={uid:fid, username:'…', online:false};
            if(!friendPresenceUnsubs[fid]){
                let profSnap=await mdb.ref('mp_users/'+fid).get();
                if(profSnap.exists()){let p=profSnap.val();friendsCache[fid].username=p.username;friendsCache[fid].elo=p.elo;friendsCache[fid].avatarEmoji=p.avatarEmoji;}
                let cb=psnap=>{
                    let pv=psnap.val()||{};
                    friendsCache[fid].online=!!pv.online;
                    friendsCache[fid].lastChanged=pv.lastChanged;
                    renderFriendsList();updateFriendsOnlineHint();
                };
                mdb.ref('mp_presence/'+fid).on('value', cb);
                friendPresenceUnsubs[fid]=cb;
            }
        }
        renderFriendsList();updateFriendsOnlineHint();
    });
    mdb.ref('mp_friend_requests/'+MY_UID).on('value', snap=>{
        friendReqIncoming=snap.val()||{};
        let n=Object.keys(friendReqIncoming).length;
        $('reqCountChip').textContent=n?` (${n})`:'';
        $('friendReqBadge').textContent=n;$('friendReqBadge').classList.toggle('show',n>0);
        $('navFriendBadge').textContent=n;$('navFriendBadge').classList.toggle('show',n>0);
        renderFriendsList();
    }, err=>{ console.warn('[Friends] could not read incoming requests — check Firebase rules for mp_friend_requests/$toUid', err); });
    mdb.ref('mp_friend_requests_sent/'+MY_UID).on('value', snap=>{
        friendReqSent=snap.val()||{};
        renderFriendsList();
    }, err=>{ console.warn('[Friends] could not read sent requests — check Firebase rules for mp_friend_requests_sent/$fromUid', err); });
}
function updateFriendsOnlineHint(){
    let onlineCount=Object.values(friendsCache).filter(f=>f.online).length;
    let hint=$('friendsOnlineHint');if(hint)hint.textContent=onlineCount+' online';
}
function setFriendTab(tab){friendTab=tab;document.querySelectorAll('[data-ftab]').forEach(el=>el.classList.toggle('active',el.dataset.ftab===tab));renderFriendsList();}

async function sendFriendRequest(){
    let name=$('addFriendInput').value.trim();
    if(!name){toast('Enter a username first.');return;}
    let lower=name.toLowerCase();
    if(lower===ME.usernameLower){toast("You can't friend yourself.");return;}
    try{
        let uSnap=await mdb.ref('mp_usernames/'+lower).get();
        if(!uSnap.exists()){toast('No player found with that username.');return;}
        let targetUid=uSnap.val();
        let already=await mdb.ref('mp_friends/'+MY_UID+'/'+targetUid).get();
        if(already.exists()){toast('You are already friends.');return;}
        let existingReq=await mdb.ref('mp_friend_requests/'+targetUid+'/'+MY_UID).get();
        if(existingReq.exists()){toast('Request already sent.');return;}
        let updates={};
        updates['mp_friend_requests/'+targetUid+'/'+MY_UID]={fromUid:MY_UID,fromUsername:ME.username,sentAt:firebase.database.ServerValue.TIMESTAMP,status:'pending'};
        updates['mp_friend_requests_sent/'+MY_UID+'/'+targetUid]={toUid:targetUid,toUsername:name,sentAt:firebase.database.ServerValue.TIMESTAMP,status:'pending'};
        await mdb.ref().update(updates);
        sendNotif(targetUid,'friend_request', `${ME.username} sent you a friend request.`);
        toast('Friend request sent to '+name);
        $('addFriendInput').value='';
    }catch(e){toast('Could not send request right now.');console.warn(e);}
}
async function acceptFriendRequest(fromUid, fromUsername){
    let updates={};
    updates['mp_friends/'+MY_UID+'/'+fromUid]=true;
    updates['mp_friends/'+fromUid+'/'+MY_UID]=true;
    updates['mp_friend_requests/'+MY_UID+'/'+fromUid]=null;
    updates['mp_friend_requests_sent/'+fromUid+'/'+MY_UID]=null;
    await mdb.ref().update(updates);
    sendNotif(fromUid,'friend_accept', `${ME.username} accepted your friend request!`);
    toast('You are now friends with '+fromUsername);
}
async function rejectFriendRequest(fromUid){
    let updates={};
    updates['mp_friend_requests/'+MY_UID+'/'+fromUid]=null;
    updates['mp_friend_requests_sent/'+fromUid+'/'+MY_UID]=null;
    await mdb.ref().update(updates);
    toast('Request declined.');
}
async function cancelSentRequest(toUid){
    let updates={};
    updates['mp_friend_requests/'+toUid+'/'+MY_UID]=null;
    updates['mp_friend_requests_sent/'+MY_UID+'/'+toUid]=null;
    await mdb.ref().update(updates);
    toast('Request cancelled.');
}
async function removeFriend(fid, fname){
    if(!confirm('Remove '+fname+' from friends?'))return;
    let updates={};
    updates['mp_friends/'+MY_UID+'/'+fid]=null;
    updates['mp_friends/'+fid+'/'+MY_UID]=null;
    await mdb.ref().update(updates);
    toast('Removed '+fname);
}

function renderFriendsList(){
    let wrap=$('friendsListWrap');if(!wrap)return;
    if(friendTab==='requests'){
        let ids=Object.keys(friendReqIncoming);
        wrap.innerHTML=ids.length?ids.map(uid=>{let r=friendReqIncoming[uid];return `
            <div class="friend-row"><div class="fav">👤</div>
                <div><div class="friend-name">${esc(r.fromUsername)}</div><div class="friend-sub">wants to be friends</div></div>
                <div class="fr-actions">
                    <button class="btn btn-p btn-sm" onclick="acceptFriendRequest('${uid}','${esc(r.fromUsername)}')">Accept</button>
                    <button class="btn btn-red btn-sm" onclick="rejectFriendRequest('${uid}')">Reject</button>
                </div>
            </div>`;}).join(''):'<div class="empty-hint">No incoming requests.</div>';
        return;
    }
    if(friendTab==='sent'){
        let ids=Object.keys(friendReqSent);
        wrap.innerHTML=ids.length?ids.map(uid=>{let r=friendReqSent[uid];return `
            <div class="friend-row"><div class="fav">👤</div>
                <div><div class="friend-name">${esc(r.toUsername)}</div><div class="friend-sub">Pending…</div></div>
                <div class="fr-actions"><button class="btn btn-g btn-sm" onclick="cancelSentRequest('${uid}')">Cancel</button></div>
            </div>`;}).join(''):'<div class="empty-hint">No pending sent requests.</div>';
        return;
    }
    let list=Object.values(friendsCache);
    if(friendTab==='online')list=list.filter(f=>f.online);
    list.sort((a,b)=>(b.online?1:0)-(a.online?1:0) || (a.username||'').localeCompare(b.username||''));
    if(!list.length){wrap.innerHTML='<div class="empty-hint">'+(friendTab==='online'?'No friends online right now.':'No friends yet — add one above!')+'</div>';return;}
    wrap.innerHTML=list.map(f=>`
        <div class="friend-row">
            <div class="fav">${f.avatarEmoji||'🎓'}</div>
            <div style="min-width:0;flex:1">
                <div class="friend-name">${esc(f.username)}</div>
                <div class="friend-sub"><span class="status-dot ${f.online?'online':'offline'}"></span> ${f.online?'Online':'Offline'} ${f.elo?('• ELO '+f.elo):''}</div>
            </div>
            <div class="fr-actions">
                <button class="icon-btn" style="padding:5px 7px;position:relative" title="Chat" onclick="openChat('${f.uid}','${esc(f.username)}')">💬${unreadFriendChats[f.uid]?'<span class="badge-dot show glow" style="position:absolute;top:-2px;right:-2px;width:8px;height:8px;padding:0"></span>':''}</button>
                <button class="icon-btn" style="padding:5px 7px" title="Challenge" onclick="openChallengeModal('${f.uid}','${esc(f.username)}')">⚔️</button>
                <button class="icon-btn" style="padding:5px 7px" title="Remove" onclick="removeFriend('${f.uid}','${esc(f.username)}')">✖</button>
            </div>
        </div>`).join('');
    watchUnreadForFriends();
}

// ============================================================================================
// ===== CHAT (friend 1:1 + lobby) ============================================================
// ============================================================================================
function chatIdFor(a,b){return [a,b].sort().join('_');}

let chatTypingTimeout=null, chatTypingWatchUnsub=null;
function openChat(uid,name){
    chatOpenWith=uid;
    $('chatModalName').textContent='💬 '+name;
    $('chatTypingLine').textContent='';
    openModal('chatModal');
    let cid=chatIdFor(MY_UID,uid);
    if(chatModalUnsub) chatModalUnsub();
    let ref=mdb.ref('mp_chats/'+cid+'/messages').limitToLast(200);
    let firstLoad=true;
    let cb=snap=>{
        let msgs=snap.val()||{};
        let ids=Object.keys(msgs).sort((a,b)=>(msgs[a].sentAt||0)-(msgs[b].sentAt||0));
        let box=$('chatModalMsgs');
        let lastId=ids[ids.length-1];
        box.innerHTML=ids.map(id=>{let m=msgs[id];let mine=m.from===MY_UID;
            return `<div class="chat-bubble ${mine?'me':'them'}"><b style="opacity:.7;font-size:8.5px">${mine?'':(m.fromAvatar||'🎓')+' '+esc(m.fromName||'')+': '}</b><bdi style="unicode-bidi:isolate;direction:ltr;display:inline">${esc(m.text)}</bdi><span class="ts">${fmtTime(m.sentAt)}</span></div>`;}).join('');
        box.scrollTop=box.scrollHeight;
        if(!firstLoad && lastId && msgs[lastId] && msgs[lastId].from!==MY_UID) playSfx('notify');
        firstLoad=false;
        // Mark everything I can currently see as read.
        mdb.ref('mp_chats/'+cid+'/reads/'+MY_UID).set(firebase.database.ServerValue.TIMESTAMP);
        unreadFriendChats[uid]=false; renderFriendsList();
    };
    ref.on('value', cb);
    chatModalUnsub=()=>ref.off('value', cb);
    if(chatTypingWatchUnsub) chatTypingWatchUnsub();
    let typingRef=mdb.ref('mp_chats/'+cid+'/typing/'+uid);
    let typingCb=snap=>{
        let ts=snap.val();
        $('chatTypingLine').textContent = (ts && Date.now()-ts<4000) ? name+' is typing…' : '';
    };
    typingRef.on('value', typingCb);
    chatTypingWatchUnsub=()=>typingRef.off('value', typingCb);
}
function onChatTyping(){
    if(!chatOpenWith)return;
    let cid=chatIdFor(MY_UID,chatOpenWith);
    mdb.ref('mp_chats/'+cid+'/typing/'+MY_UID).set(firebase.database.ServerValue.TIMESTAMP);
    clearTimeout(chatTypingTimeout);
    chatTypingTimeout=setTimeout(()=>mdb.ref('mp_chats/'+cid+'/typing/'+MY_UID).remove(),3000);
}
function closeChatModal(){
    if(chatModalUnsub){chatModalUnsub();chatModalUnsub=null;}
    if(chatTypingWatchUnsub){chatTypingWatchUnsub();chatTypingWatchUnsub=null;}
    chatOpenWith=null;
    closeModal('chatModal');
}
async function clearFriendChatHistory(){
    if(!chatOpenWith)return;
    if(!confirm('Clear this chat history? This removes it for both of you and cannot be undone.'))return;
    let cid=chatIdFor(MY_UID,chatOpenWith);
    await mdb.ref('mp_chats/'+cid+'/messages').remove().catch(()=>{});
    toast('Chat history cleared.');
}
function sendFriendChat(){
    let input=$('chatModalInput');let text=sanitizeChatText(input.value).slice(0,500);
    if(!text||!chatOpenWith)return;
    let cid=chatIdFor(MY_UID,chatOpenWith);
    mdb.ref('mp_chats/'+cid+'/messages').push({from:MY_UID,fromName:ME.username,fromAvatar:ME.avatarEmoji||'🎓',text,sentAt:firebase.database.ServerValue.TIMESTAMP});
    mdb.ref('mp_chats/'+cid+'/meta').set({lastMsgAt:firebase.database.ServerValue.TIMESTAMP,lastFrom:MY_UID,lastText:text.slice(0,60)});
    mdb.ref('mp_chats/'+cid+'/typing/'+MY_UID).remove();
    input.value='';
}

// ===== Unread DM badges on the Friends list — one small listener per friend, watching just
// the lightweight 'meta' node (never the full message list) so this stays cheap at any friend count.
let unreadFriendChats={}, unreadChatUnsubs={};
function watchUnreadForFriends(){
    Object.values(friendsCache).forEach(f=>{
        if(unreadChatUnsubs[f.uid])return;
        let cid=chatIdFor(MY_UID,f.uid);
        let metaRef=mdb.ref('mp_chats/'+cid+'/meta');
        let cb=snap=>{
            let meta=snap.val();
            if(!meta || meta.lastFrom===MY_UID){ unreadFriendChats[f.uid]=false; renderFriendsList(); return; }
            mdb.ref('mp_chats/'+cid+'/reads/'+MY_UID).get().then(rsnap=>{
                let readAt=rsnap.val()||0;
                unreadFriendChats[f.uid] = (meta.lastMsgAt||0) > readAt;
                renderFriendsList();
            });
        };
        metaRef.on('value', cb);
        unreadChatUnsubs[f.uid]=()=>metaRef.off('value', cb);
    });
}

function attachLobbyChat(roomId){
    if(lobbyChatUnsub)lobbyChatUnsub();
    let ref=mdb.ref('mp_rooms/'+roomId+'/chat').limitToLast(100);
    let firstLoad=true;
    let cb=snap=>{
        let msgs=snap.val()||{};
        let ids=Object.keys(msgs).sort((a,b)=>(msgs[a].sentAt||0)-(msgs[b].sentAt||0));
        let box=$('lobbyChatMsgs');if(!box)return;
        let isHost = lastRoomHostUid && lastRoomHostUid===MY_UID;
        let lastId=ids[ids.length-1];
        box.innerHTML=ids.map(id=>{let m=msgs[id];let mine=m.from===MY_UID;let canDel=(mine||isHost)&&m.from!=='system';
            return `<div class="chat-bubble ${mine?'me':'them'}"><b style="opacity:.7;font-size:9px">${mine?'':(m.fromAvatar||'🎓')+' '+esc(m.fromName)+': '}</b><bdi style="unicode-bidi:isolate;direction:ltr;display:inline">${esc(m.text)}</bdi><span class="ts">${fmtTime(m.sentAt)}</span>${canDel?`<span onclick="deleteChatMsg('mp_rooms/${roomId}','${id}')" style="cursor:pointer;margin-left:6px;opacity:.55;font-size:9px" title="Delete">🗑️</span>`:''}</div>`;}).join('');
        box.scrollTop=box.scrollHeight;
        if(!firstLoad && lastId && msgs[lastId] && msgs[lastId].from!==MY_UID) playSfx('notify');
        firstLoad=false;
    };
    ref.on('value', cb);
    lobbyChatUnsub=()=>ref.off('value', cb);
    let typingRef=mdb.ref('mp_rooms/'+roomId+'/typing');
    let typingCb=snap=>{
        let all=snap.val()||{};
        let now=Date.now();
        let names=Object.entries(all).filter(([uid,ts])=>uid!==MY_UID && ts && now-ts<4000).map(([uid])=>{
            let p=lastRoomPlayers && lastRoomPlayers[uid]; return p?p.name:null;
        }).filter(Boolean);
        let line=$('lobbyTypingLine'); if(line) line.textContent=names.length?(names.join(', ')+(names.length>1?' are':' is')+' typing…'):'';
    };
    if(lobbyTypingUnsub) lobbyTypingUnsub();
    typingRef.on('value', typingCb);
    lobbyTypingUnsub=()=>typingRef.off('value', typingCb);
}
async function deleteChatMsg(basePath, msgId){
    if(!confirm('Delete this message for everyone?'))return;
    await mdb.ref(basePath+'/chat/'+msgId).remove().catch(()=>{});
}
let lobbyTypingUnsub=null, lobbyTypingTimeout=null;
function onLobbyChatTyping(){
    if(!currentRoomId)return;
    mdb.ref('mp_rooms/'+currentRoomId+'/typing/'+MY_UID).set(firebase.database.ServerValue.TIMESTAMP);
    clearTimeout(lobbyTypingTimeout);
    lobbyTypingTimeout=setTimeout(()=>mdb.ref('mp_rooms/'+currentRoomId+'/typing/'+MY_UID).remove(),3000);
}
function sendLobbyChat(){
    let input=$('lobbyChatInput');let text=sanitizeChatText(input.value).slice(0,300);
    if(!text||!currentRoomId)return;
    mdb.ref('mp_rooms/'+currentRoomId+'/chat').push({from:MY_UID,fromName:ME.username,fromAvatar:ME.avatarEmoji||'🎓',text,sentAt:firebase.database.ServerValue.TIMESTAMP});
    mdb.ref('mp_rooms/'+currentRoomId+'/typing/'+MY_UID).remove();
    input.value='';
}

// ---- Tournament lobby chat (same pattern as room lobby chat, own path) ----
let tChatUnsub=null, tChatTypingUnsub=null, tChatTypingTimeout=null;
function attachTournamentChat(tid){
    if(tChatUnsub)tChatUnsub();
    let ref=mdb.ref('mp_tournaments/'+tid+'/chat').limitToLast(100);
    let firstLoad=true;
    let cb=snap=>{
        let msgs=snap.val()||{};
        let ids=Object.keys(msgs).sort((a,b)=>(msgs[a].sentAt||0)-(msgs[b].sentAt||0));
        let box=$('tChatMsgs');if(!box)return;
        let isHost = lastTournamentSnapshot && lastTournamentSnapshot.hostUid===MY_UID;
        let lastId=ids[ids.length-1];
        box.innerHTML=ids.map(id=>{let m=msgs[id];let mine=m.from===MY_UID;let canDel=mine||isHost;
            return `<div class="chat-bubble ${mine?'me':'them'}"><b style="opacity:.7;font-size:9px">${mine?'':(m.fromAvatar||'🎓')+' '+esc(m.fromName)+': '}</b><bdi style="unicode-bidi:isolate;direction:ltr;display:inline">${esc(m.text)}</bdi><span class="ts">${fmtTime(m.sentAt)}</span>${canDel?`<span onclick="deleteChatMsg('mp_tournaments/${tid}','${id}')" style="cursor:pointer;margin-left:6px;opacity:.55;font-size:9px" title="Delete">🗑️</span>`:''}</div>`;}).join('');
        box.scrollTop=box.scrollHeight;
        if(!firstLoad && lastId && msgs[lastId] && msgs[lastId].from!==MY_UID) playSfx('notify');
        firstLoad=false;
    };
    ref.on('value', cb);
    tChatUnsub=()=>ref.off('value', cb);
    let typingRef=mdb.ref('mp_tournaments/'+tid+'/typing');
    let typingCb=snap=>{
        let all=snap.val()||{};
        let now=Date.now();
        let names=Object.entries(all).filter(([uid,ts])=>uid!==MY_UID && ts && now-ts<4000).map(([uid])=>{
            let t=lastTournamentSnapshot;
            let p=t && ((t.players&&t.players[uid])||(t.spectators&&t.spectators[uid]));
            return p?p.name:null;
        }).filter(Boolean);
        let line=$('tChatTypingLine'); if(line) line.textContent=names.length?(names.join(', ')+(names.length>1?' are':' is')+' typing…'):'';
    };
    if(tChatTypingUnsub) tChatTypingUnsub();
    typingRef.on('value', typingCb);
    tChatTypingUnsub=()=>typingRef.off('value', typingCb);
}
function detachTournamentChat(){
    if(tChatUnsub){tChatUnsub();tChatUnsub=null;}
    if(tChatTypingUnsub){tChatTypingUnsub();tChatTypingUnsub=null;}
}
function onTournamentChatTyping(){
    if(!currentTournamentId)return;
    mdb.ref('mp_tournaments/'+currentTournamentId+'/typing/'+MY_UID).set(firebase.database.ServerValue.TIMESTAMP);
    clearTimeout(tChatTypingTimeout);
    tChatTypingTimeout=setTimeout(()=>mdb.ref('mp_tournaments/'+currentTournamentId+'/typing/'+MY_UID).remove(),3000);
}
function sendTournamentChat(){
    let input=$('tChatInput');let text=sanitizeChatText(input.value).slice(0,300);
    if(!text||!currentTournamentId||!ME)return;
    mdb.ref('mp_tournaments/'+currentTournamentId+'/chat').push({from:MY_UID,fromName:ME.username,fromAvatar:ME.avatarEmoji||'🎓',text,sentAt:firebase.database.ServerValue.TIMESTAMP});
    mdb.ref('mp_tournaments/'+currentTournamentId+'/typing/'+MY_UID).remove();
    input.value='';
}

// ============================================================================================
// ===== CHALLENGES ===========================================================================
// ============================================================================================
let challengeTargetUid=null, challengeTargetName=null;
let seenChallengeIds=new Set();

function openChallengeModal(uid,name){
    challengeTargetUid=uid;challengeTargetName=name;
    $('challengeFriendName').textContent=name;
    buildSubjectMini('chSubjectMini','ch');
    openModal('challengeModal');
}
$('chMode') && $('chMode').addEventListener && document.addEventListener('DOMContentLoaded',()=>{
    $('chMode').addEventListener('change', ()=>{ $('chTimeLbl').textContent = $('chMode').value==='speed' ? 'Total Minutes' : 'Seconds / Question'; });
    $('qmMode').addEventListener('change', ()=>{ $('qmTimeLbl').textContent = $('qmMode').value==='speed' ? 'Total Minutes' : 'Seconds / Question'; });
});

async function sendChallenge(){
    if(!challengeTargetUid){toast('Pick a friend to challenge first.');return;}
    let settings={
        subjects:[...selSubjects.ch], difficulty:$('chDiff').value, subMode:'standard',
        mode:$('chMode').value, qcount:parseInt($('chCount').value)||10,
        perQ: $('chMode').value==='spak' ? (parseInt($('chTime').value)||20) : null,
        totalMinutes: $('chMode').value==='speed' ? (parseInt($('chTime').value)||10) : null,
        teamMode:false
    };
    let cRef=mdb.ref('mp_challenges').push();
    await cRef.set({
        fromUid:MY_UID, fromName:ME.username, toUid:challengeTargetUid, toName:challengeTargetName,
        settings, status:'pending', createdAt:firebase.database.ServerValue.TIMESTAMP
    });
    sendNotif(challengeTargetUid,'challenge', `${ME.username} challenged you to a ${settings.qcount}-question ${settings.subjects.join('/')} duel!`, {challengeId:cRef.key});
    toast('Challenge sent to '+challengeTargetName+'!');
    closeModal('challengeModal');
    // Listen for this specific challenge's resolution so the challenger auto-joins the match
    mdb.ref('mp_challenges/'+cRef.key).on('value', snap=>{
        let c=snap.val();if(!c)return;
        if(c.status==='accepted' && c.matchId){
            mdb.ref('mp_challenges/'+cRef.key).off('value');
            joinExistingMatch(c.matchId, c.roomId);
        }else if(c.status==='rejected'){
            mdb.ref('mp_challenges/'+cRef.key).off('value');
            toast(challengeTargetName+' declined your challenge.');
        }
    });
}

function attachIncomingChallengeListener(){
    mdb.ref('mp_challenges').orderByChild('toUid').equalTo(MY_UID).on('child_added', snap=>{
        let c=snap.val();let id=snap.key;
        if(!c || c.status!=='pending' || seenChallengeIds.has(id))return;
        seenChallengeIds.add(id);
        pendingIncomingChallengeId=id;
        $('incomingChallengeText').textContent=`${c.fromName} challenged you to a duel!`;
        let s=c.settings;
        $('incomingChallengeSettings').innerHTML=`
            <div><b>Subjects:</b> ${subjectsWithIcons(s.subjects)}</div>
            <div><b>Difficulty:</b> ${esc(s.difficulty)} • <b>Mode:</b> ${esc(s.mode)}</div>
            <div><b>Questions:</b> ${s.qcount} ${s.perQ?('• '+s.perQ+'s/question'):(s.totalMinutes?('• '+s.totalMinutes+' min total'):'')}</div>`;
        openModal('incomingChallengeModal');
    });
}

async function respondChallenge(accept){
    let id=pendingIncomingChallengeId;
    closeModal('incomingChallengeModal');
    if(!id)return;
    let snap=await mdb.ref('mp_challenges/'+id).get();
    let c=snap.val();if(!c)return;
    if(!accept){
        await mdb.ref('mp_challenges/'+id+'/status').set('rejected');
        sendNotif(c.fromUid,'challenge_rejected', `${ME.username} declined your challenge.`);
        toast('Challenge declined.');
        return;
    }
    toast('Setting up your match…');
    let roomId=mdb.ref('mp_rooms').push().key;
    let players={};
    players[c.fromUid]={name:c.fromName,ready:true,team:'A',uid:c.fromUid};
    players[MY_UID]={name:ME.username,ready:true,team:'B',uid:MY_UID};
    await mdb.ref('mp_rooms/'+roomId).set({
        hostUid:c.fromUid, hostName:c.fromName, type:'challenge', visibility:'private',
        settings:c.settings, teamMode:false, maxPlayers:2, powerups:true,
        status:'starting', players, createdAt:firebase.database.ServerValue.TIMESTAMP
    });
    let matchId=await beginMatchForRoom(roomId, c.settings, [{uid:c.fromUid,name:c.fromName,team:'A'},{uid:MY_UID,name:ME.username,team:'B'}]);
    await mdb.ref('mp_challenges/'+id).update({status:'accepted', matchId, roomId});
    joinExistingMatch(matchId, roomId);
}

// ============================================================================================
// ===== SUBJECT TOPIC BANKS (carried over verbatim from the single-player engine) ===========
// ============================================================================================
const TOPICS = {
"Mathematics":["Calculus - Differentiation & Integration & Calculations","Probability & Permutation/Combination & Calculations","Logarithms, Surds & Indices & Calculations","Circle Theorem & Geometry & Calculations","Trigonometry Sine/Cosine Rule & Calculations","Sequence & Series AP/GP & Calculations","Vectors & Matrices & Calculations","Inequalities & Linear Programming & Calculations","Polynomials & Remainder Theorem & Calculations","Complex Numbers & Calculations","Mensuration Cones/Spheres & Calculations","Word Problems Commercial Maths & Calculations","Modulus & Absolute Value & Calculations","Binomial Expansion & Calculations","Number Bases & Logarithms & Calculations","Algebraic Fractions & Variation & Calculations","Simultaneous Equations & Quadratics & Calculations","Sets Venn Diagrams & Logic","Statistics Mean Median Mode & Calculations","Graphs of Linear & Quadratic Functions & Calculations","Coordinate Geometry Straight Lines & Calculations","Application of Calculus Maxima/Minima & Calculations","Integration Area & Volume & Calculations","Differential Equations & Calculations","Rates of Change & Motion & Calculations","Standard Deviation & Probability Distributions & Calculations","Mathematical Modeling & Real Life Problems & Calculations","Matrices Determinants & Inverse & Calculations","Identity Elements & Binary Operations","Surd Rationalization & Applications & Calculations","Bearings & Trigonometric Applications & Calculations","Linear & Quadratic Programming & Calculations","Set Theory Cardinality","Probability Tree Diagrams & Calculations","Arithmetic & Geometric Mean & Calculations","Approximation & Significant Figures & Calculations","Ratio Proportion & Rates & Calculations","Construction & Loci & Calculations","Transformation Geometry & Calculations","Compound Interest & Annuities & Calculations","Partial Fractions & Calculations","Functions Domain Range Inverse & Calculations","Trigonometric Identities & Equations & Calculations","Differentiation Chain Product Quotient & Calculations","Integration Substitution & Parts & Calculations","Kinematics Motion & Calculations","Statics & Dynamics & Calculations","Work Energy Power & Calculations","Impulse Momentum & Calculations","Simple Harmonic Motion & Calculations","Quadratic Roots Discriminant & Calculations","Exponential Equations & Calculations","Vectors Dot Cross Product & Calculations","Conditional Probability Bayes & Calculations","Circular Permutation & Calculations","Binomial Distribution & Calculations","Normal Distribution & Calculations","Correlation Regression & Calculations","Hypothesis Testing & Calculations","Truth Tables Logic","Number Theory Modulo & Calculations","Rational Functions Asymptotes & Calculations","Parametric Equations & Calculations","Loci Complex Plane & Calculations","Summation Series & Calculations","Financial Maths Depreciation & Calculations","Longitude Latitude & Calculations","Conic Sections & Calculations","Game Theory","Surds Conjugates & Calculations","Polynomial Graphs & Calculations","Vector Geometry & Calculations","Probability Distributions & Calculations","Integration Applications & Calculations","Mechanics Friction & Calculations","Elastic Collisions & Calculations","Matrix Transformation & Calculations","Venn Diagram Probability & Calculations","Limits Continuity & Calculations","Curve Sketching & Calculations"],
"English":["Concord & Subject-Verb Agreement hardest","Idioms & Phrasal Verbs hardest","Figures of Speech Hardest","Comprehension Inference","vowel and consonant sound very hard","commonly misspelt hard words","Synonyms & Antonyms Confusable","Oral Stress & Intonation very hard","Clauses & Phrases","Question Tags & Inversion","Registers Legal/Medical/Tech","Vocabulary Sentence Interpretation hardest","Subjunctive Mood & Conditionals","Punctuation & Capitalization Traps","Tricky spelling of Double Letters","Summary Topic Sentence","Near Synonyms","Parts of Speech Identification","Tenses & Aspect Sequence","Active & Passive Voice","Direct & Indirect Speech","Prepositions & Appropriate Usage","Articles & Determiners","Word Classes & Functions","Sentence Types Simple/Compound/Complex","Antonyms in Context","Collocations & Fixed Expressions","Oral Consonant Clusters","Oral Vowel Contrasts","Emphatic Stress & Schwa Sounds","Comprehension Central Idea","Comprehension Lexical Items","Lexis in Context Difficult Words","Comparatives & Superlatives","Degrees of Comparison","Tag Questions & Short Answers","Modal Auxiliaries & Usage","Gerund & Infinitive Usage","Conjunctions & Connectives","Plural Forms & Irregular Nouns","Verb Forms & Concord Traps","Word Formation Prefix/Suffix","Contextual Antonyms in Passage","Report Writing Formal/Informal","Letter Writing Formats","Essay Structure & Coherence","Debate & Argumentative Writing","News Report Analysis","Formal vs Informal Register","Editing & Proofreading Skills","Homophones & Homonyms","Loan Words & Borrowed Terms","Speech Writing Techniques","Ellipsis & Substitution","Cleft Sentences & Inversion","Nominalization & Transformation","Dangling Modifiers & Ambiguity","Parallelism & Faulty Construction","Discourse Markers & Cohesion","Pragmatics Implicature & Inference","Stylistics & Literary Devices","Cohesive Devices & Linking","Reference & Anaphora","Lexical Relations Hyponymy Meronymy","Semantic Change & Polysemy","Phonetics IPA Transcription","Diphthongs & Triphthongs","Syllable Stress Patterns","Sentence Stress & Rhythm","Intonation Functions","Contractions & Weak Forms","Minimal Pairs & Confusable Sounds","Dictation & Listening Traps","Vocabulary Spelling Traps","Word Stress Shift","Sentence Completion Hardest","Cloze Test Advanced","Paraphrasing & Synonym Replacement","Logical Connectors Hardest","Proverbs & Idiomatic Meanings","Register Conversion Formality","Jargon & Specialized Vocabulary","Euphemism & Dysphemism","Tautology & Redundancy","Pleonasm & Circumlocution","Oxymoron Paradox & Irony"],
"Physics":["Vectors & Equilibrium & Calculations","Electric Field & Capacitors & Calculations","Radioactivity & Nuclear Physics & Calculations","SHM Simple Harmonic Motion & Calculations","Heat Gas Laws & Thermodynamics & Calculations","Current Electricity Bridge Circuits & Calculations","Electromagnetism & Magnetic Field & Calculations","Gravitation & Escape Velocity & Calculations","Momentum Collisions & Calculations","Optics Lenses & Mirrors & Calculations","Fluids Pressure & Viscosity & Calculations","Modern Physics Photoelectric","Dimensions & Units & Calculations","Projectiles & Circular Motion & Calculations","Waves Sound & Light Calculations","Work Energy & Power & Calculations","Friction & Inclined Planes & Calculations","Newton's Laws & Applications & Calculations","Rotational Motion & Torque & Calculations","Elasticity & Hooke's Law & Calculations","Electrostatics Coulomb's Law & Calculations","Kirchhoff's Laws & Networks & Calculations","EMF & Internal Resistance & Calculations","AC Circuits & Resonance & Calculations","Transformers & Induction & Calculations","Magnetic Flux & Faraday's Law & Calculations","Wave Properties & Interference","Diffraction & Polarization","Atomic Spectra & Energy Levels","Nuclear Fission & Fusion","Binding Energy & Mass Defect & Calculations","Semiconductors & Diodes","Satellites & Orbital Motion & Calculations","Mechanical Advantage Machines & Calculations","Surface Tension & Capillarity & Calculations","Thermal Expansion & Calorimetry & Calculations","Kinetic Theory of Gases & Calculations","Doppler Effect & Resonance & Calculations","Total Internal Reflection & Calculations","Measurement Errors & Experiments & Calculations","Density & Relative Density & Calculations","Simple Machines & Efficiency & Calculations","Rectilinear Motion & Graphs & Calculations","Reflection & Refraction at Plane Surfaces & Calculations","Electric Field Lines & Equipotential","Bernoulli's Principle & Calculations","Van der Graaff Generator","Cathode Ray Oscilloscope","Photocells & Photodiodes","Logic Gates in Physics","Nuclear Reactors & Safety","Simple Pendulum Experiments & Calculations","Young's Modulus & Stress-Strain & Calculations","Interference of Sound Waves & Calculations","Communication Systems & Signals","Lagrangian Mechanics Conceptual","Quantum Tunneling Hardest","Relativistic Velocity & Mass Variation & Calculations","Lenz's Law & Eddy Currents Hardest & Calculations","Wheatstone Bridge Unbalanced Hard & Calculations","Metre Bridge & Potentiometer Traps & Calculations","Combined Lens System Power & Calculations","Prism Minimum Deviation Hardest & Calculations","Apparent Depth & Real Depth Traps & Calculations","Critical Damping & Resonance Curve & Calculations","Moment of Inertia Parallel Perpendicular Axis & Calculations","Heat capacity, specific heat capacity,heat and specific heat capacity of vaporization/combustion/neutralization/ionization calculation and differences","Escape Velocity vs Orbital Velocity Problems & Calculations","Gravitational Potential Hard Integrals & Calculations","Equilibrium of Three Coplanar Forces Hard & Calculations","Collision Oblique & Coefficient Restitution & Calculations","Ballistic Pendulum Hardest & Calculations","Viscosity Terminal Velocity Stokes & Calculations","Thermodynamics Carnot Cycle Efficiency Hard & Calculations","Entropy & Second Law Hardest","Van der Waals Equation Real Gas & Calculations","Waves Stationary Beats Hard Calculations","Doppler Effect Moving Observer Source & Calculations","Photoelectric Stopping Potential Graphs & Calculations","De Broglie Wavelength & Uncertainty & Calculations","Nuclear Binding Energy Curve Traps & Calculations","Semiconductor Zener Diode Regulation","Transistor Amplifier Hardest & Calculations","Logic Gates NAND NOR Universal Hard","AC Power Factor Wattless Current & Calculations","Mutual Inductance Coupled Coils & Calculations","Hysteresis Loop Hardest","X-Rays Moseley's Law Hard & Calculations","Compton Scattering Derivation Trap & Calculations"],
"Chemistry":["Organic chemistry","Emperical and molecular formula","Percentage composition of elements in a molecule","Calculations on relative abundance and relative atomic mass","Types of salts","Examples of efflorescent, deliquescent, hydroscopic salts","separation techniques","Metals and their extraction","Allotropes,isotopes,isotones and isobars of elements and examples","Periodic table and periodic trends","Equilibrium Kp/Kc Le Chatelier","Thermodynamics Hess Law","Organic Isomerism & IUPAC","Redox reactions","Hybridization of orbitals and elements","Alloys of common metals and their percentage composition","Formation, physical and chemical properties of non metals","Transition elements","chemical bonding/bond pair and lone pair/bond angle","Rate of Reaction Kinetics","Atomic Structure Quantum Numbers","Acid Base pH & Buffers","Redox Balancing Hardest","Mole Concept Calculations","Periodic Table Anomalies","Hybridization & Molecular Shapes","Alkanols/Alkanoates Reactions","Qualitative Analysis Salts","Solubility Product Ksp","Enthalpy & Entropy","Stoichiometry & Gas Laws","Electrolysis & Faraday's Laws","Colligative Properties","Chemical Equilibrium Calculations","Volumetric Analysis Titrations","Organic Polymers & Plastics","Benzene & Aromatic Compounds","Carboxylic Acids & Derivatives","Alkanes Alkenes Alkynes Reactions","Petroleum & Fractional Distillation","Radioactivity & Half Life","Water Hardness & Treatment","Corrosion & Prevention","Environmental Chemistry Pollution","Fats Oils Soaps Detergents","Standard Enthalpies Formation Combustion","Electrochemical Cells & Batteries","Catalysis & Catalysts","Chromatography Techniques","Buffer Solutions Preparation","Nomenclature IUPAC Rules","Gas Laws Real vs Ideal","Water of Crystallization","Flame Tests & Ion Identification","Fertilizers NPK Composition","Green Chemistry & Sustainability","IUPAC Hardest Bicyclic Spiro","Conformational Isomerism Newman Fischer","Aromaticity Huckel Rule Hardest","Carbocation Carbanion Stability Order","Named Reactions Cannizzaro Aldol Claisen","Acidity Basicity Organic Hardest","Stereoisomerism R/S E/Z Hardest","Reaction Mechanism SN1 SN2 E1 E2","Ksp Common Ion Effect Hardest","pH of Salt Hydrolysis Hardest","Kp Kc Relation Delta n Hard","Born Haber Cycle Hardest","Faraday's Second Law Mixed Electrolysis","Mole Concept Back Titration Hard","Volumetric Double Indicator Traps","Transition Metal Complex Nomenclature","Crystal Field Theory CFSE Calculation","Enthalpy Entropy Gibbs Free Energy Trap","Rate Law Experimental Determination Hard","Zero First Second Order Graphs","Ostwald Dilution Law Hardest","Osmotic Pressure Van't Hoff Factor","Electrochemical Series Nernst Equation Hard","Isotopes Mass Spectrometer Calculation","Allotropy Sulphur Phosphorus Complex","Extraction Metallurgy Ellingham Diagram","Qualitative Cation Anion Confusing Pairs","Solubility Curves Hardest Problems","Polymers Teflon Nylon Perspex Structure","Detergent Micelle Action Hardest","Environmental Ozone Depletion Mechanism","Nuclear Chemistry Binding Energy Per Nucleon"],
"Biology":["Genetics Dihybrid & Linkage","sexual and asexual reproduction in plants","Ecology Energy & Cycles","Physiology Kidney & Homeostasis","Nervous System Brain & Reflex","Evolution Lamarck/Darwin Theories","Cell Division Meiosis and mitosis Stages","Endocrine Hormones Functions","Plant Physiology Photosynthesis","Circulatory Blood Groups & ECG","Microbiology Viruses & Bacteria","Reproduction in flowering plants/formation of plants ,seeds, fruits","Placentation,types and examples","Cell theories","Mode of nutrition in animals and plants","Respiration, excretion, supporting tissue in plants and animals","Hormonal and nervous coordination","Definition/characteristics/examples of Ephemeral, annual, biennials and perennial corps","Definition/characteristics/examples of monocots and dicots","Tropical biomes, savanna and locations of tropic regions","evolution of plants and animals","Reproduction Embryology, stages in pregnancy","fruits and seed dispersal","Classification Phyla Characteristics","Adaptation Xerophytes/Hydrophytes/halophytes/heliophytes/sciocophytes/mesophytes","Level of organization in plants and animals","Population Studies & Variation","stages of photosynthesis","Respiration & Gaseous Exchange","DNA & RNA Structure","Mendelian Genetics Monohybrid","Sex Determination & Sex Linked Traits","Mutation & Genetic Disorders","Ecosystem & Food Webs","Nitrogen Cycle & Carbon Cycle","Ecological Succession","Soil Types & Nutrients","Pollution & Environmental Conservation","Immunity & Antibodies","Digestive System & Enzymes","Skeletal System & Joints","Excretion in Plants","Growth & Development Germination","Plant Growth Hormones Auxins","Animal Behavior & Tropisms","Parasitism & Symbiosis","Conservation & Wildlife Management","Biotechnology & Genetic Engineering","Human Reproductive System","Blood Clotting Mechanism","Photoperiodism in Plants","Vestigial Organs & Evolution","Osmoregulation in Organisms","Taxonomy & Binomial Nomenclature","Enzyme Inhibition Types","Genetic Engineering Applications","Vaccination & Immunization","Biodiversity & Conservation Strategies","Genetics Linkage Mapping Recombination Frequency","Epistasis Complementary Supplementary Hardest","Hardy Weinberg Chi Square Problems","Blood Group Bombay Phenotype Hardest","Karyotype Aneuploidy Euploidy","Meiosis Nondisjunction Consequences","Kidney Nephron Counter Current Hardest","Hormonal Feedback Positive Negative","Cranial Nerves 12 Functions Traps","ECG Cardiac Cycle Hardest","Photosynthesis Light Reaction Z Scheme","Calvin Cycle C3 C4 CAM Enzymes","Nitrogen Fixation Nitrification Denitrification Bacteria","Ecological Pyramids Energy Biomass Numbers","Population Survivorship Curves Type I II III","DNA Replication Okazaki Fragments Enzymes","Protein Synthesis Transcription Translation","Operon Lac Trp Regulation","Immunity Innate Adaptive Hardest","Agglutination Blood Transfusion Reactions","Enzyme Kinetics Competitive Noncompetitive","Osmoregulation ADH Aldosterone","Plant Anatomy Vascular Cambium","Invertebrate vs Vertebrate Phyla Traps","Ecological Succession Primary Secondary","Auxin Phototropism Geotropism Experiments","Synapse Neurotransmitters IPSP EPSP","Evidence of Evolution Atavism Analogy","Speciation Isolation Mechanisms","IUCN Categories Extinct Endangered","PCR Primer Design Hardest","Menstrual Cycle FSH LH Oestrogen Progesterone Graph","Placenta Types Diffuse Cotyledonary","Fruit Types Dehiscent Indehiscent","Seed Dormancy Breaking Mechanisms","Pollination Adaptations Anemophily Entomophily","Soil Horizons Profile Hardest","Nutrient Deficiency Symptoms NPK"],
"Economics":["National Income GDP/GNP","Balance of Payments & Exchange Rates","Elasticity Calculations","Money Inflation Quantity Theory","Public Finance Taxation","Market Structures Monopoly/Oligopoly","Production Returns to Scale","Demand & Supply Exceptional Cases","International Trade Comparative Advantage","Population & Labour Market","Economic Growth & Development","Budget Fiscal Policy","Money Market Capital Market","Petroleum Economics Nigeria","Unemployment Multiplier","Scarcity & Opportunity Cost","Law of Diminishing Returns","Cost Curves & Revenue","Utility Theory & Consumer Behavior","Indifference Curves & Budget Line","Perfect Competition & Pricing","Factors of Production","Business Organizations & Finance","Agricultural Economics","Industrialization & Industrial Policies","Transportation & Communication","Economic Systems Capitalism/Socialism","Wage Determination & Trade Unions","Price Control & Rationing","Distribution of Income & Poverty","Economic Planning & Development Plans","Central Bank & Commercial Banks","Credit Instruments & Financial Institutions","International Trade Barriers Tariffs","Foreign Aid & Foreign Investment","Economic Integration ECOWAS/EU","Development Problems in Nigeria","Resource Allocation & Economics Problems","Statistics & Graphs in Economics","Consumer Protection & Government Regulation","Savings Investment & Capital Formation","Entrepreneurship & Factors of Production","Circular Flow of Income","Multiplier & Accelerator Effect","Privatization vs Nationalization","Informal Sector Economy","Cost Benefit Analysis","Economic Indicators GDP/GNP/HDI","Subsidy & Price Support","Regional Trade Blocs","Human Capital Development","Sustainable Development Goals","GDP GNP NNP Real Nominal Deflator Hardest","National Income Triple Approach Problems","Balance of Payments Disequilibrium Correction","Exchange Rate Devaluation J Curve","Elasticity Midpoint Arc Calculation Traps","Inflation Demand Pull Cost Push Stagflation","Quantity Theory MV=PT Fisher","Tax Incidence Progressive Regressive Calculation","Monopoly Price Discrimination Degrees","Oligopoly Kinked Demand Game Theory","Perfect vs Monopolistic Competition Graphs","Production Isoquant Isocost Equilibrium","Law of Variable Proportions Stage Analysis","Demand Giffen Veblen Inferior Goods","Trade Comparative Absolute Gains Calculation","Population Malthusian Optimum Theory","Phillips Curve Unemployment Inflation","Fiscal Policy Crowding Out Effect","Monetary Policy CRR SLR Repo","Capital Output Ratio ICOR Problems","Petroleum OPEC Quota Economics","Multiplier Leakage Tax MPC","Opportunity Cost PPC Bowed","Utility Marginal Cardinal Ordinal","Budget Line Shift Rotation","Cost Curves MC AC AVC ATC Relations","Trade Union Collective Bargaining","Price Floor Ceiling Surplus Shortage","Lorenz Curve Gini Coefficient","Development Plans Nigeria 1962-2020","Bank Money Creation Multiplier Hardest","International Finance IMF World Bank","Tariff Quota Effective Rate Protection","FDI Portfolio Crowding","ECOWAS CET Problems","Informal Sector Measurement Issues"],
"Government":["Constitutions 1999/1963/1979","Federalism & Resource Control","Political Parties Ideologies","Pressure Groups Public Opinion","Electoral Systems FPTP/PR","Arms of Government Checks & Balances","Public Administration Bureaucracy","Nigerian Foreign Policy","UN OAU/AU Organs Functions","Military Rule Transitions","Citizenship Rights & Duties","Local Government Reforms","Separation of Powers","Rule of Law Judiciary","Legislature Types & Functions","Political Concepts State/Nation/Government","Sovereignty & Political Power","Political Socialization & Participation","Political Culture & Ideologies","Democracy Types & Features","Authoritarianism & Totalitarianism","Political Development & Modernization","Colonial Administration Indirect/Assimilations","Nationalism & Independence Movements","Post-Independence Constitutions","Executive Powers President/Governor","Judicial Review & Precedent","Fundamental Human Rights","Electoral Commission INEC Functions","Political Processes Election/Rigging","Civil Service & Public Corporations","Revenue Allocation & Fiscal Federalism","Inter-Governmental Relations","Traditional Rulers & Chieftaincy","Civil Society & NGOs","International Organizations ECOWAS/UN","Diplomacy & Treaties","Political Problems Corruption/Census","Public Opinion & Mass Media","Constitutionalism & Supremacy of Constitution","Political Obedience & Legitimacy","Government Revenue Sources","Impeachment Process","Devolution of Powers","One-Party vs Multi-Party Systems","Referendum & Plebiscite","Public Opinion Polls","Political Apathy Causes","Bicameral vs Unicameral Legislature","State of Emergency Powers","Diplomatic Immunity","Regionalism in Nigerian Politics","Constitutional Amendment Entrenched Clause","Federalism Fiscal Unitary Confederal Differences","Resource Control Derivation Principle History","Party System Institutionalization","Pressure Group Anomic Associational","Electoral System Mixed Member Proportional","Doctrine of Separation Montesquieu","Bureaucracy Weberian Characteristics Dysfunctions","Nigerian Foreign Policy Afrocentric","UN Security Council Veto Power Reform","AU Agenda 2063 Organs","Military Disengagement Models","Citizenship Jus Soli Jus Sanguinis","Local Government 1976 Reform Hardest","Rule of Law Dicey Principles","Judicial Independence Removal of Judges","Legislative Oversight Functions","Sovereignty De Jure De Facto Internal External","Political Participation Milbrath Model","Political Culture Almond Verba","Democracy Liberal Illiberal","Totalitarianism Features Orwellian","Lucian Pye Modernization Theory","Colonial Policy French Portuguese British Comparison","Nationalism Pan Africanism Negritude","Republican Constitution 1963 vs Presidential 1979","Executive Veto Pocket Veto Types","Judicial Activism Restraint","Enforcement of Fundamental Rights Procedure","INEC Electoral Act 2022 Hardest","Electoral Malpractice Vote Buying","Public Corporation Commercialization Privatization","Revenue Allocation Formulas Aboyade Okigbo","Intergovernmental Fiscal Relations","Chieftaincy Obas Emirs Classification","NGO Registration CAC Part C","ECOWAS Protocol Free Movement","Diplomacy Shuttle Track One Two","Corruption Transparency International Index","Media Agenda Setting Theory","Constitutional Supremacy vs Parliamentary"],
"Literature":["Figures of Speech Advanced","African Poetry Analysis","Unseen Prose & Poetry","Drama Tragic Hero & Foils","Literary Terms Bathos/Epiphany","Novels Themes & Characterization","Shakespeare Tempest/Macbeth","Meter Rhythm Iambic Pentameter","Satire Irony Types","Narrative Techniques Flashback","African Prose Achebe/Ngugi","Oral Literature Folktales","Tone Mood & Atmosphere","Drama Techniques Aside/Soliloquy","Literary Appreciation","Prose Fiction Elements Plot","Poetry Sound Devices Alliteration","Characterization Direct/Indirect","Setting Time & Place","Point of View Narrator","Symbolism Allegory Motif","Theme Universal/Moral Lesson","Genre Classification Drama/Prose/Poetry","African Drama Wole Soyinka","Modern African Novels","Conflict Types Man/Man","Diction & Syntax","Irony Dramatic/Situational","Comic Relief","Foreshadowing Suspense","Epic Heroic Poetry","Sonnet Structure Types","Literary Criticism Schools","Post-Colonial Literature","Gender in Literature","Literary Devices Juxtaposition","Bildungsroman Novel","Tragedy vs Comedy","Ballad & Elegy","Prose Style Techniques","Postmodernism in Literature","Feminist Literary Theory","Existentialism in Drama","Magic Realism","Stream of Consciousness","Anti-Hero Characterization","Chorus & Greek Tragedy","Metafiction Techniques","Historical Fiction Elements","Children's Literature Themes","Anagnorisis Peripeteia Catharsis Hardest","Hamartia Hubris Nemesis Tragic Flaw","Freytag Pyramid Climax Denouement","Unreliable Narrator Hardest Traps","Dramatic Structure Three Unities","Poetry Enjambment Caesura Elision","Synecdoche Metonymy Litotes Distinction","Paradox Oxymoron Antithesis","Bathos Anticlimax Hardest","Pathetic Fallacy Atmospheric","Chiasmus Anaphora Epistrophe","Euphemism Dysphemism Cacophony","Tetrameter Trimeter Scansion Problems","Blank Verse Free Verse Difference","Sestina Villanelle Pantoum Structure","Satire Horatian Juvenalian Menippean","Irony Socratic Verbal Understatement","African Oral Epic Griot Praise Song","Negritude Literature Senghor CESAIRE","Protest Literature South Africa","Feminist Womanism Stiwanism","Existentialist Angst Absurd Camus Sartre","Postcolonial Othering Hybridity Mimicry","Marxist Literary Base Superstructure","Psychoanalytic Id Ego Superego Criticism","Structuralist Binary Opposition","Deconstruction Differance Aporia","Ecocriticism Pastoral","Queer Theory Literature","Magical Realism Alejo Carpentier Features","Theatre of Absurd Beckett Pinter","Epic Theatre Brecht Alienation","Naturalism vs Realism Zola","Gothic Literature Sublime Terror","Picaresque Anti Hero Journey","Allegory Pilgrim's Progress Second Meaning","Motif Leitmotif Archetype","Intertextuality Allusion Parody Pastiche","Defamiliarization Shklovsky","Foregrounding Deviation"],
"Commerce":["Insurance Indemnity Subrogation","Stock Exchange Bull/Bear","Bills of Exchange Cheques","Business Law Agency Contract","Partnership Dissolution","International Trade Incoterms","Transportation Documents","Warehousing Logistics","Advertising Media Types","Banking Monetary Policy","Trade Associations Functions","Privatization Commercialization","E-Commerce Digital Payment","Cooperative Societies Types","Capital Profit Types","Business Organizations Sole/Company","Communication Business","Tourism & Hospitality","Retailing Wholesaling","Consumer Protection","Business Ethics CSR","Import Export Procedures","Cargo Insurance","Entrepreneurship SMEs","Company Registration CAC","Business Finance Sources","Production Process","Market Research","Branding Trademarks","Risk Management","Taxation VAT Customs","Balance of Trade","Tariffs Quotas","Currency Exchange","Marketing Mix","Business Cycles","Credit Instruments","Warehousing Types","Legal Aspects Company Law","Aids to Trade","Franchising Business Model","Mergers & Acquisitions","Consumer Credit & Hire Purchase","Trade Fairs & Exhibitions","Business Documents Invoice/Receipt","Chambers of Commerce","Free Trade Zones","Multinational Corporations","Business Communication Channels","Outsourcing & Offshoring","Insurance Principles Utmost Good Faith Proximate Cause","Double Insurance Contribution Hardest","Reinsurance Treaty Facultative","Stock Exchange Speculation Stag Jobber","Bulls Bears Lame Duck Hardest Terms","Bills of Exchange Parties Acceptor Drawer","Cheques Crossing Special General","Contract Offer Acceptance Consideration","Partnership Garner vs Murray Rule","Incoterms 2020 FOB CIF EXW DDP","Bill of Lading Charter Party Types","Warehousing Bonded Private Public","Advertising DAGMAR AIDA Models","Banking CRR SLR Monetary Tools","Trade Union Employers Association","Privatization Decree 1988 Methods","E-Commerce B2B B2C C2C","Cooperative Rochdale Principles","Capital Authorized Issued Working","Memorandum Articles Ultra Vires","Communication Formal Informal Grapevine","Tourism Multiplier Effect","Retailing Supermarket Hypermarket","Consumer Rights Redress","CSR Triple Bottom Line","Import Bill Entry Procedure","Cargo Marine Insurance Institute Clauses","SME Survival Challenges","CAC Registration Steps Pre Incorporation","Finance Equity Debt Gearing","Production EOQ Batch Job Flow","Market Research Primary Secondary","Branding Brand Equity Pyramid","Risk Pure Speculative Insurable","Taxation Incidence Progressive Degressive","BOT BOP Current Capital Account","Tariff Ad Valorem Specific","Exchange Rate Spot Forward","Marketing 4Ps 7Ps Extended","Business Cycle Phases Leading Indicators","Credit Letter Credit Types","Warehouse Warrant Lien","Company Law Piercing Veil Doctrine"],
"Accounting":["Partnership Accounts Goodwill","Company Accounts Share Issues","Branch Accounts Accounting","Depreciation Reducing Balance","Bank Reconciliation Hard","Final Accounts Adjustments","Ratio Analysis Interpretation","Consignment Joint Venture","Manufacturing Accounts","Error Correction Suspense Account","Contract Accounts","Non-Profit Organizations","Income Tax PAYE","Budgeting Variance Analysis","Costing Marginal/Absorption","Double Entry Bookkeeping","Cash Book Bank Reconciliation","Ledger Posting Principles","Trial Balance Errors","Financial Statements IFRS","Inventory Valuation FIFO/LIFO","Auditing Principles","Capital & Revenue Expenditure","Working Capital Management","Cash Flow Statement","Company Liquidation","Single Entry Records","Cost Center Profit Center","Budgetary Control","Standard Costing","Accounting Concepts Conventions","Computerized Accounting","Public Sector Accounting","Banking Accounting","Insurance Accounting","Not-for-Profit Clubs","Royalty Accounts","Hire Purchase","Departmental Accounts","Control Accounts","Amalgamation of Businesses","Provision for Bad Debts","Accruals & Prepayments","Journal Entries & Ledgers","Suspense Account Errors","Manufacturing Overheads","Sinking Fund Accounts","Cash Budgets Preparation","Partnership Admission & Retirement","IFRS vs GAAP Standards","Partnership Goodwill Valuation Methods Average Super Profit","Admission Revaluation Sacrifice Ratio","Retirement Garner vs Murray Capital Adjustment","Company Forfeiture Reissue Discount Premium","Bonus Issue Right Issue Hardest","Branch Debtors System Stock Adjustment","Depreciation Change Method IAS 8","Bank Unpresented Presented Adjusted Balance Trap","Final Accounts Provision Contingent Liability","Ratio Gearing Acid Test Interest Cover","Consignment Del Credere Overriding Commission","Joint Venture Memorandum Method","Manufacturing Apportionment Blending","Suspense Trial Balance Difference","Contract Escalation Retention Notional Profit","Non Profit Subscription Arrears Advance Life Member","PAYE Tax Relief Allowance Calculation","Variance Material Labour Sales Mix Yield","Marginal Contribution Breakeven C/S Ratio","Double Entry Discount Cash Trade","Three Column Cash Book Contra","Ledger Control Account Reconciliation","Trial Balance Transposition Error","IFRS 15 Revenue IFRS 16 Lease","FIFO LIFO Average Inflation Effect","Auditing Vouching Verification","Capital Revenue Deferred Revenue","Working Capital Operating Cycle","Cash Flow IAS 7 Indirect Method Hardest","Liquidation Statement of Affairs Deficiency","Single Entry Conversion Gross Profit","Cost Centre Allocation Apportionment","Budgetary Zero Base Rolling","Standard Labour Material Variance Analysis","Concept Accrual Matching Prudence","Computerized ERP Advantage","Public Sector Fund Accounting","Banking Non Performing Loan Provision","Insurance Unearned Premium","Club Bar Trading Profit","Royalty Minimum Rent Shortworkings","Hire Purchase Repossession Calculation","Departmental Inter Department Transfer Pricing","Control Reconciliation Total Debtors Creditors","Amalgamation Purchase Consideration Goodwill","Doubtful Debt Provision Aging Method","Accrual Prepaid Income Receivable","Journal Narration Opening Entry","Suspense Fraud Error Correction","Overhead Under Over Absorption","Sinking Fund Debenture Redemption","Cash Budget Receipt Payment Forecast"],
"Geography":["Map Reading Bearings Gradients","GIS Remote Sensing","Plate Tectonics Volcanism","Climatology Koppen Air Masses","Population Census Migration","Economic Activities Location Theory","Soils Laterization Profile","Oceanography Currents Tides","Environmental Hazards Pollution","Transport Trade Routes","Settlement Conurbation","Weather Synoptic Charts","Agriculture Systems Problems","Nigeria Drainage Vegetation","Rocks Weathering Types","Latitude Longitude Time","Earth Structure Layers","Atmospheric Pressure Winds","Climate Change Global Warming","Erosion Types Prevention","Biomes Distribution","Natural Resources Minerals","Urbanization Problems","Rural Development","Tourism Geography","Regional Geography West Africa","World Trade Patterns","Cartography Map Projections","Field Work Methods","Environmental Conservation","Energy Resources","Industrial Location Factors","Population Structure Pyramid","Migration Push Pull Factors","Geomorphology Landforms","Hydrology Water Cycle","Statistics in Geography","Remote Sensing Applications","Sustainable Development","Natural Vegetation Types","Desertification Causes & Control","River Basin Development","Mining & Quarrying Impact","Coastal Landforms","Karst Topography","Wind Patterns & Circulation","Agricultural Land Use Patterns","Urban Planning & Zoning","Renewable Energy Geography","Satellite Imagery Applications","Bearings Back Bearing Grid Magnetic","Contours Intervisibility Cross Section","GIS Buffer Overlay Georeferencing Hardest","Plate Boundaries Wadati Benioff Zone","Volcanism Intrusive Extrusive Features","Koppen A B C D E Subtypes","Air Mass Tropical Continental Fronts","Census De Facto De Jure Errors","Weber Location Least Cost Theory","Laterization Podzolization Calcification","Ocean Salinity Thermocline Pycnocline","Current El Nino La Nina Effect","Hazard Risk Vulnerability Model","Trade Bilateral Multilateral Imbalance","Conurbation Megalopolis Primate City","Synoptic Isobar ITCZ Interpretation","Agriculture Von Thunen Model Intensive","Nigeria Niger Benue Tributaries","Weathering Exfoliation Carbonation","Great Circle Local Time Calculation","Mohorovicic Gutenberg Discontinuity","Pressure Gradient Coriolis Geostrophic Wind","Greenhouse Gases Kyoto Protocol","Gully Sheet Rill Erosion Control","Biome Ecotone Succession","Mineral Exploration Methods","Urban Slum Gentrification","Rural Depopulation Push","Tourism Butler Model","ECOWAS Trade CFA Zone","World WTO GATT Patterns","Projection Mercator Peters Conical Choice","Field Sampling Systematic Random","Conservation In Situ Ex Situ","Energy HEP Geothermal","Industrial Agglomeration Deglomeration","Population Momentum Dependency Ratio","Migration Ravenstein Laws","Karst Limestone Cycle Sinking","Coriolis Ferrel Hadley Cells","Land Use Bid Rent Theory","Zoning Setback Density Control","Renewable Energy Potential Mapping","Satellite Resolution Spectral Spatial Temporal"],
"CRS":["Prophets Isaiah/Jeremiah","Parables Interpretation","Miracles Significance","Pauline Epistles Romans","Old Testament Covenant Law","Life of Jesus Temptation-Ascension","Apostolic Age Jerusalem Council","Wisdom Literature Job","Kingship Saul/David/Solomon","Major Minor Prophets Comparison","Synoptic Problem Gospels","Sermon on Mount Teachings","Faith Justification Works","Holy Spirit Pentecost","Christian Ethics & Morality","Creation Fall Salvation","Church Sacraments Baptism","Beatitudes Kingdom of God","Apostles Peter/Paul","Early Church Persecution","Prayer Worship Liturgy","Christian Family Marriage","Social Justice Issues","Biblical Archaeology","Revelation Eschatology","Christian Denominations","Evangelism Missions","Christian Festivals Easter","Ten Commandments","Psalms Worship","Proverbs Teachings","Gospel of John Themes","Acts of Apostles","Christian Leadership","Forgiveness Reconciliation","Stewardship Resources","Christian Witness","Discipleship Cost","Christian Unity Ecumenism","Bible Canon Authority","Job's Suffering & Faith","Genesis Creation Accounts","Exodus & Deliverance Theme","Ruth & Loyalty Theme","Christian Marriage Principles","Tithing & Stewardship","Church History Reformation","Missionary Journeys of Paul","Servanthood & Humility","Christian View on Suffering","Isaiah Servant Songs Suffering Messiah","Jeremiah Temple Sermon New Covenant","Parable Sower Prodigal Mustard Hardest Interpretation","Miracle Nature Healing Eschatological Significance","Romans Justification Sanctification Predestination","Covenant Abrahamic Mosaic Davidic","Temptation Wilderness Synoptic Significance","Jerusalem Council Circumcision Debate Acts 15","Job Theodicy Retribution Friends Speeches","Saul Rejection David Covenant Solomon Apostasy","Prophetic Oracles Judgment Salvation Form","Synoptic Q Source Markan Priority","Sermon Antitheses You Have Heard Hardest","Faith James 2 vs Romans 4 Reconciliation","Pentecost Tongues Charismata Cessation","Christian Ethics Situation Absolutist","Creation Imago Dei Fall Original Sin","Sacraments Ordinance Transubstantiation","Beatitudes Makarios Kingdom Reversal","Peter Petrine Paul Pauline Conflict Galatians 2","Persecution Nero Domitian Edict Milan","Liturgy Eucharistic Anamnesis Epiclesis","Christian Family Household Codes Col Eph","Social Justice Amos 5 Prophetic Critique","Archaeology Dead Sea Scrolls Nag Hammadi","Revelation Apocalyptic Symbol 666 144000","Denomination Catholic Orthodox Protestant Distinction","Mission Missio Dei Evangelism Proselytism","Easter Paschal Controversy Date","Decalogue Covenant Code Holiness","Psalms Imprecatory Messianic Classification","Proverbs Wisdom Folly Woman","John Logos I Am Signs","Acts Speeches Kerygma Hardest","Leadership Servant Diakonia","Reconciliation Atonement Theories","Stewardship Parable Talents Oikonomia","Witness Martyria Koinonia","Discipleship Luke Cost Calculation","Ecumenism WCC Vatican II","Canon Muratorian Athanasius Criteria","Job Elihu Speeches Whirlwind","Creation Priestly Yahwist Contradiction","Exodus Plagues Hardening Pharaoh","Ruth Levirate Kinsman Redeemer Goel","Marriage Divorce Malachi 2 Matthew 19","Tithe Malachi 3 Deut 14","Reformation 95 Theses Indulgence","Paul Journey Shipwreck Chronology","Kenosis Philippians 2 Humility","Suffering 1 Peter Theology Persecution"],
"History":["Nigerian Civil War Causes","Colonial Indirect Rule","Nationalism Herbert Macaulay","Pre-Colonial Oyo/Benin Empire","Military Coups Nigeria","Amalgamation 1914 Effects","Constitutional Developments 1922-1999","Slave Trade Abolition","Islamic Jihad Dan Fodio","Missionary Activities Impact","Independence Movements Africa","Apartheid South Africa","World Wars Effects Nigeria","Trade Trans-Saharan/Atlantic","Political Systems Benin/Oyo","Ancient Civilizations Egypt/Greece","Cold War Politics","Decolonization Asia/Africa","UN Formation Functions","League of Nations","Renaissance Reformation","French Revolution","Industrial Revolution","Imperialism Scramble Africa","Nigeria First Republic","Second Republic Politics","Third Republic June 12","Fourth Republic Democracy","Ahmadu Bello/Awolowo/Zik","Political Parties History","Civil Society Role","Human Rights Movements","Economic History Nigeria","Education History","Foreign Policy Nigeria","International Relations","Pan-Africanism","Cultural History","Women in Politics","Youth Movements","Berlin Conference 1884","Sokoto Caliphate Administration","Aba Women's Riot 1929","Nigerian Press History","Trade Unionism in Nigeria","Biafra & Reconciliation","ECOWAS Formation & Role","African Union Objectives","Cold War Proxy Conflicts Africa","Nigerian Constitutional Conferences","Civil War Aburi Accord Gowon Ojukwu","Indirect Rule Lugard Dual Mandate Critique","Herbert Macaulay NNDP 1923 Hardest","Oyo Mesi Alaafin Ogboni Checks","Military Coup 1966 Major Kaduna Nzeogwu","Amalgamation Fiscal Railway Motive","Clifford 1922 Richards 1946 Macpherson 1951","Slave Trade Triangular Abolition 1807 Wilberforce","Dan Fodio Hijra Sokoto Fulani Hegemony","Mission CMS Education Fourah Bay","Independence Nkrumah Kenyatta Senghor Comparison","Apartheid Sharpeville Soweto Mandela Release","World War II Herbert Macaulay KIA Resources","Trans Saharan Gold Salt Mansa Musa","Benin Ogiso Obas Guilds","Egypt Pyramids Hieroglyph Papyrus","Cold War Non Aligned Bandung 1955","Decolonization India Ghana Method","UN Trusteeship Decolonization","League Failure Manchuria Abyssinia","Renaissance Humanism Reformation Indulgence","French Estates Tennis Court Napoleon Code","Industrial Enclosure Capital Accumulation","Scramble Berlin King Leopold Congo","First Republic Action Group Crisis 1962","Second Republic NPN UPN Shagari Austerity","June 12 Abiola Annulment IBB","Fourth Republic Obasanjo PDP Rotation","Bello Sardauna Ahmadu Awolowo Federalism Zik Nationalism","Parties AG NCNC NPC Ideology","Civil Society NADECO Pro Democracy","Human Rights UDHR 1948 Vienna","Economic SAP 1986 Structural Adjustment Effect","Education 6-3-3-4 UPE Hardest","Foreign Policy Murtala Muhammed Angola","IR Realism Liberalism Dependency Theory","Pan African Du Bois Garvey Nkrumah","Cultural NOK Ife Bronze","Women Funmilayo Ransome Kuti Politics","Youth NYM Zikist Movement","Berlin Artificial Borders Effect","Caliphate Emirate Tributary System","Aba Women's Taxation Warrant Chiefs","Press Lagos Weekly Record Azikiwe West African Pilot","Trade Union Enugu Coal 1949","Biafra Starvation Blockade 3Rs","ECOWAS Lome Treaty CET Hardest","AU Constitutive Act Peer Review","Proxy Angola Mozambique Cold War","Conference Lancaster House Constitutional"],
"Civic Education":["Constitution Rule of Law","Human Rights UDHR","Citizenship Dual Naturalization","Drug Abuse Trafficking","Governance Democracy Dictatorship","Values National Unity","Youth Restiveness Cultism","EFCC/ICPC Anti-Corruption","Civil Society NGOs","Popular Participation","International Organizations UN","Leadership Followership","Voters Apathy","Traffic Rules Road Safety","Inter-communal Conflicts Resolution","Political Apathy","Responsible Parenthood","Family Life HIV/AIDS","Social Issues Poverty","National Identity","Patriotism Loyalty","Constitutional Rights","Law & Order","Community Service","Environmental Protection","Peace Building","Inter-Ethnic Relations","Gender Equality","Consumer Protection","Financial Literacy","Entrepreneurship Skills","ICT in Governance","Public Property Protection","National Symbols","Civic Duties Obligations","Emergency Services","Conflict Management","Tolerance Accommodation","Social Justice","Democratic Values","Whistleblowing & Accountability","Cybercrime & Online Safety","National Values & Ethics","Human Trafficking Awareness","Child Rights & Protection","Disaster Preparedness","Federal Character Principle","Public Complaints Commission","Election Observer Groups","National Orientation Agency Role","Constitution Supremacy Entrenchment Judicial Review","Rule of Law Dicey Exceptions Hardest","UDHR Generations Covenant 1966 Enforcement","Citizenship Jus Sanguinis Jus Soli Loss Deprivation","Drug NDLEA Classification Schedule Punishment","Governance Good Indicators World Bank","National Unity Integration Baguio Model","Cultism Fraternity Origin Pyrates Confraternity","EFCC Establishment Act 2004 ICPC 2000 Difference","Civil Society Pressure Group Distinction NGO CBO","Popular Participation Factors Apathy","UN Specialized WHO UNESCO FAO","Leadership Transformational Transactional Traits","Voter Apathy Causes Solution INEC","Road FRSC Highway Code Speed Limit","Intercommunal Jos Tiv Jukun War Resolution ADR","Political Apathy Youth Factor","Parenting Styles Authoritative Effect HIV","Family Functions Reproductive Regulation","Poverty Absolute Relative Indicators","Identity Primordial Constructivist","Patriotism Chauvinism Differences","Rights Derogation Non Derogable","Law Order Maintenance Agencies","Community Self Help Projects","Pollution NESREA Environmental Law","Peace Galtung Negative Positive","Ethnic Pluralism Assimilation","Gender CEDAW Affirmative Action Beijing","Consumer CPC Rights Responsibilities","Financial Money Management Saving","Entrepreneurship MSME Challenges","E Government Types G2C G2B","Public Property Vandalization","Symbols Motto Anthem Pledge Respect","Duties Civic Legal","Emergency NEMA Fire Service Response","Conflict Thomas Kilmann Model","Tolerance Social Cohesion","Justice Distributive Retributive","Democratic Consensus Dialogue","Whistleblower Protection Policy 2016 Reward","Cybercrime EFCC Act 2015 Types Yahoo","Ethics Values Societal Decay","Trafficking NAPTIP Protocol Palermo","Child CRA 2003 Rights Best Interest","Disaster Mitigation Preparedness NEMA","Federal Character Quota Derivation","Ombudsman Public Complaints Functions","Observer AU ECOWAS EU Role","NOA Value Reorientation Campaign"],
"Further Maths":["Calculus Implicit Parametric","Matrices Inverse Transformation","Conic Sections Parabola/Ellipse","Complex Numbers De Moivre","Probability Binomial/Poisson","Vectors Triple Products","Differential Equations","Statics Moments Couples","Kinematics Projectiles","Polynomials Roots Relations","Series Binomial Expansion","Trigonometry R-Formula","Inequalities Graphical","Integration Reduction Formula","Logic Sets Proofs","Linear Algebra Eigenvalues","Group Theory","Number Theory Modulo","Numerical Methods Interpolation","Statistics Regression","Hypothesis Testing","Laplace Transforms","Fourier Series","Vector Calculus Gradient","Partial Derivatives","Multiple Integrals","Mechanics Energy Work","Friction Problems","Circular Motion","Simple Harmonic Motion","Matrices Eigenvectors","Probability Distributions","Sampling Techniques","Correlation Regression","Differential Equations ODE","Linear Programming","Graph Theory","Boolean Algebra","Mathematical Proofs","Real Analysis Basics","Hyperbolic Functions","Taylor & Maclaurin Series","Iterative Methods Newton-Raphson","Mechanics Impulse & Momentum","Probability Generating Functions","Recurrence Relations","Optimization Lagrange Multipliers","Difference Equations","Matrix Transformations 3D","Continued Fractions","Implicit Differentiation Second Order","Parametric Differentiation Tangents Normals","Matrix Inverse 3x3 Adjoint Method","Transformation Enlargement Shear Hardest","Parabola Ellipse Hyperbola Eccentricity","De Moivre Roots Unity Hardest","Binomial Mean Variance Poisson Approx","Triple Product Volume Coplanar","ODE Second Order Complementary Particular","Moments Varignon Couple Equilibrium","Projectile Range Time Maximum Height","Polynomial Symmetric Sums Alpha Beta Cubed","Binomial Fractional Negative Expansion Validity","R Formula Harmonic Addition Max Min","Inequality Region Feasible Shading","Reduction Integration Sin^n Cos^n","Logic Tautology Contradiction Proof","Eigenvalues Characteristic Polynomial 2x2 3x3","Group Subgroup Cyclic Order","Modulo Fermat Euler Theorem","Newton Forward Backward Interpolation","Regression Lines Correlation Coefficient","Hypothesis Z T Test Type I II Error","Laplace Unit Step Dirac Delta","Fourier Half Range Even Odd","Gradient Divergence Curl Laplacian","Partial Chain Rule Total Differential","Double Triple Integral Polar","Work Energy Power Conservation","Friction Ladder Rough Inclined Plane","Circular Conical Pendulum Banking","SHM Damping Forced Resonance","Eigenvector Diagonalization","Distribution Normal Poisson Chi Square","Sampling Stratified Cluster","Correlation Rank Spearman","ODE Exact Integrating Factor","LP Simplex Graphical Slack","Graph Euler Hamiltonian","Boolean Karnaugh Simplification","Proof Induction Contradiction","Real Supremum Infimum Limit","Hyperbolic Identity Osborn Rule","Taylor Remainder Lagrange Error","Newton Raphson Convergence Failure","Impulse Conservation Linear Angular","PGF MGF Moment Extraction","Recurrence Homogeneous Particular","Lagrange Constraint Optimization Hardest","Difference Homogeneous","3D Rotation Reflection","Continued Fraction Convergents"],
"Agric Science":["Genetics Cross Breeding","Soil Science CEC pH","Animal Nutrition Ration Formulation","Crop Pathology Diseases","Farm Mechanization Tillage","Agric Economics Demand/Supply","Fisheries Aquaculture","Forestry Deforestation","Extension Services Methods","Weed Science Herbicides","Irrigation Drainage Systems","Animal Physiology Digestion","Farm Records Accounting","Climatology Agriculture Effect","Biotechnology Agric","Crop Production Cereals/Legumes","Animal Production Poultry","Farm Management Planning","Agric Marketing","Soil Fertility Fertilizers","Pest Control Methods","Plant Breeding","Animal Breeding","Agric Engineering","Storage Preservation","Pasture Management","Livestock Diseases","Agric Policy Nigeria","Horticulture Vegetables","Ornamental Plants","Bee Keeping","Piggery Production","Dairy Farming","Pond Management","Feed Formulation","Seed Production","Agric Cooperatives","Rural Sociology","Environmental Impact","Agric Research Institutes","Integrated Pest Management","Agroforestry Systems","Precision Agriculture Technology","Farm Structures & Fencing","Livestock Housing Design","Post-Harvest Losses Reduction","Agricultural Insurance","Sustainable Land Management","Cash Crops vs Food Crops","Rural Infrastructure Development","Genetics Mendel Dihybrid Test Cross Chi Square","CEC Base Saturation Liming pH Buffer","Pearson Square Ration Balancing Crude Protein","Pathology Fungal Bacterial Viral Control Hardest","Mechanization Tractor Power Hp Drawbar","Demand Elasticity Cobweb Model","Aquaculture Recirculating DO Ammonia","Forestry Taungya Afforestation Silviculture","Extension Diffusion Adoption Laggard","Weed Parasitic Striga Herbicide Selectivity","Irrigation Sprinkler Drip Efficiency Leaching","Ruminant Digestion VFA Bloat","Farm Record Profit Loss Balance","Climate Koppen Effect Agriculture Nigeria","Biotech GMO Bt Cotton Biosafety","Cereal Maize Rice Legume Cowpea Fixation","Poultry Brooding Battery Deep Litter","Farm Budget Gross Margin Net","Marketing Channel Middlemen Cooperative","Fertilizer NPK Placement Method","Pest Economic Threshold Injury Level","Breeding Heterosis Mass Selection","Animal Progeny Selection Inbreeding","Engineering Soil Water Conservation","Storage Silo Cribs Pest Fungi","Pasture Legume Grass Mixture Establishment","Disease Anthrax FMD Trypanosomiasis","Policy Land Use Act 1978 SAP Effect","Vegetable Nursery Transplanting Spacing","Ornamental Pruning Lawn Management","Apiculture Hive Langstroth Harvesting","Piggery Farrowing Management","Dairy Lactation Colostrum Milking","Pond Liming Fertilization pH Dissolved Oxygen","Feed Energy TDN Digestibility","Seed Viability Dormancy Certification","Cooperative Rochdale Principles Problems","Rural Migration Factors Extension","EIA Agriculture Deforestation","Research IITA CRIN NISER Mandate","IPM Biological Cultural Chemical Integration","Agroforestry Alley Alley Hedgerow","Precision GPS GIS Variable Rate","Structure Types Building Materials","Housing Ventilation Orientation","Loss Aflatoxin Moisture Control","Insurance NAIC Indemnity Perils","Land Terracing Contour Bund","Cash Food Comparative Advantage","Infrastructure Road Storage Cold Chain"],
"Computer Studies":["Logic Gates Boolean Algebra","Number Bases Conversion Arithmetic","Algorithms Flowcharts Pseudo","Programming Arrays Loops","Database Normalization SQL","Networking OSI TCP/IP","Binary Two's Complement","Computer Architecture CPU","Data Structures Stack/Queue","Internet Protocols Security","System Analysis SDLC","OS Deadlock Scheduling","HTML/CSS/JS Basics","File Management Systems","Cyber Security Cryptography","Programming Languages","Software Types","Hardware Components","Input Output Devices","Memory Management","Operating System Functions","Cloud Computing","Artificial Intelligence","Data Mining","Computer Ethics","Social Media Impact","E-Government","E-Banking","Mobile Computing","Multimedia Applications","Graphics Design","Web Development","Spreadsheet Functions","Presentation Software","Graphics File Formats","Computer Viruses","Firewall VPN","Database Management System","Programming Paradigms","Software Engineering","Cloud Storage Services","Artificial Intelligence Ethics","Version Control Systems Git","Mobile App Development","API Integration Basics","Machine Learning Basics","Blockchain Technology","IoT Internet of Things","Data Privacy Regulations","Agile Software Development","Logic NAND NOR XOR XNOR Truth Table","Boolean Karnaugh De Morgan Simplification Hardest","Base Binary Octal Hex Addition Subtraction","Algorithm Big O Complexity Sorting","Array 2D Traversal Bubble Sort Trace","Normalization 1NF 2NF 3NF BCNF Dependency","OSI Layers Encapsulation TCP 3 Way Handshake","Two Complement Subtraction Overflow","CPU Fetch Decode Execute Pipeline Cache","Stack LIFO Queue FIFO Implementation","Protocol HTTP HTTPS FTP SSL TLS","SDLC Waterfall Agile Spiral Comparison","Deadlock Banker Coffman Conditions Prevention","HTML Semantic Tags CSS Box Model Flex Grid JS DOM","File FAT NTFS Access Methods Sequential","Crypto Symmetric Asymmetric RSA Hash","Language Compiler Interpreter Paradigm High Low","Software System Application Utility Firmware","Hardware Motherboard Bus Architecture","I/O Interrupt DMA Polling","Memory Virtual Paging Segmentation Thrashing","OS Process Thread Scheduling FCFS SJF Round Robin","Cloud IaaS PaaS SaaS Deployment","AI Search BFS DFS Expert System","Mining Classification Clustering Association","Ethics Intellectual Property Piracy Plagiarism","Social Media Algorithm Filter Bubble Digital Footprint","E Government G2C G2B Benefits","E Banking Encryption OTP Fraud","Mobile 3G 4G 5G Architecture","Multimedia Codec Compression Lossy Lossless","Graphics Vector Raster DPI","Web Frontend Backend Full Stack API","Spreadsheet VLOOKUP IF Pivot Absolute Relative","Presentation Animation Transition Master Slide","Format JPEG PNG GIF TIFF SVG Comparison","Virus Trojan Worm Ransomware Rootkit","Firewall Stateful Packet Filtering VPN Tunneling","DBMS ACID Transaction Concurrency","Paradigm OOP Functional Procedural Declarative","Engineering Requirement SRS Testing Types","Cloud AWS Drive Dropbox Synchronization","AI Ethics Bias Explainability Trolley Problem","Git Commit Branch Merge Conflict Rebase","App Native Hybrid Cross Platform Flutter","API REST SOAP JSON Endpoint Authentication","ML Supervised Unsupervised Overfitting","Blockchain Hash Block Consensus PoW PoS","IoT Sensors Actuator MQTT Architecture","Privacy GDPR NDPA Nigeria Consent","Agile Scrum Sprint Kanban Standup Retrospective"],
"Marketing":["Marketing Mix 7Ps","Market Segmentation Targeting","Consumer Behaviour","Product Life Cycle","Pricing Strategies","Promotion Advertising","Distribution Channels","Marketing Research","Branding Packaging","Sales Management","Digital Marketing","International Marketing","Consumerism & Rights","Entrepreneurship Marketing Plan","Public Relations","Services Marketing","Retail Marketing","B2B Marketing","Direct Marketing","Event Marketing","Social Media Marketing","Content Marketing","Brand Equity","Customer Relationship Management","Market Entry Strategies","Product Development","Pricing Psychology","Sales Promotion","Personal Selling","Marketing Ethics","Green Marketing","Rural Marketing","Political Marketing","Non-Profit Marketing","Sports Marketing","Affiliate Marketing","Mobile Marketing","Email Marketing","Marketing Metrics KPI","E-Marketing","Neuromarketing Techniques","Influencer Marketing","Customer Journey Mapping","Marketing Analytics & Big Data","Loyalty Programs Design","Guerrilla Marketing Tactics","Omnichannel Marketing","Product Positioning Strategy","Competitive Analysis SWOT","Marketing Automation Tools","Mix 7Ps People Process Physical Evidence Extended","Segmentation VALS Geodemographic Behavioral Psychographic","Behaviour Maslow Freud Black Box Model Decision","PLC Extension Strategies BCG Link","Pricing Skimming Penetration Going Rate Cost Plus","Promotion DAGMAR AIDA Hierarchy Hardest","Channel Intensive Selective Exclusive Vertical Conflict","Research Experimental Survey Validity Reliability","Branding Brand Architecture Family vs Individual Packaging Label","Sales Territory Quota Forecasting Hardest","Digital SEO SEM PPC ROAS Attribution","International EPRG Standardization Adaptation Tariff","Consumerism Ralph Naderism Rights Responsibilities","Plan Executive Summary SWOT 4Ps Financial Forecast","PR Crisis Management Press Release","Services Gap Model SERVQUAL Intangibility Heterogeneity","Retail Wheel Atmospheric Private Label","B2B Buygrid Derby Webster Wind Buying Center","Direct Response Database RFM","Event 5Cs Sponsorship Activation","Social Algorithm Engagement Reach CTR","Content Funnel TOFU MOFU BOFU SEO","Equity Keller Aaker Brand Resonance Pyramid","CRM CLV Churn Cohort Analysis","Entry Joint Venture Licensing Franchising Export","Development Stage Gate Design Thinking","Psychology Charm Price Decoy Anchoring","Promotion Push Pull Coupon Rebate","Selling SPIN FAB FABV Objection Handling","Ethics Deceptive Greenwashing Subliminal","Green Sustainability Triple Bottom Line LCA","Rural Haat Mandi Challenges 4As","Political 7Ps Voter Segmentation Negative Marketing","Non Profit Donor Motivation Social Marketing","Sports Ambush Endorsement Sponsorship ROI","Affiliate Commission Cookie Attribution","Mobile SMS USSD App Push Notification","Email Open Rate A/B Subject Deliverability","Metrics CAC LTV ROMI NPS Conversion","E Marketing Payment Gateway Logistics","Neuromarketing Eye Tracking EEG fMRI","Influencer Nano Micro Macro Authenticity Disclosure","Journey Touchpoint Pain Empathy Map Moment Truth","Analytics Predictive Descriptive Google Data Studio","Loyalty Tier Points Gamification Redemption","Guerrilla Buzz Ambient Viral Low Budget","Omnichannel Phygital Consistency Inventory Integration","Positioning Perceptual Map Repositioning Differentiation","Analysis Porter Five Forces SWOT TOWS","Automation HubSpot Mailchimp Drip Workflow Lead Scoring"]
};

// ===== RANDOM TOPIC ROTATION =====
// Per-subject shuffled queue of topics. Each call hands out the next topic(s)
// off the queue instead of dumping the ENTIRE topic bank into the prompt, so
// Puter is told to focus ONLY on a small, explicitly-assigned set of topics
// per batch. A subject's queue only reshuffles and starts over once every one
// of its topics has already been handed out at least once — so back-to-back
// batches/quizzes for the same subject burn through different topics before
// any topic is ever repeated. topicsUsedEver just remembers (for this page
// session) which topics have already been assigned at least once, so the
// prompt can explicitly warn Puter when a topic is being revisited.
let topicRotation = {};
let topicsUsedEver = {};

function shuffleCopyForTopics(a){
    let arr = a.slice();
    for(let k = arr.length - 1; k > 0; k--){
        let j = Math.floor(Math.random() * (k + 1));
        [arr[k], arr[j]] = [arr[j], arr[k]];
    }
    return arr;
}

function nextTopicsForSubject(subject, howMany){
    let list = TOPICS[subject];
    if(!list || !list.length) return [];
    if(!topicRotation[subject] || !topicRotation[subject].length){
        topicRotation[subject] = shuffleCopyForTopics(list);
    }
    let picked = [];
    for(let n = 0; n < howMany; n++){
        if(!topicRotation[subject].length){
            topicRotation[subject] = shuffleCopyForTopics(list);
        }
        picked.push(topicRotation[subject].shift());
    }
    return picked;
}

// ============================================================================================
// ===== QUESTION GENERATION FOR MATCHES (Firebase-bank-first, Puter-fallback, same as single) ==
// ============================================================================================
let mpSessionSeen=new Set(); // de-dupes repeats across matches played in this browser tab/session

function normalizeExplanationCasing(q){
    if(!q||!q.options||typeof q.answer!=='number') return q;
    let raw=String(q.explanation||'').trim();
    let parts=raw.split(/\bbecause\b/i);
    let justification=(parts.length>1?parts.slice(1).join('because'):raw).trim();
    justification=justification.replace(/^[,:\s]+/,'');
    if(justification.length<10) justification='this matches the correct principle for this question.';
    let opt=String(q.options[q.answer]||'').trim();
    opt=opt.replace(/[.!?]+$/,'');
    opt=opt.replace(/^([A-Z])/, m=>m.toLowerCase());
    q.explanation=`The correct answer is ${opt}, because ${justification}`;
    return q;
}

async function fetchViaPuterMP(subject, subMode, diff, count, excludeHashSet, onStatus){
    const CHUNK_SIZE = 20;
    let avoidHashes = new Set([...mpSessionSeen, ...excludeHashSet]);
    let seenList = [...avoidHashes].slice(-150).join(', ');

    let chunks = [];
    let remaining = count;
    while(remaining > 0){ chunks.push(Math.min(remaining, CHUNK_SIZE)); remaining -= CHUNK_SIZE; }

    let result = [];

    for(let ci=0; ci<chunks.length; ci++){
        let chunkCount = chunks[ci];
        let randomSeed = Math.floor(Math.random()*1000000);
        if(onStatus) onStatus(`Generating ${subject} batch ${ci+1}/${chunks.length} — gathered ${result.length}/${count}`);

        // Randomly assign ONE topic per question index off the rotation queue,
        // instead of handing Puter the entire topic bank to wander through.
        let chunkTopics = nextTopicsForSubject(subject, chunkCount);
        let topicFocus = chunkTopics.length
            ? `Assign EXACTLY one topic per question index, in order — ${chunkTopics.map((t,idx)=>`Q${idx+1}=${t}`).join(' | ')}. Each question must stay strictly inside its own assigned topic only, never drifting onto a different one.`
            : `FOCUS: Core ${subject} syllabus.`;
        if(!topicsUsedEver[subject]) topicsUsedEver[subject] = new Set();
        let repeatedTopics = chunkTopics.filter(t => topicsUsedEver[subject].has(t));
        chunkTopics.forEach(t => topicsUsedEver[subject].add(t));
        let repeatWarning = repeatedTopics.length
            ? ` NOTE: [${repeatedTopics.join(', ')}] were already assigned earlier — for those you MUST invent a completely different question angle, scenario, or formula than anything asked before; a repeated topic must NEVER produce a repeated question.`
            : '';

        let prompt=`DETERMINISTIC JSON ENGINE. Batch ${ci+1}/${chunks.length} Seed:${randomSeed}. You MUST produce exactly ${chunkCount} questions. OUTPUT ONLY minified JSON array. SCHEMA: [{"subject":"${subject}","q":"question ending with ?","options":["...","...","...","..."],"answer":0,"explanation":"..."}] HARD RULES: 1) options=4 unique full sentences, MAXIMUM 12 words each, number of words in each option must range from 1-12 words, NO "A." "B)" prefix, NO single letters 2) answer=INTEGER 0-3 ONLY, 0=options[0] 1=options[1] 2=options[2] 3=options[3], NEVER string, NEVER 1-4 3) explanation MUST start with "The correct answer is " then a copy of options[answer] with its FIRST LETTER LOWERCASED (since it now continues a sentence instead of starting one) then " because" + 50+ words justification that proves why options[answer] is correct 4) SUBJECT:${subject} DIFFICULTY:${diff.toUpperCase()} MODE:${subMode.toUpperCase()} 5) ${topicFocus}${repeatWarning} 6) BANNED REPEAT QUESTIONS — never output anything resembling these previously-used questions:[${seenList}] 7) DIVERSITY: each question must test a different formula, edge case, or scenario, even within the same topic. 8) ANSWER POSITION: across these ${chunkCount} questions, spread the correct answer index roughly evenly across 0,1,2 and 3 in a random order — do NOT put the correct answer at index 0 for most questions. 9) CALCULATION ENFORCEMENT: for ANY assigned topic whose name contains the word "Calculations", the question is REJECTED unless it gives the student concrete numeric values (numbers, units, formulas to apply) and requires them to actually compute a numeric result to pick the right option — a purely definitional/conceptual question does NOT satisfy a "Calculations" topic, and all 4 options for that question must be plausible numeric results (not just one). 10) ARITHMETIC SELF-CHECK (MANDATORY): for every question that involves a calculation, work the calculation out step by step in your head FIRST, confirm which option index that final numeric result actually matches, and ONLY THEN set "answer" to that exact index — the number you restate inside "explanation" MUST be identical to the value shown in options[answer], never a different number. Before outputting, re-read your own explanation's arithmetic and verify it lands exactly on options[answer]; if it does not, redo the question. Getting the marked answer wrong, or writing an explanation whose math contradicts the marked option, is a critical failure — accuracy matters more than speed here. 11) CALCULATION DENSITY FOR ${subject.toUpperCase()}: ${subMode==='numeric' ? `this batch is NUMERIC mode — EXACTLY 90% of these ${chunkCount} questions must require an actual numeric calculation, only 10% may be pure conceptual/definitional.` : `this batch is standard/other mode — EXACTLY 40% of these ${chunkCount} questions may require a numeric calculation, the remaining 60% must test concepts, laws, definitions, or applied reasoning without heavy computation.`}`;

        try{
            let res = await puter.ai.chat(prompt, {model: 'gpt-4o-mini'});
            let txt = typeof res === 'string' ? res : res.message?.content || JSON.stringify(res);
            txt = txt.replace(/```json|```/g, '').trim();
            let startIdx = txt.indexOf('['); let endIdx = txt.lastIndexOf(']');
            if(startIdx !== -1){
                let arr = JSON.parse(txt.slice(startIdx, endIdx + 1));
                if(Array.isArray(arr)){
                    arr.forEach(q => {
                        if(result.length >= count) return;
                        if(!q.q || !q.options || q.options.length < 4) return;
                        q.subject = subject;
                        q.options = q.options.map(o => String(o).replace(/^\s*[A-D]\s*[\.\)\-]\s*/i, '').trim()).slice(0, 4);
                        q.answer = parseInt(q.answer); if(isNaN(q.answer) || q.answer < 0 || q.answer > 3) q.answer = 0;
                        if(q.answer >= q.options.length) q.answer = 0;
                        normalizeExplanationCasing(q);
                        let h = hashQ(q.q);
                        if(!avoidHashes.has(h)){
                            avoidHashes.add(h);
                            result.push(q);
                        }
                    });
                }
            }
        }catch(e){ console.warn('[Puter] chunk failed for '+subject, e && e.message); }

        if(ci < chunks.length-1) await new Promise(r => setTimeout(r, 300));
    }

    return result;
}

// Master orchestrator: builds the full question set for one match, subject quotas split
// evenly (remainder to first subject) — Firebase shared bank checked FIRST, Puter AI used
// ONLY for the shortfall, exactly mirroring the single-player gen() flow. Returns questions
// WITHOUT the answer field ever attached — callers must pull `answer` separately via the
// parallel array this function also returns (answers[i] matches questions[i]).
async function fetchQuestionsForMatch(settings, onStatus){
    let subs=settings.subjects && settings.subjects.length ? settings.subjects : ['Mathematics'];
    let totalRequested=Math.max(3, Math.min(50, settings.qcount||10));
    let diff=settings.difficulty||'Hard';
    let subMode=settings.subMode||'standard';
    let n=subs.length;
    let baseQuota=Math.floor(totalRequested/n);
    let remainder=totalRequested%n;
    let quotas=subs.map((s,idx)=>baseQuota+(idx===0?remainder:0));
    let perSubjectQuestions={};

    for(let si=0; si<subs.length; si++){
        let subject=subs[si];
        let quota=quotas[si];
        perSubjectQuestions[subject]=[];
        if(quota<=0) continue;
        if(onStatus) onStatus(`Checking shared bank for ${subject}…`);
        let bank=await qbGetBank(subject, subMode, diff);
        let bankList=Object.values(bank||{});
        shuffleArr(bankList);
        let fromBank=[];
        let localTaken=new Set();
        for(let q of bankList){
            if(fromBank.length>=quota) break;
            if(!q||!q.q||!Array.isArray(q.options)) continue;
            let h=hashQ(q.q);
            if(mpSessionSeen.has(h)||localTaken.has(h)) continue;
            localTaken.add(h);
            fromBank.push({subject:subject,q:q.q,options:q.options.slice(),answer:q.answer,explanation:q.explanation});
        }
        perSubjectQuestions[subject]=fromBank;
        let shortfall=quota-fromBank.length;
        if(shortfall>0){
            if(onStatus) onStatus(`Generating ${shortfall} new ${subject} questions…`);
            let fresh=await fetchViaPuterMP(subject, subMode, diff, shortfall, localTaken, onStatus);
            perSubjectQuestions[subject]=perSubjectQuestions[subject].concat(fresh);
            qbSaveQuestions(subject, subMode, diff, fresh);
        }
    }

    let combined=[];
    subs.forEach(s=>{combined=combined.concat(perSubjectQuestions[s]||[]);});
    let Q=combined.slice(0,totalRequested);

    let fillAttempts=0;
    while(Q.length<totalRequested && Q.length>0 && fillAttempts<2){
        fillAttempts++;
        let stillNeeded=totalRequested-Q.length;
        let already=new Set(Q.map(q=>hashQ(q.q)));
        let subjForFill=subs[fillAttempts%subs.length]||subs[0];
        if(onStatus) onStatus(`Topping up ${stillNeeded} more unique question(s)…`);
        let extra=await fetchViaPuterMP(subjForFill, subMode, diff, stillNeeded, already, onStatus);
        if(extra && extra.length){Q=Q.concat(extra);qbSaveQuestions(subjForFill, subMode, diff, extra);}else break;
    }
    Q=Q.slice(0,totalRequested);
    Q.forEach(shuffleOptionsFisherYates);
    Q.forEach(normalizeExplanationCasing);
    Q.forEach(q=>mpSessionSeen.add(hashQ(q.q)));
    shuffleArr(Q);
    return Q;
}

// ============================================================================================
// ===== ROOMS / LOBBY ========================================================================
// ============================================================================================
let crContext='duo';
function openCreateRoomModal(context){
    crContext=context;
    $('crModalTitle').textContent = context==='team' ? '🛡️ Create Team Battle' : '⚔️ Create Room';
    $('crTeamBox').style.display = context==='team' ? 'block' : 'none';
    buildSubjectMini('crSubjectMini','cr');
    setCRMode('spak');
    openModal('crModal');
}
function setCRMode(mode){
    crMode=mode;
    ['spak','speed','free'].forEach(m=>$('crm_'+m).classList.toggle('on', m===mode));
    $('crTimeBox').style.display = mode==='free' ? 'none' : 'block';
    $('crTimeLbl').textContent = mode==='speed' ? 'Total Minutes' : 'Seconds / Question';
    $('crRaceBox').style.display = mode==='spak' ? 'flex' : 'none';
}
function genRoomCode(){return 'ESI-'+Math.floor(1000+Math.random()*9000);}

async function createRoom(){
    if(!ME){toast('Please wait for sign-in to finish.');return;}
    let teamMode = crContext==='team';
    let visibility=$('crVisibility').value;
    let powerups=$('crPowerups').value==='on';
    let showExplanations=$('crShowExplain').value!=='off';
    let settings={
        subjects:[...selSubjects.cr], difficulty:$('crDiff').value, subMode:$('crSubMode').value,
        mode:crMode, qcount:parseInt($('crCount').value)||10,
        perQ: crMode==='spak' ? (parseInt($('crTime').value)||20) : null,
        totalMinutes: crMode==='speed' ? (parseInt($('crTime').value)||10) : null,
        raceMode: crMode==='spak' ? !!$('crRaceMode').checked : false,
        teamMode, powerups, showExplanations
    };
    let teamSize=teamMode?parseInt($('crTeamSize').value)||2:1;
    let maxPlayers=teamMode?teamSize*2:2;
    let roomRef=mdb.ref('mp_rooms').push();
    let roomId=roomRef.key;
    let code=visibility==='private'?genRoomCode():null;
    let players={};
    players[MY_UID]={name:ME.username, ready:false, team: teamMode?'A':null, uid:MY_UID, avatarEmoji:ME.avatarEmoji||'🎓'};
    await roomRef.set({
        hostUid:MY_UID, hostName:ME.username, type:'custom', visibility, code,
        settings, teamMode, teamSize, maxPlayers, powerups, status:'waiting',
        teamNames: teamMode?{A:'Team A',B:'Team B'}:null,
        players, createdAt:firebase.database.ServerValue.TIMESTAMP
    });
    if(code) await mdb.ref('mp_room_codes/'+code).set(roomId);
    closeModal('crModal');
    enterLobby(roomId);
    toast('Room created! Waiting for players…');
}

async function openJoinCodeModal(){openModal('joinCodeModal');}
async function joinRoomByCode(){
    let code=$('joinCodeInput').value.trim().toUpperCase();
    if(!code){toast('Enter a room code.');return;}
    let snap=await mdb.ref('mp_room_codes/'+code).get();
    if(!snap.exists()){toast('No room found with that code.');return;}
    closeModal('joinCodeModal');
    await joinPublicRoom(snap.val());
}

async function joinPublicRoom(roomId){
    let snap=await mdb.ref('mp_rooms/'+roomId).get();
    if(!snap.exists()){toast('That room no longer exists.');return;}
    let room=snap.val();
    if(room.status!=='waiting'){toast('That match has already started.');return;}
    let curPlayers=room.players||{};
    if(!curPlayers[MY_UID] && Object.keys(curPlayers).length>=room.maxPlayers){toast('Room is full.');return;}
    if(!curPlayers[MY_UID]){
        await mdb.ref('mp_rooms/'+roomId+'/players/'+MY_UID).set({name:ME.username, ready:false, team: room.teamMode?autoBalanceTeam(curPlayers):null, uid:MY_UID, avatarEmoji:ME.avatarEmoji||'🎓'});
    }
    enterLobby(roomId);
}
function autoBalanceTeam(players){
    let a=0,b=0;Object.values(players||{}).forEach(p=>{if(p.team==='A')a++;else if(p.team==='B')b++;});
    return a<=b?'A':'B';
}

let isLobbySpectating=false;
function enterLobby(roomId, asSpectator){
    currentRoomId=roomId;
    isLobbySpectating=!!asSpectator;
    if(roomUnsub)roomUnsub();
    let ref=mdb.ref('mp_rooms/'+roomId);
    let cb=snap=>{
        let room=snap.val();
        if(!room){ toast('Room closed.'); leaveRoomLocalOnly(); showScreen('rooms'); return; }
        let amPlayer=!!(room.players && room.players[MY_UID]);
        if(!amPlayer && !isLobbySpectating){ toast('You were removed from this room.'); leaveRoomLocalOnly(); showScreen('rooms'); return; }
        if(amPlayer) isLobbySpectating=false;
        renderLobby(roomId, room);
        if(room.status==='in_progress' && room.matchId){ joinExistingMatch(room.matchId, roomId, !amPlayer); }
    };
    ref.on('value', cb);
    roomUnsub=()=>ref.off('value', cb);
    attachLobbyChat(roomId);
    showScreen('lobby');
}
function spectateLobby(roomId){
    enterLobby(roomId, true);
    toast('👁 Spectating this lobby — you can chat, and join as a player if a seat opens.');
}
function leaveRoomLocalOnly(){
    if(roomUnsub){roomUnsub();roomUnsub=null;}
    if(lobbyChatUnsub){lobbyChatUnsub();lobbyChatUnsub=null;}
    if(lobbyTypingUnsub){lobbyTypingUnsub();lobbyTypingUnsub=null;}
    currentRoomId=null;
    isLobbySpectating=false;
}
// ---- Predictions Pool: players and spectators alike can predict the winner before a match
// starts; correct guesses earn a small coin bonus once the result is in. ----
function renderPredictionsPool(room){
    let card=$('predictionsCard'); if(!card)return;
    if(room.status!=='waiting' && room.status!=='starting'){ card.style.display='none'; return; }
    card.style.display='block';
    let preds=room.predictions||{};
    let myPick=preds[MY_UID]?preds[MY_UID].pick:null;
    let options;
    if(room.teamMode){
        options=[{key:'A',label:'Team A'},{key:'B',label:'Team B'}];
    }else{
        options=Object.values(room.players||{}).map(p=>({key:p.uid,label:p.name}));
    }
    let tally={};
    Object.values(preds).forEach(p=>{ tally[p.pick]=(tally[p.pick]||0)+1; });
    $('predictionsOptions').innerHTML=options.map(o=>`
        <button class="btn-g btn-sm" style="margin:3px 4px 3px 0;${myPick===o.key?'background:var(--accent);color:#1a1400;border-color:var(--accent)':''}" onclick="predictWinner('${o.key}')">
            ${esc(o.label)} ${tally[o.key]?`(${tally[o.key]})`:''} ${myPick===o.key?'✓':''}
        </button>`).join('');
    let total=Object.keys(preds).length;
    $('predictionsTally').textContent = total ? `${total} prediction${total===1?'':'s'} in so far.` : 'No predictions yet — be the first!';
    // ---- WhatsApp-poll-style breakdown: who picked what, by avatar + name ----
    let votesWrap=$('predictionsVotesWrap');
    if(total){
        votesWrap.style.display='block';
        votesWrap.innerHTML=`<details>
            <summary style="cursor:pointer;font-size:9.5px;font-weight:700;color:var(--accent)">▶ View Votes</summary>
            <div style="margin-top:6px">${options.map(o=>{
                let voters=Object.values(preds).filter(p=>p.pick===o.key);
                if(!voters.length)return '';
                return `<div style="margin-top:6px">
                    <div style="font-size:9.5px;font-weight:700;color:var(--muted)">${esc(o.label)} — ${voters.length}</div>
                    ${voters.map(v=>`<div style="display:flex;align-items:center;gap:6px;font-size:10px;padding:3px 0"><span>${v.avatarEmoji||'🎓'}</span><span>${esc(v.name)}</span></div>`).join('')}
                </div>`;
            }).join('')}</div>
        </details>`;
    }else{
        votesWrap.style.display='none';
    }
}
async function predictWinner(pick){
    if(!currentRoomId||!MY_UID)return;
    await mdb.ref('mp_rooms/'+currentRoomId+'/predictions/'+MY_UID).set({pick, name:ME.username, avatarEmoji:ME.avatarEmoji||'🎓', ts:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});
}
// Called once a match ends — pays out a small coin bonus to everyone (players or spectators)
// who correctly predicted the winner, and reports how many got it right.
async function resolvePredictionsPool(roomId, winnerKey){
    if(!roomId||!winnerKey)return;
    try{
        let snap=await mdb.ref('mp_rooms/'+roomId+'/predictions').get();
        let preds=snap.val(); if(!preds)return;
        let correctUids=Object.keys(preds).filter(uid=>preds[uid].pick===winnerKey);
        if(correctUids.includes(MY_UID)){
            let coinSnap=await mdb.ref('mp_users/'+MY_UID+'/coins').get();
            await mdb.ref('mp_users/'+MY_UID+'/coins').set((coinSnap.val()||0)+15);
            if(ME){ ME.coins=(ME.coins||0)+15; renderProfileScreen(); }
            toast('🔮 Your prediction was correct! +15 coins');
        }
        if(correctUids.length) await pushRoomOrMatchNote(roomId, `🔮 ${correctUids.length} prediction${correctUids.length===1?'':'s'} called it right!`);
    }catch(e){}
}
async function pushRoomOrMatchNote(roomId, text){
    try{ await mdb.ref('mp_rooms/'+roomId+'/chat').push({from:'system', fromName:'System', text, sentAt:firebase.database.ServerValue.TIMESTAMP}); }catch(e){}
}

async function kickPlayer(uid, name){
    if(!currentRoomId)return;
    if(!confirm('Remove '+name+' from this room?'))return;
    await mdb.ref('mp_rooms/'+currentRoomId+'/players/'+uid).remove().catch(()=>{});
    sendNotif(uid,'system', `You were removed from ${ME.username}'s room by the host.`);
    toast(name+' was removed from the room.');
}
async function deleteRoom(){
    if(!currentRoomId)return;
    let snap=await mdb.ref('mp_rooms/'+currentRoomId).get();
    let room=snap.val();
    if(!room)return;
    if(room.hostUid!==MY_UID){toast('Only the host can delete this room.');return;}
    if(!confirm('Delete this room for everyone in it? This cannot be undone.'))return;
    let rid=currentRoomId;
    if(room.code) mdb.ref('mp_room_codes/'+room.code).remove().catch(()=>{});
    await mdb.ref('mp_rooms/'+rid).remove();
    leaveRoomLocalOnly();
    showScreen('rooms');
    toast('Room deleted.');
}
async function leaveRoom(){
    if(currentRoomId){
        let snap=await mdb.ref('mp_rooms/'+currentRoomId).get();
        let room=snap.val();
        if(room){
            let updates={};
            updates['mp_rooms/'+currentRoomId+'/players/'+MY_UID]=null;
            let remaining=Object.keys(room.players||{}).filter(u=>u!==MY_UID);
            if(room.hostUid===MY_UID && remaining.length){
                updates['mp_rooms/'+currentRoomId+'/hostUid']=remaining[0];
                updates['mp_rooms/'+currentRoomId+'/hostName']=room.players[remaining[0]].name;
            }
            await mdb.ref().update(updates);
            if(!remaining.length){ mdb.ref('mp_rooms/'+currentRoomId).remove(); if(room.code) mdb.ref('mp_room_codes/'+room.code).remove(); }
        }
    }
    leaveRoomLocalOnly();
    showScreen('rooms');
}
async function toggleReady(){
    if(!currentRoomId)return;
    let snap=await mdb.ref('mp_rooms/'+currentRoomId+'/players/'+MY_UID+'/ready').get();
    await mdb.ref('mp_rooms/'+currentRoomId+'/players/'+MY_UID+'/ready').set(!snap.val());
}
async function joinTeam(team){
    if(!currentRoomId)return;
    await mdb.ref('mp_rooms/'+currentRoomId+'/players/'+MY_UID+'/team').set(team);
}
async function hostStartMatch(){
    if(!currentRoomId)return;
    let snap=await mdb.ref('mp_rooms/'+currentRoomId).get();
    let room=snap.val();if(!room)return;
    if(room.hostUid!==MY_UID){toast('Only the host can start the match.');return;}
    let plist=Object.values(room.players||{});
    if(plist.length<2){toast('Need at least 2 players to start.');return;}
    let notReady=plist.filter(p=>!p.ready);
    if(notReady.length){toast('Waiting on: '+notReady.map(p=>p.name).join(', '));return;}
    if(room.teamMode){
        let a=plist.filter(p=>p.team==='A').length, b=plist.filter(p=>p.team==='B').length;
        if(a===0||b===0){toast('Both teams need at least one player.');return;}
    }
    $('hostStartBtn').disabled=true;$('hostStartBtn').textContent='Generating questions…';
    await mdb.ref('mp_rooms/'+currentRoomId).update({status:'starting'});
    let matchId=await beginMatchForRoom(currentRoomId, room.settings, plist, room.teamNames);
    await mdb.ref('mp_rooms/'+currentRoomId).update({status:'in_progress', matchId});
    $('hostStartBtn').disabled=false;$('hostStartBtn').textContent='🚀 Start Match (Host)';
}

function copyRoomCode(){
    let code=$('lobbyCodeVal') ? $('lobbyCodeVal').textContent.trim() : (currentRoomCode||'');
    if(!code || code==='------')return;
    let done=()=>{ toast('📋 Room code copied: '+code); playSfx('click'); };
    if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(code).then(done).catch(()=>fallbackCopy(code,done));
    }else{
        fallbackCopy(code,done);
    }
}
function copyTournamentCode(){
    let code=$('tCodeVal') ? $('tCodeVal').textContent.trim() : '';
    if(!code)return;
    let done=()=>{ toast('📋 Tournament code copied: '+code); playSfx('click'); };
    if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(code).then(done).catch(()=>fallbackCopy(code,done));
    }else{
        fallbackCopy(code,done);
    }
}
function fallbackCopy(text,onDone){
    let ta=document.createElement('textarea');
    ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); onDone(); }catch(e){ toast('Code: '+text); }
    document.body.removeChild(ta);
}
function renderLobby(roomId, room){
    lastRoomPlayers=room.players||{};
    lastRoomHostUid=room.hostUid;
    let isHost=room.hostUid===MY_UID;
    let amPlayer=!!(room.players&&room.players[MY_UID]);
    let amSpectating=!amPlayer;
    $('lobbyTitle').textContent=`${room.hostName}'s ${room.teamMode?'Team Battle':'Room'}${amSpectating?' (Spectating)':''}`;
    let s=room.settings;
    $('lobbySettingsSummary').innerHTML=`
        <span class="chip-mini">${subjectsWithIcons(s.subjects)}</span>
        <span class="chip-mini">${esc(s.difficulty)}</span>
        <span class="chip-mini">${esc(s.mode)}${s.raceMode?' ⚡Race':''}</span>
        <span class="chip-mini">${s.qcount} Qs</span>
        ${s.perQ?`<span class="chip-mini">${s.perQ}s/Q</span>`:''}
        ${s.totalMinutes?`<span class="chip-mini">${s.totalMinutes} min total</span>`:''}
        ${room.powerups?`<span class="chip-mini">⚡ Power-ups ON</span>`:'<span class="chip-mini">Power-ups OFF</span>'}
        ${room.settings.showExplanations===false?'<span class="chip-mini">🙈 Explanations Hidden</span>':'<span class="chip-mini">💡 Explanations Shown</span>'}
    `;
    if(room.code){$('lobbyCodeWrap').style.display='block';$('lobbyCodeVal').textContent=room.code;}else{$('lobbyCodeWrap').style.display='none';}
    $('lobbyTeamWrap').style.display=room.teamMode?'block':'none';
    let plist=Object.values(room.players||{});
    if(room.teamMode){
        let tn=room.teamNames||{A:'Team A',B:'Team B'};
        $('lobbyTeamAName').textContent=tn.A; $('lobbyTeamBName').textContent=tn.B;
        $('teamAList').innerHTML=plist.filter(p=>p.team==='A').map(p=>`<div class="friend-sub">${esc(p.name)}</div>`).join('')||'<div class="friend-sub muted">Empty</div>';
        $('teamBList').innerHTML=plist.filter(p=>p.team==='B').map(p=>`<div class="friend-sub">${esc(p.name)}</div>`).join('')||'<div class="friend-sub muted">Empty</div>';
    }
    $('lobbyPlayers').innerHTML=plist.map(p=>`
        <div class="player-slot">
            <div class="fav" style="width:28px;height:28px;font-size:13px">${p.avatarEmoji||'🎓'}</div>
            <div class="friend-name">${esc(p.name)} ${p.uid===room.hostUid?'👑':''}</div>
            ${room.teamMode?`<span class="team-tag ${p.team||'A'}">${p.team||'A'}</span>`:''}
            <span class="ready-pill ${p.ready?'yes':'no'}">${p.ready?'READY':'NOT READY'}</span>
            ${(isHost && p.uid!==MY_UID)?`<button class="icon-btn" style="padding:3px 6px;margin-left:4px" title="Kick" onclick="kickPlayer('${p.uid}','${esc(p.name)}')">✖</button>`:''}
        </div>`).join('');
    renderPredictionsPool(room);
    let switchBtn=$('lobbySwitchBtn');
    if(switchBtn){
        if(room.status!=='waiting'){
            switchBtn.style.display='none';
        }else if(amSpectating){
            let full = plist.length>=(room.maxPlayers||8);
            switchBtn.style.display='block';
            switchBtn.disabled=full;
            switchBtn.textContent = full ? '🎮 Room Full — Can\u2019t Join' : '🎮 Join as Player';
            switchBtn.onclick=switchToPlayerInLobby;
        }else{
            switchBtn.style.display='block';
            switchBtn.disabled=false;
            switchBtn.textContent='👁 Switch to Spectator';
            switchBtn.onclick=switchToSpectatorInLobby;
        }
    }
    $('readyBtn').style.display = amSpectating ? 'none' : 'block';
    if(!amSpectating) $('readyBtn').textContent = (room.players[MY_UID]&&room.players[MY_UID].ready) ? '❌ Not Ready' : "✅ I'm Ready";
    $('hostStartBtn').style.display=isHost?'block':'none';
    $('hostDeleteBtn').style.display=isHost?'block':'none';
    let statusLine=$('lobbyStatusLine');
    // Same rule for every mode, computed once and shared by the button state AND the status
    // line, so the host, every player, and every spectator all see the identical reason —
    // never just a toast that only the person who clicked would ever have seen.
    let notReady=plist.filter(p=>!p.ready).map(p=>p.name);
    let teamsOk = !room.teamMode || (plist.filter(p=>p.team==='A').length>0 && plist.filter(p=>p.team==='B').length>0);
    let allSet = plist.length>=2 && notReady.length===0 && teamsOk;
    let hostBtn=$('hostStartBtn');
    if(room.status==='starting'){
        statusLine.style.display='block';
        statusLine.textContent='🎲 Generating questions… get ready!';
        $('readyBtn').disabled=true;
        if(hostBtn){ hostBtn.disabled=true; hostBtn.classList.remove('lobby-btn-blocked'); }
    }else{
        if(hostBtn){
            // Natively disabled — not just styled to look that way — so it truly cannot be
            // pressed at all while anyone isn't ready, exactly like the tournament ready-gate.
            hostBtn.disabled = isHost && !allSet;
            hostBtn.classList.toggle('lobby-btn-blocked', isHost && !allSet);
        }
        $('readyBtn').disabled=false;
        statusLine.style.display='block';
        if(amSpectating){
            statusLine.textContent = allSet ? '👁 Everyone\u2019s ready — the host can start any moment.' : `👁 Waiting on: ${notReady.length?notReady.join(', '):(!teamsOk?'both teams need at least 1 player':'more players to join')}`;
        }else if(plist.length<2){
            statusLine.textContent='⏳ Waiting for at least one more player to join…';
        }else if(!teamsOk){
            statusLine.textContent='⚖️ Both teams need at least one player before this can start.';
        }else if(notReady.length){
            statusLine.textContent = isHost ? `🚫 Can\u2019t start yet — waiting on: ${notReady.join(', ')}` : `⏳ Waiting on: ${notReady.join(', ')}`;
        }else{
            statusLine.textContent = isHost ? '✅ Everyone\u2019s ready — go ahead and start!' : '⏳ Waiting for the host to start the match…';
        }
    }
}
async function switchToPlayerInLobby(){
    if(!currentRoomId)return;
    let snap=await mdb.ref('mp_rooms/'+currentRoomId).get();
    let room=snap.val();if(!room)return;
    if(room.status!=='waiting'){toast('This match has already started.');return;}
    let plist=Object.values(room.players||{});
    if(plist.length>=(room.maxPlayers||8)){toast('Room is full.');return;}
    await mdb.ref(`mp_rooms/${currentRoomId}/players/${MY_UID}`).set({uid:MY_UID, name:ME.username, avatarEmoji:ME.avatarEmoji||'🎓', ready:false, team:room.teamMode?autoBalanceTeam(room.players):null});
    toast('You\u2019re in! Ready up when you\u2019re set.');
}
async function switchToSpectatorInLobby(){
    if(!currentRoomId)return;
    let snap=await mdb.ref('mp_rooms/'+currentRoomId).get();
    let room=snap.val();if(!room)return;
    if(room.status!=='waiting'){toast('Can\u2019t leave your seat once the match has started.');return;}
    if(room.hostUid===MY_UID){toast('As host, leave the room instead if you want out.');return;}
    await mdb.ref(`mp_rooms/${currentRoomId}/players/${MY_UID}`).remove();
    toast('You\u2019re now spectating.');
}

// ---- Public rooms browser ----
function refreshPublicRooms(silent){
    mdb.ref('mp_rooms').orderByChild('visibility').equalTo('public').limitToLast(40).get().then(snap=>{
        let rooms=snap.val()||{};
        let waiting=Object.entries(rooms).filter(([id,r])=>r.status==='waiting');
        let live=Object.entries(rooms).filter(([id,r])=>r.status==='in_progress' && r.matchId);
        renderPublicRoomsList(waiting, live);
    }).catch(()=>{ if(!silent){$('publicRoomsList').innerHTML='<div class="empty-hint">Could not load rooms.</div>';} });
}
function renderPublicRoomsList(entries, liveEntries){
    liveEntries=liveEntries||[];
    let target1=$('publicRoomsList'), target2=$('hubRoomsPreview');
    if(!entries.length && !liveEntries.length){
        if(target1)target1.innerHTML='<div class="empty-hint">No public rooms right now — create one!</div>';
        if(target2)target2.innerHTML='<div class="empty-hint">No public rooms right now.</div>';
        return;
    }
    let html=entries.map(([id,r])=>{
        let s=r.settings;let count=Object.keys(r.players||{}).length;
        return `<div class="room-card">
            <div class="room-title">🚪 ${esc(r.hostName)}'s ${r.teamMode?'Team Battle':'Room'} ${r.teamMode?'🛡️':'⚔️'}</div>
            <div class="room-meta">${subjectsWithIcons(s.subjects)} • ${esc(s.difficulty)} • ${esc(s.mode)} • ${s.qcount} Qs • ${count}/${r.maxPlayers} players</div>
            <div class="row" style="margin-top:6px">
                <button class="btn btn-p btn-sm" onclick="joinPublicRoom('${id}')">Join Room</button>
                <button class="btn-g btn-sm" onclick="spectateLobby('${id}')">👁 Spectate</button>
            </div>
        </div>`;
    }).join('') + liveEntries.map(([id,r])=>{
        let s=r.settings;let count=Object.keys(r.players||{}).length;
        return `<div class="room-card" style="border-color:var(--info)">
            <div class="room-title">👁 ${esc(r.hostName)}'s ${r.teamMode?'Team Battle':'Duel'} — LIVE NOW</div>
            <div class="room-meta">${subjectsWithIcons(s.subjects)} • ${esc(s.difficulty)} • ${count} players in match</div>
            <button class="btn btn-g btn-sm" style="margin-top:6px;border-color:var(--info);color:var(--info)" onclick="spectateRoom('${id}')">👁 Watch Live</button>
        </div>`;
    }).join('');
    if(target1)target1.innerHTML=html;
    if(target2)target2.innerHTML=entries.slice(0,3).map(([id,r])=>{
        let count=Object.keys(r.players||{}).length;
        return `<div class="room-card"><div class="room-title">🚪 ${esc(r.hostName)}'s Room</div><div class="room-meta">${esc(r.settings.subjects.join(', '))} • ${count}/${r.maxPlayers}</div><button class="btn btn-g btn-sm" style="margin-top:6px" onclick="showScreen('rooms')">View</button></div>`;
    }).join('');
}
let ignoredSearches=new Set();
// Everyone's active quick-match search is public (mp_matchmaking_queue is world-readable),
// so any other user can see it on their own hub and jump straight in — same pairing path
// the automatic matcher uses, just started by a tap instead of a settings match.
function refreshLiveSearches(){
    mdb.ref('mp_matchmaking_queue').get().then(snap=>{
        let all=snap.val()||{};
        let entries=Object.entries(all).filter(([uid,t])=>uid!==MY_UID && !t.claimed && !ignoredSearches.has(uid));
        let el=$('liveSearchesList');if(!el)return;
        if(!entries.length){el.innerHTML='<div class="empty-hint">No one else is searching right now.</div>';return;}
        el.innerHTML=entries.map(([uid,t])=>{
            let s=t.settings||{};
            let tier=tierFor(t.elo||0);
            let info=`${(s.subjects||[]).join(', ')} · ${s.mode} MODE · ${s.qcount||10}Q`.toUpperCase();
            return `<div class="room-card">
                <div class="room-title">${tier[3]} ${esc(t.name)} IS SEARCHING FOR A MATCH</div>
                <div class="room-meta">${esc(info)}</div>
                <div class="row" style="margin-top:6px">
                    <button class="btn btn-p btn-sm" onclick="joinLiveSearch('${uid}')">Join Match</button>
                    <button class="btn-g btn-sm" onclick="ignoreLiveSearch('${uid}')">Ignore</button>
                </div>
            </div>`;
        }).join('');
    }).catch(()=>{ let el=$('liveSearchesList'); if(el)el.innerHTML='<div class="empty-hint">Could not load searches.</div>'; });
}
function ignoreLiveSearch(uid){ ignoredSearches.add(uid); refreshLiveSearches(); }
// Manual counterpart to the automatic queueCb matcher in startQuickMatchSearch — same
// claim-by-transaction handshake, just triggered by a direct tap instead of a background scan.
async function joinLiveSearch(targetUid){
    if(!ME){toast('Please wait for sign-in to finish.');return;}
    let targetTicketRef=mdb.ref('mp_matchmaking_queue/'+targetUid);
    try{
        let result=await targetTicketRef.transaction(cur=>{
            if(!cur || cur.claimed) return;
            cur.claimed=true; cur.claimedBy=MY_UID;
            return cur;
        });
        if(!result.committed || !result.snapshot.val() || result.snapshot.val().claimedBy!==MY_UID){
            toast('That match was just taken — try another.');
            refreshLiveSearches();
            return;
        }
        let opp=result.snapshot.val();
        let roomId=mdb.ref('mp_rooms').push().key;
        let players={};
        players[opp.uid]={name:opp.name, ready:true, team:'A', uid:opp.uid};
        players[MY_UID]={name:ME.username, ready:true, team:'B', uid:MY_UID};
        await mdb.ref('mp_rooms/'+roomId).set({
            hostUid:opp.uid, hostName:opp.name, type:'quickmatch', visibility:'private',
            settings:opp.settings, teamMode:false, maxPlayers:2, powerups:true,
            status:'starting', players, createdAt:firebase.database.ServerValue.TIMESTAMP
        });
        let matchId=await beginMatchForRoom(roomId, opp.settings, [{uid:opp.uid,name:opp.name,team:'A'},{uid:MY_UID,name:ME.username,team:'B'}], undefined, 'qmSearchStatus');
        await mdb.ref('mp_rooms/'+roomId).update({status:'in_progress', matchId});
        await targetTicketRef.update({roomId, matchId});
        enterLobby(roomId);
    }catch(e){ console.warn('[LiveSearch] join failed', e); toast('Could not join that match — try another.'); }
}
async function spectateRoom(roomId){
    let snap=await mdb.ref('mp_rooms/'+roomId).get();
    let room=snap.val();
    if(!room || !room.matchId){toast('This match just ended.');return;}
    toast('👁 Spectating — you can watch but not answer.');
    joinExistingMatch(room.matchId, roomId, true);
}
// Team Battles only (a 1v1 duel has exactly two fixed slots, so switching doesn't apply there).
async function switchToPlayer(team){
    if(!currentMatchId)return;
    let snap=await mdb.ref('mp_matches/'+currentMatchId).get();
    let m=snap.val(); if(!m)return;
    if(!m.teamMode){toast('Switching only works in Team Battles.');return;}
    if(m.state==='ended'){toast('This match has already ended.');return;}
    await mdb.ref(`mp_matches/${currentMatchId}/players/${MY_UID}`).set({name:ME.username, team, uid:MY_UID});
    await mdb.ref(`mp_matches/${currentMatchId}/scores/${MY_UID}`).set(0);
    await mdb.ref(`mp_matches/${currentMatchId}/streaks/${MY_UID}`).set(0);
    await mdb.ref(`mp_matches/${currentMatchId}/playerCount`).transaction(cur=>(cur||0)+1);
    isSpectating=false;
    playSfx('powerup');
    toast('You joined Team '+team+'! Good luck!');
}
async function switchToSpectator(){
    if(!currentMatchId)return;
    let snap=await mdb.ref('mp_matches/'+currentMatchId).get();
    let m=snap.val(); if(!m)return;
    if(!m.teamMode){toast('Switching only works in Team Battles.');return;}
    if(!confirm('Step back to spectating? You will stop scoring for your team.'))return;
    await mdb.ref(`mp_matches/${currentMatchId}/playerCount`).transaction(cur=>Math.max(1,(cur||1)-1));
    await mdb.ref(`mp_matches/${currentMatchId}/kicked/${MY_UID}`).set(true);
    isSpectating=true;
    toast('You are now spectating.');
}

// ============================================================================================
// ===== QUICK MATCH (skill-aware matchmaking queue) ==========================================
// ============================================================================================
let qmSearching=false;
let qmQueueListenerOff=null;

function openQuickMatchModal(){
    buildSubjectMini('qmSubjectMini','qm');
    $('qmSearchStatus').textContent='';
    openModal('qmModal');
}
async function startQuickMatchSearch(){
    if(!ME)return;
    let settings={
        subjects:[...selSubjects.qm], difficulty:$('qmDiff').value, subMode:'standard',
        mode:$('qmMode').value, qcount:parseInt($('qmCount').value)||10,
        perQ: $('qmMode').value==='spak' ? (parseInt($('qmTime').value)||20) : null,
        totalMinutes: $('qmMode').value==='speed' ? (parseInt($('qmTime').value)||10) : null,
        teamMode:false
    };
    qmSearching=true;
    let searchStartedAt=Date.now();
    $('qmSearchStatus').innerHTML='🔎 Searching for an opponent with matching settings… <button class="btn-g btn-sm" style="margin-top:8px" onclick="cancelQuickMatchSearch()">Cancel</button>';
    let myTicketRef=mdb.ref('mp_matchmaking_queue/'+MY_UID);
    await myTicketRef.set({name:ME.username, uid:MY_UID, elo:ME.elo, settings, joinedAt:firebase.database.ServerValue.TIMESTAMP, claimed:false});

    // After ~15s with no exact match, start also considering close-but-not-identical settings
    // (same mode, any difficulty/subject) so people don't wait forever for a rare combo.
    // After 32s with nobody at all, a backup opponent quietly fills the seat so the search
    // always resolves into a match instead of leaving the player stuck waiting.
    let widenedAt=null;
    let timeoutHandle=setInterval(async ()=>{
        if(!qmSearching){clearInterval(timeoutHandle);return;}
        let elapsed=Date.now()-searchStartedAt;
        if(elapsed>15000 && !widenedAt){
            widenedAt=Date.now();
            $('qmSearchStatus').innerHTML='🔎 Still searching… widening to the closest available match… <button class="btn-g btn-sm" style="margin-top:8px" onclick="cancelQuickMatchSearch()">Cancel</button>';
        }
        if(elapsed>32000){
            clearInterval(timeoutHandle);
            cleanupQuickMatchListeners();
            qmSearching=false;
            mdb.ref('mp_matchmaking_queue/'+MY_UID).remove();
            try{ await spawnBotMatch(settings); }
            catch(e){
                console.warn('[QuickMatch] bot fill failed', e);
                $('qmSearchStatus').innerHTML='😴 No one is available right now — try again in a bit, or create a public room and wait for someone to join. <button class="btn-p btn-sm" style="margin-top:8px" onclick="startQuickMatchSearch()">Search Again</button>';
            }
        }
    },1000);
    qmTimeoutHandle=timeoutHandle;

    // Watch my own ticket in case someone ELSE claims and pairs with me first.
    let myCb=snap=>{
        let t=snap.val();
        if(t && t.claimed && t.roomId && t.matchId){
            clearInterval(timeoutHandle);
            cleanupQuickMatchListeners();
            mdb.ref('mp_matchmaking_queue/'+MY_UID).remove();
            qmSearching=false;
            closeModal('qmModal');
            enterLobby(t.roomId);
        }
    };
    myTicketRef.on('value', myCb);
    qmQueueListenerOff=()=>myTicketRef.off('value', myCb);

    // Scan the queue for a compatible, unclaimed opponent and try to claim them.
    let queueCb=async snap=>{
        if(!qmSearching)return;
        let all=snap.val()||{};
        let exact=Object.keys(all).filter(uid=>uid!==MY_UID && !all[uid].claimed && all[uid].settings.difficulty===settings.difficulty && all[uid].settings.mode===settings.mode);
        let candidates=exact;
        if(!candidates.length && widenedAt){
            // Closest-settings fallback: same mode only, ranked by ELO closeness — still a fair
            // pairing, just not an exact subject/difficulty match.
            candidates=Object.keys(all).filter(uid=>uid!==MY_UID && !all[uid].claimed && all[uid].settings.mode===settings.mode);
        }
        if(!candidates.length)return;
        candidates.sort((a,b)=>Math.abs((all[a].elo||1000)-(ME.elo||1000)) - Math.abs((all[b].elo||1000)-(ME.elo||1000)));
        let targetUid=candidates[0];
        let targetTicketRef=mdb.ref('mp_matchmaking_queue/'+targetUid);
        try{
            let result=await targetTicketRef.transaction(cur=>{
                if(!cur || cur.claimed) return; // abort if already gone/claimed
                cur.claimed=true; cur.claimedBy=MY_UID;
                return cur;
            });
            if(result.committed && result.snapshot.val() && result.snapshot.val().claimedBy===MY_UID){
                let opp=result.snapshot.val();
                clearInterval(timeoutHandle);
                cleanupQuickMatchListeners();
                qmSearching=false;
                let roomId=mdb.ref('mp_rooms').push().key;
                let players={};
                players[opp.uid]={name:opp.name, ready:true, team:'A', uid:opp.uid};
                players[MY_UID]={name:ME.username, ready:true, team:'B', uid:MY_UID};
                await mdb.ref('mp_rooms/'+roomId).set({
                    hostUid:opp.uid, hostName:opp.name, type:'quickmatch', visibility:'private',
                    settings:opp.settings, teamMode:false, maxPlayers:2, powerups:true,
                    status:'starting', players, createdAt:firebase.database.ServerValue.TIMESTAMP
                });
                let matchId=await beginMatchForRoom(roomId, opp.settings, [{uid:opp.uid,name:opp.name,team:'A'},{uid:MY_UID,name:ME.username,team:'B'}]);
                await mdb.ref('mp_rooms/'+roomId).update({status:'in_progress', matchId});
                await targetTicketRef.update({roomId, matchId});
                await mdb.ref('mp_matchmaking_queue/'+MY_UID).remove();
                closeModal('qmModal');
                enterLobby(roomId);
            }
        }catch(e){ console.warn('[QuickMatch] claim failed', e); }
    };
    let qRef=mdb.ref('mp_matchmaking_queue');
    qRef.on('value', queueCb);
    let prevOff=qmQueueListenerOff;
    qmQueueListenerOff=()=>{prevOff&&prevOff();qRef.off('value',queueCb);};
}
let qmTimeoutHandle=null;
function cleanupQuickMatchListeners(){
    if(qmQueueListenerOff){qmQueueListenerOff();qmQueueListenerOff=null;}
    if(qmTimeoutHandle){clearInterval(qmTimeoutHandle);qmTimeoutHandle=null;}
}
function cancelQuickMatchSearch(){
    qmSearching=false;
    cleanupQuickMatchListeners();
    if(MY_UID) mdb.ref('mp_matchmaking_queue/'+MY_UID).remove();
    $('qmSearchStatus').textContent='Search cancelled.';
}

// ============================================================================================
// ===== MATCH ENGINE — creation ==============================================================
// ============================================================================================
// Anti-cheat design note (documented honestly rather than oversold): this is a serverless,
// client+RTDB-rules architecture (no Cloud Functions). The correct answer for question N is
// written to mp_matches/$mid/answerKey/$qIdx at match creation, but a security rule (see the
// rules block shared at the end) only lets a *reader* pull that child once mp_matches/$mid/
// reveal/$qIdx is true — Firebase silently omits unreadable children from a parent read, so
// the option buttons render with no way to know the right answer from the payload alone.
// On top of that, this client NEVER inspects answerKey until *this device* has already
// written its own locked-in answer for that question (see lockAnswer/renderMatchScreen below)
// — so even a technically early `reveal` flip can't be used to see the key before answering.
// Once an answer is written it can't be edited (rule: !data.exists()), so peeking after the
// fact changes nothing. This is best-effort fairness appropriate for a backend-free app, not
// a guarantee against a determined attacker reading network traffic directly — that would
// need a real server / Cloud Function to fully close.

async function beginMatchForRoom(roomId, settings, playersArr, teamNames, statusEl, requireReady, explicitHostUid){
    let matchRef = mdb.ref('mp_matches').push();
    let matchId = matchRef.key;
    let players={}; let scores={}; let streaks={};
    playersArr.forEach(p=>{ players[p.uid]={name:p.name, team:p.team||null, uid:p.uid, isBot:!!p.isBot, avatarEmoji:p.avatarEmoji||null}; scores[p.uid]=0; streaks[p.uid]=0; });
    if(requireReady){
        // Waiting-room path — used for every tournament match now, 1v1 and team alike. No
        // questions are fetched and no timer starts until everyone's tapped Ready. 1v1 auto-fires
        // once both are ready (tryStartWaitingMatch); team mode additionally waits on the host to
        // tap Start (hostStartTeamWaitingMatch) since the host keeps starting authority there.
        await matchRef.set({
            roomId, settings, teamMode:!!settings.teamMode, hostUid: explicitHostUid||playersArr[0].uid,
            teamNames: settings.teamMode ? (teamNames||{A:'Team A',B:'Team B'}) : null,
            playerCount:playersArr.length, players, ready:{},
            state:'waiting', scores, streaks,
            createdAt:firebase.database.ServerValue.TIMESTAMP
        });
        return matchId;
    }
    let target = statusEl ? $(statusEl) : null;
    let splash=$('loadingSplash'), splashTxt=$('loadingSplashText');
    if(!target && splash){ splash.style.display='flex'; if(splashTxt) splashTxt.textContent='Preparing your match…'; }
    let onStatus = t=>{
        if(target) target.innerHTML='🔎 '+t;
        else if(splashTxt) splashTxt.textContent=t;
        if(currentScreen==='lobby'){ let b=$('hostStartBtn'); if(b) b.textContent=t; }
    };
    let questions = await fetchQuestionsForMatch(settings, onStatus);
    if(!target && splash) splash.style.display='none';
    let questionsPublic = questions.map(q=>({subject:q.subject, q:q.q, options:q.options}));
    let answerKey={};
    questions.forEach((q,i)=>{ answerKey[i]={answer:q.answer, explanation:q.explanation||''}; });
    await matchRef.set({
        roomId, settings, teamMode:!!settings.teamMode, hostUid:playersArr[0].uid,
        teamNames: settings.teamMode ? (teamNames||{A:'Team A',B:'Team B'}) : null,
        playerCount:playersArr.length, players, questions:questionsPublic, answerKey,
        state:'active', currentQ:0, qStartedAt:firebase.database.ServerValue.TIMESTAMP,
        matchStartedAt:firebase.database.ServerValue.TIMESTAMP,
        answers:{}, scores, streaks, powerupsUsed:{}, shields:{}, freezes:{},
        powerups: settings.powerups!==false, showExplanations: settings.showExplanations!==false,
        createdAt:firebase.database.ServerValue.TIMESTAMP
    });
    // Kept so a bot-fill match can score its stand-in opponent against the real correct
    // answers locally, without ever reading the rules-protected answerKey early (no cheating
    // path opens up — a bot has no client of its own to exploit that read for).
    LAST_FULL_QUESTIONS=questions;
    return matchId;
}
let LAST_FULL_QUESTIONS=null;

// Called from the match screen once BOTH real players have tapped Ready on a 'waiting'
// tournament match. Whichever client notices first fetches the questions and flips the
// match live — guarded by mp_matches/{id}/questions' "!data.exists()" rule so a simultaneous
// race from the other player's client can only ever succeed once; the loser just falls
// through, and its own snapshot listener picks up the resulting state:'active' normally.
async function tryStartWaitingMatch(matchId, m){
    if(matchLocalState.startingMatch) return;
    matchLocalState.startingMatch=true;
    let target=$('mWaitStatus');
    try{
        let onStatus = t=>{ if(target) target.textContent='🔎 '+t; };
        let questions = await fetchQuestionsForMatch(m.settings, onStatus);
        let questionsPublic = questions.map(q=>({subject:q.subject, q:q.q, options:q.options}));
        let answerKey={};
        questions.forEach((q,i)=>{ answerKey[i]={answer:q.answer, explanation:q.explanation||''}; });
        await mdb.ref('mp_matches/'+matchId).update({
            questions:questionsPublic, answerKey, state:'active', currentQ:0,
            qStartedAt:firebase.database.ServerValue.TIMESTAMP,
            matchStartedAt:firebase.database.ServerValue.TIMESTAMP,
            answers:{}, powerupsUsed:{}, shields:{}, freezes:{},
            powerups: m.settings.powerups!==false, showExplanations: m.settings.showExplanations!==false
        });
        LAST_FULL_QUESTIONS=questions;
    }catch(e){
        if(e && e.code==='PERMISSION_DENIED'){
            // Expected — the opponent's client won the race and already started it. Nothing to
            // do here; our own snapshot listener will pick up state:'active' on its own.
            console.warn('[Match] tryStartWaitingMatch lost the race — opponent already started it.');
        }else{
            // A real failure (network blip, AI generation error, etc.) — not a race loss. Back
            // off briefly and let this same client try again automatically instead of leaving
            // both players stuck in the waiting room for the rest of the session.
            console.warn('[Match] tryStartWaitingMatch failed, will retry in 4s:', e && e.message);
            if(target) target.textContent='⚠️ Hit a snag generating questions — retrying…';
            setTimeout(()=>{
                matchLocalState.startingMatch=false;
                mdb.ref('mp_matches/'+matchId).get().then(s=>{
                    let fresh=s.val();
                    if(fresh && fresh.state==='waiting') tryStartWaitingMatch(matchId, fresh);
                }).catch(()=>{});
            }, 4000);
        }
    }
}
// Writes your own ready flag — the only field either player is allowed to touch on a
// 'waiting' match besides the match itself starting.
function markMatchReady(matchId){
    if(!matchId || !MY_UID) return;
    mdb.ref(`mp_matches/${matchId}/ready/${MY_UID}`).set(true).catch(e=>console.warn('[Match] markMatchReady failed:', e && e.message));
}
function renderWaitingRoom(matchId, m){
    let qcard=$('matchQuestionCard'), box=$('mWaitBox');
    if(qcard) qcard.style.display='none';
    if(box) box.style.display='block';
    let ready=m.ready||{};
    let uids=Object.keys(m.players||{});
    if(isSpectating){
        $('mWaitSpecNote').style.display='block';
        $('mWaitSpecNote').textContent='👁 Spectating — waiting for both players to be ready.';
        $('mWaitMeStatus').textContent='';
        $('mWaitOppStatus').innerHTML = uids.map(u=>`${ready[u]?'✅':'⏳'} ${esc((m.players[u]||{}).name||'Player')}`).join('<br>');
        $('mWaitReadyBtn').style.display='none';
        $('mWaitStatus').textContent = (uids.every(u=>ready[u])) ? '🔎 Generating questions, please be patient…' : '';
    }else{
        $('mWaitSpecNote').style.display='none';
        let oppUid=uids.find(u=>u!==MY_UID);
        let opp=m.players[oppUid]||{};
        let iAmReady=!!ready[MY_UID], oppReady=!!(oppUid && ready[oppUid]);
        $('mWaitMeStatus').textContent = iAmReady ? '✅ You are ready' : '⏳ Tap Ready when you\u2019re set';
        $('mWaitOppStatus').textContent = oppReady ? `✅ ${opp.name||'Opponent'} is ready` : `⏳ Waiting for ${opp.name||'your opponent'} to join…`;
        $('mWaitReadyBtn').style.display = iAmReady ? 'none' : 'block';
        if(iAmReady && oppReady){
            $('mWaitStatus').textContent='🔎 Generating questions, please be patient…';
            tryStartWaitingMatch(matchId, m);
        }else{
            $('mWaitStatus').textContent='';
        }
    }
}
// Team-mode equivalent of tryStartWaitingMatch — but the host holds starting authority here
// instead of it auto-firing, since the host already manages team balance/kicks for this match.
async function hostStartTeamWaitingMatch(matchId, m){
    if(m.hostUid!==MY_UID){ toast('Only the host can start this match.'); return; }
    let uids=Object.keys(m.players||{});
    let ready=m.ready||{};
    if(!uids.every(u=>ready[u])){ toast('Everyone must tap Ready first.'); return; }
    if(matchLocalState.startingMatch) return;
    matchLocalState.startingMatch=true;
    try{
        // Written to the match itself (not just shown locally) so every player and spectator
        // sees "generating" at the same time, not just the host's own screen.
        await mdb.ref('mp_matches/'+matchId).update({state:'generating'});
        let questions = await fetchQuestionsForMatch(m.settings, null);
        let questionsPublic = questions.map(q=>({subject:q.subject, q:q.q, options:q.options}));
        let answerKey={};
        questions.forEach((q,i)=>{ answerKey[i]={answer:q.answer, explanation:q.explanation||''}; });
        await mdb.ref('mp_matches/'+matchId).update({
            questions:questionsPublic, answerKey, state:'active', currentQ:0,
            qStartedAt:firebase.database.ServerValue.TIMESTAMP,
            matchStartedAt:firebase.database.ServerValue.TIMESTAMP,
            answers:{}, powerupsUsed:{}, shields:{}, freezes:{},
            powerups: m.settings.powerups!==false, showExplanations: m.settings.showExplanations!==false
        });
        LAST_FULL_QUESTIONS=questions;
    }catch(e){
        matchLocalState.startingMatch=false;
        console.warn('[Match] hostStartTeamWaitingMatch failed, reverting to waiting so the host can retry:', e && e.message);
        mdb.ref('mp_matches/'+matchId).update({state:'waiting'}).catch(()=>{});
        toast('⚠️ Could not start — try again.');
    }
}
function renderTeamWaitingRoom(matchId, m){
    let qcard=$('matchQuestionCard'), wbox=$('mWaitBox'), tbox=$('mTeamWaitBox');
    if(qcard) qcard.style.display='none';
    if(wbox) wbox.style.display='none';
    if(tbox) tbox.style.display='block';
    let ready=m.ready||{};
    let tn=m.teamNames||{A:'Team A',B:'Team B'};
    let teamA=Object.values(m.players||{}).filter(p=>p.team==='A');
    let teamB=Object.values(m.players||{}).filter(p=>p.team==='B');
    let allReady=Object.keys(m.players||{}).every(u=>ready[u]);
    let rosterHtml=(name,list)=>`<div style="flex:1;min-width:130px">
        <div style="font-weight:900;font-size:11px;color:var(--accent);margin-bottom:6px">${esc(name)}</div>
        ${list.map(p=>`<div style="font-size:11px;margin-bottom:4px">${ready[p.uid]?'✅':'⏳'} ${p.avatarEmoji||'🎓'} ${esc(p.name)}</div>`).join('')}
    </div>`;
    $('mTeamWaitRosters').innerHTML = `<div style="display:flex;gap:14px;justify-content:center;text-align:left">${rosterHtml(tn.A,teamA)}<div style="font-weight:900;color:var(--muted);align-self:center">⚔️</div>${rosterHtml(tn.B,teamB)}</div>`;
    let isHost = m.hostUid===MY_UID;
    let iAmReady = !!ready[MY_UID];
    if(m.state==='generating'){
        $('mTeamWaitReadyBtn').style.display='none';
        $('mTeamWaitStartBtn').style.display='none';
        $('mTeamWaitStatus').textContent='🔎 Generating questions, please be patient…';
    }else{
        $('mTeamWaitReadyBtn').style.display = iAmReady ? 'none' : 'block';
        $('mTeamWaitStartBtn').style.display = isHost ? 'block' : 'none';
        if(isHost){
            $('mTeamWaitStartBtn').disabled = !allReady;
            $('mTeamWaitStartBtn').classList.toggle('lobby-btn-blocked', !allReady);
            $('mTeamWaitStartBtn').textContent = allReady ? '▶ Start Match (Host)' : '▶ Waiting for everyone to be ready…';
        }
        $('mTeamWaitStatus').textContent = (!isHost && allReady) ? '⏳ Everyone\u2019s ready — waiting for the host to start…' : '';
    }
}

// Called once quick-match search finds nobody after 32s. Fills the empty seat with a
// human-named backup opponent — never written to mp_users, so it can never show up on the
// leaderboard or receive a friend request; it only ever exists inside this one match.
async function spawnBotMatch(settings){
    let bot=pickBotIdentity();
    let botUid='bot_'+Math.random().toString(36).slice(2,11);
    let botAccuracy=computeBotAccuracy();
    $('qmSearchStatus').innerHTML='🔎 Found an opponent, Questions loading pls wait!';
    let roomId=mdb.ref('mp_rooms').push().key;
    let players={};
    players[botUid]={name:bot.name, ready:true, team:'A', uid:botUid};
    players[MY_UID]={name:ME.username, ready:true, team:'B', uid:MY_UID};
    await mdb.ref('mp_rooms/'+roomId).set({
        hostUid:MY_UID, hostName:ME.username, type:'quickmatch', visibility:'private',
        settings, teamMode:false, maxPlayers:2, powerups:true,
        status:'starting', players, createdAt:firebase.database.ServerValue.TIMESTAMP
    });
    let matchId=await beginMatchForRoom(roomId, settings,
        [{uid:MY_UID,name:ME.username,team:'B'},{uid:botUid,name:bot.name,team:'A',isBot:true,avatarEmoji:bot.avatarEmoji}], undefined, 'qmSearchStatus');
    await mdb.ref('mp_rooms/'+roomId).update({status:'in_progress', matchId});
    closeModal('qmModal');
    enterLobby(roomId);
    pendingBotContext={matchId, botUid, botAccuracy, answerKey:(LAST_FULL_QUESTIONS||[]).map(q=>q.answer)};
}
let pendingBotContext=null;

let isSpectating=false;
function joinExistingMatch(matchId, roomId, asSpectator){
    currentMatchId=matchId;
    isSpectating=!!asSpectator;
    clearInterval(matchLocalState.claimWinInterval);
    matchLocalState={timerHandle:null, myLocked:{}, lastQIdx:-1, reactionsSeen:new Set(), oppOfflineSince:null};
    if(pendingBotContext && pendingBotContext.matchId===matchId){
        matchLocalState.botUid=pendingBotContext.botUid;
        matchLocalState.botAccuracy=pendingBotContext.botAccuracy;
        matchLocalState.botAnswerKey=pendingBotContext.answerKey;
        matchLocalState.botSchedFor={};
        pendingBotContext=null;
    }
    if(matchUnsub)matchUnsub();
    if(matchPresenceUnsub){matchPresenceUnsub();matchPresenceUnsub=null;}
    matchLocalState.claimWinInterval=setInterval(updateClaimWinButton, 5000);
    showScreen('match');
    attachMatchChat(matchId);
    let ref=mdb.ref('mp_matches/'+matchId);
    let cb=snap=>{
        let m=snap.val();
        if(!m)return;
        lastMatchSnapshot=m;
        if(m.state==='ended'){
            matchUnsub && matchUnsub(); matchUnsub=null;
            if(matchPresenceUnsub){matchPresenceUnsub();matchPresenceUnsub=null;}
            detachMatchChat();
            clearInterval(matchLocalState.timerHandle);
            clearInterval(matchLocalState.claimWinInterval);
            if(roomId && m.winner && m.winner!=='draw') resolvePredictionsPool(roomId, m.winner);
            showResultsScreen(matchId, m);
            return;
        }
        if(m.teamMode && (m.state==='waiting' || m.state==='generating')){
            renderTeamWaitingRoom(matchId, m);
            return;
        }
        if(!m.teamMode && m.state==='waiting'){
            renderWaitingRoom(matchId, m);
            return;
        }
        let wbox=$('mWaitBox'), tbox=$('mTeamWaitBox'), qcard=$('matchQuestionCard');
        if(wbox) wbox.style.display='none';
        if(tbox) tbox.style.display='none';
        if(qcard) qcard.style.display='';
        renderMatchScreen(matchId, m);
        if(!isSpectating && !m.teamMode && !matchPresenceUnsub){
            let oppUid=myOpponentUid(m);
            if(oppUid){
                let pRef=mdb.ref('mp_presence/'+oppUid);
                let pCb=psnap=>{
                    let online=(psnap.val()||{}).online!==false;
                    if(!online){ if(!matchLocalState.oppOfflineSince) matchLocalState.oppOfflineSince=Date.now(); }
                    else{ matchLocalState.oppOfflineSince=null; }
                    updateClaimWinButton();
                };
                pRef.on('value', pCb);
                matchPresenceUnsub=()=>pRef.off('value', pCb);
            }
        }
    };
    ref.on('value', cb);
    matchUnsub=()=>ref.off('value', cb);
}
// ===== In-match chat — works the same in 1v1/Read and Team modes, floating so it never
// crowds the question itself. Reuses the same mp_matches node the match already lives under.
let matchChatUnsub=null, matchChatTypingUnsub=null, matchChatTypingTimeout=null;
let matchChatPanelOpen=false, matchChatUnreadCount=0;
function attachMatchChat(matchId){
    detachMatchChat();
    matchChatPanelOpen=false; matchChatUnreadCount=0;
    let panel=$('matchChatPanel'); if(panel) panel.style.display='none';
    let badge=$('matchChatBadge'); if(badge){badge.style.display='none';badge.classList.remove('glow');}
    let ref=mdb.ref('mp_matches/'+matchId+'/chat').limitToLast(100);
    let firstLoad=true;
    let cb=snap=>{
        let msgs=snap.val()||{};
        let ids=Object.keys(msgs).sort((a,b)=>(msgs[a].sentAt||0)-(msgs[b].sentAt||0));
        let box=$('matchChatMsgs'); if(!box)return;
        let lastId=ids[ids.length-1];
        box.innerHTML=ids.map(id=>{let m=msgs[id];let mine=m.from===MY_UID;
            return `<div class="chat-bubble ${mine?'me':'them'}"><b style="opacity:.7;font-size:8.5px">${mine?'':(m.fromAvatar||'🎓')+' '+esc(m.fromName)+': '}</b><bdi style="unicode-bidi:isolate;direction:ltr;display:inline">${esc(m.text)}</bdi><span class="ts">${fmtTime(m.sentAt)}</span></div>`;}).join('');
        box.scrollTop=box.scrollHeight;
        if(!firstLoad && lastId && msgs[lastId] && msgs[lastId].from!==MY_UID){
            playSfx('notify');
            let banner=$('matchChatBanner');
            if(banner){
                banner.innerHTML=`<b>${msgs[lastId].fromAvatar||'🎓'} ${esc(msgs[lastId].fromName)}:</b> ${esc(msgs[lastId].text)}`;
                banner.style.display='block';
                clearTimeout(window.__matchChatBannerTimeout);
                window.__matchChatBannerTimeout=setTimeout(()=>{banner.style.display='none';},4500);
            }
            if(!matchChatPanelOpen){
                let senderIsSpectator = window.__lastMatchPlayers && !window.__lastMatchPlayers[msgs[lastId].from];
                if(!senderIsSpectator){
                    matchChatUnreadCount++;
                    let b=$('matchChatBadge'); if(b){b.style.display='flex';b.classList.add('glow');b.textContent=matchChatUnreadCount;}
                }
            }
        }
        firstLoad=false;
    };
    ref.on('value', cb);
    matchChatUnsub=()=>ref.off('value', cb);
    let typingRef=mdb.ref('mp_matches/'+matchId+'/typing');
    let typingCb=tsnap=>{
        let all=tsnap.val()||{}; let now=Date.now();
        let names=Object.entries(all).filter(([uid,ts])=>uid!==MY_UID && ts && now-ts<4000)
            .map(([uid])=>{let m=window.__lastMatchPlayers&&window.__lastMatchPlayers[uid];return m?m.name:null;}).filter(Boolean);
        let line=$('matchChatTypingLine'); if(line) line.textContent=names.length?names.join(', ')+' typing…':'';
    };
    typingRef.on('value', typingCb);
    matchChatTypingUnsub=()=>typingRef.off('value', typingCb);
}
function detachMatchChat(){
    if(matchChatUnsub){matchChatUnsub();matchChatUnsub=null;}
    if(matchChatTypingUnsub){matchChatTypingUnsub();matchChatTypingUnsub=null;}
}
function toggleMatchChatPanel(){
    matchChatPanelOpen=!matchChatPanelOpen;
    let panel=$('matchChatPanel'); if(panel) panel.style.display=matchChatPanelOpen?'block':'none';
    if(matchChatPanelOpen){
        matchChatUnreadCount=0;
        let b=$('matchChatBadge'); if(b) b.style.display='none';
    }
}
function onMatchChatTyping(){
    if(!currentMatchId)return;
    mdb.ref('mp_matches/'+currentMatchId+'/typing/'+MY_UID).set(firebase.database.ServerValue.TIMESTAMP);
    clearTimeout(matchChatTypingTimeout);
    matchChatTypingTimeout=setTimeout(()=>mdb.ref('mp_matches/'+currentMatchId+'/typing/'+MY_UID).remove(),3000);
}
function sendMatchChat(){
    if(isSpectating){toast('Spectators can only chat before the match starts, in the lobby.');return;}
    let input=$('matchChatInput'); let text=sanitizeChatText(input.value).slice(0,300);
    if(!text||!currentMatchId||!ME)return;
    mdb.ref('mp_matches/'+currentMatchId+'/chat').push({from:MY_UID,fromName:ME.username,fromAvatar:ME.avatarEmoji||'🎓',text,sentAt:firebase.database.ServerValue.TIMESTAMP});
    mdb.ref('mp_matches/'+currentMatchId+'/typing/'+MY_UID).remove();
    input.value='';
}

function updateClaimWinButton(){
    let btn=$('claimWinBtn'); if(!btn)return;
    let offlineFor = matchLocalState.oppOfflineSince ? (Date.now()-matchLocalState.oppOfflineSince) : 0;
    btn.style.display = offlineFor>30000 ? 'block' : 'none';
}
async function claimWinVsAfk(){
    if(!currentMatchId)return;
    if(!confirm("Claim the win? Only do this if your opponent has genuinely disconnected — they'll be recorded as having forfeited."))return;
    let snap=await mdb.ref('mp_matches/'+currentMatchId).get();
    let m=snap.val(); if(!m||m.state==='ended')return;
    let oppUid=myOpponentUid(m);
    await mdb.ref('mp_matches/'+currentMatchId).update({state:'ended', winner:MY_UID, forfeitBy:oppUid, endedAt:firebase.database.ServerValue.TIMESTAMP});
}
async function removeFromMatch(uid){
    if(!currentMatchId)return;
    let snap=await mdb.ref('mp_matches/'+currentMatchId).get();
    let m=snap.val(); if(!m||m.state==='ended')return;
    if(m.hostUid!==MY_UID){toast('Only the host can remove players.');return;}
    if(m.state==='active'){toast("Players can't be removed once the match is underway — use Claim Win if they've disconnected.");return;}
    let name=(m.players[uid]||{}).name||'Player';
    if(!confirm('Remove '+name+' from this match?'))return;
    if(!m.teamMode){
        await mdb.ref('mp_matches/'+currentMatchId).update({state:'ended', winner:MY_UID, forfeitBy:uid, endedAt:firebase.database.ServerValue.TIMESTAMP});
    }else{
        await mdb.ref(`mp_matches/${currentMatchId}/playerCount`).transaction(cur=>Math.max(1,(cur||1)-1));
        await mdb.ref(`mp_matches/${currentMatchId}/kicked/${uid}`).set(true);
    }
    sendNotif(uid,'system', `You were removed from the match by the host.`);
    toast(name+' was removed.');
}

// ============================================================================================
// ===== MATCH ENGINE — live rendering, locking answers, reveal, scoring, timers =============
// ============================================================================================
const POWERUP_DEFS={
    fiftyfifty:{icon:'🎯',label:'50/50', needsTarget:false},
    freeze:{icon:'❄️',label:'Freeze', needsTarget:true},
    double:{icon:'✨',label:'2x Points', needsTarget:false},
    shield:{icon:'🛡️',label:'Shield', needsTarget:false},
    steal:{icon:'💰',label:'Steal', needsTarget:true}
};
function scoreForAnswer(m, qIdx, elapsedMs){
    let s=m.settings;
    if(s.mode==='free') return 500;
    let capMs = s.mode==='spak' ? (s.perQ||20)*1000 : Math.max(8000, ((s.totalMinutes||10)*60000)/(m.questions.length||10));
    let frac = Math.max(0, 1 - (elapsedMs/capMs));
    return Math.round(200 + 800*frac);
}
function myOpponentUid(m){
    if(m.teamMode)return null;
    return Object.keys(m.players||{}).find(u=>u!==MY_UID);
}
// Drives the quick-match backup opponent's answers. This device is the only real client in
// the match, so it submits on the bot's behalf using the real answer key it already holds
// locally from match creation (matchLocalState.botAnswerKey) — it never reads the
// rules-protected answerKey early, so no new cheating path is opened for a real opponent.
function scheduleBotAnswer(matchId, m, qIdx){
    if(m.state!=='active')return;
    let botUid=matchLocalState.botUid;
    if(!botUid || !m.players || !m.players[botUid])return;
    if(m.answers && m.answers[qIdx] && m.answers[qIdx][botUid])return;
    matchLocalState.botSchedFor=matchLocalState.botSchedFor||{};
    if(matchLocalState.botSchedFor[qIdx])return;
    matchLocalState.botSchedFor[qIdx]=true;
    let s=m.settings;
    let capMs = s.mode==='free' ? 15000 : s.mode==='spak' ? (s.perQ||20)*1000 : Math.max(8000, ((s.totalMinutes||10)*60000)/(m.questions.length||10));
    let delay=Math.max(1200, Math.min(capMs-600, Math.round(capMs*(0.25+Math.random()*0.5))));
    setTimeout(async ()=>{
        if(currentMatchId!==matchId || matchLocalState.botUid!==botUid)return;
        let liveSnap=await mdb.ref(`mp_matches/${matchId}/answers/${qIdx}/${botUid}`).get().catch(()=>null);
        if(liveSnap && liveSnap.exists())return;
        let correctIdx=(matchLocalState.botAnswerKey||[])[qIdx];
        let optCount=(m.questions[qIdx]&&m.questions[qIdx].options||[]).length||4;
        let willBeCorrect=Math.random()<(matchLocalState.botAccuracy||0.7);
        let selected;
        if(correctIdx===undefined){ selected=Math.floor(Math.random()*optCount); }
        else if(willBeCorrect){ selected=correctIdx; }
        else{ let wrong=[...Array(optCount).keys()].filter(i=>i!==correctIdx); selected=wrong[Math.floor(Math.random()*wrong.length)]||0; }
        try{
            await mdb.ref(`mp_matches/${matchId}/answers/${qIdx}/${botUid}`).set({selected, ts:firebase.database.ServerValue.TIMESTAMP});
            let correct=correctIdx!==undefined && selected===correctIdx;
            let newStreak=correct?(matchLocalState.botStreak||0)+1:0;
            matchLocalState.botStreak=newStreak;
            if(correct){
                let pts=scoreForAnswer(m, qIdx, delay);
                let mult=newStreak>=5?1.5:newStreak>=3?1.2:1;
                pts=Math.round(pts*mult);
                mdb.ref(`mp_matches/${matchId}/scores/${botUid}`).transaction(cur=>(cur||0)+pts);
            }
        }catch(e){ console.warn('[Bot] answer submit failed', e); }
    }, delay);
}
// Captain = the lowest-uid player on a team — fully deterministic from data every client
// already has, so no extra writes or schema changes are needed to agree on who it is.
function isTeamCaptain(m, uid, team){
    let mem=Object.values(m.players||{}).filter(p=>p.team===team).map(p=>p.uid).sort();
    return mem.length>0 && mem[0]===uid;
}
function captainExtendTime(){
    if(matchLocalState.captainExtendUsed){toast('Captain bonus already used this match.');return;}
    matchLocalState.captainExtendUsed=true;
    matchLocalState.captainExtraForQIdx=matchLocalState.lastQIdx;
    let btn=$('captainExtendBtn'); if(btn) btn.style.display='none';
    playSfx('powerup');
    toast('⭐ +3 seconds added to your own timer for this question!');
}
function showBattleStartBanner(m){
    let banner=$('battleBanner'); if(!banner)return;
    let left, right;
    if(m.teamMode){
        let tn=m.teamNames||{A:'Team A',B:'Team B'};
        left='🔴 '+tn.A; right='🔵 '+tn.B;
    }else{
        let players=Object.values(m.players||{});
        left=(players[0]||{}).name||'Player 1';
        right=(players[1]||{}).name||'Player 2';
    }
    $('bbLeft').textContent=left;
    $('bbRight').textContent=right;
    let meta=$('bbMeta');
    if(meta){
        let subj=(m.settings&&m.settings.subjects)||[];
        meta.textContent=subj.map(s=>subjectIcon(s)+' '+s).join(' · ').toUpperCase()+(m.settings&&m.settings.mode?' · '+m.settings.mode.toUpperCase()+' MODE':'');
    }
    let cd=$('bbCountdown');
    if(cd){ cd.textContent=''; cd.className=''; }
    banner.classList.add('show');
    banner.style.display='flex';
    // Countdown fires after the slide-in/VS reveal has already landed (~950ms in), then the
    // banner clears right on "FIGHT!" so the first question is what the player sees next —
    // no dead pause between hype and actually playing.
    let seq=[[950,'3'],[1550,'2'],[2150,'1'],[2750,'FIGHT!']];
    seq.forEach(([delay,label])=>{
        setTimeout(()=>{
            if(!cd)return;
            cd.textContent=label;
            cd.className=label==='FIGHT!'?'go':'tick';
            if(!isSpectating) playSfx(label==='FIGHT!'?'matchstart':'tick');
        }, delay);
    });
    setTimeout(()=>{ banner.style.display='none'; banner.classList.remove('show'); }, 3250);
}
function renderMatchScreen(matchId, m){
    window.__lastMatchPlayers=m.players||{};
    let qIdx=m.currentQ;
    let q=m.questions[qIdx];
    if(!q){ return; }
    if(matchLocalState.lastQIdx!==qIdx){
        matchLocalState.lastQIdx=qIdx;
        matchLocalState.qRenderStart=Date.now();
        matchLocalState.scoredQ=matchLocalState.scoredQ||{};
        matchLocalState.freezeExtraMs=0;
        matchLocalState.freezeApplied={};
        if(qIdx===0 && !matchLocalState.startSounded){
            matchLocalState.startSounded=true;
            showBattleStartBanner(m);
        }
    }
    // ---- header ----
    let players=Object.values(m.players||{});
    if(m.teamMode){
        let tn=m.teamNames||{A:'Team A',B:'Team B'};
        let teamAScore=players.filter(p=>p.team==='A').reduce((s,p)=>s+(m.scores[p.uid]||0),0);
        let teamBScore=players.filter(p=>p.team==='B').reduce((s,p)=>s+(m.scores[p.uid]||0),0);
        $('matchVsHeader').innerHTML=`
            <div class="vs-side"><div class="nm" style="color:var(--teamA)">${esc(tn.A)}</div><div class="sc">${teamAScore}</div></div>
            <div class="vs-mid">VS</div>
            <div class="vs-side"><div class="nm" style="color:var(--teamB)">${esc(tn.B)}</div><div class="sc">${teamBScore}</div></div>`;
        $('matchTeamPanel').style.display='flex';
        let answered=m.answers&&m.answers[qIdx]?m.answers[qIdx]:{};
        let keyEntryTeam=m.answerKey&&m.answerKey[qIdx];
        function teamBox(team,color){
            let mem=players.filter(p=>p.team===team);
            let total=mem.reduce((s,p)=>s+(m.scores[p.uid]||0),0)||1;
            return `<div class="team-box"><div class="th" style="color:${color}">${esc(tn[team])}</div>${mem.map(p=>{
                let pct=Math.round(((m.scores[p.uid]||0)/total)*100);
                let locked=!!answered[p.uid];
                let resultIc='';
                if(keyEntryTeam){
                    let a=answered[p.uid];
                    resultIc = !a ? '' : (a.selected===keyEntryTeam.answer ? ' ✅' : ' ❌');
                }
                let cap = isTeamCaptain(m,p.uid,team) ? ' ⭐' : '';
                let kickBtn = (m.hostUid===MY_UID && p.uid!==MY_UID && !isSpectating && m.state!=='ended') ? ` <span style="cursor:pointer" onclick="removeFromMatch('${p.uid}')" title="Remove">👢</span>` : '';
                return `<div style="font-size:9px;margin-top:5px"><span class="oppo-indicator ${locked?'locked':''}" style="width:6px;height:6px"></span> ${esc(p.name)}${cap}${p.uid===MY_UID?' (you)':''} — ${m.scores[p.uid]||0}pts (${pct}%)${resultIc}${kickBtn}
                    <div class="contrib-bar-wrap"><div class="contrib-bar" style="width:${pct}%;background:${color}"></div></div></div>`;
            }).join('')}</div>`;
        }
        $('matchTeamPanel').innerHTML=teamBox('A','var(--teamA)')+teamBox('B','var(--teamB)');
        let kw2=$('matchHostKickWrap'); if(kw2) kw2.style.display='none';
        let swWrap=$('matchSwitchWrap');
        if(swWrap){
            if(isSpectating && m.state!=='ended'){
                let tn=m.teamNames||{A:'Team A',B:'Team B'};
                swWrap.style.display='block';
                swWrap.innerHTML=`<div class="muted" style="font-size:8.5px;margin-bottom:4px">Want in? Join a side:</div>
                    <div class="row"><button class="btn btn-g btn-sm" style="border-color:var(--teamA)" onclick="switchToPlayer('A')">Join ${esc(tn.A)}</button>
                    <button class="btn btn-g btn-sm" style="border-color:var(--teamB)" onclick="switchToPlayer('B')">Join ${esc(tn.B)}</button></div>`;
            }else if(!isSpectating && m.state!=='ended'){
                swWrap.style.display='block';
                swWrap.innerHTML=`<button class="icon-btn" style="font-size:8.5px;padding:4px 9px" onclick="switchToSpectator()">👁 Step back to spectating</button>`;
            }else{ swWrap.style.display='none'; }
        }

        // ---- co-op bonus round (every 5th question) + captain review-time privilege ----
        let isBonusQ = qIdx>0 && (qIdx+1)%5===0;
        let bb=$('bonusRoundBanner'); if(bb) bb.style.display = isBonusQ ? 'block' : 'none';
        let myTeam=(m.players[MY_UID]||{}).team;
        let amCaptain = myTeam && isTeamCaptain(m, MY_UID, myTeam);
        let capBtn=$('captainExtendBtn');
        if(capBtn) capBtn.style.display = (amCaptain && !matchLocalState.captainExtendUsed && !isSpectating) ? 'block' : 'none';
    }else{
        let me=m.players[MY_UID]||{name:ME.username};
        let oppUid=myOpponentUid(m);
        let opp=oppUid?m.players[oppUid]:{name:'Opponent'};
        let answered=m.answers&&m.answers[qIdx]?m.answers[qIdx]:{};
        let keyEntryHdr=m.answerKey&&m.answerKey[qIdx];
        let oppResultTxt='';
        if(keyEntryHdr && oppUid){
            let oa=answered[oppUid];
            oppResultTxt = !oa ? '<div style="font-size:8px;color:var(--muted)">No answer</div>'
                : (oa.selected===keyEntryHdr.answer ? '<div style="font-size:8px;color:var(--success)">✅ Got it right</div>' : '<div style="font-size:8px;color:var(--error)">❌ Got it wrong</div>');
        }
        let myScoreNow=m.scores[MY_UID]||0, oppScoreNow=oppUid?(m.scores[oppUid]||0):0;
        let isCloseMatch = qIdx>=2 && Math.abs(myScoreNow-oppScoreNow)<=400 && (myScoreNow+oppScoreNow)>0;
        $('matchVsHeader').innerHTML=`
            <div class="vs-side"><div class="nm">${esc(me.name)} (you)</div><div class="sc">${myScoreNow}</div><span class="oppo-indicator ${answered[MY_UID]?'locked':''}"></span></div>
            <div class="vs-mid">VS${isCloseMatch?'<div style="font-size:8px;color:#ff8f4d;font-weight:800;white-space:nowrap;margin-top:2px">🔥 CLOSE!</div>':''}</div>
            <div class="vs-side"><div class="nm">${esc(opp.name)}</div><div class="sc">${oppScoreNow}</div><span class="oppo-indicator ${oppUid&&answered[oppUid]?'locked':''}"></span>${oppResultTxt}</div>`;
        $('matchTeamPanel').style.display='none';
        let bb2=$('bonusRoundBanner'); if(bb2) bb2.style.display='none';
        let capBtn2=$('captainExtendBtn'); if(capBtn2) capBtn2.style.display='none';
        // Mid-match removal is gone — it was letting a host end an active match and be
        // declared winner outright regardless of the real score. Removing a player is now
        // lobby-only (before the match starts); an actually-abandoned match is handled by
        // the AFK claim-win flow below instead, which doesn't touch who's actually ahead.
        let kickWrap=$('matchHostKickWrap');
        if(kickWrap) kickWrap.style.display='none';
        let swWrap2=$('matchSwitchWrap'); if(swWrap2) swWrap2.style.display='none';
    }
    // ---- progress + timer ----
    $('mQc').textContent=`${isSpectating?'👁 SPECTATING • ':''}Question ${qIdx+1} / ${m.questions.length}${q.subject?(' • '+q.subject):''}`;
    $('mProg').style.width=Math.round((qIdx/(m.questions.length||1))*100)+'%';
    // ---- question + options ----
    $('mQt').textContent=q.q;
    let keyEntryForFlag = m.answerKey && m.answerKey[qIdx];
    matchLocalState.currentQData={subject:q.subject, q:q.q, options:q.options, answer:keyEntryForFlag?keyEntryForFlag.answer:undefined, explanation:keyEntryForFlag?keyEntryForFlag.explanation:''};
    let flagBtn=$('mFlagBtn'); if(flagBtn) flagBtn.classList.toggle('flagged', isMatchQFlagged(q));
    let myLocked=m.answers && m.answers[qIdx] && m.answers[qIdx][MY_UID];
    let keyEntry = m.answerKey && m.answerKey[qIdx]; // only populated by Firebase once reveal===true
    let hidden50=matchLocalState.hidden50 && matchLocalState.hidden50[qIdx];
    $('mOpts').innerHTML=q.options.map((opt,oi)=>{
        let cls='opt-btn';
        if(myLocked && myLocked.selected===oi) cls+=' picked';
        if(myLocked && keyEntry){
            if(oi===keyEntry.answer) cls+=' correct';
            else if(myLocked.selected===oi) cls+=' wrong';
        }
        if(hidden50 && hidden50.includes(oi) && !(myLocked)) cls+=' dim';
        let clickable = !myLocked && !isSpectating;
        if(isSpectating && keyEntry && oi===keyEntry.answer) cls+=' correct';
        return `<button class="${cls}" ${clickable?`onclick="lockAnswer(${oi})"`:'disabled'}>${String.fromCharCode(65+oi)}. ${esc(opt)}</button>`;
    }).join('');
    if(myLocked && keyEntry && keyEntry.explanation && m.showExplanations!==false){
        $('mOpts').innerHTML+=`<div style="margin-top:8px;padding:8px;background:var(--card2);border:1px solid var(--border);border-radius:7px;font-size:9.5px;color:var(--muted);line-height:1.4">${esc(keyEntry.explanation)}</div>`;
    }
    let banner=$('mResultBanner');
    if(myLocked && keyEntry){
        let iWasCorrect = myLocked.selected===keyEntry.answer;
        let hadNoAnswer = myLocked.selected===-1;
        banner.style.display='block';
        if(hadNoAnswer){ banner.textContent="⏱ Time's up — no answer"; banner.style.background='rgba(255,71,87,.15)'; banner.style.color='var(--error)'; }
        else if(iWasCorrect){ banner.textContent='✅ You got it right!'; banner.style.background='rgba(0,255,136,.15)'; banner.style.color='var(--success)'; }
        else{ banner.textContent='❌ You got it wrong'; banner.style.background='rgba(255,71,87,.15)'; banner.style.color='var(--error)'; }
        if(!isSpectating){
            matchLocalState.soundedQ = matchLocalState.soundedQ || {};
            if(!matchLocalState.soundedQ[qIdx]){
                matchLocalState.soundedQ[qIdx]=true;
                if(!hadNoAnswer) playSfx(iWasCorrect?'correct':'wrong');
            }
        }
        // ---- opponent's result (1v1 duels only — team mode has too many players for one line) ----
        if(!m.teamMode){
            let oppUid=myOpponentUid(m);
            let oppAns=oppUid && m.answers && m.answers[qIdx] && m.answers[qIdx][oppUid];
            let oppName=(oppUid && m.players[oppUid] && m.players[oppUid].name) || 'Your opponent';
            let oppLine=$('mOppResultLine');
            if(oppLine){
                if(!oppUid || isSpectating && Object.keys(m.players||{}).length>2){ oppLine.style.display='none'; }
                else if(oppAns){
                    let oppCorrect = oppAns.selected===keyEntry.answer;
                    oppLine.style.display='block';
                    oppLine.textContent = `${esc(oppName)} got it ${oppCorrect?'right ✅':'wrong ❌'}`;
                    oppLine.style.color = oppCorrect?'var(--success)':'var(--error)';
                }else{
                    oppLine.style.display='block';
                    oppLine.textContent=`Waiting on ${esc(oppName)}…`;
                    oppLine.style.color='var(--muted)';
                }
            }
        }else{
            let oppLine=$('mOppResultLine'); if(oppLine) oppLine.style.display='none';
        }
    }else{
        banner.style.display='none';
        let oppLine=$('mOppResultLine'); if(oppLine) oppLine.style.display='none';
    }
    // ---- power-ups (spectators are read-only — no power-ups, but they CAN react below) ----
    let usedByMe=(m.powerupsUsed&&m.powerupsUsed[MY_UID])||{};
    $('powerupBar').innerHTML = (m.powerups===false || isSpectating) ? '' : Object.entries(POWERUP_DEFS).map(([key,def])=>{
        let used=!!usedByMe[key];
        return `<div class="pu-btn ${used?'used':''}" onclick="${used?'':'applyPowerup(\''+key+'\')'}"><span class="ic">${def.icon}</span><span class="lbl">${def.label}</span></div>`;
    }).join('');
    // ---- reactions (everyone watching — players AND spectators — share this feed and see it) ----
    let bonusEmojis = Object.keys((ME.shopOwned)||{}).map(id=>(SHOP_REACTIONS.find(r=>r.id===id)||{}).emoji).filter(Boolean);
    $('reactionBar').innerHTML=['😂','🔥','😱','👍','❤️','😡',...bonusEmojis].map(e=>`<button onclick="sendReaction('${e}')">${e}</button>`).join('');
    watchReactions(matchId, m);
    // ---- timer tick ----
    startOrUpdateTimer(matchId, m, qIdx);
    // ---- reveal / scoring / advance ----
    processMatchTick(matchId, m, qIdx);
    // ---- backup-opponent auto-answer, quick-match bot fill only ----
    if(!isSpectating && matchLocalState.botUid) scheduleBotAnswer(matchId, m, qIdx);
    // ---- notify me when an opponent uses a power-up against my side ----
    notifyOpponentPowerups(matchId, m);
}
// Surfaces the opponent's (or, in team mode, any non-teammate's) power-up use as a toast —
// e.g. "Simon used a shield power-up on you" — by diffing m.powerupsUsed against what this
// device has already shown, so each use is announced exactly once.
function notifyOpponentPowerups(matchId, m){
    matchLocalState.seenOppPowerups=matchLocalState.seenOppPowerups||{};
    let myTeam=m.teamMode ? (m.players[MY_UID]||{}).team : null;
    Object.entries(m.powerupsUsed||{}).forEach(([uid,used])=>{
        if(uid===MY_UID)return;
        if(m.teamMode){
            let theirTeam=(m.players[uid]||{}).team;
            if(theirTeam && theirTeam===myTeam)return; // teammates never trigger this — opponents only
        }
        let name=(m.players[uid]||{}).name||'Opponent';
        Object.keys(used||{}).forEach(type=>{
            let key=uid+':'+type;
            if(matchLocalState.seenOppPowerups[key])return;
            matchLocalState.seenOppPowerups[key]=true;
            let def=POWERUP_DEFS[type];
            if(def) toast(`${def.icon} ${name} used a ${def.label} power-up${def.needsTarget?' on you':''}!`);
        });
    });
}

function startOrUpdateTimer(matchId, m, qIdx){
    clearInterval(matchLocalState.timerHandle);
    let s=m.settings;
    if(s.mode==='free'){ $('mTimer').textContent='∞ No Timer'; return; }
    let tick=()=>{
        let now=serverNow();
        let remainMs;
        if(s.mode==='spak'){
            let cap=(s.perQ||20)*1000;
            // `currentQ` advances via a transaction, then qStartedAt is written in a SEPARATE
            // follow-up call — there's a real gap where a client can render the new question
            // while qStartedAt still points at the PREVIOUS one (already ~cap ms old), which
            // computes as negative time left and instantly force-forfeits the new question
            // (the "15s -> 0s -> 15s" flicker). matchLocalState.qRenderStart is this client's
            // own clock, stamped the moment it first drew this exact question, so it can never
            // be stale that way — using whichever elapsed reading is SMALLER means a lagging
            // server timestamp can only ever grant extra time, never falsely burn it.
            let elapsedServer = now - (m.qStartedAt||now);
            let elapsedLocal = now - (matchLocalState.qRenderStart||now);
            let elapsed = Math.max(0, Math.min(elapsedServer, elapsedLocal));
            remainMs = cap - elapsed;
        }else{
            let cap=(s.totalMinutes||10)*60000;
            remainMs = cap - (now - (m.matchStartedAt||now));
        }
        let frozenByOpp = m.freezes && m.freezes[qIdx] && m.freezes[qIdx][MY_UID];
        if(frozenByOpp && !matchLocalState.freezeApplied) matchLocalState.freezeApplied={};
        if(frozenByOpp && !matchLocalState.freezeApplied[qIdx]){
            matchLocalState.freezeApplied[qIdx]=true;
            matchLocalState.freezeExtraMs=(matchLocalState.freezeExtraMs||0)+5000;
        }
        remainMs -= (matchLocalState.freezeExtraMs||0);
        if(matchLocalState.captainExtraForQIdx===qIdx) remainMs += 3000;
        let secs=Math.max(0,Math.ceil(remainMs/1000));
        $('mTimer').textContent=secs+'s'+(frozenByOpp?' ❄️':'');
        $('mTimer').style.color = secs<=5 ? 'var(--error)' : 'var(--accent)';
        if(!isSpectating && secs>0 && secs<=5 && matchLocalState.lastTickSec!==secs && !(m.answers&&m.answers[qIdx]&&m.answers[qIdx][MY_UID])){
            matchLocalState.lastTickSec=secs;
            playSfx('tick');
        }
        if(remainMs<=0){
            clearInterval(matchLocalState.timerHandle);
            if(isSpectating)return;
            let myLocked=m.answers && m.answers[qIdx] && m.answers[qIdx][MY_UID];
            if(!myLocked) lockAnswer(-1);
        }
    };
    tick();
    matchLocalState.timerHandle=setInterval(tick,500);
}

async function lockAnswer(selectedIdx){
    if(!currentMatchId)return;
    let qIdx=matchLocalState.lastQIdx;
    if(qIdx<0)return;
    if(matchLocalState.myLocked[qIdx])return;
    matchLocalState.myLocked[qIdx]=true;
    if(selectedIdx>=0 && !isSpectating) playSfx('click');
    try{
        await mdb.ref(`mp_matches/${currentMatchId}/answers/${qIdx}/${MY_UID}`).set({
            selected:selectedIdx, ts:firebase.database.ServerValue.TIMESTAMP
        });
    }catch(e){ console.warn('[Match] lock answer failed', e); }
}

// Runs on every snapshot: (1) flips reveal once everyone's answered, (2) once THIS device can
// see the key (either because it answered, or because time ran out), scores its own answer
// exactly once, (3) once reveal is true, schedules the shared advance-to-next-question.
async function processMatchTick(matchId, m, qIdx){
    let answeredMap=(m.answers&&m.answers[qIdx])||{};
    let answeredCount=Object.keys(answeredMap).length;
    let alreadyRevealed = m.reveal && m.reveal[qIdx];
    let keyEntry=m.answerKey && m.answerKey[qIdx];
    let isRaceMode = m.settings && m.settings.mode==='spak' && m.settings.raceMode;
    if(!alreadyRevealed && isRaceMode && keyEntry){
        // Race variant: the moment ANYONE answers correctly, the round is over right then —
        // don't wait for the rest of the table like normal Spak mode does.
        let someoneWonIt = Object.values(answeredMap).some(a=>a.selected===keyEntry.answer);
        if(someoneWonIt) mdb.ref(`mp_matches/${matchId}/reveal/${qIdx}`).set(true).catch(()=>{});
    }
    if(!alreadyRevealed && answeredCount>=m.playerCount){
        mdb.ref(`mp_matches/${matchId}/reveal/${qIdx}`).set(true).catch(()=>{});
    }
    let myAns=answeredMap[MY_UID];
    matchLocalState.scoredQ=matchLocalState.scoredQ||{};
    if(myAns && keyEntry && !matchLocalState.scoredQ[qIdx]){
        matchLocalState.scoredQ[qIdx]=true;
        let correct = myAns.selected===keyEntry.answer;
        let elapsed = (myAns.ts||Date.now()) - (m.qStartedAt||Date.now());
        elapsed=Math.max(0, elapsed);
        matchLocalState.qElapsedMs=matchLocalState.qElapsedMs||{};
        matchLocalState.qElapsedMs[qIdx]=elapsed;
        let pts=0;
        if(correct){
            pts=scoreForAnswer(m, qIdx, Math.max(0,elapsed));
            let usedByMe=(m.powerupsUsed&&m.powerupsUsed[MY_UID])||{};
            if(usedByMe.double) pts*=2;
            let newStreak=(m.streaks[MY_UID]||0)+1;
            let streakMult = newStreak>=5?1.5:newStreak>=3?1.2:1;
            pts=Math.round(pts*streakMult);
            mdb.ref(`mp_matches/${matchId}/streaks/${MY_UID}`).set(newStreak);
            if(usedByMe.steal){
                let oppUid=myOpponentUid(m);
                if(oppUid){
                    let oppScoreRef=mdb.ref(`mp_matches/${matchId}/scores/${oppUid}`);
                    oppScoreRef.transaction(cur=>Math.max(0,(cur||0)-150));
                    pts+=150;
                }
            }
        }else{
            mdb.ref(`mp_matches/${matchId}/streaks/${MY_UID}`).set(0);
        }
        if(pts>0){
            mdb.ref(`mp_matches/${matchId}/scores/${MY_UID}`).transaction(cur=>(cur||0)+pts);
        }
    }
    // ---- co-op bonus round: every 5th question, if my WHOLE team answered correctly, each
    // member independently awards themselves the synergy bonus (decentralized-safe, same
    // pattern this engine already uses for individual scoring). ----
    if(m.teamMode && keyEntry){
        let isBonusQ = qIdx>0 && (qIdx+1)%5===0;
        matchLocalState.bonusApplied=matchLocalState.bonusApplied||{};
        if(isBonusQ && !matchLocalState.bonusApplied[qIdx]){
            let myTeam=(m.players[MY_UID]||{}).team;
            if(myTeam){
                let teammates=Object.values(m.players||{}).filter(p=>p.team===myTeam);
                let allAnswered=teammates.every(p=>answeredMap[p.uid]);
                if(allAnswered){
                    matchLocalState.bonusApplied[qIdx]=true;
                    let allCorrect=teammates.every(p=>answeredMap[p.uid].selected===keyEntry.answer);
                    if(allCorrect && myAns && myAns.selected===keyEntry.answer){
                        mdb.ref(`mp_matches/${matchId}/scores/${MY_UID}`).transaction(cur=>(cur||0)+150);
                        setTimeout(()=>{ toast('🌟 Team Bonus! Everyone got it right — +150 pts!'); playSfx('powerup'); }, 400);
                    }
                }
            }
        }
    }
    if(alreadyRevealed || answeredCount>=m.playerCount){
        matchLocalState.advanceScheduled=matchLocalState.advanceScheduled||{};
        if(!matchLocalState.advanceScheduled[qIdx]){
            matchLocalState.advanceScheduled[qIdx]=true;
            // Last question goes to results fast (just long enough to register the reveal) —
            // mid-match questions keep a bit more breathing room before the next one loads.
            let isLastQ = qIdx>=m.questions.length-1;
            setTimeout(()=>attemptAdvanceQuestion(matchId, qIdx, m.questions.length), isLastQ?900:1800);
        }
    }
}

async function attemptAdvanceQuestion(matchId, fromQIdx, totalQ){
    let nextQ=fromQIdx+1;
    if(nextQ>=totalQ){
        // Last question just finished — DON'T jump currentQ to a not-yet-real index and leave
        // it dangling while we figure out sudden death vs game-over (that's what caused the
        // freeze/glitch right after the final question). Resolve first, move the pointer after.
        await resolveEndOrSuddenDeath(matchId, fromQIdx, totalQ);
        return;
    }
    let curRef=mdb.ref(`mp_matches/${matchId}/currentQ`);
    let result=await curRef.transaction(cur=>{
        if(cur===fromQIdx) return nextQ;
        return; // someone else already advanced — abort
    });
    if(!result.committed) return;
    await mdb.ref(`mp_matches/${matchId}/qStartedAt`).set(firebase.database.ServerValue.TIMESTAMP);
}

let resolveEndInFlight={};
async function resolveEndOrSuddenDeath(matchId, fromQIdx, totalQ){
    // Any client can attempt this now — not just a designated "arbiter" — because a single
    // arbiter's setTimeout can get throttled or paused if their tab is backgrounded right
    // after the last question, which was silently stalling the whole match at the results
    // step for everyone. Mutual exclusion now comes from a Firebase transaction on `state`
    // itself (already freely writable by any match player, so no new rule is needed): only
    // whichever client's transaction actually flips active->ending gets to finish the job.
    if(resolveEndInFlight[matchId]) return;
    resolveEndInFlight[matchId]=true;
    try{
        let snap=await mdb.ref('mp_matches/'+matchId).get();
        let m=snap.val(); if(!m || m.state==='ended') return;
        if(!m.teamMode){
            let uids=Object.keys(m.players||{});
            if(uids.length===2){
                let s0=m.scores[uids[0]]||0, s1=m.scores[uids[1]]||0;
                let sdRounds=m.suddenDeathRounds||0;
                if(s0===s1 && sdRounds<5){
                    // Claim this specific sudden-death round the same transactional way —
                    // whichever client's write actually lands is the one that fetches and
                    // posts the tiebreaker question; everyone else's attempt just no-ops.
                    let sdRef=mdb.ref(`mp_matches/${matchId}/suddenDeathRounds`);
                    let claim=await sdRef.transaction(cur=>(cur||0)===sdRounds ? sdRounds+1 : undefined);
                    if(!claim.committed) return;
                    let extra=await fetchQuestionsForMatch({subjects:m.settings.subjects, difficulty:m.settings.difficulty, subMode:m.settings.subMode, mode:m.settings.mode, qcount:1});
                    if(extra && extra.length){
                        let newIdx=totalQ;
                        let updates={};
                        updates[`mp_matches/${matchId}/questions/${newIdx}`]={subject:extra[0].subject,q:extra[0].q,options:extra[0].options};
                        updates[`mp_matches/${matchId}/answerKey/${newIdx}`]={answer:extra[0].answer, explanation:extra[0].explanation||''};
                        // currentQ advances in the SAME atomic update as the new question data,
                        // so no client ever sees a currentQ pointing at a question that doesn't exist yet.
                        updates[`mp_matches/${matchId}/currentQ`]=newIdx;
                        updates[`mp_matches/${matchId}/qStartedAt`]=firebase.database.ServerValue.TIMESTAMP;
                        await mdb.ref().update(updates);
                        return;
                    }
                }
            }
        }
        let stateRef=mdb.ref(`mp_matches/${matchId}/state`);
        let claimEnd=await stateRef.transaction(cur=>cur==='active' ? 'ending' : undefined);
        if(!claimEnd.committed) return; // another client already has this
        await endMatch(matchId, m);
    }catch(e){ console.warn('[Match] resolveEndOrSuddenDeath failed', e); }
    finally{ resolveEndInFlight[matchId]=false; }
}

// ---- Power-ups ----
async function applyPowerup(type){
    if(!currentMatchId)return;
    let qIdx=matchLocalState.lastQIdx;
    let snap=await mdb.ref('mp_matches/'+currentMatchId).get();
    let m=snap.val();if(!m)return;
    let usedByMe=(m.powerupsUsed&&m.powerupsUsed[MY_UID])||{};
    if(usedByMe[type]){toast('Already used this power-up.');return;}
    await mdb.ref(`mp_matches/${currentMatchId}/powerupsUsed/${MY_UID}/${type}`).set(true);
    playSfx('powerup');
    if(type==='fiftyfifty'){
        let q=m.questions[qIdx];
        let keyEntry=m.answerKey && m.answerKey[qIdx];
        let wrongIdxs=[0,1,2,3].filter(i=>i!==(keyEntry?keyEntry.answer:-1));
        // We don't know the true answer client-side pre-reveal either — pick 2 plausible
        // wrong slots at random (excluding whichever the player may have already picked);
        // this stays fair since it never actually reveals the key early.
        shuffleArr(wrongIdxs);
        matchLocalState.hidden50=matchLocalState.hidden50||{};
        matchLocalState.hidden50[qIdx]=wrongIdxs.slice(0,2);
        toast('50/50 used — two wrong options dimmed.');
        renderMatchScreen(currentMatchId, m);
    }else if(type==='double'){
        toast('Double Points armed for this question!');
    }else if(type==='shield'){
        await mdb.ref(`mp_matches/${currentMatchId}/shields/${MY_UID}/${qIdx}`).set(true);
        toast('Shield up — immune to sabotage this round.');
    }else if(type==='freeze'){
        let oppUid=myOpponentUid(m);
        if(!oppUid){toast('No opponent to freeze.');return;}
        let shielded=m.shields && m.shields[oppUid] && m.shields[oppUid][qIdx];
        if(shielded){toast('Opponent was shielded — freeze blocked!');return;}
        await mdb.ref(`mp_matches/${currentMatchId}/freezes/${qIdx}/${oppUid}`).set(true);
        toast('❄️ Opponent frozen for a few seconds!');
    }else if(type==='steal'){
        toast('💰 Steal armed — if your next answer is correct, you\'ll steal points!');
    }
}

// Opponent-side effect of being frozen: shorten remaining time noticeably once, purely local
// visual/timer effect applied next tick (keeps timer logic simple & self-contained above).

// ---- Reactions (floating emotes) ----
function watchReactions(matchId, m){
    if(matchLocalState.reactionsAttachedFor===matchId)return;
    matchLocalState.reactionsAttachedFor=matchId;
    mdb.ref('mp_matches/'+matchId+'/reactions').limitToLast(1).on('child_added', snap=>{
        let r=snap.val();
        if(!r || matchLocalState.reactionsSeen.has(snap.key))return;
        matchLocalState.reactionsSeen.add(snap.key);
        spawnFloatingEmoji(r.emoji);
    });
}
function spawnFloatingEmoji(emoji){
    let layer=$('reactionFloatLayer');if(!layer)return;
    let el=document.createElement('div');
    el.className='float-react';
    el.textContent=emoji;
    el.style.left=(20+Math.random()*60)+'%';
    el.style.bottom='120px';
    layer.appendChild(el);
    setTimeout(()=>el.remove(),1700);
}
function sendReaction(emoji){
    if(!currentMatchId)return;
    mdb.ref('mp_matches/'+currentMatchId+'/reactions').push({uid:MY_UID,emoji,ts:firebase.database.ServerValue.TIMESTAMP});
}

// ============================================================================================
// ===== MATCH END, RESULTS, PROFILE/ELO UPDATES, REMATCH ====================================
// ============================================================================================
let lastMatchMeta=null;
let resultAppliedFor=null;

async function endMatch(matchId, m){
    if(m.state==='ended')return;
    let winner='draw';
    if(m.teamMode){
        let players=Object.values(m.players||{});
        let a=players.filter(p=>p.team==='A').reduce((s,p)=>s+(m.scores[p.uid]||0),0);
        let b=players.filter(p=>p.team==='B').reduce((s,p)=>s+(m.scores[p.uid]||0),0);
        winner = a>b?'A':b>a?'B':'draw';
    }else{
        let uids=Object.keys(m.players||{});
        if(uids.length===2){
            let s0=m.scores[uids[0]]||0, s1=m.scores[uids[1]]||0;
            winner = s0>s1?uids[0]:s1>s0?uids[1]:'draw';
        }
    }
    await mdb.ref('mp_matches/'+matchId).update({state:'ended', winner, endedAt:firebase.database.ServerValue.TIMESTAMP});
}

function showResultsScreen(matchId, m){
    let staleBtn=$('backToTournamentBtn'); if(staleBtn) staleBtn.remove();
    let oppUidForMeta = myOpponentUid(m);
    let oppPlayerObj = oppUidForMeta ? m.players[oppUidForMeta] : null;
    lastMatchMeta={
        matchId, settings:m.settings, teamMode:m.teamMode, opponentUid: oppUidForMeta,
        // Rematch needs to know up front whether the opponent is a bot — a bot has no
        // account and no client to accept a challenge, so the two rematch paths have to
        // fork completely. Captured here (not re-derived later) so it survives even after
        // the match doc itself is long gone.
        isBotOpponent: !!(oppPlayerObj && oppPlayerObj.isBot),
        opponentName: oppPlayerObj ? oppPlayerObj.name : null,
        opponentAvatar: oppPlayerObj ? oppPlayerObj.avatarEmoji : null
    };
    lastMatchQuestions={questions:m.questions, answerKey:m.answerKey};
    let players=Object.values(m.players||{});
    let iWon = !isSpectating && (m.teamMode ? (m.players[MY_UID] && m.players[MY_UID].team===m.winner) : (m.winner===MY_UID));
    let isDraw = m.winner==='draw';
    if(!isSpectating && lastMatchMeta.matchId!==lastSoundedResultId){
        lastSoundedResultId=lastMatchMeta.matchId;
        playSfx(isDraw?'notify':(iWon?'victory':'defeat'));
        if(iWon && ME.equippedEffect) fireVictoryEffect(ME.equippedEffect);
    }
    let headline = isSpectating ? '🏁 Match Complete' : isDraw ? "🤝 It's a Draw!" : (iWon ? '🏆 Victory!' : '💔 Defeat');
    let headColor = isSpectating ? 'var(--accent)' : isDraw ? 'var(--muted)' : (iWon ? 'var(--success)' : 'var(--error)');

    let rows;
    if(m.teamMode){
        rows=players.map(p=>`<div class="player-slot"><span class="team-tag ${p.team}">${p.team}</span> <div class="friend-name">${esc(p.name)}${p.uid===MY_UID?' (you)':''}</div><b style="margin-left:auto;color:var(--accent)">${m.scores[p.uid]||0} pts</b></div>`).join('');
    }else{
        rows=players.map(p=>`<div class="player-slot"><div class="fav" style="width:28px;height:28px;font-size:13px">${p.uid===MY_UID?(ME.avatarEmoji||'🎓'):'🎓'}</div><div class="friend-name">${esc(p.name)}${p.uid===MY_UID?' (you)':''}</div><b style="margin-left:auto;color:var(--accent)">${m.scores[p.uid]||0} pts</b></div>`).join('');
    }
    let qids0=Object.keys(m.answerKey||{});
    let myCorrectCt=0, myAnsweredCt=0;
    qids0.forEach(qi=>{
        let a=m.answers && m.answers[qi] && m.answers[qi][MY_UID];
        if(a && a.selected!==-1){
            myAnsweredCt++;
            if(a.selected===m.answerKey[qi].answer) myCorrectCt++;
        }
    });
    let accuracyPct = myAnsweredCt>0 ? Math.round((myCorrectCt/myAnsweredCt)*100) : 0;
    let confidenceIdx = ((myCorrectCt+1)/(myAnsweredCt+2)).toFixed(2);
    let qTimes=Object.values(matchLocalState.qElapsedMs||{});
    let totalSec=qTimes.length ? Math.round(qTimes.reduce((a,b)=>a+b,0)/1000) : null;
    let avgSec=qTimes.length ? Math.round(totalSec/qTimes.length) : null;
    let metricsHtml = isSpectating ? '' : `
        <div class="metric-container" style="margin-top:10px">
            <div class="metric-box"><val>${myCorrectCt}/${qids0.length}</val><lbl>Correct</lbl></div>
            <div class="metric-box"><val>${accuracyPct}%</val><lbl>Accuracy</lbl></div>
            <div class="metric-box"><val>${m.scores[MY_UID]||0}</val><lbl>Points</lbl></div>
            <div class="metric-box"><val>${confidenceIdx}</val><lbl>Confidence Index</lbl></div>
        </div>
        ${avgSec!==null?`<div style="text-align:center;margin-top:8px;font-size:11px;color:var(--muted)">Avg Time: ${avgSec}s • Total: ${totalSec}s</div>`:''}`;
    $('resultsSummaryCard').innerHTML=`
        <h2 class="section-h" style="color:${headColor};font-size:16px">${headline}</h2>
        <div id="resultsEloDelta" class="muted" style="font-size:10px;margin-top:2px"></div>
        ${metricsHtml}
        <div style="margin-top:8px;font-size:9px;color:var(--muted);font-weight:800">${isSpectating?'FINAL SCORES':'SCOREBOARD'}</div>
        <div style="margin-top:4px">${rows}</div>`;

    let qids=Object.keys(m.answerKey||{}).map(Number).sort((a,b)=>a-b);
    $('resultsBreakdown').innerHTML=qids.map(qi=>{
        let q=m.questions[qi];let key=m.answerKey[qi];
        let myAns=m.answers && m.answers[qi] && m.answers[qi][MY_UID];
        let mySel=myAns?myAns.selected:-1;
        return `<details style="margin-top:6px;background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:8px">
            <summary style="cursor:pointer;font-size:11px;font-weight:700;color:${mySel===key.answer?'var(--success)':'var(--error)'}">Q${qi+1}. ${esc((q.q||'').slice(0,70))}${(q.q||'').length>70?'…':''}</summary>
            <div style="font-size:11px;margin-top:8px;color:var(--text)">${esc(q.q)}</div>
            <div style="margin-top:6px">${q.options.map((opt,oi)=>{
                let isCorr=oi===key.answer, isMine=oi===mySel;
                return `<div style="font-size:10px;padding:5px;border:1px solid ${isCorr?'var(--success)':isMine?'var(--error)':'var(--border2)'};border-radius:5px;margin-top:4px;background:${isCorr?'rgba(0,255,136,0.1)':isMine?'rgba(255,71,87,0.1)':'transparent'};color:var(--text)">${String.fromCharCode(65+oi)}. ${esc(opt)} ${isCorr?'✅':''} ${isMine&&!isCorr?'❌ your pick':''}</div>`;
            }).join('')}</div>
            ${key.explanation?`<div style="font-size:9.5px;color:var(--muted);margin-top:6px;border-left:2px solid var(--accent);padding-left:6px">${esc(key.explanation)}</div>`:''}
        </details>`;
    }).join('');

    // ---- flagged questions (this match's questions that intersect the shared flag bank) ----
    let flaggedNow = getFlagged();
    let flaggedInThisMatch = qids.map(qi=>({qi, q:m.questions[qi]})).filter(({q})=>q && flaggedNow.some(x=>x&&x.q===q.q));
    let flagCard=$('resultsFlaggedCard');
    if(!isSpectating && flaggedInThisMatch.length){
        flagCard.style.display='block';
        $('resultsFlagCnt').textContent=`(${flaggedInThisMatch.length})`;
        $('resultsFlaggedList').innerHTML=flaggedInThisMatch.map(({qi,q})=>{
            let key=m.answerKey[qi];
            return `<div style="font-size:10.5px;padding:6px;background:var(--card2);border:1px solid var(--border);border-radius:8px;margin-top:5px">
                <b>Q${qi+1}.</b> ${esc(q.q)}
                ${key.explanation?`<div style="font-size:9.5px;color:var(--muted);margin-top:4px">${esc(key.explanation)}</div>`:''}
            </div>`;
        }).join('');
    }else if(flagCard){ flagCard.style.display='none'; }

    showScreen('results');
    let reviewWrap=$('resultsReviewWrap'); if(reviewWrap) reviewWrap.style.display='none';
    if(!isSpectating && iWon && !isDraw) setTimeout(fireConfetti, 150);
    let reviewBtn=$('resultsReviewToggleBtn'); if(reviewBtn) reviewBtn.textContent='📋 Quiz Review';
    lastResultsRenderData={
        headline, isSpectating, teamMode:m.teamMode, isDraw, iWon,
        players: players.map(p=>({name:p.name, uid:p.uid, team:p.team, avatarEmoji:p.uid===MY_UID?(ME.avatarEmoji||'🎓'):(p.avatarEmoji||'🎓'), score:m.scores[p.uid]||0, isMe:p.uid===MY_UID})),
        myCorrectCt, totalQ:qids0.length, accuracyPct, confidenceIdx, avgSec, totalSec,
        mode:m.settings&&m.settings.mode, subjects:(m.settings&&m.settings.subjects)||[],
        tier: tierFor(ME.elo||0),
        hostName: (m.players[m.hostUid]||{}).name || null
    };
    let rmBtn=$('resultsRematchBtn'); if(rmBtn) rmBtn.style.display = isSpectating ? 'none' : 'inline-flex';
    mdb.ref('mp_rooms/'+m.roomId+'/tournamentId').get().then(s=>{
        if(s.exists()){
            let tid=s.val();
            let card=$('resultsBreakdownCard');
            if(card && !$('backToTournamentBtn')){
                let btn=document.createElement('button');
                btn.id='backToTournamentBtn';btn.className='btn btn-gold';btn.style.marginBottom='9px';
                btn.textContent='🏅 Back to Tournament';
                btn.onclick=()=>openTournamentDetail(tid);
                card.parentNode.insertBefore(btn, card);
            }
        }
    }).catch(()=>{});
    if(!isSpectating && resultAppliedFor!==matchId){
        resultAppliedFor=matchId;
        applyMyResultToProfile(matchId, m, iWon, isDraw);
    }
}
let lastResultsRenderData=null;
function toggleResultsReview(){
    let wrap=$('resultsReviewWrap'); if(!wrap)return;
    let showing=wrap.style.display!=='none';
    wrap.style.display=showing?'none':'block';
    let btn=$('resultsReviewToggleBtn'); if(btn) btn.textContent=showing?'📋 Quiz Review':'✕ Hide Review';
    if(!showing) wrap.scrollIntoView({behavior:'smooth', block:'start'});
}
// Draws a shareable result "receipt" — dark navy/gold/green theme to match the app — and
// hands it off via the Web Share sheet when available (so it can go straight to any app),
// falling back to a plain PNG download otherwise.
// ESI's real logo.jpg (already used elsewhere in the app, with the same imgur fallback) is
// reused here instead of a drawn stand-in. crossOrigin is required so the canvas can still be
// exported (toBlob/toDataURL) after drawing a cross-origin image onto it.
let _logoImgCache=null;
function loadLogoImage(){
    if(_logoImgCache) return Promise.resolve(_logoImgCache);
    return new Promise(resolve=>{
        let img=new Image(); img.crossOrigin='anonymous';
        img.onload=()=>{ _logoImgCache=img; resolve(img); };
        img.onerror=()=>{
            let img2=new Image(); img2.crossOrigin='anonymous';
            img2.onload=()=>{ _logoImgCache=img2; resolve(img2); };
            img2.onerror=()=>resolve(null);
            img2.src='https://i.imgur.com/8Km9tLL.png';
        };
        img.src='logo.jpg';
    });
}
function drawSealOrLogo(ctx, cx, cy, r, logoImg, emblemChar){
    if(logoImg){
        ctx.save();
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();
        ctx.drawImage(logoImg, cx-r, cy-r, r*2, r*2);
        ctx.restore();
        ctx.strokeStyle='#ffd700'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
    }else{
        ctx.fillStyle='#0a1636'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#ffd700'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
        ctx.strokeStyle='#ffd700'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(cx,cy,r-12,0,Math.PI*2); ctx.stroke();
        ctx.textAlign='center';
        ctx.font='58px Poppins, sans-serif'; ctx.fillStyle='#ffd700';
        ctx.fillText(emblemChar, cx, cy+18);
        ctx.font='900 16px Poppins, sans-serif'; ctx.fillStyle='#ffd700';
        ctx.fillText('E S I', cx, cy+r-18);
    }
}
// Tapping Share now asks image vs PDF instead of assuming — PDF embeds the same canvas as a
// compressed JPEG (not raw PNG) specifically so the file stays a few hundred KB instead of
// several MB, at the same visual quality.
function openShareFormatChoice(kind){
    let box=document.createElement('div');
    box.className='modal-overlay'; box.style.display='flex';
    box.innerHTML=`<div class="modal-box" style="max-width:340px;text-align:center">
        <h2 class="section-h">Share Result</h2>
        <p class="subtext">Choose a format</p>
        <button class="btn btn-gold" style="margin-top:10px" id="shareChooseImg">🖼️ Share as Image</button>
        <button class="btn btn-g" style="margin-top:10px" id="shareChoosePdf">📄 Share as PDF</button>
        <button class="btn-g btn-sm" style="margin-top:14px" id="shareChooseCancel">Cancel</button>
    </div>`;
    document.body.appendChild(box);
    let cleanup=()=>box.remove();
    box.addEventListener('click', e=>{ if(e.target===box) cleanup(); });
    let $2=id=>box.querySelector('#'+id);
    $2('shareChooseCancel').onclick=cleanup;
    $2('shareChooseImg').onclick=async()=>{ cleanup(); toast('Preparing image…'); let cv=kind==='match'?await buildMatchResultCanvas():kind==='tournament'?await buildTournamentResultCanvas():await buildSoloResultCanvas(); if(cv) shareOrDownloadCanvas(cv, (kind==='match'?'Elite Scholar Institute - Match Result':kind==='tournament'?'Elite Scholar Institute - Tournament Result':'Elite Scholar Institute - Practice Result')+'.png', 'Elite Scholar Institute — Result'); };
    $2('shareChoosePdf').onclick=async()=>{ cleanup(); toast('Preparing PDF…'); let cv=kind==='match'?await buildMatchResultCanvas():kind==='tournament'?await buildTournamentResultCanvas():await buildSoloResultCanvas(); if(cv) shareOrDownloadCanvasAsPDF(cv, (kind==='match'?'Elite Scholar Institute - Match Result':kind==='tournament'?'Elite Scholar Institute - Tournament Result':'Elite Scholar Institute - Practice Result')+'.pdf', 'Elite Scholar Institute — Result'); };
}
async function buildSoloResultCanvas(){
    let logoImg=await loadLogoImage();
    let pct=soloState.total? Math.round((soloState.score/soloState.total)*100) : 0;
    let W=1000, PAD=40, logoBlock=210, titleBlock=110, headlineBlock=90, statsBlock=150, footerBlock=90;
    let H=PAD+logoBlock+titleBlock+headlineBlock+statsBlock+footerBlock+PAD;
    let cv=document.createElement('canvas'); cv.width=W; cv.height=H;
    let ctx=cv.getContext('2d');
    let g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#020818'); g.addColorStop(1,'#050f28');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#ffd700'; ctx.lineWidth=6; ctx.strokeRect(20,20,W-40,H-40);
    ctx.textAlign='center';
    let cursor=PAD;
    drawSealOrLogo(ctx, W/2, cursor+95, 85, logoImg, '🎓');
    cursor+=logoBlock;
    ctx.fillStyle='#ffd700'; ctx.font='900 32px Poppins, sans-serif';
    ctx.fillText('ELITE SCHOLAR INSTITUTE', W/2, cursor+30);
    ctx.fillStyle='#8ea0c8'; ctx.font='600 19px Poppins, sans-serif';
    ctx.fillText('SOLO PRACTICE', W/2, cursor+60);
    cursor+=titleBlock;
    ctx.fillStyle=pct>=70?'#00ff88':pct>=50?'#ffd700':'#ff4757'; ctx.font='900 60px Poppins, sans-serif';
    ctx.fillText(pct+'%', W/2, cursor+60);
    cursor+=headlineBlock;
    let stats=[['CORRECT',`${soloState.score}/${soloState.total}`],['ACCURACY',pct+'%']];
    let boxW=(W-160)/stats.length;
    stats.forEach((s,i)=>{
        let bx=80+i*boxW;
        ctx.fillStyle='#00ff88'; ctx.font='900 32px Poppins, sans-serif';
        ctx.fillText(s[1], bx+boxW/2, cursor+55);
        ctx.fillStyle='#8ea0c8'; ctx.font='700 16px Poppins, sans-serif';
        ctx.fillText(s[0], bx+boxW/2, cursor+80);
    });
    cursor+=statsBlock;
    ctx.strokeStyle='#1d356f'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(80,cursor); ctx.lineTo(W-80,cursor); ctx.stroke();
    ctx.fillStyle='#ffd700'; ctx.font='900 16px Poppins, sans-serif';
    ctx.fillText('⚡ ELITE SCHOLAR INSTITUTE', W/2, cursor+38);
    ctx.fillStyle='#5d75ac'; ctx.font='600 13px Poppins, sans-serif';
    ctx.fillText('ALL RIGHTS RESERVED', W/2, cursor+60);
    return cv;
}
async function shareMatchResultImage(){ openShareFormatChoice('match'); }
async function buildMatchResultCanvas(){
    let d=lastResultsRenderData;
    if(!d){toast('No result to share yet.');return null;}
    let logoImg=await loadLogoImage();
    let eloLineEl=$('resultsEloDelta');
    let eloLine=(eloLineEl && eloLineEl.textContent) ? eloLineEl.textContent.trim() : '';
    let W=1000;
    // Height is computed from actual content instead of a fixed guess, so the card never
    // ends in a slab of empty space — it's exactly as tall as what's really on it.
    let PAD=40, logoBlock=210, titleBlock=110, headlineBlock=110, hostBlock=40,
        playerRowH=104, playerGap=14, statsBlock=d.isSpectating?0:150, tierBlock=60, eloBlock=eloLine?36:0, footerBlock=90;
    let H = PAD + logoBlock + titleBlock + headlineBlock + hostBlock
        + (d.players.length*(playerRowH+playerGap))
        + statsBlock + tierBlock + eloBlock + footerBlock + PAD;
    let cv=document.createElement('canvas'); cv.width=W; cv.height=H;
    let ctx=cv.getContext('2d');
    let g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#020818'); g.addColorStop(1,'#050f28');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#ffd700'; ctx.lineWidth=6;
    ctx.strokeRect(20,20,W-40,H-40);
    ctx.textAlign='center';
    let cursor=PAD;
    drawSealOrLogo(ctx, W/2, cursor+95, 85, logoImg, '🎓');
    cursor+=logoBlock;
    // ---- title ----
    ctx.fillStyle='#ffd700'; ctx.font='900 32px Poppins, sans-serif';
    ctx.fillText('ELITE SCHOLAR INSTITUTE', W/2, cursor+30);
    ctx.fillStyle='#8ea0c8'; ctx.font='600 19px Poppins, sans-serif';
    ctx.fillText('MULTIPLAYER ARENA', W/2, cursor+60);
    cursor+=titleBlock;
    // ---- headline ----
    let headColor = d.isSpectating ? '#00bfff' : d.isDraw ? '#8ea0c8' : (d.iWon ? '#00ff88' : '#ff4757');
    ctx.fillStyle=headColor; ctx.font='900 54px Poppins, sans-serif';
    ctx.fillText(d.headline.replace(/^[^\w]+/,'').trim(), W/2, cursor+50);
    ctx.fillStyle='#8ea0c8'; ctx.font='600 21px Poppins, sans-serif';
    ctx.fillText(`${(d.subjects||[]).map(s=>subjectIcon(s)+' '+s).join(', ').toUpperCase()} · ${(d.mode||'').toUpperCase()} MODE`, W/2, cursor+88);
    cursor+=headlineBlock;
    // ---- host + date/time ----
    ctx.fillStyle='#5d75ac'; ctx.font='600 17px Poppins, sans-serif';
    let dt=new Date();
    let hostLine=(d.hostName?`Hosted by ${d.hostName} · `:'')+dt.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})+' · '+dt.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
    ctx.fillText(hostLine, W/2, cursor+26);
    cursor+=hostBlock;
    // ---- player rows ----
    d.players.forEach(p=>{
        let ry=cursor;
        ctx.fillStyle=p.isMe?'rgba(255,215,0,0.06)':'#08132e';
        ctx.strokeStyle=p.isMe?'#ffd700':'#1d356f'; ctx.lineWidth=2;
        roundRectPath(ctx,60,ry,W-120,playerRowH,16); ctx.fill(); ctx.stroke();
        ctx.textAlign='left'; ctx.fillStyle='#fff'; ctx.font='900 36px Poppins, sans-serif';
        ctx.fillText(p.avatarEmoji, 92, ry+62);
        ctx.font='700 27px Poppins, sans-serif';
        ctx.fillText(`${p.name}${p.isMe?' (you)':''}`, 160, ry+50);
        ctx.fillStyle='#8ea0c8'; ctx.font='600 15px Poppins, sans-serif';
        ctx.fillText(p.isMe && !d.isSpectating ? `${d.myCorrectCt}/${d.totalQ} correct · ${d.accuracyPct}% accuracy` : (p.team?`Team ${p.team}`:'Opponent'), 160, ry+78);
        ctx.textAlign='right'; ctx.fillStyle='#ffd700'; ctx.font='900 32px Poppins, sans-serif';
        ctx.fillText(`${p.score}`, W-92, ry+55);
        ctx.font='700 14px Poppins, sans-serif'; ctx.fillStyle='#8ea0c8';
        ctx.fillText('POINTS', W-92, ry+76);
        cursor+=playerRowH+playerGap;
    });
    // ---- stats ----
    if(!d.isSpectating){
        let stats=[['CORRECT',`${d.myCorrectCt}/${d.totalQ}`],['ACCURACY',d.accuracyPct+'%'],['CONFIDENCE',d.confidenceIdx]];
        if(d.avgSec!==null) stats.push(['AVG TIME', d.avgSec+'s']);
        let boxW=(W-160)/stats.length;
        stats.forEach((s,i)=>{
            let bx=80+i*boxW;
            ctx.textAlign='center';
            ctx.fillStyle='#00ff88'; ctx.font='900 32px Poppins, sans-serif';
            ctx.fillText(s[1], bx+boxW/2, cursor+55);
            ctx.fillStyle='#8ea0c8'; ctx.font='700 16px Poppins, sans-serif';
            ctx.fillText(s[0], bx+boxW/2, cursor+80);
        });
        cursor+=statsBlock;
    }
    // ---- tier ----
    ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font='700 24px Poppins, sans-serif';
    ctx.fillText(`${d.tier[3]} ${d.tier[1]} Tier`, W/2, cursor+34);
    cursor+=tierBlock;
    if(eloLine){
        ctx.fillStyle='#8ea0c8'; ctx.font='600 15px Poppins, sans-serif';
        ctx.fillText(eloLine, W/2, cursor+18);
        cursor+=eloBlock;
    }
    // ---- footer ----
    ctx.strokeStyle='#1d356f'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(80,cursor); ctx.lineTo(W-80,cursor); ctx.stroke();
    ctx.fillStyle='#ffd700'; ctx.font='900 16px Poppins, sans-serif';
    ctx.fillText('⚡ ELITE SCHOLAR INSTITUTE', W/2, cursor+38);
    ctx.fillStyle='#5d75ac'; ctx.font='600 13px Poppins, sans-serif';
    ctx.fillText('ALL RIGHTS RESERVED', W/2, cursor+60);
    return cv;
}
function shareOrDownloadCanvas(cv, filename, shareTitle){
    cv.toBlob(async blob=>{
        if(!blob){toast('Could not generate image.');return;}
        let file=new File([blob], filename, {type:'image/png'});
        if(navigator.canShare && navigator.canShare({files:[file]})){
            try{ await navigator.share({files:[file], title:shareTitle}); return; }
            catch(e){ /* user cancelled or share failed — fall through to download */ }
        }
        let url=URL.createObjectURL(blob);
        let a=document.createElement('a'); a.href=url; a.download=filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(url), 4000);
        toast('Result image downloaded.');
    }, 'image/png');
}
// JPEG (not PNG) keeps this a few hundred KB instead of several MB for the same card —
// this card is flat color blocks + text, not a photo, so 0.85 JPEG quality is visually
// indistinguishable from the PNG source at normal viewing size.
async function shareOrDownloadCanvasAsPDF(cv, filename, shareTitle){
    try{
        let { jsPDF }=window.jspdf;
        let jpegUrl=cv.toDataURL('image/jpeg', 0.85);
        let orientation = cv.width>=cv.height ? 'l' : 'p';
        let pdf=new jsPDF({orientation, unit:'px', format:[cv.width, cv.height], compress:true});
        pdf.addImage(jpegUrl, 'JPEG', 0, 0, cv.width, cv.height);
        let blob=pdf.output('blob');
        let file=new File([blob], filename, {type:'application/pdf'});
        if(navigator.canShare && navigator.canShare({files:[file]})){
            try{ await navigator.share({files:[file], title:shareTitle}); return; }
            catch(e){ /* fall through to download */ }
        }
        let url=URL.createObjectURL(blob);
        let a=document.createElement('a'); a.href=url; a.download=filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(url), 4000);
        toast('Result PDF downloaded.');
    }catch(e){ console.warn('[Share] PDF export failed', e); toast('Could not generate PDF.'); }
}
let lastTournamentResultData=null;
async function shareTournamentResultImage(){ openShareFormatChoice('tournament'); }
async function buildTournamentResultCanvas(){
    let d=lastTournamentResultData;
    if(!d){toast('No tournament result to share yet.');return null;}
    let logoImg=await loadLogoImage();
    let W=1000;
    let PAD=40, logoBlock=210, titleBlock=130, participantsHeaderBlock=50;
    let champBlock = d.teamMode ? 130 : (d.championName?170:0);
    let hasRecords = !d.teamMode && d.players.some(p=>p.wins!==undefined);
    let rowHeights = d.teamMode ? [] : d.players.map(p=>(p.wins!==undefined)?96:64);
    let teamRowH=52;
    let teamBlockH = d.teamMode ? (40 + Math.max(d.teamAPlayers?.length||0, d.teamBPlayers?.length||0)*teamRowH + 20) : 0;
    let rowsTotal = rowHeights.reduce((a,b)=>a+b+12,0);
    let H = PAD + logoBlock + titleBlock + champBlock + participantsHeaderBlock + rowsTotal + teamBlockH + 90 + PAD;
    let cv=document.createElement('canvas'); cv.width=W; cv.height=H;
    let ctx=cv.getContext('2d');
    let g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#020818'); g.addColorStop(1,'#050f28');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#ffd700'; ctx.lineWidth=6; ctx.strokeRect(20,20,W-40,H-40);
    ctx.strokeStyle='rgba(255,215,0,0.35)'; ctx.lineWidth=1.5; ctx.strokeRect(30,30,W-60,H-60);
    ctx.textAlign='center';
    let cursor=PAD;
    drawSealOrLogo(ctx, W/2, cursor+95, 85, logoImg, '🏆');
    cursor+=logoBlock;
    ctx.fillStyle='#ffd700'; ctx.font='900 30px Poppins, sans-serif';
    ctx.fillText('🏅 LEGENDARY TOURNAMENT RESULTS 🏅', W/2, cursor+30);
    ctx.fillStyle='#fff'; ctx.font='900 36px Poppins, sans-serif';
    wrapCanvasText(ctx, d.name, W/2, cursor+68, W-160, 42);
    ctx.fillStyle='#8ea0c8'; ctx.font='600 18px Poppins, sans-serif';
    let formatLabel = d.teamMode ? 'TEAM BATTLE' : (d.format==='round_robin'?'ROUND ROBIN LEAGUE':'SINGLE ELIMINATION')+(d.rounds?` · ${d.rounds} ROUND${d.rounds>1?'S':''}`:'');
    ctx.fillText(formatLabel, W/2, cursor+96);
    let metaLine=[(d.subjects||[]).map(s=>subjectIcon(s)+' '+s).join(', ').toUpperCase(), d.mode?d.mode.toUpperCase()+' MODE':'', d.hostName?'HOST: '+d.hostName.toUpperCase():''].filter(Boolean).join(' · ');
    if(metaLine){ ctx.font='600 15px Poppins, sans-serif'; ctx.fillStyle='#5d75ac'; ctx.fillText(metaLine, W/2, cursor+122); }
    cursor+=titleBlock;
    if(d.teamMode){
        let glow=ctx.createRadialGradient(W/2,cursor+45,10,W/2,cursor+45,260);
        glow.addColorStop(0,'rgba(255,215,0,0.28)'); glow.addColorStop(1,'rgba(255,215,0,0)');
        ctx.fillStyle=glow; ctx.fillRect(W/2-260,cursor-60,520,260);
        ctx.fillStyle='#08132e'; ctx.strokeStyle='#ffd700'; ctx.lineWidth=3;
        roundRectPath(ctx, W/2-260, cursor, 520, 100, 18); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#ffd700'; ctx.font='700 16px Poppins, sans-serif';
        ctx.fillText('🏆 WINNING TEAM 🏆', W/2, cursor+34);
        ctx.fillStyle='#fff'; ctx.font='900 32px Poppins, sans-serif';
        ctx.fillText(`${d.championName||'Draw'}  (${d.teamAScore} – ${d.teamBScore})`, W/2, cursor+76);
        cursor+=champBlock;
    }else if(d.championName){
        // Gold glow behind the champion card — this is the "legendary" moment of the card,
        // so it gets a soft radial halo instead of a flat box like everything else.
        let glow=ctx.createRadialGradient(W/2,cursor+65,10,W/2,cursor+65,260);
        glow.addColorStop(0,'rgba(255,215,0,0.28)'); glow.addColorStop(1,'rgba(255,215,0,0)');
        ctx.fillStyle=glow; ctx.fillRect(W/2-260,cursor-60,520,320);
        ctx.fillStyle='#08132e'; ctx.strokeStyle='#ffd700'; ctx.lineWidth=3;
        roundRectPath(ctx, W/2-220, cursor, 440, 140, 18); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#ffd700'; ctx.font='700 16px Poppins, sans-serif';
        ctx.fillText('👑 CHAMPION 👑', W/2, cursor+36);
        ctx.fillStyle='#fff'; ctx.font='900 36px Poppins, sans-serif';
        ctx.fillText(`${d.championAvatar} ${d.championName}`, W/2, cursor+90);
        ctx.fillStyle='#8ea0c8'; ctx.font='600 14px Poppins, sans-serif';
        ctx.fillText('UNDEFEATED ACROSS THE FIELD', W/2, cursor+118);
        cursor+=champBlock;
    }
    if(d.teamMode){
        ctx.textAlign='left'; ctx.fillStyle='#8ea0c8'; ctx.font='700 18px Poppins, sans-serif';
        ctx.fillText('FULL SCOREBOARD — EVERY PLAYER', 80, cursor+30);
        cursor+=participantsHeaderBlock;
        let colW=(W-140-20)/2, colX=[70, 70+colW+20];
        let teams=[{name:d.teamAName, players:d.teamAPlayers||[], score:d.teamAScore, won:d.teamAScore>d.teamBScore}, {name:d.teamBName, players:d.teamBPlayers||[], score:d.teamBScore, won:d.teamBScore>d.teamAScore}];
        let blockTop=cursor;
        teams.forEach((team,ti)=>{
            let x=colX[ti], y=blockTop;
            ctx.fillStyle=team.won?'rgba(255,215,0,0.1)':'#08132e';
            ctx.strokeStyle=team.won?'#ffd700':'#1d356f'; ctx.lineWidth=2;
            roundRectPath(ctx, x, y, colW, teamBlockH, 14); ctx.fill(); ctx.stroke();
            ctx.textAlign='left'; ctx.fillStyle=team.won?'#ffd700':'#fff'; ctx.font='900 20px Poppins, sans-serif';
            ctx.fillText(`${team.won?'🏆 ':''}${team.name} — ${team.score}`, x+18, y+34);
            team.players.forEach((p,pi)=>{
                let ry=y+66+pi*teamRowH;
                ctx.font='600 15px Poppins, sans-serif'; ctx.fillStyle='#fff';
                ctx.fillText(`${p.avatarEmoji} ${p.name}`, x+18, ry);
                ctx.textAlign='right'; ctx.fillStyle='#ffd700'; ctx.font='700 15px Poppins, sans-serif';
                ctx.fillText(String(p.score), x+colW-18, ry);
                ctx.textAlign='left';
            });
        });
        cursor+=teamBlockH;
    }else{
        ctx.textAlign='left'; ctx.fillStyle='#8ea0c8'; ctx.font='700 18px Poppins, sans-serif';
        ctx.fillText(`PARTICIPANTS (${d.players.length})${hasRecords?' — FULL RECORD':''}`, 80, cursor+30);
        cursor+=participantsHeaderBlock;
        d.players.forEach((p,i)=>{
            let rh=rowHeights[i];
            ctx.fillStyle=p.isChamp?'rgba(255,215,0,0.1)':'#08132e';
            ctx.strokeStyle=p.isChamp?'#ffd700':'#1d356f'; ctx.lineWidth=2;
            roundRectPath(ctx,70,cursor,W-140,rh,12); ctx.fill(); ctx.stroke();
            ctx.textAlign='left'; ctx.fillStyle='#fff'; ctx.font='700 24px Poppins, sans-serif';
            ctx.fillText(`${p.avatarEmoji} ${p.name}${p.isChamp?' 🏆':''}`, 100, cursor+34);
            if(p.wins!==undefined){
                ctx.font='600 15px Poppins, sans-serif'; ctx.fillStyle='#ffd700';
                ctx.fillText(`${p.tierEmoji||'🎓'} ${p.tierName||'Unranked'}  ·  ${p.wins}W–${p.losses}L`, 100, cursor+58);
                let oppStr=(p.opponents||[]).map(o=>(o.result==='W'?'def. ':'lost to ')+o.name).join('  ·  ');
                if(oppStr.length>78) oppStr=oppStr.slice(0,75)+'…';
                ctx.font='500 13px Poppins, sans-serif'; ctx.fillStyle='#5d75ac';
                ctx.fillText(oppStr, 100, cursor+80);
            }
            cursor+=rh+12;
        });
    }
    ctx.strokeStyle='#1d356f'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(80,cursor+10); ctx.lineTo(W-80,cursor+10); ctx.stroke();
    ctx.textAlign='center'; ctx.fillStyle='#ffd700'; ctx.font='900 16px Poppins, sans-serif';
    ctx.fillText('⚡ ELITE SCHOLAR INSTITUTE', W/2, cursor+48);
    ctx.fillStyle='#5d75ac'; ctx.font='600 13px Poppins, sans-serif';
    ctx.fillText('ALL RIGHTS RESERVED', W/2, cursor+70);
    return cv;
}
function wrapCanvasText(ctx, text, cx, y, maxWidth, lineHeight){
    let words=(text||'').split(' '); let line=''; let lines=[];
    words.forEach(w=>{
        let test=line?line+' '+w:w;
        if(ctx.measureText(test).width>maxWidth && line){ lines.push(line); line=w; } else { line=test; }
    });
    if(line) lines.push(line);
    lines.slice(0,2).forEach((l,i)=>ctx.fillText(l, cx, y+i*lineHeight));
}
// A subject-aware icon so chips, tournament cards, and share images all get a bit of visual
// personality instead of plain text — one shared lookup, matched loosely so custom/renamed
// subjects still fall back gracefully instead of showing nothing.
const SUBJECT_ICONS={mathematics:'➗',math:'➗',physics:'⚛️',chemistry:'🧪',biology:'🧬',history:'📜',geography:'🌍',english:'📖',literature:'📚',economics:'📈',government:'🏛️',civics:'⚖️',art:'🎨',music:'🎵','computer science':'💻',ict:'💻',french:'🇫🇷',spanish:'🇪🇸',    agriculture:'🌾',commerce:'💼',accounting:'🧮',religion:'🙏',crs:'✝️'};
function subjectIcon(subject){
    if(!subject) return '📚';
    let s=String(subject).toLowerCase();
    for(let key in SUBJECT_ICONS){ if(s.includes(key)) return SUBJECT_ICONS[key]; }
    return '📚';
}
function subjectsWithIcons(subjects){
    return (subjects||[]).map(s=>subjectIcon(s)+' '+s).join(', ');
}
// Lightweight confetti burst, no external library — a few dozen tumbling rectangles on a
// fixed full-screen canvas that clean themselves up. Fired once when the results screen
// shows an actual win, so a victory feels like one instead of just a number changing.
function fireConfetti(){
    let old=document.getElementById('confettiOverlay'); if(old) old.remove();
    let cv=document.createElement('canvas');
    cv.id='confettiOverlay';
    cv.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999';
    cv.width=window.innerWidth; cv.height=window.innerHeight;
    document.body.appendChild(cv);
    let ctx=cv.getContext('2d');
    let colors=['#ffd700','#00ff88','#00bfff','#ff6b6b','#c084fc'];
    let pieces=Array.from({length:90},()=>({
        x:Math.random()*cv.width, y:-20-Math.random()*cv.height*0.4,
        w:5+Math.random()*5, h:8+Math.random()*8,
        vy:2+Math.random()*3.5, vx:(Math.random()-0.5)*2.4,
        rot:Math.random()*360, vrot:(Math.random()-0.5)*14,
        color:colors[Math.floor(Math.random()*colors.length)]
    }));
    let start=Date.now();
    function frame(){
        let elapsed=Date.now()-start;
        ctx.clearRect(0,0,cv.width,cv.height);
        pieces.forEach(p=>{
            p.x+=p.vx; p.y+=p.vy; p.rot+=p.vrot;
            ctx.save();
            ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
            ctx.fillStyle=p.color;
            ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
            ctx.restore();
        });
        if(elapsed<3200 && cv.isConnected){ requestAnimationFrame(frame); }
        else{ cv.remove(); }
    }
    requestAnimationFrame(frame);
}
// A genuine tier promotion is a bigger deal than the usual toast, so it gets its own brief
// full-screen celebration (plus a confetti burst) instead of blending into the ELO/XP line.
function showTierUpBanner(tier){
    let old=document.getElementById('tierUpOverlay'); if(old) old.remove();
    let box=document.createElement('div');
    box.id='tierUpOverlay';
    box.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9998;background:rgba(2,8,24,0.72);animation:popIn 0.25s ease';
    box.innerHTML=`<div style="text-align:center">
        <div style="font-size:64px">${tier[3]}</div>
        <div style="font-size:12px;letter-spacing:2px;color:var(--muted);font-weight:700;margin-top:4px">RANK UP</div>
        <div style="font-size:26px;font-weight:900;color:var(--accent);margin-top:4px">${esc(tier[1])} Tier</div>
    </div>`;
    document.body.appendChild(box);
    fireConfetti();
    playSfx('levelup');
    setTimeout(()=>box.remove(), 2600);
}
function roundRectPath(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
}

async function applyMyResultToProfile(matchId, m, iWon, isDraw){
    let ranked = m.settings.mode!=='free' && !m.teamMode;
    let myCorrect=0, myTotal=0;
    let qids=Object.keys(m.answerKey||{});
    let myAnswers=[];
    qids.forEach(qi=>{
        let a=m.answers && m.answers[qi] && m.answers[qi][MY_UID];
        myAnswers[qi]= a ? a.selected : -1;
        if(a){myTotal++; if(a.selected===m.answerKey[qi].answer) myCorrect++;}
    });
    let perfect = myTotal>0 && myCorrect===myTotal;
    let eloDelta=0;
    let newElo=ME.elo;
    let oppEloForAch=ME.elo||0;
    if(ranked){
        let oppUid=myOpponentUid(m);
        let oppElo=ME.elo||0; // unknown opponent → assume equal skill, never a hardcoded absolute default
        if(oppUid){ let s=await mdb.ref('mp_users/'+oppUid+'/elo').get(); if(s.exists())oppElo=s.val(); }
        oppEloForAch=oppElo;
        let expected=1/(1+Math.pow(10,(oppElo-ME.elo)/400));
        let actual=isDraw?0.5:(iWon?1:0);
        eloDelta=Math.round(32*(actual-expected));
        newElo=Math.max(0, ME.elo+eloDelta);
    }

    // ---- Team Contribution % = MY correct answers ÷ MY TEAM's total correct answers × 100.
    // Exactly 0 if this wasn't a team match — never mixed in with 1v1/quick-match stats. ----
    let contribPct=0;
    if(m.teamMode){
        let myTeam=(m.players[MY_UID]||{}).team;
        let teammates=Object.values(m.players||{}).filter(p=>p.team===myTeam);
        let teamTotalCorrect=0;
        teammates.forEach(p=>{
            qids.forEach(qi=>{
                let a=m.answers && m.answers[qi] && m.answers[qi][p.uid];
                if(a && a.selected===m.answerKey[qi].answer) teamTotalCorrect++;
            });
        });
        contribPct = teamTotalCorrect>0 ? Math.round((myCorrect/teamTotalCorrect)*100) : 0;
    }

    let bestStreak=Math.max(ME.bestStreak||0, m.streaks[MY_UID]||0);
    let xpGain=30 + (iWon?50:isDraw?20:10) + myCorrect*3;
    let coinGain=iWon?7:isDraw?3:2;
    let newXP=(ME.xp||0)+xpGain;
    let newLevel=Math.max(1, Math.floor(newXP/500)+1);
    let newTotalMatches=(ME.totalMatches||0)+1;
    let newWinStreak = iWon ? (ME.currentWinStreak||0)+1 : 0;

    // ---- Achievements — deliberately harder to earn than a single lucky match; most now need
    // sustained performance, a genuinely tough opponent, or a tough difficulty, not just showing up.
    let ach=Object.assign({}, ME.achievements||{});
    let newlyEarned=[];
    function earn(key,label){ if(!ach[key]){ ach[key]=true; newlyEarned.push(label); } }
    let newWinsTotal=(ME.wins||0)+(iWon?1:0);
    let hardDiff = m.settings && (m.settings.difficulty==='Hard' || m.settings.difficulty==='Olympian');
    let newPerfectCount=(ME.perfectCount||0) + (perfect && hardDiff ? 1 : 0);
    let eloGap = oppEloForAch - (ME.elo||0);
    if(iWon && newWinsTotal>=3) earn('first_win','🥇 3 Ranked Wins');
    if(iWon && newWinStreak>=5) earn('win_streak_5','🔥 5-Win Streak');
    if(iWon && newWinStreak>=10) earn('win_streak_10','🔥 10-Win Streak — Unstoppable');
    if(perfect && hardDiff) earn('perfect_match','💯 Flawless Round — every question right on Hard/Olympian');
    if(newPerfectCount>=5) earn('flawless_five','🏵️ 5 Flawless Rounds on Hard/Olympian');
    if(ranked && iWon && eloGap>=200) earn('giant_slayer','⚔️ Giant Slayer — beat an opponent 200+ Elo above you');
    if(newTotalMatches>=25) earn('ten_matches','🎖️ 25 Matches Played');
    if(newTotalMatches>=100) earn('fifty_matches','🎖️ 100 Matches Played — Veteran');
    if(newTotalMatches>=300) earn('hundred_matches','🎖️ 300 Matches Played — Legend');
    if(iWon && m.teamMode) earn('team_player','🛡️ Team Player');
    if(contribPct>=65) earn('mvp_teammate','⭐ MVP — 65%+ of your team\'s correct answers');
    if(tierFor(newElo)[1]!==tierFor(ME.elo||0)[1] && ELO_TIERS.findIndex(x=>x[1]===tierFor(newElo)[1])>ELO_TIERS.findIndex(x=>x[1]===tierFor(ME.elo||0)[1])) earn('tier_up_'+tierFor(newElo)[1].toLowerCase().replace(/\s+/g,'_'), tierFor(newElo)[3]+' Reached '+tierFor(newElo)[1]+' tier');
    if(bestStreak>=12) earn('answer_streak_8','⚡ 12-Answer Streak in one match');
    if((ME.coins||0)+coinGain>=5000) earn('coin_collector','🪙 Earned 5000+ coins');
    if(!(ME.firstEverMatchAt)) earn('welcome_aboard','🎉 Played your first multiplayer match');

    let updates={
        elo:newElo, wins:(ME.wins||0)+(iWon?1:0), losses:(ME.losses||0)+((!iWon&&!isDraw)?1:0),
        draws:(ME.draws||0)+(isDraw?1:0), totalMatches:newTotalMatches, perfectCount:newPerfectCount,
        bestStreak, xp:newXP, level:newLevel, coins:(ME.coins||0)+coinGain,
        achievements:ach, currentWinStreak:newWinStreak,
        teamContribSum:(ME.teamContribSum||0)+(m.teamMode?contribPct:0),
        teamContribCount:(ME.teamContribCount||0)+(m.teamMode?1:0),
        firstEverMatchAt: ME.firstEverMatchAt || firebase.database.ServerValue.TIMESTAMP
    };
    let oldTier=tierFor(ME.elo||0);
    let oldElo=ME.elo||0;
    await mdb.ref('mp_users/'+MY_UID).update(updates);
    Object.assign(ME, updates);
    renderHubProfileHeader();renderProfileScreen();
    let newTier=tierFor(newElo);
    if(ranked && newTier[1]!==oldTier[1] && newElo>oldElo){
        setTimeout(()=>showTierUpBanner(newTier), 400);
    }else if(newlyEarned.length){
        setTimeout(()=>toast('🏆 Achievement unlocked: '+newlyEarned[0]), 1800);
    }

    let eloText = ranked ? (eloDelta>=0?`+${eloDelta}`:`${eloDelta}`)+' ELO' : (m.teamMode?'Team battle — no ELO change':'Casual match — no ELO change');
    let elDelta=$('resultsEloDelta'); if(elDelta) elDelta.textContent=`${eloText} • +${xpGain} XP • +${coinGain} coins${m.teamMode?` • ${contribPct}% team contribution`:''}`;

    // Full record for History & Performance: includes the actual question set + my answers so
    // the player can review right/wrong per question, or redo the exact same set solo later.
    let qArr=qids.map(qi=>({q:m.questions[qi].q, options:m.questions[qi].options, subject:m.questions[qi].subject}));
    let keyArr=qids.map(qi=>({answer:m.answerKey[qi].answer, explanation:m.answerKey[qi].explanation||''}));
    await mdb.ref('mp_match_history/'+MY_UID).push({
        matchId, opponentUid:myOpponentUid(m), result: isDraw?'draw':(iWon?'win':'loss'),
        score:m.scores[MY_UID]||0, subjects:m.settings.subjects, mode:m.settings.mode,
        teamMode:!!m.teamMode, contribPct, correct:myCorrect, total:myTotal,
        questions:qArr, answerKey:keyArr, myAnswers,
        ts:firebase.database.ServerValue.TIMESTAMP
    });
    await updateMPLeaderboard();
}

// ============================================================================================
// ===== SOLO REVIEW — replay any question set (a just-finished match, or a past History entry)
// alone, entirely client-side, with immediate right/wrong feedback and the explanation. ======
// ============================================================================================
let lastMatchQuestions=null;
let soloState=null;
function openSoloReview(){
    if(!lastMatchQuestions || !lastMatchQuestions.questions){ toast('No questions available to practice.'); return; }
    let total=Object.keys(lastMatchQuestions.questions).length;
    soloState={idx:0, score:0, total, picks:{}, flags:{}};
    openModal('soloReviewModal');
    renderSoloQuestion();
}
function renderSoloQuestion(){
    let qs=lastMatchQuestions.questions, keys=lastMatchQuestions.answerKey;
    let qi=soloState.idx;
    let q=qs[qi];
    if(!q){
        let flaggedCount=Object.values(soloState.flags).filter(Boolean).length;
        $('soloReviewProgress').textContent='Done!';
        $('soloReviewBody').innerHTML=`<div style="text-align:center;padding:14px 0">
            <div style="font-size:30px">🎓</div>
            <div style="font-size:15px;font-weight:900;margin-top:6px">You scored ${soloState.score} / ${soloState.total}</div>
            ${flaggedCount?`<div class="input-hint" style="margin-top:4px">🚩 ${flaggedCount} question${flaggedCount>1?'s':''} flagged for review</div>`:''}
            <button class="btn btn-p" style="margin-top:12px" onclick="openSoloReview()">🔁 Practice Again</button>
            <button class="btn btn-gold" style="margin-top:8px" onclick="openShareFormatChoice('solo')">📤 Share Result</button>
        </div>`;
        return;
    }
    let key=keys[qi];
    let picked=soloState.picks[qi];
    let isFlagged=!!soloState.flags[qi];
    $('soloReviewProgress').innerHTML=`Question ${qi+1} of ${soloState.total}${q.subject?(' • '+q.subject):''}
        <span style="float:right;display:flex;gap:6px">
            <button class="icon-btn" style="padding:3px 8px;font-size:10px" onclick="soloNav(-1)" ${qi===0?'disabled':''}>‹ Prev</button>
            <button class="icon-btn" style="padding:3px 8px;font-size:10px;color:${isFlagged?'var(--accent)':'inherit'}" onclick="toggleSoloFlag()">${isFlagged?'🚩 Flagged':'🏳️ Flag'}</button>
            <button class="icon-btn" style="padding:3px 8px;font-size:10px" onclick="soloNav(1)" ${qi>=soloState.total-1?'disabled':''}>Next ›</button>
        </span>`;
    $('soloReviewBody').innerHTML=`
        <div style="font-weight:700;font-size:12.5px;margin-bottom:8px;color:var(--text);clear:both;padding-top:6px">${esc(q.q)}</div>
        <div id="soloOpts">${q.options.map((opt,oi)=>{
            let cls='opt-btn';
            if(picked!=null){ if(oi===key.answer) cls+=' correct'; else if(oi===picked) cls+=' wrong'; }
            return `<button class="${cls}" ${picked!=null?'disabled':''} onclick="soloPick(${oi})">${String.fromCharCode(65+oi)}. ${esc(opt)}</button>`;
        }).join('')}</div>
        <div id="soloFeedback">${picked!=null?soloFeedbackHtml(qi,picked,key):''}</div>`;
}
function soloFeedbackHtml(qi,picked,key){
    let correct=picked===key.answer;
    return `<div style="margin-top:8px;padding:8px;border-radius:7px;font-size:11px;font-weight:800;text-align:center;background:${correct?'rgba(0,255,136,0.12)':'rgba(255,71,87,0.12)'};color:${correct?'var(--success)':'var(--error)'}">${correct?'✅ Correct!':'❌ Not quite'}</div>
        ${key.explanation?`<div style="margin-top:6px;padding:8px;background:var(--card2);border:1px solid var(--border);border-radius:7px;font-size:9.5px;color:var(--muted);line-height:1.4">${esc(key.explanation)}</div>`:''}
        <button class="btn btn-gold" style="margin-top:10px" onclick="soloNav(1)">${soloState.idx>=soloState.total-1?'See Results':'Next ›'}</button>`;
}
function soloNav(delta){
    let next=soloState.idx+delta;
    if(next<0)return;
    if(next>soloState.total-1 && delta>0){ soloState.idx=soloState.total; renderSoloQuestion(); return; }
    soloState.idx=next;
    renderSoloQuestion();
}
function toggleSoloFlag(){
    let qi=soloState.idx;
    soloState.flags[qi]=!soloState.flags[qi];
    if(MY_UID){
        let q=lastMatchQuestions.questions[qi];
        let fid=hashQ ? hashQ(q.q) : String(qi)+q.q.slice(0,20);
        if(soloState.flags[qi]){
            mdb.ref('mp_users/'+MY_UID+'/flaggedQuestions/'+fid).set({q:q.q, options:q.options, subject:q.subject||'', answer:(lastMatchQuestions.answerKey[qi]||{}).answer, explanation:(lastMatchQuestions.answerKey[qi]||{}).explanation||'', flaggedAt:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});
        }else{
            mdb.ref('mp_users/'+MY_UID+'/flaggedQuestions/'+fid).remove().catch(()=>{});
        }
    }
    renderSoloQuestion();
}
function soloPick(oi){
    let qi=soloState.idx;
    if(soloState.picks[qi]!=null)return;
    soloState.picks[qi]=oi;
    let keys=lastMatchQuestions.answerKey;
    let key=keys[qi];
    let correct = oi===key.answer;
    if(correct) soloState.score++;
    renderSoloQuestion();
}
async function openFlaggedQuestions(){
    if(!MY_UID)return;
    let snap=await mdb.ref('mp_users/'+MY_UID+'/flaggedQuestions').get();
    let flagged=snap.val()||{};
    let ids=Object.keys(flagged);
    if(!ids.length){ toast('NO FLAGGED QUESTION YET!'); return; }
    let questions={}, answerKey={};
    ids.forEach((id,i)=>{ let f=flagged[id]; questions[i]={q:f.q,options:f.options,subject:f.subject}; answerKey[i]={answer:f.answer, explanation:f.explanation}; });
    lastMatchQuestions={questions, answerKey};
    openSoloReview();
}

function requestRematch(){
    if(!lastMatchMeta || lastMatchMeta.teamMode || !lastMatchMeta.opponentUid){
        toast('Rematch is available for 1v1 duels — start a new Team Battle from Rooms instead.');
        return;
    }
    if(lastMatchMeta.isBotOpponent){ requestBotRematch(); return; }
    let oppUid=lastMatchMeta.opponentUid;
    mdb.ref('mp_users/'+oppUid+'/username').get().then(async snap=>{
        let oppName=snap.exists()?snap.val():'Opponent';
        let cRef=mdb.ref('mp_challenges').push();
        await cRef.set({fromUid:MY_UID, fromName:ME.username, toUid:oppUid, toName:oppName, settings:lastMatchMeta.settings, status:'pending', createdAt:firebase.database.ServerValue.TIMESTAMP});
        sendNotif(oppUid,'challenge', `${ME.username} wants a rematch!`, {challengeId:cRef.key});
        toast('Rematch request sent to '+oppName+'!');
        mdb.ref('mp_challenges/'+cRef.key).on('value', s2=>{
            let c=s2.val();if(!c)return;
            if(c.status==='accepted' && c.matchId){ mdb.ref('mp_challenges/'+cRef.key).off('value'); joinExistingMatch(c.matchId, c.roomId); }
            else if(c.status==='rejected'){ mdb.ref('mp_challenges/'+cRef.key).off('value'); toast(oppName+' declined the rematch.'); }
        });
    });
}
// Bot rematch — same "feel" as a human accepting (a short wait, then the match just starts),
// but built entirely on this device since a bot has no client of its own to accept anything.
// Reuses the EXACT questions/answerKey/settings from the match that just ended (pulled from
// lastMatchQuestions, captured in showResultsScreen) instead of fetching a fresh batch, and
// brings back the same opponent name/avatar so it reads as "the bot came back", not a new one.
async function requestBotRematch(){
    let oppName = lastMatchMeta.opponentName || 'Your opponent';
    let oppAvatar = lastMatchMeta.opponentAvatar || null;
    let settings = lastMatchMeta.settings;
    let questions = lastMatchQuestions && lastMatchQuestions.questions;
    let answerKey = lastMatchQuestions && lastMatchQuestions.answerKey;
    if(!questions || !answerKey){
        toast('Could not rebuild that match — try Quick Match instead.');
        return;
    }
    toast('🔁 Rematch requested — waiting for '+oppName+'…');
    setTimeout(async ()=>{
        try{
            let botUid='bot_'+Math.random().toString(36).slice(2,11);
            let botAccuracy=computeBotAccuracy();
            let roomId=mdb.ref('mp_rooms').push().key;
            let roomPlayers={};
            roomPlayers[botUid]={name:oppName, ready:true, team:'A', uid:botUid};
            roomPlayers[MY_UID]={name:ME.username, ready:true, team:'B', uid:MY_UID};
            await mdb.ref('mp_rooms/'+roomId).set({
                hostUid:MY_UID, hostName:ME.username, type:'quickmatch', visibility:'private',
                settings, teamMode:false, maxPlayers:2, powerups:true,
                status:'starting', players:roomPlayers, createdAt:firebase.database.ServerValue.TIMESTAMP
            });
            let matchRef=mdb.ref('mp_matches').push();
            let matchId=matchRef.key;
            let mPlayers={};
            mPlayers[botUid]={name:oppName, team:'A', uid:botUid, isBot:true, avatarEmoji:oppAvatar};
            mPlayers[MY_UID]={name:ME.username, team:'B', uid:MY_UID, isBot:false, avatarEmoji:null};
            await matchRef.set({
                roomId, settings, teamMode:false, hostUid:MY_UID, teamNames:null,
                playerCount:2, players:mPlayers, questions, answerKey,
                state:'active', currentQ:0, qStartedAt:firebase.database.ServerValue.TIMESTAMP,
                matchStartedAt:firebase.database.ServerValue.TIMESTAMP,
                answers:{}, scores:{[botUid]:0,[MY_UID]:0}, streaks:{[botUid]:0,[MY_UID]:0},
                powerupsUsed:{}, shields:{}, freezes:{},
                powerups: settings.powerups!==false, showExplanations: settings.showExplanations!==false,
                createdAt:firebase.database.ServerValue.TIMESTAMP
            });
            await mdb.ref('mp_rooms/'+roomId).update({status:'in_progress', matchId});
            // Must be set BEFORE enterLobby — its room listener fires joinExistingMatch as
            // soon as it sees status:'in_progress', and joinExistingMatch is what reads
            // pendingBotContext to arm the local bot-autoplay for this new matchId.
            pendingBotContext={
                matchId, botUid, botAccuracy,
                answerKey: Object.keys(answerKey).sort((a,b)=>a-b).map(k=>answerKey[k].answer)
            };
            enterLobby(roomId);
        }catch(e){
            console.warn('[BotRematch] failed', e);
            toast('Could not start the rematch — try Quick Match instead.');
        }
    }, 5000);
}
// ---- Recent matches (hub) ----
// ============================================================================================
// ===== HISTORY & PERFORMANCE — same engine/graph/redo/clear pattern as Single Player,
// grouped by mode (Spak / Sprint / Read) exactly like Single Player's History card. ==========
// ============================================================================================
let mpHistoryCache=null;
async function openHistoryScreen(){
    ['mp_spak','mp_speed','mp_free'].forEach(m=>{ let h=$('h_'+m); if(h) h.innerHTML='<div class="empty-hint">Loading…</div>'; });
    try{
        let snap=await mdb.ref('mp_match_history/'+MY_UID).limitToLast(150).get();
        let hist=snap.val()||{};
        mpHistoryCache=Object.keys(hist).map(id=>Object.assign({id},hist[id])).sort((a,b)=>(a.ts||0)-(b.ts||0));
    }catch(e){ mpHistoryCache=[]; }
    renderMPHistory();
}
function drawMPGraph(canvasId, data, color){
    let c=$(canvasId);if(!c||!data||!data.length)return;
    let ctx=c.getContext('2d');
    let w=c.offsetWidth||c.width||300; c.width=w;
    let h=90; c.height=h;
    ctx.clearRect(0,0,w,h);
    if(data.length===1){
        let x=w/2, y=h-(data[0].score/100)*(h-20)-10;
        ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
        ctx.shadowColor=color;ctx.shadowBlur=12;ctx.fill();
        return;
    }
    let pts=data.map((r,k)=>({x:k/(data.length-1)*(w-20)+10, y:h-(r.score/100)*(h-20)-10}));
    ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';
    ctx.shadowColor=color;ctx.shadowBlur=8;
    ctx.moveTo(pts[0].x,pts[0].y);
    for(let k=1;k<pts.length;k++){
        if(k<pts.length-1){
            let cpX=(pts[k].x+pts[k+1].x)/2, cpY=(pts[k].y+pts[k+1].y)/2;
            ctx.quadraticCurveTo(pts[k].x,pts[k].y,cpX,cpY);
        }else{
            ctx.quadraticCurveTo(pts[k-1].x,pts[k-1].y,pts[k].x,pts[k].y);
        }
    }
    ctx.stroke();
    pts.forEach(pt=>{
        ctx.beginPath();ctx.arc(pt.x,pt.y,4,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.shadowColor='#ffffff';ctx.shadowBlur=10;ctx.fill();
        ctx.beginPath();ctx.arc(pt.x,pt.y,2.5,0,Math.PI*2);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=6;ctx.fill();
    });
    ctx.shadowColor='transparent';ctx.shadowBlur=0;
}
function renderMPHistory(){
    let colors={spak:'#00ff88',speed:'#00bfff',free:'#ffd700'};
    ['spak','speed','free'].forEach(mode=>{
        let rows=(mpHistoryCache||[]).filter(h=>h.mode===mode);
        let cnt=$('cnt_mp_'+mode); if(cnt) cnt.textContent=`(${rows.length})`;
        let graphData=rows.map(h=>({score: h.total>0?Math.round((h.correct/h.total)*100):0}));
        if(graphData.length) drawMPGraph('g_mp_'+mode, graphData, colors[mode]);
        let sEl=$('s_mp_'+mode);
        if(sEl){
            if(rows.length){
                let avg=Math.round(graphData.reduce((s,d)=>s+d.score,0)/graphData.length);
                let wins=rows.filter(h=>h.result==='win').length;
                sEl.textContent=`${rows.length} played • ${wins} won • avg accuracy ${avg}%`;
            }else sEl.textContent='';
        }
        let hEl=$('h_mp_'+mode); if(!hEl)return;
        if(!rows.length){hEl.innerHTML='NO HISTORY RECORDED YET!';return;}
        let ordered=rows.slice().reverse();
        hEl.innerHTML=ordered.map(item=>{
            let pct = item.total>0?Math.round((item.correct/item.total)*100):0;
            let icon=item.result==='win'?'✅':item.result==='loss'?'❌':'🤝';
            return `<details style="margin-top:6px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px">
                <summary style="cursor:pointer;font-size:10.5px;font-weight:700;list-style:none;display:flex;justify-content:space-between;align-items:center">
                    <span>${icon} ${fmtTime(item.ts)} • <b style="color:${pct>=70?'var(--success)':pct>=50?'var(--accent)':'var(--error)'}">${pct}%</b> (${item.correct}/${item.total})${item.teamMode?` • ${item.contribPct}% team contrib`:''}</span>
                    <span class="muted" style="font-size:9px">Tap to Expand▼</span>
                </summary>
                <div style="margin-top:8px;border-top:1px dashed var(--border);padding-top:6px">
                    ${(item.questions||[]).map((q,qi)=>{
                        let ua=(item.myAnswers||[])[qi];
                        let key=(item.answerKey||[])[qi]||{};
                        return `<div style="margin-bottom:8px;padding:8px;background:var(--card2);border-radius:6px;border-left:3px solid ${ua==null||ua===-1?'#666':ua===key.answer?'var(--success)':'var(--error)'}">
                            <div style="font-size:11px;font-weight:700;margin-bottom:4px">${qi+1}. ${esc(q.q)}</div>
                            ${(q.options||[]).map((opt,oi)=>{
                                let isCorr=oi===key.answer, isUser=oi===ua;
                                return `<div style="font-size:10px;padding:4px 6px;margin:3px 0;border:1px solid ${isCorr?'var(--success)':isUser?'var(--error)':'var(--border2)'};background:${isCorr?'rgba(0,255,136,0.1)':isUser?'rgba(255,71,87,0.1)':'transparent'};border-radius:4px">
                                    ${String.fromCharCode(65+oi)}. ${esc(opt)} ${isCorr?'✅':''} ${isUser&&!isCorr?'❌':''}
                                </div>`;
                            }).join('')}
                            ${key.explanation?`<div style="font-size:9px;color:var(--muted);margin-top:4px"><b>Explanation:</b> ${esc(key.explanation)}</div>`:''}
                        </div>`;
                    }).join('')}
                    <div style="display:flex;gap:6px;margin-top:8px">
                        <button class="btn btn-g btn-sm" onclick="replayMPQuizSolo('${item.id}')">🔄 Redo Quiz (Solo)</button>
                        <button class="btn btn-g btn-sm" style="color:var(--error);border-color:rgba(255,71,87,0.3)" onclick="deleteOneMPHistory('${item.id}')">🗑 Clear history</button>
                    </div>
                </div>
            </details>`;
        }).join('');
    });
}
// Re-draw graphs when a details section is opened (canvas has zero width while hidden)
document.querySelectorAll('#historyWrap details').forEach(det=>{
    det.addEventListener('toggle',()=>{if(det.open)renderMPHistory();});
});
function replayMPQuizSolo(id){
    let item=(mpHistoryCache||[]).find(h=>h.id===id); if(!item)return;
    lastMatchQuestions={
        questions:Object.fromEntries((item.questions||[]).map((q,i)=>[i,q])),
        answerKey:Object.fromEntries((item.answerKey||[]).map((k,i)=>[i,k]))
    };
    openSoloReview();
}
async function deleteOneMPHistory(id){
    if(!confirm('Remove this match from your history?'))return;
    await mdb.ref('mp_match_history/'+MY_UID+'/'+id).remove().catch(()=>{});
    mpHistoryCache=(mpHistoryCache||[]).filter(h=>h.id!==id);
    renderMPHistory();
    toast('Removed from history.');
}
async function clearAllMPHistory(){
    if(!confirm('Clear ALL your multiplayer history? This cannot be undone.'))return;
    await mdb.ref('mp_match_history/'+MY_UID).remove().catch(()=>{});
    mpHistoryCache=[];
    renderMPHistory();
    toast('History cleared.');
}

// ============================================================================================
// ===== MULTIPLAYER GLOBAL LEADERBOARD (mirrors single-player arrangement) ==================
// ============================================================================================
const MP_LB_PREFIX='mp_global_lb/';
function curMonthMP(){return new Date().toISOString().slice(0,7);}
function prevMonthMP(){let d=new Date();d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7);}
function calcMPRankingScore(e){
    let elo=e.elo||1000, matches=e.totalMatches||0;
    // Elo is the dominant, self-correcting factor (already weighted by opponent strength).
    // A small experience factor rewards proven consistency over a handful of lucky wins,
    // capped so it can never outweigh Elo itself. A small team-contribution factor rewards
    // players who genuinely carry their team, not just those who happen to win team matches.
    let experienceFactor = Math.min(20, Math.log2(matches+1)*4);
    let contribFactor = (e.avgTeamContrib!=null) ? Math.min(15, e.avgTeamContrib*0.15) : 0;
    return +(elo + experienceFactor + contribFactor).toFixed(2);
}
async function updateMPLeaderboard(){
    if(!ME)return;
    let month=curMonthMP();let key=MP_LB_PREFIX+month;
    let entry={
        uid:MY_UID, name:ME.username, elo:ME.elo, wins:ME.wins||0, losses:ME.losses||0,
        draws:ME.draws||0, totalMatches:ME.totalMatches||0, avatarEmoji:ME.avatarEmoji||'🎓',
        avgTeamContrib: ME.teamContribCount ? Math.round(ME.teamContribSum/ME.teamContribCount) : null,
        equippedNameColor: ME.equippedNameColor||null
    };
    entry.rankScore=calcMPRankingScore(entry);
    try{ await mdb.ref(key+'/'+MY_UID).set(entry); }catch(e){ console.warn('[MP-LB] update failed', e); }
}
async function openLB(){
    openModal('lbModal');
    $('lbPodium').innerHTML='<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px">Calculating rankings…</div>';
    $('lbBody').innerHTML='<tr><td colspan="9" style="text-align:center;padding:12px;color:var(--muted)">Loading…</td></tr>';
    let statusEl=$('lbSyncStatus');if(statusEl)statusEl.textContent='Connecting…';

    let now=curMonthMP();let key=MP_LB_PREFIX+now;
    let lastCheck=localStorage.getItem('mp_lb_last_month')||now;
    if(lastCheck!==now){
        try{
            let prevKey=MP_LB_PREFIX+lastCheck;
            let prevSnap=await mdb.ref(prevKey).get();
            let prevBoard=prevSnap.exists()?Object.values(prevSnap.val()):[];
            if(prevBoard.length){
                prevBoard.forEach(e=>{if(!e.rankScore)e.rankScore=calcMPRankingScore(e);});
                prevBoard.sort((a,b)=>b.rankScore-a.rankScore);
                let top3=prevBoard.slice(0,3);
                await mdb.ref('mp_lb_hof').set({month:lastCheck, top3, expires:Date.now()+86400000, created:Date.now()});
            }
        }catch(e){}
        localStorage.setItem('mp_lb_last_month', now);
    }

    let snap; let healthy=true;
    try{ snap=await mdb.ref(key).get(); }catch(e){ healthy=false; }
    let all=snap && snap.exists() ? Object.values(snap.val()) : [];
    all.forEach(e=>{if(!e.rankScore)e.rankScore=calcMPRankingScore(e);});
    all.sort((a,b)=>b.rankScore-a.rankScore);
    if(statusEl){
        statusEl.textContent = healthy ? `🟢 Live • ${all.length} player${all.length===1?'':'s'} ranked this month` : `🔴 Connection issue — tap Refresh to retry.`;
        statusEl.style.color = healthy ? 'var(--success)' : 'var(--error)';
    }

    let hof=null;try{let hs=await mdb.ref('mp_lb_hof').get();hof=hs.exists()?hs.val():null;}catch(e){}
    let hofHtml='';
    if(hof && Date.now()<hof.expires){
        // Slightly taller/shorter podium blocks per rank (gold tallest) so the hierarchy reads
        // instantly even before anyone reads a name — same trick the champion card already
        // uses on the tournament share image.
        let rankBlock=(p, rank)=>{
            let cfg = rank===1
                ? {medal:'🥇', label:'1ST', h:118, fs:13, ring:'#ffd700', bg:'linear-gradient(180deg,rgba(255,215,0,0.28),rgba(255,215,0,0.06))', name:'#fff', sub:'#ffd700', border:'1.5px solid #ffd700'}
                : rank===2
                ? {medal:'🥈', label:'2ND', h:96, fs:11.5, ring:'#c0c0c0', bg:'rgba(192,192,192,0.12)', name:'#eef2fb', sub:'#9fc4ff', border:'1px solid #c0c0c0'}
                : {medal:'🥉', label:'3RD', h:96, fs:11.5, ring:'#cd7f32', bg:'rgba(205,127,50,0.12)', name:'#eef2fb', sub:'#9fc4ff', border:'1px solid #cd7f32'};
            return `<div style="display:flex;flex-direction:column;justify-content:flex-end;align-items:center;min-width:${rank===1?92:78}px;height:${cfg.h}px;background:${cfg.bg};border:${cfg.border};border-radius:14px;padding:10px 6px;position:relative;${rank===1?'box-shadow:0 0 22px rgba(255,215,0,0.35)':''}">
                <div style="position:absolute;top:6px;left:0;right:0;font-size:8px;font-weight:900;letter-spacing:1px;color:${cfg.sub};opacity:0.85">${cfg.label}</div>
                <div style="font-size:${rank===1?28:20}px;margin-top:10px">${cfg.medal}</div>
                <div style="font-weight:900;font-size:${cfg.fs}px;margin-top:3px;color:${cfg.name};word-break:break-word">${esc(p?.name||'—')}</div>
                <div style="font-size:10px;color:${cfg.sub};margin-top:2px;font-weight:800">${Math.round(p?.elo||0)} ELO</div>
            </div>`;
        };
        hofHtml=`<div style="background:linear-gradient(160deg,#0a1530,#0d1b3d 45%,#15296b);color:#fff;padding:18px 14px 16px;border-radius:18px;font-size:11px;margin-bottom:10px;text-align:center;border:1px solid #ffd70066;box-shadow:0 10px 30px rgba(0,0,0,0.45), inset 0 0 40px rgba(255,215,0,0.04);position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% -10%,rgba(255,215,0,0.16),transparent 60%);pointer-events:none"></div>
    <div style="position:relative">
        <div style="color:#ffd700;font-weight:900;font-size:9.5px;letter-spacing:2px;opacity:0.85">🏛️ HALL OF FAME</div>
        <div style="color:#fff;font-weight:900;font-size:14.5px;letter-spacing:0.3px;margin-top:4px">${esc(hof.month)} CHAMPIONS</div>
        <div style="display:flex;justify-content:center;align-items:flex-end;gap:10px;margin-top:14px;flex-wrap:wrap">
            ${rankBlock(hof.top3[1],2)}${rankBlock(hof.top3[0],1)}${rankBlock(hof.top3[2],3)}
        </div>
        <div style="height:1px;background:linear-gradient(90deg,transparent,#ffd70055,transparent);margin:14px 4px 10px"></div>
        <div style="font-size:8.5px;color:#c9d8f5;line-height:1.6">🎉 <b style="color:#ffd700">Congratulations to our champions!</b> 🎉<br>The administrators will be reaching out to you soon.</div>
    </div>
</div>`;
    }
    $('lbHOF').innerHTML=hofHtml;

    let meId=MY_UID;
    let podiumHtml=`<div style="display:grid;grid-template-columns:1fr 1.25fr 1fr;gap:8px;align-items:stretch;margin:12px 0">`;
    function podiumSlot(p, medal, big){
        if(!p)return '<div></div>';
        return `<div style="display:flex;flex-direction:column;justify-content:center;text-align:center;background:${big?'linear-gradient(180deg,rgba(255,215,0,0.28),rgba(255,215,0,0.08))':'rgba(192,192,192,0.15)'};padding:${big?'14px':'10px'} 6px;border-radius:${big?'14px':'12px'};border:${big?'1.5px solid gold':'1px solid #c0c0c0'};word-break:break-word">
            <div style="font-size:${big?26:20}px">${medal}</div>
            <div style="font-size:${big?12:11}px;font-weight:900;line-height:1.2;color:var(--text)">${esc(p.name)}${p.uid===meId?' (you)':''}</div>
            <div style="font-size:9px;margin-top:4px;color:var(--muted)">ELO ${p.elo} • ${p.wins}W/${p.losses}L</div>
        </div>`;
    }
    podiumHtml+=podiumSlot(all[1],'🥈',false)+podiumSlot(all[0],'🥇',true)+podiumSlot(all[2],'🥉',false)+'</div>';
    $('lbPodium').innerHTML=podiumHtml;

    $('lbBody').innerHTML=all.slice(0,100).map((e,idx)=>{
        let t=tierFor(e.elo);
        let matches=e.totalMatches||0;
        let wr=matches?Math.round((e.wins/matches)*100):0;
        let contribTxt = (e.avgTeamContrib!==null && e.avgTeamContrib!==undefined) ? e.avgTeamContrib+'%' : '—';
        let nameCell = e.uid===meId
            ? `${e.avatarEmoji||'🎓'} <span style="${nameColorStyle(e)}">${esc(e.name)}</span> (you)`
            : `<span style="cursor:pointer" title="Tap to add friend" onclick="sendFriendRequestByUid('${e.uid}','${esc(e.name).replace(/'/g,"")}')">${e.avatarEmoji||'🎓'} <span style="${nameColorStyle(e)}">${esc(e.name)}</span></span>`;
        return `<tr class="${e.uid===meId?'me':''}"><td>${idx+1}</td><td>${nameCell}</td><td>${e.elo}</td><td><span class="elo-tier" style="background:${t[2]}33;color:${t[2]};border:1px solid ${t[2]}">${t[3]} ${t[1]}</span></td><td>${e.wins}</td><td>${e.losses}</td><td>${wr}%</td><td>${matches}</td><td title="Average share of correct answers within this player's team battles">${contribTxt}</td></tr>`;
    }).join('') || '<tr><td colspan="9" style="text-align:center;padding:12px;color:var(--muted)">No players ranked yet this month — play a match!</td></tr>';

    checkTrophyBadge();
}
async function sendFriendRequestByUid(targetUid, targetName){
    if(targetUid===MY_UID)return;
    try{
        let already=await mdb.ref('mp_friends/'+MY_UID+'/'+targetUid).get();
        if(already.exists()){toast('You are already friends with '+targetName+'.');return;}
        let existingReq=await mdb.ref('mp_friend_requests/'+targetUid+'/'+MY_UID).get();
        if(existingReq.exists()){toast('Request already sent.');return;}
        let updates={};
        updates['mp_friend_requests/'+targetUid+'/'+MY_UID]={fromUid:MY_UID,fromUsername:ME.username,sentAt:firebase.database.ServerValue.TIMESTAMP,status:'pending'};
        updates['mp_friend_requests_sent/'+MY_UID+'/'+targetUid]={toUid:targetUid,toUsername:targetName,sentAt:firebase.database.ServerValue.TIMESTAMP,status:'pending'};
        await mdb.ref().update(updates);
        sendNotif(targetUid,'friend_request', `${ME.username} sent you a friend request.`);
        toast('Friend request sent to '+targetName+'!');
    }catch(e){toast('Could not send request right now.');console.warn(e);}
}

// ============================================================================================
// ===== TOURNAMENTS (Single Elimination + Round Robin) =======================================
// ---------------------------------------------------------------------------------------------
// HOW THE TOURNAMENT ENGINE WORKS, SCENARIO BY SCENARIO
// ---------------------------------------------------------------------------------------------
// CREATE: host picks name, format (single-elim bracket or round-robin league), solo or team
// mode, visibility (public/searchable, or private/code-only), subjects, difficulty, question
// count, seconds/question, race-mode (first correct answer auto-advances the question vs.
// waiting for everyone to answer), target player count, and a scheduled start date/time.
// REGISTRATION: anyone (public) or anyone with the code (private) can register up to the
// target count, or join as a spectator instead — either can switch to the other role any
// time before the countdown reaches zero. A live HHH:MM:SS countdown runs on the tournament
// page. The host can change the start time or cancel outright at any point during
// registration; both actions are announced in the tournament's own activity log and pushed
// as a notification to everyone registered.
// COUNTDOWN HITS ZERO: whichever registered player's browser happens to be open at that
// moment "claims" the launch (a guarded Firebase transaction ensures only one of them
// actually runs it, even if several people have the page open at once) and runs these steps:
//   1. If fewer than 2 players registered -> the tournament auto-cancels with a notice to
//      whoever did register. Toast: "need at least 2 players."
//   2. Solo format, odd number of registrants -> the most-recently-joined player is
//      automatically removed to make the field even, with an activity-log entry naming them.
//   3. Team format, uneven teams -> players are moved one at a time from the larger team to
//      the smaller one (last-joined first) until the split is even or off-by-one.
//   4. Single-elim bracket size is rounded up to the next power of 2 above however many
//      players actually made it in; empty slots are byes that auto-advance their opponent.
// LIVE PLAY: each bracket round (or round-robin pairing) spins up a real match using the
// host's original settings — nobody can edit settings once the first match of the first
// round has been created. Round winners feed forward automatically as their matches end;
// round-robin standings update live as each pairing finishes.
// REMINDERS: because this is a static page with no server, "every 6 hours" reminders only
// fire when a registered player's own browser happens to be open to check — there's no
// push notification when the app is fully closed. Each open session checks once and won't
// re-notify the same person again for 6 hours.
// SPECTATORS: can watch any live match, chat freely in the tournament's lobby chat before,
// during and after (players' in-match chat is separate and player-only), and react to plays,
// but cannot answer questions, use power-ups, or affect scoring. Anyone (host or spectator)
// can delete their own lobby-chat messages; the host can also remove any player or spectator
// outright, which is likewise logged and notified.
// ---------------------------------------------------------------------------------------------

// ============================================================================================
function openCreateTournamentModal(){ buildSubjectMini('ctSubjectMini','ct'); setCTMode('spak'); openModal('ctModal'); }

let ctMode='spak';
function setCTMode(mode){
    ctMode=mode;
    ['spak','speed'].forEach(m=>{let el=$('ctm_'+m); if(el) el.classList.toggle('on', m===mode);});
    $('ctTimeBox').style.display='block';
    $('ctTimeLbl').textContent = mode==='speed' ? 'Total Minutes' : 'Seconds/Question';
    $('ctRaceBox').style.display = mode==='spak' ? 'flex' : 'none';
}

function pushTournamentActivity(tid, text){
    mdb.ref('mp_tournaments/'+tid+'/activity').push({text, ts:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});
}

function toggleFormatInfo(){
    let box=$('formatInfoBox');
    box.style.display = box.style.display==='none' ? 'block' : 'none';
    if(box.style.display==='block') renderFormatInfoIfOpen();
}
function renderFormatInfoIfOpen(){
    let box=$('formatInfoBox'); if(box.style.display==='none')return;
    let isSE=$('ctFormat').value==='single_elim';
    let bolds=box.querySelectorAll('b');
    bolds[0].style.textDecoration = isSE ? 'underline' : 'none';
    bolds[1].style.textDecoration = isSE ? 'none' : 'underline';
}
function toggleGapInfo(){
    let box=$('gapInfoBox');
    box.style.display = box.style.display==='none' ? 'block' : 'none';
}
async function createTournament(){
    if(!ME){toast('Please wait for sign-in to finish.');return;}
    let name=$('ctName').value.trim() || (ME.username+"'s Championship");
    let format=$('ctFormat').value;
    let teamMode=$('ctTeamMode').checked;
    let visibility=$('ctVisibility').value;
    let startAtRaw=$('ctStartAt').value;
    let scheduledStart = startAtRaw ? new Date(startAtRaw).getTime() : (Date.now()+15*60000);
    if(scheduledStart < Date.now()+60000){ toast('Pick a start time at least a minute from now.'); return; }
    if(!selSubjects.ct.size){toast('Pick at least one subject.');return;}
    let gapMinutes=parseInt($('ctGapMinutes').value)||180;
    gapMinutes=Math.max(30, Math.min(1440, gapMinutes));
    let roundGapSeconds=gapMinutes*60;
    let settings={
        subjects:[...selSubjects.ct], difficulty:$('ctDiff').value, subMode:'standard',
        mode:ctMode, qcount:parseInt($('ctCount').value)||8,
        perQ: ctMode==='spak' ? (parseInt($('ctTime').value)||20) : null,
        totalMinutes: ctMode==='speed' ? (parseInt($('ctTime').value)||10) : null,
        raceMode: ctMode==='spak' ? !!$('ctRaceMode').checked : false,
        teamMode
    };
    let maxPlayers=parseInt($('ctMax').value)||8;
    let code = visibility==='private' ? genRoomCode() : null;
    let tRef=mdb.ref('mp_tournaments').push();
    let players={}; players[MY_UID]={name:ME.username, uid:MY_UID, avatarEmoji:ME.avatarEmoji||'🎓', team: teamMode?'A':null, elo:ME.elo||0};
    let tData={
        name, hostUid:MY_UID, hostName:ME.username, format, settings, maxPlayers, teamMode,
        visibility, code, scheduledStart, lastReminderAt:Date.now(), roundGapSeconds,
        status:'registration', players, bracket:null, rrMatches:null, nextMatchInfo:null,
        createdAt:firebase.database.ServerValue.TIMESTAMP
    };
    if(teamMode) tData.teamNames={A:'Team A', B:'Team B'};
    await tRef.set(tData);
    pushTournamentActivity(tRef.key, `🏅 ${ME.username} created "${name}" — starts ${new Date(scheduledStart).toLocaleString()}`);
    closeModal('ctModal');
    toast('Tournament scheduled!');
    openTournamentDetail(tRef.key);
}

function refreshTournamentsList(){
    mdb.ref('mp_tournaments').limitToLast(30).get().then(snap=>{
        let all=snap.val()||{};
        let entries=Object.entries(all).filter(([id,t])=>t.status!=='ended' && t.status!=='cancelled' && t.visibility!=='private').sort((a,b)=>(a[1].scheduledStart||0)-(b[1].scheduledStart||0));
        let el=$('tournamentsList');if(!el)return;
        if(!entries.length){el.innerHTML='<div class="empty-hint">No open public tournaments — create one, or join a private one by code!</div>';return;}
        el.innerHTML=entries.map(([id,t])=>{
            let count=Object.keys(t.players||{}).length;
            let starts = t.scheduledStart ? new Date(t.scheduledStart).toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
            return `<div class="room-card">
                <div class="room-title">🏅 ${esc(t.name)} ${t.teamMode?'👥 Team':''}</div>
                <div class="room-meta">Host: ${esc(t.hostName)} • ${esc(t.format==='single_elim'?'Single Elim':'Round Robin')} • ${subjectsWithIcons(t.settings.subjects)} • ${count}/${t.maxPlayers} • ${esc(t.status)}</div>
                <div class="room-meta">🕐 Starts ${starts}</div>
                <button class="btn btn-p btn-sm" style="margin-top:6px" onclick="openTournamentDetail('${id}')">View</button>
            </div>`;
        }).join('');
    }).catch(()=>{});
    refreshTournamentHistoryList();
}
function refreshTournamentHistoryList(){
    mdb.ref('mp_tournaments').limitToLast(60).get().then(snap=>{
        let all=snap.val()||{};
        let hidden=(ME&&ME.hiddenTournaments)||{};
        let entries=Object.entries(all).filter(([id,t])=>{
            if(t.status!=='ended')return false;
            if(hidden[id])return false;
            if(t.visibility!=='private')return true; // public: visible to everyone
            // private: only participants (players) or spectators can see it in history
            return (t.players && t.players[MY_UID]) || (t.spectators && t.spectators[MY_UID]) || t.hostUid===MY_UID;
        }).sort((a,b)=>(b[1].endedAt||0)-(a[1].endedAt||0)).slice(0,20);
        let el=$('tournamentHistoryList');if(!el)return;
        if(!entries.length){el.innerHTML='<div class="empty-hint">No finished tournaments yet.</div>';return;}
        el.innerHTML=entries.map(([id,t])=>{
            let when = t.endedAt ? new Date(t.endedAt).toLocaleDateString([], {month:'short',day:'numeric',year:'numeric'}) : '';
            return `<div class="room-card">
                <div class="room-title">🏅 ${esc(t.name)} ${t.visibility==='private'?'🔒':'🌐'}</div>
                <div class="room-meta">🏆 Winner: ${esc(t.championName||'—')} • ${esc(t.format==='single_elim'?'Single Elim':'Round Robin')} • ${when}</div>
                <div class="row" style="margin-top:6px">
                    <button class="btn-g btn-sm" style="flex:1" onclick="openTournamentDetail('${id}')">View Results &amp; Bracket</button>
                    <button class="btn-g btn-sm" style="flex:0 0 auto;color:var(--error)" title="Remove from your history" onclick="hideTournamentFromHistory('${id}')">🗑️</button>
                </div>
            </div>`;
        }).join('');
    }).catch(()=>{});
}
// Removes a finished tournament from THIS player's own history view only — it's a personal
// hide-list on their own profile, so it never deletes the shared record other participants
// (or the public list) still rely on.
async function hideTournamentFromHistory(tid){
    if(!confirm('Remove this tournament from your history? This only affects your own view.'))return;
    try{
        await mdb.ref('mp_users/'+MY_UID+'/hiddenTournaments/'+tid).set(true);
        ME.hiddenTournaments = Object.assign({}, ME.hiddenTournaments||{}, {[tid]:true});
        toast('Removed from your history.');
        refreshTournamentHistoryList();
    }catch(e){ toast('Could not remove — check your connection.'); }
}
// Bulk version of hideTournamentFromHistory — hides every tournament currently shown in
// THIS player's history view. Same personal hide-list, so it never touches the shared
// record other participants or the public list still rely on.
async function clearAllTournamentHistory(){
    if(!confirm('Clear your entire tournament history? This only affects your own view — other players keep theirs.'))return;
    try{
        let snap=await mdb.ref('mp_tournaments').limitToLast(60).get();
        let all=snap.val()||{};
        let hidden=(ME&&ME.hiddenTournaments)||{};
        let ids=Object.entries(all).filter(([id,t])=>{
            if(t.status!=='ended'||hidden[id])return false;
            if(t.visibility!=='private')return true;
            return (t.players&&t.players[MY_UID])||(t.spectators&&t.spectators[MY_UID])||t.hostUid===MY_UID;
        }).map(([id])=>id);
        if(!ids.length){toast('Nothing to clear.');return;}
        let updates={};
        ids.forEach(id=>updates['mp_users/'+MY_UID+'/hiddenTournaments/'+id]=true);
        await mdb.ref().update(updates);
        ME.hiddenTournaments=Object.assign({}, ME.hiddenTournaments||{}, ...ids.map(id=>({[id]:true})));
        toast('Tournament history cleared.');
        refreshTournamentHistoryList();
    }catch(e){ toast('Could not clear history — check your connection.'); }
}
async function joinTournamentByCode(){
    let code=($('tJoinCodeInput')&&$('tJoinCodeInput').value||'').trim().toUpperCase();
    if(!code){toast('Enter a tournament code.');return;}
    let snap=await mdb.ref('mp_tournaments').orderByChild('code').equalTo(code).get();
    let val=snap.val();
    if(!val){toast('No tournament found with that code.');return;}
    let tid=Object.keys(val)[0];
    openTournamentDetail(tid);
}

let tCountdownInterval=null;
let tRoundInfoInterval=null;
let lastTournamentSnapshot=null;
function openTournamentDetail(tid){
    currentTournamentId=tid;
    if(tournamentUnsub)tournamentUnsub();
    if(tCountdownInterval)clearInterval(tCountdownInterval);
    showScreen('tournament_detail');
    let ref=mdb.ref('mp_tournaments/'+tid);
    let cb=snap=>{
        let t=snap.val();
        if(!t){toast('Tournament not found.');showScreen('tournaments');return;}
        if(t.status==='cancelled'){toast('This tournament was cancelled by the host.');showScreen('tournaments');return;}
        lastTournamentSnapshot=t;
        renderTournamentDetail(tid, t);
        checkTournamentAutoStart(tid, t);
        checkTournamentReminder(tid, t);
        if(t.status==='active') advanceTournamentIfNeeded(tid, t);
        if(t.status==='active' && t.teamMode && t.teamMatchId) checkTeamTournamentEnd(tid, t);
    };
    ref.on('value', cb);
    tournamentUnsub=()=>ref.off('value', cb);
    attachTournamentChat(tid);
    let actRef=mdb.ref('mp_tournaments/'+tid+'/activity').limitToLast(60);
    let actCb=snap=>{
        let all=snap.val()||{};
        let ids=Object.keys(all).sort((a,b)=>(all[b].ts||0)-(all[a].ts||0));
        let box=$('tActivityLog'); if(!box)return;
        box.innerHTML=ids.map(id=>`<div style="font-size:9.5px;padding:6px 8px;background:var(--card2);border-left:2px solid var(--accent);border-radius:5px">${esc(all[id].text)}<div style="font-size:7.5px;color:var(--muted);margin-top:2px">${fmtTime(all[id].ts)}</div></div>`).join('') || '<div class="empty-hint">No activity yet.</div>';
    };
    actRef.on('value', actCb);
    let prevOff=tournamentUnsub;
    tournamentUnsub=()=>{prevOff&&prevOff();actRef.off('value',actCb);detachTournamentChat();lastTournamentSnapshot=null;};
}

function renderTournamentDetail(tid, t){
    $('tDetailTitle').textContent='🏅 '+t.name;
    let starts=t.scheduledStart?new Date(t.scheduledStart).toLocaleString():'—';
    $('tDetailMeta').innerHTML=`
        <span class="chip-mini">${esc(t.format==='single_elim'?'Single Elimination':'Round Robin')}</span>
        <span class="chip-mini">${subjectsWithIcons(t.settings.subjects)}</span>
        <span class="chip-mini">${esc(t.settings.difficulty)}</span>
        <span class="chip-mini">${esc(t.settings.mode)}${t.settings.raceMode?' ⚡Race':''}</span>
        <span class="chip-mini">${t.teamMode?'👥 Team Tournament':'Individual'}</span>
        <span class="chip-mini">Status: ${esc(t.status)}</span>
        <span class="chip-mini">🕐 ${starts}</span>`;

    let isHost=t.hostUid===MY_UID;
    let isRegistered=!!(t.players&&t.players[MY_UID]);
    $('tCodeBox').style.display = (t.visibility==='private' && t.code) ? 'block' : 'none';
    if(t.code) $('tCodeVal').textContent=t.code;

    let players=Object.values(t.players||{});
    $('tPlayerCount').textContent=`(${players.length}/${t.maxPlayers})`;

    // ---- countdown ----
    if(tCountdownInterval)clearInterval(tCountdownInterval);
    if(tRoundInfoInterval)clearInterval(tRoundInfoInterval);
    if(t.status==='registration' && t.scheduledStart){
        $('tCountdownBox').style.display='block';
        let tick=()=>{
            let ms=t.scheduledStart-Date.now();
            if(ms<=0){ $('tCountdownVal').textContent='000:00:00'; $('tCountdownLabel').textContent='TOURNAMENT BEGINS TODAY'; return; }
            let hrs=Math.floor(ms/3600000), min=Math.floor((ms%3600000)/60000), sec=Math.floor((ms%60000)/1000);
            $('tCountdownVal').textContent=`${String(hrs).padStart(3,'0')}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
            $('tCountdownLabel').textContent='TOURNAMENT BEGINS IN';
        };
        tick(); tCountdownInterval=setInterval(tick,1000);
    }else{
        $('tCountdownBox').style.display='none';
    }
    if(t.status==='active' && t.nextMatchInfo){
        $('tRoundInfoBox').style.display='block';
        $('tRoundInfoText').textContent=t.nextMatchInfo.text;
        let deadline=t.nextMatchInfo.deadline||t.roundDeadline;
        let tick2=()=>{
            let ms=deadline-Date.now();
            if(ms<=0){ $('tRoundInfoCountdown').textContent='000:00:00'; return; }
            let hrs=Math.floor(ms/3600000), min=Math.floor((ms%3600000)/60000), sec=Math.floor((ms%60000)/1000);
            $('tRoundInfoCountdown').textContent=`${String(hrs).padStart(3,'0')}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
        };
        tick2(); tRoundInfoInterval=setInterval(tick2,1000);
    }else{
        $('tRoundInfoBox').style.display='none';
    }

    // ---- registration / host controls ----
    let specs=Object.values(t.spectators||{});
    let isSpecing=!!(t.spectators && t.spectators[MY_UID]);
    let myLiveMatch = findMyLiveTournamentMatch(t);
    let alertCard=$('tMyMatchAlert');
    if(myLiveMatch){
        alertCard.style.display='block';
        $('tMyMatchOpponent').textContent = myLiveMatch.oppLabel ? ('vs '+myLiveMatch.oppLabel) : 'Team battle';
    }else{
        alertCard.style.display='none';
    }
    if(t.status==='registration'){
        $('tDetailRegisterCard').style.display='block';
        $('tRegisterBtn').style.display = (!isRegistered && !isSpecing && !t.teamMode) ? 'block' : 'none';
        $('tTeamPickBox').style.display = (!isRegistered && !isSpecing && t.teamMode) ? 'block' : 'none';
        $('tUnregisterBtn').style.display = isRegistered ? 'block' : 'none';
        $('tSwitchToSpecBtn').style.display = isRegistered ? 'block' : 'none';
        $('tJoinSpecBtn').style.display = (!isRegistered && !isSpecing) ? 'block' : 'none';
        $('tSwitchToPlayerBtn').style.display = isSpecing ? 'block' : 'none';
        $('tLeaveSpecBtn').style.display = isSpecing ? 'block' : 'none';
        $('tSpectateBtn').style.display='none';
        $('tHostControls').style.display = isHost ? 'block' : 'none';
        $('tHostTimeRow').style.display = 'flex';
        if(t.teamNames){ $('tTeamAName').textContent=t.teamNames.A; $('tTeamBName').textContent=t.teamNames.B; }
    }else{
        $('tDetailRegisterCard').style.display = isHost ? 'block' : 'none';
        $('tRegisterBtn').style.display='none'; $('tTeamPickBox').style.display='none'; $('tUnregisterBtn').style.display='none';
        $('tSwitchToSpecBtn').style.display='none'; $('tJoinSpecBtn').style.display='none'; $('tSwitchToPlayerBtn').style.display='none'; $('tLeaveSpecBtn').style.display='none';
        $('tSpectateBtn').style.display = (!isRegistered && t.status==='active') ? 'block' : 'none';
        // Host keeps the ability to cancel for as long as the tournament is still live
        // (active) — only the "change start time" row is registration-only, since a start
        // time is meaningless once matches are already running.
        $('tHostControls').style.display = (isHost && t.status==='active') ? 'block' : 'none';
        $('tHostTimeRow').style.display = 'none';
    }
    $('tSpectatorsCardWrap').style.display = specs.length ? 'block' : 'none';
    $('tSpecCount').textContent = specs.length ? `(${specs.length})` : '';
    $('tDetailSpectators').innerHTML = specs.map(s=>`<div class="friend-row"><div class="fav">${s.avatarEmoji||'👁'}</div><div class="friend-name">${tierFor(s.elo||0)[3]} ${esc(s.name)}${isHost?` <span style="cursor:pointer;color:var(--error)" onclick="hostRemoveTournamentSpectator('${s.uid}')">✖</span>`:''}</div></div>`).join('') || '';

    // ---- player list (team split or flat) ----
    if(t.teamMode){
        $('tTeamsWrap').style.display='block'; $('tDetailPlayers').style.display='none';
        let tn=t.teamNames||{A:'Team A',B:'Team B'};
        $('tTeamALabel').textContent=tn.A; $('tTeamBLabel').textContent=tn.B;
        let pa=players.filter(p=>p.team==='A'), pb=players.filter(p=>p.team==='B');
        $('tDetailPlayersA').innerHTML=pa.map(p=>`<div class="friend-row"><div class="fav">${p.avatarEmoji||'🎓'}</div><div class="friend-name">${tierFor(p.elo||0)[3]} ${esc(p.name)}${p.uid===t.hostUid?' 👑':''}${isHost&&t.status==='registration'?` <span style="cursor:pointer;color:var(--error)" onclick="hostRemoveTournamentPlayer('${p.uid}')">✖</span>`:''}</div></div>`).join('') || '<div class="empty-hint">Empty</div>';
        $('tDetailPlayersB').innerHTML=pb.map(p=>`<div class="friend-row"><div class="fav">${p.avatarEmoji||'🎓'}</div><div class="friend-name">${tierFor(p.elo||0)[3]} ${esc(p.name)}${p.uid===t.hostUid?' 👑':''}${isHost&&t.status==='registration'?` <span style="cursor:pointer;color:var(--error)" onclick="hostRemoveTournamentPlayer('${p.uid}')">✖</span>`:''}</div></div>`).join('') || '<div class="empty-hint">Empty</div>';
    }else{
        $('tTeamsWrap').style.display='none'; $('tDetailPlayers').style.display='block';
        $('tDetailPlayers').innerHTML=players.map(p=>`<div class="friend-row"><div class="fav">${p.avatarEmoji||'🎓'}</div><div class="friend-name">${tierFor(p.elo||0)[3]} ${esc(p.name)} ${p.uid===t.hostUid?'👑':''}${isHost&&t.status==='registration'&&p.uid!==t.hostUid?` <span style="cursor:pointer;color:var(--error)" onclick="hostRemoveTournamentPlayer('${p.uid}')">✖</span>`:''}</div></div>`).join('') || '<div class="empty-hint">No one registered yet.</div>';
    }

    $('tBracketCard').style.display = (t.format==='single_elim' && t.bracket) ? 'block' : 'none';
    $('tRRCard').style.display = (t.format==='round_robin' && t.rrMatches) ? 'block' : 'none';
    if(t.format==='single_elim' && t.bracket) renderBracket(t);
    if(t.format==='round_robin' && t.rrMatches) renderRRTable(t);
    let shareCard=$('tShareResultCard');
    if(shareCard){
        shareCard.style.display = t.status==='ended' ? 'block' : 'none';
        if(t.status==='ended'){
            lastTournamentResultData={
                name:t.name, format:t.format,
                championName:t.championName||null, championAvatar:(t.championUid&&t.players[t.championUid])?t.players[t.championUid].avatarEmoji:'🏆',
                players: players.map(p=>({uid:p.uid, name:p.name, avatarEmoji:p.avatarEmoji||'🎓', isChamp:p.uid===t.championUid})),
                subjects:(t.settings&&t.settings.subjects)||[], mode:t.settings&&t.settings.mode,
                hostName:t.hostName||null,
                rounds: t.format==='single_elim' ? Math.max(1,Math.ceil(Math.log2(Math.max(2,players.length)))) : null
            };
            if(!t.teamMode) enrichTournamentResultsWithRecords(tid, t);
            else enrichTeamTournamentResults(tid, t);
        }
    }
}

// Walks the finished bracket/round-robin data and builds each player's record for this
// tournament: wins, losses, and exactly who they beat/lost to — this is what "arranged" results
// (record + tier + opponents) are computed from, for both the in-app list and the share image.
// Team-mode results: score per team, plus each individual player's contribution — this is
// the "legendary results" data the share image and in-app list both read from.
let tTeamRecordsFetchedFor=null;
async function enrichTeamTournamentResults(tid, t){
    if(tTeamRecordsFetchedFor===tid) return;
    tTeamRecordsFetchedFor=tid;
    try{
        let msnap=await mdb.ref('mp_matches/'+t.teamMatchId).get();
        let m=msnap.val();
        if(!m) return;
        let tn=t.teamNames||{A:'Team A',B:'Team B'};
        let teamA=[], teamB=[];
        Object.entries(m.players||{}).forEach(([uid,p])=>{
            let entry={uid, name:p.name, avatarEmoji:p.avatarEmoji||'🎓', score:(m.scores&&m.scores[uid])||0};
            (p.team==='A'?teamA:teamB).push(entry);
        });
        teamA.sort((a,b)=>b.score-a.score); teamB.sort((a,b)=>b.score-a.score);
        if(lastTournamentResultData){
            lastTournamentResultData.teamMode=true;
            lastTournamentResultData.teamAName=tn.A; lastTournamentResultData.teamBName=tn.B;
            lastTournamentResultData.teamAScore=t.finalScoreA||0; lastTournamentResultData.teamBScore=t.finalScoreB||0;
            lastTournamentResultData.teamAPlayers=teamA; lastTournamentResultData.teamBPlayers=teamB;
        }
        renderTeamResultsList(t, teamA, teamB, tn);
    }catch(e){
        tTeamRecordsFetchedFor=null;
        console.warn('[Tournament] enrichTeamTournamentResults failed, will retry:', e && e.message);
    }
}
function renderTeamResultsList(t, teamA, teamB, tn){
    let box=$('tRecordsList'); if(!box) return;
    let scoreA=t.finalScoreA||0, scoreB=t.finalScoreB||0;
    let winA=scoreA>scoreB, winB=scoreB>scoreA;
    let col=(name,list,score,won)=>`<div style="flex:1;min-width:150px;background:var(--card2);border:1px solid ${won?'#ffd700':'var(--border2)'};border-radius:12px;padding:10px">
        <div style="font-weight:900;font-size:12px;${won?'color:#ffd700':''}">${won?'🏆 ':''}${esc(name)} — ${score}</div>
        ${list.map(p=>`<div style="display:flex;justify-content:space-between;font-size:10.5px;margin-top:6px"><span>${p.avatarEmoji} ${esc(p.name)}</span><b>${p.score}</b></div>`).join('')}
    </div>`;
    box.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap">${col(tn.A,teamA,scoreA,winA)}${col(tn.B,teamB,scoreB,winB)}</div>`;
}
// Walks the finished bracket/round-robin data and builds each player's record for this
// tournament: wins, losses, and exactly who they beat/lost to — this is what "arranged" results
// (record + tier + opponents) are computed from, for both the in-app list and the share image.
function computeTournamentRecords(t){
    let records={};
    Object.keys(t.players||{}).forEach(uid=>{ records[uid]={wins:0, losses:0, opponents:[]}; });
    let allMatches=[];
    if(t.format==='single_elim' && t.bracket) t.bracket.forEach(round=>round.forEach(m=>allMatches.push(m)));
    if(t.format==='round_robin' && t.rrMatches) t.rrMatches.forEach(m=>allMatches.push(m));
    allMatches.forEach(m=>{
        if(!m.winnerUid || m.status==='bye') return; // byes and never-played pairs don't count as a played record
        let p1=records[m.p1uid], p2=records[m.p2uid];
        if(p1 && m.p2uid){ let won=m.winnerUid===m.p1uid; p1[won?'wins':'losses']++; p1.opponents.push({name:m.p2name, result:won?'W':'L'}); }
        if(p2 && m.p1uid){ let won=m.winnerUid===m.p2uid; p2[won?'wins':'losses']++; p2.opponents.push({name:m.p1name, result:won?'W':'L'}); }
    });
    return records;
}
// Runs once per tournament (guarded), the moment it ends — fetches each participant's live
// tier so the results can show it, then updates both the share image data and the in-app list.
let tRecordsFetchedFor=null;
async function enrichTournamentResultsWithRecords(tid, t){
    if(tRecordsFetchedFor===tid) return;
    tRecordsFetchedFor=tid;
    try{
        let records=computeTournamentRecords(t);
        let uids=Object.keys(t.players||{});
        await Promise.all(uids.map(async uid=>{
            try{
                let s=await mdb.ref('mp_users/'+uid+'/elo').get();
                let elo=s.exists()?s.val():0, tier=tierFor(elo);
                records[uid].elo=elo; records[uid].tierName=tier[1]; records[uid].tierEmoji=tier[3];
            }catch(e){ records[uid].elo=0; records[uid].tierName='Unranked'; records[uid].tierEmoji='🎓'; }
        }));
        if(lastTournamentResultData && lastTournamentResultData.players){
            lastTournamentResultData.players.forEach(p=>{
                let r=records[p.uid];
                if(r){ p.wins=r.wins; p.losses=r.losses; p.opponents=r.opponents; p.tierName=r.tierName; p.tierEmoji=r.tierEmoji; }
            });
        }
        renderTournamentResultsList(t, records);
    }catch(e){
        tRecordsFetchedFor=null; // let it retry on the next snapshot tick instead of giving up for good
        console.warn('[Tournament] enrichTournamentResultsWithRecords failed, will retry:', e && e.message);
    }
}
function renderTournamentResultsList(t, records){
    let box=$('tRecordsList'); if(!box) return;
    let rows=Object.keys(t.players||{}).map(uid=>{
        let p=t.players[uid], r=records[uid]||{wins:0,losses:0,opponents:[]};
        return {uid, name:p.name, avatarEmoji:p.avatarEmoji||'🎓', isChamp:uid===t.championUid, ...r};
    }).sort((a,b)=> (b.isChamp-a.isChamp) || (b.wins-a.wins) || (a.losses-b.losses));
    box.innerHTML = rows.map(p=>{
        let oppLine=(p.opponents||[]).map(o=>`<span style="color:${o.result==='W'?'var(--success)':'var(--danger)'}">${o.result==='W'?'def.':'lost to'} ${esc(o.name)}</span>`).join(' &nbsp;·&nbsp; ');
        return `<div style="background:var(--card2);border:1px solid ${p.isChamp?'#ffd700':'var(--border2)'};border-radius:12px;padding:9px 11px;margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <b style="font-size:12px">${p.avatarEmoji} ${esc(p.name)}${p.isChamp?' 🏆':''}</b>
                <span style="font-size:10.5px;font-weight:800;color:${p.wins>p.losses?'var(--success)':'var(--muted)'}">${p.wins}W–${p.losses}L</span>
            </div>
            <div style="font-size:9.5px;color:var(--muted);margin-top:3px">${p.tierEmoji||'🎓'} ${esc(p.tierName||'Unranked')}</div>
            ${oppLine?`<div style="font-size:9px;margin-top:5px;line-height:1.6">${oppLine}</div>`:''}
        </div>`;
    }).join('');
}
async function registerForTournament(team){
    if(!currentTournamentId)return;
    let snap=await mdb.ref('mp_tournaments/'+currentTournamentId).get();
    let t=snap.val();if(!t)return;
    if(t.status!=='registration'){toast('Registration is closed.');return;}
    if(Object.keys(t.players||{}).length>=t.maxPlayers){toast('Tournament is full.');return;}
    await mdb.ref('mp_tournaments/'+currentTournamentId+'/players/'+MY_UID).set({name:ME.username, uid:MY_UID, avatarEmoji:ME.avatarEmoji||'🎓', team: team||null, joinedAt:Date.now()});
    pushTournamentActivity(currentTournamentId, `✅ ${ME.username} registered${team?' for '+(t.teamNames?t.teamNames[team]:'Team '+team):''}.`);
    toast('Registered! Waiting for the tournament to begin.');
}
async function leaveTournamentReg(){
    if(!currentTournamentId)return;
    await mdb.ref('mp_tournaments/'+currentTournamentId+'/players/'+MY_UID).remove();
    pushTournamentActivity(currentTournamentId, `🚪 ${ME.username} left the tournament.`);
    toast('You left the tournament.');
}
// ---- Spectator <-> Player switching (registration phase) ------------------------------------
async function joinTournamentAsSpectator(){
    if(!currentTournamentId)return;
    await mdb.ref('mp_tournaments/'+currentTournamentId+'/spectators/'+MY_UID).set({name:ME.username, uid:MY_UID, avatarEmoji:ME.avatarEmoji||'🎓', elo:ME.elo||0});
    pushTournamentActivity(currentTournamentId, `👁 ${ME.username} joined as a spectator.`);
    toast('You\u2019re now spectating this tournament.');
}
async function switchSpecToPlayer(team){
    if(!currentTournamentId)return;
    let snap=await mdb.ref('mp_tournaments/'+currentTournamentId).get();
    let t=snap.val();if(!t)return;
    if(t.status!=='registration'){toast('Registration is closed.');return;}
    if(Object.keys(t.players||{}).length>=t.maxPlayers){toast('Tournament is full.');return;}
    let updates={};
    updates['players/'+MY_UID]={name:ME.username, uid:MY_UID, avatarEmoji:ME.avatarEmoji||'🎓', team: team||null, joinedAt:Date.now(), elo:ME.elo||0};
    updates['spectators/'+MY_UID]=null;
    await mdb.ref('mp_tournaments/'+currentTournamentId).update(updates);
    pushTournamentActivity(currentTournamentId, `🔁 ${ME.username} switched from spectating to playing.`);
    toast('You\u2019re now registered to play!');
}
async function switchPlayerToSpec(){
    if(!currentTournamentId)return;
    let snap=await mdb.ref('mp_tournaments/'+currentTournamentId).get();
    let t=snap.val();if(!t || t.status!=='registration')return;
    let updates={};
    updates['players/'+MY_UID]=null;
    updates['spectators/'+MY_UID]={name:ME.username, uid:MY_UID, avatarEmoji:ME.avatarEmoji||'🎓', elo:ME.elo||0};
    await mdb.ref('mp_tournaments/'+currentTournamentId).update(updates);
    pushTournamentActivity(currentTournamentId, `🔁 ${ME.username} switched from playing to spectating.`);
    toast('Switched to spectator.');
}
async function leaveTournamentSpectating(){
    if(!currentTournamentId)return;
    await mdb.ref('mp_tournaments/'+currentTournamentId+'/spectators/'+MY_UID).remove();
    toast('Stopped spectating.');
}
async function hostRemoveTournamentSpectator(uid){
    if(!currentTournamentId)return;
    let snap=await mdb.ref('mp_tournaments/'+currentTournamentId).get();
    let t=snap.val();if(!t||t.hostUid!==MY_UID)return;
    let removed=t.spectators&&t.spectators[uid];
    if(!removed)return;
    await mdb.ref('mp_tournaments/'+currentTournamentId+'/spectators/'+uid).remove();
    pushTournamentActivity(currentTournamentId, `🚫 Host removed spectator ${removed.name}.`);
    sendNotif(uid,'system', `You were removed as a spectator from "${t.name}" by the host.`);
}
async function renameRoomTeam(team){
    if(!currentRoomId)return;
    let snap=await mdb.ref('mp_rooms/'+currentRoomId).get();
    let room=snap.val();if(!room)return;
    let isHost=room.hostUid===MY_UID;
    let onTeam=room.players && room.players[MY_UID] && room.players[MY_UID].team===team;
    if(!isHost && !onTeam){toast('Only the host or a team member can rename this team.');return;}
    let cur=(room.teamNames&&room.teamNames[team])||('Team '+team);
    let name=prompt('New name for '+cur+':', cur);
    if(!name||!name.trim())return;
    name=name.trim().slice(0,20);
    await mdb.ref('mp_rooms/'+currentRoomId+'/teamNames/'+team).set(name);
    toast('Team renamed to "'+name+'"');
}
async function renameTeam(team){
    if(!currentTournamentId)return;
    let snap=await mdb.ref('mp_tournaments/'+currentTournamentId).get();
    let t=snap.val();if(!t)return;
    let isHost=t.hostUid===MY_UID;
    let onTeam=t.players && t.players[MY_UID] && t.players[MY_UID].team===team;
    if(!isHost && !onTeam){toast('Only the host or a team member can rename this team.');return;}
    let cur=(t.teamNames&&t.teamNames[team])||('Team '+team);
    let name=prompt('New name for '+cur+':', cur);
    if(!name||!name.trim())return;
    name=name.trim().slice(0,20);
    await mdb.ref('mp_tournaments/'+currentTournamentId+'/teamNames/'+team).set(name);
    pushTournamentActivity(currentTournamentId, `✏️ ${ME.username} renamed a team to "${name}".`);
}
async function hostChangeTournamentTime(){
    if(!currentTournamentId)return;
    let raw=$('tNewStartAt').value;
    if(!raw){toast('Pick a new date/time first.');return;}
    let newTime=new Date(raw).getTime();
    if(newTime<Date.now()+60000){toast('Pick a time at least a minute from now.');return;}
    let snap=await mdb.ref('mp_tournaments/'+currentTournamentId).get();
    let t=snap.val();if(!t||t.hostUid!==MY_UID)return;
    if(t.status!=='registration'){toast('Can\u2019t change the time once the tournament has started.');return;}
    await mdb.ref('mp_tournaments/'+currentTournamentId).update({scheduledStart:newTime});
    pushTournamentActivity(currentTournamentId, `🕐 Host changed the start time to ${new Date(newTime).toLocaleString()}.`);
    toast('Start time updated.');
}
async function hostCancelTournament(){
    if(!currentTournamentId)return;
    let snap=await mdb.ref('mp_tournaments/'+currentTournamentId).get();
    let t=snap.val();if(!t||t.hostUid!==MY_UID)return;
    if(!confirm('Cancel this tournament for everyone? This cannot be undone.'))return;
    await mdb.ref('mp_tournaments/'+currentTournamentId).update({status:'cancelled', nextMatchInfo:null});
    pushTournamentActivity(currentTournamentId, `🛑 Host cancelled "${t.name}".`);
    Object.keys(t.players||{}).forEach(uid=>{ if(uid!==MY_UID) sendNotif(uid,'system', `"${t.name}" was cancelled by the host.`); });
    toast('Tournament cancelled.');
    showScreen('tournaments');
}
async function hostRemoveTournamentPlayer(uid){
    if(!currentTournamentId)return;
    let snap=await mdb.ref('mp_tournaments/'+currentTournamentId).get();
    let t=snap.val();if(!t||t.hostUid!==MY_UID)return;
    let removed=t.players&&t.players[uid];
    if(!removed)return;
    if(!confirm('Remove '+removed.name+' from this tournament?'))return;
    await mdb.ref('mp_tournaments/'+currentTournamentId+'/players/'+uid).remove();
    pushTournamentActivity(currentTournamentId, `🚫 Host removed ${removed.name} from the tournament.`);
    sendNotif(uid,'system', `You were removed from "${t.name}" by the host.`);
}
async function clearTournamentActivity(){
    if(!currentTournamentId)return;
    let snap=await mdb.ref('mp_tournaments/'+currentTournamentId).get();
    let t=snap.val();if(!t||t.hostUid!==MY_UID){toast('Only the host can clear the activity log.');return;}
    if(!confirm('Clear the whole activity log?'))return;
    await mdb.ref('mp_tournaments/'+currentTournamentId+'/activity').remove();
}

// ===== Auto-start engine: runs on every render tick while a tournament is being viewed.
// One registered player (lowest uid, deterministic) arbitrates the transition so it only
// fires once even if everyone has the page open at the same moment.
let tAutoStartLock={};
async function checkTournamentAutoStart(tid, t){
    if(t.status!=='registration' || !t.scheduledStart) return;
    if(Date.now() < t.scheduledStart) return;
    if(tAutoStartLock[tid]) return;
    let players=Object.values(t.players||{});
    let arbiter = players.length ? players.map(p=>p.uid).sort()[0] : t.hostUid;
    if(arbiter!==MY_UID) return;
    tAutoStartLock[tid]=true;
    try{
        let fresh=(await mdb.ref('mp_tournaments/'+tid).get()).val();
        if(!fresh || fresh.status!=='registration') return;
        let plist=Object.values(fresh.players||{});
        if(plist.length<2){
            // Not enough players — reschedule 24h later instead of holding an empty tournament.
            let newTime=fresh.scheduledStart+24*3600000;
            await mdb.ref('mp_tournaments/'+tid).update({scheduledStart:newTime});
            pushTournamentActivity(tid, `😴 Not enough players registered — rescheduled to ${new Date(newTime).toLocaleString()}.`);
            return;
        }
        if(fresh.teamMode){
            // Balance uneven teams by moving the most-recently-joined player(s) from the
            // bigger team to the smaller one until they're even (or off-by-one if odd total).
            let a=plist.filter(p=>p.team==='A'), b=plist.filter(p=>p.team==='B');
            while(Math.abs(a.length-b.length)>1){
                if(a.length>b.length){ let moved=a.pop(); moved.team='B'; b.push(moved); await mdb.ref(`mp_tournaments/${tid}/players/${moved.uid}/team`).set('B'); pushTournamentActivity(tid, `⚖️ ${moved.name} was moved to Team B to balance the sides.`); }
                else{ let moved=b.pop(); moved.team='A'; a.push(moved); await mdb.ref(`mp_tournaments/${tid}/players/${moved.uid}/team`).set('A'); pushTournamentActivity(tid, `⚖️ ${moved.name} was moved to Team A to balance the sides.`); }
            }
            if(a.length<1 || b.length<1){ pushTournamentActivity(tid, `😴 Not enough players on both teams — rescheduled.`); await mdb.ref('mp_tournaments/'+tid).update({scheduledStart:fresh.scheduledStart+24*3600000}); return; }
            let gapSeconds=fresh.roundGapSeconds||10800, gl=gapLabel(gapSeconds);
            let teamAName=fresh.teamNames?fresh.teamNames.A:'Team A', teamBName=fresh.teamNames?fresh.teamNames.B:'Team B';
            pushTournamentActivity(tid, `🏁 Tournament has started! ${teamAName} (${a.length}) vs ${teamBName} (${b.length}).`);
            let matchId=await beginMatchForRoom(null, fresh.settings, [...a.map(p=>({uid:p.uid,name:p.name,team:'A'})),...b.map(p=>({uid:p.uid,name:p.name,team:'B'}))], fresh.teamNames, undefined, true, fresh.hostUid);
            let roundDeadline=Date.now()+gapSeconds*1000;
            let infoText=`📢 ${teamAName} vs ${teamBName} is up now — ⏱ everyone must be ready and the host must start the match within ${gl}, or the whole tournament ends with no champion.`;
            await mdb.ref('mp_tournaments/'+tid).update({status:'active', teamMatchId:matchId, roundDeadline, nextMatchInfo:{text:infoText, deadline:roundDeadline, ts:Date.now()}});
            pushTournamentActivity(tid, infoText);
        }else{
            // Trim to an even number so the bracket/round-robin comes out clean — the
            // most-recently-joined extra player is the one let go, and they're told why.
            plist.sort((x,y)=>(x.joinedAt||0)-(y.joinedAt||0));
            if(plist.length%2!==0){
                let removed=plist.pop();
                await mdb.ref(`mp_tournaments/${tid}/players/${removed.uid}`).remove();
                pushTournamentActivity(tid, `⚠️ ${removed.name} was removed to keep the bracket even (odd number registered).`);
                sendNotif(removed.uid,'system', `You were removed from "${fresh.name}" — the bracket needed an even number of players.`);
            }
            pushTournamentActivity(tid, `🏁 Tournament has started with ${plist.length} players!`);
            currentTournamentId=tid;
            await startTournament(true);
        }
    }catch(e){ console.warn('[Tournament] auto-start failed', e); }
    finally{ tAutoStartLock[tid]=false; }
}

// ===== 6-hourly reminder — fires (at most) once per 6h window while a registered player has
// the tournament open; same lowest-uid arbitration pattern so it doesn't spam duplicates.
async function checkTournamentReminder(tid, t){
    if(t.status!=='registration' || !t.players || !t.players[MY_UID]) return;
    let last=t.lastReminderAt||t.createdAt||0;
    if(Date.now()-last < 3*3600000) return;
    let players=Object.values(t.players);
    let arbiter=players.map(p=>p.uid).sort()[0];
    if(arbiter!==MY_UID) return;
    await mdb.ref('mp_tournaments/'+tid+'/lastReminderAt').set(Date.now());
    let msLeft=t.scheduledStart-Date.now();
    let hrsLeft=Math.max(0,Math.round(msLeft/3600000));
    pushTournamentActivity(tid, `🔔 Reminder: "${t.name}" starts in about ${hrsLeft}h.`);
    players.forEach(p=>sendNotif(p.uid,'tournament_reminder', `Reminder: "${t.name}" starts in about ${hrsLeft}h — don\u2019t forget!`));
}

let tTeamEndLock={};
async function checkTeamTournamentEnd(tid, t){
    if(tTeamEndLock[tid])return;
    let players=Object.values(t.players||{});
    let arbiter = players.length ? players.map(p=>p.uid).sort()[0] : t.hostUid;
    if(arbiter!==MY_UID)return;
    tTeamEndLock[tid]=true;
    try{
        let msnap=await mdb.ref('mp_matches/'+t.teamMatchId).get();
        let m=msnap.val();
        if(m && m.state==='ended'){
            let scoreA=0, scoreB=0;
            Object.entries(m.players||{}).forEach(([uid,p])=>{ if(p.team==='A')scoreA+=(m.scores[uid]||0); if(p.team==='B')scoreB+=(m.scores[uid]||0); });
            let tn=t.teamNames||{A:'Team A',B:'Team B'};
            let winnerTeam = scoreA===scoreB ? null : (scoreA>scoreB?'A':'B');
            let champName = winnerTeam ? tn[winnerTeam] : 'Draw';
            await mdb.ref('mp_tournaments/'+tid).update({status:'ended', championName:champName, finalScoreA:scoreA, finalScoreB:scoreB, endedAt:firebase.database.ServerValue.TIMESTAMP, nextMatchInfo:null});
            pushTournamentActivity(tid, winnerTeam ? `🏆 ${champName} wins the tournament! (${scoreA} - ${scoreB})` : `🤝 Tournament ended in a draw (${scoreA} - ${scoreB}).`);
        }else if(t.roundDeadline && Date.now()>t.roundDeadline){
            await mdb.ref('mp_tournaments/'+tid).update({status:'ended', championUid:null, championName:'No one — the match wasn\u2019t finished within the time limit.', endedAt:firebase.database.ServerValue.TIMESTAMP, nextMatchInfo:null});
            pushTournamentActivity(tid, `⛔ Time limit reached before the match finished — tournament ended with no champion.`);
            players.forEach(p=>sendNotif(p.uid,'system', `"${t.name}" ended with no champion — the match wasn't completed in time.`));
        }
    }catch(e){ console.warn('[Tournament] team-end check failed', e); }
    finally{ tTeamEndLock[tid]=false; }
}
async function spectateTournamentMatch(){
    if(!currentTournamentId)return;
    let snap=await mdb.ref('mp_tournaments/'+currentTournamentId).get();
    let t=snap.val();if(!t)return;
    if(t.teamMode && t.teamMatchId){ joinExistingMatch(t.teamMatchId, null, true); return; }
    if(t.bracket){
        let lastRound=t.bracket[t.bracket.length-1];
        let live=lastRound.find(m=>m.status==='active'&&m.matchId);
        if(live){ joinExistingMatch(live.matchId, live.roomId, true); return; }
    }
    if(t.rrMatches){
        let live=t.rrMatches.find(m=>m.status==='active'&&m.matchId);
        if(live){ joinExistingMatch(live.matchId, live.roomId, true); return; }
    }
    toast('No live match to spectate right now.');
}

function findMyLiveTournamentMatch(t){
    if(!t || t.status!=='active' || !t.players || !t.players[MY_UID]) return null;
    if(t.teamMode && t.teamMatchId) return {matchId:t.teamMatchId, roomId:null, oppLabel:null};
    if(t.bracket){
        for(let round of t.bracket){
            for(let m of round){
                if(m.status==='active' && m.matchId && (m.p1uid===MY_UID || m.p2uid===MY_UID)){
                    let oppName = m.p1uid===MY_UID ? m.p2name : m.p1name;
                    return {matchId:m.matchId, roomId:m.roomId, oppLabel:oppName};
                }
            }
        }
    }
    if(t.rrMatches){
        for(let m of t.rrMatches){
            if(m.status==='active' && m.matchId && (m.p1uid===MY_UID || m.p2uid===MY_UID)){
                let oppName = m.p1uid===MY_UID ? m.p2name : m.p1name;
                return {matchId:m.matchId, roomId:m.roomId, oppLabel:oppName};
            }
        }
    }
    return null;
}
function joinMyTournamentMatch(){
    if(!currentTournamentId)return;
    mdb.ref('mp_tournaments/'+currentTournamentId).get().then(snap=>{
        let t=snap.val();
        let mine=findMyLiveTournamentMatch(t);
        if(!mine){toast('No live match found for you right now — hang tight.');return;}
        joinExistingMatch(mine.matchId, mine.roomId, false);
    });
}

function gapLabel(gapSeconds){
    if(!gapSeconds) return null;
    let h=gapSeconds/3600;
    return h>=1 ? (Number.isInteger(h)?h+'h':h.toFixed(1)+'h') : Math.round(gapSeconds/60)+'m';
}
async function createTournamentMatch(tid, tagExtra, p1, p2, settings, gapSeconds){
    let roomId=mdb.ref('mp_rooms').push().key;
    let players={};
    players[p1.uid]={name:p1.name, ready:true, team:'A', uid:p1.uid};
    players[p2.uid]={name:p2.name, ready:true, team:'B', uid:p2.uid};
    await mdb.ref('mp_rooms/'+roomId).set(Object.assign({
        hostUid:p1.uid, hostName:p1.name, type:'tournament', visibility:'private',
        settings, teamMode:false, maxPlayers:2, powerups:true,
        status:'starting', players, tournamentId:tid, createdAt:firebase.database.ServerValue.TIMESTAMP
    }, tagExtra));
    let gl=gapLabel(gapSeconds);
    if(gl) pushRoomOrMatchNote(roomId, `⏱️ Time-gap rule: both players must be ready and finish this match within ${gl} of this room opening — if it isn't, both ${p1.name} and ${p2.name} are automatically disqualified from the tournament.`);
    let matchId=await beginMatchForRoom(roomId, settings, [{uid:p1.uid,name:p1.name,team:'A'},{uid:p2.uid,name:p2.name,team:'B'}], undefined, undefined, true);
    await mdb.ref('mp_rooms/'+roomId).update({status:'in_progress', matchId});
    return {matchId, roomId};
}

async function startTournament(isAutoTrigger){
    if(!currentTournamentId)return;
    let snap=await mdb.ref('mp_tournaments/'+currentTournamentId).get();
    let t=snap.val();if(!t)return;
    if(!isAutoTrigger && t.hostUid!==MY_UID){toast('Only the host can start the tournament.');return;}
    let players=shuffleArr(Object.values(t.players||{}));
    if(players.length<2){toast('Need at least 2 registered players.');return;}
    let btn=$('tStartBtn'); if(btn){btn.disabled=true;btn.textContent='Setting up matches…';}
    let gapSeconds=t.roundGapSeconds||10800;
    let gl=gapLabel(gapSeconds);
    try{
        if(t.format==='single_elim'){
            let size=1;while(size<players.length)size*=2;
let byes=size-players.length;
let round0=[], pi=0;
for(let pairIdx=0; pairIdx<size/2; pairIdx++){
    if(pairIdx<byes){
        let p=players[pi++];
        round0.push({p1uid:p.uid,p1name:p.name,p2uid:null,p2name:'BYE',matchId:null,roomId:null,status:'bye',winnerUid:p.uid});
    }else{
        let p1=players[pi++], p2=players[pi++];
        let {matchId,roomId}=await createTournamentMatch(currentTournamentId, {tRound:0,tIdx:round0.length}, p1, p2, t.settings, gapSeconds);
        round0.push({p1uid:p1.uid,p1name:p1.name,p2uid:p2.uid,p2name:p2.name,matchId,roomId,status:'active',winnerUid:null});
    }
}
            let roundDeadline=Date.now()+gapSeconds*1000;
            let pairText=round0.filter(m=>m.status==='active').map(m=>`${m.p1name} vs ${m.p2name}`).join(', ');
            let infoText=`📢 Round 1 is up now: ${pairText} — ⏱ both players in each pair must be ready and finish within ${gl} or that pair is disqualified.`;
            await mdb.ref('mp_tournaments/'+currentTournamentId).update({status:'active', bracket:[round0], roundDeadline, nextMatchInfo:{text:infoText, deadline:roundDeadline, ts:Date.now()}});
            pushTournamentActivity(currentTournamentId, infoText);
        }else{
            let rrMatches=[];
            for(let i=0;i<players.length;i++){
                for(let j=i+1;j<players.length;j++){
                    let p1=players[i], p2=players[j];
                    let {matchId,roomId}=await createTournamentMatch(currentTournamentId, {tPair:rrMatches.length}, p1, p2, t.settings, gapSeconds);
                    rrMatches.push({p1uid:p1.uid,p1name:p1.name,p2uid:p2.uid,p2name:p2.name,matchId,roomId,status:'active',winnerUid:null});
                }
            }
            let roundDeadline=Date.now()+gapSeconds*1000;
            let infoText=`📢 Tournament is up now: ${rrMatches.length} match${rrMatches.length===1?'':'es'} running in parallel — ⏱ both players in each pair must be ready and finish within ${gl} or that pair is disqualified.`;
            await mdb.ref('mp_tournaments/'+currentTournamentId).update({status:'active', rrMatches, roundDeadline, nextMatchInfo:{text:infoText, deadline:roundDeadline, ts:Date.now()}});
            pushTournamentActivity(currentTournamentId, infoText);
        }
        toast('Tournament started! Matches are live.');
    }catch(e){ console.warn(e); toast('Could not fully start tournament — try again.'); }
    if(btn){btn.disabled=false;btn.textContent='Start Tournament (Host)';}
}

let tournamentAdvanceLock={};
async function advanceTournamentIfNeeded(tid, t){
    if(t.status!=='active' || tournamentAdvanceLock[tid])return;
    tournamentAdvanceLock[tid]=true;
    try{
        if(t.format==='single_elim' && t.bracket){
            let lastIdx=t.bracket.length-1;
            let round=t.bracket[lastIdx];
            let changed=false;
            let gapSeconds=t.roundGapSeconds||10800;
            let deadlinePassed=t.roundDeadline && Date.now()>t.roundDeadline;
            for(let i=0;i<round.length;i++){
                let m=round[i];
                if(m.status==='active' && m.matchId){
                    let ms=await mdb.ref('mp_matches/'+m.matchId+'/state').get();
                    if(ms.exists() && ms.val()==='ended'){
                        let ws=await mdb.ref('mp_matches/'+m.matchId+'/winner').get();
                        let winnerUid=ws.exists()?ws.val():null;
                        if(winnerUid==='draw'||!winnerUid) winnerUid=m.p1uid; // sudden death should prevent draws for 1v1
                        let scoresSnap=await mdb.ref('mp_matches/'+m.matchId+'/scores').get();
                        let sc=scoresSnap.val()||{};
                        await mdb.ref(`mp_tournaments/${tid}/bracket/${lastIdx}/${i}`).update({status:'done', winnerUid, p1score:sc[m.p1uid]||0, p2score:sc[m.p2uid]||0});
                        round[i]={...m,status:'done',winnerUid,p1score:sc[m.p1uid]||0,p2score:sc[m.p2uid]||0};
                        changed=true;
                    }else if(deadlinePassed){
                        await mdb.ref(`mp_tournaments/${tid}/bracket/${lastIdx}/${i}`).update({status:'disqualified', winnerUid:null});
                        round[i]={...m,status:'disqualified',winnerUid:null};
                        pushTournamentActivity(tid, `⛔ ${m.p1name} and ${m.p2name} didn't finish within the time limit — both disqualified.`);
                        sendNotif(m.p1uid,'system', `You were disqualified from "${t.name}" — the match wasn't completed in time.`);
                        sendNotif(m.p2uid,'system', `You were disqualified from "${t.name}" — the match wasn't completed in time.`);
                        changed=true;
                    }
                }
            }
            let allDone=round.every(m=>m.status==='done'||m.status==='bye'||m.status==='disqualified');
            if(allDone){
                let winners=round.filter(m=>m.winnerUid).map(m=>({uid:m.winnerUid, name:m.winnerUid===m.p1uid?m.p1name:m.p2name}));
                if(winners.length===0){
                    await mdb.ref('mp_tournaments/'+tid).update({status:'ended', championUid:null, championName:'No one — every match was disqualified.', endedAt:firebase.database.ServerValue.TIMESTAMP});
                    pushTournamentActivity(tid, `🛑 Tournament ended with no champion — every match in the final round was disqualified.`);
                }else if(winners.length===1){
                    let champ=winners[0];
                    await mdb.ref('mp_tournaments/'+tid).update({status:'ended', championUid:champ.uid, championName:champ.name, endedAt:firebase.database.ServerValue.TIMESTAMP});
                    if(champ.uid===MY_UID){
                        let ach=Object.assign({}, ME.achievements||{}, {tournament_champ:true});
                        await mdb.ref('mp_users/'+MY_UID+'/achievements').set(ach);
                        ME.achievements=ach;renderProfileScreen();
                        toast('🏆 You are the Tournament Champion!');
                    }
                }else{
                    let freshSnap=await mdb.ref('mp_tournaments/'+tid+'/bracket').get();
                    let freshBracket=freshSnap.val()||t.bracket;
                    if(freshBracket.length===t.bracket.length){
                        let nextRound=[];
                        for(let i=0;i<winners.length;i+=2){
                            let p1=winners[i], p2=winners[i+1];
                            if(p1 && p2 && p1.uid && p2.uid){
                                let {matchId,roomId}=await createTournamentMatch(tid, {tRound:lastIdx+1,tIdx:nextRound.length}, p1, p2, t.settings, gapSeconds);
                                nextRound.push({p1uid:p1.uid,p1name:p1.name,p2uid:p2.uid,p2name:p2.name,matchId,roomId,status:'active',winnerUid:null});
                            }else{
                                let bye=p1&&p1.uid?p1:p2;
                                nextRound.push({p1uid:bye?bye.uid:null,p1name:bye?bye.name:'BYE',p2uid:null,p2name:'BYE',matchId:null,roomId:null,status:'bye',winnerUid:bye?bye.uid:null});
                            }
                        }
                        let newDeadline=Date.now()+gapSeconds*1000;
                        let gl=gapLabel(gapSeconds);
                        let pairText=nextRound.filter(m=>m.status==='active').map(m=>`${m.p1name} vs ${m.p2name}`).join(', ');
                        let infoText=pairText ? `📢 Next round is up now: ${pairText} — ⏱ both players in each pair must be ready and finish within ${gl} or that pair is disqualified.` : `📢 Next round: byes only, advancing automatically.`;
                        await mdb.ref('mp_tournaments/'+tid+'/bracket').set([...freshBracket, nextRound]);
                        await mdb.ref('mp_tournaments/'+tid).update({roundDeadline:newDeadline, nextMatchInfo:{text:infoText, deadline:newDeadline, ts:Date.now()}});
                        pushTournamentActivity(tid, infoText);
                    }
                }
            }
        }else if(t.format==='round_robin' && t.rrMatches){
            let arr=t.rrMatches.slice();
            let changed=false;
            let rrDeadlinePassed=t.roundDeadline && Date.now()>t.roundDeadline;
            for(let i=0;i<arr.length;i++){
                let m=arr[i];
                if(m.status==='active' && m.matchId){
                    let ms=await mdb.ref('mp_matches/'+m.matchId+'/state').get();
                    if(ms.exists() && ms.val()==='ended'){
                        let ws=await mdb.ref('mp_matches/'+m.matchId+'/winner').get();
                        let winnerUid=ws.exists()?ws.val():'draw';
                        await mdb.ref(`mp_tournaments/${tid}/rrMatches/${i}`).update({status: winnerUid==='draw'?'draw':'done', winnerUid: winnerUid==='draw'?null:winnerUid});
                        arr[i]={...m, status: winnerUid==='draw'?'draw':'done', winnerUid: winnerUid==='draw'?null:winnerUid};
                        changed=true;
                    }else if(rrDeadlinePassed){
                        await mdb.ref(`mp_tournaments/${tid}/rrMatches/${i}`).update({status:'disqualified', winnerUid:null});
                        arr[i]={...m,status:'disqualified',winnerUid:null};
                        pushTournamentActivity(tid, `⛔ ${m.p1name} and ${m.p2name} didn't finish within the time limit — both disqualified from that pairing (0 points each).`);
                        sendNotif(m.p1uid,'system', `You were disqualified from a pairing in "${t.name}" — the match wasn't completed in time.`);
                        sendNotif(m.p2uid,'system', `You were disqualified from a pairing in "${t.name}" — the match wasn't completed in time.`);
                        changed=true;
                    }
                }
            }
            let allDone=arr.every(m=>m.status==='done'||m.status==='draw'||m.status==='disqualified');
            if(allDone){
                let pts={};
                arr.forEach(m=>{
                    pts[m.p1uid]=pts[m.p1uid]||0; pts[m.p2uid]=pts[m.p2uid]||0;
                    if(m.status==='draw'){pts[m.p1uid]+=1;pts[m.p2uid]+=1;}
                    else if(m.winnerUid===m.p1uid) pts[m.p1uid]+=3; else if(m.winnerUid===m.p2uid) pts[m.p2uid]+=3;
                });
                let champUid=Object.keys(pts).sort((a,b)=>pts[b]-pts[a])[0];
                let champName=(arr.find(m=>m.p1uid===champUid)||{}).p1name || (arr.find(m=>m.p2uid===champUid)||{}).p2name || '—';
                await mdb.ref('mp_tournaments/'+tid).update({status:'ended', championUid:champUid, championName:champName, endedAt:firebase.database.ServerValue.TIMESTAMP});
                if(champUid===MY_UID){
                    let ach=Object.assign({}, ME.achievements||{}, {tournament_champ:true});
                    await mdb.ref('mp_users/'+MY_UID+'/achievements').set(ach);
                    ME.achievements=ach;renderProfileScreen();
                    toast('🏆 You are the Tournament Champion!');
                }
            }
        }
    }catch(e){ console.warn('[Tournament] advance failed', e); }
    tournamentAdvanceLock[tid]=false;
}

function roundLabel(sizeAtThisRound, totalRounds, roundIdx){
    let remaining=totalRounds-roundIdx;
    if(remaining===1)return 'Final';
    if(remaining===2)return 'Semifinal';
    if(remaining===3)return 'Quarterfinal';
    let playersInRound=Math.pow(2,remaining);
    return 'Round of '+playersInRound;
}
function renderBracket(t){
    let wrap=$('tBracketWrap');
    let players=t.players||{};
    let avatarFor=uid=>uid&&players[uid]?(players[uid].avatarEmoji||'🎓'):'❔';
    wrap.innerHTML=t.bracket.map((round,ri)=>{
        let label=roundLabel(round.length, t.bracket.length, ri);
        return `<div class="bracket-round"><div class="rlabel">${label}</div>${round.map(m=>`
            <div class="match-node ${m.status==='active'?'live':''}">
                <div class="p ${m.status==='bye'?'bye':(m.winnerUid&&m.winnerUid===m.p1uid?'win':m.winnerUid?'lose':'')}"><span class="av">${avatarFor(m.p1uid)}</span><span class="nm">${esc(m.p1name||'TBD')}</span>${m.status!=='active'&&m.status!=='bye'&&m.p1score!==undefined?`<b>${m.p1score}</b>`:''}</div>
                <div class="p ${m.status==='bye'?'bye':(m.winnerUid&&m.winnerUid===m.p2uid?'win':m.winnerUid?'lose':'')}"><span class="av">${avatarFor(m.p2uid)}</span><span class="nm">${esc(m.p2name||'TBD')}</span>${m.status!=='active'&&m.status!=='bye'&&m.p2score!==undefined?`<b>${m.p2score}</b>`:''}</div>
                ${m.status==='active'?'<div class="bracket-live-tag">🔴 LIVE — tap Spectate below</div>':''}
                ${m.status==='disqualified'?'<div class="bracket-live-tag" style="color:var(--error)">⛔ DISQUALIFIED — time limit missed</div>':''}
            </div>`).join('')}</div>`;
    }).join('');
    if(t.status==='ended' && t.championName){
        wrap.innerHTML+=`<div class="bracket-round"><div class="rlabel">🏆 Champion</div><div class="match-node champion-card">
            <div class="av">${avatarFor(t.championUid)}</div><b>${esc(t.championName)}</b></div></div>`;
    }
}
function renderRRTable(t){
    let pts={},w={},l={},d={};
    t.rrMatches.forEach(m=>{
        [m.p1uid,m.p2uid].forEach(u=>{pts[u]=pts[u]||0;w[u]=w[u]||0;l[u]=l[u]||0;d[u]=d[u]||0;});
        if(m.status==='draw'){pts[m.p1uid]+=1;pts[m.p2uid]+=1;d[m.p1uid]++;d[m.p2uid]++;}
        else if(m.status==='done'){
            if(m.winnerUid===m.p1uid){pts[m.p1uid]+=3;w[m.p1uid]++;l[m.p2uid]++;}
            else if(m.winnerUid===m.p2uid){pts[m.p2uid]+=3;w[m.p2uid]++;l[m.p1uid]++;}
        }
        // disqualified: both already zero-initialized above, no points awarded either way
    });
    let names={};t.rrMatches.forEach(m=>{names[m.p1uid]=m.p1name;names[m.p2uid]=m.p2name;});
    let uids=Object.keys(pts).sort((a,b)=>pts[b]-pts[a]);
    $('tRRTable').innerHTML=`<thead><tr><th>#</th><th>Player</th><th>W</th><th>L</th><th>D</th><th>Pts</th></tr></thead>
        <tbody>${uids.map((u,i)=>`<tr class="${u===MY_UID?'me':''}"><td>${i+1}</td><td>${esc(names[u])}${u===MY_UID?' (you)':''}</td><td>${w[u]}</td><td>${l[u]}</td><td>${d[u]}</td><td><b>${pts[u]}</b></td></tr>`).join('')}</tbody>`;
}

// ============================================================================================
// ===== BOOT SEQUENCE ========================================================================
// ============================================================================================
// Users never see technical detail here — no error codes, hostnames, or backend/console talk.
// Anything a developer needs to actually debug a connection problem goes to console.error only,
// which is invisible to a normal user unless they deliberately open devtools.
mauth.onAuthStateChanged(user=>{
    if(user){
        initAfterAuth(user.uid);
    }else{
        mauth.signInAnonymously().catch(e=>{
            console.error('[Auth] anonymous sign-in failed:', e);
            showLoadingRetry();
        });
    }
});

function showLoadingRetry(){
    let txt=$('loadingSplashText'), btn=$('loadingRetryBtn');
    if(txt) txt.textContent="Having trouble connecting — check your internet connection.";
    if(btn) btn.style.display='inline-block';
}

// If sign-in just never resolves (slow/blocked network), don't leave the screen looking frozen
// forever with no explanation — but keep the message calm and generic either way.
(function bootWatchdog(){
    let elapsed=0;
    let iv=setInterval(()=>{
        if(MY_UID){ clearInterval(iv); return; }
        elapsed+=1000;
        if(elapsed===10000){
            let txt=$('loadingSplashText');
            if(txt) txt.textContent='Still connecting… this is taking longer than usual.';
        }
        if(elapsed>=20000){
            clearInterval(iv);
            showLoadingRetry();
        }
    },1000);
})();

window.addEventListener('beforeunload', ()=>{
    if(MY_UID) mdb.ref('mp_presence/'+MY_UID).update({online:false,lastChanged:firebase.database.ServerValue.TIMESTAMP});
    if(qmSearching && MY_UID) mdb.ref('mp_matchmaking_queue/'+MY_UID).remove();
});

    
