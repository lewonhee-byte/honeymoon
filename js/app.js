

(async ()=>{
'use strict';
const embedded=document.getElementById('archive-data');
let initial=JSON.parse(embedded.textContent);try{const r=await fetch('data/travel.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);initial=await r.json();window.Archive.validate(initial)}catch(e){console.warn('초기 내장 데이터 사용',e)}
let state=initial;
const base=JSON.parse(embedded.textContent);
const STORE='honeymoon-cinematic-archive-v9:'+location.pathname;
const V8_STORE='honeymoon-cinematic-archive-v8:'+location.pathname;
const OLD_STORE='honeymoon-cinematic-archive-v7:'+location.pathname;
const OLDER_STORE='honeymoon-cinematic-archive-v6:'+location.pathname;
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cityBy=id=>state.cities.find(c=>c.id===id)||state.cities[0];
const imgFor=c=>c.image||c.fallback;
const bg=(url,art='')=>`background-image:linear-gradient(145deg,rgba(23,29,32,.15),rgba(4,7,9,.15)),url("${String(url||'').replace(/["\\\n\r]/g,'')}"),url("${art}")`;
const titleBy=id=>cityBy(id).name;
const read=(form,key)=>(form.elements.namedItem(key)?.value??'').trim();
let directCopyMode=false;let editing=false, activeCity='florence', search='', filterCity='all',toastTimer;
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000)}
function persist(){window.Archive?.changed(state);try{localStorage.setItem(STORE,JSON.stringify(state))}catch(e){toast('브라우저 저장 공간이 부족합니다. HTML로 저장해 주세요.')}}
function commit(msg){persist();renderAll();if(msg)toast(msg)}
function applyLocal(){prepareState()}
function prepareState(){
  state.answers=state.answers||{};
  // Upgrade earlier user-saved files without replacing the questions they created.
  if(!Array.isArray(state.prompts)) state.prompts=JSON.parse(JSON.stringify(base.prompts));
  if(!state.archiveVersion || state.archiveVersion<5){
   const known=new Set(state.prompts.map(p=>p.id));
   const additions=base.prompts.filter(p=>['disappointing','bad-food','bad-place'].includes(p.id)&&!known.has(p.id));
   for(const p of additions){const sameAct=state.prompts.map((x,i)=>x.act===p.act?i:-1).filter(i=>i>=0);state.prompts.splice(sameAct.length?sameAct[sameAct.length-1]+1:state.prompts.length,0,{...p})}
  }
  state.archiveVersion=9;
  // For V6 backups, create a persistent order and editable copy for every Two Voices category.
  if(typeof state.totalExpenseKRW!=='number'||!Number.isFinite(state.totalExpenseKRW)||state.totalExpenseKRW<0)state.totalExpenseKRW=null;
 const seedGroups=JSON.parse(JSON.stringify(base.voiceGroups||[]));
  if(!Array.isArray(state.voiceGroups)||!state.voiceGroups.length)state.voiceGroups=seedGroups;
  for(const p of state.prompts){
   if(!p.act)p.act='04 / OUR OWN';
   if(!state.voiceGroups.some(g=>g.id===p.act)){
    const preset=seedGroups.find(g=>g.id===p.act);
    state.voiceGroups.push(preset||{id:p.act,title:p.act,description:''});
   }
  }
  state.copyOverrides=state.copyOverrides||{};state.svgCopy=state.svgCopy||{};
  state.universal=state.universal||{};for(const k of ['texts','images','links','hidden','orders'])state.universal[k]=state.universal[k]||{};state.universal.added=Array.isArray(state.universal.added)?state.universal.added:[];
  state.hiddenPages=state.hiddenPages||{};
  state.customPages=state.customPages||{};
  state.pageBlocks=state.pageBlocks||{};
  state.impressions=state.impressions||{a:{title:'',text:'',photos:[]},b:{title:'',text:'',photos:[]},sharedLegacy:state.notes||''};
  for(const p of ['a','b']){const v=state.impressions[p]||{};state.impressions[p]={title:v.title||'',text:v.text||'',photos:Array.isArray(v.photos)?v.photos:[]}}
  state.meta.epilogueImage=state.meta.epilogueImage||'';
  const allIds=[...base.pageOrder,...Object.keys(state.customPages)];
  if(!Array.isArray(state.pageOrder))state.pageOrder=[...allIds];
  state.pageOrder=[...new Set([...state.pageOrder.filter(id=>allIds.includes(id)),...allIds])];
  state.stays=state.stays||{};
  for(const c of state.cities){
   const s=state.stays[c.id]||{};
   if(!Array.isArray(s.photos))s.photos=s.image?[{id:'legacy-'+c.id,src:s.image}]:[];
   s.photos=s.photos.map((p,i)=>typeof p==='string'?{id:'migrated-'+c.id+'-'+i,src:p}:p).filter(p=>p&&p.src);
   state.stays[c.id]=s;
  }
  state.memoryParts=state.memoryParts||JSON.parse(JSON.stringify(base.memoryParts));
  for(const c of state.cities){
   let ps=state.memoryParts[c.id];if(!Array.isArray(ps)){state.memoryParts[c.id]=JSON.parse(JSON.stringify(base.memoryParts[c.id]||[]));ps=state.memoryParts[c.id]}
   if(!ps.length&&state.entries.some(e=>e.city===c.id))ps.push({id:'part-'+c.id+'-'+Date.now(),title:'우리의 기억',description:'자유롭게 채워갈 기록'});
   for(const r of state.entries.filter(e=>e.city===c.id)){if(!ps.some(p=>p.id===r.partId)){const seed=base.entries.find(e=>e.id===r.id);r.partId=(seed&&ps.some(p=>p.id===seed.partId)?seed.partId:ps[0].id)}r.image=r.image||''}
  }
  for(const pid of Object.keys(state.answers))for(const person of ['a','b']){
   const val=state.answers[pid]?.[person];if(typeof val==='string')state.answers[pid][person]={title:'',comment:val,image:''};
   else if(val&&typeof val==='object')state.answers[pid][person]={title:val.title||'',comment:val.comment||val.text||'',image:val.image||''};
  }
}
function smartHref(query){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query||'')}
function hero(){const cover=cityBy(state.meta.coverCity);const source=state.meta.coverImage||imgFor(cover);$('#heroBg').style.cssText=bg(source,cover.art);$('#heroTitle').innerHTML=esc(state.meta.headline).replace(/\n/g,'<br>').replace(/(kept\.)/i,'<em>$1</em>');$('#heroKor').textContent=state.meta.title;document.title=(state.meta.title||'신혼여행')+' — THE DAYS WE KEPT';$('#heroDesc').textContent=state.meta.subtitle;$('#photoIndicator').textContent=(state.meta.coverImage||cover.image)?'나의 여행 사진':'대표 이미지 · 참고 사진';$('#closingText').textContent=state.meta.closing;$('#closingBg').style.cssText=bg(state.meta.epilogueImage||imgFor(cityBy('barcelona')),cityBy('barcelona').art)}
function stayBy(id){return state.stays?.[id]||{name:'숙소 정보 미입력',address:'',period:'',checkin:'',checkout:'',notes:'',mapUrl:'',image:'',photos:[]}}
function stayCard(c){
 const s=stayBy(c.id),stayLink=s.mapUrl||((s.address||'').trim()?smartHref(s.address):'');
 const photos=s.photos||[];
 let slots='';
 for(let i=0;i<4;i++){
  const p=photos[i];
  slots+=p?`<button class="stay-gallery-item" type="button" data-view-stay-photo="${esc(c.id)}" data-photo-index="${i}" aria-label="${esc(c.name)} 숙소 사진 ${i+1} 확대"><img src="${esc(p.src)}" alt="${esc(c.name)} 숙소 사진 ${i+1}" loading="lazy"></button>`:`<div class="stay-photo-slot"><span>PHOTO ${String(i+1).padStart(2,'0')}</span><small>사진을 추가해 주세요</small></div>`;
 }
 const extras=photos.length>4?`<div class="stay-more-photos">${photos.slice(4).map((p,i)=>`<button class="stay-extra-item" type="button" data-view-stay-photo="${esc(c.id)}" data-photo-index="${i+4}"><img loading="lazy" src="${esc(p.src)}" alt="추가 숙소 사진 ${i+5}"></button>`).join('')}</div>`:'';
 return `<article class="stay-box" id="stay-${esc(c.id)}"><div class="stay-gallery-wrap"><div class="stay-gallery">${slots}</div>${extras}</div><div class="stay-info"><div class="eyebrow">WHERE WE STAYED / ${esc(c.latin)}</div><h4>${esc(s.name||'숙소 이름을 입력해 주세요')}</h4>${s.address?`<p class="stay-address">${esc(s.address)}</p>`:''}${s.period?`<p class="fine">${esc(s.period)}</p>`:''}${s.notes?`<p class="stay-notes">${esc(s.notes)}</p>`:''}<div class="stay-metadata">${s.checkin?`<span>CHECK-IN · ${esc(s.checkin)}</span>`:''}${s.checkout?`<span>CHECK-OUT · ${esc(s.checkout)}</span>`:''}</div><div class="detail-actions">${stayLink?`<a class="btn" href="${esc(stayLink)}" target="_blank" rel="noopener noreferrer">숙소 지도 ↗</a>`:''}<button class="btn edit-only" type="button" data-edit-stay="${esc(c.id)}">✎ 숙소 편집 · 사진 추가</button></div></div></article>`;
}
function renderCities(){
 const indexOf=id=>state.pageOrder.indexOf('city-'+id);
 $('#cityGrid').innerHTML=[...state.cities].sort((a,b)=>indexOf(a.id)-indexOf(b.id)).map(c=>`<a class="filmcard" data-u-stable="film-${esc(c.id)}" href="#city-${esc(c.id)}" aria-label="${esc(c.name)} 기록으로 이동"><div class="image-cover" style='${esc(bg(imgFor(c),c.art))}'></div><div class="filmcard-inner"><span>${esc(c.country)} / ${esc(c.theme)}</span><h3>${esc(c.name)}</h3><span>${esc(c.latin)}</span></div><span class="arrow">↗</span></a>`).join('');
 $$('.city-section',$('#pageStack')).forEach(n=>n.remove());
 $('#citySections').innerHTML=state.cities.map(c=>{
 const records=state.entries.filter(r=>r.city===c.id);
 return `<section class="city-section" id="city-${esc(c.id)}" aria-label="${esc(c.name)} 도시 기록"><div class="container"><div class="city-number-line mono"><span>${esc(c.latin)} / ${esc(c.country)}</span><span>OUR CITY NOTEBOOK</span></div><div class="chapter-detail"><div class="detail-visual"><div class="detail-photo" style='${esc(bg(imgFor(c),c.art))}'></div><div class="detail-corner mono">${esc(c.latin)}</div><div class="detail-caption">${c.image?'OUR PHOTOGRAPH':'REFERENCE IMAGE · REPLACE WITH YOUR PHOTO'}</div></div><div class="detail-copy"><div class="latin mono">${esc(c.latin)} · ${esc(c.country)}</div><h3>${esc(c.name)}</h3><h4>${esc(c.headline)}</h4><p>${esc(c.intro)}</p><div class="detail-note">${esc(c.memory)}</div><p class="fine">${esc(c.duration)} · 여행 기록 ${records.length}개</p><div class="detail-actions"><a class="btn" href="#stay-${esc(c.id)}">숙소 보기 ↓</a><a class="btn" href="#memories-${esc(c.id)}">Memory Index ↓</a><a class="btn" href="${esc(smartHref(c.map))}" target="_blank" rel="noopener noreferrer">도시 지도 ↗</a><button class="btn edit-only" type="button" data-edit-city="${esc(c.id)}">✎ 도시 소개 편집</button></div></div></div>
 <div class="city-ordered-section"><div class="city-part-label"><div><div class="eyebrow">THE PLACE WE STAYED</div><h4>머물렀던 <i>공간.</i></h4></div></div>${stayCard(c)}</div>
 <div class="city-ordered-section city-memory-index" id="memories-${esc(c.id)}"><div class="memory-index-heading"><div><div class="eyebrow">${esc(c.latin)} / MEMORY INDEX</div><h4>Memory <i>index.</i></h4></div><div class="detail-actions"><button class="btn edit-only" type="button" data-add-part="${esc(c.id)}">＋ 새 파트</button><button class="btn edit-only" type="button" data-add-city-record="${esc(c.id)}">＋ 기록 추가</button></div></div><div class="city-part-list" id="parts-${esc(c.id)}"></div></div></div></section>`;}).join('');
}
function pageLabel(id){
 const c=state.cities.find(c=>'city-'+c.id===id);
 if(c)return {title:c.name,kind:'도시 소개 · 숙소 · Memory Index'};
 if(state.customPages?.[id])return {title:state.customPages[id].title,kind:'직접 만든 자유 페이지'};
 return ({chapters:{title:'Four Cities',kind:'도시 소개 카드'},memorySearch:{title:'기록 검색',kind:'Memory Index 검색'},route:{title:'Between Cities',kind:'여행 경로도'},reflections:{title:'Two Voices',kind:'원희와 은정의 여행 결산'},expenses:{title:'Travel Expenses',kind:'여행 지출'},impressions:{title:'After the Journey',kind:'원희 · 은정의 여행 감상'},epilogue:{title:'Epilogue',kind:'마지막 장면'}}[id]||{title:id,kind:''});
}

function renderSVGText(){
 $$('#route .journey-svg text').forEach((el,i)=>{const key='svg-route-'+i;el.dataset.svgCopy=key;if(Object.prototype.hasOwnProperty.call(state.svgCopy,key))el.textContent=state.svgCopy[key]})
}
function svgCopyModal(el){
 const key=el.dataset.svgCopy;if(!key)return;
 openModal('경로도 글자 수정',`<form id="svgLabelForm"><div class="formgrid">${field('copy','노선도에 표시할 문구',el.textContent,'text',true)}</div>${footerButtons()}</form>`);
 $('#svgLabelForm').onsubmit=e=>{e.preventDefault();state.svgCopy[key]=read(e.currentTarget,'copy');commit('노선도 문구를 저장했습니다.');closeModal()};
}

function renderCustomPages(){
 const stack=$('#pageStack');
 const customIds=Object.keys(state.customPages||{});
 for(const node of Array.from(stack.children))if(node.id.startsWith('custom-')&&!customIds.includes(node.id))node.remove();
 for(const id of customIds){
  const data=state.customPages[id];let node=document.getElementById(id);
  if(!node){node=document.createElement('section');node.id=id;node.className='section custom-chapter';stack.appendChild(node)}
  node.innerHTML=`<div class="container"><div class="section-kicker">CUSTOM JOURNAL</div><div class="sect-head"><h2>${esc(data.title||'새로운 페이지')}</h2><p>${esc(data.description||'원하는 사진과 글을 자유롭게 넣을 수 있는 공간입니다.')}</p></div><div class="section-actions edit-only"><button type="button" class="btn" data-custom-edit="${esc(id)}">✎ 페이지 제목 · 설명 수정</button></div></div>`;
 }
}
function editCustomPage(id){
 const old=state.customPages[id];if(!old)return;
 openModal('자유 페이지 수정',`<form id="customPageForm"><div class="formgrid">${field('title','페이지 제목',old.title,'text',true)}${field('description','짧은 소개',old.description,'textarea',true)}</div>${footerButtons('<button type="button" class="btn" id="deleteCustomPage">페이지 영구 삭제</button>')}</form>`);
 $('#customPageForm').onsubmit=e=>{e.preventDefault();const title=read(e.currentTarget,'title');if(!title){toast('제목이 필요합니다.');return}old.title=title;old.description=read(e.currentTarget,'description');commit('자유 페이지를 저장했습니다.');closeModal()};
 $('#deleteCustomPage').onclick=()=>{if(!confirm('이 페이지와 안의 글·사진을 모두 삭제할까요?'))return;delete state.customPages[id];delete state.pageBlocks[id];delete state.hiddenPages[id];state.pageOrder=state.pageOrder.filter(x=>x!==id);document.getElementById(id)?.remove();commit('자유 페이지를 삭제했습니다.');closeModal()};
}

function renderPageOrder(){
 const stack=$('#pageStack');
 for(const id of state.pageOrder){const node=document.getElementById(id);if(node){stack.appendChild(node);node.hidden=!!state.hiddenPages?.[id]}}
 $('#topnav').innerHTML=state.pageOrder.filter(id=>!state.hiddenPages?.[id]&&id!=='memorySearch'&&id!=='epilogue'&&id!=='chapters').map(id=>`<a href="#${esc(id)}">${esc(pageLabel(id).title)}</a>`).join('');
}
function pageOrderModal(){
 const show=()=>{
  $('#orderList').innerHTML=state.pageOrder.map((id,i)=>{const label=pageLabel(id),hidden=!!state.hiddenPages?.[id],own=!!state.customPages?.[id];return `<div class="order-row ${hidden?'order-row-hidden':''}"><div class="order-row-label">${esc(label.title)}<small>${esc(label.kind)}${hidden?' · 화면에서 숨김':''}</small></div><div class="order-row-actions"><button type="button" data-page-move="${esc(id)}" data-step="-1" ${i===0?'disabled':''}>↑</button><button type="button" data-page-move="${esc(id)}" data-step="1" ${i===state.pageOrder.length-1?'disabled':''}>↓</button><button type="button" data-page-hide="${esc(id)}">${hidden?'표시':'숨김'}</button>${own?`<button type="button" data-custom-edit="${esc(id)}">수정</button>`:''}</div></div>`}).join('');
 };
 openModal('페이지 순서 · 추가 · 숨김',`<p class="fine">표지는 고정이고 아래 페이지는 이동·숨기기 할 수 있어요. 별도 자유 페이지도 추가할 수 있습니다. 각 도시 안의 소개 → 숙소 → Memory Index 순서는 유지됩니다.</p><div class="order-list" id="orderList"></div><div class="new-custom-page"><label class="eyebrow">새 페이지 만들기</label><div class="new-custom-page-row"><input id="newPageTitle" placeholder="예: 우리의 카페 지도" aria-label="새 페이지 제목"><button type="button" class="btn" id="makeCustomPage">＋ 페이지</button></div></div><div class="modal-actions"><button class="btn primary" type="button" id="donePageOrder">완료</button></div>`);
 show();
 $('#orderList').onclick=e=>{
  const edit=e.target.closest('[data-custom-edit]');if(edit){editCustomPage(edit.dataset.customEdit);return}
  const hidden=e.target.closest('[data-page-hide]');if(hidden){state.hiddenPages[hidden.dataset.pageHide]=!state.hiddenPages[hidden.dataset.pageHide];commit('페이지 표시 상태를 변경했습니다.');show();return}
  const btn=e.target.closest('[data-page-move]');if(!btn)return;
  const i=state.pageOrder.indexOf(btn.dataset.pageMove),j=i+Number(btn.dataset.step);if(i<0||j<0||j>=state.pageOrder.length)return;
  [state.pageOrder[i],state.pageOrder[j]]=[state.pageOrder[j],state.pageOrder[i]];commit('페이지 순서를 변경했습니다.');show()
 };
 $('#makeCustomPage').onclick=()=>{const title=$('#newPageTitle').value.trim();if(!title){toast('페이지 제목을 입력해 주세요.');return}const id=uid('custom');state.customPages[id]={title,description:''};state.pageOrder.push(id);commit('자유 페이지를 만들었습니다.');show();$('#newPageTitle').value=''};
 $('#donePageOrder').onclick=closeModal;
}
function renderJourney(){}
function renderRecords(){
 const q=search.trim().toLocaleLowerCase();let count=0;
 const recordCard=r=>`<article class="record ${r.image?'has-image':''}">${r.image?`<div class="record-figure"><img src="${esc(r.image)}" loading="lazy" alt="${esc(r.title)} 기록 사진"></div>`:''}<div class="record-top"><span class="record-city mono">${esc(titleBy(r.city))} / ${esc(r.type)}</span></div><h3>${esc(r.title)}</h3><p>${esc(r.description)}</p><div class="record-footer"><small>${esc(r.date||'날짜 미입력')}</small><div style="display:flex;gap:12px;align-items:center">${r.map?`<a class="textlink" href="${esc(smartHref(r.map))}" target="_blank" rel="noopener noreferrer">지도 ↗</a>`:''}<button class="textlink edit-only" type="button" data-edit-record="${esc(r.id)}">수정 ✎</button></div></div></article>`;
 for(const c of state.cities){
  const root=$('#parts-'+c.id);if(!root)continue;
  const parts=state.memoryParts?.[c.id]||[];
  const matching=state.entries.filter(r=>r.city===c.id&&(filterCity==='all'||filterCity===c.id)&&(!q||[r.title,r.description,r.type,r.date,c.name,parts.find(p=>p.id===r.partId)?.title||''].join(' ').toLocaleLowerCase().includes(q)));
  count+=matching.length;
  root.innerHTML=parts.map((part,i)=>{
   const list=matching.filter(r=>r.partId===part.id);
   const showPart=list.length||(!q&&(filterCity==='all'||filterCity===c.id));if(!showPart)return '';
   return `<div class="memory-part" data-part-id="${esc(part.id)}"><div class="memory-part-top"><div><div class="eyebrow">${esc(c.latin)} / MEMORY</div><h5>${esc(part.title)}</h5>${part.description?`<p>${esc(part.description)}</p>`:''}</div><div class="part-tools edit-only"><button class="btn" type="button" data-move-part="${esc(part.id)}" data-city="${esc(c.id)}" data-dir="up" ${i===0?'disabled':''}>↑</button><button class="btn" type="button" data-move-part="${esc(part.id)}" data-city="${esc(c.id)}" data-dir="down" ${i===parts.length-1?'disabled':''}>↓</button><button class="btn" type="button" data-edit-part="${esc(part.id)}" data-city="${esc(c.id)}">✎ 파트</button><button class="btn" type="button" data-delete-part="${esc(part.id)}" data-city="${esc(c.id)}">삭제</button><button class="btn" type="button" data-add-in-part="${esc(part.id)}" data-city="${esc(c.id)}">＋ 기록</button></div></div><div class="record-grid">${list.map(recordCard).join('')}</div>${!list.length?`<div class="empty-part">아직 기록이 없습니다. 편집 모드에서 이 파트에 사진과 이야기를 추가할 수 있어요.</div>`:''}</div>`;
  }).join('') || `<div class="memory-index-empty">${q||filterCity!=='all'?'검색 조건에 맞는 기록이 없습니다.':'아직 파트가 없습니다. 기록 편집을 눌러 새 파트와 사진을 추가해 보세요.'}</div>`;
 }
 $('#searchCount').textContent=`${count} PLACES · 4 CITY NOTEBOOKS`;
}

function getVoice(promptId,person){const v=state.answers?.[promptId]?.[person];return typeof v==='string'?{title:'',comment:v,image:''}:v||{title:'',comment:'',image:''}}
function renderReflections(){
 const groups=state.voiceGroups||[];
 const card=(p,i,groupPrompts)=>`<article class="reflection" data-u-stable="question-${esc(p.id)}"><div class="reflection-top"><div class="eyebrow">OUR TWO PERSPECTIVES</div></div><h3>${esc(p.title)}</h3><p class="hint">${esc(p.hint||'서로의 기억을 기록해 주세요.')}</p><div class="answer-fields">${['a','b'].map((person,pi)=>{const a=getVoice(p.id,person);return `<div data-u-stable="answer-${esc(p.id)}-${person}" class="answer-card ${a.title||a.comment||a.image?'has-answer':''}"><div class="answer-label">${pi===0?'원희':'은정'}</div>${a.image?`<img class="answer-photo" src="${esc(a.image)}" loading="lazy" alt="${pi===0?'원희':'은정'}의 여행 장면">`:''}${a.title?`<h4 class="answer-title">${esc(a.title)}</h4>`:''}${a.comment?`<p class="answer-comment">${esc(a.comment)}</p>`:''}${!a.title&&!a.comment&&!a.image?'<p class="answer-placeholder">이 장면에 대한 사진과 이야기를 남겨 주세요.</p>':''}<button class="btn edit-only" type="button" data-edit-voice="${esc(p.id)}" data-person="${person}">✎ ${pi===0?'원희':'은정'} 기록 편집</button></div>`}).join('')}</div><div class="reflection-tools edit-only"><button class="btn" type="button" data-edit-prompt="${esc(p.id)}">질문 수정</button><button class="btn" type="button" data-prompt-shift="${esc(p.id)}" data-step="-1" ${i===0?'disabled':''}>↑</button><button class="btn" type="button" data-prompt-shift="${esc(p.id)}" data-step="1" ${i===groupPrompts.length-1?'disabled':''}>↓</button><button class="btn" type="button" data-delete-prompt="${esc(p.id)}">질문 삭제</button></div></article>`;
 $('#reflectionGrid').innerHTML=groups.map(g=>{
  const prompts=state.prompts.filter(p=>p.act===g.id);
  const heading=`<div class="reflection-act" data-u-stable="voice-group-${esc(g.id)}"><div class="eyebrow">TWO VOICES</div><h3>${esc(g.title)}</h3>${g.description?`<p>${esc(g.description)}</p>`:''}<button class="btn edit-only" type="button" data-edit-voice-group="${esc(g.id)}">✎ 묶음 제목 · 설명</button></div>`;
  return heading+(prompts.map((p,i)=>card(p,i,prompts)).join('')||`<p class="voice-empty edit-only">아직 질문이 없는 묶음입니다. 순서 관리에서 질문을 추가할 수 있어요.</p>`)
 }).join('');
}
function formatKRW(n){return new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}).format(n)}
function renderExpenses(){
 const amount=state.totalExpenseKRW;
 const valid=(typeof amount==='number'&&Number.isFinite(amount)&&amount>=0);
 $('#costTotal').textContent=valid?'₩ '+formatKRW(amount):'₩ —';
 $('#costSummary').innerHTML=valid?'<div class="fine">KRW · 두 사람의 여행 전체 지출</div>':'<div class="fine">기록 편집에서 여행 전체 금액을 원화로 입력해 주세요.</div>';
}
function renderCredits(){$('#photoCredits').innerHTML=state.cities.map(c=>`<a href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">${esc(c.credits)} ↗</a>`).join('')}

