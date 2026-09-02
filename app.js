const bank = window.FRENCH_BANK || [];
const blocks = window.FRENCH_BLOCKS || [];
const writingBank = window.FRENCH_WRITING || [];
const notes = window.FRENCH_NOTES || {};
const meta = window.FRENCH_META || {};
const allQuestions = [...bank, ...writingBank.map(task => ({ ...task, type: 'writing', category: 'writing', prompt: task.prompt }))];
const byId = new Map(allQuestions.map(question => [question.id, question]));

const masteryTarget = 85;
const stateKey = 'frenchParisNotebookV1State';
let state;
let migrationMessage = '';
let quizQuestions = [];
let current = 0;
let score = 0;
let quizTitle = '';
let quizKey = '';
let sessionInfo = {};
let lastWritingResult = null;

function emptyState() {
  return {
    version: 1, attempts: [], writingAttempts: [], reviews: {}, results: {}, cycles: {},
    settings: { sound: true }, activeSession: null, lastSaved: null, lastBackup: null,
  };
}

function mergeState(saved) {
  const output = Object.assign(emptyState(), saved || {});
  output.version = 1;
  output.attempts = Array.isArray(output.attempts) ? output.attempts : [];
  output.writingAttempts = Array.isArray(output.writingAttempts) ? output.writingAttempts : [];
  output.reviews = output.reviews || {};
  output.results = output.results || {};
  output.cycles = output.cycles || {};
  output.settings = Object.assign({ sound: true }, output.settings || {});
  output.activeSession = output.activeSession || null;
  Object.values(output.cycles).forEach(cycle => {
    cycle.seen = Array.isArray(cycle.seen) ? cycle.seen : [];
    cycle.reviewSeen = Array.isArray(cycle.reviewSeen) ? cycle.reviewSeen : [];
    cycle.lastSession = Array.isArray(cycle.lastSession) ? cycle.lastSession : [];
    cycle.round = Number(cycle.round) || 1;
    cycle.answered = Number(cycle.answered) || 0;
    cycle.correct = Number(cycle.correct) || 0;
  });
  return output;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(stateKey) || 'null');
    if (saved) return mergeState(saved);
  } catch (error) {}
  return emptyState();
}

state = loadState();

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function stripMarks(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function stripAnswerNotes(value) {
  return String(value || '').replace(/\s*\([^)]*\)/g, ' ');
}

function norm(value) {
  return stripMarks(stripAnswerNotes(value))
    .toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const englishSynonyms = new Map(Object.entries({
  gymnasium: 'gym', 'sports hall': 'gym', cafeteria: 'canteen', lunchroom: 'canteen',
  professor: 'teacher', instructor: 'teacher', pupils: 'students', pupil: 'student',
  enjoyable: 'fun', amusing: 'fun', exciting: 'interesting', dull: 'boring',
  mom: 'mother', mum: 'mother', dad: 'father', movie: 'film', movies: 'films',
  restroom: 'toilet', restrooms: 'toilets', 'middle school': 'lower secondary school',
  'high school': 'secondary school', maths: 'mathematics', math: 'mathematics',
  rucksack: 'backpack', schoolbag: 'school bag', eraser: 'rubber',
}));

function normEnglish(value) {
  let output = ` ${norm(value)} `;
  [...englishSynonyms.entries()].sort((a, b) => b[0].length - a[0].length).forEach(([from, to]) => {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(` ${escaped} `, 'g'), ` ${to} `);
  });
  return output.replace(/\s+/g, ' ').trim();
}

function expandedAnswers(values) {
  const output = [];
  (values || []).forEach(value => {
    output.push(value);
    const optional = String(value).match(/^(.*)\(([a-z]+)\)(.*)$/i);
    if (optional) {
      output.push(optional[1] + optional[3]);
      output.push(optional[1] + optional[2] + optional[3]);
    }
  });
  return [...new Set(output.filter(Boolean))];
}

function shuffle(values) {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[randomIndex]] = [output[randomIndex], output[index]];
  }
  return output;
}

function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + number);
  return date.toISOString().slice(0, 10);
}

