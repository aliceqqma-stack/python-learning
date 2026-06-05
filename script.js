const STORAGE_KEY = 'studentAcademicDashboardV1';
const moduleList = document.getElementById('module-list');
const moduleDetail = document.getElementById('module-detail');
const addModuleBtn = document.getElementById('add-module-btn');
const addModuleMini = document.getElementById('add-module-mini');
const clearBtn = document.getElementById('clear-btn');
const semesterAverageEl = document.getElementById('semester-average');
const semesterGpaEl = document.getElementById('semester-gpa');
const semesterStatusEl = document.getElementById('semester-status');
const degreePredictionEl = document.getElementById('degree-prediction');
const predictionDetailEl = document.getElementById('prediction-detail');
const moduleCountEl = document.getElementById('module-count');
const creditCountEl = document.getElementById('credit-count');
const classificationBadgeEl = document.getElementById('classification-badge');
const gpaRingEl = document.getElementById('gpa-ring');
const gpaMessageEl = document.getElementById('gpa-message');

let selectedModuleId = null;
let moduleChart = null;
let weightChart = null;
const summaryAnimationFrames = new WeakMap();

let state = {
  modules: [
    {
      id: crypto.randomUUID(), name: 'BUS268', credits: 20, target: 70, finalExamScore: 70,
      assessments: [
        { id: crypto.randomUUID(), name: 'Coursework', score: 72, weight: 40, isFinal: false },
        { id: crypto.randomUUID(), name: 'Final Exam', score: 70, weight: 60, isFinal: true }
      ]
    },
    {
      id: crypto.randomUUID(), name: 'Digital Strategy', credits: 20, target: 70, finalExamScore: 67,
      assessments: [
        { id: crypto.randomUUID(), name: 'Case Study', score: 74, weight: 50, isFinal: false },
        { id: crypto.randomUUID(), name: 'Final Exam', score: 67, weight: 50, isFinal: true }
      ]
    }
  ]
};

function clamp(value, minimum, maximum) { return Math.min(Math.max(value, minimum), maximum); }

function getBand(grade) {
  if (grade >= 70) return { badge: 'Distinction', badgeClass: 'badge-distinction', degree: 'First Class', status: 'Distinction trajectory', message: 'You are operating in the highest performance band.' };
  if (grade >= 60) return { badge: 'Merit', badgeClass: 'badge-merit', degree: 'Upper Second (2:1)', status: 'Merit trajectory', message: 'You are building a strong upper-second profile.' };
  if (grade >= 50) return { badge: 'Pass', badgeClass: 'badge-pass', degree: 'Lower Second (2:2)', status: 'Pass trajectory', message: 'You are passing; focused gains can lift the prediction.' };
  if (grade >= 40) return { badge: 'Pass', badgeClass: 'badge-pass', degree: 'Third Class', status: 'Pass trajectory', message: 'You are passing, with room to build a stronger margin.' };
  return { badge: 'At risk', badgeClass: 'badge-risk', degree: 'Below classification', status: 'Action needed', message: 'Prioritise the highest-weight assessments to recover.' };
}

function gradeToGpa(grade) {
  if (grade >= 70) return 4;
  if (grade >= 65) return 3.7;
  if (grade >= 60) return 3.3;
  if (grade >= 55) return 3;
  if (grade >= 50) return 2.7;
  if (grade >= 45) return 2.3;
  if (grade >= 40) return 2;
  if (grade >= 35) return 1.3;
  return 0;
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.modules)) {
      state = saved;
      state.modules.forEach(module => { if (!Object.hasOwn(module, 'credits')) module.credits = 20; });
    }
  } catch (error) {
    console.warn('localStorage data was invalid and has been reset.', error);
    localStorage.removeItem(STORAGE_KEY);
  }
  selectedModuleId = state.modules[0]?.id || null;
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function getModuleGrade(module) { return module.assessments.reduce((sum, item) => sum + ((Number(item.score) || 0) * (Number(item.weight) || 0) / 100), 0); }
function getWeightTotal(module) { return module.assessments.reduce((sum, item) => sum + (Number(item.weight) || 0), 0); }
function getTotalCredits() { return state.modules.reduce((sum, module) => sum + (Number(module.credits) || 0), 0); }

