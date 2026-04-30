// Dornori Support System - With Redirect on Resolution
let currentData = null;
let currentCategory = null;
let currentQuestionIndex = 0;
let issueSummary = [];
let sessionId = 'SID-' + Math.random().toString(36).substring(2, 10);

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
    const response = await fetch('data/form.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    currentData = await response.json();
    
    document.getElementById('mainTitle').textContent = currentData.title;
    document.getElementById('subtitle').textContent = currentData.subtitle;
    
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
    
    renderCategories();
  } catch (error) {
    console.error("Error:", error);
    document.getElementById('loadingIndicator').innerHTML = `
      <i class="fas fa-exclamation-triangle text-3xl text-red-500"></i>
      <p class="mt-2">Failed to load support data.</p>
      <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg">Retry</button>
    `;
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
  issueSummary = [`Category: ${category.title}`, `Session: ${sessionId}`, `---`];
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  if (!currentCategory || currentQuestionIndex >= currentCategory.questions.length) {
    showContactForm();
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
  
  html += `</div><div class="mt-6"><button onclick="resetFullSession()" class="text-sm text-gray-400 hover:text-gray-600"><i class="fas fa-undo-alt"></i> Start over</button></div></div>`;
  
  document.getElementById('troubleshooting').innerHTML = html;
  showStep('troubleshooting');
  updateProgress(45);
  document.getElementById('progressText').innerHTML = 'Step 2: Troubleshooting';
}

window.selectAnswer = function(optionIndex) {
  const question = currentCategory.questions[currentQuestionIndex];
  const selected = question.options[optionIndex];
  
  issueSummary.push(`Q: ${question.text}`);
  issueSummary.push(`A: ${selected.text}`);
  
  // Check if this answer leads to resolution (contains keywords like "found", "worked", "fixed", "thanks")
  const resolutionKeywords = ['found', 'worked', 'fixed', 'thanks', 'resolved', 'solved', 'found it', 'all good', 'never mind', 'keep', 'wait', 'understood', 'will do'];
  const isResolved = resolutionKeywords.some(keyword => 
    selected.text.toLowerCase().includes(keyword) || 
    (selected.summary && selected.summary.toLowerCase().includes(keyword))
  );
  
  // Also check if next is 'resolved_end' or if summary indicates resolution
  const nextTarget = selected.next || '';
  
  if (nextTarget === 'resolved_end' || isResolved) {
    // ISSUE RESOLVED - redirect to homepage
    showResolvedAndRedirect();
    return;
  }
  
  if (selected.next === "contact" || currentQuestionIndex + 1 >= currentCategory.questions.length) {
    showContactForm();
  } else if (selected.next && selected.next !== "contact" && selected.next !== "resolved_end") {
    // Handle custom next question ID
    const nextIndex = currentCategory.questions.findIndex(q => q.id === selected.next);
    if (nextIndex !== -1) {
      currentQuestionIndex = nextIndex;
      renderCurrentQuestion();
    } else {
      currentQuestionIndex++;
      renderCurrentQuestion();
    }
  } else {
    currentQuestionIndex++;
    renderCurrentQuestion();
  }
};

function showResolvedAndRedirect() {
  // Store that issue was resolved
  localStorage.setItem('dornori_last_resolved', new Date().toISOString());
  localStorage.setItem('dornori_resolved_category', currentCategory?.title || 'Unknown');
  
  // Show toast then redirect
  showToast("✓ Issue resolved! Redirecting to homepage...", 2000);
  
  // Small delay to show toast, then redirect
  setTimeout(() => {
    if (typeof window.showResolvedModal === 'function') {
      window.showResolvedModal();
    } else {
      // Fallback redirect
      const redirectUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/') + 'index.html';
      window.location.href = redirectUrl;
    }
  }, 1500);
}

function showContactForm() {
  const summary = issueSummary.join('\n') + `\n\n---\nUser Agent: ${navigator.userAgent}`;
  document.getElementById('issueDescription').value = summary;
  showStep('contactForm');
  updateProgress(85);
  document.getElementById('progressText').innerHTML = 'Step 3: Contact support';
}

// Handle support form submission
document.getElementById('supportForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const orderNumber = document.getElementById('orderNumber').value.trim();
  const description = document.getElementById('issueDescription').value;
  
  if (!name || !email) {
    showToast("Please provide your name and email.", 3000);
    return;
  }
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Sending...';
  submitBtn.disabled = true;
  
  // FormSubmit endpoint - CHANGE THIS TO YOUR EMAIL
  const submitUrl = "https://formsubmit.co/ajax/support@dornori.com";
  
  try {
    const response = await fetch(submitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        email: email,
        order: orderNumber,
        subject: `Dornori Support: ${currentCategory?.title || 'General'} Issue`,
        message: `Name: ${name}\nEmail: ${email}\nOrder: ${orderNumber || 'N/A'}\nCategory: ${currentCategory?.title}\n\nIssue Details:\n${description}`,
        _captcha: "false",
        _template: "table",
        _autoresponse: "Thank you for contacting Dornori Support. We'll respond within 4 hours."
      })
    });
    
    if (response.ok) {
      showToast("Support request sent! Check your email for confirmation.", 3000);
      // After submitting contact form, redirect to homepage
      setTimeout(() => {
        if (typeof window.showResolvedModal === 'function') {
          window.showResolvedModal();
        } else {
          const redirectUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/') + 'index.html';
          window.location.href = redirectUrl;
        }
      }, 2000);
    } else {
      throw new Error("Server error");
    }
  } catch (err) {
    console.error(err);
    showToast("Failed to send. Please try again or email support@dornori.com directly.", 4000);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});

function showStep(stepId) {
  document.querySelectorAll('.step').forEach(step => {
    step.classList.add('hidden');
  });
  const target = document.getElementById(stepId);
  if (target) target.classList.remove('hidden');
}

function updateProgress(percent) {
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = `${percent}%`;
}

function resetFullSession() {
  currentCategory = null;
  currentQuestionIndex = 0;
  issueSummary = [];
  renderCategories();
  updateProgress(5);
  document.getElementById('progressText').innerHTML = 'Step 1: Choose category';
  showToast("Session reset", 1500);
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

// Expose functions globally
window.renderCategories = renderCategories;
window.updateProgress = updateProgress;
window.resetFullSession = resetFullSession;
window.currentCategory = null;
window.currentQuestionIndex = 0;
window.issueSummary = [];

document.addEventListener('DOMContentLoaded', loadFormData);
