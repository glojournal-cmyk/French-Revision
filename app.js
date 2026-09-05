console.info('Mon Jardin Français V3.3.1 Local Tutor Hotfix');

(() => {
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const DATA={questions:[],vocab:[],notes:[],writing:[],map:[]};
const KEY='monJardinFrancais.progress.v2';
let progress=loadProgress(), currentVocab=[], vocabIndex=0, flashFlipped=false;
let quiz=null, selectedWriting=0;

function loadProgress(){
  const fresh={attempts:{},sessions:0,correct:0,answered:0,almost:0,streak:0,lastDay:null,writing:{},history:[],createdAt:Date.now(),markingVersion:1};
  try{
    const p=JSON.parse(localStorage.getItem(KEY)||'{}');
    return {...fresh,...p,
      attempts:p.attempts||{}, writing:p.writing||{},
      history:Array.isArray(p.history)?p.history:[],
      createdAt:p.createdAt||Date.now()
    };
  }catch(e){return fresh}
}
function save(){localStorage.setItem(KEY,JSON.stringify(progress))}
function addActivity(entry){
  progress.history=Array.isArray(progress.history)?progress.history:[];
  progress.history.push({at:Date.now(),day:todayKey(),...entry});
  if(progress.history.length>1200)progress.history=progress.history.slice(-1200);
}
function localDayLabel(day){
  const [y,m,d]=day.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined,{day:'2-digit',month:'short'}).format(new Date(y,m-1,d));
}
function lastNDays(n){
  const out=[],d=new Date();
  for(let i=n-1;i>=0;i--){const x=new Date(d);x.setDate(d.getDate()-i);out.push(`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`)}
  return out;
}
function dayStats(day){
  const rows=(progress.history||[]).filter(x=>x.day===day&&x.kind==='question');
  const graded=rows.filter(x=>x.verdict!=='almost'&&x.verdict!=='manual');
  return {answered:rows.length,graded:graded.length,correct:graded.filter(x=>x.correct===true||x.verdict==='correct').length};
}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._x);t._x=setTimeout(()=>t.classList.remove('show'),2200)}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function todayKey(){
  const d=new Date(), y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function sectionName(sec){
  const q=DATA.questions.find(x=>String(x.section)===String(sec));
  return q?.topic||`Section ${sec}`;
}
function enabledQuestions(){return DATA.questions.filter(q=>q.enabledByDefault===true)}
function showView(name){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===`${name}View`));
  $$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  const nav=$('.nav'), menu=$('#menuBtn');
  nav.classList.remove('open'); menu.setAttribute('aria-expanded','false');
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='progress') renderProgress();
  if(name==='vocab') renderVocab();
  if(name==='writing') renderWriting();
  if(name==='lessons') renderLessons();
}
document.addEventListener('click',e=>{
  const v=e.target.closest('[data-view]'); if(v){e.preventDefault();showView(v.dataset.view)}
  const t=e.target.closest('.theme-card'); if(t){showView('lessons');$('#lessonFilter').value=t.dataset.section;renderLessons()}
});
$('#menuBtn').addEventListener('click',()=>{
 const nav=$('.nav'), menu=$('#menuBtn'), open=nav.classList.toggle('open');
 menu.setAttribute('aria-expanded',String(open));
});
$('#soundBtn').addEventListener('click',()=>toast('Appuie sur 🔈 à côté d’un mot pour l’entendre.'));

async function loadData(){
 try{
  const files=['question-bank.json','vocab-bank.json','notes-by-date.json','writing-bank.json','block-question-map.json'];
  const loadJson=async(f)=>{
    const candidates=[`./${f}`,`./data/${f}`];
    let lastErr;
    for(const url of candidates){
      try{
        const r=await fetch(url,{cache:'no-store'});
        if(r.ok) return await r.json();
        lastErr=new Error(`${url}: HTTP ${r.status}`);
      }catch(e){ lastErr=e; }
    }
    throw lastErr||new Error(`Unable to load ${f}`);
  };
  const [q,v,n,w,m]=await Promise.all(files.map(loadJson));
  DATA.questions=q;DATA.vocab=v;DATA.notes=n;DATA.writing=w;DATA.map=m;
  hydrate();
 }catch(err){
  console.error('Content load failed:',err);
  document.body.innerHTML='<main style="padding:40px;font-family:sans-serif;max-width:760px"><h1>Impossible de charger le contenu</h1><p>Le site est bien ouvert, mais un fichier de contenu n’a pas pu être chargé.</p><p style="opacity:.7;font-size:14px">Recharge la page après le déploiement GitHub Pages. Si le problème continue, vérifie la console du navigateur.</p></main>';
 }
}
function migrateV32QuickRuleQA(){
 if(progress.markingVersion>=2)return;
 const qrows=(progress.history||[]).filter(x=>x.kind==='question');
 const looksLikeOldQA=qrows.length>0&&qrows.length<=20&&qrows.every(x=>x.topic==='Quick rules'&&x.correct===false&&!x.verdict);
 if(looksLikeOldQA){
   const quickIds=new Set(DATA.questions.filter(q=>q.topic==='Quick rules').map(q=>q.id));
   Object.keys(progress.attempts).forEach(id=>{if(quickIds.has(id))delete progress.attempts[id]});
   progress.history=(progress.history||[]).filter(x=>!(x.kind==='question'&&x.topic==='Quick rules'&&!x.verdict));
   progress.answered=Math.max(0,(progress.answered||0)-qrows.length);
   toast('Ancien test Quick Rules nettoyé ✓ • Old QA results cleared');
 }
 progress.markingVersion=2;save();
}
function hydrate(){
 migrateV32QuickRuleQA();
 const sections=[...new Map(enabledQuestions().map(q=>[q.section,q.topic])).entries()].sort((a,b)=>Number(a[0])-Number(b[0]));
 for(const id of ['lessonFilter','practiceTopic']){
   const sel=$('#'+id); sections.forEach(([s,n])=>sel.insertAdjacentHTML('beforeend',`<option value="${s}">${s}. ${esc(n)}</option>`));
 }
 const vocabSections=[...new Map(DATA.vocab.map(v=>[v.section,v.topic])).entries()].sort((a,b)=>Number(a[0])-Number(b[0]));
 const vocabSel=$('#vocabTopic');
 vocabSections.forEach(([s,n])=>vocabSel.insertAdjacentHTML('beforeend',`<option value="${s}">${s}. ${esc(n)}</option>`));
 const day=(new Date().getDate()+new Date().getMonth())%DATA.notes.length;
 const note=DATA.notes[day]||DATA.notes[0];
 $('#dailyTitle').textContent=note.title; $('#dailyDesc').textContent=note.overview; $('#dailyLevel').textContent=note.day;
 $('#dailyBtn').onclick=$('#startDaily').onclick=()=>startFromNote(note);
 currentVocab=[...DATA.vocab];
 renderLessons();renderVocab();renderWriting();
}


