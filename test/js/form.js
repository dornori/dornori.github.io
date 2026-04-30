// Dornori Support System - Fully Internationalized
// All text loaded from JSON, supports multiple languages

let currentData = {};
let currentCategory = null;
let currentQuestionIndex = 0;
let issueSummary = [];
let sessionId = 'SID-' + Math.random().toString(36).substring(2, 10);
let categoryClickCount = JSON.parse(localStorage.getItem('dornori_analytics') || '{}');
let currentLanguage = 'en';

// Toast notification
function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toastMsg');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, duration);
}

// Load form data from JSON
async function loadFormData(lang = 'en') {
  currentLanguage = lang;
  
  // Show loading
  document.getElementById('loadingIndicator').style.display = 'block';
  document.getElementById('appContent').style.display = 'none';
  
  try {
    const response = await fetch(`data/form.json?lang=${lang}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    currentData = await response.json();
    
    // Update UI with loaded text
    applyTranslations();
    
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
    
    renderCategories();
    renderAnalyticsChart();
    
    // Check for admin mode
    if (window.location.hash === '#admin' || new URLSearchParams(window.location.search).get('admin') === 'true') {
      document.getElementById('adminPanel').classList.remove('hidden');
    }
  } catch (error) {
    console.error("Error loading form.json:", error);
    document.getElementById('loadingIndicator').innerHTML = `
      <i class="fas fa-exclamation-triangle text-3xl text-red-500"></i>
      <p class="mt-2">Failed to load support data. Please refresh the page.</p>
    `;
    showToast("Failed to load support data. Please check your connection.", 5000);
  }
}

// Apply all translations from JSON
function applyTranslations() {
  // Header texts
  document.getElementById('brandName').textContent = currentData.ui.brandName || 'Support';
  document.getElementById('tagline').textContent = currentData.ui.tagline || 'Enterprise helpdesk';
  document.getElementById('mainTitle').textContent = currentData.ui.mainTitle || 'Dornori Support Assistant';
  document.getElementById('subtitle').textContent = currentData.ui.subtitle || 'Step-by-step troubleshooting';
  
  // Buttons
  document.getElementById('kbBtn').innerHTML = `<i class="far fa-file-alt mr-1"></i> ${currentData.ui.knowledgeBaseBtn || 'Knowledge base'}`;
  document.getElementById('newTicketBtn').innerHTML = `<i class="fas fa-redo-alt mr-1"></i> ${currentData.ui.newTicketBtn || 'New ticket'}`;
  
  // Progress & status
  document.getElementById('avgResolution').textContent = currentData.ui.avgResolution || 'Avg. resolution 4.2min';
  document.getElementById('selectIssueText').textContent = currentData.ui.selectIssueText || 'Select your product issue';
  document.getElementById('secureText').textContent = currentData.ui.secureText || 'Secure & encrypted · GDPR compliant';
  
  // Form labels
  document.getElementById('stillNeedHelp').textContent = currentData.ui.stillNeedHelp || 'Still unresolved?';
  document.getElementById('responseTimeText').textContent = currentData.ui.responseTimeText || 'Our support engineers typically reply within 2 hours (business days).';
  document.getElementById('nameLabel').innerHTML = `${currentData.ui.nameLabel || 'Full name'} <span class="text-red-500">*</span>`;
  document.getElementById('emailLabel').innerHTML = `${currentData.ui.emailLabel || 'Email address'} <span class="text-red-500">*</span>`;
  document.getElementById('orderLabel').textContent = currentData.ui.orderLabel || 'Order number (optional)';
  document.getElementById('priorityLabel').textContent = currentData.ui.priorityLabel || 'Priority assessment';
  document.getElementById('messageLabel').textContent = currentData.ui.messageLabel || 'Message';
  document.getElementById('submitBtn').innerHTML = `<i class="fas fa-paper-plane mr-2"></i> ${currentData.ui.submitBtn || 'Send Support Request'}`;
  document.getElementById('liveChatBtn').innerHTML = `<i class="fab fa-rocketchat mr-2"></i> ${currentData.ui.liveChatBtn || 'Live chat'}`;
  
  // Priority options
  document.getElementById('priorityNormal').textContent = currentData.ui.priorityNormal || '🚀 Normal (response less than 24h)';
  document.getElementById('priorityHigh').textContent = currentData.ui.priorityHigh || '⚠️ High – lamp not working, safety issue';
  document.getElementById('priorityUrgent').textContent = currentData.ui.priorityUrgent || '🔥 Urgent – business/production stop';
  
  // Success messages
  document.getElementById('thankYouText').textContent = currentData.ui.thankYouText || 'Thank You!';
  document.getElementById('successText').textContent = currentData.ui.successText || 'Your message was sent successfully. We will reply within 24-48 hours.';
  document.getElementById('newRequestBtn').textContent = currentData.ui.newRequestBtn || 'New Request';
  document.getElementById('analyticsTitle').textContent = currentData.ui.analyticsTitle || 'Support analytics';
}

// Render category buttons
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
  updateProgressBar(5);
  document.getElementById('progressText').innerHTML = currentData.ui.step1Text || 'Step 1: Choose category';
}

// Start a category
function startCategory(category) {
  currentCategory = category;
  currentQuestionIndex = 0;
  issueSummary = [
    `[Category] ${category.title}`,
    `Session ID: ${sessionId}`,
    `Timestamp: ${new Date().toISOString()}`,
    `Language: ${currentLanguage}`,
    `--- Diagnostic Log ---`
  ];
  
  // Update analytics
  if (!categoryClickCount[category.id]) categoryClickCount[category.id] = 0;
  categoryClickCount[category.id]++;
  localStorage.setItem('dornori_analytics', JSON.stringify(categoryClickCount));
  
  renderCurrentQuestion();
}

// Render current question
function renderCurrentQuestion() {
  if (!currentCategory || currentQuestionIndex >= currentCategory.questions.length) {
    showEmailForm();
    return;
  }
  
  const question = currentCategory.questions[currentQuestionIndex];
  let html = `
    <div class="mb-4">
      <div class="flex items-center gap-2 text-sm text-amber-600 mb-2">
        <i class="fas fa-question-circle"></i> ${currentData.ui.questionText || 'Question'} ${currentQuestionIndex + 1}/${currentCategory.questions.length}
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
          <i class="fas fa-undo-alt"></i> ${currentData.ui.restartBtn || 'Restart diagnostic'}
        </button>
      </div>
    </div>
  `;
  
  document.getElementById('troubleshooting').innerHTML = html;
  showStep('troubleshooting');
  updateProgressBar(45);
  document.getElementById('progressText').innerHTML = currentData.ui.step2Text || 'Step 2: Diagnosing issue';
}

// Handle answer selection
window.selectAnswer = function(optionIndex) {
  const question = currentCategory.questions[currentQuestionIndex];
  const selected = question.options[optionIndex];
  
  issueSummary.push(`Q: ${question.text}`);
  issueSummary.push(`A: ${selected.text}`);
  if (selected.summary && selected.summary !== "") {
    issueSummary.push(`→ ${currentData.ui.diagnosisPrefix || 'Diagnosis'}: ${selected.summary}`);
  }
  issueSummary.push('---');
  
  if (selected.next === "contact" || currentQuestionIndex + 1 >= currentCategory.questions.length) {
    showEmailForm();
  } else {
    currentQuestionIndex++;
    renderCurrentQuestion();
  }
};

// Show email form
function showEmailForm() {
  const finalSummary = issueSummary.join('\n') + 
    `\n\n---\n${currentData.ui.userAgentText || 'User Agent'}: ${navigator.userAgent}\n${currentData.ui.platformText || 'Platform'}: ${navigator.platform}`;
  
  document.getElementById('message').value = finalSummary;
  showStep('emailForm');
  updateProgressBar(85);
  document.getElementById('progressText').innerHTML = currentData.ui.step3Text || 'Step 3: Contact support';
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const orderNumber = document.getElementById('orderNumber').value.trim();
  const priority = document.getElementById('priority').value;
  const message = document.getElementById('message').value;
  
  if (!name || !email) {
    showToast(currentData.ui.fillAllFields || "Please fill in all fields.", 3000);
    return;
  }
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Sending...';
  submitBtn.disabled = true;
  
  // Update to your actual formsubmit email
  const submitUrl = "https://formsubmit.co/ajax/your-email@dornori.com";
  
  try {
    const response = await fetch(submitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        email: email,
        subject: `[Dornori Support] ${currentCategory?.title || 'General'} Issue - Priority: ${priority}`,
        message: `Name: ${name}\nEmail: ${email}\nOrder: ${orderNumber || 'N/A'}\nPriority: ${priority}\nCategory: ${currentCategory?.title || 'General'}\nLanguage: ${currentLanguage}\n\n--- DIAGNOSTICS ---\n${message}`,
        _captcha: "false",
        _template: "table",
        _autoresponse: currentData.ui.autoresponseText || "Thank you for contacting Dornori Support. We will reply shortly."
      })
    });
    
    if (response.ok) {
      showStep('successMessage');
      updateProgressBar(100);
      document.getElementById('progressText').innerHTML = currentData.ui.completeText || 'Complete!';
      showToast(currentData.ui.successToast || "Ticket created! Check your email.", 4000);
    } else {
      throw new Error("Server error");
    }
  } catch (err) {
    console.error(err);
    showToast(currentData.ui.errorText || "Failed to send. Please try again.", 3000);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// UI Helpers
function showStep(stepId) {
  document.querySelectorAll('.step').forEach(step => {
    step.classList.add('hidden');
  });
  const targetStep = document.getElementById(stepId);
  if (targetStep) targetStep.classList.remove('hidden');
}

function updateProgressBar(percent) {
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = `${Math.min(100, percent)}%`;
}

window.resetFullSession = function() {
  currentCategory = null;
  currentQuestionIndex = 0;
  issueSummary = [];
  document.getElementById('contactForm')?.reset();
  renderCategories();
  updateProgressBar(5);
  document.getElementById('progressText').innerHTML = currentData.ui?.step1Text || 'Step 1: Choose category';
  showToast(currentData.ui?.resetText || "Session reset", 2000);
};

window.openKnowledgeBase = function() {
  window.open("https://help.dornori.com", "_blank");
};

window.startLiveChat = function() {
  showToast(currentData.ui?.connectingText || "Connecting to live agent...", 3000);
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
        label: currentData.ui?.issuesReportedLabel || 'Issues reported',
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadFormData('en');
  const contactForm = document.getElementById('contactForm');
  if (contactForm) contactForm.addEventListener('submit', handleFormSubmit);
});

// Expose globals
window.loadFormData = loadFormData;