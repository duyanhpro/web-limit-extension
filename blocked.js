document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUrl = urlParams.get('url');

    if (targetUrl) {
        document.getElementById('originalUrl').innerText = targetUrl;
    }

    // Request usage and limits
    const response = await chrome.runtime.sendMessage({ action: 'getUsage', url: targetUrl });

    if (response && response.policy) {
        const policy = response.policy;
        const usage = response.usage;
        const maxPauses = policy.pauseSettings?.maxPausesPerDay || 0;
        const pausesUsed = usage.pausesUsed || 0;

        if (pausesUsed < maxPauses) {
            document.getElementById('pausesLeft').innerText = maxPauses - pausesUsed;
            document.getElementById('pauseSection').classList.remove('hidden');
            document.getElementById('noPausesSection').classList.add('hidden');
        } else {
            document.getElementById('pauseSection').classList.add('hidden');
            document.getElementById('noPausesSection').classList.remove('hidden');
        }
    }

    document.getElementById('pauseButton').addEventListener('click', async () => {
        // Show loading state
        const btn = document.getElementById('pauseButton');
        btn.innerHTML = '<span>Pausing...</span>';
        btn.disabled = true;

        const res = await chrome.runtime.sendMessage({ action: 'requestPause', url: targetUrl });

        if (res && res.success) {
            // Redirect back to original URL
            window.location.href = targetUrl;
        } else {
            btn.innerHTML = '<span>Pause Failed - Try Again</span>';
            btn.disabled = false;
            alert(res?.error || 'Failed to pause.');
        }
    });
});
