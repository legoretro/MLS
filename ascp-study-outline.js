/* ASCP headings provide the outline; authored notes remain in mlsboc_cases. */
function ascpStudyMeta(topic){
  try{var steps=typeof topic.steps==='string'?JSON.parse(topic.steps):topic.steps;return Array.isArray(steps)?steps.find(function(s){return s&&s.kind==='study_section';})||{}:steps||{};}catch(e){return {};}
}
function ascpStudyNorm(value){return String(value||'').replace(/^[A-Z]\.\s*/,'').replace(/\s+/g,' ').trim().toLowerCase();}
function ascpStudyNodes(subjectKey,sections,topics){
  var sheet=ASCP_SUBJECT_SHEETS[subjectKey]||{sections:[]},nodes=[],used=new Set();
  function add(node){nodes.push(node);return node;}
  function match(node){
    var row=topics.find(function(topic){var meta=ascpStudyMeta(topic);return !used.has(topic.id)&&meta.ascpNodeKey===node.key;});
    if(!row&&node.kind==='topic')row=topics.find(function(topic){return !used.has(topic.id)&&studyTopicSection(topic)===node.sectionKey&&ascpStudyNorm(topic.title)===ascpStudyNorm(node.title);});
    if(row){node.row=row;used.add(row.id);}
  }
  sheet.sections.forEach(function(section){
    var sectionKey='ascp:'+section.number,parent=add({key:sectionKey,sectionKey:sectionKey,parent:'',depth:0,title:section.number+'. '+(sections.find(function(s){return s.key===sectionKey;})?.title||section.title),kind:'section'});match(parent);
    section.topics.forEach(function(topic,ti){
      var topicNode=add({key:sectionKey+':'+ti,sectionKey:sectionKey,parent:parent.key,depth:1,title:topic.letter+'. '+topic.title,kind:'topic'});match(topicNode);
      var stack={0:topicNode};
      (topic.lines||[]).forEach(function(line,li){
        var level=Math.max(1,Math.min(3,Number(line.level)||1));
        var parentNode=stack[level-1]||topicNode;
        var node=add({key:topicNode.key+':'+li,sectionKey:sectionKey,parent:parentNode.key,depth:level+1,title:line.text,kind:'line'});
        match(node);stack[level]=node;for(var n=level+1;n<=3;n++)delete stack[n];
      });
    });
  });
  sections.filter(function(s){return !s.builtin;}).forEach(function(section){add({key:section.key,sectionKey:section.key,parent:'',depth:0,title:section.title,kind:'section'});});
  topics.filter(function(topic){return !used.has(topic.id);}).forEach(function(topic){
    var meta=ascpStudyMeta(topic),sectionKey=studyTopicSection(topic)||'unfiled';
    if(!nodes.some(function(n){return n.key===sectionKey;})){add({key:sectionKey,sectionKey:sectionKey,parent:'',depth:0,title:'Unfiled topics',kind:'section'});}
    add({key:'custom:'+topic.id,sectionKey:sectionKey,parent:meta.parentNodeKey&&nodes.some(function(n){return n.key===meta.parentNodeKey;})?meta.parentNodeKey:sectionKey,depth:1,title:topic.title,kind:'custom',row:topic});
  });
  function depth(node){if(!node.parent)return 0;var p=nodes.find(function(n){return n.key===node.parent;});return p?Math.min(6,depth(p)+1):1;}
  nodes.forEach(function(n){n.depth=depth(n);});
  var ordered=[];
  function visit(parent){nodes.filter(function(n){return n.parent===parent;}).forEach(function(n){ordered.push(n);visit(n.key);});}
  visit('');
  return ordered;
}
function ascpStudySelect(key){appState.ascpStudyNode=key;renderTab();}
async function renderAscpStudyOutlineTab(el){
  var subjectKey=appState.subject,outline=STUDY_OUTLINES[subjectKey];
  if(!outline){el.innerHTML='<div class="empty">No outline available.</div>';return;}
  el.innerHTML='<div class="empty">Loading study sections…</div>';
  var data;
  try{data=await Promise.all([loadStudySections(subjectKey),loadCustomStudyTopics(subjectKey)]);}catch(e){el.innerHTML='<div class="empty">Could not load study sections. <button onclick="renderTab()">Try again</button></div>';return;}
  if(!el.isConnected||appState.subject!==subjectKey||appState.subjectTab!=='outline')return;
  var nodes=ascpStudyNodes(subjectKey,data[0],data[1]);
  var current=nodes.find(function(n){return n.key===appState.ascpStudyNode;})||nodes[0];
  if(!current){el.innerHTML='<div class="empty">No study sections available.</div>';return;}
  appState.ascpStudyNode=current.key;
  var root=current;while(root.parent){root=nodes.find(function(n){return n.key===root.parent;})||root;if(!root.parent)break;}
  var visible=nodes.filter(function(n){return n.sectionKey===root.sectionKey;});
  var attr=function(value){return jsAttr(value);};
  var nav=nodes.filter(function(n){return n.depth===0;}).map(function(section){
    return '<section class="study-nav-section"><button class="outline-section-card study-nav-heading '+(root.key===section.key?'active':'')+'" onclick="ascpStudySelect(\''+attr(section.key)+'\')">'+esc(section.title)+'</button>'+
      (root.key===section.key?visible.filter(function(n){return n!==section;}).map(function(n){return '<button class="study-nav-topic ascp-node ascp-depth-'+Math.min(n.depth,4)+(n.key===current.key?' active':'')+'" onclick="ascpStudySelect(\''+attr(n.key)+'\')">'+esc(n.title)+'</button>';}).join(''):'')+'</section>';
  }).join('');
  var children=nodes.filter(function(n){return n.parent===current.key;});
  var note=current.row;
  var video=note?externalStudyVideoEmbedUrl(note.answer):'';
  el.innerHTML='<div class="study-outline-shell" style="--study-accent:'+homeSubjectColor(subjectKey)+'"><section class="study-outline-hero"><div><div class="study-outline-kicker">Study Outline</div><h2>'+esc(outline.title)+'</h2>'+(subjectKey==='blood_bank'?'<p class="study-revision-note">'+esc(ASCP_DONOR_ELIGIBILITY_NOTE)+'</p>':'')+'</div><div class="ascp-hero-actions"><button class="btn btn-ghost btn-sm study-guideline-button" onclick="openSubjectGuideline(\''+attr(subjectKey)+'\')">ASCP subject sheet<br><small>Updated '+esc(ASCP_GUIDELINE_DATE)+'</small></button><button class="btn btn-primary btn-sm" onclick="exportAscpStudyPdf(\''+attr(subjectKey)+'\')">Export PDF</button></div></section>'+
    '<div class="study-mobile-navigation"><label for="ascp-study-mobile">Section or subsection</label><select id="ascp-study-mobile" onchange="ascpStudySelect(this.value)">'+nodes.map(function(n){return '<option value="'+esc(n.key)+'" '+(n.key===current.key?'selected':'')+'>'+('&nbsp;&nbsp;'.repeat(Math.min(n.depth,4)))+esc(n.title)+'</option>';}).join('')+'</select></div>'+
    '<div class="study-reader-layout"><nav class="study-reader-nav" aria-label="Study sections and topics">'+(isAdmin?'<button class="btn btn-ghost btn-sm" onclick="openStudySectionEditor(\''+attr(subjectKey)+'\',\'\')">+ Add major section</button>':'')+nav+'</nav><article class="study-reader-content"><header class="study-reader-header"><div><h2 class="study-reader-section-title">'+esc(root.title)+'</h2>'+(current!==root?'<h3 class="study-reader-subsection-title">'+esc(current.title)+'</h3>':'')+'</div></header>'+
    (isAdmin?'<div class="study-reader-tools"><button class="btn btn-primary btn-sm" onclick="openAscpStudyEditor(\''+attr(subjectKey)+'\',\''+attr(current.key)+'\',false)">+ Add inner subsection</button><button class="btn btn-ghost btn-sm" onclick="openAscpStudyEditor(\''+attr(subjectKey)+'\',\''+attr(current.key)+'\',true)">Edit notes / visuals</button>'+(current.kind==='custom'?'<button class="btn btn-danger btn-sm" onclick="deleteStudyTopic(\''+attr(subjectKey)+'\',\''+attr(current.row.id)+'\')">Delete subsection</button>':'')+'</div>':'')+
    (note?.scenario?'<div class="study-authored-notes">'+studyNotesHTML(note.scenario)+'</div>':'')+(note?'<div class="study-authored-visuals">'+studyVisualsHTML(note)+'</div>':'')+(note?.case_data?'<p class="study-topic-citation">Source: '+esc(note.case_data)+'</p>':'')+(video?'<iframe class="study-topic-video" src="'+esc(video)+'" title="'+esc(current.title)+' video" allowfullscreen loading="lazy"></iframe>':'')+
    (children.length?'<div class="ascp-child-list">'+children.map(function(n){return '<button type="button" onclick="ascpStudySelect(\''+attr(n.key)+'\')">'+esc(n.title)+'</button>';}).join('')+'</div>':'')+'</article></div></div>';
}
async function openAscpStudyEditor(subjectKey,key,isEdit){
  if(!isAdmin)return;
  var data=await Promise.all([loadStudySections(subjectKey),loadCustomStudyTopics(subjectKey)]),nodes=ascpStudyNodes(subjectKey,data[0],data[1]),node=nodes.find(function(n){return n.key===key;});
  if(!node)return;
  var topic=isEdit?node.row:null;
  window._studyTopicDraft={images:imageEntryList(topic?.images).map(function(entry){return typeof entry==='string'?{url:entry,caption:''}:Object.assign({},entry);}),uploading:false};
  window._ascpStudyDraft={subjectKey:subjectKey,nodeKey:key,isEdit:isEdit,row:topic};
  var modal=document.getElementById('condition-modal'),body=document.getElementById('condition-modal-body');
  body.innerHTML='<div class="flex-center gap-8 mb-16"><h2 class="modal-title">'+(isEdit?'Edit notes':'Add inner subsection')+'</h2><button class="btn btn-ghost btn-sm ml-auto" onclick="closeStudyOutlineWindow()">✕</button></div>'+
    '<div class="form-group"><label for="ascp-study-title">Subsection title</label><input id="ascp-study-title" value="'+esc(isEdit?(topic?.title||node.title):'')+'" '+(isEdit&&node.kind!=='custom'?'readonly':'')+'></div>'+
    '<div class="form-group"><label for="study-topic-summary">Study notes</label><textarea id="study-topic-summary" rows="8">'+esc(topic?.scenario||'')+'</textarea></div>'+
    '<div class="form-group"><label for="study-topic-upload">Add visuals</label><input id="study-topic-upload" type="file" accept="image/*" multiple onchange="uploadStudyVisuals(this)"><p id="study-visual-status" role="status"></p><div id="study-topic-visuals"></div></div>'+
    '<div class="form-group"><label for="study-topic-citation">Book resource and page</label><input id="study-topic-citation" value="'+esc(topic?.case_data||'')+'"></div>'+
    '<div class="form-group"><label for="study-topic-video">Video URL</label><input id="study-topic-video" value="'+esc(topic?.answer||'')+'"></div>'+
    '<div class="flex gap-8 mt-16"><button class="btn btn-ghost" onclick="closeStudyOutlineWindow()">Cancel</button><button class="btn btn-primary" id="study-topic-save" onclick="saveAscpStudyTopic()">Save</button></div>';
  renderStudyVisualDraft();modal.classList.remove('hidden');
}
async function saveAscpStudyTopic(){
  if(!isAdmin||window._studyTopicDraft?.uploading)return;
  var draft=window._ascpStudyDraft,subjectKey=draft.subjectKey;
  var title=document.getElementById('ascp-study-title')?.value.trim();if(!title){alert('Add a subsection title.');return;}
  var sections=await loadStudySections(subjectKey),topics=await loadCustomStudyTopics(subjectKey),nodes=ascpStudyNodes(subjectKey,sections,topics),node=nodes.find(function(n){return n.key===draft.nodeKey;});if(!node)return;
  var meta={kind:'study_section',sectionId:node.sectionKey,subsection:'',ascpNodeKey:draft.isEdit&&node.kind!=='custom'?node.key:'',parentNodeKey:draft.isEdit?(ascpStudyMeta(draft.row||{}).parentNodeKey||''):node.key};
  var payload={subject:'study_outline_topic',group_label:subjectKey,title:title,scenario:document.getElementById('study-topic-summary')?.value.trim()||'',case_data:document.getElementById('study-topic-citation')?.value.trim()||'',answer:document.getElementById('study-topic-video')?.value.trim()||'',steps:JSON.stringify([meta]),images:window._studyTopicDraft?.images||[],is_draft:false};
  var result=draft.row?.id?await sb.from('mlsboc_cases').update(payload).eq('id',draft.row.id).select('id').single():await sb.from('mlsboc_cases').insert(payload).select('id').single();
  if(result.error){alert('Save failed: '+result.error.message);return;}
  await loadCustomStudyTopics(subjectKey,true);
  appState.ascpStudyNode=draft.isEdit?node.key:'custom:'+result.data.id;
  closeStudyOutlineWindow();renderTab();
}
async function exportAscpStudyPdf(subjectKey){
  if(!window.jspdf?.jsPDF){alert('PDF export is unavailable. Reload and try again.');return;}
  var data=await Promise.all([loadStudySections(subjectKey),loadCustomStudyTopics(subjectKey)]),nodes=ascpStudyNodes(subjectKey,data[0],data[1]);
  var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'pt',format:'letter'}),y=52,page=1;
  function nextPage(needed){if(y+needed>744){doc.addPage();page++;y=52;}}
  function write(value,depth,bold,size){
    doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(29,49,60);
    var x=45+Math.min(depth,4)*14,lines=doc.splitTextToSize(String(value||''),525-(x-45));
    nextPage(lines.length*(size+4)+10);doc.text(lines,x,y);y+=lines.length*(size+4)+7;
  }
  write(STUDY_OUTLINES[subjectKey].title+' — Study Outline',0,true,19);
  write('ASCP subject sheet · Updated '+ASCP_GUIDELINE_DATE,0,false,10);y+=10;
  nodes.forEach(function(node){
    write(node.title,node.depth,node.depth<2,node.depth===0?15:node.depth===1?12:10);
    if(node.row?.scenario)String(node.row.scenario).split('\n').filter(Boolean).forEach(function(line){write(line,node.depth+1,false,10);});
    if(node.row?.case_data)write('Source: '+node.row.case_data,node.depth+1,false,9);
  });
  doc.save(subjectKey+'-study-outline.pdf');
}
