// Dashboard Elements - Matched with index.html IDs
const ticketEl = document.getElementById('ticketCount');
const latencyEl = document.getElementById('latencyVal');
const currentRPSEl = document.getElementById('currentRPS');
const peakRPSEl = document.getElementById('peakRPS');
const memEl = document.getElementById('memUsage');
const failedEl = document.getElementById('failedReq');
const perfTimeEl = document.getElementById('perfExecTime');
const perfBarEl = document.getElementById('perfScoreBar');
const redisStatusEl = document.getElementById('redisStatus');
const stressBtn = document.getElementById('stressBtn');
const clockEl = document.getElementById('clock');
const testProgressEl = document.getElementById('testProgress');
const capacityValEl = document.getElementById('capacityVal');
const activityFeedEl = document.getElementById('activityFeed');

let isRunningTest = false;

// Time Tracker
function updateClock() {
    if (clockEl) {
        clockEl.innerText = new Date().toLocaleTimeString();
    }
}

async function runWebAutocannon() {
    if (isRunningTest) return;

    const c = parseInt(document.getElementById('inputC').value) || 10;
    const d = parseInt(document.getElementById('inputD').value) || 5;

    isRunningTest = true;
    if (testProgressEl) testProgressEl.innerText = `ATTACKING... ${d}s REMAINING (${c} CONNECTIONS)`;

    const startTime = Date.now();
    const endTime = startTime + (d * 1000);

    // Parallel Workers
    for (let i = 0; i < c; i++) {
        const worker = async () => {
            while (Date.now() < endTime && isRunningTest) {
                try {
                    await fetch('/buy', { method: 'POST' });
                } catch (e) { }
            }
        };
        worker();
    }

    const timer = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        if (testProgressEl) testProgressEl.innerText = `ATTACKING... ${remaining}s REMAINING (${c} CONNECTIONS)`;

        if (remaining <= 0) {
            clearInterval(timer);
            isRunningTest = false;
            if (testProgressEl) testProgressEl.innerText = '[ SYSTEM READY: Waiting for traffic... ]';
        }
    }, 1000);
}

async function fetchStatus() {
    try {
        const res = await fetch('/status');
        if (!res.ok) throw new Error("NETWORK_ERROR");
        const data = await res.json();

        if (ticketEl) ticketEl.innerText = data.ticketsSold;
        if (latencyEl) latencyEl.innerText = data.avgLatencyMs + "ms";
        if (currentRPSEl) currentRPSEl.innerText = data.currentRPS;
        if (peakRPSEl) peakRPSEl.innerText = data.peakRPS;
        if (memEl) memEl.innerText = data.system.memory;
        if (failedEl) failedEl.innerText = data.failedRequests;

        if (redisStatusEl) {
            const isConnected = data.system.redis === 'CONNECTED';
            redisStatusEl.innerText = `[ REDIS: ${data.system.redis} ]`;
            redisStatusEl.style.color = isConnected ? '#00ff41' : '#ff4141';
            redisStatusEl.style.textShadow = isConnected ? '0 0 10px #00ff41' : 'none';
        }

        const currentRPS = data.currentRPS;
        if (capacityValEl) capacityValEl.innerText = `${currentRPS} REQ/SEC`;

        const targetRPS = 1000;
        const percentage = Math.min(100, (currentRPS / targetRPS) * 100);
        if (perfBarEl) perfBarEl.style.width = percentage + "%";

        if (currentRPS > 0) {
            if (perfTimeEl) perfTimeEl.innerText = `Handling: ${currentRPS} RPS. Peak: ${data.peakRPS}. Redis Sync: Active.`;
        }

        if (activityFeedEl && data.logs) {
            activityFeedEl.innerHTML = '';
            [...data.logs].reverse().forEach(log => {
                const entry = document.createElement('div');
                entry.style.fontSize = '0.75rem';
                entry.style.padding = '4px 8px';
                entry.style.borderLeft = log.status >= 400 ? '2px solid #ff3e3e' : '2px solid #00ff41';
                entry.style.marginBottom = '2px';

                const color = log.status >= 400 ? '#ff3e3e' : '#00ff41';
                entry.innerHTML = `<span style="color: #666">[${log.timestamp}]</span> <span style="color: ${color}">${log.method} ${log.path}</span> - ${log.status} <span style="color: #888">(${log.latency})</span>`;
                activityFeedEl.appendChild(entry);
            });
        }

    } catch (e) {
        console.error("DASHBOARD_FETCH_ERROR:", e);
    }
}

window.showTab = function (tabId, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

setInterval(fetchStatus, 1000);
setInterval(updateClock, 1000);

fetchStatus();
updateClock();

// Event Listeners
if (stressBtn) {
    stressBtn.onclick = runWebAutocannon;
}
