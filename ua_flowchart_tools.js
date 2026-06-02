(function(){
  const data=window.UA_FLOWCHART_DATA;
  const app=document.getElementById('ua-flow-app');
  if(!data||!app)return;

  function esc(value){
    return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function renderFacts(label,items){
    if(!items||!items.length)return '';
    return `
      <div class="ua-node-facts">
        <span>${esc(label)}</span>
        <p>${items.map(esc).join(' • ')}</p>
      </div>
    `;
  }

  function renderDisease(disease){
    return `
      <article class="ua-disease-node">
        <h3>${esc(disease.name)}</h3>
        <p class="ua-disease-note">${esc(disease.note)}</p>
        ${renderFacts('Urine',disease.urine)}
        ${renderFacts('Other',disease.other)}
      </article>
    `;
  }

  function renderBranch(branch){
    const diseaseCount=Math.max(1,(branch.diseases||[]).length);
    return `
      <section class="ua-branch-flow">
        <div class="ua-branch-node">${esc(branch.title)}</div>
        <div class="ua-branch-drop" aria-hidden="true"></div>
        <div class="ua-disease-row" style="--disease-cols:${diseaseCount};grid-template-columns:repeat(${diseaseCount},170px)">
          ${branch.diseases.map(renderDisease).join('')}
        </div>
      </section>
    `;
  }

  document.documentElement.style.setProperty('--flow-color','#c8a800');
  document.documentElement.style.setProperty('--flow-tint','#fff6c7');
  app.innerHTML=`
    <header class="site-header">
      <div>
        <div class="logo">MLS Interactive</div>
        <div class="logo-sub">Urinalysis renal flowchart</div>
      </div>
      <a class="mls-home-btn" href="index.html#interactive">← Interactive Tools</a>
    </header>
    <main class="ua-flow-wrap">
      <section class="ua-flow-hero">
        <div>
          <div class="ua-flow-kicker">Urinalysis</div>
          <h1>${esc(data.title)}</h1>
          <p class="ua-flow-sub">${esc(data.summary)}</p>
        </div>
      </section>

      <section class="ua-flow-panel">
        <div class="ua-flow-canvas">
          <div class="ua-flow-chart">
            <div class="ua-start-node">
              <strong>${esc(data.startTitle)}</strong>
              <span>${esc(data.startNote)}</span>
            </div>
            <div class="ua-root-drop" aria-hidden="true"></div>
            <div class="ua-branch-row">
              ${data.branches.map(renderBranch).join('')}
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
})();
