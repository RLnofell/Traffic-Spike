// Dashboard Elements
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

// Real-time Clock
function updateClock() {
    if (clockEl) {
        clockEl.innerText = new Date().toLocaleTimeString();
    }
}

// Stress Test Execution
// Terminal UI Interaction
async function runWebAutocannon() {
    if (isRunningTest) return;

    const c = parseInt(document.getElementById('inputC').value) || 50;
    const d = parseInt(document.getElementById('inputD').value) || 10;
    const outputEl = document.getElementById('terminalOutput');
    const cmdEl = document.getElementById('terminalCommand');

    isRunningTest = true;
    outputEl.innerHTML = `<div>[ INITIALIZING STRESS TEST... ]</div>`;
    
    // Simulate Terminal Output
    setTimeout(() => {
        outputEl.innerHTML += `<div>> Spawning ${c} parallel workers...</div>`;
    }, 500);
    setTimeout(() => {
        outputEl.innerHTML += `<div>> Target: http://localhost:${window.location.port || 10000}/buy</div>`;
    }, 1000);

    const startTime = Date.now();
    const endTime = startTime + (d * 1000);

    const maxWorkers = Math.min(c, 50);
    for (let i = 0; i < maxWorkers; i++) {
        const worker = async () => {
            while (Date.now() < endTime && isRunningTest) {
                try {
                    await fetch('/buy', { method: 'POST' });
                    await new Promise(r => setTimeout(r, 5));
                } catch (e) { }
            }
        };
        worker();
    }

    const timer = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        
        if (remaining % 2 === 0) {
            outputEl.innerHTML += `<div>[ RUNNING ] ${remaining}s left...</div>`;
            outputEl.scrollTop = outputEl.scrollHeight;
        }

        if (remaining <= 0) {
            clearInterval(timer);
            isRunningTest = false;
            outputEl.innerHTML += `<div style="color: #00ff41">TEST COMPLETED. CHECK LOGS ABOVE.</div>`;
            outputEl.innerHTML += `<div>[ SYSTEM READY: Waiting for traffic... ]</div>`;
            outputEl.scrollTop = outputEl.scrollHeight;
        }
    }, 1000);
}

// Data Fetching
async function fetchStatus() {
    try {
        const res = await fetch('/status');
        if (!res.ok) throw new Error("NETWORK_ERROR");
        const data = await res.json();

        // Update Stats
        if (ticketEl) ticketEl.innerText = data.ticketsSold.toLocaleString();
        if (latencyEl) latencyEl.innerText = data.avgLatencyMs + "ms";
        if (currentRPSEl) currentRPSEl.innerText = data.currentRPS;
        if (peakRPSEl) peakRPSEl.innerText = data.peakRPS;
        if (memEl) memEl.innerText = data.system.memory;
        if (failedEl) failedEl.innerText = data.failedRequests;

        // Redis Status Indicator
        if (redisStatusEl) {
            const isConnected = data.system.redis === 'CONNECTED';
            redisStatusEl.innerText = `[ REDIS: ${data.system.redis} ]`;
            redisStatusEl.style.color = isConnected ? '#00ff41' : '#ff4141';
        }

        // Capacity Analyzer
        const currentRPS = data.currentRPS;
        if (capacityValEl) capacityValEl.innerText = `${currentRPS} REQ/SEC`;

        const targetRPS = 1000;
        const percentage = Math.min(100, (currentRPS / targetRPS) * 100);
        if (perfBarEl) perfBarEl.style.width = percentage + "%";

        if (currentRPS > 0) {
            if (perfTimeEl) perfTimeEl.innerText = `Analyzing: ${currentRPS} RPS. Peak: ${data.peakRPS}. Redis Sync: Active.`;
        }

        // Update Activity Feed
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

    } catch (e) { }
}

// Helper: Tab Switching
window.showTab = function(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Global Initialization
setInterval(fetchStatus, 1000);
setInterval(updateClock, 1000);
fetchStatus();
updateClock();

if (stressBtn) {
    stressBtn.onclick = runWebAutocannon;
}
