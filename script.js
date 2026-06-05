const STORAGE_KEY = 'studentAcademicDashboardV1';

const moduleList = document.getElementById('module-list');
const moduleDetail = document.getElementById('module-detail');
const addModuleBtn = document.getElementById('add-module-btn');
const clearBtn = document.getElementById('clear-btn');
const semesterAverageEl = document.getElementById('semester-average');
const semesterClassificationEl = document.getElementById('semester-classification');
const semesterStatusEl = document.getElementById('semester-status');

let selectedModuleId = null;
let moduleChart = null;
let weightChart = null;

let state = {
  modules: [
    {
      id: crypto.randomUUID(),
      name: 'BUS268',
      target: 70,
      finalExamScore: 70,
      assessments: [
        { id: crypto.randomUUID(), name: 'Coursework', score: 72, weight: 40, isFinal: false },
        { id: crypto.randomUUID(), name: 'Final Exam', score: 70, weight: 60, isFinal: true }
      ]
    }
  ]
};

function classify(grade) {
  if (grade >= 70) return 'Distinction / First';
  if (grade >= 60) return 'Merit / Upper Second';
  if (grade >= 50) return 'Pass / Lower Second';
  if (grade >= 40) return 'Third';
  return 'Fail';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.modules)) state = saved;
  } catch (error) {
    console.warn('localStorage data was invalid and has been reset.', error);
    localStorage.removeItem(STORAGE_KEY);
  }
  selectedModuleId = state.modules[0]?.id || null;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getModuleGrade(module) {
  return module.assessments.reduce((sum, item) => sum + ((Number(item.score) || 0) * (Number(item.weight) || 0) / 100), 0);
}

function getWeightTotal(module) {
  return module.assessments.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
}

function getSemesterAverage() {
  if (!state.modules.length) return 0;
  const total = state.modules.reduce((sum, module) => sum + getModuleGrade(module), 0);
  return total / state.modules.length;
}

