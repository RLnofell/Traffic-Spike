const ticketEl = document.getElementById('ticketCount');
const latencyEl = document.getElementById('latencyVal');
const currentRPSEl = document.getElementById('currentRPS');
const peakRPSEl = document.getElementById('peakRPS');
const memEl = document.getElementById('memUsage');
const capacityValEl = document.getElementById('capacityVal');
const perfTimeEl = document.getElementById('perfExecTime');
const perfBarEl = document.getElementById('perfScoreBar');
const statusEl = document.getElementById('statusMsg');
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
        if (currentRPSEl) currentRPSEl.innerText = data.currentRPS;
        if (peakRPSEl) peakRPSEl.innerText = data.peakRPS;
        latencyEl.innerText = data.avgLatencyMs + "ms";
        if (memEl) memEl.innerText = data.system.memory;
        if (failedEl) failedEl.innerText = data.failedRequests;

        // Update Capacity Analyzer
        const currentRPS = data.currentRPS;
        capacityValEl.innerText = `${currentRPS} REQ/SEC`;
        
        // Simple logic to show progress bar based on Peak RPS (assuming 1000 is a target)
        const targetRPS = 500; 
        const percentage = Math.min(100, (currentRPS / targetRPS) * 100);
        perfBarEl.style.width = percentage + "%";
        
        if (currentRPS > 0) {
            perfTimeEl.innerText = `Current load handling: ${currentRPS} active transactions per second. Peak reached: ${data.peakRPS}.`;
        } else {
            perfTimeEl.innerText = "Waiting for traffic stress test...";
        }

        // Update Logs (Activity Feed style)
        const activityFeed = document.getElementById('activityFeed');
        if (activityFeed) {
            activityFeed.innerHTML = '';
            data.logs.slice().reverse().slice(0, 10).forEach(log => {
                const entry = document.createElement('div');
                entry.style.fontSize = '0.7rem';
                entry.style.padding = '2px 10px';
                entry.style.borderLeft = log.status >= 400 ? '2px solid #ff3e3e' : '2px solid #00ff41';
                entry.style.marginBottom = '2px';
                entry.style.fontFamily = 'JetBrains Mono, monospace';
                
                const color = log.status >= 400 ? '#ff3e3e' : '#00ff41';
                entry.innerHTML = `<span style="color: #666">[${log.timestamp}]</span> <span style="color: ${color}">${log.method} ${log.path}</span> - ${log.status} <span style="color: #888">(${log.latency})</span>`;
                activityFeed.appendChild(entry);
            });
        }

        if (statusEl) {
            if (statusEl.innerText.includes("SERVER")) {
                statusEl.innerText = "STATUS: ONLINE";
                statusEl.style.color = "#00ff41";
            }
        }
    } catch (e) {
        if (statusEl) {
            statusEl.innerText = "STATUS: SERVER_OVERLOADED (TIMEOUT)";
            statusEl.style.color = "#ff3e3e";
        }
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

// Removed runBenchmark as we are doing live throughput analysis now
setInterval(fetchStatus, 1000); 
fetchStatus();
updateClock();