function parseStructuredQAItem(raw){
 if(!raw)return null;
 if(typeof raw==='object' && raw.question && raw.answer){
   return {question:String(raw.question),answer:String(raw.answer)};
 }
 if(typeof raw!=='string')return null;
 const s=raw.trim();
 if(!s.startsWith('{')||!s.endsWith('}'))return null;
 try{
   const obj=JSON.parse(s);
   if(obj && typeof obj.question==='string' && typeof obj.answer==='string'){
     return {question:obj.question,answer:obj.answer};
   }
 }catch(e){}
 return null;
}
function renderAutoCheckQA(items){
 const parsed=items.map(parseStructuredQAItem).filter(Boolean);
 if(!parsed.length)return '';
 return `<div class="auto-check-cards">${parsed.map((qa,i)=>`
   <article class="auto-check-card">
     <div class="auto-check-qno">${i+1}</div>
     <div class="auto-check-body">
       <p class="auto-check-question">${esc(qa.question)}</p>
       <button class="text-btn reveal-auto-answer" type="button" aria-expanded="false">
         Voir la réponse <small>Show answer</small>
       </button>
       <div class="auto-check-answer hidden"><b>Réponse :</b> ${esc(qa.answer)}
         <button class="icon-btn speak-auto-answer" type="button" data-answer="${esc(qa.answer)}" title="Écouter">🔈</button>
       </div>
     </div>
   </article>`).join('')}</div>`;
}
function bindAutoCheckUI(root=document){
 root.querySelectorAll('.reveal-auto-answer').forEach(btn=>{
   if(btn.dataset.bound)return;btn.dataset.bound='1';
   btn.addEventListener('click',()=>{
     const ans=btn.parentElement.querySelector('.auto-check-answer');
     const open=ans.classList.toggle('hidden')===false;
     btn.setAttribute('aria-expanded',String(open));
     btn.innerHTML=open?'Masquer la réponse <small>Hide answer</small>':'Voir la réponse <small>Show answer</small>';
   });
 });
 root.querySelectorAll('.speak-auto-answer').forEach(btn=>{
   if(btn.dataset.bound)return;btn.dataset.bound='1';
   btn.addEventListener('click',()=>speak(btn.dataset.answer||''));
 });
}
function renderLessonBlockSmart(block){
 // Preserve existing block shapes while upgrading embedded QA JSON arrays/lines.
 if(!block)return '';
 const title=block.title||block.heading||block.label||'';
 const rawItems=Array.isArray(block.items)?block.items:
                Array.isArray(block.bullets)?block.bullets:
                Array.isArray(block.content)?block.content:null;

 const looksAutoCheck=/auto[- ]?check|60 secondes|60 seconds/i.test(title);
 if(rawItems && looksAutoCheck){
   const qaHTML=renderAutoCheckQA(rawItems);
   if(qaHTML){
     return `<section class="lesson-note-block auto-check-block">
       <div class="lesson-note-heading"><span class="timer-dot">⏱</span><h3>${esc(title)}</h3></div>
       <p class="muted auto-check-intro">Teste-toi sans regarder la réponse. <small>Try each one before revealing the answer.</small></p>
       ${qaHTML}
     </section>`;
   }
 }

 // Generic structured QA even when the title is different.
 if(rawItems){
   const structured=rawItems.map(parseStructuredQAItem);
   if(structured.some(Boolean)){
     const qaHTML=renderAutoCheckQA(rawItems);
     const nonStructured=rawItems.filter(x=>!parseStructuredQAItem(x));
     return `<section class="lesson-note-block">
       ${title?`<h3>${esc(title)}</h3>`:''}
       ${nonStructured.length?`<ul>${nonStructured.map(x=>`<li>${esc(typeof x==='string'?x:JSON.stringify(x))}</li>`).join('')}</ul>`:''}
       ${qaHTML}
     </section>`;
   }
 }

 return null;
}

function renderLessons(){
 if(!DATA.questions.length)return;
 const search=($('#lessonSearch')?.value||'').toLowerCase(), filter=$('#lessonFilter')?.value||'all';
 const grouped=new Map();
 enabledQuestions().forEach(q=>{
   if(!grouped.has(q.section))grouped.set(q.section,{section:q.section,topic:q.topic,questions:[],cats:new Set()});
   grouped.get(q.section).questions.push(q);grouped.get(q.section).cats.add(q.category);
 });
 const html=[...grouped.values()].filter(g=>(filter==='all'||String(g.section)===filter)&&g.topic.toLowerCase().includes(search)).map(g=>{
   const note=DATA.notes.find(n=>n.sections?.includes(g.section));
   return `<article class="lesson-card">
     <span class="eyebrow">Section ${g.section}</span><h3>${esc(g.topic)}</h3>
     <p>${esc(note?.overview||'Révise le vocabulaire et les structures de ce thème avec des questions ciblées.')}</p>
     <div class="lesson-meta">${g.questions.length} questions sûres • ${[...g.cats].map(esc).join(' · ')}</div>
     <button class="pill ghost lesson-start" data-sec="${g.section}">Ouvrir la leçon →</button>
   </article>`
 }).join('');
 $('#lessonsGrid').innerHTML=html||'<p>Aucune leçon trouvée.</p>';
 $$('.lesson-start').forEach(b=>b.onclick=()=>{showView('practice');$('#practiceTopic').value=b.dataset.sec;preparePractice(b.dataset.sec)});
}
$('#lessonSearch').addEventListener('input',renderLessons);$('#lessonFilter').addEventListener('change',renderLessons);

