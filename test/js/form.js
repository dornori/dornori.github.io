// Dornori Support System - Enterprise Edition
let currentData = null;
let currentCategory = null;
let currentQuestionIndex = 0;
let issueSummary = [];
let sessionId = 'SID-' + Math.random().toString(36).substring(2, 10);
let categoryClickCount = JSON.parse(localStorage.getItem('dornori_analytics') || '{}');

function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toastMsg');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, duration);
}

async function loadFormData() {
  document.getElementById('loadingIndicator').style.display = 'block';
  document.getElementById('appContent').style.display = 'none';
  
  try {
    // FIXED PATH - works for your structure
    const response = await fetch('data/form.json');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    currentData = await response.json();
    
    document.getElementById('mainTitle').textContent = currentData.title;
    document.getElementById('subtitle').textContent = currentData.subtitle;
    
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
    
    renderCategories();
    
    if (window.location.hash === '#admin' || new URLSearchParams(window.location.search).get('admin') === 'true') {
      document.getElementById('adminPanel').classList.remove('hidden');
      renderAnalyticsChart();
    }
  } catch (error) {
    console.error("Error loading form.json:", error);
    document.getElementById('loadingIndicator').innerHTML = `
      <i class="fas fa-exclamation-triangle text-3xl text-red-500"></i>
      <p class="mt-2">Failed to load support data.</p>
      <p class="text-sm text-gray-500 mt-2">Error: ${error.message}</p>
      <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg">Retry</button>
    `;
    showToast("Failed to load support data. Please refresh the page.", 5000);
  }
}

function renderCategories() {
  const container = document.getElementById('categoryButtons');
  if (!container) return;
  container.innerHTML = '';
  
  currentData.categories.forEach(category => {
    const btn = document.createElement('button');
    btn.className = `w-full text-left px-6 py-5 border border-gray-200 hover:border-orange-400 hover:bg-orange-50 rounded-2xl transition-all duration-200 flex items-center gap-3 font-medium shadow-sm`;
    btn.innerHTML = `<i class="fas fa-chevron-circle-right text-orange-400"></i> ${category.title}`;
    btn.onclick = () => startCategory(category);
    container.appendChild(btn);
  });
  
  showStep('step1');
  updateProgress(5);
  document.getElementById('progressText').innerHTML = 'Step 1: Choose category';
}

function startCategory(category) {
  currentCategory = category;
  currentQuestionIndex = 0;
  issueSummary = [
    `Category: ${category.title}`,
    `Session ID: ${sessionId}`,
    `Timestamp: ${new Date().toISOString()}`,
    `--- Diagnostic Log ---`
  ];
  
  if (!categoryClickCount[category.id]) categoryClickCount[category.id] = 0;
  categoryClickCount[category.id]++;
  localStorage.setItem('dornori_analytics', JSON.stringify(categoryClickCount));
  
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  if (!currentCategory || currentQuestionIndex >= currentCategory.questions.length) {
    showEmailForm();
    return;
  }
  
  const question = currentCategory.questions[currentQuestionIndex];
  let html = `
    <div class="mb-4">
      <div class="flex items-center gap-2 text-sm text-amber-600 mb-2">
        <i class="fas fa-question-circle"></i> Question ${currentQuestionIndex + 1}/${currentCategory.questions.length}
      </div>
      <h3 class="text-xl font-semibold text-gray-800 mb-6">${escapeHtml(question.text)}</h3>
      <div class="space-y-3">
  `;
  
  question.options.forEach((option, idx) => {
    html += `
      <button onclick="selectAnswer(${idx})" 
              class="w-full text-left px-6 py-4 border border-gray-200 hover:bg-amber-50 hover:border-amber-300 rounded-2xl transition text-gray-700 flex justify-between items-center">
        <span>${escapeHtml(option.text)}</span>
        <i class="fas fa-arrow-right text-orange-300"></i>
      </button>
    `;
  });
  
  html += `
      </div>
      <div class="mt-6">
        <button onclick="resetFullSession()" class="text-sm text-gray-400 hover:text-gray-600">
          <i class="fas fa-undo-alt"></i> Restart diagnostic
        </button>
      </div>
    </div>
  `;
  
  document.getElementById('troubleshooting').innerHTML = html;
  showStep('troubleshooting');
  updateProgress(45);
  document.getElementById('progressText').innerHTML = 'Step 2: Diagnosing issue';
}

