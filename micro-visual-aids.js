/* Editable Microbiology Visual Aids pages. Layouts live in mlsboc_cases.steps. */
function microVisualEscape(value){
  return String(value==null?'':value).replace(/[&<>"']/g,function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}
function microVisualId(){
  return 'mv_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
}
function microVisualDefaultBlocks(page){
  var blocks=[
    {id:microVisualId(),type:'image',label:'Gram stain',url:'',x:7,y:19,w:41,h:32},
    {id:microVisualId(),type:'image',label:'Agar',url:'',x:52,y:19,w:41,h:32},
    {id:microVisualId(),type:'text',text:page.scenario||'',x:7,y:56,w:86,h:17,fontSize:16,color:'#243b35',background:'#ffffff'}
  ];
  imageEntryList(page.images).forEach(function(entry,index){
    var url=imageEntrySrc(entry);
    if(index<2){blocks[index].url=url;blocks[index].label=entry.caption||blocks[index].label;}
    else blocks.push({id:microVisualId(),type:'image',label:entry.caption||'Image',url:url,x:7+(index%2)*45,y:58,w:41,h:28});
  });
  return blocks;
}
function microVisualNormalizePage(page){
  var steps=page.steps;
  if(typeof steps==='string'){try{steps=JSON.parse(steps);}catch(e){steps=[];}}
  page.blocks=Array.isArray(steps)&&steps.length?steps.map(function(block){
    return Object.assign({id:microVisualId(),type:'text',x:7,y:20,w:40,h:25,text:'',label:'Image',url:'',fontSize:16,color:'#243b35',background:'#ffffff'},block);
  }):microVisualDefaultBlocks(page);
  return page;
}
async function loadMicroVisualPages(force){
  if(!force&&window._microVisualPages)return window._microVisualPages;
  var result=await sb.from('mlsboc_cases').select('id,title,scenario,case_data,steps,images,created_at')
    .eq('subject','micro_visual_aid').eq('group_label','microbiology')
    .order('created_at',{ascending:true});
  if(result.error)throw result.error;
  window._microVisualPages=(result.data||[]).map(microVisualNormalizePage);
  return window._microVisualPages;
}
function microVisualPage(){
  var pages=window._microVisualPages||[];
  appState.microVisualPage=Math.max(0,Math.min(appState.microVisualPage||0,pages.length-1));
  return pages[appState.microVisualPage];
}
function microVisualSelectedBlock(){
  var page=microVisualPage();
  return page&&page.blocks.find(function(block){return block.id===appState.microVisualSelected;});
}
function microVisualSafeUrl(url){
  return /^(https?:\/\/|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(String(url||''))?url:'';
}
function microVisualBlockHTML(block){
  var id=microVisualEscape(block.id),selected=block.id===appState.microVisualSelected?' is-selected':'';
  var style='left:'+Number(block.x||0)+'%;top:'+Number(block.y||0)+'%;width:'+Number(block.w||30)+'%;height:'+Number(block.h||20)+'%;';
  var body;
  if(block.type==='image'){
    var url=microVisualSafeUrl(block.url);
    body=url?'<img src="'+microVisualEscape(url)+'" alt="'+microVisualEscape(block.label||'Visual')+'">':
      (isAdmin?'<label class="mv-image-placeholder"><span>'+microVisualEscape(block.label||'Image')+'</span><span class="mv-slot-upload">Add image</span><input type="file" accept="image/*" onchange="microVisualImageUpload(this,\''+id+'\')"></label>':
      '<div class="mv-image-placeholder">'+microVisualEscape(block.label||'Image')+'</div>');
    body+='<div class="mv-image-label">'+microVisualEscape(block.label||'')+'</div>';
  }else{
    style+='color:'+microVisualEscape(block.color||'#243b35')+';background:'+microVisualEscape(block.background||'#ffffff')+';';
    var editable=isAdmin?' contenteditable="true" spellcheck="true" oninput="microVisualTextInput(event,\''+id+'\')"':'';
    body='<div class="mv-text-content" style="font-size:'+Math.max(10,Math.min(42,Number(block.fontSize)||16))+'px"'+editable+'>'+microVisualEscape(block.text||'')+'</div>';
  }
  var handles=isAdmin?'<button class="mv-drag-handle" type="button" title="Move" aria-label="Move element" onpointerdown="microVisualStartPointer(event,\''+id+'\',\'move\')">✥</button><button class="mv-resize-handle" type="button" title="Resize" aria-label="Resize element" onpointerdown="microVisualStartPointer(event,\''+id+'\',\'resize\')">◢</button>':'';
  return '<div class="mv-block mv-'+block.type+selected+'" data-mv-block="'+id+'" style="'+style+'" onclick="microVisualSelect(\''+id+'\')">'+body+handles+'</div>';
}
function captureMicroVisualPage(){
  if(!isAdmin)return;
  var page=microVisualPage();
  if(!page)return;
  var specimen=document.getElementById('micro-visual-specimen');
  var subtitle=document.getElementById('micro-visual-title');
  if(specimen)page.title=specimen.value;
  if(subtitle)page.case_data=subtitle.value;
  var heading=document.querySelector('.mv-page-heading h3');
  var subheading=document.querySelector('.mv-page-heading h4');
  if(heading)heading.textContent=page.title||'Untitled specimen';
  if(subheading)subheading.textContent=page.case_data||'';
  microVisualDirty();
}
function microVisualDirty(){
  var status=document.getElementById('micro-visual-status');
  if(status)status.textContent='Unsaved changes';
}
function microVisualRenderInspector(){
  var box=document.getElementById('micro-visual-element-editor'),block=microVisualSelectedBlock();
  if(!box)return;
  if(!block){box.innerHTML='';return;}
  var field=block.type==='image'?
    '<label>Image label<input value="'+microVisualEscape(block.label||'')+'" oninput="microVisualSetField(\'label\',this.value)"></label>'+
    '<label>Image<input type="file" accept="image/*" onchange="microVisualImageUpload(this,\''+microVisualEscape(block.id)+'\')"></label>':
    '<label>Text<textarea rows="5" oninput="microVisualSetField(\'text\',this.value)">'+microVisualEscape(block.text||'')+'</textarea></label>'+
    '<div class="mv-style-row"><label>Size<input type="number" min="10" max="42" value="'+Math.max(10,Math.min(42,Number(block.fontSize)||16))+'" oninput="microVisualSetField(\'fontSize\',this.value)"></label>'+
    '<label>Text color<input type="color" value="'+microVisualEscape(block.color||'#243b35')+'" oninput="microVisualSetField(\'color\',this.value)"></label>'+
    '<label>Background<input type="color" value="'+microVisualEscape(block.background||'#ffffff')+'" oninput="microVisualSetField(\'background\',this.value)"></label></div>';
  box.innerHTML='<div class="mv-inspector-title">'+(block.type==='image'?'Image':'Text')+'</div>'+field+
    '<button class="btn btn-danger btn-sm" type="button" onclick="microVisualRemoveBlock()">Remove element</button>';
}
async function renderMicroVisualAidsTab(el){
  el.innerHTML='<div class="empty">Loading Visual Aids…</div>';
  var pages=await loadMicroVisualPages();
  if(!el.isConnected||appState.subject!=='microbiology'||appState.subjectTab!=='visualAids')return;
  var page=microVisualPage(),index=appState.microVisualPage||0;
  var html=[];
  html.push('<section class="micro-visual-shell"><header><h2>Visual Aids</h2></header>');
  html.push('<div class="micro-visual-controls"><button class="btn btn-ghost btn-sm" onclick="microVisualTurn(-1)" '+(index?'':'disabled')+'>← Previous</button><strong>'+(pages.length?'Page '+(index+1)+' of '+pages.length:'No pages yet')+'</strong><button class="btn btn-ghost btn-sm" onclick="microVisualTurn(1)" '+(index<pages.length-1?'':'disabled')+'>Next →</button></div>');
  html.push('<div class="micro-visual-workspace'+(isAdmin?'':' is-readonly')+'"><article class="micro-visual-sheet" id="micro-visual-sheet">');
  if(page){
    html.push('<div class="mv-page-heading"><h3>'+microVisualEscape(page.title||'Untitled specimen')+'</h3><h4>'+microVisualEscape(page.case_data||'')+'</h4></div>');
    page.blocks.forEach(function(block){html.push(microVisualBlockHTML(block));});
    html.push('<span class="mv-page-number">'+(index+1)+'</span>');
  }
  html.push('</article>');
  if(isAdmin){
    html.push('<aside class="micro-visual-editor"><h3>Page editor</h3>');
    if(page){
      html.push('<label>Specimen name<input id="micro-visual-specimen" value="'+microVisualEscape(page.title||'')+'" oninput="captureMicroVisualPage()"></label>');
      html.push('<label>Page title<input id="micro-visual-title" value="'+microVisualEscape(page.case_data||'')+'" oninput="captureMicroVisualPage()"></label>');
      html.push('<div class="mv-add-tools"><button class="btn btn-ghost btn-sm" type="button" onclick="microVisualAddBlock(\'text\')">+ Text</button><button class="btn btn-ghost btn-sm" type="button" onclick="microVisualAddBlock(\'image\')">+ Image</button></div>');
      html.push('<div class="mv-element-list">'+page.blocks.map(function(block){return '<button type="button" data-mv-id="'+microVisualEscape(block.id)+'" class="mv-element-chip'+(block.id===appState.microVisualSelected?' active':'')+'" onclick="microVisualSelect(\''+microVisualEscape(block.id)+'\')">'+microVisualEscape(block.type==='image'?(block.label||'Image'):(block.text||'Text').slice(0,28))+'</button>';}).join('')+'</div>');
      html.push('<div id="micro-visual-element-editor"></div>');
      html.push('<div class="micro-visual-actions"><button class="btn btn-primary btn-sm" id="micro-visual-save" type="button" onclick="saveMicroVisualPage()">Save page</button><button class="btn btn-danger btn-sm" type="button" onclick="deleteMicroVisualPage()">Delete page</button></div>');
    }
    html.push('<button class="btn btn-ghost btn-sm" type="button" onclick="addMicroVisualPage()">+ Add page</button><p id="micro-visual-status" role="status"></p></aside>');
  }
  html.push('</div></section>');
  el.innerHTML=html.join('');
  microVisualRenderInspector();
}
function microVisualSelect(id){
  if(!isAdmin)return;
  appState.microVisualSelected=id;
  document.querySelectorAll('.mv-block').forEach(function(node){node.classList.toggle('is-selected',node.dataset.mvBlock===id);});
  document.querySelectorAll('.mv-element-chip').forEach(function(node){node.classList.toggle('active',node.dataset.mvId===id);});
  microVisualRenderInspector();
}
function microVisualSetField(field,value){
  if(!isAdmin)return;
  var block=microVisualSelectedBlock();if(!block)return;
  block[field]=field==='fontSize'?Math.max(10,Math.min(42,Number(value)||16)):value;
  var node=document.querySelector('.mv-block[data-mv-block="'+block.id+'"]');
  if(node){
    if(field==='text'){var content=node.querySelector('.mv-text-content');if(content&&content!==document.activeElement)content.textContent=value;}
    if(field==='fontSize'){var content=node.querySelector('.mv-text-content');if(content)content.style.fontSize=block.fontSize+'px';}
    if(field==='color')node.style.color=value;
    if(field==='background')node.style.background=value;
    if(field==='label'){var label=node.querySelector('.mv-image-label');if(label)label.textContent=value;var placeholder=node.querySelector('.mv-image-placeholder');if(placeholder)placeholder.textContent=value||'Image';}
  }
  microVisualDirty();
}
function microVisualTextInput(event,id){
  var block=microVisualPage()?.blocks.find(function(item){return item.id===id;});
  if(!block)return;
  block.text=event.currentTarget.innerText;
  appState.microVisualSelected=id;
  var field=document.querySelector('#micro-visual-element-editor textarea');
  if(field)field.value=block.text;
  microVisualDirty();
}
function microVisualAddBlock(type){
  if(!isAdmin)return;
  captureMicroVisualPage();
  var page=microVisualPage();if(!page)return;
  var offset=page.blocks.length%4;
  var block=type==='image'?
    {id:microVisualId(),type:'image',label:'Image',url:'',x:10+offset*5,y:72,w:38,h:23}:
    {id:microVisualId(),type:'text',text:'',x:10+offset*5,y:76,w:55,h:16,fontSize:16,color:'#243b35',background:'#ffffff'};
  page.blocks.push(block);appState.microVisualSelected=block.id;renderTab();
}
function microVisualRemoveBlock(){
  if(!isAdmin)return;
  var page=microVisualPage();if(!page)return;
  page.blocks=page.blocks.filter(function(block){return block.id!==appState.microVisualSelected;});
  appState.microVisualSelected=null;renderTab();
}
async function microVisualImageUpload(input,id){
  if(!isAdmin||!input.files?.length)return;
  var block=microVisualPage()?.blocks.find(function(item){return item.id===id;});
  if(!block)return;
  var status=document.getElementById('micro-visual-status');
  if(status)status.textContent='Preparing image…';
  try{
    block.url=await compressQuestionImageFile(input.files[0],1400);
    appState.microVisualSelected=id;renderTab();
  }catch(error){if(status)status.textContent='Image could not be added: '+error.message;}
}
function microVisualStartPointer(event,id,mode){
  if(!isAdmin)return;
  event.preventDefault();event.stopPropagation();
  var block=microVisualPage()?.blocks.find(function(item){return item.id===id;});
  var sheet=document.getElementById('micro-visual-sheet');
  if(!block||!sheet)return;
  appState.microVisualSelected=id;
  window._microVisualDrag={block:block,mode:mode,startX:event.clientX,startY:event.clientY,x:Number(block.x),y:Number(block.y),w:Number(block.w),h:Number(block.h),rect:sheet.getBoundingClientRect()};
  window.addEventListener('pointermove',microVisualMovePointer);
  window.addEventListener('pointerup',microVisualEndPointer,{once:true});
  window.addEventListener('pointercancel',microVisualEndPointer,{once:true});
}
function microVisualMovePointer(event){
  var drag=window._microVisualDrag;if(!drag)return;
  var dx=100*(event.clientX-drag.startX)/drag.rect.width;
  var dy=100*(event.clientY-drag.startY)/drag.rect.height;
  if(drag.mode==='resize'){
    drag.block.w=Math.max(12,Math.min(100-drag.x,Math.round((drag.w+dx)*2)/2));
    drag.block.h=Math.max(8,Math.min(100-drag.y,Math.round((drag.h+dy)*2)/2));
  }else{
    drag.block.x=Math.max(0,Math.min(100-drag.w,Math.round((drag.x+dx)*2)/2));
    drag.block.y=Math.max(0,Math.min(100-drag.h,Math.round((drag.y+dy)*2)/2));
  }
  var node=document.querySelector('.mv-block[data-mv-block="'+drag.block.id+'"]');
  if(node){node.style.left=drag.block.x+'%';node.style.top=drag.block.y+'%';node.style.width=drag.block.w+'%';node.style.height=drag.block.h+'%';}
}
function microVisualEndPointer(){
  if(!window._microVisualDrag)return;
  window._microVisualDrag=null;
  window.removeEventListener('pointermove',microVisualMovePointer);
  window.removeEventListener('pointerup',microVisualEndPointer);
  window.removeEventListener('pointercancel',microVisualEndPointer);
  microVisualSelect(appState.microVisualSelected);
  microVisualDirty();
}
function microVisualTurn(step){
  captureMicroVisualPage();
  appState.microVisualPage=Math.max(0,Math.min((appState.microVisualPage||0)+step,(window._microVisualPages||[]).length-1));
  appState.microVisualSelected=null;renderTab();
}
function addMicroVisualPage(){
  if(!isAdmin)return;
  captureMicroVisualPage();
  window._microVisualPages=window._microVisualPages||[];
  var page=microVisualNormalizePage({title:'',case_data:'',scenario:'',steps:[],images:[],created_at:new Date().toISOString()});
  window._microVisualPages.push(page);
  appState.microVisualPage=window._microVisualPages.length-1;
  appState.microVisualSelected=null;renderTab();
}
async function saveMicroVisualPage(){
  if(!isAdmin)return;
  captureMicroVisualPage();
  var page=microVisualPage(),button=document.getElementById('micro-visual-save'),status=document.getElementById('micro-visual-status');
  if(!page)return;
  if(button)button.disabled=true;
  var payload={subject:'micro_visual_aid',group_label:'microbiology',title:page.title.trim()||'Untitled specimen',
    scenario:page.scenario||'',case_data:page.case_data||'',answer:'',steps:page.blocks,images:[],is_draft:false};
  var query=page.id?sb.from('mlsboc_cases').update(payload).eq('id',page.id):sb.from('mlsboc_cases').insert(payload);
  var result=await query.select('id').single();
  if(result.error){if(status)status.textContent='Save failed: '+result.error.message;if(button)button.disabled=false;return;}
  page.id=result.data.id;page.title=payload.title;page.steps=page.blocks;page.images=[];
  if(status)status.textContent='Saved';
  if(button)button.disabled=false;
}
async function deleteMicroVisualPage(){
  if(!isAdmin)return;
  var page=microVisualPage();if(!page||!confirm('Delete this specimen page?'))return;
  if(page.id){var result=await sb.from('mlsboc_cases').delete().eq('id',page.id);if(result.error){alert('Delete failed: '+result.error.message);return;}}
  window._microVisualPages.splice(appState.microVisualPage,1);
  appState.microVisualPage=Math.max(0,appState.microVisualPage-1);
  appState.microVisualSelected=null;renderTab();
}
