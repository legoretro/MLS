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
    {id:microVisualId(),type:'image',label:'Gram stain',shape:'square',url:'',x:7,y:14,w:41,h:32},
    {id:microVisualId(),type:'image',label:'Agar',shape:'circle',url:'',x:52,y:14,w:41,h:32},
    {id:microVisualId(),type:'text',text:page.scenario||'',x:7,y:51,w:86,h:17,fontSize:16,color:'#243b35',background:'#ffffff'}
  ];
  imageEntryList(page.images).forEach(function(entry,index){
    var url=imageEntrySrc(entry);
    if(index<2){blocks[index].url=url;blocks[index].label=entry.caption||blocks[index].label;}
    else blocks.push({id:microVisualId(),type:'image',shape:'square',label:entry.caption||'Image',url:url,x:7+(index%2)*45,y:58,w:41,h:28});
  });
  return blocks;
}
function microVisualNormalizePage(page){
  var steps=page.steps;
  if(typeof steps==='string'){try{steps=JSON.parse(steps);}catch(e){steps=[];}}
  page.blocks=Array.isArray(steps)&&steps.length?steps.map(function(block){
    var clean=Object.assign({id:microVisualId(),type:'text',x:7,y:20,w:40,h:25,text:'',label:'Image',url:'',fontSize:16,color:'#243b35',background:'#ffffff'},block);
    if(clean.type==='image'){
      clean.shape=clean.shape==='circle'?'circle':(/^agar|plate$/i.test(clean.label||'')?'circle':'square');
      clean.focusX=Math.max(0,Math.min(100,Number(clean.focusX??50)));
      clean.focusY=Math.max(0,Math.min(100,Number(clean.focusY??50)));
      clean.zoom=Math.max(1,Math.min(3,Number(clean.zoom)||1));
      if(Number(clean.y)===19&&(/^(Gram stain|Agar)$/i.test(clean.label||'')))clean.y=14;
    }
    if(clean.type==='tests')clean.rows=Array.isArray(clean.rows)?clean.rows:[{test:'',result:''}];
    return clean;
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
function microVisualImageStyle(block){
  var x=Math.max(0,Math.min(100,Number(block.focusX??50))),y=Math.max(0,Math.min(100,Number(block.focusY??50))),zoom=Math.max(1,Math.min(3,Number(block.zoom)||1));
  return 'object-position:'+x+'% '+y+'%;transform:translate('+((50-x)*(zoom-1))+'%,'+((50-y)*(zoom-1))+'%) scale('+zoom+')';
}
function microVisualBlockHTML(block){
  var id=microVisualEscape(block.id),selected=block.id===appState.microVisualSelected?' is-selected':'';
  var style='left:'+Number(block.x||0)+'%;top:'+Number(block.y||0)+'%;width:'+Number(block.w||30)+'%;height:'+Number(block.h||20)+'%;';
  var body;
  if(block.type==='image'){
    var url=microVisualSafeUrl(block.url);
    body=url?'<img src="'+microVisualEscape(url)+'" alt="'+microVisualEscape(block.label||'Visual')+'" style="'+microVisualImageStyle(block)+'">':
      (isAdmin?'<label class="mv-image-placeholder"><span>'+microVisualEscape(block.label||'Image')+'</span><span class="mv-slot-upload">Add image</span><input type="file" accept="image/*" onchange="microVisualImageUpload(this,\''+id+'\')"></label>':
      '<div class="mv-image-placeholder">'+microVisualEscape(block.label||'Image')+'</div>');
    body='<div class="mv-image-media '+(block.shape==='circle'?'is-circle':'is-square')+'">'+body+'</div>';
    body+='<div class="mv-image-label">'+microVisualEscape(block.label||'')+'</div>';
    if(url&&isAdmin)body+='<button type="button" class="mv-clear-image" title="Remove image" aria-label="Remove image" onclick="event.stopPropagation();microVisualClearImage(\''+id+'\')">×</button>';
  }else if(block.type==='tests'){
    body='<div class="mv-tests-content"><strong>'+microVisualEscape(block.title||'Tests & results')+'</strong><table><thead><tr><th>Test</th><th>Result</th></tr></thead><tbody>'+(block.rows||[]).map(function(row,index){return '<tr><td data-mv-test="'+index+'">'+microVisualEscape(row.test||'')+'</td><td data-mv-result="'+index+'">'+microVisualEscape(row.result||'')+'</td></tr>';}).join('')+'</tbody></table></div>';
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
  var field;
  if(block.type==='image')field=
    '<label>Image label<input value="'+microVisualEscape(block.label||'')+'" oninput="microVisualSetField(\'label\',this.value)"></label>'+
    '<label>Image shape<select onchange="microVisualSetField(\'shape\',this.value)"><option value="square"'+(block.shape!=='circle'?' selected':'')+'>Square</option><option value="circle"'+(block.shape==='circle'?' selected':'')+'>Circle</option></select></label>'+
    '<label>Focus left / right<input type="range" min="0" max="100" value="'+Number(block.focusX??50)+'" oninput="microVisualSetField(\'focusX\',this.value)"></label>'+
    '<label>Focus up / down<input type="range" min="0" max="100" value="'+Number(block.focusY??50)+'" oninput="microVisualSetField(\'focusY\',this.value)"></label>'+
    '<label>Zoom<input type="range" min="1" max="3" step="0.05" value="'+Number(block.zoom||1)+'" oninput="microVisualSetField(\'zoom\',this.value)"></label>'+
    '<button class="btn btn-ghost btn-sm" type="button" onclick="microVisualCenterImage()">Center image</button>'+
    '<label>Image<input type="file" accept="image/*" onchange="microVisualImageUpload(this,\''+microVisualEscape(block.id)+'\')"></label>'+
    (block.url?'<button class="btn btn-ghost btn-sm" type="button" onclick="microVisualClearImage(\''+microVisualEscape(block.id)+'\')">Remove image</button>':'');
  else if(block.type==='tests')field=
    '<label>Section title<input value="'+microVisualEscape(block.title||'Tests & results')+'" oninput="microVisualSetField(\'title\',this.value)"></label>'+
    '<div class="mv-test-editor">'+(block.rows||[]).map(function(row,index){return '<div class="mv-test-editor-row"><label>Test<input value="'+microVisualEscape(row.test||'')+'" oninput="microVisualSetTestField('+index+',\'test\',this.value)"></label><label>Result<input value="'+microVisualEscape(row.result||'')+'" oninput="microVisualSetTestField('+index+',\'result\',this.value)"></label><button class="btn btn-danger btn-xs" type="button" onclick="microVisualRemoveTestRow('+index+')">Remove</button></div>';}).join('')+'</div><button class="btn btn-ghost btn-sm" type="button" onclick="microVisualAddTestRow()">+ Add test</button>';
  else field='<label>Text<textarea rows="5" oninput="microVisualSetField(\'text\',this.value)">'+microVisualEscape(block.text||'')+'</textarea></label>'+
    '<div class="mv-style-row"><label>Size<input type="number" min="10" max="42" value="'+Math.max(10,Math.min(42,Number(block.fontSize)||16))+'" oninput="microVisualSetField(\'fontSize\',this.value)"></label>'+
    '<label>Text color<input type="color" value="'+microVisualEscape(block.color||'#243b35')+'" oninput="microVisualSetField(\'color\',this.value)"></label>'+
    '<label>Background<input type="color" value="'+microVisualEscape(block.background||'#ffffff')+'" oninput="microVisualSetField(\'background\',this.value)"></label></div>';
  box.innerHTML='<div class="mv-inspector-title">'+(block.type==='image'?'Image':block.type==='tests'?'Tests & results':'Text')+'</div>'+field+
    '<button class="btn btn-danger btn-sm" type="button" onclick="microVisualRemoveBlock()">Remove block</button>';
}
async function renderMicroVisualAidsTab(el){
  el.innerHTML='<div class="empty">Loading Visual Aids…</div>';
  var pages=await loadMicroVisualPages();
  if(!el.isConnected||appState.subject!=='microbiology'||appState.subjectTab!=='visualAids')return;
  if(appState.microVisualView!=='page'){
    var sorted=pages.map(function(page,index){return {page:page,index:index};}).sort(function(a,b){return (a.page.title||'Untitled specimen').localeCompare(b.page.title||'Untitled specimen',undefined,{sensitivity:'base'});});
    el.innerHTML='<section class="micro-visual-shell"><header><h2>Visual Aids</h2></header><div class="mv-gallery-toolbar">'+
      (isAdmin?'<button class="btn btn-primary btn-sm" type="button" onclick="addMicroVisualPage()">+ Add page</button>':'')+
      (pages.length?'<button class="btn btn-ghost btn-sm" type="button" onclick="exportMicroVisualPdf()">Export PDF</button>':'')+'</div>'+
      '<div class="mv-gallery">'+sorted.map(function(item){
        var page=item.page,images=(page.blocks||[]).filter(function(block){return block.type==='image'&&microVisualSafeUrl(block.url);}).slice(0,2);
        return '<button class="mv-gallery-card" type="button" onclick="openMicroVisualPage('+item.index+')"><span class="mv-gallery-preview"><strong>'+microVisualEscape(page.title||'Untitled specimen')+'</strong><small>'+microVisualEscape(page.case_data||'')+'</small><span class="mv-gallery-line"></span><span class="mv-gallery-images">'+images.map(function(block){return '<img class="'+(block.shape==='circle'?'is-circle':'')+'" src="'+microVisualEscape(block.url)+'" alt="">';}).join('')+'</span></span><span class="mv-gallery-name">'+microVisualEscape(page.title||'Untitled specimen')+'</span></button>';
      }).join('')+'</div></section>';
    return;
  }
  var page=microVisualPage(),index=appState.microVisualPage||0;
  var html=[];
  html.push('<section class="micro-visual-shell"><header><h2>Visual Aids</h2></header>');
  html.push('<div class="micro-visual-controls"><button class="btn btn-ghost btn-sm" onclick="microVisualBack()">← All pages</button><button class="btn btn-ghost btn-sm" onclick="microVisualTurn(-1)" '+(index?'':'disabled')+'>← Previous</button><strong>'+(pages.length?'Page '+(index+1)+' of '+pages.length:'No pages yet')+'</strong><button class="btn btn-ghost btn-sm" onclick="microVisualTurn(1)" '+(index<pages.length-1?'':'disabled')+'>Next →</button>'+(pages.length?'<button class="btn btn-primary btn-sm" type="button" onclick="exportMicroVisualPdf()">Export PDF</button>':'')+'</div>');
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
      html.push('<div class="mv-add-tools"><button class="btn btn-ghost btn-sm" type="button" onclick="microVisualAddBlock(\'text\')">+ Text</button><button class="btn btn-ghost btn-sm" type="button" onclick="microVisualAddBlock(\'image\')">+ Image</button><button class="btn btn-ghost btn-sm" type="button" onclick="microVisualAddBlock(\'tests\')">+ Tests & results</button></div>');
      html.push('<div class="mv-element-list">'+page.blocks.map(function(block){return '<button type="button" data-mv-id="'+microVisualEscape(block.id)+'" class="mv-element-chip'+(block.id===appState.microVisualSelected?' active':'')+'" onclick="microVisualSelect(\''+microVisualEscape(block.id)+'\')">'+microVisualEscape(block.type==='image'?(block.label||'Image'):block.type==='tests'?(block.title||'Tests & results'):(block.text||'Text').slice(0,28))+'</button>';}).join('')+'</div>');
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
  block[field]=field==='fontSize'?Math.max(10,Math.min(42,Number(value)||16)):['focusX','focusY','zoom'].includes(field)?Number(value):value;
  var node=document.querySelector('.mv-block[data-mv-block="'+block.id+'"]');
  if(node){
    if(field==='text'){var content=node.querySelector('.mv-text-content');if(content&&content!==document.activeElement)content.textContent=value;}
    if(field==='fontSize'){var content=node.querySelector('.mv-text-content');if(content)content.style.fontSize=block.fontSize+'px';}
    if(field==='color')node.style.color=value;
    if(field==='background')node.style.background=value;
    if(field==='label'){var label=node.querySelector('.mv-image-label');if(label)label.textContent=value;var placeholder=node.querySelector('.mv-image-placeholder > span:first-child');if(placeholder)placeholder.textContent=value||'Image';}
    if(field==='shape'){var media=node.querySelector('.mv-image-media');if(media){media.classList.toggle('is-circle',value==='circle');media.classList.toggle('is-square',value!=='circle');}}
    if(['focusX','focusY','zoom'].includes(field)){var image=node.querySelector('.mv-image-media img');if(image){image.style.cssText=microVisualImageStyle(block);}}
    if(field==='title'){var heading=node.querySelector('.mv-tests-content strong');if(heading)heading.textContent=value||'Tests & results';}
  }
  microVisualDirty();
}
function microVisualCenterImage(){
  var block=microVisualSelectedBlock();if(!block||block.type!=='image')return;
  microVisualSetField('focusX',50);microVisualSetField('focusY',50);microVisualSetField('zoom',1);
  microVisualRenderInspector();
}
function microVisualSetTestField(index,field,value){
  var block=microVisualSelectedBlock();if(!isAdmin||block?.type!=='tests'||!block.rows[index])return;
  block.rows[index][field]=value;
  var cell=document.querySelector('.mv-block[data-mv-block="'+block.id+'"] [data-mv-'+(field==='test'?'test':'result')+'="'+index+'"]');
  if(cell)cell.textContent=value;
  microVisualDirty();
}
function microVisualAddTestRow(){
  var block=microVisualSelectedBlock();if(!isAdmin||block?.type!=='tests')return;
  block.rows.push({test:'',result:''});renderTab();
}
function microVisualRemoveTestRow(index){
  var block=microVisualSelectedBlock();if(!isAdmin||block?.type!=='tests')return;
  block.rows.splice(index,1);renderTab();
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
    {id:microVisualId(),type:'image',shape:'square',label:'Image',url:'',focusX:50,focusY:50,zoom:1,x:10+offset*5,y:72,w:38,h:23}:
    type==='tests'?{id:microVisualId(),type:'tests',title:'Tests & results',rows:[{test:'',result:''}],x:7,y:70,w:86,h:20}:
    {id:microVisualId(),type:'text',text:'',x:10+offset*5,y:76,w:55,h:16,fontSize:16,color:'#243b35',background:'#ffffff'};
  page.blocks.push(block);appState.microVisualSelected=block.id;renderTab();
}
async function microVisualRemoveBlock(){
  if(!isAdmin)return;
  var page=microVisualPage();if(!page)return;
  page.blocks=page.blocks.filter(function(block){return block.id!==appState.microVisualSelected;});
  appState.microVisualSelected=null;
  await renderTab();
  await saveMicroVisualPage();
}
function microVisualPrepareImage(file){
  return new Promise(function(resolve,reject){
    if(!file||!/^image\//i.test(file.type||'')){reject(new Error('Choose an image file.'));return;}
    var reader=new FileReader();
    reader.onerror=function(){reject(new Error('Could not read the image file.'));};
    reader.onload=function(){
      var image=new Image();
      image.onerror=function(){reject(new Error('This image format could not be opened. Try PNG or JPEG.'));};
      image.onload=function(){
        try{
          var max=1100,scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
          var canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
          canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
          var context=canvas.getContext('2d');
          context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
          context.drawImage(image,0,0,canvas.width,canvas.height);
          var data=canvas.toDataURL('image/jpeg',0.76);
          if(data.length>1500000){
            var smaller=document.createElement('canvas');
            smaller.width=Math.max(1,Math.round(canvas.width*0.65));
            smaller.height=Math.max(1,Math.round(canvas.height*0.65));
            var smallContext=smaller.getContext('2d');
            smallContext.fillStyle='#fff';smallContext.fillRect(0,0,smaller.width,smaller.height);
            smallContext.drawImage(canvas,0,0,smaller.width,smaller.height);
            data=smaller.toDataURL('image/jpeg',0.62);
          }
          if(data.length>1500000)throw new Error('Image is too large. Choose a smaller file.');
          resolve(data);
        }catch(error){reject(error);}
      };
      image.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function microVisualClearImage(id){
  if(!isAdmin)return;
  var block=microVisualPage()?.blocks.find(function(item){return item.id===id;});
  if(!block)return;
  block.url='';
  appState.microVisualSelected=id;
  await renderTab();
  await saveMicroVisualPage();
}
async function microVisualImageUpload(input,id){
  if(!isAdmin||!input.files?.length)return;
  var page=microVisualPage();
  var block=page?.blocks.find(function(item){return item.id===id;});
  if(!block)return;
  var status=document.getElementById('micro-visual-status');
  if(status)status.textContent='Preparing image…';
  try{
    var url=await microVisualPrepareImage(input.files[0]);
    if(microVisualPage()!==page)return;
    block.url=url;
    appState.microVisualSelected=id;
    await renderTab();
    await saveMicroVisualPage();
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
async function microVisualTurn(step){
  if(isAdmin&&await saveMicroVisualPage()===false)return;
  appState.microVisualPage=Math.max(0,Math.min((appState.microVisualPage||0)+step,(window._microVisualPages||[]).length-1));
  appState.microVisualSelected=null;renderTab();
}
function openMicroVisualPage(index){appState.microVisualPage=index;appState.microVisualSelected=null;appState.microVisualView='page';renderTab();}
async function microVisualBack(){if(isAdmin&&await saveMicroVisualPage()===false)return;appState.microVisualView='library';renderTab();}
function addMicroVisualPage(){
  if(!isAdmin)return;
  captureMicroVisualPage();
  window._microVisualPages=window._microVisualPages||[];
  var page=microVisualNormalizePage({title:'',case_data:'',scenario:'',steps:[],images:[],created_at:new Date().toISOString()});
  window._microVisualPages.push(page);
  appState.microVisualPage=window._microVisualPages.length-1;
  appState.microVisualSelected=null;appState.microVisualView='page';renderTab();
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
  var result;
  try{result=await query.select('id').single();}
  catch(error){if(status)status.textContent='Save failed: '+error.message;if(button)button.disabled=false;return false;}
  if(result.error){if(status)status.textContent='Save failed: '+result.error.message;if(button)button.disabled=false;return false;}
  page.id=result.data.id;page.title=payload.title;page.steps=page.blocks;page.images=[];
  if(status)status.textContent='Saved';
  if(button)button.disabled=false;
  return true;
}
function microVisualPdfRgb(value){
  var hex=/^#([0-9a-f]{6})$/i.exec(String(value||''));
  if(!hex)return [255,255,255];
  return [0,2,4].map(function(offset){return parseInt(hex[1].slice(offset,offset+2),16);});
}
async function exportMicroVisualPdf(){
  captureMicroVisualPage();
  var pages=window._microVisualPages||[];
  if(!pages.length)return;
  if(!window.jspdf?.jsPDF){alert('PDF export is unavailable. Reload the page and try again.');return;}
  var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'pt',format:'letter'});
  var warnings=0;
  for(var pageIndex=0;pageIndex<pages.length;pageIndex++){
    var page=pages[pageIndex];
    if(pageIndex)doc.addPage();
    doc.setFillColor(255,255,255);doc.rect(0,0,612,792,'F');
    doc.setDrawColor(55,139,120);doc.setLineWidth(1.5);doc.line(43,105,569,105);
    doc.setTextColor(23,61,52);doc.setFont('helvetica','bold');doc.setFontSize(22);
    doc.text(doc.splitTextToSize(page.title||'Untitled specimen',520).slice(0,2),43,70);
    if(page.case_data){doc.setFont('helvetica','normal');doc.setFontSize(12);doc.setTextColor(82,112,104);doc.text(doc.splitTextToSize(page.case_data,520).slice(0,1),43,92);}
    for(var block of (page.blocks||[])){
      var x=612*Number(block.x||0)/100,y=792*Number(block.y||0)/100;
      var w=612*Number(block.w||30)/100,h=792*Number(block.h||20)/100;
      if(block.type==='image'){
        doc.setDrawColor(190,211,203);doc.setLineWidth(.7);
        if(block.shape==='circle')doc.circle(x+w/2,y+(h-20)/2,Math.min(w,h-20)/2);
        else doc.rect(x,y,w,h);
        var url=microVisualSafeUrl(block.url);
        if(url){
          try{
            var source=await new Promise(function(resolve,reject){var img=new Image();img.crossOrigin='anonymous';img.onload=function(){resolve(img);};img.onerror=reject;img.src=url;});
            var imageCanvas=document.createElement('canvas'),side=400;
            imageCanvas.width=side;imageCanvas.height=side;
            var imageContext=imageCanvas.getContext('2d');
            if(block.shape==='circle'){imageContext.beginPath();imageContext.arc(side/2,side/2,side/2,0,Math.PI*2);imageContext.clip();}
            var crop=Math.min(source.naturalWidth,source.naturalHeight)/Math.max(1,Number(block.zoom)||1);
            var sx=(source.naturalWidth-crop)*Math.max(0,Math.min(100,Number(block.focusX??50)))/100;
            var sy=(source.naturalHeight-crop)*Math.max(0,Math.min(100,Number(block.focusY??50)))/100;
            imageContext.drawImage(source,sx,sy,crop,crop,0,0,side,side);
            var diameter=Math.min(w-12,h-26);
            doc.addImage(imageCanvas.toDataURL('image/png'),'PNG',x+(w-diameter)/2,y+3,diameter,diameter);
          }catch(error){warnings++;}
        }
        doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(64,92,82);
        doc.text(String(block.label||'Image').slice(0,90),x+w/2,y+h-7,{align:'center',maxWidth:w-10});
      }else if(block.type==='tests'){
        doc.setDrawColor(190,211,203);doc.setLineWidth(.7);doc.rect(x,y,w,h);
        doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(36,59,53);
        doc.text(String(block.title||'Tests & results').slice(0,100),x+8,y+16,{maxWidth:w-16});
        doc.setFillColor(232,242,238);doc.rect(x+5,y+22,w-10,19,'F');
        doc.setFontSize(9);doc.text('Test',x+10,y+35);doc.text('Result',x+w/2+5,y+35);
        (block.rows||[]).forEach(function(row,index){
          var rowY=y+53+index*24;if(rowY+17>y+h)return;
          doc.setDrawColor(210,224,218);doc.line(x+5,rowY+7,x+w-5,rowY+7);
          doc.setFont('helvetica','normal');doc.setFontSize(9);
          doc.text(doc.splitTextToSize(String(row.test||''),w/2-18).slice(0,2),x+10,rowY-3);
          doc.text(doc.splitTextToSize(String(row.result||''),w/2-18).slice(0,2),x+w/2+5,rowY-3);
        });
      }else{
        var background=microVisualPdfRgb(block.background||'#ffffff');
        doc.setFillColor(background[0],background[1],background[2]);doc.rect(x,y,w,h,'F');
        var color=microVisualPdfRgb(block.color||'#243b35');
        doc.setTextColor(color[0],color[1],color[2]);doc.setFont('helvetica','normal');
        var fontSize=Math.max(10,Math.min(42,Number(block.fontSize)||16));
        doc.setFontSize(fontSize);
        var lines=doc.splitTextToSize(String(block.text||''),Math.max(1,w-12));
        doc.text(lines.slice(0,Math.floor(Math.max(1,h-10)/(fontSize*1.2))),x+6,y+fontSize+3);
      }
    }
    doc.setFontSize(9);doc.setTextColor(120,137,130);doc.text(String(pageIndex+1),306,777,{align:'center'});
  }
  doc.save('microbiology-visual-aids.pdf');
  if(warnings)alert(warnings+' image(s) could not be embedded in the PDF.');
}
async function deleteMicroVisualPage(){
  if(!isAdmin)return;
  var page=microVisualPage();if(!page||!confirm('Delete this specimen page?'))return;
  if(page.id){var result=await sb.from('mlsboc_cases').delete().eq('id',page.id);if(result.error){alert('Delete failed: '+result.error.message);return;}}
  window._microVisualPages.splice(appState.microVisualPage,1);
  appState.microVisualPage=Math.max(0,appState.microVisualPage-1);
  appState.microVisualSelected=null;appState.microVisualView='library';renderTab();
}