function noteForSection(sec){
 return DATA.notes.find(n=>n.sections?.some(s=>String(s)===String(sec)))||null;
}
function startFromNote(note){
 showView('practice');
 const sec=note.sections?.[0]??'all'; $('#practiceTopic').value=String(sec); preparePractice(sec,note);
}
function preparePractice(sec,note=noteForSection(sec)){
 $('#practiceSetup').classList.add('hidden'); $('#quizBox').classList.remove('hidden');
 if(note){
  const rules=(note.mustMemoriseRules||[]).map(x=>`<li>${esc(x)}</li>`).join('');
  const voc=(note.mustMemoriseVocabulary||[]).slice(0,18).map(x=>`<span class="req"><b>${esc(x.french)}</b> — ${esc(x.english)}</span>`).join('');
  const ex=(note.workedExamples||[]).map(x=>`<div class="model-box"><b>${esc(x.prompt)}</b><br>${esc(x.answer)}</div>`).join('');
  const mistakes=(note.commonMistakes||[]).map(x=>`<li>${esc(typeof x==='string'?x:(x.mistake||x.problem||JSON.stringify(x)))}</li>`).join('');
  const self=(note.sixtySecondSelfCheck||note.selfCheck60Seconds||note.selfCheck||[]); 
  const selfHtml=(Array.isArray(self)?self:[self]).map(x=>`<li>${esc(typeof x==='string'?x:JSON.stringify(x))}</li>`).join('');
  $('#quizBox').innerHTML=`<p class="eyebrow">${esc(note.day)} • Avant de commencer</p><h2>${esc(note.title)}</h2><p>${esc(note.overview)}</p>
    ${rules?`<h3>Règles à mémoriser</h3><ul>${rules}</ul>`:''}
    ${voc?`<h3>Vocabulaire essentiel</h3><div class="requirement-list">${voc}</div>`:''}
    ${ex?`<h3>Exemples travaillés</h3>${ex}`:''}
    ${mistakes?`<h3>Erreurs fréquentes</h3><ul>${mistakes}</ul>`:''}
    ${selfHtml?`<h3>Auto-check 60 secondes</h3><ul>${selfHtml}</ul>`:''}
    <div class="quiz-actions"><button class="pill primary" id="beginPrepared">Je suis prête — commencer →</button><button class="pill ghost" id="cancelPrepared">Retour</button></div>`;
  $('#beginPrepared').onclick=()=>beginQuiz(sec);
  $('#cancelPrepared').onclick=()=>{$('#quizBox').classList.add('hidden');$('#practiceSetup').classList.remove('hidden')};
 } else beginQuiz(sec);
}
$('#startPractice').onclick=()=>preparePractice($('#practiceTopic').value);
function beginQuiz(sec){
 const count=Number($('#practiceCount').value||10), now=Date.now();
 let pool=enabledQuestions().filter(q=>sec==='all'||String(q.section)===String(sec));
 const unseen=[],due=[],old=[];
 pool.forEach(q=>{
   const a=progress.attempts[q.id];
   if(!a)unseen.push(q);
   else if(a.status==='wrong' && (a.dueAt||0)<=now)due.push(q);
   else old.push(q);
 });
 const ordered=[...shuffle(unseen),...shuffle(due),...shuffle(old)];
 const questions=ordered.slice(0,Math.min(count,ordered.length));
 if(!questions.length){toast('Aucune question disponible.');return}
 quiz={questions,index:0,score:0,almost:0,selected:null,answered:false,sessionSeen:new Set()};
 progress.sessions++;updateStreak();save();renderQuestion();
}
function updateStreak(){
 const td=todayKey(); if(progress.lastDay===td)return;
 const d=new Date(); d.setDate(d.getDate()-1);
 const yd=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 progress.streak=progress.lastDay===yd?(progress.streak||0)+1:1;progress.lastDay=td;
}
function renderQuestion(){
 const q=quiz.questions[quiz.index];quiz.selected=null;quiz.answered=false;quiz.sessionSeen.add(q.id);
 let answer='';
 if(q.type==='choice'||q.options?.length){
   answer=`<div class="options">${(q.options||[]).map(o=>`<button class="option" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
 } else answer=`<input class="answer-input" id="answerInput" autocomplete="off" placeholder="Écris ta réponse ici…" aria-label="Réponse">`;
 $('#quizBox').innerHTML=`<div class="quiz-top"><span>${esc(q.topic)} • ${esc(q.category)}</span><b>${quiz.index+1} / ${quiz.questions.length}</b></div>
 <div class="quiz-progress"><i style="width:${((quiz.index+1)/quiz.questions.length)*100}%"></i></div>
 <h2>${esc(q.prompt)}</h2>${q.context?`<p class="model-box">${esc(q.context)}</p>`:''}${answer}
 <div class="quiz-actions"><button class="pill primary" id="checkAnswer">Vérifier →</button><button class="pill ghost" id="speakPrompt">🔈 Écouter</button></div><div id="feedbackSlot"></div>`;
 $$('.option').forEach(b=>b.onclick=()=>{$$('.option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');quiz.selected=b.dataset.opt});
 $('#checkAnswer').onclick=checkAnswer;$('#speakPrompt').onclick=()=>speak(q.prompt);
 $('#answerInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')checkAnswer()});
}