function animateNumber(element, target) {
  const start = Number(element.textContent) || 0;
  const duration = 500;
  const startedAt = performance.now();
  function tick(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const value = start + (target - start) * progress;
    element.textContent = value.toFixed(2);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderPreservingFocus(input) {
  const selectionStart = input.selectionStart;
  const selectionEnd = input.selectionEnd;
  let selector = null;

  if (input.dataset.moduleField) {
    selector = `[data-module-field="${input.dataset.moduleField}"]`;
  } else if (input.dataset.assessment) {
    selector = `[data-assessment="${input.dataset.assessment}"][data-field="${input.dataset.field}"]`;
  } else if (input.dataset.whatif) {
    selector = `[data-whatif="${input.dataset.whatif}"]`;
  }

  render();
  const replacement = selector ? moduleDetail.querySelector(selector) : null;
  if (!replacement) return;

  replacement.focus();
  if (typeof selectionStart === 'number' && typeof selectionEnd === 'number') {
    replacement.setSelectionRange(selectionStart, selectionEnd);
  }
}

function addModule() {
  const newModule = {
    id: crypto.randomUUID(),
    name: `Module ${state.modules.length + 1}`,
    target: 70,
    finalExamScore: 70,
    assessments: [
      { id: crypto.randomUUID(), name: 'Coursework', score: 0, weight: 50, isFinal: false },
      { id: crypto.randomUUID(), name: 'Final Exam', score: 70, weight: 50, isFinal: true }
    ]
  };
  state.modules.push(newModule);
  selectedModuleId = newModule.id;
  saveState();
  render();
}

function deleteModule(id) {
  state.modules = state.modules.filter(module => module.id !== id);
  selectedModuleId = state.modules[0]?.id || null;
  saveState();
  render();
}

function addAssessment(moduleId) {
  const module = state.modules.find(item => item.id === moduleId);
  module.assessments.push({ id: crypto.randomUUID(), name: 'New Assessment', score: 0, weight: 0, isFinal: false });
  saveState();
  render();
}

function deleteAssessment(moduleId, assessmentId) {
  const module = state.modules.find(item => item.id === moduleId);
  module.assessments = module.assessments.filter(item => item.id !== assessmentId);
  saveState();
  render();
}

function updateField(moduleId, assessmentId, field, value) {
  const module = state.modules.find(item => item.id === moduleId);
  if (!assessmentId) {
    module[field] = field === 'target' || field === 'finalExamScore' ? Number(value) : value;
  } else {
    const assessment = module.assessments.find(item => item.id === assessmentId);
    assessment[field] = field === 'name' ? value : Number(value);
    if (assessment.isFinal) module.finalExamScore = Number(assessment.score) || 0;
  }
  saveState();
}

function applyWhatIf(moduleId, score) {
  const module = state.modules.find(item => item.id === moduleId);
  module.finalExamScore = Number(score);
  const final = module.assessments.find(item => item.isFinal);
  if (final) final.score = Number(score);
  saveState();
}

function neededFinalScore(module) {
  const final = module.assessments.find(item => item.isFinal);
  if (!final || !final.weight) return null;
  const currentWithoutFinal = module.assessments
    .filter(item => !item.isFinal)
    .reduce((sum, item) => sum + ((Number(item.score) || 0) * (Number(item.weight) || 0) / 100), 0);
  return (Number(module.target) - currentWithoutFinal) / (Number(final.weight) / 100);
}

function renderModuleList() {
  moduleList.innerHTML = state.modules.map(module => {
    const grade = getModuleGrade(module);
    const active = module.id === selectedModuleId ? 'active' : '';
    return `<button class="module-tab ${active}" data-select="${module.id}">
      <span>${escapeHtml(module.name)}</span><strong>${grade.toFixed(1)}</strong>
    </button>`;
  }).join('');
}

function renderDetail() {
  const module = state.modules.find(item => item.id === selectedModuleId);
  if (!module) {
    moduleDetail.innerHTML = '<div class="empty-state">Click + Module to start your dashboard.</div>';
    return;
  }
  const grade = getModuleGrade(module);
  const weightTotal = getWeightTotal(module);
  const needed = neededFinalScore(module);
  const warning = Math.abs(weightTotal - 100) > 0.01;

  moduleDetail.innerHTML = `
    <div class="detail-header">
      <input class="module-title" value="${escapeHtml(module.name)}" data-module-field="name">
      <button class="danger-btn" data-delete-module="${module.id}">Delete Module</button>
    </div>
    <div class="module-overview">
      <div><span>Module Grade</span><strong class="big-grade">${grade.toFixed(2)}</strong></div>
      <div><span>Classification</span><strong>${classify(grade)}</strong></div>
      <div class="progress-track"><div class="progress-bar" style="width:${Math.min(grade,100)}%"></div></div>
    </div>
    <p class="${warning ? 'warning' : 'success'}">Weight total: ${weightTotal}% ${warning ? '— must equal 100%' : '✓'}</p>
    <h3>Assessments</h3>
    ${module.assessments.map(item => `
      <div class="assessment-row">
        <input value="${escapeHtml(item.name)}" data-assessment="${item.id}" data-field="name">
        <input type="number" value="${item.score}" data-assessment="${item.id}" data-field="score">
        <input type="number" value="${item.weight}" data-assessment="${item.id}" data-field="weight">
        <label><input type="radio" name="final-assessment" ${item.isFinal ? 'checked' : ''} data-final="${item.id}"> Final</label>
        <button class="ghost-btn" data-delete-assessment="${item.id}">Delete</button>
      </div>`).join('')}
    <button data-add-assessment="${module.id}">+ Assessment</button>
    <section class="tools-grid">
      <div class="tool-card"><h3>Goal Calculator</h3><label>Target grade</label><input type="number" value="${module.target}" data-module-field="target"><p>Final Exam needed: <strong>${needed === null ? 'No final exam selected' : needed.toFixed(2)}</strong></p></div>
      <div class="tool-card"><h3>What-if Simulator</h3><label>Final Exam: ${module.finalExamScore}</label><input type="range" min="0" max="100" value="${module.finalExamScore}" data-whatif="${module.id}"></div>
    </section>`;
}

function renderSummary() {
  const average = getSemesterAverage();
  animateNumber(semesterAverageEl, average);
  semesterClassificationEl.textContent = classify(average);
  semesterStatusEl.textContent = average >= 70 ? 'Distinction' : average >= 60 ? 'Merit' : average >= 50 ? 'Pass' : average >= 40 ? 'Third' : 'At risk';
}

function renderCharts() {
  const labels = state.modules.map(module => module.name);
  const grades = state.modules.map(module => getModuleGrade(module));
  const selected = state.modules.find(item => item.id === selectedModuleId);
  const weightLabels = selected?.assessments.map(item => item.name) || [];
  const weights = selected?.assessments.map(item => Number(item.weight) || 0) || [];

  if (moduleChart) moduleChart.destroy();
  if (weightChart) weightChart.destroy();

  moduleChart = new Chart(document.getElementById('moduleChart'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Module Grade', data: grades }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }
  });

  weightChart = new Chart(document.getElementById('weightChart'), {
    type: 'pie',
    data: { labels: weightLabels, datasets: [{ data: weights }] },
    options: { responsive: true }
  });
}

function render() {
  renderModuleList();
  renderDetail();
  renderSummary();
  renderCharts();
}

moduleList.addEventListener('click', event => {
  const id = event.target.closest('[data-select]')?.dataset.select;
  if (id) {
    selectedModuleId = id;
    render();
  }
});

moduleDetail.addEventListener('input', event => {
  const module = state.modules.find(item => item.id === selectedModuleId);
  if (!module) return;
  if (event.target.dataset.moduleField) updateField(module.id, null, event.target.dataset.moduleField, event.target.value);
  if (event.target.dataset.assessment) updateField(module.id, event.target.dataset.assessment, event.target.dataset.field, event.target.value);
  if (event.target.dataset.whatif) applyWhatIf(module.id, event.target.value);
  renderPreservingFocus(event.target);
});

moduleDetail.addEventListener('change', event => {
  const module = state.modules.find(item => item.id === selectedModuleId);
  if (!module) return;
  if (event.target.dataset.final) {
    module.assessments.forEach(item => item.isFinal = item.id === event.target.dataset.final);
    const final = module.assessments.find(item => item.isFinal);
    module.finalExamScore = Number(final.score) || 0;
    saveState();
    render();
  }
});

moduleDetail.addEventListener('click', event => {
  const module = state.modules.find(item => item.id === selectedModuleId);
  if (!module) return;
  if (event.target.dataset.addAssessment) addAssessment(module.id);
  if (event.target.dataset.deleteAssessment) deleteAssessment(module.id, event.target.dataset.deleteAssessment);
  if (event.target.dataset.deleteModule) deleteModule(module.id);
});

addModuleBtn.addEventListener('click', addModule);
clearBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

loadState();
render();