function getSemesterAverage() {
  const totalCredits = getTotalCredits();
  if (!totalCredits) return 0;
  return state.modules.reduce((sum, module) => sum + getModuleGrade(module) * (Number(module.credits) || 0), 0) / totalCredits;
}

function getSemesterGpa() {
  const totalCredits = getTotalCredits();
  if (!totalCredits) return 0;
  return state.modules.reduce((sum, module) => sum + gradeToGpa(getModuleGrade(module)) * (Number(module.credits) || 0), 0) / totalCredits;
}

function animateValue(element, target, decimals = 2) {
  const start = Number(element.textContent) || 0;
  const duration = 520;
  const startedAt = performance.now();
  function tick(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = (start + (target - start) * eased).toFixed(decimals);
    if (progress < 1) summaryAnimationFrames.set(element, requestAnimationFrame(tick));
  }
  cancelAnimationFrame(summaryAnimationFrames.get(element));
  summaryAnimationFrames.set(element, requestAnimationFrame(tick));
}

function renderPreservingFocus(input) {
  const selectionStart = input.selectionStart;
  const selectionEnd = input.selectionEnd;
  let selector = null;
  if (input.dataset.moduleField) selector = `[data-module-field="${input.dataset.moduleField}"]`;
  else if (input.dataset.assessment) selector = `[data-assessment="${input.dataset.assessment}"][data-field="${input.dataset.field}"]`;
  else if (input.dataset.whatif) selector = `[data-whatif="${input.dataset.whatif}"]`;
  render();
  const replacement = selector ? moduleDetail.querySelector(selector) : null;
  if (!replacement) return;
  replacement.focus();
  if (typeof selectionStart === 'number' && typeof selectionEnd === 'number') replacement.setSelectionRange(selectionStart, selectionEnd);
}

function addModule() {
  const newModule = {
    id: crypto.randomUUID(), name: `Module ${state.modules.length + 1}`, credits: 20, target: 70, finalExamScore: 70,
    assessments: [
      { id: crypto.randomUUID(), name: 'Coursework', score: 0, weight: 50, isFinal: false },
      { id: crypto.randomUUID(), name: 'Final Exam', score: 70, weight: 50, isFinal: true }
    ]
  };
  state.modules.push(newModule); selectedModuleId = newModule.id; saveState(); render();
}

function deleteModule(id) { state.modules = state.modules.filter(module => module.id !== id); selectedModuleId = state.modules[0]?.id || null; saveState(); render(); }
function addAssessment(moduleId) { const module = state.modules.find(item => item.id === moduleId); if (!module) return; module.assessments.push({ id: crypto.randomUUID(), name: 'New Assessment', score: 0, weight: 0, isFinal: false }); saveState(); render(); }
function deleteAssessment(moduleId, assessmentId) { const module = state.modules.find(item => item.id === moduleId); if (!module) return; module.assessments = module.assessments.filter(item => item.id !== assessmentId); saveState(); render(); }

function updateField(moduleId, assessmentId, field, value) {
  const module = state.modules.find(item => item.id === moduleId); if (!module) return;
  if (!assessmentId) module[field] = field === 'name' ? value : Number(value);
  else { const assessment = module.assessments.find(item => item.id === assessmentId); if (!assessment) return; assessment[field] = field === 'name' ? value : Number(value); if (assessment.isFinal) module.finalExamScore = Number(assessment.score) || 0; }
  saveState();
}

function applyWhatIf(moduleId, score) { const module = state.modules.find(item => item.id === moduleId); if (!module) return; module.finalExamScore = Number(score); const final = module.assessments.find(item => item.isFinal); if (final) final.score = Number(score); saveState(); }
function neededFinalScore(module) { const final = module.assessments.find(item => item.isFinal); if (!final || !final.weight) return null; const currentWithoutFinal = module.assessments.filter(item => !item.isFinal).reduce((sum, item) => sum + ((Number(item.score) || 0) * (Number(item.weight) || 0) / 100), 0); return (Number(module.target) - currentWithoutFinal) / (Number(final.weight) / 100); }

