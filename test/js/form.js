// js/form.js
let currentData = {};
let issueSummary = [];
let currentPath = [];
let currentCategory = null;
let currentQuestionIndex = 0;

async function loadFormData() {
  try {
    const response = await fetch('../data/form.json');
    currentData = await response.json();

    document.getElementById('subtitle').textContent = currentData.subtitle;
    document.getElementById('mainTitle').textContent = currentData.title;

    renderCategories();
  } catch (error) {
    console.error("Error loading form.json:", error);
    alert("Failed to load support data. Please refresh the page.");
  }
}

function renderCategories() {
  const container = document.getElementById('categoryButtons');
  container.innerHTML = '';

  currentData.categories.forEach(category => {
    const btn = document.createElement('button');
    btn.className = `w-full text-left px-6 py-5 border border-gray-200 hover:border-orange-400 hover:bg-orange-50 rounded-2xl transition text-lg font-medium`;
    btn.textContent = category.title;
    btn.onclick = () => startCategory(category);
    container.appendChild(btn);
  });

  showStep('step1');
}

function startCategory(category) {
  currentCategory = category;
  currentQuestionIndex = 0;
  issueSummary = [`Category: ${category.title}`];
  currentPath = [];

  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  if (!currentCategory || currentQuestionIndex >= currentCategory.questions.length) {
    showEmailForm();
    return;
  }

  const question = currentCategory.questions[currentQuestionIndex];

  let html = `
    <div class="mb-8">
      <h2 class="text-2xl font-semibold text-gray-800 mb-6">${currentCategory.title}</h2>
      <p class="text-lg text-gray-700 mb-6">${question.text}</p>
      <div class="space-y-3">
  `;

  question.options.forEach((option, index) => {
    html += `
      <button onclick="selectAnswer(${index})" 
              class="w-full text-left px-6 py-4 border border-gray-200 hover:bg-orange-50 hover:border-orange-400 rounded-2xl transition text-gray-700">
        ${option.text}
      </button>`;
  });

  html += `</div></div>`;

  document.getElementById('troubleshooting').innerHTML = html;
  showStep('troubleshooting');
  updateProgress();
}

function selectAnswer(optionIndex) {
  const question = currentCategory.questions[currentQuestionIndex];
  const selected = question.options[optionIndex];

  if (selected.summary) {
    issueSummary.push(`Q: ${question.text}`);
    issueSummary.push(`A: ${selected.text}`);
    issueSummary.push(`→ ${selected.summary}`);
    issueSummary.push('---');
  }

  if (selected.next === "contact") {
    showEmailForm();
  } else {
    currentQuestionIndex++;
    renderCurrentQuestion();
  }
}

function showEmailForm() {
  const summaryText = issueSummary.join('\n');
  document.getElementById('message').value = summaryText;

  showStep('emailForm');
  updateProgress();
}

function showStep(stepId) {
  document.querySelectorAll('.step').forEach(step => {
    step.classList.add('hidden');
  });
  document.getElementById(stepId).classList.remove('hidden');
}

function updateProgress() {
  let stepNum = 1;
  if (!document.getElementById('step1').classList.contains('hidden')) stepNum = 1;
  else if (!document.getElementById('troubleshooting').classList.contains('hidden')) stepNum = 2;
  else if (!document.getElementById('emailForm').classList.contains('hidden')) stepNum = 5;

  const progressPercent = stepNum === 1 ? 20 : stepNum === 2 ? 60 : 95;

  document.getElementById('progressBar').style.width = `${progressPercent}%`;
  document.getElementById('progressText').textContent = 
    stepNum === 5 ? "Final Step" : `Step ${stepNum} of 5`;
}

// Form Submission using FormSubmit.co (Change to your email)
document.getElementById('contactForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  let message = document.getElementById('message').value.trim();

  if (!name || !email || !message) {
    alert("Please fill in all fields.");
    return;
  }

  const fullMessage = `Name: ${name}\nEmail: ${email}\n\nTroubleshooting Summary:\n${message}`;

  // ==================== CHANGE THIS EMAIL ====================
  const submitUrl = "https://formsubmit.co/your-email@dornori.com";

  try {
    const response = await fetch(submitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        email: email,
        subject: "Dornori Support Request - Troubleshooting",
        message: fullMessage,
        _captcha: "false",
        _template: "table",
        _autoresponse: "Thank you for contacting Dornori Support. We will reply shortly."
      })
    });

    if (response.ok) {
      showStep('successMessage');
    } else {
      alert("Failed to send message. Please try again.");
    }
  } catch (err) {
    console.error(err);
    alert("Connection error. Please check your internet and try again.");
  }
});

function resetForm() {
  issueSummary = [];
  currentPath = [];
  currentCategory = null;
  currentQuestionIndex = 0;
  document.getElementById('contactForm').reset();
  showStep('step1');
  updateProgress();
}

// Initialize when page loads
window.onload = loadFormData;