function formatStamp(value) {
  if (!value) return 'Not yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not yet' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function save() {
  state.lastSaved = new Date().toISOString();
  localStorage.setItem(stateKey, JSON.stringify(state));
  renderSaveStatus();
}

function renderSaveStatus() {
  const saved = document.getElementById('lastSaved');
  const backup = document.getElementById('lastBackup');
  if (saved) saved.textContent = formatStamp(state.lastSaved);
  if (backup) backup.textContent = state.lastBackup ? formatStamp(state.lastBackup) : 'No backup exported yet';
  const sound = state.settings.sound !== false;
  document.getElementById('soundButton').setAttribute('aria-pressed', String(sound));
  document.getElementById('soundLabel').textContent = sound ? 'Sound on' : 'Sound off';
}

function show(id) {
  ['dashboard', 'notes', 'quiz', 'results'].forEach(section => document.getElementById(section).classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  window.scrollTo(0, 0);
}

function showDashboard() {
  renderDashboard();
  show('dashboard');
}

function cycleFor(key) {
  if (!state.cycles[key]) {
    state.cycles[key] = {
      seen: [], reviewSeen: [], lastSession: [], round: 1,
      answered: 0, correct: 0, completedPercent: null, completedRound: null,
    };
  }
  return state.cycles[key];
}

function focusPoolFor(block) {
  return bank.filter(question => (block.sections || []).includes(question.section));
}

function historyPoolFor(block) {
  return bank.filter(question => (block.reviewSections || []).includes(question.section) && !(block.sections || []).includes(question.section));
}

function dueQuestions() {
  return Object.entries(state.reviews)
    .filter(([, review]) => review.due <= todayISO())
    .map(([id]) => byId.get(id))
    .filter(question => question && question.category !== 'writing');
}

function latestPct(key) {
  const attempts = state.attempts.filter(attempt => attempt.key === key);
  return attempts.length ? attempts[attempts.length - 1].percent : null;
}

function phaseFor(block) {
  if (block.day.includes('Jul')) return 'July — foundations and core grammar';
  if (['9 Aug','10 Aug','11 Aug','14 Aug','15 Aug','16 Aug','17 Aug','18 Aug'].includes(block.day)) return 'August — stronger sentence building';
  if (['21 Aug','22 Aug','23 Aug','25 Aug','26 Aug'].includes(block.day)) return 'Late August — application and accuracy';
  return 'Assessment and spaced consolidation';
}

function scopeFor(block) {
  if (block.dueOnly) return 'Only questions due from the 2-day / 7-day review queue.';
  const sections = (block.sections || []).join(', ');
  return `Teacher coverage Sections ${sections}. ${block.title}.`;
}

function topicSummary() {
  const counts = new Map();
  Object.keys(state.reviews).forEach(id => {
    const question = byId.get(id);
    if (!question) return;
    const topic = question.topic || 'Other';
    counts.set(topic, (counts.get(topic) || 0) + 1);
  });
  const items = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return items.length ? items.map(([topic, count]) => `${topic}: ${count}`).join(' · ') : 'Held out of ordinary practice';
}

function renderDashboard() {
  const reviewEntries = Object.entries(state.reviews).filter(([id]) => byId.has(id));
  const due = dueQuestions().length;
  document.getElementById('totalcount').textContent = bank.length.toLocaleString();
  document.getElementById('duecount').textContent = due;
  document.getElementById('weakcount').textContent = reviewEntries.length;
  document.getElementById('weakSummary').textContent = topicSummary();
  document.getElementById('duebtn').disabled = !due;
  document.getElementById('resultDueButton').disabled = !due;

  const completed = blocks.map(block => cycleFor(block.id).completedPercent).filter(Number.isFinite);
  const overall = completed.length ? Math.round(completed.reduce((sum, value) => sum + value, 0) / completed.length) : 0;
  document.getElementById('overall').textContent = `${overall}%`;
  document.getElementById('overallbar').style.width = `${overall}%`;

  const migration = document.getElementById('migration');
  if (migrationMessage) {
    migration.textContent = migrationMessage;
    migration.classList.remove('hidden');
  } else migration.classList.add('hidden');

  const resumePanel = document.getElementById('resumePanel');
  if (state.activeSession) {
    const remaining = Math.max(0, state.activeSession.qids.length - state.activeSession.current);
    document.getElementById('resumeText').textContent = `${state.activeSession.title} · ${remaining} item${remaining === 1 ? '' : 's'} remaining.`;
    resumePanel.classList.remove('hidden');
  } else resumePanel.classList.add('hidden');

  const list = document.getElementById('daylist');
  list.innerHTML = '';
  let phase = '';
  blocks.forEach(block => {
    const nextPhase = phaseFor(block);
    if (nextPhase !== phase) {
      phase = nextPhase;
      const heading = document.createElement('div');
      heading.className = 'phase';
      heading.textContent = phase;
      list.appendChild(heading);
    }

    const focus = focusPoolFor(block);
    const history = historyPoolFor(block);
    const cycle = cycleFor(block.id);
    const validIds = new Set(focus.map(question => question.id));
    cycle.seen = cycle.seen.filter(id => validIds.has(id));
    const latest = latestPct(block.id);
    let status = 'Not started';
    let statusClass = 'new';
    if (Number.isFinite(cycle.completedPercent)) {
      status = cycle.completedPercent >= masteryTarget ? `Mastered ${cycle.completedPercent}%` : `Cycle ${cycle.completedPercent}%`;
      statusClass = cycle.completedPercent >= masteryTarget ? 'mastered' : 'started';
    } else if (cycle.seen.length || latest !== null) {
      status = latest === null ? 'In progress' : `Session ${latest}%`;
      statusClass = 'started';
    }
    const available = block.dueOnly ? due : focus.length + history.length;
    const countLine = block.dueOnly
      ? `<span>${due} due now</span><span class="cycle-badge">No new content</span>`
      : `<span>${focus.length} focus questions</span><span class="cycle-badge">Cycle ${cycle.round}: ${cycle.seen.length}/${focus.length} seen</span>${history.length ? `<span>${history.length} cumulative-review questions</span>` : '<span>Fresh focus only</span>'}`;
    const action = block.assessment ? 'Start 30-question assessment' : block.dueOnly ? 'Do due reviews' : `Start ${Math.min(block.sessionSize || 15, available)} questions`;
    const card = document.createElement('article');
    card.className = 'day-card';
    card.innerHTML = `<div class="day-main"><div><div class="day-title"><h2>${esc(block.day)}</h2><strong>${esc(block.title)}</strong><span class="status ${statusClass}">${esc(status)}</span></div><div class="cycle-line">${countLine}</div></div><button class="primary" ${available ? '' : 'disabled'}>${esc(action)}</button></div><div class="scope"><strong>Locked scope:</strong> ${esc(scopeFor(block))}</div>`;
    card.querySelector('button').onclick = () => openNotes(block.id);
    list.appendChild(card);
  });
  renderWritingMenu();
  renderSaveStatus();
}

function scrollToDates() {
  closeWritingMenu();
  document.getElementById('datedStart').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openWritingMenu() {
  const menu = document.getElementById('writingMenu');
  menu.classList.remove('hidden');
  renderWritingMenu();
  menu.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeWritingMenu() {
  document.getElementById('writingMenu').classList.add('hidden');
}

function renderWritingMenu() {
  const list = document.getElementById('writingList');
  if (!list) return;
  list.innerHTML = '';
  writingBank.forEach(task => {
    const attempts = state.writingAttempts.filter(item => item.id === task.id);
    const latest = attempts.length ? attempts[attempts.length - 1] : null;
    const card = document.createElement('article');
    card.className = 'day-card';
    card.innerHTML = `<div class="day-main"><div><div class="day-title"><h2>${esc(task.day)}</h2><strong>${esc(task.title)}</strong>${latest ? `<span class="status ${latest.percent >= masteryTarget ? 'mastered' : 'started'}">Latest ${latest.percent}%</span>` : '<span class="status new">New</span>'}</div><div class="cycle-line"><span>${task.sentenceTarget} sentences</span><span class="cycle-badge">Automatic checklist feedback</span></div></div><button class="primary">Start writing</button></div><div class="scope">${esc(task.prompt)}</div>`;
    card.querySelector('button').onclick = () => startWriting(task.id);
    list.appendChild(card);
  });
}

function openNotes(blockId) {
  const block = blocks.find(item => item.id === blockId);
  const note = notes[blockId] || { intro: 'Review the exact scope before practice.', must: [], sections: [] };
  document.getElementById('notesTitle').textContent = `${block.day} — ${block.title}`;
  document.getElementById('notesIntro').textContent = note.intro || '';
  document.getElementById('notesScope').textContent = scopeFor(block);
  document.getElementById('mustList').innerHTML = (note.must || []).map(item => `<li>${esc(item)}</li>`).join('');
  document.getElementById('notesSections').innerHTML = (note.sections || []).map(section => `<section class="note-section"><h3>${esc(section.title)}</h3><ul>${(section.items || []).map(item => `<li>${esc(item)}</li>`).join('')}</ul></section>`).join('');
  document.getElementById('notesStartButton').onclick = () => startBlock(block);
  show('notes');
}

function balancedTake(pool, count) {
  if (!count || !pool.length) return [];
  const written = shuffle(pool.filter(question => question.type !== 'mc'));
  const multipleChoice = shuffle(pool.filter(question => question.type === 'mc'));
  const writtenTarget = Math.min(written.length, Math.ceil(count * 0.4));
  const selected = written.slice(0, writtenTarget);
  selected.push(...multipleChoice.slice(0, Math.max(0, count - selected.length)));
  if (selected.length < count) {
    const used = new Set(selected.map(question => question.id));
    selected.push(...shuffle(pool.filter(question => !used.has(question.id))).slice(0, count - selected.length));
  }
  return shuffle(selected.slice(0, count));
}

function stratifiedSample(pool, count) {
  const groups = new Map();
  shuffle(pool).forEach(question => {
    const key = question.section || question.category;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(question);
  });
  const keys = shuffle([...groups.keys()]);
  const selected = [];
  while (selected.length < count && keys.some(key => groups.get(key).length)) {
    for (const key of keys) {
      if (selected.length >= count) break;
      const group = groups.get(key);
      if (group.length) selected.push(group.shift());
    }
  }
  return balancedTake(selected, Math.min(count, selected.length));
}

function resetCycleRound(cycle) {
  cycle.round += 1;
  cycle.seen = [];
  cycle.reviewSeen = [];
  cycle.answered = 0;
  cycle.correct = 0;
  cycle.completedPercent = null;
}

function selectFreshFromPools(key, focusAll, historyAll, count) {
  const pending = new Set(Object.keys(state.reviews));
  const cycle = cycleFor(key);
  const validIds = new Set(focusAll.map(question => question.id));
  cycle.seen = cycle.seen.filter(id => validIds.has(id));
  if (focusAll.length && cycle.seen.length >= focusAll.length) resetCycleRound(cycle);

  let focusRemaining = focusAll.filter(question => !cycle.seen.includes(question.id) && !pending.has(question.id) && !(cycle.seen.length === 0 && cycle.round > 1 && cycle.lastSession.includes(question.id)));
  if (!focusRemaining.length) focusRemaining = focusAll.filter(question => !cycle.seen.includes(question.id) && !pending.has(question.id));
  let historyRemaining = historyAll.filter(question => !pending.has(question.id) && !cycle.reviewSeen.includes(question.id) && !cycle.lastSession.includes(question.id));
  if (!historyRemaining.length && historyAll.length) {
    cycle.reviewSeen = [];
    historyRemaining = historyAll.filter(question => !pending.has(question.id) && !cycle.lastSession.includes(question.id));
  }

  const focusTarget = historyAll.length ? Math.min(focusRemaining.length, Math.ceil(count * 0.8)) : Math.min(focusRemaining.length, count);
  const focusQuestions = balancedTake(focusRemaining, focusTarget);
  const historyQuestions = balancedTake(historyRemaining, Math.min(historyRemaining.length, count - focusQuestions.length));
  let questions = shuffle([...focusQuestions, ...historyQuestions]);
  if (questions.length < count) {
    const used = new Set(questions.map(question => question.id));
    questions.push(...balancedTake([...focusRemaining, ...historyRemaining].filter(question => !used.has(question.id)), count - questions.length));
  }
  cycle.lastSession = questions.map(question => question.id);
  questions.filter(question => !validIds.has(question.id)).forEach(question => {
    if (!cycle.reviewSeen.includes(question.id)) cycle.reviewSeen.push(question.id);
  });
  save();
  return { questions, round: cycle.round, remaining: Math.max(0, focusAll.length - cycle.seen.length), total: focusAll.length };
}

function startBlock(block) {
  if (block.dueOnly) return startDue();
  if (block.assessment) {
    const pending = new Set(Object.keys(state.reviews));
    const pool = focusPoolFor(block).filter(question => !pending.has(question.id));
    sessionInfo = { kind: 'assessment', advanceReview: true };
    return startQuiz(stratifiedSample(pool, Math.min(block.sessionSize, pool.length)), `${block.day} — ${block.title}`, block.id);
  }
  const selected = selectFreshFromPools(block.id, focusPoolFor(block), historyPoolFor(block), block.sessionSize || 15);
  if (!selected.questions.length) {
    alert('Every unseen focus question is currently held for scheduled review. Complete Due today when those questions become available.');
    return showDashboard();
  }
  sessionInfo = { kind: 'fresh', focusId: block.id, round: selected.round, remaining: selected.remaining, total: selected.total, advanceReview: true };
  startQuiz(selected.questions, `${block.day} — ${block.title}`, block.id);
}

function startVocabulary() {
  closeWritingMenu();
  const pool = bank.filter(question => question.category === 'vocab');
  const selected = selectFreshFromPools('vocabulary', pool, [], 15);
  if (!selected.questions.length) return void alert('Vocabulary questions are currently held for scheduled review. Use Due today first.');
  sessionInfo = { kind: 'vocabulary', focusId: 'vocabulary', round: selected.round, remaining: selected.remaining, total: selected.total, advanceReview: true };
  startQuiz(selected.questions, 'Full Vocabulary Bank', 'vocabulary');
}

function startWriting(id) {
  const task = writingBank.find(item => item.id === id);
  if (!task) return;
  closeWritingMenu();
  lastWritingResult = null;
  sessionInfo = { kind: 'writing', writingId: id, advanceReview: false };
  startQuiz([{ ...task, type: 'writing', category: 'writing' }], task.title, `writing:${id}`);
}

function attemptedSections() {
  const ids = new Set(state.attempts.filter(attempt => attempt.key && !['vocabulary','Mixed'].includes(attempt.key)).map(attempt => attempt.key));
  return [...new Set(blocks.filter(block => ids.has(block.id)).flatMap(block => block.sections || []))];
}

function startMixed() {
  const sections = attemptedSections();
  if (!sections.length) return void alert('Complete at least one dated block first.');
  const pending = new Set(Object.keys(state.reviews));
  const pool = bank.filter(question => sections.includes(question.section) && !pending.has(question.id));
  if (!pool.length) return void alert('No mixed questions are currently available.');
  sessionInfo = { kind: 'mixed', advanceReview: true };
  startQuiz(stratifiedSample(pool, Math.min(15, pool.length)), 'Mixed test — attempted dated sections', 'Mixed');
}

function startDue() {
  const pool = dueQuestions();
  if (!pool.length) return void alert('No reviews are due today.');
  sessionInfo = { kind: 'review', advanceReview: true };
  startQuiz(balancedTake(pool, Math.min(20, pool.length)), 'Due 2-day / 7-day review', 'Due');
}

function startQuiz(questions, title, key) {
  quizQuestions = questions;
  current = 0;
  score = 0;
  quizTitle = title;
  quizKey = key;
  state.activeSession = {
    qids: questions.map(question => question.id), title, key, current: 0, score: 0,
    sessionInfo: { ...sessionInfo },
  };
  save();
  show('quiz');
  renderQuestion();
}

function resumeSession() {
  const active = state.activeSession;
  if (!active) return;
  const questions = active.qids.map(id => byId.get(id)).filter(Boolean).map(question => question.category === 'writing' ? { ...question, type: 'writing' } : question);
  if (!questions.length) {
    state.activeSession = null;
    save();
    return showDashboard();
  }
  quizQuestions = questions;
  quizTitle = active.title;
  quizKey = active.key;
  score = active.score || 0;
  sessionInfo = active.sessionInfo || {};
  current = Math.min(active.current || 0, questions.length - 1);
  show('quiz');
  renderQuestion();
}

function pauseQuiz() {
  if (!confirm('Pause this practice? Your place and score will be saved, and you can continue from the home screen.')) return;
  showDashboard();
}

function renderQuestion() {
  const question = quizQuestions[current];
  document.getElementById('quizTitle').textContent = quizTitle;
  document.getElementById('questionCounter').textContent = question.type === 'writing' ? `${question.sentenceTarget}-sentence task` : `Question ${current + 1} of ${quizQuestions.length}`;
  document.getElementById('quizBar').style.width = `${current / quizQuestions.length * 100}%`;
  const badge = sessionInfo.kind === 'review' ? 'Due review'
    : sessionInfo.kind === 'assessment' ? 'Balanced assessment'
      : sessionInfo.kind === 'mixed' ? 'Balanced mixed test'
        : sessionInfo.kind === 'writing' ? 'Automatic structure checklist'
          : `Cycle ${sessionInfo.round || 1} · fresh first`;
  document.getElementById('freshBadge').textContent = badge;
  const context = document.getElementById('questionContext');
  context.textContent = question.context || '';
  context.classList.toggle('hidden', !question.context);
  document.getElementById('direction').textContent = question.direction || (question.type === 'writing' ? 'Controlled writing' : question.topic);
  document.getElementById('questionText').textContent = question.prompt;
  const area = document.getElementById('inputArea');
  area.innerHTML = '';
  if (question.type === 'mc') {
    const box = document.createElement('div');
    box.className = 'answers';
    shuffle(question.options || []).forEach(option => {
      const button = document.createElement('button');
      button.className = 'answer-button';
      button.type = 'button';
      button.setAttribute('aria-pressed', 'false');
      button.textContent = option;
      button.onclick = () => {
        box.querySelectorAll('button').forEach(item => {
          item.classList.remove('selected'); item.dataset.selected = ''; item.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('selected'); button.dataset.selected = '1'; button.setAttribute('aria-pressed', 'true');
      };
      box.appendChild(button);
    });
    area.appendChild(box);
  } else {
    const placeholder = question.type === 'multi' ? 'Write all three forms in any order.'
      : question.type === 'writing' ? `Write ${question.sentenceTarget} complete French sentences here.`
        : 'Write the full answer here.';
    area.innerHTML = `<textarea id="textAnswer" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="${esc(placeholder)}"></textarea>`;
    if (question.type === 'writing') {
      area.innerHTML += `<div class="exact-scope"><strong>Required jobs</strong><ul class="feedback-list">${question.requirements.map(item => `<li>${esc(item.label)} (${item.points} point${item.points === 1 ? '' : 's'})</li>`).join('')}</ul></div>`;
    }
  }
  document.getElementById('feedback').className = 'feedback hidden';
  document.getElementById('checkButton').classList.remove('hidden');
  document.getElementById('nextButton').classList.add('hidden');
}

function parseMulti(answer, required) {
  const allSingle = required.every(item => (item.answers || []).every(option => !norm(option).includes(' ')));
  const source = String(answer).replace(/\band\b|\bet\b/gi, ',');
  if (allSingle) return [...new Set(norm(source.replace(/[;,/|\n]+/g, ' ')).split(' ').filter(Boolean))];
  return [...new Set(source.split(/\s*(?:,|;|\/|\||\n)\s*/).map(norm).filter(Boolean))];
}

function markMulti(question, answer) {
  const given = parseMulti(answer, question.required || []);
  const matched = new Set();
  const missing = [];
  (question.required || []).forEach(item => {
    const candidates = expandedAnswers(item.answers || []).map(norm);
    const index = given.findIndex((part, partIndex) => !matched.has(partIndex) && candidates.includes(part));
    if (index >= 0) matched.add(index);
    else missing.push(`${item.label}: ${(item.answers || []).join(' / ')}`);
  });
  const extra = given.filter((part, index) => !matched.has(index));
  return { ok: missing.length === 0 && extra.length === 0, missing, extra };
}

function tokenBag(value) {
  return norm(value).split(' ').filter(Boolean).sort().join('|');
}

function validSentenceStructure(answer, canonical) {
  const grammarTokens = value => norm(value).split(' ').flatMap(token => token.split("'")).filter(Boolean);
  const a = grammarTokens(answer);
  const c = grammarTokens(canonical);
  const negative = ['pas','plus','jamais','rien'].find(word => c.includes(word));
  if (negative) {
    const nIndex = a.indexOf('ne') >= 0 ? a.indexOf('ne') : a.indexOf('n');
    const negIndex = a.indexOf(negative);
    if (nIndex < 0 || negIndex <= nIndex) return false;
  }
  if (c.includes('me') && c.includes('suis') && !(a.indexOf('me') >= 0 && a.indexOf('suis') > a.indexOf('me'))) return false;
  if (c.includes('se') && c.includes('sont') && !(a.indexOf('se') >= 0 && a.indexOf('sont') > a.indexOf('se'))) return false;
  return true;
}

function countOccurrences(text, phrase) {
  const needle = norm(phrase);
  if (!needle) return 0;
  let count = 0;
  let start = 0;
  const haystack = ` ${norm(text)} `;
  const target = ` ${needle} `;
  while ((start = haystack.indexOf(target, start)) >= 0) { count += 1; start += target.length; }
  return count;
}

function hasAny(text, options) {
  const haystack = ` ${norm(text)} `;
  return (options || []).some(option => haystack.includes(` ${norm(option)} `));
}

function markWriting(question, answer) {
  const sentences = answer.split(/[.!?]+|\n+/).map(value => value.trim()).filter(Boolean);
  const details = [];
  let points = 0;
  let max = 0;
  question.requirements.forEach(requirement => {
    max += requirement.points;
    let passed = false;
    if (requirement.kind === 'sentences') passed = sentences.length >= requirement.count;
    else if (requirement.kind === 'sentencesExact') passed = sentences.length === requirement.count;
    else if (requirement.kind === 'countAny') {
      const hits = (requirement.any || []).reduce((sum, phrase) => sum + countOccurrences(answer, phrase), 0);
      passed = hits >= requirement.count;
    } else if (requirement.allGroups) passed = requirement.allGroups.every(group => hasAny(answer, group));
    else passed = hasAny(answer, requirement.any || []);
    if (passed) points += requirement.points;
    details.push({ label: requirement.label, passed, points: requirement.points });
  });
  const percent = Math.round(points / Math.max(1, max) * 100);
  return { ok: percent >= masteryTarget, points, max, percent, details, missing: details.filter(item => !item.passed).map(item => item.label), extra: [] };
}

function mark(question, answer) {
  if (question.type === 'multi') return markMulti(question, answer);
  if (question.type === 'writing') return markWriting(question, answer);
  const answers = expandedAnswers(question.answers || []);
  const directionEnglish = question.direction === 'French → English' || question.category === 'reading';
  const normalizer = directionEnglish ? normEnglish : norm;
  if (answers.some(accepted => normalizer(accepted) === normalizer(answer))) return { ok: true, missing: [], extra: [] };
  if (['translation','assessment'].includes(question.category)) {
    const sameBag = answers.find(accepted => tokenBag(accepted) === tokenBag(answer) && validSentenceStructure(answer, accepted));
    if (sameBag) return { ok: true, missing: [], extra: [], reordered: true };
  }
  return { ok: false, missing: [], extra: [] };
}

function hasVisibleAccent(value) {
  return /[àâäçéèêëîïôöùûüÿœ]/i.test(String(value));
}

function accentReminder(given, canonical) {
  if (!canonical || !hasVisibleAccent(canonical) || norm(given) !== norm(canonical)) return '';
  const plainGiven = String(given).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return plainGiven === given ? `Accent note (not deducted): the source spelling is « ${canonical} ».` : '';
}

function updateReview(question, ok) {
  if (question.category === 'writing') return;
  state.results[question.id] = { ok, date: new Date().toISOString() };
  if (!ok) {
    state.reviews[question.id] = { stage: 1, due: addDays(2), lastWrong: new Date().toISOString() };
    return;
  }
  const review = state.reviews[question.id];
  if (sessionInfo.kind === 'review' && sessionInfo.advanceReview && review) {
    if (review.stage === 1) state.reviews[question.id] = { stage: 2, due: addDays(7), lastWrong: review.lastWrong };
    else delete state.reviews[question.id];
  }
}

function recordFocusResult(question, ok) {
  if (!['fresh','vocabulary'].includes(sessionInfo.kind)) return;
  const key = sessionInfo.focusId;
  const focus = key === 'vocabulary' ? bank.filter(item => item.category === 'vocab') : focusPoolFor(blocks.find(block => block.id === key));
  if (!focus.some(item => item.id === question.id)) return;
  const cycle = cycleFor(key);
  if (!cycle.seen.includes(question.id)) {
    cycle.seen.push(question.id);
    cycle.answered += 1;
    if (ok) cycle.correct += 1;
  }
  sessionInfo.remaining = Math.max(0, focus.length - cycle.seen.length);
  if (focus.length && cycle.seen.length >= focus.length) {
    cycle.completedPercent = Math.round(cycle.correct / Math.max(1, cycle.answered) * 100);
    cycle.completedRound = cycle.round;
    sessionInfo.cycleCompleted = true;
    sessionInfo.cyclePercent = cycle.completedPercent;
  }
}

function checkAnswer() {
  const question = quizQuestions[current];
  const feedback = document.getElementById('feedback');
  let given = '';
  let result;
  if (question.type === 'mc') {
    const selected = document.querySelector('.answer-button[data-selected="1"]');
    if (!selected) return void alert('Choose an answer first.');
    given = selected.textContent;
    result = { ok: normEnglish(given) === normEnglish(question.displayAnswer), missing: [], extra: [] };
  } else {
    const input = document.getElementById('textAnswer');
    given = input.value.trim();
    if (!given) return void alert('Write an answer first.');
    result = mark(question, given);
  }

  if (result.ok) score += 1;
  if (question.type === 'writing') lastWritingResult = result;
  updateReview(question, result.ok);
  recordFocusResult(question, result.ok);
  if (state.activeSession) {
    state.activeSession.score = score;
    state.activeSession.current = current + 1;
    state.activeSession.sessionInfo = { ...sessionInfo };
  }
  save();
  playTone(result.ok ? 'correct' : 'wrong');

  const canonical = question.displayAnswer || (question.answers || [])[0] || question.model || '';
  const accent = accentReminder(given, canonical);
  let html = `<div class="feedback-title">${result.ok ? '✓ Secure answer' : 'Not secure yet — here is the repair'}</div><div class="your-answer"><strong>Your answer:</strong> ${esc(given)}</div>`;
  if (question.type === 'writing') {
    html += `<div class="answer-example"><strong>Automatic writing score:</strong> ${result.points}/${result.max} — ${result.percent}%</div>`;
    html += `<div class="explanation-box"><strong>Requirement-by-requirement feedback</strong><ul class="feedback-list">${result.details.map(item => `<li>${item.passed ? '✓' : '○'} ${esc(item.label)} — ${item.passed ? 'found' : 'not yet found'} (${item.points})</li>`).join('')}</ul></div>`;
    html += `<div class="answer-example"><strong>One source-locked model:</strong><br>${esc(question.model)}</div>`;
    html += '<div class="memory-box"><strong>How to improve:</strong> Repair only the missing sentence jobs, then check verb endings, articles, gender, plurals and negative order. Accents are shown but not deducted in this version.</div>';
  } else {
    if (!result.ok && result.missing.length) html += `<div><strong>Missing:</strong><ul class="feedback-list">${result.missing.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`;
    if (!result.ok && result.extra.length) html += `<div><strong>Incorrect extra answer${result.extra.length === 1 ? '' : 's'}:</strong><ul class="feedback-list">${result.extra.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`;
    if (canonical) html += `<div class="answer-example"><strong>Accepted source answer:</strong><br>${esc(canonical)}</div>`;
    if (accent) html += `<div class="memory-box"><strong>${esc(accent)}</strong></div>`;
    html += `<div class="explanation-box"><strong>Why this is the answer</strong><p>${esc(question.explanation || 'Compare every required word and grammar job with the source answer.')}</p></div>`;
    html += `<div class="memory-box"><strong>Must remember:</strong> ${esc(question.memory || 'Retrieve the complete chunk, not one isolated word.')}</div>`;
    if (result.reordered) html += '<div class="review-schedule"><strong>Accepted:</strong> your normal French word order differs from the model, but all required words and the key grammar structure are present.</div>';
    if (!result.ok) html += '<div class="review-schedule"><strong>Saved for later:</strong> this item leaves ordinary practice and returns in 2 days. After a correct due review, it returns once more in 7 days.</div>';
  }
  feedback.innerHTML = html;
  feedback.className = `feedback ${result.ok ? 'good' : 'bad'}`;
  document.getElementById('checkButton').classList.add('hidden');
  document.getElementById('nextButton').classList.remove('hidden');
}

function nextQuestion() {
  if (current < quizQuestions.length - 1) {
    current += 1;
    if (state.activeSession) state.activeSession.current = current;
    save();
    renderQuestion();
  } else finish();
}

function finish() {
  const percent = sessionInfo.kind === 'writing' && lastWritingResult
    ? lastWritingResult.percent : Math.round(score / Math.max(1, quizQuestions.length) * 100);
  if (sessionInfo.kind === 'writing') {
    state.writingAttempts.push({ id: sessionInfo.writingId, date: new Date().toISOString(), percent, points: lastWritingResult?.points || 0, max: lastWritingResult?.max || 0 });
  } else {
    state.attempts.push({ date: new Date().toISOString(), key: quizKey, percent, score, total: quizQuestions.length, title: quizTitle });
  }
  state.activeSession = null;
  save();
  playTone('complete');
  document.getElementById('resultScore').textContent = sessionInfo.kind === 'writing' && lastWritingResult
    ? `${lastWritingResult.points}/${lastWritingResult.max} — ${percent}%` : `${score}/${quizQuestions.length} — ${percent}%`;

  let message;
  if (sessionInfo.kind === 'writing') {
    message = percent >= masteryTarget ? 'The required sentence jobs were secure. Re-read the model for spelling and grammar detail.' : 'Use the detailed checklist to repair the missing jobs, then try the task again.';
  } else if (sessionInfo.cycleCompleted) {
    message = sessionInfo.cyclePercent >= masteryTarget
      ? `Full focus cycle completed at ${sessionInfo.cyclePercent}% — this block is now Mastered.`
      : `Full focus cycle completed at ${sessionInfo.cyclePercent}%. Complete due reviews before the next cycle.`;
  } else if (percent >= masteryTarget) {
    message = 'Strong session. Mastered appears only after the complete focus pool has been seen at 85% or above.';
  } else message = 'Below 85%. Missed questions are now scheduled for a 2-day review.';
  document.getElementById('resultMessage').textContent = message;

  let cycleText = '<strong>Session complete.</strong>';
  if (['fresh','vocabulary'].includes(sessionInfo.kind)) cycleText = `<strong>Focus cycle:</strong> ${sessionInfo.remaining} unseen focus question${sessionInfo.remaining === 1 ? '' : 's'} remain in cycle ${sessionInfo.round}.`;
  else if (sessionInfo.kind === 'review') cycleText = '<strong>Due review complete:</strong> correct 2-day items move to a 7-day check; correct 7-day items leave the queue.';
  else if (sessionInfo.kind === 'writing') cycleText = '<strong>Writing is checked automatically:</strong> sentence count and each required structure are scored separately; the app does not ask the learner to self-mark.';
  document.getElementById('cycleResult').innerHTML = cycleText;
  show('results');
}

function toggleSound() {
  state.settings.sound = state.settings.sound === false;
  save();
  if (state.settings.sound) playTone('correct');
}

function playTone(kind) {
  if (state.settings.sound === false) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const audio = new AudioContext();
  const patterns = { correct: [440, 587], wrong: [311, 262], complete: [440, 554, 659] };
  const toneList = patterns[kind] || patterns.correct;
  toneList.forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + index * 0.11;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(kind === 'wrong' ? 0.03 : 0.045, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.17);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.19);
  });
  setTimeout(() => audio.close().catch(() => {}), toneList.length * 110 + 320);
}

function exportProgress() {
  state.lastBackup = new Date().toISOString();
  save();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'French_Revision_ParisNotebook_V1_progress.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function importProgress(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.attempts) || !data.reviews) throw new Error('Invalid backup');
      state = mergeState(data);
      save();
      migrationMessage = 'Progress backup restored successfully.';
      showDashboard();
    } catch (error) {
      alert('This does not look like a valid French Revision progress backup.');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function resetProgress() {
  const message = 'Reset all French Revision scores, writing records, mastery cycles, paused practice and review dates on this device? Export a backup first if needed.';
  if (!confirm(message)) return;
  state = emptyState();
  save();
  migrationMessage = '';
  showDashboard();
}

renderDashboard();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