function renderModuleList() {
  moduleList.innerHTML = state.modules.map(module => {
    const grade = getModuleGrade(module); const active = module.id === selectedModuleId ? 'active' : ''; const band = getBand(grade);
    return `<button class="module-tab ${active}" data-select="${module.id}"><span>${escapeHtml(module.name)}</span><strong>${grade.toFixed(1)}%</strong><small>${Number(module.credits) || 0} credits | ${band.badge}</small></button>`;
  }).join('');
}

function renderDetail() {
  const module = state.modules.find(item => item.id === selectedModuleId);
  if (!module) { moduleDetail.innerHTML = '<div class="empty-state">Add a module to start mapping your semester.</div>'; return; }
  const grade = getModuleGrade(module); const moduleGpa = gradeToGpa(grade); const weightTotal = getWeightTotal(module); const needed = neededFinalScore(module); const band = getBand(grade); const warning = Math.abs(weightTotal - 100) > .01;
  const neededText = needed === null ? 'Select a final assessment' : needed > 100 ? `${needed.toFixed(1)}% - target needs review` : needed < 0 ? 'Target already secured' : `${needed.toFixed(1)}%`;
  moduleDetail.innerHTML = `
    <div class="detail-header"><input class="module-title" value="${escapeHtml(module.name)}" data-module-field="name" aria-label="Module name"><button class="danger-btn" data-delete-module="${module.id}">Delete module</button></div>
    <div class="module-hero"><div class="grade-lockup"><span>Live module grade</span><strong class="big-grade">${grade.toFixed(2)}%</strong><div class="module-badge ${band.badgeClass}">${band.badge}</div></div><div class="module-stats"><div class="mini-stat"><span>GPA value</span><strong>${moduleGpa.toFixed(1)} / 4.0</strong></div><div class="mini-stat"><span>Credits</span><strong>${Number(module.credits) || 0}</strong></div><div class="mini-stat"><span>Target</span><strong>${Number(module.target) || 0}%</strong></div><div class="mini-stat"><span>Assessments</span><strong>${module.assessments.length}</strong></div></div></div>
    <div class="progress-track"><div class="progress-bar" style="width:${clamp(grade,0,100)}%"></div></div><div class="weight-note ${warning ? 'warning' : 'success'}"><span>Assessment weighting</span><strong>${weightTotal}% ${warning ? '- should equal 100%' : '- complete'}</strong></div>
    <div class="section-title"><div><p class="card-kicker">Grade builder</p><h3>Assessments</h3></div><p>Choose one final assessment</p></div><div class="assessment-head"><span>Assessment</span><span>Score</span><span>Weight</span><span>Final</span><span></span></div>
    ${module.assessments.map(item => `<div class="assessment-row"><input value="${escapeHtml(item.name)}" data-assessment="${item.id}" data-field="name" aria-label="Assessment name"><input type="number" min="0" max="100" value="${item.score}" data-assessment="${item.id}" data-field="score" aria-label="Assessment score"><input type="number" min="0" max="100" value="${item.weight}" data-assessment="${item.id}" data-field="weight" aria-label="Assessment weight"><label class="final-label"><input type="radio" name="final-assessment" ${item.isFinal ? 'checked' : ''} data-final="${item.id}" aria-label="Final assessment"></label><button class="delete-assessment" data-delete-assessment="${item.id}" aria-label="Delete assessment">x</button></div>`).join('')}
    <button class="add-assessment-btn" data-add-assessment="${module.id}">+ Add assessment</button>
    <section class="tools-grid"><div class="tool-card"><p class="card-kicker">Goal calculator</p><h3>Reverse-engineer your target</h3><label>Target module grade</label><input type="number" min="0" max="100" value="${module.target}" data-module-field="target"><p>Required final score: <strong>${neededText}</strong></p></div><div class="tool-card"><p class="card-kicker">What-if simulator</p><h3>Preview the final result</h3><label>Final assessment: <strong>${module.finalExamScore}%</strong></label><input type="range" min="0" max="100" value="${module.finalExamScore}" data-whatif="${module.id}"><label>Module credits</label><input type="number" min="0" max="120" value="${module.credits}" data-module-field="credits"></div></section>`;
}

