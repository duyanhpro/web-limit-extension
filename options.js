let currentPolicies = [];
let challengeEnabled = false;
let pendingAction = null; // 'save' or 'delete'

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CHALLENGE_TEXTS = [
    "The ability to focus is one of the most remarkable traits of the human mind. In a world full of endless distractions and constant notifications, taking back control of your time is a profound act of self discipline. By recognizing when to step away from the endless scroll, you are making a conscious choice to prioritize your goals, your mental health, and your true passions over fleeting dopamine hits. This extension is just a tool, but the willpower to adhere to the boundaries you set comes entirely from within you. Stay committed to the path you have chosen.",
    "Success is rarely the result of a single monumental effort, but rather the accumulation of small, consistent actions taken every single day. Distractions are the enemy of progress, stealing your most valuable resource: time. When you deliberately limit your access to time-wasting websites, you create a space for deep work and meaningful productivity. It requires courage to disconnect and face your responsibilities without the crutch of digital entertainment. Remember why you set these limits in the first place, and honor that commitment to yourself.",
    "We live in an era where human attention is a highly sought-after commodity. Every notification, feed, and auto-playing video is meticulously designed to capture and hold your focus. To reclaim your autonomy, you must become intentional about how and where you direct your energy. Setting boundaries is not about punishment; it is about protecting your mental space from being hijacked. Embrace the quiet moments of boredom, for they are often the birthplace of creativity and profound insight. Your time is yours alone to master.",
    "Discipline is the bridge between goals and accomplishments. It is easy to make plans, but it is much harder to execute them when faced with immediate gratification. Every time you resist the urge to open a distracting tab, you are strengthening your mental fortitude. Think of self-control as a muscle that grows stronger with every correct choice. Do not let temporary impulses derail your long-term aspirations. Keep your eyes on the prize, stay focused on what truly matters, and let your actions reflect your highest ambitions.",
    "The digital world offers incredible tools for learning and connection, but it also presents a labyrinth of endless diversion. Navigating this landscape successfully requires a clear sense of purpose and the willingness to say no. By restricting your access to certain elements of the web, you are actively curating your digital environment to serve your needs, rather than serving the algorithms. This conscious curation allows you to engage with technology on your own terms. True freedom comes from having the discipline to guide your own attention."
];
let currentChallengeText = "";

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();

    // Navigation
    document.getElementById('navPolicies').addEventListener('click', (e) => switchTab(e, 'policiesSection'));
    document.getElementById('navSettings').addEventListener('click', (e) => switchTab(e, 'settingsSection'));
    document.getElementById('navReports').addEventListener('click', (e) => switchTab(e, 'reportsSection'));

    // Reports Actions
    document.getElementById('clearReportsBtn').addEventListener('click', clearOldReports);

    // Settings Toggle
    const toggle = document.getElementById('challengeToggle');
    toggle.checked = challengeEnabled;
    toggle.addEventListener('change', async (e) => {
        challengeEnabled = e.target.checked;
        await chrome.storage.local.set({ challengeEnabled });
    });

    // Policy Modal
    document.getElementById('addPolicyBtn').addEventListener('click', () => openModal());
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
    document.getElementById('addRuleBtn').addEventListener('click', () => addRuleRow());

    // Action Interception
    document.getElementById('savePolicyBtn').addEventListener('click', () => attemptAction('save'));
    document.getElementById('deletePolicyBtn').addEventListener('click', () => attemptAction('delete'));

    // Challenge Modal
    document.getElementById('closeChallengeModal').addEventListener('click', closeChallenge);
    const challengeInput = document.getElementById('challengeInput');
    challengeInput.addEventListener('input', handleChallengeInput);
});

function switchTab(e, sectionId) {
    if (e) e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('main > div:not(.modal)').forEach(el => el.classList.add('hidden'));

    if (e) e.target.classList.add('active');
    document.getElementById(sectionId).classList.remove('hidden');

    if (sectionId === 'reportsSection') {
        renderReports();
    }
}

