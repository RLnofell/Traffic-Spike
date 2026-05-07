const ticketEl = document.getElementById('ticketCount');
const latencyEl = document.getElementById('latencyVal');
const totalEl = document.getElementById('totalReq');
const failedEl = document.getElementById('failedReq');
const statusEl = document.getElementById('statusMsg');
const logBody = document.getElementById('logBody');
const btn = document.getElementById('buyBtn');

function showTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

function updateClock() {
    const clock = document.getElementById('clock');
    if (clock) clock.innerText = new Date().toLocaleTimeString();
}
let isRunningTest = false;

function runWebAutocannon() {
    if (isRunningTest) return;
    
    const c = parseInt(document.getElementById('inputC').value) || 10;
    const d = parseInt(document.getElementById('inputD').value) || 5;
    const progressEl = document.getElementById('testProgress');
    const stressBtn = document.getElementById('stressBtn');

    isRunningTest = true;
    stressBtn.disabled = true;
    stressBtn.innerText = "[ RUNNING... ]";
    progressEl.style.color = "#00ff41";
    progressEl.innerText = `ATTACKING WITH ${c} CONCURRENT CONNECTIONS FOR ${d}s...`;

    const startTime = Date.now();
    const endTime = startTime + (d * 1000);

    // Giả lập 'c' kết nối song song
    for (let i = 0; i < c; i++) {
        const worker = async () => {
            while (Date.now() < endTime && isRunningTest) {
                try {
                    await fetch('/buy', { method: 'POST' });
                } catch (e) {}
            }
        };
        worker();
    }

    // Đếm ngược thời gian
    const timer = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        progressEl.innerText = `ATTACKING... ${remaining}s REMAINING (${c} CONNECTIONS)`;
        
        if (remaining <= 0) {
            clearInterval(timer);
            isRunningTest = false;
            stressBtn.disabled = false;
            stressBtn.innerText = "[ EXECUTE ]";
            progressEl.innerText = "TEST COMPLETED. CHECK LOGS ABOVE.";
            progressEl.style.color = "#888";
            fetchStatus();
        }
    }, 1000);
}
setInterval(updateClock, 1000);

async function fetchStatus() {
    try {
        const res = await fetch('/status');
        if (!res.ok) throw new Error("TIMEOUT");
        const data = await res.json();

        // Update Stats
        ticketEl.innerText = data.ticketsSold;
        totalEl.innerText = data.totalRequests;
        failedEl.innerText = data.failedRequests;
        latencyEl.innerText = data.avgLatencyMs + "ms";

        // Update Logs
        logBody.innerHTML = '';
        data.logs.reverse().forEach(log => {
            const row = document.createElement('tr');
            const isError = log.status >= 400;
            row.innerHTML = `
                <td>${log.timestamp}</td>
                <td>${log.method} ${log.path}</td>
                <td class="${isError ? 'status-error' : 'status-200'}">${log.status}</td>
                <td>${log.latency}</td>
            `;
            logBody.appendChild(row);
        });

        if (statusEl.innerText.includes("SERVER")) {
            statusEl.innerText = "STATUS: ONLINE";
            statusEl.style.color = "#00ff41";
        }
    } catch (e) {
        statusEl.innerText = "STATUS: SERVER_OVERLOADED (TIMEOUT)";
        statusEl.style.color = "#ff3e3e";
    }
}

async function buyTicket() {
    btn.disabled = true;
    try {
        const res = await fetch('/buy', { method: 'POST' });
        if (!res.ok) throw new Error(res.status);
    } catch (e) {
        console.error("Buy failed", e);
    } finally {
        setTimeout(() => { btn.disabled = false; }, 200);
        fetchStatus();
    }
}

setInterval(fetchStatus, 1000);
fetchStatus();
updateClock();