window.selectAnswer = function(optionIndex) {
  const question = currentCategory.questions[currentQuestionIndex];
  const selected = question.options[optionIndex];
  
  issueSummary.push(`Q: ${question.text}`);
  issueSummary.push(`A: ${selected.text}`);
  if (selected.summary && selected.summary !== "") {
    issueSummary.push(`→ ${selected.summary}`);
  }
  issueSummary.push('---');
  
  if (selected.next === "contact" || currentQuestionIndex + 1 >= currentCategory.questions.length) {
    showEmailForm();
  } else {
    currentQuestionIndex++;
    renderCurrentQuestion();
  }
};

function showEmailForm() {
  const finalSummary = issueSummary.join('\n') + 
    `\n\n---\nUser Agent: ${navigator.userAgent}\nPlatform: ${navigator.platform}`;
  
  document.getElementById('message').value = finalSummary;
  showStep('emailForm');
  updateProgress(85);
  document.getElementById('progressText').innerHTML = 'Step 3: Contact support';
}

document.getElementById('contactForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const orderNumber = document.getElementById('orderNumber').value.trim();
  const priority = document.getElementById('priority').value;
  const message = document.getElementById('message').value;
  
  if (!name || !email) {
    showToast("Please fill in all fields.", 3000);
    return;
  }
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Sending...';
  submitBtn.disabled = true;
  
  // CHANGE THIS EMAIL TO YOUR ACTUAL SUPPORT EMAIL
  const submitUrl = "https://formsubmit.co/ajax/your-email@dornori.com";
  
  try {
    const response = await fetch(submitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        email: email,
        subject: `Dornori Support: ${currentCategory?.title || 'General'} Issue`,
        message: `Name: ${name}\nEmail: ${email}\nOrder: ${orderNumber || 'N/A'}\nPriority: ${priority}\nCategory: ${currentCategory?.title || 'General'}\n\n--- DIAGNOSTICS ---\n${message}`,
        _captcha: "false",
        _template: "table",
        _autoresponse: "Thank you for contacting Dornori Support. We will reply within 24 hours."
      })
    });
    
    if (response.ok) {
      showStep('successMessage');
      updateProgress(100);
      document.getElementById('progressText').innerHTML = 'Complete!';
      showToast("Ticket created! Check your email.", 4000);
    } else {
      throw new Error("Server error");
    }
  } catch (err) {
    console.error(err);
    showToast("Failed to send. Please try again.", 3000);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});

function showStep(stepId) {
  document.querySelectorAll('.step').forEach(step => {
    step.classList.add('hidden');
  });
  document.getElementById(stepId).classList.remove('hidden');
}

function updateProgress(percent) {
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = `${percent}%`;
}

window.resetFullSession = function() {
  currentCategory = null;
  currentQuestionIndex = 0;
  issueSummary = [];
  document.getElementById('contactForm')?.reset();
  renderCategories();
  updateProgress(5);
  document.getElementById('progressText').innerHTML = 'Step 1: Choose category';
  showToast("Session reset", 2000);
};

window.openKnowledgeBase = function() {
  window.open("https://help.dornori.com", "_blank");
};

window.startLiveChat = function() {
  showToast("Connecting to live agent...", 3000);
  setTimeout(() => window.open("https://dornori.com/live-chat", "_blank"), 500);
};

function renderAnalyticsChart() {
  const ctx = document.getElementById('issuesChart')?.getContext('2d');
  if (!ctx || Object.keys(categoryClickCount).length === 0) return;
  
  const labels = Object.keys(categoryClickCount);
  const data = Object.values(categoryClickCount);
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Issues reported',
        data: data,
        backgroundColor: '#F59E0B',
        borderRadius: 8
      }]
    },
    options: { responsive: true, maintainAspectRatio: true }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

document.addEventListener('DOMContentLoaded', loadFormData);