const assessmentList = document.getElementById('assessment-list');
const addButton = document.getElementById('add-assessment-btn');
const calculateButton = document.getElementById('calculate-btn');
const weightMessage = document.getElementById('weight-message');
const results = document.getElementById('results');

// Create one assessment input row
function addAssessment() {
  const row = document.createElement('div');
  row.className = 'assessment-row';

  row.innerHTML = `
    <input type="text" placeholder="Assessment Name">
    <input type="number" placeholder="Score">
    <input type="number" placeholder="Weight %">
  `;

  assessmentList.appendChild(row);
}

// Calculate weighted grade
function calculateGrade() {
  const rows = document.querySelectorAll('.assessment-row');

  let totalWeight = 0;
  let finalGrade = 0;
  let output = '<h2>Results</h2><ul>';

  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');

    const name = inputs[0].value;
    const score = parseFloat(inputs[1].value) || 0;
    const weight = parseFloat(inputs[2].value) || 0;

    totalWeight += weight;

    const contribution = score * (weight / 100);
    finalGrade += contribution;

    output += `<li>${name}: Score ${score}, Weight ${weight}% → Contribution ${contribution.toFixed(2)}</li>`;
  });

  output += '</ul>';

  if (Math.abs(totalWeight - 100) > 0.01) {
    weightMessage.textContent = `Weight total is ${totalWeight}%. It must equal 100%.`;
    results.innerHTML = '';
    return;
  }

  weightMessage.textContent = 'Weight total = 100% ✓';

  output += `<h3>Final Weighted Grade: ${finalGrade.toFixed(2)}</h3>`;

  results.innerHTML = output;
}

addButton.addEventListener('click', addAssessment);
calculateButton.addEventListener('click', calculateGrade);

// Create the first row automatically when page loads
addAssessment();
