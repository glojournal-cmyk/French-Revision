import fs from 'node:fs';
import vm from 'node:vm';
const markerCode=fs.readFileSync(new URL('./reference-marker.js',import.meta.url),'utf8');
const context={globalThis:{}}; vm.createContext(context); vm.runInContext(markerCode,context);
const marker=context.globalThis.FrenchReferenceMarker;
const questions=JSON.parse(fs.readFileSync(new URL('./question-bank.json',import.meta.url),'utf8'));
const notes=JSON.parse(fs.readFileSync(new URL('./notes-by-section.json',import.meta.url),'utf8'));
const enabled=questions.filter(q=>q.enabledByDefault);
if(new Set(questions.map(q=>q.id)).size!==questions.length) throw new Error('Duplicate question IDs');
for(const q of enabled){
  if(!q.task?.label||!q.task?.instruction||!q.task?.answerFormat||!q.prompt.startsWith(q.task.label)) throw new Error('Unclear task: '+q.id);
  if(q.marking.mode==='manual_atomic_split_required') throw new Error('Unsafe item enabled: '+q.id);
  if(q.type==='mc'&&(q.options?.length!==4||new Set(q.options).size!==4||!q.options.includes(q.marking.correctOption))) throw new Error('Invalid MCQ: '+q.id);
}
for(const section of [...new Set(enabled.map(q=>q.section))]) if(enabled.filter(q=>q.section===section).length<50) throw new Error('Thin section: '+section);
for(const note of notes) if(note.mustMemoriseRules.length<4||note.workedExamples.length<4||note.commonMistakes.length<3) throw new Error('Thin note: '+note.section);
const screenshot=questions.find(q=>q.originalPrompt==='Write the « ils / elles » form in the être column.');
if(!screenshot) throw new Error('Screenshot regression question missing');
for(const answer of ['sont','ils sont','elles sont','Ils sont/Elles sont.']) if(!marker.mark(screenshot.marking,answer).correct) throw new Error('Subject+verb regression: '+answer);
const unordered={mode:'unordered_required_groups',requiredGroups:[{label:'je',accepted:['suis']},{label:'nous',accepted:['sommes']},{label:'ils/elles',accepted:['sont']}]};
for(const answer of ['sont, suis, sommes','sommes / sont / suis','suis and sont and sommes','sommes et suis et sont']) if(!marker.mark(unordered,answer).correct) throw new Error('Unordered regression: '+answer);
const incomplete=marker.mark(unordered,'suis / sont'); if(incomplete.correct||!incomplete.missing.includes('nous')) throw new Error('Missing-item feedback regression');
if(!marker.mark({mode:'exact_or_equivalent',accepted:['je me suis réveillée']},'Je me suis reveillee.').correct) throw new Error('Accent regression');
if(marker.mark({mode:'exact_or_equivalent',accepted:['nous avons joué']},'nous avons joui').correct) throw new Error('Base spelling regression');
const age=questions.find(q=>q.originalPrompt==='Ask a girl how old she is and give a possible answer.');
if(!marker.mark(age.marking,"Quel age as-tu? J'ai quinze ans.").correct) throw new Error('Age component regression');
if(marker.mark(age.marking,'Quel age as-tu? Je suis quinze ans.').correct) throw new Error('Wrong age auxiliary regression');
const bag=questions.find(q=>q.originalPrompt==='Write: There are ninety-five pencils in my bag.');
if(!marker.mark(bag.marking,'Dans mon sac il y a quatre-vingt-quinze crayons.').correct) throw new Error('Bag punctuation regression');
for(const q of enabled){
  let ok=false;
  if(q.type==='mc') ok=marker.mark(q.marking,'',q.marking.correctOption).correct;
  else if(['exact_or_equivalent','one_of_complete_examples'].includes(q.marking.mode)) ok=(q.marking.accepted||[]).every(a=>marker.mark(q.marking,a).correct);
  else if(q.marking.mode==='sentence_components'){const candidates=q.marking.accepted?.length?q.marking.accepted:[q.displayAnswer];ok=candidates.some(a=>marker.mark(q.marking,a).correct);}
  else if(q.marking.mode==='unordered_required_groups'){const sample=(q.marking.requiredGroups||[]).map(g=>g.accepted[0]).join(', ');ok=marker.mark(q.marking,sample).correct;}
  if(!ok) throw new Error('Canonical answer regression: '+q.id);
}
console.log(JSON.stringify({passed:true,questionCount:questions.length,enabledCount:enabled.length,canonicalAnswersTested:enabled.length,sectionCount:notes.length,minimumSectionCount:Math.min(...notes.map(n=>enabled.filter(q=>q.section===n.section).length)),regressions:['visible-task-contract','minimum-50','section-notes','all-canonical-answers','subject+verb','unordered-three','missing-label','accent-insensitive','wrong-base-spelling','age-components','wrong-age-auxiliary','bag-punctuation']},null,2));