function renderSummary() {
  const average = getSemesterAverage(); const gpa = getSemesterGpa(); const totalCredits = getTotalCredits(); const band = getBand(average);
  animateValue(semesterAverageEl, average); animateValue(semesterGpaEl, gpa); gpaRingEl.style.setProperty('--gpa-progress', `${clamp((gpa / 4) * 100,0,100)}%`);
  semesterStatusEl.textContent = state.modules.length ? band.status : 'Add your results'; degreePredictionEl.textContent = state.modules.length ? band.degree : 'Awaiting data'; predictionDetailEl.textContent = state.modules.length ? `Predicted from ${totalCredits} credits` : 'Based on this semester'; moduleCountEl.textContent = state.modules.length; creditCountEl.textContent = `${totalCredits} credits tracked`; gpaMessageEl.textContent = state.modules.length ? band.message : 'Your GPA and prediction will update as you edit.'; classificationBadgeEl.textContent = state.modules.length ? band.badge : 'Awaiting data'; classificationBadgeEl.className = `classification-badge ${state.modules.length ? band.badgeClass : 'badge-neutral'}`;
}

function renderCharts() {
  const labels = state.modules.map(module => module.name); const grades = state.modules.map(module => getModuleGrade(module)); const selected = state.modules.find(item => item.id === selectedModuleId); const weightLabels = selected?.assessments.map(item => item.name) || []; const weights = selected?.assessments.map(item => Number(item.weight) || 0) || []; const textColor = '#697590'; const gridColor = 'rgba(104,122,168,.12)';
  if (moduleChart) moduleChart.destroy(); if (weightChart) weightChart.destroy();
  moduleChart = new Chart(document.getElementById('moduleChart'), { type: 'bar', data: { labels, datasets: [{ label: 'Module grade', data: grades, borderRadius: 10, borderSkipped: false, backgroundColor: ['#7258f5','#4896f7','#31c5d7','#30b781'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: textColor } }, y: { min: 0, max: 100, grid: { color: gridColor }, ticks: { color: textColor } } } } });
  weightChart = new Chart(document.getElementById('weightChart'), { type: 'doughnut', data: { labels: weightLabels, datasets: [{ data: weights, borderWidth: 4, borderColor: 'rgba(255,255,255,.72)', backgroundColor: ['#7258f5','#4896f7','#31c5d7','#30b781','#e7a83b'] }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: textColor, boxWidth: 9, usePointStyle: true } } } } });
}

function render() { renderModuleList(); renderDetail(); renderSummary(); renderCharts(); }
moduleList.addEventListener('click', event => { const id = event.target.closest('[data-select]')?.dataset.select; if (id) { selectedModuleId = id; render(); } });
moduleDetail.addEventListener('input', event => { const module = state.modules.find(item => item.id === selectedModuleId); if (!module) return; if (event.target.dataset.moduleField) updateField(module.id,null,event.target.dataset.moduleField,event.target.value); if (event.target.dataset.assessment) updateField(module.id,event.target.dataset.assessment,event.target.dataset.field,event.target.value); if (event.target.dataset.whatif) applyWhatIf(module.id,event.target.value); renderPreservingFocus(event.target); });
moduleDetail.addEventListener('change', event => { const module = state.modules.find(item => item.id === selectedModuleId); if (!module || !event.target.dataset.final) return; module.assessments.forEach(item => { item.isFinal = item.id === event.target.dataset.final; }); const final = module.assessments.find(item => item.isFinal); module.finalExamScore = Number(final.score) || 0; saveState(); render(); });
moduleDetail.addEventListener('click', event => { const module = state.modules.find(item => item.id === selectedModuleId); if (!module) return; if (event.target.dataset.addAssessment) addAssessment(module.id); if (event.target.dataset.deleteAssessment) deleteAssessment(module.id,event.target.dataset.deleteAssessment); if (event.target.dataset.deleteModule) deleteModule(module.id); });
addModuleBtn.addEventListener('click', addModule); addModuleMini.addEventListener('click', addModule); clearBtn.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); location.reload(); });
loadState(); render();
