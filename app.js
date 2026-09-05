
(() => {
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const DATA={questions:[],vocab:[],notes:[],writing:[],map:[]};
const KEY='monJardinFrancais.progress.v2';
let progress=loadProgress(), currentVocab=[], vocabIndex=0, flashFlipped=false;
let quiz=null, selectedWriting=0;

function loadProgress(){
  try{
    const p=JSON.parse(localStorage.getItem(KEY)||'{}');
    return {attempts:p.attempts||{}, sessions:p.sessions||0, correct:p.correct||0, answered:p.answered||0, streak:p.streak||0, lastDay:p.lastDay||null, writing:p.writing||{}};
  }catch(e){return {attempts:{},sessions:0,correct:0,answered:0,streak:0,lastDay:null,writing:{}}}
}
function save(){localStorage.setItem(KEY,JSON.stringify(progress))}
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
function hydrate(){
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
 quiz={questions,index:0,score:0,selected:null,answered:false,sessionSeen:new Set()};
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
function checkAnswer(){
 if(quiz.answered)return;
 const q=quiz.questions[quiz.index], input=$('#answerInput')?.value||'', selected=quiz.selected;
 if((q.type==='choice'||q.options?.length)&&!selected){toast('Choisis une réponse.');return}
 if(!(q.type==='choice'||q.options?.length)&&!input.trim()){toast('Écris une réponse.');return}
 let result;
 const confidence=q.autoMarkConfidence;
 if(confidence==='medium'||confidence==='manual_review'){
   result={correct:null,reviewNeeded:true,missing:[],unexpected:[]};
 }else{
   try{result=FrenchReferenceMarker.mark(q.marking,input,selected)}
   catch(e){console.error(e);result={correct:null,reviewNeeded:true,missing:[],unexpected:[]}}
 }
 quiz.answered=true;
 const prev=progress.attempts[q.id]||{tries:0};prev.tries++;
 if(result.correct===true){
   quiz.score++;progress.correct++;progress.answered++;prev.status='correct';prev.lastAt=Date.now();prev.dueAt=null;
 }else if(result.correct===false){
   progress.answered++;prev.status='wrong';prev.lastAt=Date.now();prev.dueAt=Date.now()+48*60*60*1000;
 }else{
   prev.status='review';prev.lastAt=Date.now();
 }
 progress.attempts[q.id]=prev;save();
 const kind=result.correct===true?'ok':result.correct===false?'wrong':'manual';
 const title=result.correct===true?'Bravo ! 🌷':result.correct===false?'À revoir 🌱':'À vérifier sans pénalité ✨';
 const ex=q.explanation||{};
 const breakdown=(ex.breakdown||[]).map(x=>`<li>${esc(x)}</li>`).join('');
 const missing=result.missing?.length?`<p><b>Il manque :</b> ${result.missing.map(esc).join(', ')}</p>`:'';
 $('#feedbackSlot').innerHTML=`<div class="feedback ${kind==='ok'?'':kind}"><h3>${title}</h3>
   <p>Réponse enseignée : <span class="model-answer">${esc(q.displayAnswer)}</span> <button class="icon-btn speak-answer" title="Écouter">🔈</button></p>
   ${result.accentOnly?'<p>✓ Score correct. Pense simplement aux accents dans l’orthographe affichée.</p>':''}${missing}
   ${ex.short?`<p>${esc(ex.short)}</p>`:''}${breakdown?`<ul>${breakdown}</ul>`:''}
   ${ex.commonError?`<p><b>Erreur fréquente :</b> ${esc(ex.commonError)}</p>`:''}
   ${ex.remember?`<p><b>À retenir :</b> ${esc(ex.remember)}</p>`:''}
   <button class="pill primary" id="nextQuestion">${quiz.index+1<quiz.questions.length?'Question suivante →':'Voir le résultat →'}</button></div>`;
 $('.speak-answer').onclick=()=>speak(q.displayAnswer);$('#checkAnswer').disabled=true;$('#nextQuestion').onclick=nextQuestion;
}
function nextQuestion(){
 if(quiz.index+1<quiz.questions.length){quiz.index++;renderQuestion();return}
 const pct=Math.round(quiz.score/quiz.questions.length*100);
 $('#quizBox').innerHTML=`<div style="text-align:center;padding:25px"><p class="eyebrow">Séance terminée</p><h2>${pct>=80?'Magnifique travail 🌷':'Ton jardin pousse 🌱'}</h2><div style="font-family:var(--serif);font-size:64px;font-weight:700">${quiz.score}/${quiz.questions.length}</div><p>Les erreurs reviendront plus tard dans le cycle de révision — pas immédiatement.</p><div class="quiz-actions" style="justify-content:center"><button class="pill primary" id="again">Nouvelle séance</button><button class="pill ghost" id="seeProgress">Mes progrès</button></div></div>`;
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
 $('#writingFeedback').innerHTML=`<div class="feedback ${earned===total?'':'manual'}"><h3>${earned}/${total} critères repérés</h3><p>Cette checklist vérifie les éléments demandés ; elle ne considère pas le modèle comme l’unique bonne réponse.</p><div class="requirement-list">${rows}</div><div class="model-box"><b>Exemple modèle</b><br>${esc(w.model)}</div></div>`;
}

function renderProgress(){
 const at=Object.values(progress.attempts), correct=at.filter(x=>x.status==='correct').length, wrong=at.filter(x=>x.status==='wrong').length;
 const accuracy=progress.answered?Math.round(progress.correct/progress.answered*100):0;
 $('#progressStats').innerHTML=`<div class="stat"><b>${progress.sessions}</b><span>séances</span></div><div class="stat"><b>${progress.answered}</b><span>réponses corrigées</span></div><div class="stat"><b>${accuracy}%</b><span>précision</span></div><div class="stat"><b>${progress.streak||0} 🌱</b><span>jours de série</span></div>`;
 const grouped={};enabledQuestions().forEach(q=>{(grouped[q.section]??={name:q.topic,all:[],done:0}).all.push(q);if(progress.attempts[q.id]?.status==='correct')grouped[q.section].done++});
 $('#topicProgress').innerHTML=Object.entries(grouped).map(([s,g])=>{const p=Math.round(g.done/g.all.length*100);return `<div class="topic-bar"><div class="topic-bar-head"><span>${esc(g.name)}</span><b>${p}%</b></div><div class="bar"><i style="width:${p}%"></i></div></div>`}).join('');
 const wrongQs=enabledQuestions().filter(q=>progress.attempts[q.id]?.status==='wrong').slice(0,12);
 $('#reviewList').innerHTML=wrongQs.length?wrongQs.map(q=>`<div class="review-item"><b>${esc(q.topic)}</b><br>${esc(q.prompt)}</div>`).join(''):'<p class="muted">Aucune erreur en attente. 🌷</p>';
}
$('#resetProgress').onclick=()=>{if(confirm('Effacer toute la progression enregistrée sur cet appareil ?')){localStorage.removeItem(KEY);progress=loadProgress();renderProgress();toast('Progression réinitialisée.')}};

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(console.warn));
loadData();
})();