async function renderReports() {
    const container = document.getElementById('reportsList');
    container.innerHTML = '<p style="color: #64748b;">Loading reports...</p>';

    const data = await chrome.storage.local.get(['usage', 'policies']);
    const usageData = data.usage || {};
    const policiesList = data.policies || [];

    const dates = Object.keys(usageData).sort((a, b) => new Date(b) - new Date(a)); // sort descending

    if (dates.length === 0) {
        container.innerHTML = '<div class="settings-card"><p>No usage data available yet.</p></div>';
        return;
    }

    let html = '';

    dates.forEach(date => {
        const dateData = usageData[date];
        let hasData = false;

        let dayHtml = '';
        for (const policyId in dateData) {
            const policyUsage = dateData[policyId];
            const policy = policiesList.find(p => p.id === policyId);
            const policyName = policy ? policy.name : 'Unknown Policy';
            const trackingMode = policy ? policy.trackingMode : 'aggregate';

            dayHtml += `
            <div style="margin-bottom: 16px;">
                <h3 style="margin-bottom: 8px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">${escapeHtml(policyName)}</h3>
                <ul style="list-style: none; padding: 0; margin-bottom: 0;">`;

            let hasSiteData = false;

            if (policyUsage.perSiteTimeSpentSeconds) {
                for (const sitePattern in policyUsage.perSiteTimeSpentSeconds) {
                    const secs = policyUsage.perSiteTimeSpentSeconds[sitePattern];
                    if (secs > 0) {
                        hasSiteData = true;
                        const mins = Math.floor(secs / 60);
                        const remSecs = String(secs % 60).padStart(2, '0');
                        dayHtml += `
                        <li style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px dashed #e2e8f0;">
                            <span>Site: <strong>${escapeHtml(sitePattern)}</strong></span>
                            <span>${mins}m ${remSecs}s</span>
                        </li>`;
                    }
                }
            }

            if (trackingMode === 'aggregate') {
                const secs = policyUsage.timeSpentSeconds || 0;
                if (secs > 0) {
                    hasSiteData = true;
                    const mins = Math.floor(secs / 60);
                    const remSecs = String(secs % 60).padStart(2, '0');
                    dayHtml += `
                    <li style="display: flex; justify-content: space-between; padding: 6px 8px; font-size: 14px; font-weight: 600; border-bottom: 1px dashed #e2e8f0; background-color: #f8fafc; margin-top: 4px; border-radius: 4px;">
                        <span>Total Aggregate Time</span>
                        <span>${mins}m ${remSecs}s</span>
                    </li>`;
                }
            }

            if (!hasSiteData) {
                dayHtml += `<li style="font-size: 14px; padding: 6px 0; color: #94a3b8;">No tracked time recorded.</li>`;
            }

            dayHtml += `</ul></div>`;
            hasData = true;
        }

        if (hasData) {
            html += `
            <div class="settings-card" style="margin-bottom: 24px;">
                <h2 style="font-size: 18px; color: #1e293b; margin-bottom: 16px;">Date: ${date}</h2>
                ${dayHtml}
            </div>`;
        }
    });

    if (html === '') {
        container.innerHTML = '<div class="settings-card"><p>No usage data available yet.</p></div>';
    } else {
        container.innerHTML = html;
    }
}

async function clearOldReports() {
    const daysStr = document.getElementById('clearDaysInput').value;
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days < 1) return alert('Please enter a valid number of days.');

    if (!confirm(`Are you sure you want to delete report data older than ${days} days?`)) return;

    const data = await chrome.storage.local.get(['usage']);
    const usageData = data.usage || {};

    const now = new Date();
    // Midnight of the cutoff day
    now.setHours(0, 0, 0, 0);
    const cutoffMs = now.getTime() - (days * 24 * 60 * 60 * 1000);

    let deletedCount = 0;
    for (const dateStr in usageData) {
        // Evaluate the tracked date strings logic against cutoff (e.g., '2026-02-25')
        const entryDate = new Date(dateStr + "T00:00:00");
        if (entryDate.getTime() < cutoffMs) {
            delete usageData[dateStr];
            deletedCount++;
        }
    }

    if (deletedCount > 0) {
        await chrome.storage.local.set({ usage: usageData });
        renderReports();
        alert(`Successfully deleted ${deletedCount} day(s) of old report data.`);
    } else {
        alert('No data found older than ' + days + ' days.');
    }
}

async function loadData() {
    const data = await chrome.storage.local.get(['policies', 'challengeEnabled']);
    currentPolicies = data.policies || [];
    challengeEnabled = !!data.challengeEnabled;
    renderPolicies();
}

