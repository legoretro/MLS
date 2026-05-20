(function(){
  const data=window.UA_FLOWCHART_DATA;
  if(!data)return;
  let placed={};
  let selected=null;
  let checked=false;

  const app=document.getElementById('ua-flow-app');
  const chips=flattenChips();

  function flattenChips(){
    const out=[];
    data.branches.forEach(branch=>{
      branch.diseases.forEach(disease=>{
        ['urine','other'].forEach(group=>{
          (disease[group]||[]).forEach((text,idx)=>{
            out.push({
              id:`${disease.id}-${group}-${idx}`,
              text,
              disease:disease.id,
              group
            });
          });
        });
      });
    });
    return out.sort(()=>Math.random()-.5);
  }

  function esc(value){
    return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function chipById(id){
    return chips.find(chip=>chip.id===id);
  }

  function placementFor(id){
    return placed[id]||null;
  }

  function render(){
    document.documentElement.style.setProperty('--flow-color',data.color||'#c8a800');
    document.documentElement.style.setProperty('--flow-tint',data.tint||'#fff6c7');
    app.innerHTML=`
      <header class="site-header">
        <div>
          <div class="logo">MLS Interactive</div>
          <div class="logo-sub">Urinalysis renal flowchart</div>
        </div>
        <a class="mls-home-btn" href="index.html">Back to MLS Home</a>
      </header>
      <main class="ua-flow-wrap">
        <section class="ua-flow-hero">
          <div>
            <div class="ua-flow-kicker">Urinalysis</div>
            <h1>${esc(data.title)}</h1>
            <p class="ua-flow-sub">${esc(data.summary)}</p>
          </div>
          <div class="ua-flow-actions">
            <a class="ua-flow-link-btn" href="UA_Glomerular_Flowchart.html">Glomerular</a>
            <a class="ua-flow-link-btn" href="UA_Tubular_Flowchart.html">Tubular</a>
            <a class="ua-flow-link-btn" href="UA_Interstitial_Flowchart.html">Interstitial</a>
          </div>
        </section>

        <section class="ua-flow-panel">
          <div class="ua-flow-toolbar">
            <button class="ua-flow-btn primary" onclick="UAFlow.check()">Check</button>
            <button class="ua-flow-btn" onclick="UAFlow.reset()">Reset</button>
            <button class="ua-flow-btn" onclick="UAFlow.shuffle()">Shuffle chips</button>
            <div class="ua-flow-score" id="ua-flow-score"></div>
          </div>
          <div class="ua-flow-message" id="ua-flow-message">Drag each clue into the correct disease and the correct side: urine findings or serum/other.</div>
          <div class="ua-flow-canvas">
            <div class="ua-flow-map">
              <div class="ua-start-node">
                <strong>${esc(data.startTitle)}</strong>
                <span>${esc(data.startNote)}</span>
              </div>
              <div class="ua-flow-connector" aria-hidden="true"></div>
              <div class="ua-flow-branches">
                ${data.branches.map(renderBranch).join('')}
              </div>
            </div>
          </div>
        </section>

        <section class="ua-flow-bank">
          <div class="ua-bank-title">Finding chips</div>
          <div class="ua-bank-help">Use the chips below as the memory pieces. You can drag them, or click a chip and then click a drop area.</div>
          <div class="ua-chip-list" id="ua-chip-bank"></div>
        </section>
      </main>
    `;
    renderBank();
    renderPlaced();
    bindDropZones();
    updateScore();
  }

  function renderBranch(branch){
    return `
      <section class="ua-branch">
        <div class="ua-branch-title">${esc(branch.title)}</div>
        ${branch.diseases.map(renderDisease).join('')}
      </section>
    `;
  }

  function renderDisease(disease){
    return `
      <article class="ua-disease-card">
        <div>
          <div class="ua-disease-name">${esc(disease.name)}</div>
          <div class="ua-disease-note">${esc(disease.note)}</div>
        </div>
        <div class="ua-drop-pair">
          <div class="ua-drop-zone empty" data-disease="${esc(disease.id)}" data-group="urine">
            <span class="ua-drop-label">Urine findings</span>
            <div class="ua-drop-items"></div>
          </div>
          <div class="ua-drop-zone empty" data-disease="${esc(disease.id)}" data-group="other">
            <span class="ua-drop-label">Serum / other</span>
            <div class="ua-drop-items"></div>
          </div>
        </div>
      </article>
    `;
  }

  function makeChip(chip){
    const el=document.createElement('div');
    el.className='ua-chip'+(selected===chip.id?' selected':'');
    const place=placementFor(chip.id);
    if(checked&&place&&(place.disease!==chip.disease||place.group!==chip.group))el.classList.add('wrong');
    el.draggable=true;
    el.dataset.id=chip.id;
    el.textContent=chip.text;
    el.addEventListener('dragstart',ev=>{
      ev.dataTransfer.setData('text/plain',chip.id);
    });
    el.addEventListener('click',ev=>{
      ev.stopPropagation();
      if(placementFor(chip.id)){
        delete placed[chip.id];
        selected=null;
      }else{
        selected=selected===chip.id?null:chip.id;
      }
      checked=false;
      renderBank();
      renderPlaced();
      updateMessage('Drag each clue into the correct disease and the correct side: urine findings or serum/other.');
    });
    return el;
  }

  function renderBank(){
    const bank=document.getElementById('ua-chip-bank');
    if(!bank)return;
    bank.innerHTML='';
    chips.filter(chip=>!placementFor(chip.id)).forEach(chip=>bank.appendChild(makeChip(chip)));
    if(!bank.children.length){
      bank.innerHTML='<div style="color:var(--mls-text3);font:800 12px/1.4 var(--mls-mono)">All chips are placed. Check your chart.</div>';
    }
    updateScore();
  }

  function renderPlaced(){
    document.querySelectorAll('.ua-drop-zone').forEach(zone=>{
      const disease=zone.dataset.disease;
      const group=zone.dataset.group;
      const list=zone.querySelector('.ua-drop-items');
      list.innerHTML='';
      zone.classList.remove('checked','good','bad');
      const zoneChips=chips.filter(chip=>{
        const place=placementFor(chip.id);
        return place&&place.disease===disease&&place.group===group;
      });
      zone.classList.toggle('empty',!zoneChips.length);
      zoneChips.forEach(chip=>list.appendChild(makeChip(chip)));
      if(checked&&zoneChips.length){
        const good=zoneChips.every(chip=>chip.disease===disease&&chip.group===group);
        zone.classList.add('checked',good?'good':'bad');
      }
    });
    updateScore();
  }

  function bindDropZones(){
    document.querySelectorAll('.ua-drop-zone').forEach(zone=>{
      zone.addEventListener('dragover',ev=>{
        ev.preventDefault();
        zone.classList.add('over');
      });
      zone.addEventListener('dragleave',()=>zone.classList.remove('over'));
      zone.addEventListener('drop',ev=>{
        ev.preventDefault();
        zone.classList.remove('over');
        const id=ev.dataTransfer.getData('text/plain');
        placeChip(id,zone.dataset.disease,zone.dataset.group);
      });
      zone.addEventListener('click',()=>{
        if(selected)placeChip(selected,zone.dataset.disease,zone.dataset.group);
      });
    });
  }

  function placeChip(id,disease,group){
    if(!chipById(id))return;
    placed[id]={disease,group};
    selected=null;
    checked=false;
    renderBank();
    renderPlaced();
    updateMessage('Keep placing chips, then check your chart.');
  }

  function updateScore(){
    const score=document.getElementById('ua-flow-score');
    if(!score)return;
    score.textContent=`${Object.keys(placed).length}/${chips.length} placed`;
  }

  function updateMessage(text,type){
    const msg=document.getElementById('ua-flow-message');
    if(!msg)return;
    msg.className='ua-flow-message '+(type||'');
    msg.textContent=text;
  }

  function check(){
    checked=true;
    const placedIds=Object.keys(placed);
    const correct=placedIds.filter(id=>{
      const chip=chipById(id);
      const place=placementFor(id);
      return chip&&place&&chip.disease===place.disease&&chip.group===place.group;
    }).length;
    renderPlaced();
    renderBank();
    const missing=chips.length-placedIds.length;
    if(correct===chips.length){
      updateMessage('Perfect. Every finding is in the matching disease and category.','good');
    }else{
      updateMessage(`${correct}/${chips.length} chips are correct. ${missing} still need to be placed. Click a placed chip to move it back.`, 'bad');
    }
  }

  function reset(){
    placed={};
    selected=null;
    checked=false;
    renderBank();
    renderPlaced();
    updateMessage('Drag each clue into the correct disease and the correct side: urine findings or serum/other.');
  }

  function shuffle(){
    chips.sort(()=>Math.random()-.5);
    renderBank();
  }

  window.UAFlow={check,reset,shuffle};
  render();
})();
