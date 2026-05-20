(function(){
  const data=window.UA_FLOWCHART_DATA;
  const app=document.getElementById('ua-flow-app');
  if(!data||!app)return;

  function esc(value){
    return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function renderList(items){
    if(!items||!items.length)return '<div class="ua-static-empty">none listed</div>';
    return `<div class="ua-static-list">${items.map(item=>`<span>${esc(item)}</span>`).join('')}</div>`;
  }

  function renderDisease(disease){
    return `
      <article class="ua-disease-card">
        <div>
          <div class="ua-disease-name">${esc(disease.name)}</div>
          <div class="ua-disease-note">${esc(disease.note)}</div>
        </div>
        <div class="ua-static-pair">
          <div class="ua-static-box">
            <span class="ua-static-label">Urine findings</span>
            ${renderList(disease.urine)}
          </div>
          <div class="ua-static-box">
            <span class="ua-static-label">Serum / other</span>
            ${renderList(disease.other)}
          </div>
        </div>
      </article>
    `;
  }

  function renderBranch(branch){
    return `
      <section class="ua-branch">
        <div class="ua-branch-title">${esc(branch.title)}</div>
        ${branch.diseases.map(renderDisease).join('')}
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
    </main>
  `;
})();
