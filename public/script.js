// Dashboard Elements
const redisStockEl = document.getElementById('redisStock');
const dbStockEl = document.getElementById('dbStock');
const queueSizeEl = document.getElementById('queueSize');
const latencyEl = document.getElementById('latencyVal');
const currentRPSEl = document.getElementById('currentRPS');
const memEl = document.getElementById('memUsage');
const perfTimeEl = document.getElementById('perfExecTime');
const perfBarEl = document.getElementById('perfScoreBar');
const redisStatusEl = document.getElementById('redisStatus');
const stressBtn = document.getElementById('stressBtn');
const clockEl = document.getElementById('clock');
const capacityValEl = document.getElementById('capacityVal');
const activityFeedEl = document.getElementById('activityFeed');

let isRunningTest = false;

// Initialize Chart
let rpsChart;
function initChart() {
    const ctx = document.getElementById('rpsChart').getContext('2d');
    rpsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [{
                label: 'RPS (Requests Per Second)',
                data: Array(20).fill(0),
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#222' }, ticks: { color: '#666' } },
                x: { grid: { display: false }, ticks: { display: false } }
            },
            plugins: {
                legend: { display: false }
            },
            animation: { duration: 400 }
        }
    });
}

// Real-time Clock
function updateClock() {
    if (clockEl) {
        clockEl.innerText = new Date().toLocaleTimeString();
    }
}

// Stress Test Execution
async function runWebAutocannon() {
    if (isRunningTest) return;

    const c = parseInt(document.getElementById('inputC').value) || 50;
    const d = parseInt(document.getElementById('inputD').value) || 10;
    const outputEl = document.getElementById('terminalOutput');

    isRunningTest = true;
    outputEl.innerHTML = `<div>[ INITIALIZING STRESS TEST... ]</div>`;
    
    setTimeout(() => {
        outputEl.innerHTML += `<div>> Spawning ${c} parallel workers...</div>`;
    }, 500);
    setTimeout(() => {
        outputEl.innerHTML += `<div>> Target: http://localhost:${window.location.port || 10000}/buy</div>`;
    }, 1000);

    const startTime = Date.now();
    const endTime = startTime + (d * 1000);

    const maxWorkers = Math.min(c, 100);
    for (let i = 0; i < maxWorkers; i++) {
        (async () => {
            while (Date.now() < endTime && isRunningTest) {
                try {
                    await fetch('/buy', { 
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productId: 1, quantity: 1 })
                    });
                } catch (e) { }
                await new Promise(r => setTimeout(r, 10));
            }
        })();
    }

    const timer = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        if (remaining % 2 === 0 && remaining > 0) {
            outputEl.innerHTML += `<div>[ RUNNING ] ${remaining}s left...</div>`;
            outputEl.scrollTop = outputEl.scrollHeight;
        }
        if (remaining <= 0) {
            clearInterval(timer);
            isRunningTest = false;
            outputEl.innerHTML += `<div style="color: #00ff41">TEST COMPLETED.</div>`;
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
        if (redisStockEl) redisStockEl.innerText = data.stockRedis.toLocaleString();
        if (dbStockEl) dbStockEl.innerText = data.stockDB.toLocaleString();
        if (queueSizeEl) queueSizeEl.innerText = data.queueSize.toLocaleString();
        if (latencyEl) latencyEl.innerText = data.avgLatencyMs + "ms";
        if (currentRPSEl) currentRPSEl.innerText = data.currentRPS;
        if (memEl) memEl.innerText = data.system.memory;

        // Update Chart
        if (rpsChart) {
            rpsChart.data.datasets[0].data.push(data.currentRPS);
            rpsChart.data.datasets[0].data.shift();
            rpsChart.update('none');
        }

        // Redis Status
        if (redisStatusEl) {
            const isConnected = data.system.redis === 'CONNECTED';
            redisStatusEl.innerText = `[ REDIS: ${data.system.redis} ]`;
            redisStatusEl.style.color = isConnected ? '#00ff41' : '#ff4141';
        }

        // Progress/Capacity
        if (capacityValEl) capacityValEl.innerText = `${data.currentRPS} REQ/SEC`;
        const percentage = Math.min(100, (data.currentRPS / 1000) * 100);
        if (perfBarEl) perfBarEl.style.width = percentage + "%";
        if (perfTimeEl) perfTimeEl.innerText = `Peak: ${data.peakRPS} RPS. Worker Sync: ${data.queueSize > 0 ? 'ACTIVE' : 'IDLE'}`;

        // Update Activity Feed
        if (activityFeedEl && data.logs) {
            activityFeedEl.innerHTML = '';
            [...data.logs].reverse().forEach(log => {
                const entry = document.createElement('div');
                entry.style.fontSize = '0.7rem';
                entry.style.padding = '2px 8px';
                entry.style.borderLeft = log.status >= 400 ? '2px solid #ff3e3e' : '2px solid #00ff41';
                const color = log.status >= 400 ? '#ff3e3e' : '#00ff41';
                entry.innerHTML = `<span style="color: #666">[${log.timestamp}]</span> <span style="color: ${color}">${log.method}</span> - ${log.status} <span style="color: #888">(${log.latency})</span>`;
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
initChart();
setInterval(fetchStatus, 1000);
setInterval(updateClock, 1000);
fetchStatus();
updateClock();

if (stressBtn) {
    stressBtn.onclick = runWebAutocannon;
}

const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.onclick = async () => {
        if (!confirm("Are you sure you want to reset the system?")) return;
        const outputEl = document.getElementById('terminalOutput');
        outputEl.innerHTML += `<div style="color: #fbbf24">[ SYSTEM ] Sending RESET command...</div>`;
        try {
            const res = await fetch('/reset', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                outputEl.innerHTML += `<div style="color: #00ff41">[ SUCCESS ] Stock reset to 5000. Orders cleared.</div>`;
            }
        } catch (e) {
            outputEl.innerHTML += `<div style="color: #ff3e3e">[ ERROR ] Reset failed.</div>`;
        }
        outputEl.scrollTop = outputEl.scrollHeight;
    };
}
