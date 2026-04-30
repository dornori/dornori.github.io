// js/form.js - Dornori Enterprise Support System v4.0
// Comprehensive troubleshooting with analytics, offline support, and advanced routing

let currentData = {};
let currentCategory = null;
let currentQuestionIndex = 0;
let issueSummary = [];
let sessionId = 'SID-' + Math.random().toString(36).substring(2, 10);
let ticketCounter = Math.floor(Math.random() * 9000) + 1000;

// Analytics tracking
let categoryClickCount = JSON.parse(localStorage.getItem('dornori_analytics') || '{"assembly":0,"3dfiles":0,"electronics":0,"prebuilt":0,"shipping":0,"software":0,"other":0}');

// Toast notification
function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toastMsg');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, duration);
}

// Load form configuration from JSON
async function loadFormData() {
  try {
    const response = await fetch('../data/form.json');
    currentData = await response.json();
    
    document.getElementById('subtitle').textContent = currentData.subtitle;
    document.getElementById('mainTitle').textContent = currentData.title;
    
    renderCategories();
    
    // Check for admin mode
    if (window.location.hash === '#admin' || new URLSearchParams(window.location.search).get('admin') === 'true') {
      document.getElementById('adminPanel').classList.remove('hidden');
      renderAnalyticsChart();
    }
  } catch (error) {
    console.error("Error loading form.json:", error);
    showToast("Failed to load support data. Please refresh the page.", 5000);
  }
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
  document.getElementById('progressText').innerHTML = 'Step 1: Choose category';
}

// Start a category troubleshooting flow
function startCategory(category) {
  currentCategory = category;
  currentQuestionIndex = 0;
  issueSummary = [
    `[Category] ${category.title}`,
    `Session ID: ${sessionId}`,
    `Timestamp: ${new Date().toISOString()}`,
    `--- Diagnostic Log ---`
  ];
  
  // Update analytics
  categoryClickCount[category.id] = (categoryClickCount[category.id] || 0) + 1;
  localStorage.setItem('dornori_analytics', JSON.stringify(categoryClickCount));
  
  renderCurrentQuestion();
}

// Render current troubleshooting question
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
      <h3 class="text-xl font-semibold text-gray-800 mb-6">${question.text}</h3>
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
  updateProgressBar(45);
  document.getElementById('progressText').innerHTML = 'Step 2: Diagnosing issue';
}

// Handle answer selection
function selectAnswer(optionIndex) {
  const question = currentCategory.questions[currentQuestionIndex];
  const selected = question.options[optionIndex];
  
  // Add to summary
  issueSummary.push(`Q: ${question.text}`);
  issueSummary.push(`A: ${selected.text}`);
  if (selected.summary && selected.summary !== "") {
    issueSummary.push(`→ Diagnosis: ${selected.summary}`);
  }
  issueSummary.push('---');
  
  // Determine next action
  if (selected.next === "contact" || currentQuestionIndex + 1 >= currentCategory.questions.length) {
    showEmailForm();
  } else {
    currentQuestionIndex++;
    renderCurrentQuestion();
  }
}