function renderPolicies() {
    const container = document.getElementById('policiesList');
    container.innerHTML = '';

    currentPolicies.forEach(policy => {
        const card = document.createElement('div');
        card.className = 'policy-card';
        card.onclick = () => openModal(policy);

        const rulesCount = (policy.rules || []).length;
        const domainsStr = (policy.matches || []).join(', ');

        const trackingBadgeStr = policy.trackingMode === 'per-site' ? '<span style="font-size:10px; padding:2px 6px; border-radius:10px; background:#e0e7ff; color:#3730a3; margin-left: 6px;">Per-Website</span>' : '<span style="font-size:10px; padding:2px 6px; border-radius:10px; background:#f1f5f9; color:#475569; margin-left: 6px;">Aggregate</span>';

        card.innerHTML = `
      <div class="policy-name" style="display:flex; align-items:center;">
        ${escapeHtml(policy.name)} 
        ${trackingBadgeStr}
      </div>
      <div class="policy-domains">${escapeHtml(domainsStr)}</div>
      <div class="policy-rules-summary">
        ${rulesCount} rule(s) • ${policy.pauseSettings?.maxPausesPerDay || 0} pauses/day
      </div>
    `;

        container.appendChild(card);
    });
}

function openModal(policy = null) {
    const modal = document.getElementById('policyModal');
    const deleteBtn = document.getElementById('deletePolicyBtn');
    const rulesList = document.getElementById('rulesList');
    const isNewInput = document.getElementById('isNewPolicy');

    rulesList.innerHTML = ''; // clear rules

    if (policy) {
        document.getElementById('modalTitle').innerText = 'Edit Policy';
        document.getElementById('policyId').value = policy.id;
        document.getElementById('policyName').value = policy.name;
        document.getElementById('policyMatches').value = (policy.matches || []).join(', ');
        document.getElementById('trackingMode').value = policy.trackingMode || 'aggregate';
        document.getElementById('maxPauses').value = policy.pauseSettings?.maxPausesPerDay || 0;
        document.getElementById('pauseDuration').value = policy.pauseSettings?.durationMinutes || 0;
        isNewInput.value = 'false';

        if (policy.rules) {
            policy.rules.forEach(rule => addRuleRow(rule));
        }
        deleteBtn.classList.remove('hidden');
    } else {
        document.getElementById('modalTitle').innerText = 'Create New Policy';
        document.getElementById('policyId').value = 'policy_' + Date.now();
        document.getElementById('policyName').value = '';
        document.getElementById('policyMatches').value = '';
        document.getElementById('trackingMode').value = 'aggregate';
        document.getElementById('maxPauses').value = '1';
        document.getElementById('pauseDuration').value = '5';
        isNewInput.value = 'true';
        addRuleRow(); // Add one empty rule
        deleteBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('policyModal').classList.add('hidden');
}

function addRuleRow(rule = null) {
    const rulesList = document.getElementById('rulesList');
    const row = document.createElement('div');
    row.className = 'rule-item';

    const limitValue = rule ? rule.limitMinutes : 60;
    const startValue = rule && rule.startTime ? rule.startTime : '';
    const endValue = rule && rule.endTime ? rule.endTime : '';

    let daysHtml = '<div class="days-selector" style="display:flex; gap: 4px; flex-wrap: wrap;">';
    daysOfWeek.forEach((day, index) => {
        const isChecked = rule && rule.days && rule.days.includes(index);
        daysHtml += `
      <label style="display: flex; align-items: center; gap: 4px; font-size: 12px; margin-bottom: 0;">
        <input type="checkbox" class="rule-day" value="${index}" ${isChecked || !rule ? 'checked' : ''}> ${day}
      </label>
    `;
    });
    daysHtml += '</div>';

    row.innerHTML = `
    <div style="flex: 2">
      <label>Days</label>
      ${daysHtml}
    </div>
    <div style="flex: 1">
      <label>Time Window</label>
      <div style="display: flex; gap: 4px; align-items: center">
        <input type="time" class="form-control rule-start" value="${startValue}" style="padding: 6px;">
        <span>-</span>
        <input type="time" class="form-control rule-end" value="${endValue}" style="padding: 6px;">
      </div>
      <small style="color: #94a3b8; font-size: 10px;">Leave blank for all day</small>
    </div>
    <div style="flex: 1">
      <label>Limit (Mins)</label>
      <input type="number" class="form-control rule-limit" min="1" value="${limitValue}">
    </div>
    <button class="rule-delete" title="Remove rule">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
      </svg>
    </button>
  `;

    row.querySelector('.rule-delete').addEventListener('click', () => row.remove());
    rulesList.appendChild(row);
}


// --- Action Handlers --- 

function attemptAction(action) {
    if (action === 'save') {
        const name = document.getElementById('policyName').value.trim();
        if (!name) return alert('Policy name is required.');
    }

    const isNew = document.getElementById('isNewPolicy').value === 'true';

    // If challenge is enabled and it's NOT a new policy being created
    if (challengeEnabled && !isNew) {
        openChallenge(action);
    } else {
        // Proceed normally
        if (action === 'save') executeSave();
        if (action === 'delete') executeDelete();
    }
}

function openChallenge(action) {
    pendingAction = action;
    currentChallengeText = CHALLENGE_TEXTS[Math.floor(Math.random() * CHALLENGE_TEXTS.length)];
    renderChallengeText('');
    const input = document.getElementById('challengeInput');
    input.value = '';
    input.disabled = false;
    document.getElementById('challengeError').classList.add('hidden');
    document.getElementById('challengeModal').classList.remove('hidden');
    setTimeout(() => input.focus(), 100);
}

function closeChallenge() {
    document.getElementById('challengeModal').classList.add('hidden');
    pendingAction = null;
}

function renderChallengeText(typedVal) {
    let html = '';
    let errors = 0;
    for (let i = 0; i < currentChallengeText.length; i++) {
        const char = currentChallengeText[i];
        if (i < typedVal.length) {
            if (typedVal[i] === char) {
                html += `<span class="char-correct">${escapeHtml(char)}</span>`;
            } else {
                html += `<span class="char-incorrect">${char === ' ' ? '&nbsp;' : escapeHtml(char)}</span>`;
                errors++;
            }
        } else {
            html += `<span>${escapeHtml(char)}</span>`;
        }
    }
    document.getElementById('challengeText').innerHTML = html;
    return errors;
}

function handleChallengeInput(e) {
    const el = e.target;
    const val = el.value;
    const errorMsg = document.getElementById('challengeError');

    const errors = renderChallengeText(val);
    const maxErrors = Math.floor(currentChallengeText.length * 0.02);
    const extraLen = Math.max(0, val.length - currentChallengeText.length);
    const totalErrors = errors + extraLen;

    if (totalErrors > maxErrors) {
        errorMsg.innerText = `Too many mistakes (${totalErrors} > ${maxErrors}). Start over.`;
        errorMsg.classList.remove('hidden');
        el.value = ''; // Force restart
        renderChallengeText('');
        setTimeout(() => {
            errorMsg.classList.add('hidden');
        }, 3000);
        return;
    }

    if (val.length === currentChallengeText.length && totalErrors <= maxErrors) {
        el.disabled = true; // Success!
        setTimeout(() => {
            if (pendingAction === 'save') executeSave();
            if (pendingAction === 'delete') executeDelete();
            closeChallenge();
        }, 500);
    }
}

async function executeSave() {
    const id = document.getElementById('policyId').value;
    const name = document.getElementById('policyName').value.trim();
    const matchesRaw = document.getElementById('policyMatches').value;
    const trackingMode = document.getElementById('trackingMode').value || 'aggregate';

    const matches = matchesRaw.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    const maxPauses = parseInt(document.getElementById('maxPauses').value, 10) || 0;
    const prevDuration = parseInt(document.getElementById('pauseDuration').value, 10) || 0;

    const rules = [];
    document.querySelectorAll('.rule-item').forEach(row => {
        const limitMinutes = parseInt(row.querySelector('.rule-limit').value, 10);
        const startTime = row.querySelector('.rule-start').value;
        const endTime = row.querySelector('.rule-end').value;

        const days = [];
        row.querySelectorAll('.rule-day:checked').forEach(cb => {
            days.push(parseInt(cb.value, 10));
        });

        if (!isNaN(limitMinutes)) {
            const ruleObj = { limitMinutes, days };
            if (startTime && endTime) {
                ruleObj.startTime = startTime;
                ruleObj.endTime = endTime;
            }
            rules.push(ruleObj);
        }
    });

    const policy = {
        id,
        name,
        matches,
        trackingMode,
        rules,
        pauseSettings: {
            maxPausesPerDay: maxPauses,
            durationMinutes: prevDuration
        }
    };

    const existingIdx = currentPolicies.findIndex(p => p.id === id);
    if (existingIdx >= 0) {
        currentPolicies[existingIdx] = policy;
    } else {
        currentPolicies.push(policy);
    }

    await chrome.storage.local.set({ policies: currentPolicies });
    renderPolicies();
    closeModal();
}

async function executeDelete() {
    if (!confirm('Are you absolutely sure you want to delete this policy?')) return;

    const id = document.getElementById('policyId').value;
    currentPolicies = currentPolicies.filter(p => p.id !== id);
    await chrome.storage.local.set({ policies: currentPolicies });
    renderPolicies();
    closeModal();
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