function renderImpressions(){
 const root=$('#impressionGrid');if(!root)return;
 root.innerHTML=['a','b'].map(person=>{
 const a=state.impressions[person]||{title:'',text:'',photos:[]},name=person==='a'?'원희':'은정';
 const photos=(a.photos||[]).map((p,i)=>`<button type="button" class="impression-photo" data-view-impression="${person}" data-index="${i}"><img src="${esc(p.src)}" loading="lazy" alt="${name}의 여행 사진 ${i+1}"></button>`).join('');
 return `<article class="impression-card" data-u-stable="impression-${person}"><div class="impression-top"><span class="eyebrow">${name} / TRAVEL NOTES</span></div><h3>${esc(a.title||name+'의 여행 감상')}</h3>${a.text?`<p class="impression-text">${esc(a.text)}</p>`:'<p class="impression-empty">우리의 여행에서 떠오르는 기억을 적어보세요.</p>'}<div class="impression-photos">${photos}</div><button class="btn edit-only" type="button" data-edit-impression="${person}">✎ ${name} 감상평 · 사진 편집</button></article>`;
 }).join('');
 $('#legacyNote').innerHTML=state.impressions.sharedLegacy?`<div class="legacy-box"><div class="eyebrow">이전 버전의 공동 메모</div><p>${esc(state.impressions.sharedLegacy)}</p><button type="button" class="btn edit-only" id="editLegacyNote">✎ 이전 메모 수정 · 삭제</button></div>`:'';
}
function impressionModal(person){
 const name=person==='a'?'원희':'은정',draft=JSON.parse(JSON.stringify(state.impressions[person]||{title:'',text:'',photos:[]}));
 openModal(name+' · 이번 여행 감상평',`<form id="impressionForm"><div class="formgrid">${field('title','나의 제목',draft.title,'text',true)}${field('text','이번 여행 감상평',draft.text,'textarea',true)}<div class="field span2"><label>사진 목록 · 순서 변경 / 삭제 가능</label><div id="impressionPhotoEditor" class="edit-photos"></div><label>사진 여러 장 추가</label><input type="file" id="impressionPhotos" multiple accept="image/*"></div></div>${footerButtons('<button type="button" class="btn" id="removeImpression">감상평 전체 비우기</button>')}</form>`);
 const draw=()=>{$('#impressionPhotoEditor').innerHTML=draft.photos.length?draft.photos.map((p,i)=>`<div class="edit-photo-item"><img alt="감상 사진 ${i+1}" src="${esc(p.src)}"><div class="edit-photo-actions"><button type="button" data-imp-shift="${i}" data-delta="-1" ${!i?'disabled':''}>↑</button><button type="button" data-imp-shift="${i}" data-delta="1" ${i===draft.photos.length-1?'disabled':''}>↓</button><button type="button" data-imp-remove="${i}">삭제</button></div></div>`).join(''):'<div class="fine">아직 사진이 없습니다.</div>'};draw();
 $('#impressionPhotoEditor').onclick=e=>{const del=e.target.closest('[data-imp-remove]'),move=e.target.closest('[data-imp-shift]');if(del){draft.photos.splice(+del.dataset.impRemove,1);draw()}else if(move){const i=+move.dataset.impShift,j=i+(+move.dataset.delta);if(j<0||j>=draft.photos.length)return;[draft.photos[i],draft.photos[j]]=[draft.photos[j],draft.photos[i]];draw()}};
 $('#removeImpression').onclick=()=>{if(!confirm(name+'의 감상평과 사진을 모두 지울까요?'))return;state.impressions[person]={title:'',text:'',photos:[]};commit('감상평을 비웠습니다.');closeModal()};
 $('#impressionForm').onsubmit=async e=>{e.preventDefault();draft.title=read(e.currentTarget,'title');draft.text=read(e.currentTarget,'text');for(const f of Array.from($('#impressionPhotos').files)){try{draft.photos.push({id:uid('impression-photo'),src:await photoData(f,1350,.72)})}catch(err){toast('사진을 읽지 못했습니다.');return}}state.impressions[person]=draft;commit(name+'의 감상평을 저장했습니다.');closeModal()};
}
function renderPageBlocks(){
 const ids=state.pageOrder||[];
 for(const id of ids){
  const node=document.getElementById(id);if(!node)continue;
  const inner=node.querySelector(':scope > .container')||node;
  let root=inner.querySelector(':scope > .free-blocks');
  if(!root){root=document.createElement('div');root.className='free-blocks';inner.appendChild(root)}
  const all=state.pageBlocks[id]||[];
  root.innerHTML=`${all.map((b,i)=>`<article class="free-block" data-u-stable="free-${esc(b.id)}"><div class="free-block-copy">${b.title?`<h3>${esc(b.title)}</h3>`:''}${b.text?`<p>${esc(b.text)}</p>`:''}</div>${(b.photos||[]).length?`<div class="free-block-photos">${b.photos.map((p,j)=>`<button type="button" class="free-block-photo" data-view-free="${esc(id)}" data-block-id="${esc(b.id)}" data-image="${j}"><img loading="lazy" src="${esc(p.src)}" alt="${esc(b.title||'추가 사진')} ${j+1}"></button>`).join('')}</div>`:''}<div class="free-block-actions edit-only"><button class="btn" type="button" data-edit-block="${esc(b.id)}" data-page="${esc(id)}">✎ 편집</button><button class="btn" type="button" data-move-block="${esc(b.id)}" data-page="${esc(id)}" data-step="-1" ${!i?'disabled':''}>↑</button><button class="btn" type="button" data-move-block="${esc(b.id)}" data-page="${esc(id)}" data-step="1" ${i===all.length-1?'disabled':''}>↓</button><button class="btn" type="button" data-remove-block="${esc(b.id)}" data-page="${esc(id)}">삭제</button></div></article>`).join('')}<div class="free-add edit-only"><button type="button" class="btn" data-new-block="${esc(id)}">＋ 자유로운 글 · 사진 추가</button></div>`;
 }
}
function freeBlockModal(page,id){
 const arr=state.pageBlocks[page]||(state.pageBlocks[page]=[]),existing=arr.find(b=>b.id===id),draft=existing?JSON.parse(JSON.stringify(existing)):{id:uid('block'),title:'',text:'',photos:[]};
 openModal(existing?'글 · 사진 블록 편집':'새 글 · 사진 블록',`<form id="freeBlockForm"><div class="formgrid">${field('title','제목',draft.title,'text',true)}${field('text','내용 / 설명',draft.text,'textarea',true)}<div class="field span2"><label>블록 사진</label><div class="edit-photos" id="freePhotoEditor"></div><label>사진 여러 장 추가</label><input type="file" id="freePhotoFiles" multiple accept="image/*"></div></div>${footerButtons()}</form>`);
 const draw=()=>{$('#freePhotoEditor').innerHTML=draft.photos.length?draft.photos.map((p,i)=>`<div class="edit-photo-item"><img src="${esc(p.src)}" alt="사진 ${i+1}"><div class="edit-photo-actions"><button type="button" data-f-shift="${i}" data-step="-1" ${i===0?'disabled':''}>↑</button><button type="button" data-f-shift="${i}" data-step="1" ${i===draft.photos.length-1?'disabled':''}>↓</button><button type="button" data-f-remove="${i}">삭제</button></div></div>`).join(''):'<div class="fine">사진을 추가하면 여기에 표시됩니다.</div>'};draw();
 $('#freePhotoEditor').onclick=e=>{const remove=e.target.closest('[data-f-remove]'),shift=e.target.closest('[data-f-shift]');if(remove){draft.photos.splice(+remove.dataset.fRemove,1);draw()}else if(shift){const i=+shift.dataset.fShift,j=i+(+shift.dataset.step);if(j<0||j>=draft.photos.length)return;[draft.photos[i],draft.photos[j]]=[draft.photos[j],draft.photos[i]];draw()}};
 $('#freeBlockForm').onsubmit=async e=>{e.preventDefault();draft.title=read(e.currentTarget,'title');draft.text=read(e.currentTarget,'text');for(const file of Array.from($('#freePhotoFiles').files)){try{draft.photos.push({id:uid('block-photo'),src:await photoData(file,1200,.73)})}catch(err){toast('사진 읽기에 실패했습니다.');return}}if(!existing)arr.push(draft);else Object.assign(existing,draft);commit('자유 블록을 저장했습니다.');closeModal()};
}
function updateFreeBlock(page,id,delta){const all=state.pageBlocks?.[page]||[],i=all.findIndex(b=>b.id===id),j=i+delta;if(i<0||j<0||j>=all.length)return;[all[i],all[j]]=[all[j],all[i]];commit('블록 순서를 변경했습니다.')}
function decorateCopyTexts(){
 // The button only enables direct editing of display copy. Core objects have their own semantic editors.
 const skip='svg,script,style,textarea,input,select,option,button,a,.modal-backdrop,.toast,.edit-only,.record,.stay-box,.memory-part,.reflection,.reflection-act,.detail-copy,.filmcard,.impression-card,.free-block,.cost-row,.barline,.answer-card,.credits,.hero-inner,.closing-inner,.u-text-node,.u-added,.universal-dock';
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 const nodes=[];let t;
 while(t=walker.nextNode()){
  const parent=t.parentElement;
  if(!parent||!t.textContent.trim()||parent.closest(skip)||parent.closest('[data-direct-copy]'))continue;
  if(t.textContent.trim().length>240)continue;
  nodes.push(t)
 }
 for(const node of nodes){
  const parent=node.parentElement;
  const root=parent.closest('[id]')||document.body;
  let cur=parent,parts=[];
  while(cur&&cur!==root&&cur!==document.body){let i=0,p=cur.previousElementSibling;while(p){if(!p.matches('[data-direct-copy]'))i++;p=p.previousElementSibling}parts.unshift(cur.tagName.toLowerCase()+':'+i);cur=cur.parentElement}
  const ownIndex=Array.from(parent.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE).indexOf(node);
  const key=(root.id||'body')+'/'+parts.join('/')+'/'+ownIndex;
  const span=document.createElement('span');span.className='direct-copy';span.dataset.directCopy=key;
  span.textContent=Object.prototype.hasOwnProperty.call(state.copyOverrides,key)?state.copyOverrides[key]:node.textContent;
  node.replaceWith(span)
 }
 for(const span of $$('[data-direct-copy]')){const key=span.dataset.directCopy;if(Object.prototype.hasOwnProperty.call(state.copyOverrides,key))span.textContent=state.copyOverrides[key]}
}
function directCopyModal(span){
 const key=span.dataset.directCopy;if(!key)return;
 openModal('화면 문구 직접 수정',`<form id="directCopyForm"><div class="formgrid">${field('copy','표시할 문장 · 삭제하려면 빈칸',span.textContent,'textarea',true)}</div>${footerButtons('<button type="button" class="btn" id="clearDirectCopy">문구 비우기</button>')}</form>`);
 const save=v=>{state.copyOverrides[key]=v;commit('문구를 변경했습니다.');closeModal()};
 $('#clearDirectCopy').onclick=()=>save('');
 $('#directCopyForm').onsubmit=e=>{e.preventDefault();save(read(e.currentTarget,'copy'))};
}
function legacyNoteModal(){openModal('이전 공동 메모',`<form id="legacyForm"><div class="formgrid">${field('text','이전 메모 · 삭제하려면 비우기',state.impressions.sharedLegacy||'','textarea',true)}</div>${footerButtons()}</form>`);$('#legacyForm').onsubmit=e=>{e.preventDefault();state.impressions.sharedLegacy=read(e.currentTarget,'text');commit('이전 메모를 수정했습니다.');closeModal()}}