function smartNormalise(v){
 return FrenchReferenceMarker.normalise(v||'')
   .replace(/[()]/g,' ')
   .replace(/\s+/g,' ')
   .trim();
}
function hasAny(text,patterns){return patterns.some(p=>p.test(text))}
function tokenOverlap(a,b){
 const stop=new Set(['je','j','tu','il','elle','on','nous','vous','ils','elles','le','la','les','un','une','de','des','du','a','à','au','aux','et']);
 const A=new Set(smartNormalise(a).split(/\s+/).filter(x=>x.length>1&&!stop.has(x)));
 const B=new Set(smartNormalise(b).split(/\s+/).filter(x=>x.length>1&&!stop.has(x)));
 if(!A.size||!B.size)return 0;
 let hit=0;A.forEach(x=>{if(B.has(x))hit++});
 return hit/Math.min(A.size,B.size);
}
function quickRuleAlmost(q,input){
 const t=smartNormalise(input), p=smartNormalise(q.prompt);
 if(!t)return null;

 // Fragment of a taught answer: concept recognised, but incomplete.
 const accepted=(q.marking?.accepted||[]).map(smartNormalise);
 if(accepted.some(a=>(a.includes(t)||t.includes(a)) && t.split(/\s+/).length>=2)){
   return {verdict:'almost',reason:'You have part of the taught example, but the answer is incomplete.'};
 }

 // Six confirmed Quick Rules from Content Core.
 if(p.includes('opinions')){
   if(hasAny(t,[/\baime\b/,/\badore\b/,/\bdeteste\b/,/\bprefere\b/]))
     return {verdict:'almost',reason:'You are using an opinion structure correctly, but the task asks for one complete taught example.'};
 }
 if(p.includes('food & drink')){
   const hasFoodVerb=hasAny(t,[/\bbois\b/,/\bboit\b/,/\bmange\b/,/\bmanges\b/,/\bmangent\b/]);
   const hasPartitive=hasAny(` ${t} `,[/\bdu\b/,/\bde la\b/,/\bde l[' ]/,/\bdes\b/]);
   if(hasFoodVerb&&hasPartitive)
     return {verdict:'almost',reason:'The food/drink structure is sensible, but it is not yet one complete taught example.'};
 }
 if(p.includes('negatives')){
   if(hasAny(` ${t} `,[/\bpas\b/,/\bplus\b/]) && hasAny(t,[/\bne\b/,/\bn[' ]/,/\bnai\b/,/\bn y\b/]))
     return {verdict:'almost',reason:'You have the negative structure, but the taught example needs to be completed.'};
 }
 if(p.includes('places after aller')){
   if(hasAny(` ${t} `,[/\bau\b/,/\ba la\b/,/\ba l[' ]/,/\baux\b/]))
     return {verdict:'almost',reason:'Your place preposition pattern is plausible. The exercise asks you to recall one complete taught example.'};
 }
 if(p.includes('passe compose')){
   if(hasAny(t,[/\bj ai\b/,/\bje suis\b/,/\bil a\b/,/\belle est\b/,/\bnous avons\b/,/\bils sont\b/]))
     return {verdict:'almost',reason:'You have started a passé composé structure, but the answer needs a complete auxiliary + past participle example.'};
 }
 if(p.includes('etre verbs')){
   if(hasAny(` ${t} `,[/\bsuis\b/,/\bes\b/,/\best\b/,/\bsommes\b/,/\betes\b/,/\bsont\b/]))
     return {verdict:'almost',reason:'You recognised an être form, but this question asks for a complete taught example with the past participle.'};
 }
 return null;
}
function smartMark(q,input,selected){
 let base;
 const confidence=q.autoMarkConfidence;
 if(confidence==='medium'||confidence==='manual_review'){
   return {verdict:'manual',correct:null,reviewNeeded:true,missing:[],unexpected:[],reason:'This answer needs human review and carries no penalty.'};
 }
 try{base=FrenchReferenceMarker.mark(q.marking,input,selected)}
 catch(e){console.error(e);return {verdict:'manual',correct:null,reviewNeeded:true,missing:[],unexpected:[],reason:'Automatic marking was not confident enough.'}}
 if(base.correct===true)return {...base,verdict:'correct'};
 if(q.marking?.mode==='choice')return {...base,verdict:'wrong'};
 if(q.topic==='Quick rules'&&q.marking?.mode==='one_of_complete_examples'){
   const almost=quickRuleAlmost(q,input);
   if(almost)return {...base,correct:null,...almost};
 }
 // Generic near-match: useful for free text outside Quick Rules, but deliberately conservative.
 const accepted=q.marking?.accepted||[];
 const best=accepted.reduce((m,a)=>Math.max(m,tokenOverlap(input,a)),0);
 if(best>=0.72 && smartNormalise(input).split(/\s+/).length>=2){
   return {...base,correct:null,verdict:'almost',reason:'Most of the key language is there, but check the complete form against the model answer.'};
 }
 return {...base,verdict:'wrong'};
}
function verdictLabel(v){
 if(v==='correct')return 'Bravo ! 🌷';
 if(v==='almost')return 'Presque ! 🌱 • Almost!';
 if(v==='manual')return 'À vérifier sans pénalité ✨';
 return 'À revoir 🌱 • Review';
}
function verdictClass(v){return v==='correct'?'ok':v==='almost'?'almost':v==='manual'?'manual':'wrong'}

function localTutorExplain(q,input,result){
 const p=smartNormalise(q.prompt), t=smartNormalise(input), model=q.displayAnswer||'';
 let title='Explication • Explanation', explanation='', correction=model, tip='';

 if(result.verdict==='correct'){
   title='Très bien ! 🌷';
   explanation='Your answer matches the taught pattern. Compare your spelling and accents with the model answer to reinforce the exact French form.';
   tip='Say the model answer aloud once, then try to recall it without looking.';
 }else if(p.includes('food & drink')){
   if(hasAny(` ${t} `,[/\bau\b/,/\ba la\b/,/\baux\b/])){
     explanation='You used a place-style preposition. For an unspecified amount of food or drink, French normally uses a partitive article such as du, de la, de l’ or des.';
     tip='Think “some”: du pain, de la soupe, de l’eau, des frites.';
   }else{
     explanation='This rule is about using the correct article with food and drink. Match the noun with du, de la, de l’ or des, then build the complete sentence.';
     tip='Learn the noun together with its article, not as a single isolated word.';
   }
 }else if(p.includes('negatives')){
   if(hasAny(` ${t} `,[/\bpas\b/,/\bplus\b/])){
     explanation='You have recognised the negative structure, but the answer needs to be a complete sentence. Remember that after ne…pas or ne…plus, partitive and indefinite articles often change to de/d’.';
     tip='Build the whole frame: subject + ne/n’ + verb + pas/plus + de/d’ + noun.';
   }else{
     explanation='This question is testing a full negative sentence. The key pattern is ne…pas or ne…plus around the verb.';
     tip='Spot the verb first, then put ne/n’ before it and pas/plus after it.';
   }
 }else if(p.includes('places after aller')){
   explanation='After aller, the place expression changes with gender and number: au, à la, à l’ or aux. Your answer should also be a complete taught example.';
   tip='au = masculine, à la = feminine, à l’ = vowel sound, aux = plural.';
   if(t.includes('a la')) tip+=' Missing accents can be tolerated for marking, but write “à la” in standard French.';
 }else if(p.includes('etre verbs')){
   explanation='In the passé composé with être verbs, you need the correct form of être plus a past participle. A form such as “je suis” is only the beginning of the structure.';
   tip='Think: subject + être + past participle, for example “elle est allée”.';
 }else if(p.includes('passe compose')){
   explanation='The passé composé needs an auxiliary verb plus a past participle. Starting with “j’ai” or “je suis” shows the right direction, but the answer is not complete yet.';
   tip='Ask yourself: auxiliary first, then which past participle?';
 }else if(p.includes('opinions')){
   explanation='You have recognised an opinion verb, but this task asks for a complete taught example rather than only the opinion phrase.';
   tip='Build a full sentence with an opinion verb plus the activity or noun.';
 }else if(result.verdict==='almost'){
   explanation=result.reason||'Most of the key idea is present, but the answer is incomplete or slightly different from the taught model.';
   tip='Compare your answer with the model and notice the missing word, ending, article or verb form.';
 }else if(result.verdict==='manual'){
   explanation='This response needs human judgement, so the app does not penalise it automatically.';
   tip='Compare your answer with the lesson notes and model answer.';
 }else{
   explanation='Your answer does not match the taught pattern closely enough yet. Use the model answer to identify the exact grammar or vocabulary difference.';
   tip='Change one thing at a time: verb form, article, agreement, word order or spelling.';
 }

 return {title,explanation,correction,tip};
}
function showLocalTutor(q,input,result,slot){
 const data=localTutorExplain(q,input,result);
 const box=slot.querySelector('.ai-result');
 box.innerHTML=`<div class="ai-card"><p class="eyebrow">✨ Tuteur local • Local Tutor</p>
   <h4>${esc(data.title)}</h4>
   <p>${esc(data.explanation)}</p>
   ${data.correction?`<p><b>Correction :</b> ${esc(data.correction)}</p>`:''}
   ${data.tip?`<p><b>💡 Tip :</b> ${esc(data.tip)}</p>`:''}
   <p class="ai-note">Runs entirely on this device — no API key, account or external AI service required.</p></div>`;
}

function checkAnswer(){
 if(quiz.answered)return;
 const q=quiz.questions[quiz.index], input=$('#answerInput')?.value||'', selected=quiz.selected;
 if((q.type==='choice'||q.options?.length)&&!selected){toast('Choisis une réponse.');return}
 if(!(q.type==='choice'||q.options?.length)&&!input.trim()){toast('Écris une réponse.');return}

 const result=smartMark(q,input,selected);
 quiz.answered=true;
 const prev=progress.attempts[q.id]||{tries:0};prev.tries++;
 progress.answered++;

 if(result.verdict==='correct'){
   quiz.score++;progress.correct++;prev.status='correct';prev.lastAt=Date.now();prev.dueAt=null;
 }else if(result.verdict==='almost'){
   quiz.almost=(quiz.almost||0)+1;progress.almost=(progress.almost||0)+1;
   prev.status='almost';prev.lastAt=Date.now();prev.dueAt=null;
 }else if(result.verdict==='wrong'){
   prev.status='wrong';prev.lastAt=Date.now();prev.dueAt=Date.now()+48*60*60*1000;
 }else{
   prev.status='review';prev.lastAt=Date.now();prev.dueAt=null;
 }
 prev.lastVerdict=result.verdict;
 progress.attempts[q.id]=prev;
 addActivity({kind:'question',id:q.id,section:q.section,topic:q.topic,category:q.category,
   correct:result.verdict==='correct',verdict:result.verdict});
 save();

 const ex=q.explanation||{};
 const breakdown=(ex.breakdown||[]).map(x=>`<li>${esc(x)}</li>`).join('');
 const missing=result.missing?.length?`<p><b>Il manque :</b> ${result.missing.map(esc).join(', ')}</p>`:'';
 const why=result.reason?`<div class="smart-reason"><b>${result.verdict==='almost'?'Why almost?':'Feedback'}:</b> ${esc(result.reason)}</div>`:'';
 $('#feedbackSlot').innerHTML=`<div class="feedback ${verdictClass(result.verdict)}"><h3>${verdictLabel(result.verdict)}</h3>
   ${why}
   <p>Réponse enseignée : <span class="model-answer">${esc(q.displayAnswer)}</span> <button class="icon-btn speak-answer" title="Écouter">🔈</button></p>
   ${result.accentOnly?'<p class="accent-ok">✓ Accent difference accepted for scoring. Check the displayed spelling.</p>':''}${missing}
   ${ex.short?`<p>${esc(ex.short)}</p>`:''}${breakdown?`<ul>${breakdown}</ul>`:''}
   ${ex.commonError?`<p><b>Erreur fréquente :</b> ${esc(ex.commonError)}</p>`:''}
   ${ex.remember?`<p><b>À retenir :</b> ${esc(ex.remember)}</p>`:''}
   <div class="feedback-actions">
     <button class="pill ghost ai-explain" type="button">✨ Explique-moi <small>Explain</small></button>
     <button class="pill primary" id="nextQuestion">${quiz.index+1<quiz.questions.length?'Question suivante →':'Voir le résultat →'}</button>
   </div>
   <div class="ai-result"></div></div>`;
 $('.speak-answer').onclick=()=>speak(q.displayAnswer);
 const aiBtn=$('#feedbackSlot .ai-explain');
 if(aiBtn)aiBtn.addEventListener('click',()=>showLocalTutor(q,input||selected,result,$('#feedbackSlot')));
 $('#checkAnswer').disabled=true;$('#nextQuestion').onclick=nextQuestion;
}
function nextQuestion(){
 if(quiz.index+1<quiz.questions.length){quiz.index++;renderQuestion();return}
 const graded=quiz.questions.length-(quiz.almost||0);
 const pct=graded?Math.round(quiz.score/graded*100):100;
 $('#quizBox').innerHTML=`<div style="text-align:center;padding:25px"><p class="eyebrow">Séance terminée • Session complete</p><h2>${pct>=80?'Magnifique travail 🌷':'Ton jardin pousse 🌱'}</h2>
 <div style="font-family:var(--serif);font-size:64px;font-weight:700">${quiz.score}/${quiz.questions.length}</div>
 ${(quiz.almost||0)?`<p><b>${quiz.almost} Presque / Almost</b> — not counted as a wrong answer.</p>`:''}
 <p>Seules les vraies erreurs entrent dans la révision espacée.<br><small>Only genuine errors enter spaced review.</small></p>
 <div class="quiz-actions" style="justify-content:center"><button class="pill primary" id="again">Nouvelle séance <small>New session</small></button><button class="pill ghost" id="seeProgress">Mes progrès <small>My progress</small></button></div></div>`;
 $('#again').onclick=()=>{$('#quizBox').classList.add('hidden');$('#practiceSetup').classList.remove('hidden')};
 $('#seeProgress').onclick=()=>showView('progress');
}
function speak(text){
 if(!('speechSynthesis' in window)){toast('La synthèse vocale n’est pas disponible.');return}
 speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text);u.lang='fr-FR';u.rate=.85;speechSynthesis.speak(u);
}

function filterVocab(){
 const s=($('#vocabSearch').value||'').trim().toLowerCase(),sec=$('#vocabTopic').value;
 currentVocab=DATA.vocab.filter(v=>(sec==='all'||String(v.section)===sec)&&(!s||v.french.toLowerCase().includes(s)||v.english.toLowerCase().includes(s)));
 vocabIndex=Math.min(vocabIndex,Math.max(0,currentVocab.length-1));flashFlipped=false;renderVocab();
}
function renderVocab(){
 if(!DATA.vocab.length)return;
 const v=currentVocab[vocabIndex];
 $('#vocabCountLabel').textContent=`${DATA.vocab.length} mots et expressions appris • ${DATA.vocab.filter(x=>x.includeInAutomaticQuestions).length} prêts pour l’auto-correction.`;
 if(v){
  $('#flashTopic').textContent=v.topic;$('#flashFront').textContent=v.french;$('#flashBack').textContent=v.english;$('#flashIndex').textContent=`${vocabIndex+1} / ${currentVocab.length}`;
  $('#flashCard').classList.toggle('flipped',flashFlipped);
 } else {$('#flashFront').textContent='Aucun résultat';$('#flashBack').textContent='';$('#flashIndex').textContent='0 / 0'}
 $('#vocabList').innerHTML=currentVocab.slice(0,80).map(x=>`<div class="vocab-row"><b>${esc(x.french)}</b><span>${esc(x.english)}</span></div>`).join('');
}
$('#vocabSearch').addEventListener('input',filterVocab);$('#vocabTopic').addEventListener('change',filterVocab);
$('#flashCard').onclick=()=>{flashFlipped=!flashFlipped;renderVocab()};
$('#nextVocab').onclick=()=>{if(currentVocab.length){vocabIndex=(vocabIndex+1)%currentVocab.length;flashFlipped=false;renderVocab()}};
$('#prevVocab').onclick=()=>{if(currentVocab.length){vocabIndex=(vocabIndex-1+currentVocab.length)%currentVocab.length;flashFlipped=false;renderVocab()}};

function renderWriting(){
 if(!DATA.writing.length)return;
 $('#writingTasks').innerHTML=DATA.writing.map((w,i)=>`<button class="writing-task ${i===selectedWriting?'active':''}" data-wi="${i}"><b>${esc(w.title)}</b><small style="display:block;color:var(--muted)">${esc(w.day)} • ${w.sentenceTarget} phrases</small></button>`).join('');
 $$('.writing-task').forEach(b=>b.onclick=()=>{
   const editor=$('#writingText');
   if(editor) saveWriting(DATA.writing[selectedWriting],false);
   selectedWriting=Number(b.dataset.wi);renderWriting();
 });
 const w=DATA.writing[selectedWriting],saved=progress.writing[w.id]?.text||'';
 $('#writingEditor').innerHTML=`<p class="eyebrow">${esc(w.day)}</p><h2>${esc(w.title)}</h2><p>${esc(w.prompt)}</p>
 <textarea id="writingText" placeholder="Écris ici…">${esc(saved)}</textarea>
 <div class="quiz-actions"><button class="pill primary" id="checkWriting">Vérifier ma checklist →</button><button class="pill ghost" id="saveWriting">Sauvegarder</button></div>
 <div id="writingFeedback"></div>`;
 $('#saveWriting').onclick=()=>saveWriting(w,true);$('#checkWriting').onclick=()=>checkWriting(w);
 let autosaveTimer;
 $('#writingText').addEventListener('input',()=>{clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>saveWriting(w,false),350)});
}
function saveWriting(w,notify=false){
 progress.writing[w.id]={text:$('#writingText').value,updatedAt:Date.now()};save();if(notify)toast('Écriture sauvegardée ✓');
}
function norm(t){return FrenchReferenceMarker.normalise(t)}
function sentenceCount(t){return t.split(/[.!?]+/).map(x=>x.trim()).filter(Boolean).length}
function checkWriting(w){
 const text=$('#writingText').value;saveWriting(w,false);const n=norm(text);let earned=0,total=0;
 const rows=w.requirements.map(r=>{
   total+=r.points||1;let met=false;
   if(r.kind==='sentences')met=sentenceCount(text)>=(r.count||w.sentenceTarget||3);
   else if(r.any)met=r.any.some(a=>n.includes(norm(a)));
   if(met)earned+=r.points||1;
   return `<div class="req ${met?'met':''}">${met?'✓':'○'} ${esc(r.label)} <span style="margin-left:auto">${met?'+':''}${met?r.points||1:0}/${r.points||1}</span></div>`
 }).join('');
 addActivity({kind:'writing',id:w.id,title:w.title,score:earned,total});
 save();
 $('#writingFeedback').innerHTML=`<div class="feedback ${earned===total?'':'manual'}"><h3>${earned}/${total} critères repérés</h3><p>Cette checklist vérifie les éléments demandés ; elle ne considère pas le modèle comme l’unique bonne réponse.</p><div class="requirement-list">${rows}</div><div class="model-box"><b>Exemple modèle</b><br>${esc(w.model)}</div></div>`;
}

function topicMetrics(){
 const grouped={};
 enabledQuestions().forEach(q=>{
   const g=(grouped[q.section]??={name:q.topic,total:0,correct:0,wrong:0,attempted:0});
   g.total++;
   const a=progress.attempts[q.id];
   if(a){g.attempted++;if(a.status==='correct')g.correct++;if(a.status==='wrong')g.wrong++}
 });
 return grouped;
}
function renderProgress(){
 const at=Object.values(progress.attempts), wrong=at.filter(x=>x.status==='wrong').length;
 const allQ=(progress.history||[]).filter(x=>x.kind==='question');
 const gradedQ=allQ.filter(x=>(x.verdict|| (x.correct===true?'correct':x.correct===false?'wrong':'manual'))!=='almost' && (x.verdict||'')!=='manual');
 const correctQ=gradedQ.filter(x=>x.correct===true || x.verdict==='correct').length;
 const accuracy=gradedQ.length?Math.round(correctQ/gradedQ.length*100):0;
 const days7=lastNDays(7), weekRows=(progress.history||[]).filter(x=>days7.includes(x.day));
 const studyDays=new Set(weekRows.map(x=>x.day)).size;
 const q7=weekRows.filter(x=>x.kind==='question'), graded7=q7.filter(x=>x.verdict!=='almost'&&x.verdict!=='manual'), c7=graded7.filter(x=>x.correct===true||x.verdict==='correct').length;
 const acc7=graded7.length?Math.round(c7/graded7.length*100):0;
 const writing7=weekRows.filter(x=>x.kind==='writing').length;
 const due=Object.values(progress.attempts).filter(x=>x.status==='wrong'&&(x.dueAt||0)<=Date.now()).length;

 $('#progressStats').innerHTML=`<div class="stat"><b>${progress.sessions}</b><span>séances <small>sessions</small></span></div><div class="stat"><b>${allQ.length}</b><span>réponses <small>answers</small></span></div><div class="stat"><b>${accuracy}%</b><span>précision <small>accuracy</small></span></div><div class="stat"><b>${progress.streak||0} 🌱</b><span>série <small>day streak</small></span></div>`;

 const grouped=topicMetrics();
 $('#topicProgress').innerHTML=Object.entries(grouped).map(([s,g])=>{const p=Math.round(g.correct/g.total*100);return `<div class="topic-bar"><div class="topic-bar-head"><span>${esc(g.name)}</span><b>${p}%</b></div><div class="bar"><i style="width:${p}%"></i></div></div>`}).join('');
 const wrongQs=enabledQuestions().filter(q=>progress.attempts[q.id]?.status==='wrong').slice(0,12);
 $('#reviewList').innerHTML=wrongQs.length?wrongQs.map(q=>`<div class="review-item"><b>${esc(q.topic)}</b><br>${esc(q.prompt)}</div>`).join(''):'<p class="muted">Aucune erreur en attente. 🌷<br><small>No mistakes waiting for review.</small></p>';

 $('#weeklyActivity').innerHTML=days7.map(day=>{
   const s=dayStats(day),pct=s.graded?Math.round(s.correct/s.graded*100):0;
   return `<div class="week-day ${s.answered?'active':''}"><b>${localDayLabel(day)}</b><strong>${s.answered}</strong><span>${s.answered?`${pct}%`:'—'}</span></div>`;
 }).join('');

 $('#parentSummary').innerHTML=`<div class="stat"><b>${studyDays}/7</b><span>jours étudiés <small>study days</small></span></div><div class="stat"><b>${q7.length}</b><span>questions cette semaine <small>questions this week</small></span></div><div class="stat"><b>${acc7}%</b><span>précision hebdo <small>weekly accuracy</small></span></div><div class="stat"><b>${writing7}</b><span>défis d’écriture <small>writing checks</small></span></div><div class="stat"><b>${due}</b><span>révisions dues <small>reviews due</small></span></div><div class="stat"><b>${progress.streak||0}</b><span>jours de série <small>day streak</small></span></div>`;
 $('#reportPeriod').textContent=`7 derniers jours • Last 7 days • ${localDayLabel(days7[0])} – ${localDayLabel(days7[6])}`;

 const ranked=Object.values(grouped).filter(g=>g.attempted>0).map(g=>({...g,rate:g.attempted?Math.round(g.correct/g.attempted*100):0}));
 const strong=[...ranked].sort((a,b)=>b.rate-a.rate||b.attempted-a.attempted).slice(0,3);
 const needs=[...ranked].sort((a,b)=>a.rate-b.rate||b.wrong-a.wrong).filter(g=>g.rate<90||g.wrong>0).slice(0,3);
 $('#strongAreas').innerHTML=strong.length?strong.map(g=>`<div class="report-item good"><b>✓ ${esc(g.name)}</b><span>${g.rate}% • ${g.attempted} attempted</span></div>`).join(''):'<p class="muted">Pas encore assez de données. <small>Not enough data yet.</small></p>';
 $('#needsPractice').innerHTML=needs.length?needs.map(g=>`<div class="report-item"><b>• ${esc(g.name)}</b><span>${g.rate}% • ${g.wrong} to review</span></div>`).join(''):'<p class="muted">Rien de prioritaire pour le moment. 🌷</p>';

 const recent=[...(progress.history||[])].reverse().slice(0,12);
 $('#recentActivity').innerHTML=recent.length?recent.map(x=>{
   const when=new Date(x.at).toLocaleString([], {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
   if(x.kind==='writing')return `<div class="activity-row"><span>${when}</span><b>Writing • ${esc(x.title||'Défi')}</b><em>${x.score}/${x.total}</em></div>`;
   return `<div class="activity-row"><span>${when}</span><b>${esc(x.topic||'Practice')}</b><em>${x.correct?'✓':'○'}</em></div>`;
 }).join(''):'<p class="muted">Aucune activité enregistrée. <small>No activity recorded yet.</small></p>';
}
function reportText(){
 const days=lastNDays(7), rows=(progress.history||[]).filter(x=>days.includes(x.day));
 const q=rows.filter(x=>x.kind==='question'), graded=q.filter(x=>x.verdict!=='almost'&&x.verdict!=='manual'), correct=graded.filter(x=>x.correct===true||x.verdict==='correct').length;
 const grouped=topicMetrics(), ranked=Object.values(grouped).filter(g=>g.attempted>0).map(g=>({...g,rate:Math.round(g.correct/g.attempted*100)}));
 const strong=[...ranked].sort((a,b)=>b.rate-a.rate).slice(0,3).map(g=>`${g.name} (${g.rate}%)`).join(', ')||'Not enough data yet';
 const needs=[...ranked].sort((a,b)=>a.rate-b.rate).filter(g=>g.rate<90||g.wrong).slice(0,3).map(g=>`${g.name} (${g.rate}%)`).join(', ')||'None currently';
 return `Mon Jardin Français — Parent Report
Last 7 days: ${localDayLabel(days[0])} – ${localDayLabel(days[6])}
Study days: ${new Set(rows.map(x=>x.day)).size}/7
Questions answered: ${q.length}
Accuracy: ${graded.length?Math.round(correct/graded.length*100):0}%
Writing checks: ${rows.filter(x=>x.kind==='writing').length}
Current streak: ${progress.streak||0} days
Strong areas: ${strong}
Needs more practice: ${needs}`;
}
function downloadJson(filename,obj){
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
$$('.progress-tab').forEach(b=>b.addEventListener('click',()=>{
 $$('.progress-tab').forEach(x=>{x.classList.toggle('active',x===b);x.classList.toggle('primary',x===b);x.classList.toggle('ghost',x!==b)});
 $('#learnerProgressPanel').classList.toggle('hidden',b.dataset.progressTab!=='learner');
 $('#parentProgressPanel').classList.toggle('hidden',b.dataset.progressTab!=='parent');
 renderProgress();
}));
$('#shareReport').addEventListener('click',async()=>{
 const text=reportText();
 try{
   if(navigator.share)await navigator.share({title:'Mon Jardin Français — Parent Report',text});
   else{await navigator.clipboard.writeText(text);toast('Rapport copié ✓ • Report copied');}
 }catch(e){if(e.name!=='AbortError'){try{await navigator.clipboard.writeText(text);toast('Rapport copié ✓')}catch(_){toast('Impossible de partager le rapport.') }}}
});
$('#backupProgress').addEventListener('click',()=>{
 downloadJson(`mon-jardin-francais-backup-${todayKey()}.json`,{app:'Mon Jardin Français',version:3,exportedAt:new Date().toISOString(),progress});
 toast('Sauvegarde créée ✓ • Backup created');
});
$('#restoreProgress').addEventListener('change',async(e)=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  const data=JSON.parse(await file.text()), restored=data.progress||data;
  if(!restored||typeof restored!=='object'||!restored.attempts)throw Error('Invalid backup');
  progress={...loadProgress(),...restored,attempts:restored.attempts||{},writing:restored.writing||{},history:Array.isArray(restored.history)?restored.history:[]};
  save();renderProgress();toast('Progression restaurée ✓ • Progress restored');
 }catch(err){console.error(err);toast('Sauvegarde invalide • Invalid backup')}
 e.target.value='';
});
$('#resetProgress').onclick=()=>{if(confirm('Effacer toute la progression enregistrée sur cet appareil ?')){localStorage.removeItem(KEY);progress=loadProgress();renderProgress();toast('Progression réinitialisée.')}};

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(console.warn));
loadData();
})();

document.addEventListener('click',e=>{
 const btn=e.target.closest?.('.reveal-auto-answer');
 if(btn && !btn.dataset.bound){
   const ans=btn.parentElement.querySelector('.auto-check-answer');
   const open=ans.classList.toggle('hidden')===false;
   btn.setAttribute('aria-expanded',String(open));
   btn.innerHTML=open?'Masquer la réponse <small>Hide answer</small>':'Voir la réponse <small>Show answer</small>';
 }
 const speakBtn=e.target.closest?.('.speak-auto-answer');
 if(speakBtn && !speakBtn.dataset.bound){speak(speakBtn.dataset.answer||'')}
});