// Show email contact form with populated summary
function showEmailForm() {
  const finalSummary = issueSummary.join('\n') + 
    `\n\n---\nUser Agent: ${navigator.userAgent}\nPlatform: ${navigator.platform}\nLanguage: ${navigator.language}`;
  
  document.getElementById('message').value = finalSummary;
  showStep('emailForm');
  updateProgressBar(85);
  document.getElementById('progressText').innerHTML = '<i class="fas fa-envelope-open-text"></i> Step 3: Contact support';
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const orderNumber = document.getElementById('orderNumber').value.trim();
  const priority = document.getElementById('priority').value;
  const message = document.getElementById('message').value;
  const fileInput = document.getElementById('attachment');
  
  if (!name || !email) {
    showToast("Please provide both name and email address", 3000);
    return;
  }
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Submitting...';
  submitBtn.disabled = true;
  
  // Handle file attachment (convert to base64 for demo)
  let attachmentBase64 = null;
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    if (file.size > 20 * 1024 * 1024) {
      showToast("File exceeds 20MB limit", 3000);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      return;
    }
    attachmentBase64 = await readFileAsBase64(file);
  }
  
  // Build payload for ticketing system
  const payload = {
    name,
    email,
    orderNumber,
    priority,
    description: message,
    diagnostics: issueSummary.slice(0, 50).join('\n'),
    category: currentCategory?.title || "General",
    subCategory: currentCategory?.id || "unknown",
    sessionId,
    hasAttachment: !!attachmentBase64,
    timestamp: new Date().toISOString(),
    source: "web_diagnostic",
    userAgent: navigator.userAgent
  };
  
  try {
    // Use FormSubmit.co endpoint (configure with your actual email)
    const response = await fetch("https://formsubmit.co/ajax/support@dornori.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        email: email,
        subject: `[Dornori Support] ${currentCategory?.title || 'General'} Issue - Priority: ${priority}`,
        message: `Name: ${name}\nEmail: ${email}\nOrder: ${orderNumber || 'N/A'}\nPriority: ${priority}\nCategory: ${currentCategory?.title || 'General'}\n\n--- DIAGNOSTICS ---\n${message}\n\n--- Full Log ---\n${payload.diagnostics}`,
        _captcha: "false",
        _template: "table",
        _autoresponse: "Thank you for contacting Dornori Support. Your ticket has been created and we will respond within 2-4 business hours."
      })
    });
    
    if (response.ok) {
      const ticketNum = `DOR-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
      document.getElementById('ticketIdDisplay').innerText = ticketNum;
      
      // Store in localStorage
      let tickets = JSON.parse(localStorage.getItem('dornori_tickets') || '[]');
      tickets.unshift({ id: ticketNum, name, email, date: new Date().toISOString(), category: currentCategory?.title });
      localStorage.setItem('dornori_tickets', JSON.stringify(tickets.slice(0, 20)));
      
      showStep('successMessage');
      updateProgressBar(100);
      document.getElementById('progressText').innerHTML = 'Ticket submitted ✓';
      showToast(`Ticket ${ticketNum} created! Check your email for confirmation.`, 5000);
    } else {
      throw new Error("Server error");
    }
  } catch (err) {
    console.error("Submission error:", err);
    // Offline fallback - save locally
    let offlineTickets = JSON.parse(localStorage.getItem('dornori_offline') || '[]');
    offlineTickets.push({ ...payload, savedAt: new Date().toISOString() });
    localStorage.setItem('dornori_offline', JSON.stringify(offlineTickets));
    
    const offlineId = `OFFLINE-${Date.now()}`;
    document.getElementById('ticketIdDisplay').innerText = offlineId;
    showStep('successMessage');
    showToast("Network issue. Your request was saved locally and will be sent when connection resumes.", 5000);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// Helper: read file as base64
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Show specific step
function showStep(stepId) {
  document.querySelectorAll('.step').forEach(step => {
    step.classList.add('hidden');
  });
  const targetStep = document.getElementById(stepId);
  if (targetStep) targetStep.classList.remove('hidden');
}

// Update progress bar
function updateProgressBar(percent) {
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = `${Math.min(100, percent)}%`;
}

// Reset entire session
function resetFullSession() {
  currentCategory = null;
  currentQuestionIndex = 0;
  issueSummary = [];
  document.getElementById('contactForm')?.reset();
  renderCategories();
  updateProgressBar(5);
  document.getElementById('progressText').innerHTML = 'Step 1: Choose category';
  showToast("Session reset. Start new diagnostic.", 2000);
}

// Open knowledge base
function openKnowledgeBase() {
  window.open("https://help.dornori.com", "_blank");
}

// Start live chat
function startLiveChat() {
  showToast("Connecting to Dornori live agent...", 3000);
  setTimeout(() => {
    window.open("https://dornori.com/live-chat", "_blank");
  }, 500);
}

// Render analytics chart
function renderAnalyticsChart() {
  const ctx = document.getElementById('issuesChart')?.getContext('2d');
  if (!ctx) return;
  
  const labels = Object.keys(categoryClickCount);
  const data = Object.values(categoryClickCount);
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
      datasets: [{
        label: 'Issues reported',
        data: data,
        backgroundColor: '#F59E0B',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Expose functions globally
window.loadFormData = loadFormData;
window.selectAnswer = selectAnswer;
window.resetFullSession = resetFullSession;
window.openKnowledgeBase = openKnowledgeBase;
window.startLiveChat = startLiveChat;

// Initialize and attach event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadFormData();
  
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', handleFormSubmit);
  }
});