// V9: A composition layer over every text, photograph and visual content element.
// Every override is stored in state.universal and embedded in exported standalone HTML.
let universalPick=false;
function uState(){return state.universal}
function uPick(on){universalPick=!!on;if(universalPick&&directCopyMode){directCopyMode=false;document.body.classList.remove('copy-editing');$('#directEditToggle').textContent='✎ 문구'}document.body.classList.toggle('u-picking',universalPick);const dock=$('#universalDock');if(dock)dock.hidden=!universalPick;for(const btn of [$('#universalButton'),$('#universalMobileButton')])if(btn)btn.textContent=universalPick?'✓ 자유편집 종료':'✣ 전체 자유편집'}
function uCleanup(){
 $$('.u-added').forEach(n=>n.remove());
 // For each static node, discard any earlier visual hiding before applying the saved state again.
 $$('[data-u-hidden]').forEach(n=>n.removeAttribute('data-u-hidden'));
}
function uMainArea(el){return !!el.closest('main,#topbar,#footer')}
function uIgnore(el){return !!el.closest('.modal-backdrop,.universal-dock,.headtools,.edit-only,.free-block-actions,.free-add,.reflection-tools,.section-actions,.searchtools,.headtools,.edit-badge,.toast,#menuPanel')}
function uTextNodes(){
 const root=document.body;const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const todo=[];let n;
 while(n=walk.nextNode()){
   if(!n.textContent.trim())continue;const p=n.parentElement;if(!p||!uMainArea(p))continue;
   if(p.closest('script,style,svg,select,option,textarea,input,.u-text-node,[data-direct-copy],.u-added,.edit-only,.headtools,.modal-backdrop,.universal-dock,.topnav .edit-only,.sr-only'))continue;
   // All text, including text inside styled headings, links and generated record cards.
   todo.push(n)
 }
 for(const n of todo){const sp=document.createElement('span');sp.className='u-text-node';sp.dataset.uText='1';sp.textContent=n.textContent;n.replaceWith(sp)}
}
function uKeys(){
 const walk=(el,parentKey)=>{
   if(!el||el.nodeType!==1)return;
   if(el.matches('script,style,.modal-backdrop,.universal-dock,.edit-badge,.toast'))return;
   const key=el.dataset.uKey || (el.dataset.uStable?'stable:'+el.dataset.uStable : el.id?'id:'+el.id : parentKey+'/'+el.tagName.toLowerCase()+':'+Array.from(el.parentElement?.children||[]).indexOf(el));
   el.dataset.uKey=key;
   for(const child of Array.from(el.children))walk(child,key)
 };
 for(const root of [$('#topbar'),$('main'),$('#footer')])if(root)walk(root,root.id?'id:'+root.id:'root:'+root.tagName.toLowerCase());
}
function uPhoto(el){return el&&(el.matches('img,svg.journey-svg,.hero-photo,.image-cover,.detail-photo,.scene-photo,#closingBg,.stay-photo-slot')||el.hasAttribute('data-u-photo'))}
function uPhotoCandidates(){return $$('main img,main svg.journey-svg,main .hero-photo,main .image-cover,main .detail-photo,main .scene-photo,main #closingBg,main .stay-photo-slot,main [data-u-photo]')}
function uApplyImage(el,src){
 if(src==null)return;
 if(el.tagName==='IMG')el.src=src;
 else if(el.matches('svg')){el.dataset.uReplacedImage='1';el.style.backgroundImage=`url("${src}")`;el.style.backgroundSize='cover';el.style.backgroundPosition='center';}
 else {el.dataset.uReplacedImage='1';el.style.backgroundImage=`linear-gradient(145deg,rgba(5,8,9,.05),rgba(4,7,9,.08)),url("${src}")`;el.style.backgroundSize='cover';el.style.backgroundPosition='center'}
}
function uElementByKey(key){return $$('[data-u-key]').find(el=>el.dataset.uKey===key)}
function uApply(){
 uTextNodes();uKeys();
 const u=uState();
 // Reinsert freely authored text and photographs adjacent to any existing item.
 for(const item of u.added){const anchor=uElementByKey(item.anchor);if(!anchor||!anchor.parentElement)continue;
   const n=document.createElement('span');n.dataset.uStable='added-'+item.id;n.dataset.uKey='added:'+item.id;n.className='u-added '+(item.kind==='photo'?'u-added-photo':'u-added-copy');
   if(item.kind==='photo'){const img=document.createElement('img');img.src=item.src||'';img.alt=item.alt||'추가한 여행 사진';img.dataset.uKey=n.dataset.uKey+'/img:0';n.appendChild(img)}
   else{const p=document.createElement('p');p.textContent=item.text||'';p.dataset.uKey=n.dataset.uKey+'/p:0';n.appendChild(p)}
   anchor.insertAdjacentElement(item.side==='before'?'beforebegin':'afterend',n)
 }
 // Arrange siblings without discarding their original JavaScript callbacks or DOM attributes.
 for(const [parentKey,keys] of Object.entries(u.orders||{})){
   const parent=uElementByKey(parentKey);if(!parent)continue;
   const nodeMap=new Map(Array.from(parent.children).map(n=>[n.dataset.uKey,n]));
   const ordered=(Array.isArray(keys)?keys:[]).map(k=>nodeMap.get(k)).filter(Boolean);
   if(!ordered.length)continue;
   // Move each ordered element into a stable sequence while keeping unlisted siblings present.
   const first=ordered[0];let cursor=first;
   for(let i=1;i<ordered.length;i++){const node=ordered[i];if(node!==cursor.nextElementSibling)cursor.after(node);cursor=node}
 }
 for(const [key,val] of Object.entries(u.texts||{})){
   const el=uElementByKey(key);if(el&&!(el.matches('script,style')))el.textContent=val;
 }
 for(const [key,src] of Object.entries(u.images||{})){
   const el=uElementByKey(key);if(el&&uPhoto(el)&&src)uApplyImage(el,src)
 }
 for(const [key,url] of Object.entries(u.links||{})){
   const el=uElementByKey(key);if(el&&el.tagName==='A')el.href=url
 }
 for(const [key,yes] of Object.entries(u.hidden||{})){
   const el=uElementByKey(key);if(el&&yes)el.setAttribute('data-u-hidden','1')
 }
}
function uCandidates(el){
 const out=[];let n=el;
 while(n&&n.nodeType===1&&uMainArea(n)){
   if(n.dataset.uKey&&!uIgnore(n)&&!n.matches('.u-added p,.u-added img'))out.push(n);
   if(n.tagName==='MAIN'||n.id==='topbar'||n.id==='footer')break;
   n=n.parentElement
 }
 return out
}
function uElementName(el){
 if(!el)return '알 수 없는 항목';
 const sample=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim().slice(0,60);
 const tag=el.tagName==='IMG'?'사진':uPhoto(el)?'사진·이미지':el.matches('[data-u-text],[data-direct-copy],svg text')?'문장':el.matches('section')?'챕터':el.matches('h1,h2,h3,h4')?'제목':el.matches('.record,.memory-part,.reflection,.answer-card,.stay-box,.impression-card,.free-block')?'카드':el.tagName.toLowerCase();
 return tag+' · '+(sample||el.getAttribute('aria-label')||el.id||el.className?.toString().slice(0,34)||'콘텐츠')
}
function uSiblings(el){return Array.from(el.parentElement?.children||[]).filter(n=>n.dataset.uKey&&!n.matches('.edit-only')&&!uIgnore(n))}
function uMove(el,delta){if(el?.tagName==='IMG'&&el.parentElement?.matches('.stay-gallery-item,.stay-extra-item,.impression-photo,.free-block-photo'))el=el.parentElement;if(!el?.parentElement)return;const all=uSiblings(el),i=all.indexOf(el),j=i+delta;if(i<0||j<0||j>=all.length){toast('이 방향으로 더 이동할 수 없습니다.');return}const seq=all.map(n=>n.dataset.uKey);[seq[i],seq[j]]=[seq[j],seq[i]];state.universal.orders[el.parentElement.dataset.uKey]=seq;commit('선택 요소의 순서를 변경했습니다.')}
function uPageId(el){const main=el.closest('main');if(!main)return el.closest('#topbar')?'topbar':'footer';const candidates=Array.from(el.closest('#pageStack,#citySections')?.children||[]);const city=el.closest('.city-section');if(city)return city.id;const page=el.closest('#route,#reflections,#expenses,#impressions,#chapters,#memorySearch,#epilogue,.custom-chapter');if(page)return page.id;return 'home'}
function uInspect(el){
 if(!el||!el.dataset.uKey)return;
 const ancestors=uCandidates(el);if(!ancestors.length)return;
 const chosen=el.dataset.uKey;
 const sel=ancestors.map((n,i)=>`<option value="${esc(n.dataset.uKey)}" ${n.dataset.uKey===chosen?'selected':''}>${esc(i===0?'선택한 요소 · '+uElementName(n):'상위 영역 '+i+' · '+uElementName(n))}</option>`).join('');
 const photo=uPhoto(el),text=el.matches('[data-u-text],[data-direct-copy],svg text')||el.matches('p,h1,h2,h3,h4,small,strong,em,i,label')&&el.children.length===0;
 const hidden=!!state.universal.hidden[chosen];
 const hasHref=el.tagName==='A';
 const editFields=`${text?field('uTextValue','표시할 문장 (빈칸이면 글자를 지울 수 있어요)',el.textContent,'textarea',true):''}${photo?`<div class="field span2"><label for="uPhotoFile">이 사진 교체 · 이미지 업로드</label><input type="file" accept="image/*" id="uPhotoFile"><small class="fine">사진 파일이 HTML 안에 함께 저장됩니다.</small></div>`:''}${hasHref?field('uHref','링크 주소',el.getAttribute('href')||'','text',true):''}`;
 openModal('모든 요소 자유편집',`<div class="u-inspector-head">${esc(uElementName(el))}<small>이름과 사진뿐 아니라 상위 섹션까지 선택하여 이동·삭제할 수 있어요.</small></div><label class="eyebrow" for="uScope">편집 범위 선택</label><select class="u-scope-select" id="uScope">${sel}</select><form id="uContentForm"><div class="formgrid">${editFields||'<div class="fine span2">이 영역은 아래 버튼으로 순서 이동·삭제하거나, 하위 문장/사진을 직접 선택해 수정할 수 있어요.</div>'}</div>${editFields?'<div class="modal-actions"><button class="btn primary" type="submit">내용 저장</button></div>':''}</form><div class="u-control-row"><button type="button" class="btn" id="uMoveUp">↑ 앞쪽으로</button><button type="button" class="btn" id="uMoveDown">↓ 뒤쪽으로</button><button type="button" class="btn" id="uAddText">＋ 글 추가</button><button type="button" class="btn" id="uAddPhoto">＋ 사진 추가</button><button type="button" class="btn" id="uHide">${hidden?'↶ 삭제 취소':'✕ 선택 요소 삭제'}</button></div><p class="u-inspector-warning">삭제는 화면에서 제거하는 방식으로 적용되며 목록에서 복구할 수 있습니다. 순서는 같은 영역 안에서 이동해요. 챕터 전체 순서는 기존 ‘↕ 순서’에서 바꿀 수 있습니다.</p><div class="modal-actions"><button type="button" class="btn" data-close>닫기</button></div>`);
 $('#uScope').onchange=e=>{const other=uElementByKey(e.target.value);if(other)uInspect(other)};
 if(editFields)$('#uContentForm').onsubmit=async e=>{
   e.preventDefault();let changed=false;
   if(text){state.universal.texts[chosen]=read(e.currentTarget,'uTextValue');changed=true}
   if(hasHref){state.universal.links[chosen]=read(e.currentTarget,'uHref');changed=true}
   const file=$('#uPhotoFile')?.files?.[0];if(file){try{state.universal.images[chosen]=await photoData(file,1500,.78);changed=true}catch(err){toast('이미지를 읽지 못했습니다.');return}}
   if(changed){commit('요소를 수정했습니다.');closeModal()}else toast('변경할 내용을 선택해 주세요.')
 };
 $('#uMoveUp').onclick=()=>{uMove(el,-1);closeModal()};$('#uMoveDown').onclick=()=>{uMove(el,1);closeModal()};
 $('#uHide').onclick=()=>{state.universal.hidden[chosen]=!state.universal.hidden[chosen];commit(state.universal.hidden[chosen]?'화면에서 요소를 삭제했습니다. 목록에서 복구할 수 있습니다.':'삭제를 취소했습니다.');closeModal()};
 $('#uAddText').onclick=()=>uAdd(chosen,'text');$('#uAddPhoto').onclick=()=>uAdd(chosen,'photo');
}
function uAdd(anchor,kind){
 openModal(kind==='photo'?'여기에 새 사진 추가':'여기에 새 글 추가',`<form id="uInsertForm"><div class="formgrid">${kind==='photo'?'<div class="field span2"><label>사진 업로드</label><input type="file" name="upload" accept="image/*" required></div>':field('text','새 문장', '', 'textarea',true)}<div class="field span2"><label>위치</label><select name="side"><option value="after">선택한 요소 다음</option><option value="before">선택한 요소 앞</option></select></div></div>${footerButtons()}</form>`);
 $('#uInsertForm').onsubmit=async e=>{
 e.preventDefault();const f=e.currentTarget,side=read(f,'side'),item={id:uid('u-new'),kind,anchor,side};
 if(kind==='photo'){const file=f.elements.namedItem('upload').files[0];if(!file)return;try{item.src=await photoData(file,1450,.75)}catch(err){toast('사진을 읽을 수 없습니다.');return}}
 else{item.text=read(f,'text');if(!item.text){toast('내용을 입력해 주세요.');return}}
 state.universal.added.push(item);commit('새 콘텐츠를 추가했습니다.');closeModal()
 }
}
function uList(photosOnly=false){
 const list=photosOnly?uPhotoCandidates():$$('main [data-u-text],main [data-direct-copy],main [data-u-stable],main [data-u-photo],main img,main .hero-photo,main .detail-photo,main .image-cover,main .stay-box,main .record,main .reflection,main .city-ordered-section,main .memory-part,main .free-block,main .impression-card,main .sect-head,main .route-map,main .cost-card,main .u-added,main [data-u-hidden],header [data-u-hidden],footer [data-u-hidden],header .brand,footer p,footer a');
 const items=Array.from(new Map(list.filter(n=>n.dataset.uKey&&!uIgnore(n)).map(n=>[n.dataset.uKey,n])).values());
 const pages=['all',...new Set(items.map(uPageId))];
 openModal(photosOnly?'사진 전체 목록 · 교체 · 삭제':'모든 텍스트 · 사진 · 카드 목록',`<p class="fine">찾으려는 콘텐츠를 검색하거나 페이지를 선택하세요. 숨긴 요소도 목록에서 복구할 수 있어요.</p><div class="searchtools"><input class="selectx" style="flex:1;min-width:150px" id="uListSearch" placeholder="문구·장소·사진 검색"><select class="selectx" id="uListPage">${pages.map(id=>`<option value="${esc(id)}">${esc(id==='all'?'전체 페이지':pageLabel(id)?.title||id)}</option>`).join('')}</select></div><div class="u-list-results" id="uListResults"></div><div class="modal-actions"><button type="button" class="btn" data-close>닫기</button></div>`);
 const show=()=>{const q=$('#uListSearch').value.trim().toLowerCase(),page=$('#uListPage').value;
 const found=items.filter(n=>(page==='all'||uPageId(n)===page)&&(!q||uElementName(n).toLowerCase().includes(q))).slice(0,150);
 $('#uListResults').innerHTML=(found.length?found.map(n=>{const key=n.dataset.uKey,h=!!state.universal.hidden[key],label=uElementName(n),src=n.tagName==='IMG'?n.src:'';
 return `<div class="u-list-item">${src?`<img src="${esc(src)}" alt="">`:''}<span class="u-list-label ${h?'u-hidden-label':''}" title="${esc(label)}">${h?'[삭제됨] ':''}${esc(label)}</span><button class="btn" type="button" data-u-open="${esc(key)}">${h?'복구·편집':'선택'}</button></div>`}).join(''):'<p class="fine">해당하는 항목이 없습니다.</p>')};show();$('#uListSearch').oninput=show;$('#uListPage').onchange=show;
 $('#uListResults').onclick=e=>{const b=e.target.closest('[data-u-open]');if(b){const n=uElementByKey(b.dataset.uOpen);if(n){uInspect(n);n.scrollIntoView({block:'center',behavior:'smooth'})}}};
}
function uPickTarget(el){
 if(el.closest('.journey-svg text'))return el.closest('.journey-svg text');
 if(el.closest('.u-added'))return el.closest('.u-added');
 if(el.closest('[data-u-text],[data-direct-copy]'))return el.closest('[data-u-text],[data-direct-copy]');
 if(el.closest('img'))return el.closest('img');
 const block=el.closest('.record,.reflection,.reflection-act,.answer-card,.memory-part,.stay-box,.impression-card,.free-block,.filmcard,.cost-card,.route-map,.sect-head,.city-ordered-section,.chapter-detail,.city-section,.custom-chapter');
 return block||el.closest('[data-u-key]')
}

