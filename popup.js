document.addEventListener('DOMContentLoaded', async () => {
  const statusSection = document.getElementById('statusSection');
  let refreshInterval;

  async function updatePopup() {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length === 0) {
        statusSection.innerHTML = '<div class="unmanaged">Could not determine active tab.</div>';
        if (refreshInterval) clearInterval(refreshInterval);
        return;
      }

      const activeTab = tabs[0];
      const url = activeTab.url;

      if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        if (refreshInterval) clearInterval(refreshInterval);
        statusSection.innerHTML = `
        <div class="unmanaged">
          <svg class="unmanaged-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div class="unmanaged-title">Browser Page</div>
          <div class="unmanaged-desc">This is a system page and is not tracked.</div>
        </div>
      `;
        return;
      }

      const response = await chrome.runtime.sendMessage({ action: 'getUsage', url: url });

      if (response && response.policy) {
        renderPolicyCard(statusSection, response.policy, response.usage, response.limitMinutes, response.timeSpentSeconds);
      } else {
        if (refreshInterval) clearInterval(refreshInterval);
        statusSection.innerHTML = `
        <div class="unmanaged">
          <svg class="unmanaged-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div class="unmanaged-title">Unrestricted Access</div>
          <div class="unmanaged-desc">No limit policy applies to this website. You're free to browse!</div>
          <a href="options.html" class="btn" style="margin-top: 20px" target="_blank">Manage Policies</a>
        </div>
      `;
      }
    });
  }

  function renderPolicyCard(container, policy, usage, limitMinutes, timeSpentSeconds) {
    timeSpentSeconds = timeSpentSeconds || 0;
    const timeSpentMinutes = Math.floor(timeSpentSeconds / 60);
    const timeSpentSecsRemainder = String(timeSpentSeconds % 60).padStart(2, '0');

    const timeRemainingSeconds = Math.max(0, (limitMinutes * 60) - timeSpentSeconds);
    const timeRemainingMinutes = Math.floor(timeRemainingSeconds / 60);
    const timeRemainingSecsRemainder = String(timeRemainingSeconds % 60).padStart(2, '0');

    const isPaused = usage.activePauseUntil && Date.now() < usage.activePauseUntil;
    let pauseInfo = '';

    if (isPaused) {
      const msLeft = usage.activePauseUntil - Date.now();
      const minsLeft = Math.ceil(msLeft / 60000);
      pauseInfo = `<div style="margin-top: 12px; padding: 8px; background: #fef2f2; color: #ef4444; border-radius: 6px; font-size: 12px; font-weight: 500; text-align: center;">⏸️ Paused for ${minsLeft} more min</div>`;
    }

    const percentage = limitMinutes > 0 ? Math.min(100, (timeSpentSeconds / (limitMinutes * 60)) * 100) : 0;

    let progressClass = '';
    let timeClass = '';
    if (percentage >= 90) {
      progressClass = 'danger';
      timeClass = 'time-low';
    } else if (percentage >= 75) {
      progressClass = 'warning';
    }

    container.innerHTML = `
      <div class="policy-card">
        <div class="policy-name">${escapeHtml(policy.name)}</div>
        <div class="time-remaining ${timeClass}">
          ${timeRemainingMinutes}:${timeRemainingSecsRemainder} <span>left</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar ${progressClass}" style="width: ${percentage}%"></div>
        </div>
        <div class="meta-info">
          <span>Used: ${timeSpentMinutes}:${timeSpentSecsRemainder}</span>
          <span>Limit: ${limitMinutes}m</span>
        </div>
        ${pauseInfo}
      </div>
      
      <a href="options.html" class="btn" target="_blank">Manage Policies</a>
    `;
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Initial fetch
  updatePopup();

  // Start continuous polling every second to keep live counter
  refreshInterval = setInterval(updatePopup, 1000);
});
