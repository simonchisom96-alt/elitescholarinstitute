/* Elite Scholar Institute — Multiplayer loader
   The original multiplayer engine lives in multiplayer-core.js.
   This file keeps the existing quiz.html script path unchanged and
   makes Multiplayer immediately free after the engine finishes loading.
*/
(function(){
  const core = document.createElement('script');
  core.src = './multiplayer-core.js';
  core.onload = function(){
    window.isUnlocked = function(){ return true; };

    window.updateUI = function(){
      const multiBtn = document.getElementById('multiBtn');
      const multiSub = document.getElementById('multiSub');
      const multiTitle = document.getElementById('multiTitle');
      const multiIcon = document.getElementById('multiIcon');
      const multiArrow = document.getElementById('multiArrow');
      const unlockCard = document.getElementById('unlockCard');
      const statusPill = document.getElementById('statusPill');
      const faq = document.getElementById('faqSection');

      if(multiBtn) multiBtn.className = 'mode-btn multi';
      if(multiIcon) multiIcon.textContent = '👥';
      if(multiTitle) multiTitle.textContent = 'Multiplayer';
      if(multiSub) multiSub.textContent = 'Free • Tap to enter';
      if(multiArrow) multiArrow.textContent = '→';
      if(unlockCard) unlockCard.style.display = 'none';
      if(statusPill){
        statusPill.className = 'status-pill unlocked';
        statusPill.textContent = '👥 Multiplayer Free';
      }
      if(faq) faq.style.display = 'none';
    };

    window.handleMultiClick = function(){
      if(typeof window.enterMultiplayer === 'function') window.enterMultiplayer();
    };

    window.openWhatsApp = function(){};
    window.redeemPasscode = function(){};
    window.applyUnlockKey = function(){};

    /*
       LEADERBOARD SAFETY FIX
       The core leaderboard historically orders by stored rankScore, while the
       displayed table uses current ELO. rankScore can be stale after an ELO
       change. Firebase data is never rewritten here.
    */
    const originalOpenLB = window.openLB;
    if(typeof originalOpenLB === 'function'){
      window.openLB = async function(){
        const result = await originalOpenLB.apply(this, arguments);

        try{
          const body = document.getElementById('lbBody');
          if(!body) return result;

          const rows = Array.from(body.querySelectorAll('tr'))
            .filter(row => row.cells && row.cells.length >= 3);

          rows.sort((a,b)=>{
            const ae = parseFloat(String(a.cells[2].textContent||'').replace(/[^0-9.+-]/g,''));
            const be = parseFloat(String(b.cells[2].textContent||'').replace(/[^0-9.+-]/g,''));
            return (Number.isFinite(be)?be:-Infinity) - (Number.isFinite(ae)?ae:-Infinity);
          });

          rows.forEach((row,index)=>{
            row.cells[0].textContent=String(index+1);
            body.appendChild(row);
          });

          /* Rebuild only the visible podium from the already-rendered top-three
             table rows. This avoids trusting stale rankScore and does not touch
             Firebase or any stored player data. */
          const podium=document.getElementById('lbPodium');
          if(podium && rows.length>=3){
            const top=rows.slice(0,3);
            const makeCard=(row,rank)=>{
              const nameCell=row.cells[1];
              const elo=String(row.cells[2].textContent||'').trim();
              const medal=rank===1?'🥇':rank===2?'🥈':'🥉';
              const big=rank===1;
              return `<div style="display:flex;flex-direction:column;justify-content:center;text-align:center;background:${big?'linear-gradient(180deg,rgba(255,215,0,0.28),rgba(255,215,0,0.08))':'rgba(192,192,192,0.15)'};padding:${big?'14px':'10px'} 6px;border-radius:${big?'14px':'12px'};border:${big?'1.5px solid gold':'1px solid #c0c0c0'};word-break:break-word"><div style="font-size:${big?26:20}px">${medal}</div><div style="font-size:${big?12:11}px;font-weight:900;line-height:1.2;color:var(--text)">${nameCell.innerHTML}</div><div style="font-size:9px;margin-top:4px;color:var(--muted)">ELO ${elo}</div></div>`;
            };
            podium.innerHTML='<div style="display:grid;grid-template-columns:1fr 1.25fr 1fr;gap:8px;align-items:stretch;margin:12px 0">'+makeCard(top[1],2)+makeCard(top[0],1)+makeCard(top[2],3)+'</div>';
          }
        }catch(e){
          console.warn('[MP-LB] current-ELO reorder failed:',e);
        }

        return result;
      };
    }

    window.updateUI();
  };
  core.onerror = function(){
    console.error('[Multiplayer] core failed to load.');
  };
  document.head.appendChild(core);
})();