function renderAll(){uCleanup();hero();renderCities();renderCustomPages();renderPageOrder();renderJourney();renderSVGText();renderRecords();renderReflections();renderExpenses();renderImpressions();renderCredits();renderPageBlocks();decorateCopyTexts();uApply();$$('[data-city-pick]').forEach(b=>b.setAttribute('aria-selected',b.dataset.cityPick===activeCity?'true':'false'));$('#cityFilter').innerHTML='<option value="all">모든 도시</option>'+state.cities.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');$('#cityFilter').value=filterCity;$('#searchInput').value=search;lbAddControls();$$('main img').forEach(im=>{if(!im.closest('button,a,.edit-only')){im.tabIndex=0;im.dataset.photoZoom='1';im.setAttribute('aria-label',(im.alt||'여행 사진')+' 크게 보기')}})}
function toggleEditing(force){if(force!==false&&!window.Archive.admin){window.Archive.login();return}editing=typeof force==='boolean'?force:!editing;if(!editing)uPick(false);document.body.classList.toggle('editing',editing);if(!editing){directCopyMode=false;document.body.classList.remove('copy-editing');$('#directEditToggle').textContent='✎ 문구'}$('#editToggle').textContent=editing?'✓ 편집 끝내기':'✎ 기록 편집';toast(editing?'각 섹션의 수정 버튼과 사진·글 추가 기능이 나타났습니다.':'읽기 모드로 전환했습니다.')}
function openModal(title,body){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=body;$('#modalWrap').classList.add('open');document.body.style.overflow='hidden';setTimeout(()=>$('#modalBody input, #modalBody textarea')?.focus(),60)}
function closeModal(){$('#modalWrap').classList.remove('open');document.body.style.overflow=''}
const field=(key,label,value,kind='text',span=false)=>`<div class="field ${span?'span2':''}"><label for="f-${esc(key)}">${esc(label)}</label>${kind==='textarea'?`<textarea id="f-${esc(key)}" name="${esc(key)}">${esc(value)}</textarea>`:`<input id="f-${esc(key)}" type="${esc(kind)}" ${kind==='number'?'step="any" min="0"':''} name="${esc(key)}" value="${esc(value)}">`}</div>`;
const footerButtons=(extra='')=>`<div class="modal-actions">${extra}<button class="btn" type="button" data-close>취소</button><button class="btn primary" type="submit">변경사항 저장</button></div>`;
function setCityFromModal(id){const c=cityBy(id);openModal('도시 챕터 편집',`<form id="cityForm" data-id="${esc(id)}"><div class="formgrid">${field('name','도시 이름',c.name)}${field('latin','도시 영문 표기',c.latin)}${field('country','나라 표기',c.country)}${field('theme','도시 테마',c.theme)}${field('map','지도 검색어',c.map)}${field('headline','챕터 제목',c.headline,'text',true)}${field('intro','도시 소개',c.intro,'textarea',true)}${field('memory','우리가 기억할 문장',c.memory,'textarea',true)}${field('duration','체류 일수 · 확인 후 수정',c.duration)}<div class="field"><label for="cityPhoto">직접 찍은 사진으로 교체</label><input id="cityPhoto" type="file" accept="image/*"><small class="fine">사진은 브라우저에서 압축되어 저장됩니다.</small></div></div><div class="hintbox">사진 변경은 이 도시의 카드와 챕터에 함께 적용됩니다. 대화에서 확인되지 않은 실제 감상은 직접 작성해 주세요.</div>${footerButtons('<button type="button" class="btn" id="clearCityPhoto">사진 초기화</button>')}</form>`);
 $('#clearCityPhoto').onclick=()=>{if(confirm('이 도시의 개인 사진을 지우고 참고 이미지로 되돌릴까요?')){c.image='';commit('도시 사진을 초기화했습니다.');closeModal()}};
 $('#cityForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;['name','latin','country','theme','map','headline','intro','memory','duration'].forEach(k=>c[k]=read(f,k));const img=$('#cityPhoto').files[0];if(img){try{c.image=await photoData(img)}catch(err){toast('사진을 읽지 못했습니다.');return}}commit('도시 기록을 수정했습니다.');closeModal()};}
function editMeta(){openModal('표지와 엔딩 문장',`<form id="metaForm"><div class="formgrid">${field('headline','영문 표지 문구',state.meta.headline,'text',true)}${field('title','한국어 제목',state.meta.title,'text',true)}${field('subtitle','짧은 여행 소개',state.meta.subtitle,'textarea',true)}${field('closing','엔딩 문장',state.meta.closing,'textarea',true)}<div class="field span2"><label>엔딩 배경 사진</label><input type="file" id="epilogueFile" accept="image/*"></div><div class="field"><label>표지 도시 선택</label><select name="coverCity">${state.cities.map(c=>`<option value="${esc(c.id)}" ${c.id===state.meta.coverCity?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label>표지용 개인 사진</label><input type="file" accept="image/*" id="coverFile"></div></div><div class="hintbox">표지 사진은 선택 사항입니다. 도시 사진을 선택하면 해당 도시의 이미지를 표지에 사용합니다.</div>${footerButtons('<button class="btn" type="button" id="clearCover">표지 사진 초기화</button><button class="btn" type="button" id="clearEpilogue">엔딩 사진 삭제</button>')}</form>`);$('#clearEpilogue').onclick=()=>{state.meta.epilogueImage='';commit('엔딩 사진을 초기화했습니다.');closeModal()};$('#clearCover').onclick=()=>{state.meta.coverImage='';commit('표지 사진이 초기화되었습니다.');closeModal()};$('#metaForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;['headline','title','subtitle','closing','coverCity'].forEach(k=>state.meta[k]=read(f,k));if($('#coverFile').files[0])try{state.meta.coverImage=await photoData($('#coverFile').files[0])}catch(err){toast('사진 업로드를 확인해 주세요.');return}if($('#epilogueFile').files[0])try{state.meta.epilogueImage=await photoData($('#epilogueFile').files[0])}catch(err){toast('엔딩 사진을 확인해 주세요.');return}commit('표지와 엔딩을 저장했습니다.');closeModal()}}
/* Optional fourth argument crops the actual saved JPEG to 3:4 portrait, not merely the CSS frame. */
function photoData(file,maxWidth=2400,quality=.9,portraitRatio=null){
if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||file.size>12*1024*1024)return Promise.reject(Error('JPG/PNG/WebP/GIF, 최대 12MB')); 
 return new Promise((resolve,reject)=>{
  if(!file.type.startsWith('image/'))return reject(new Error('not image'));
  const reader=new FileReader(); reader.onerror=reject;
  reader.onload=()=>{
   const img=new Image();img.onerror=reject;
   img.onload=()=>{
    let sx=0,sy=0,sw=img.naturalWidth,sh=img.naturalHeight;
    if(portraitRatio){
     if(sw/sh>portraitRatio){const cropWidth=sh*portraitRatio;sx=(sw-cropWidth)/2;sw=cropWidth}
     else {const cropHeight=sw/portraitRatio;sy=(sh-cropHeight)/2;sh=cropHeight}
    }
    const w=Math.max(1,Math.min(maxWidth,Math.round(sw)));
    const h=portraitRatio?Math.max(4,Math.round(w/portraitRatio)):Math.max(1,Math.round(sh*w/sw));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h);
    resolve(canvas.toDataURL('image/jpeg',quality));
   }; img.src=reader.result;
  }; reader.readAsDataURL(file);
 });
}
function recordModal(id,proposedCity,proposedPart){
 const exists=state.entries.find(r=>r.id===id),city=proposedCity||activeCity;
 if(!(state.memoryParts?.[city]||[]).length){toast('먼저 이 도시의 Memory Index 파트를 추가해 주세요.');partModal(city);return}
 const r=exists?{...exists}:{id:uid('record'),city,type:'기타',title:'',status:'방문 확인',date:'',description:'',map:'',image:'',partId:proposedPart||state.memoryParts[city][0].id};
 const selectCity=`<div class="field"><label>도시</label><select name="city" id="recordCity">${state.cities.map(c=>`<option value="${esc(c.id)}" ${c.id===r.city?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>`;
 const choices=cid=>(state.memoryParts[cid]||[]).map(p=>`<option value="${esc(p.id)}" ${p.id===r.partId?'selected':''}>${esc(p.title)}</option>`).join('');
 openModal(exists?'Memory Index 기록 수정':'새로운 Memory Index 기록',`<form id="recordForm"><div class="formgrid">${selectCity}<div class="field"><label>소속 파트</label><select name="partId" id="recordPart">${choices(r.city)}</select></div>${field('type','기록 종류 (자유 입력)',r.type)}${field('title','기록 제목',r.title,'text',true)}${field('date','날짜 · 모르면 비우기',r.date)}${field('description','기록 / 코멘트',r.description,'textarea',true)}${field('map','구글 지도 검색어 · 선택',r.map,'text',true)}<div class="field span2"><label>Memory Index 사진</label>${r.image?`<img src="${esc(r.image)}" alt="현재 기록 사진" style="width:100%;max-height:240px;object-fit:cover;margin:9px 0">`:''}<input type="file" accept="image/*" id="recordPhoto"><small class="fine">사진을 추가하면 HTML 저장 시 파일 안에 포함돼요.</small></div></div>${footerButtons(`<button type="button" class="btn" id="clearRecordPhoto">사진 삭제</button>${exists?'<button type="button" class="btn" id="deleteRecord">기록 삭제</button>':''}`)}</form>`);
 $('#recordCity').onchange=e=>{$('#recordPart').innerHTML=choices(e.target.value)};
 $('#clearRecordPhoto').onclick=()=>{r.image='';if(exists){Object.assign(exists,r);commit('기록 사진을 지웠습니다.')}closeModal()};
 if(exists)$('#deleteRecord').onclick=()=>{if(confirm('이 기록을 삭제할까요?')){state.entries=state.entries.filter(x=>x.id!==id);commit('기록을 삭제했습니다.');closeModal()}};
 $('#recordForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;['city','partId','type','title','date','description','map'].forEach(k=>r[k]=read(f,k));if(!r.title){toast('제목을 입력해 주세요.');return}const valid=state.memoryParts?.[r.city]||[];if(!valid.some(p=>p.id===r.partId))r.partId=valid[0].id;
 const file=$('#recordPhoto').files[0];if(file)try{r.image=await photoData(file,1200,.8)}catch(err){toast('사진을 읽지 못했습니다.');return};
 if(exists)Object.assign(exists,r);else state.entries.unshift(r);commit('Memory Index 기록을 저장했습니다.');closeModal()};
}

function stayModal(id){
 const s=stayBy(id),draft={...s,photos:(s.photos||[]).map(p=>({...p}))};
 openModal(cityBy(id).name+' · 숙소 편집',`<form id="stayForm" data-id="${esc(id)}"><div class="formgrid">${field('name','숙소 이름 또는 별칭',draft.name,'text',true)}${field('address','주소',draft.address,'text',true)}${field('period','숙박 일정',draft.period)}${field('checkin','체크인',draft.checkin)}${field('checkout','체크아웃',draft.checkout)}${field('mapUrl','숙소 구글 지도 링크',draft.mapUrl,'text',true)}<div class="field span2"><label for="stayNotes">짧은 숙소 메모</label><textarea class="stay-note-input" rows="3" name="notes" id="stayNotes" placeholder="한두 줄의 기억을 남겨 주세요.">${esc(draft.notes||'')}</textarea></div><div class="field span2"><label>현재 숙소 사진 · 개별 삭제 및 순서 변경</label><div id="stayPhotosEditor" class="edit-photos"></div><label for="stayPhoto">사진 여러 장 추가</label><input type="file" accept="image/*" id="stayPhoto" multiple><small class="fine">여러 장을 한 번에 선택할 수 있어요. 사진은 자동으로 크기를 줄여 HTML 안에 저장합니다.</small></div></div><div class="hintbox">보안을 위해 출입 비밀번호와 와이파이 비밀번호는 저장하지 마세요. 파일을 저장하면 사진도 함께 들어갑니다.</div>${footerButtons('<button class="btn" type="button" id="clearAllStayPhotos">모든 사진 삭제</button>')}</form>`);
 const show=()=>{$('#stayPhotosEditor').innerHTML=draft.photos.length?draft.photos.map((p,i)=>`<div class="edit-photo-item"><img src="${esc(p.src)}" alt="숙소 사진 ${i+1}"><div class="edit-photo-actions"><button type="button" data-stay-shift="${i}" data-step="-1" ${i===0?'disabled':''}>↑</button><button type="button" data-stay-shift="${i}" data-step="1" ${i===draft.photos.length-1?'disabled':''}>↓</button><button type="button" data-stay-delete="${i}">삭제</button></div></div>`).join(''):'<div class="fine">추가한 사진이 아직 없습니다.</div>'};
 show();
 $('#stayPhotosEditor').onclick=e=>{const del=e.target.closest('[data-stay-delete]'),shift=e.target.closest('[data-stay-shift]');if(del){draft.photos.splice(Number(del.dataset.stayDelete),1);show()}else if(shift){const i=Number(shift.dataset.stayShift),j=i+Number(shift.dataset.step);if(j<0||j>=draft.photos.length)return;[draft.photos[i],draft.photos[j]]=[draft.photos[j],draft.photos[i]];show()}};
 $('#clearAllStayPhotos').onclick=()=>{if(confirm('숙소 사진을 모두 지울까요?')){draft.photos=[];show()}};
 $('#stayForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;['name','address','period','checkin','checkout','mapUrl','notes'].forEach(k=>draft[k]=read(f,k));const files=Array.from($('#stayPhoto').files);for(const file of files){try{draft.photos.push({id:uid('stay-photo'),src:await photoData(file,1200,.8)})}catch(err){toast('사진 파일 중 일부를 읽지 못했습니다.');return}}draft.image=draft.photos[0]?.src||'';if(!state.stays)state.stays={};state.stays[id]=draft;commit('숙소 메모와 사진을 저장했습니다.');closeModal()};
}
function uid(prefix){return prefix+'-'+Date.now()+'-'+Math.floor(Math.random()*100000)}
function partModal(cityId,id){
 const parts=state.memoryParts[cityId]||[],exist=parts.find(p=>p.id===id),p=exist||{id:uid('part'),title:'',description:''};
 openModal(`${cityBy(cityId).name} · ${exist?'파트 수정':'새 파트'}`,`<form id="partForm"><div class="formgrid">${field('title','파트 제목',p.title,'text',true)}${field('description','파트 설명 / 선택',p.description,'textarea',true)}</div><div class="hintbox">파트를 추가한 뒤, 그 안에서 새 기록을 만들거나 기존 기록의 소속 파트를 바꿀 수 있어요.</div>${footerButtons()}</form>`);
 $('#partForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;const title=read(f,'title');if(!title){toast('파트 제목을 입력해 주세요.');return}p.title=title;p.description=read(f,'description');if(!exist)parts.push(p);commit('Memory Index 파트를 저장했습니다.');closeModal()};
}
function movePart(cid,pid,dir){const parts=state.memoryParts?.[cid]||[];const index=parts.findIndex(p=>p.id===pid),other=index+(dir==='up'?-1:1);if(index<0||other<0||other>=parts.length)return;[parts[index],parts[other]]=[parts[other],parts[index]];commit('파트 순서를 변경했습니다.')}
function deletePart(cid,pid){const parts=state.memoryParts?.[cid]||[],part=parts.find(p=>p.id===pid);if(!part)return;const affected=state.entries.filter(r=>r.city===cid&&r.partId===pid).length;if(!confirm(`'${part.title}' 파트를 삭제할까요?${affected?'\n포함된 '+affected+'개 기록은 다른 파트로 옮겨 보존됩니다.':''}`))return;
 state.memoryParts[cid]=parts.filter(p=>p.id!==pid);if(!state.memoryParts[cid].length&&affected>0)state.memoryParts[cid].push({id:uid('part'),title:'그 밖의 기록',description:'삭제한 파트의 기록을 보관합니다.'});
 const fallback=state.memoryParts[cid][0].id;for(const r of state.entries)if(r.city===cid&&r.partId===pid)r.partId=fallback;commit('파트를 삭제하고 기록은 보관했습니다.')}
function promptModal(id,preferredGroup){
 const original=state.prompts.find(p=>p.id===id);
 const fallback=state.voiceGroups[state.voiceGroups.length-1]?.id||'04 / OUR OWN';
 const p=original?{...original}:{id:uid('prompt'),title:'',hint:'',act:preferredGroup||fallback};
 const groups=state.voiceGroups;
 openModal(original?'Two Voices · 질문 수정':'Two Voices · 새 질문',`<form id="promptForm"><div class="formgrid">${field('title','질문 / 항목 제목',p.title,'text',true)}${field('hint','짧은 안내 문장 (선택)',p.hint,'text',true)}<div class="field span2"><label>질문을 넣을 묶음</label><select name="act">${groups.map(g=>`<option value="${esc(g.id)}" ${g.id===p.act?'selected':''}>${esc(g.title)}</option>`).join('')}</select></div></div><div class="hintbox">각 질문에는 원희와 은정이 사진, 제목, 코멘트를 따로 남길 수 있어요.</div>${footerButtons()}</form>`);
 $('#promptForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;const title=read(f,'title');if(!title){toast('질문 제목을 입력해 주세요.');return}Object.assign(p,{title,hint:read(f,'hint'),act:read(f,'act')});if(original)Object.assign(original,p);else{const sameAct=state.prompts.map((v,i)=>v.act===p.act?i:-1).filter(i=>i>=0);state.prompts.splice(sameAct.length?sameAct[sameAct.length-1]+1:state.prompts.length,0,p)}commit('Two Voices 질문을 저장했습니다.');closeModal()};
}
function movePrompt(id,delta){
 const current=state.prompts.find(p=>p.id===id);if(!current)return;
 const list=state.prompts.filter(p=>p.act===current.act),i=list.findIndex(p=>p.id===id),next=list[i+delta];if(!next)return;
 const a=state.prompts.indexOf(current),b=state.prompts.indexOf(next);
 [state.prompts[a],state.prompts[b]]=[state.prompts[b],state.prompts[a]];commit('묶음 안에서 질문 순서를 변경했습니다.');
}
function moveVoiceGroup(id,delta){
 const a=state.voiceGroups.findIndex(g=>g.id===id),b=a+delta;
 if(a<0||b<0||b>=state.voiceGroups.length)return;
 [state.voiceGroups[a],state.voiceGroups[b]]=[state.voiceGroups[b],state.voiceGroups[a]];
 commit('Two Voices 묶음 순서를 변경했습니다.');
}
function deletePrompt(id){const prompt=state.prompts.find(p=>p.id===id);if(!prompt)return;if(!confirm(`'${prompt.title}' 질문을 삭제할까요? 원희·은정의 답변도 함께 삭제됩니다.`))return;state.prompts=state.prompts.filter(p=>p.id!==id);delete state.answers[id];commit('질문을 삭제했습니다.')}
function voiceGroupModal(id){
 const original=state.voiceGroups.find(g=>g.id===id),g=original?{...original}:{id:uid('voice-group'),title:'',description:''};
 openModal(original?'Two Voices · 묶음 수정':'Two Voices · 새 묶음',`<form id="voiceGroupForm"><div class="formgrid">${field('title','묶음 제목',g.title,'text',true)}${field('description','묶음 소개 (선택)',g.description,'textarea',true)}</div>${footerButtons(original?'<button class="btn" id="removeVoiceGroup" type="button">묶음 삭제</button>':'')}</form>`);
 $('#voiceGroupForm').onsubmit=e=>{e.preventDefault();const title=read(e.currentTarget,'title');if(!title){toast('제목을 입력해 주세요.');return}g.title=title;g.description=read(e.currentTarget,'description');if(original)Object.assign(original,g);else state.voiceGroups.push(g);commit('Two Voices 묶음을 저장했습니다.');closeModal()};
 if(original)$('#removeVoiceGroup').onclick=()=>{
  if(state.voiceGroups.length<2){toast('최소 하나의 묶음은 남겨야 합니다.');return}
  const destination=state.voiceGroups.find(v=>v.id!==id);
  const cnt=state.prompts.filter(p=>p.act===id).length;
  if(!confirm(`이 묶음을 삭제할까요? 안의 질문 ${cnt}개와 답변은 '${destination.title}' 묶음으로 옮겨 보관합니다.`))return;
  for(const p of state.prompts)if(p.act===id)p.act=destination.id;
  state.voiceGroups=state.voiceGroups.filter(v=>v.id!==id);
  commit('묶음을 삭제하고 질문과 답변은 보관했습니다.');closeModal();
 };
}
function promptManager(){
 const show=()=>{
  const root=$('#promptOrderList');if(!root)return;
  root.innerHTML=state.voiceGroups.map((g,gi)=>{
   const groupPrompts=state.prompts.filter(p=>p.act===g.id);
   return `<section class="voice-manage-group"><div class="voice-manage-heading"><div><strong>${esc(g.title)}</strong>${g.description?`<small>${esc(g.description)}</small>`:''}</div><div class="voice-manage-controls"><button type="button" aria-label="${esc(g.title)} 묶음을 위로" title="묶음을 위로" data-move-voice-group="${esc(g.id)}" data-step="-1" ${gi===0?'disabled':''}>↑</button><button type="button" aria-label="${esc(g.title)} 묶음을 아래로" title="묶음을 아래로" data-move-voice-group="${esc(g.id)}" data-step="1" ${gi===state.voiceGroups.length-1?'disabled':''}>↓</button><button type="button" data-edit-voice-group="${esc(g.id)}">묶음 편집</button></div></div><div class="voice-manage-questions">${groupPrompts.map((p,i)=>`<div class="order-row"><div class="order-row-label">${esc(p.title)}<small>${esc(p.hint||'')}</small></div><div class="order-row-actions"><button type="button" data-manage-prompt="${esc(p.id)}" data-step="-1" ${i===0?'disabled':''}>↑</button><button type="button" data-manage-prompt="${esc(p.id)}" data-step="1" ${i===groupPrompts.length-1?'disabled':''}>↓</button></div></div>`).join('')||'<div class="voice-empty">아직 질문이 없습니다.</div>'}</div><button class="btn voice-manage-add" type="button" data-add-voice-question="${esc(g.id)}">＋ 이 묶음에 질문 추가</button></section>`
  }).join('');
 };
 openModal('Two Voices · 묶음과 질문 순서',`<p class="fine">묶음은 묶음끼리, 질문은 해당 묶음 안에서 순서를 바꿀 수 있어요. 다른 묶음으로 질문을 옮기려면 '질문 수정'에서 묶음을 선택해 주세요.</p><div id="promptOrderList" class="order-list"></div><div class="modal-actions"><button class="btn" type="button" id="addVoiceGroup">＋ 새 묶음</button><button class="btn primary" id="donePromptOrder" type="button">완료</button></div>`);
 show();
 $('#promptOrderList').onclick=e=>{
  const group=e.target.closest('[data-move-voice-group]');if(group){moveVoiceGroup(group.dataset.moveVoiceGroup,Number(group.dataset.step));show();return}
  const question=e.target.closest('[data-manage-prompt]');if(question){movePrompt(question.dataset.managePrompt,Number(question.dataset.step));show();return}
  const edit=e.target.closest('[data-edit-voice-group]');if(edit){voiceGroupModal(edit.dataset.editVoiceGroup);return}
  const add=e.target.closest('[data-add-voice-question]');if(add){promptModal(null,add.dataset.addVoiceQuestion);return}
 };
 $('#addVoiceGroup').onclick=()=>voiceGroupModal(null);
 $('#donePromptOrder').onclick=closeModal;
}
function voiceModal(promptId,person){const p=state.prompts.find(v=>v.id===promptId);if(!p)return;const name=person==='a'?'원희':'은정',old=getVoice(promptId,person),v={...old};
 openModal(name+' · '+p.title,`<form id="voiceForm"><div class="formgrid">${field('title','나의 제목',v.title,'text',true)}${field('comment','코멘트 / 그날의 기억',v.comment,'textarea',true)}<div class="field span2"><label>이 의견에 남길 사진</label>${v.image?`<img src="${esc(v.image)}" alt="현재 등록한 사진" style="width:100%;max-height:240px;object-fit:cover;margin:9px 0">`:''}<input type="file" id="voicePhoto" accept="image/*"><small class="fine">촬영한 사진을 넣으면 HTML 파일에 포함됩니다.</small></div></div>${footerButtons('<button type="button" class="btn" id="clearVoicePhoto">사진 삭제</button>')}</form>`);
 $('#clearVoicePhoto').onclick=()=>{v.image='';commitVoice('사진을 삭제했습니다.')};
 function commitVoice(message){if(!state.answers)state.answers={};if(!state.answers[promptId])state.answers[promptId]={};state.answers[promptId][person]=v;commit(message);closeModal()}
 $('#voiceForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;v.title=read(f,'title');v.comment=read(f,'comment');const file=$('#voicePhoto').files[0];if(file)try{v.image=await photoData(file)}catch(err){toast('사진을 읽지 못했습니다.');return}commitVoice(name+'의 기록을 저장했습니다.')};
}

function scheduleModal(id){const it=(state.itinerary||[]).find(i=>i.id===id);if(!it)return;openModal('여행 일정 수정',`<form id="scheduleForm"><div class="formgrid">${field('date','날짜 또는 기간',it.date)}<div class="field"><label>도시</label><select name="city">${state.cities.map(c=>`<option value="${esc(c.id)}" ${c.id===it.city?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>${field('title','이동 또는 일정 제목',it.title,'text',true)}${field('detail','상세 메모',it.detail,'textarea',true)}${field('source','기록 구분 (예: 일정표 확인)',it.source,'text',true)}</div>${footerButtons()}</form>`);$('#scheduleForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;['date','city','title','detail','source'].forEach(k=>it[k]=read(f,k));commit('일정을 수정했습니다.');closeModal()}}
function expenseModal(){
 const amount=(typeof state.totalExpenseKRW==='number'&&Number.isFinite(state.totalExpenseKRW))?String(state.totalExpenseKRW):'';
 openModal('여행 총금액 입력 · 원화',`<form id="expenseTotalForm"><div class="formgrid">${field('totalExpenseKRW','전체 여행 지출 (원, KRW)',amount,'number',true)}</div><p class="fine" style="margin:14px 0 0">항목별 내역 없이 총금액 하나만 기록해요. 입력하지 않으면 금액을 비워둘 수 있어요.</p>${footerButtons()}</form>`);
 $('#expenseTotalForm').onsubmit=e=>{e.preventDefault();const v=read(e.currentTarget,'totalExpenseKRW').trim();if(v===''){state.totalExpenseKRW=null}else{const n=Number(v);if(!Number.isSafeInteger(n)||n<0){toast('0 이상의 원화 정수 금액을 입력해 주세요.');return}state.totalExpenseKRW=n}commit('여행 총금액을 저장했습니다.');closeModal()};
}
function downloadBlob(name,mime,content){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function exportHTML(){
try{const clone=document.documentElement.cloneNode(true);clone.querySelector('#archiveBar')?.remove();clone.querySelector('body').classList.remove('editing','copy-editing','u-picking','archive-admin');clone.querySelector('#modalWrap')?.classList.remove('open');clone.querySelector('#modalBody').innerHTML='';clone.querySelector('#archive-data').textContent=JSON.stringify(state).replace(/</g,'\\u003c');
for(const link of clone.querySelectorAll('link[rel="stylesheet"]')){const r=await fetch(link.href);if(!r.ok)throw Error('CSS');const style=document.createElement('style');style.textContent=await r.text();link.replaceWith(style)}
for(const script of clone.querySelectorAll('script[src]')){const r=await fetch(script.src);if(!r.ok)throw Error('JS');const text=await r.text();script.removeAttribute('src');script.textContent=text.replace(/<\/script/gi,'<\\/script')}
let html='<!doctype html>\n'+clone.outerHTML;const names=[...new Set(html.match(/images\/[a-f0-9]+\.(?:jpg|png|webp|gif)/g)||[])];for(const name of names){const r=await fetch(name);if(!r.ok)throw Error(name);const blob=await r.blob();const data=await new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=no;f.readAsDataURL(blob)});html=html.split(name).join(data)}downloadBlob('우리의_신혼여행_전체백업.html','text/html;charset=utf-8',html);toast('사진과 코드가 포함된 HTML 백업을 저장했습니다.')
}catch(e){toast('HTML 백업 실패: '+e.message+' · JSON 백업을 사용하세요.')}
}
async function exportJSON(){try{let text=JSON.stringify(state,null,2);const refs=[...new Set(text.match(/images\/[a-f0-9]+\.(?:jpg|png|webp|gif)/g)||[])];for(const ref of refs){const r=await fetch(ref);if(!r.ok)throw Error(ref);const blob=await r.blob();const url=await new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=no;f.readAsDataURL(blob)});text=text.split(ref).join(url)}downloadBlob('신혼여행_기록_백업.json','application/json;charset=utf-8',text);toast('사진이 포함된 JSON 백업을 저장했습니다.');return true}catch(e){toast('백업 실패: '+e.message);return false}}

function importJSON(file){const reader=new FileReader();reader.onload=async()=>{try{const o=JSON.parse(reader.result);window.Archive.validate(o);if(!confirm('현재 기록을 JSON으로 백업한 뒤 백업 파일의 내용으로 덮어쓸까요?'))return;if(!await exportJSON())return;state={...base,...o};prepareState();activeCity='florence';search='';filterCity='all';commit('백업을 불러왔습니다.')}catch(e){toast('올바른 아카이브 백업 파일이 아닙니다.')}};reader.readAsText(file)}
// Event delegation and automatic persistence
const doUniversalToggle=()=>{if(!editing)toggleEditing(true);uPick(!universalPick);toast(universalPick?'문장·사진·카드를 클릭해 편집하고 순서를 조절하세요.':'전체 요소 편집을 종료했습니다.')};
$('#universalButton').onclick=doUniversalToggle;$('#universalMobileButton').onclick=doUniversalToggle;$('#uFinishBtn').onclick=()=>uPick(false);$('#uListBtn').onclick=()=>uList(false);$('#uPhotoListBtn').onclick=()=>uList(true);
document.addEventListener('click',e=>{if(!universalPick||!editing||e.target.closest('.universal-dock,.modal-backdrop,.headtools,.edit-only,.edit-badge,.toast'))return;const n=uPickTarget(e.target);if(!n||!uMainArea(n)||uIgnore(n))return;e.preventDefault();e.stopImmediatePropagation();uInspect(n)},true);
$('#directEditToggle').onclick=()=>{directCopyMode=!directCopyMode;document.body.classList.toggle('copy-editing',directCopyMode);$('#directEditToggle').textContent=directCopyMode?'✓ 문구 편집 끝':'✎ 문구';toast(directCopyMode?'화면의 밑줄 친 문장을 누르면 바꿀 수 있어요.':'문구 편집을 종료했습니다.')};$('#pageOrderBtn').onclick=pageOrderModal;$('#pageOrderHere').onclick=pageOrderModal;$('#newPrompt').onclick=()=>promptModal(null);$('#managePrompts').onclick=promptManager;
$('#editToggle').onclick=()=>toggleEditing();$('#downloadHTML').onclick=exportHTML;$('#backupJSON').onclick=exportJSON;$('#importJSON').onclick=()=>$('#importFile').click();$('#importFile').onchange=e=>{if(e.target.files[0])importJSON(e.target.files[0]);e.target.value=''};$('#resetAll').onclick=()=>{if(confirm('모든 수정 내용과 추가 기록을 초기 상태로 되돌릴까요? 먼저 HTML 또는 JSON 백업을 권장합니다.')){state=JSON.parse(JSON.stringify(base));try{localStorage.removeItem(STORE)}catch(e){}search='';filterCity='all';activeCity='florence';persist();renderAll();toast('초기 상태로 되돌렸습니다.')}};
$('#mobileMenu').onclick=()=>{$('#topnav').classList.toggle('open')};$('#topnav').addEventListener('click',e=>{if(e.target.closest('a'))$('#topnav').classList.remove('open')});
$('#searchInput').oninput=e=>{search=e.target.value;renderRecords()};$('#cityFilter').onchange=e=>{filterCity=e.target.value;renderRecords()};
$('#addRecord').onclick=()=>recordModal(null);$('#addExpense').onclick=expenseModal;

document.addEventListener('click',e=>{const routeLetter=e.target.closest('.journey-svg text[data-svg-copy]');if(routeLetter&&editing&&directCopyMode){svgCopyModal(routeLetter);return}const direct=e.target.closest('[data-direct-copy]');if(direct&&editing&&directCopyMode){directCopyModal(direct);return}const editOwnPage=e.target.closest('[data-custom-edit]');if(editOwnPage){editCustomPage(editOwnPage.dataset.customEdit);return}const impression=e.target.closest('[data-edit-impression]');if(impression){impressionModal(impression.dataset.editImpression);return}const impPhoto=e.target.closest('[data-view-impression]');if(impPhoto){const name=impPhoto.dataset.viewImpression==='a'?'원희':'은정';const p=state.impressions[impPhoto.dataset.viewImpression]?.photos?.[+impPhoto.dataset.index];if(p)openModal(name+' · 감상 사진',`<img src="${esc(p.src)}" alt="감상 사진 확대" style="width:100%;max-height:75vh;object-fit:contain"><div class="modal-actions"><button class="btn" type="button" data-close>닫기</button></div>`);return}if(e.target.closest('#editLegacyNote')){legacyNoteModal();return}const newBlock=e.target.closest('[data-new-block]');if(newBlock){freeBlockModal(newBlock.dataset.newBlock);return}const editBlock=e.target.closest('[data-edit-block]');if(editBlock){freeBlockModal(editBlock.dataset.page,editBlock.dataset.editBlock);return}const removeBlock=e.target.closest('[data-remove-block]');if(removeBlock){if(confirm('이 블록과 사진을 삭제할까요?')){const arr=state.pageBlocks[removeBlock.dataset.page]||[];state.pageBlocks[removeBlock.dataset.page]=arr.filter(b=>b.id!==removeBlock.dataset.removeBlock);commit('블록을 삭제했습니다.')}return}const moveBlock=e.target.closest('[data-move-block]');if(moveBlock){updateFreeBlock(moveBlock.dataset.page,moveBlock.dataset.moveBlock,Number(moveBlock.dataset.step));return}const viewFree=e.target.closest('[data-view-free]');if(viewFree){const p=state.pageBlocks?.[viewFree.dataset.viewFree]?.find(b=>b.id===viewFree.dataset.blockId)?.photos?.[+viewFree.dataset.image];if(p)openModal('추억 사진',`<img src="${esc(p.src)}" alt="확대 사진" style="width:100%;max-height:75vh;object-fit:contain"><div class="modal-actions"><button class="btn" data-close type="button">닫기</button></div>`);return}const pick=e.target.closest('[data-city-pick]');if(pick){activeCity=pick.dataset.cityPick;document.getElementById('city-'+activeCity)?.scrollIntoView({behavior:'smooth',block:'start'});return}
 const fil=e.target.closest('[data-filter-city]');if(fil){filterCity=fil.dataset.filterCity;search='';$('#searchInput').value='';$('#cityFilter').value=filterCity;renderRecords();return}
 const addPart=e.target.closest('[data-add-part]');if(addPart){partModal(addPart.dataset.addPart);return}
 const editPart=e.target.closest('[data-edit-part]');if(editPart){partModal(editPart.dataset.city,editPart.dataset.editPart);return}
 const delPart=e.target.closest('[data-delete-part]');if(delPart){deletePart(delPart.dataset.city,delPart.dataset.deletePart);return}
 const mvPart=e.target.closest('[data-move-part]');if(mvPart){movePart(mvPart.dataset.city,mvPart.dataset.movePart,mvPart.dataset.dir);return}
 const addInPart=e.target.closest('[data-add-in-part]');if(addInPart){activeCity=addInPart.dataset.city;recordModal(null,activeCity,addInPart.dataset.addInPart);return}
 const addCityRecord=e.target.closest('[data-add-city-record]');if(addCityRecord){activeCity=addCityRecord.dataset.addCityRecord;recordModal(null,activeCity);return}
 const viewStayPhoto=e.target.closest('[data-view-stay-photo]');if(viewStayPhoto){const c=cityBy(viewStayPhoto.dataset.viewStayPhoto);const p=stayBy(c.id).photos?.[Number(viewStayPhoto.dataset.photoIndex)];if(p)openModal(c.name+' · 숙소 사진',`<img src="${esc(p.src)}" alt="${esc(c.name)} 숙소 사진" style="width:100%;max-height:70vh;object-fit:contain"><div class="modal-actions"><button class="btn" type="button" data-close>닫기</button></div>`);return}
 const editVoiceGroup=e.target.closest('[data-edit-voice-group]');if(editVoiceGroup){voiceGroupModal(editVoiceGroup.dataset.editVoiceGroup);return}
 const editPrompt=e.target.closest('[data-edit-prompt]');if(editPrompt){promptModal(editPrompt.dataset.editPrompt);return}
 const deletePromptEl=e.target.closest('[data-delete-prompt]');if(deletePromptEl){deletePrompt(deletePromptEl.dataset.deletePrompt);return}
 const movePromptEl=e.target.closest('[data-prompt-shift]');if(movePromptEl){movePrompt(movePromptEl.dataset.promptShift,Number(movePromptEl.dataset.step));return}
 const editVoice=e.target.closest('[data-edit-voice]');if(editVoice){voiceModal(editVoice.dataset.editVoice,editVoice.dataset.person);return}
 const record=e.target.closest('[data-edit-record]');if(record){recordModal(record.dataset.editRecord);return}
 const city=e.target.closest('[data-edit-city]');if(city){setCityFromModal(city.dataset.editCity);return}
 const stay=e.target.closest('[data-edit-stay]');if(stay){stayModal(stay.dataset.editStay);return}
 const meta=e.target.closest('[data-edit="meta"]');if(meta){editMeta();return}

 if(e.target.closest('[data-close]'))closeModal()});
$('#closeModal').onclick=closeModal;$('#modalWrap').onclick=e=>{if(e.target===$('#modalWrap'))closeModal()};window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

/* V12 — all travel pictures share one viewer; never crop in enlarged view. */
function lbAddControls(){
 for(const image of document.querySelectorAll('main .hero-photo,main .detail-photo,main .scene-photo,main #closingBg')){
  const parent=image.parentElement;if(!parent||parent.querySelector(':scope > .photo-zoom-btn'))continue;
  const button=document.createElement('button');button.className='photo-zoom-btn';button.type='button';button.textContent='⤢ 사진 확대';button.setAttribute('aria-label','이 배경 사진 크게 보기');
  parent.appendChild(button);
 }
}
let lbPhotos=[],lbIndex=0,lbReturnFocus=null,lbScrollBefore='',lbTouchStart=null;
const lbRoot=document.getElementById('photoLightbox');
function lbBackground(el){
 const css=getComputedStyle(el).backgroundImage||'';
 const sources=[...css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g)].map(m=>m[1]||m[2]||m[3]||'');
 return sources.find(src=>src.startsWith('data:image/')||/^https?:\/\//i.test(src)||src.startsWith('blob:'))||'';
}
function lbSource(el){
 if(el.tagName==='IMG')return el.currentSrc||el.getAttribute('src')||'';
 return lbBackground(el);
}
function lbCandidates(){
 return Array.from(document.querySelectorAll('main img, main .hero-photo, main .image-cover, main .detail-photo, main .scene-photo, main [data-u-replaced-image="1"]'))
 .filter(el=>!el.closest('.edit-only,.modal-backdrop,.photo-lightbox')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden')
 .map(el=>({el,src:lbSource(el),caption:el.getAttribute('alt')||el.closest('.record')?.querySelector('h3')?.textContent||el.closest('.stay-box')?.querySelector('h4')?.textContent||el.closest('.reflection')?.querySelector('h3')?.textContent||el.closest('.filmcard')?.querySelector('h3')?.textContent||el.closest('.city-section')?.querySelector('h2')?.textContent||el.closest('.impression-card')?.querySelector('h3')?.textContent||'우리의 여행 사진'}))
 .filter(item=>item.src&&!(item.el.tagName==='IMG'&&!item.el.getAttribute('src')));
}
function lbRender(){
 if(!lbPhotos.length)return;
 const p=lbPhotos[lbIndex];const image=document.getElementById('photoLightboxImage');
 image.src=p.src;image.alt=p.caption;
 document.getElementById('photoLightboxCaption').textContent=p.caption;
 document.getElementById('photoLightboxCount').textContent=`${lbIndex+1} / ${lbPhotos.length}`;
 document.getElementById('photoLightboxPrev').hidden=lbPhotos.length<=1;
 document.getElementById('photoLightboxNext').hidden=lbPhotos.length<=1;
}
function lbOpen(el){
 if(!lbRoot.hidden||document.querySelector('#modalWrap.open'))return;
 lbPhotos=lbCandidates();lbIndex=lbPhotos.findIndex(p=>p.el===el);
 if(lbIndex<0){const child=el.querySelector('img');lbIndex=lbPhotos.findIndex(p=>p.el===child)}
 if(lbIndex<0)return;
 lbReturnFocus=document.activeElement;lbScrollBefore=document.body.style.overflow;
 lbRoot.hidden=false;document.body.style.overflow='hidden';lbRender();
 document.getElementById('photoLightboxClose').focus();
}
function lbClose(){
 if(lbRoot.hidden)return;
 lbRoot.hidden=true;document.getElementById('photoLightboxImage').removeAttribute('src');
 document.body.style.overflow=lbScrollBefore;lbPhotos=[];
 if(lbReturnFocus&&typeof lbReturnFocus.focus==='function')lbReturnFocus.focus({preventScroll:true});
 lbReturnFocus=null;
}
function lbStep(step){if(!lbPhotos.length)return;lbIndex=(lbIndex+step+lbPhotos.length)%lbPhotos.length;lbRender()}
document.getElementById('photoLightboxClose').addEventListener('click',lbClose);
document.getElementById('photoLightboxPrev').addEventListener('click',()=>lbStep(-1));
document.getElementById('photoLightboxNext').addEventListener('click',()=>lbStep(1));
lbRoot.addEventListener('click',e=>{if(e.target===lbRoot||e.target.id==='photoLightboxStage')lbClose()});
lbRoot.addEventListener('touchstart',e=>{if(e.touches.length===1)lbTouchStart={x:e.touches[0].clientX,y:e.touches[0].clientY}}, {passive:true});
lbRoot.addEventListener('touchend',e=>{if(lbTouchStart&&e.changedTouches.length===1){const dx=e.changedTouches[0].clientX-lbTouchStart.x,dy=e.changedTouches[0].clientY-lbTouchStart.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.3)lbStep(dx<0?1:-1)}lbTouchStart=null},{passive:true});
window.addEventListener('keydown',e=>{
 if(!lbRoot.hidden){if(e.key==='Escape'){e.preventDefault();lbClose()}else if(e.key==='ArrowLeft'){e.preventDefault();lbStep(-1)}else if(e.key==='ArrowRight'){e.preventDefault();lbStep(1)}return}
 if((e.key==='Enter'||e.key===' ')&&e.target.matches('main img[data-photo-zoom]')){e.preventDefault();lbOpen(e.target)}
});
/* Capture ahead of older per-section photo click handlers, so all pictures use the same viewer. */
document.addEventListener('click',e=>{
 if(!lbRoot.hidden||e.target.closest('.photo-lightbox,.modal-backdrop,.headtools,.edit-only,.universal-dock,.toast'))return;
 if(editing&&(universalPick||directCopyMode))return;
 const button=e.target.closest('.photo-zoom-btn');
 if(button){const backdrop=button.parentElement.querySelector(':scope > .hero-photo,:scope > .detail-photo,:scope > .scene-photo,:scope > .image-cover');if(backdrop){e.preventDefault();e.stopImmediatePropagation();lbOpen(backdrop)}return}
 const image=e.target.closest('main img,main .hero-photo,main .image-cover,main .detail-photo,main .scene-photo,main [data-u-replaced-image="1"]');
 if(!image)return;
 if(image.closest('a')&&!image.closest('.filmcard'))return;
 if(image.closest('button')&&!image.closest('[data-view-stay-photo],[data-view-impression],[data-view-free]'))return;
 if(!lbSource(image))return;
 e.preventDefault();e.stopImmediatePropagation();lbOpen(image);
},true);
/* Keyboard access to individually placed photographs. */
document.addEventListener('focusin',e=>{
 const im=e.target.closest('main img');if(im&&im.closest('button,a'))return;
});

applyLocal();renderAll();
window.Archive.bind({get:()=>state,set:v=>{state=v;prepareState();renderAll()},edit:v=>{toggleEditing(v);if(!v)closeModal()},backup:exportJSON,html:exportHTML});
})();
