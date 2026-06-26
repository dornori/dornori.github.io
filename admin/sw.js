// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HANDLE TICKET FOCUS FROM SERVICE WORKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function(event) {
        const data = event.data;
        console.log('📨 Dashboard received message:', data);
        
        if (data && data.action === 'focusTicket' && data.ticketId) {
            console.log('🎯 Focusing on ticket:', data.ticketId);
            setTimeout(function() {
                openTicketModal(data.ticketId);
            }, 500);
        }
    });
}

function checkUrlForTicket() {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('ticket');
    if (ticketId) {
        console.log('🎯 Found ticket in URL:', ticketId);
        setTimeout(function() {
            openTicketModal(ticketId);
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 1500);
    }
}

// Update the init section
if (localStorage.getItem("token")) {
    token = localStorage.getItem("token");
    document.getElementById("login").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadEmailSenders();
    loadCategories();
    loadLanguages();
    loadStats();
    resetAndLoad();
    checkPushStatus();
    checkUrlForTicket();
}