// Core configuration constants
const DEFAULT_POLICIES = [
  {
    id: 'policy_social_media',
    name: 'Social Media Limits',
    matches: ['*youtube.com*', '*facebook.com*', '*twitter.com*', '*x.com*', '*instagram.com*', '*tiktok.com*'],
    trackingMode: 'aggregate', // 'aggregate' or 'per-site'
    rules: [
      {
        days: [1, 2, 3, 4, 5], // Mon-Fri
        startTime: '08:00',
        endTime: '17:00',
        limitMinutes: 10
      },
      {
        days: [1, 2, 3, 4, 5],
        limitMinutes: 60
      },
      {
        days: [0, 6], // Sunday, Saturday
        limitMinutes: 120
      }
    ],
    pauseSettings: {
      maxPausesPerDay: 1,
      durationMinutes: 5
    }
  }
];

// Helper for activeTabInfo storage (critical for Manifest V3 lifecycle)
async function getActiveTabInfo() {
  const data = await chrome.storage.local.get('activeTabInfo');
  return data.activeTabInfo || { tabId: null, url: null, policyId: null, startTime: null };
}

async function setActiveTabInfo(info) {
  await chrome.storage.local.set({ activeTabInfo: info });
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      policies: DEFAULT_POLICIES,
      usage: {},
      activeTabInfo: { tabId: null, url: null, policyId: null, startTime: null }
    });
  }
  chrome.alarms.create('checkLimits', { periodInMinutes: 1 });
  initActiveTab();
});

chrome.runtime.onStartup.addListener(() => {
  initActiveTab();
});

chrome.idle.setDetectionInterval(60); // Check idle state every 60 seconds

chrome.idle.onStateChanged.addListener(async (newState) => {
  await updateActiveTime();
  const activeTabInfo = await getActiveTabInfo();

  if (newState === 'idle' || newState === 'locked') {
    // User is away, stop tracking time
    activeTabInfo.startTime = null;
    await setActiveTabInfo(activeTabInfo);
  } else if (newState === 'active') {
    // User returned, resume tracking time
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
      if (tabs.length > 0) {
        await handleTabChange(tabs[0]);
      }
    });
  }
});

function initActiveTab() {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
    if (tabs.length > 0) {
      // Don't carry over idle time
      const activeTabInfo = await getActiveTabInfo();
      activeTabInfo.startTime = null;
      await setActiveTabInfo(activeTabInfo);

      await handleTabChange(tabs[0]);
    }
  });
}

// Alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkLimits') {
    await updateActiveTime();
    await enforceLimits();
  }
});

// Tab tracking events
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateActiveTime();
  const tab = await chrome.tabs.get(activeInfo.tabId).catch(() => null);
  if (tab) {
    await handleTabChange(tab);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const activeTabInfo = await getActiveTabInfo();
    if (activeTabInfo.tabId === tabId) {
      await updateActiveTime();
      await handleTabChange(tab);
    } else {
      const policies = await getPolicies();
      const policy = findStrictestPolicy(changeInfo.url, policies);
      if (policy) {
        chrome.action.setIcon({ path: "icon_active.png", tabId: tab.id }).catch(() => { });
        enforceLimitsForTab(tab, policy, await getTodayUsage(policy.id));
      } else {
        chrome.action.setIcon({ path: "icon_inactive.png", tabId: tab.id }).catch(() => { });
      }
    }
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  await updateActiveTime();
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    const activeTabInfo = await getActiveTabInfo();
    activeTabInfo.tabId = null;
    activeTabInfo.url = null;
    activeTabInfo.policyId = null;
    activeTabInfo.startTime = null;
    await setActiveTabInfo(activeTabInfo);
  } else {
    const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
    if (tabs.length > 0) {
      await handleTabChange(tabs[0]);
    }
  }
});

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getUsage') {
    handleGetUsage(request.url).then(sendResponse);
    return true;
  } else if (request.action === 'requestPause') {
    handleRequestPause(request.url).then(sendResponse);
    return true;
  }
});

// --- Helper Functions ---

async function handleTabChange(tab) {
  const activeTabInfo = await getActiveTabInfo();

  if (!tab.url || !tab.url.startsWith('http')) {
    activeTabInfo.tabId = tab.id;
    activeTabInfo.url = null;
    activeTabInfo.policyId = null;
    activeTabInfo.startTime = Date.now();
    await setActiveTabInfo(activeTabInfo);
    chrome.action.setIcon({ path: "icon_inactive.png", tabId: tab.id }).catch(() => { });
    return;
  }

  activeTabInfo.tabId = tab.id;
  activeTabInfo.url = tab.url;
  activeTabInfo.startTime = Date.now();

  const policies = await getPolicies();
  const policy = findStrictestPolicy(tab.url, policies);

  if (policy) {
    activeTabInfo.policyId = policy.id;
    await setActiveTabInfo(activeTabInfo);
    chrome.action.setIcon({ path: "icon_active.png", tabId: tab.id }).catch(() => { });

    // Immediately enforce block if required
    const usage = await getTodayUsage(policy.id);
    enforceLimitsForTab(tab, policy, usage);
  } else {
    activeTabInfo.policyId = null;
    await setActiveTabInfo(activeTabInfo);
    chrome.action.setIcon({ path: "icon_inactive.png", tabId: tab.id }).catch(() => { });
  }
}

function findStrictestPolicy(url, policies) {
  let strictestPolicy = null;
  let strictestLimit = Infinity;

  const matchingPolicies = policies.filter(policy => policy.matches && matchUrl(url, policy.matches));

  if (matchingPolicies.length === 0) return null;

  for (const policy of matchingPolicies) {
    const limit = getCurrentRuleLimit(policy);

    // If limits are equal, the first one encountered in the array acts as default
    if (limit < strictestLimit) {
      strictestLimit = limit;
      strictestPolicy = policy;
    }
  }

  // Fallback to the first matching policy if all rules default to Infinity (no applicable rules)
  return strictestPolicy || matchingPolicies[0];
}

function matchUrl(url, patterns) {
  return getMatchedPattern(url, patterns) !== null;
}

function getMatchedPattern(url, patterns) {
  try {
    const urlObj = new URL(url);
    for (const pattern of patterns) {
      const regexStr = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexStr}$`, 'i');
      if (regex.test(url)) {
        return pattern;
      }
    }
  } catch (e) {
    // catch invalid formats
  }
  return null;
}

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getPolicies() {
  const data = await chrome.storage.local.get('policies');
  return data.policies || [];
}

async function getUsageData() {
  const data = await chrome.storage.local.get('usage');
  return data.usage || {};
}

async function saveUsageData(usage) {
  await chrome.storage.local.set({ usage });
}

async function getTodayUsage(policyId) {
  const today = getTodayString();
  const usageData = await getUsageData();

  if (!usageData[today]) {
    usageData[today] = {};
  }

  if (!usageData[today][policyId]) {
    usageData[today][policyId] = {
      timeSpentSeconds: 0, // Used for 'aggregate'
      perSiteTimeSpentSeconds: {}, // Used for 'per-site', keyed by pattern
      pausesUsed: 0,
      activePauseUntil: null
    };
  }
  return usageData[today][policyId];
}

async function updateActiveTime() {
  const activeTabInfo = await getActiveTabInfo();
  if (!activeTabInfo.policyId || !activeTabInfo.startTime || !activeTabInfo.url) return;

  const now = Date.now();
  let elapsedSeconds = Math.floor((now - activeTabInfo.startTime) / 1000);

  if (elapsedSeconds > 0) {
    if (elapsedSeconds > 300) {
      elapsedSeconds = 300;
    }

    const today = getTodayString();
    const usageData = await getUsageData();
    const policies = await getPolicies();
    const policy = policies.find(p => p.id === activeTabInfo.policyId);

    if (!policy) return;

    if (!usageData[today]) usageData[today] = {};
    if (!usageData[today][activeTabInfo.policyId]) {
      usageData[today][activeTabInfo.policyId] = {
        timeSpentSeconds: 0,
        perSiteTimeSpentSeconds: {},
        pausesUsed: 0,
        activePauseUntil: null
      };
    }

    const usage = usageData[today][activeTabInfo.policyId];

    const matchedPattern = getMatchedPattern(activeTabInfo.url, policy.matches);
    if (matchedPattern) {
      if (!usage.perSiteTimeSpentSeconds[matchedPattern]) {
        usage.perSiteTimeSpentSeconds[matchedPattern] = 0;
      }
      usage.perSiteTimeSpentSeconds[matchedPattern] += elapsedSeconds;
    }

    if (policy.trackingMode !== 'per-site') {
      // Also track aggregate total for aggregate policies
      usage.timeSpentSeconds += elapsedSeconds;
    }

    await saveUsageData(usageData);
  }

  activeTabInfo.startTime = now;
  await setActiveTabInfo(activeTabInfo);
}

function getCurrentRuleLimit(policy) {
  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let matchedRule = null;

  for (const rule of policy.rules) {
    if (rule.days && !rule.days.includes(currentDay)) continue;

    if (rule.startTime && rule.endTime) {
      const [startH, startM] = rule.startTime.split(':').map(Number);
      const [endH, endM] = rule.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        matchedRule = rule;
        break;
      }
    } else {
      if (!matchedRule) matchedRule = rule;
    }
  }

  return matchedRule ? matchedRule.limitMinutes : Infinity;
}

async function enforceLimits() {
  const activeTabInfo = await getActiveTabInfo();
  if (!activeTabInfo.tabId || !activeTabInfo.policyId) return;

  const policies = await getPolicies();
  const policy = policies.find(p => p.id === activeTabInfo.policyId);
  if (!policy) return;

  const usage = await getTodayUsage(policy.id);

  const tab = await chrome.tabs.get(activeTabInfo.tabId).catch(() => null);
  if (tab) {
    enforceLimitsForTab(tab, policy, usage);
  }
}

function enforceLimitsForTab(tab, policy, usage) {
  if (tab.url && tab.url.includes(chrome.runtime.getURL('blocked.html'))) {
    return;
  }

  const limitMinutes = getCurrentRuleLimit(policy);
  let timeSpentSeconds = usage.timeSpentSeconds;

  if (policy.trackingMode === 'per-site') {
    const matchedPattern = getMatchedPattern(tab.url, policy.matches);
    if (!matchedPattern) return;
    timeSpentSeconds = (usage.perSiteTimeSpentSeconds && usage.perSiteTimeSpentSeconds[matchedPattern]) || 0;
  }

  const timeSpentMinutes = timeSpentSeconds / 60;

  let isBlocked = false;

  if (timeSpentMinutes >= limitMinutes) {
    if (usage.activePauseUntil && Date.now() < usage.activePauseUntil) {
      isBlocked = false;
    } else {
      isBlocked = true;
    }
  }

  if (isBlocked) {
    const blockUrl = chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(tab.url)}&policyId=${policy.id}`);
    chrome.tabs.update(tab.id, { url: blockUrl });
  }
}

async function handleGetUsage(url) {
  const policies = await getPolicies();
  const policy = findStrictestPolicy(url, policies);

  if (!policy) return { policy: null };

  const usage = await getTodayUsage(policy.id);
  const activeTabInfo = await getActiveTabInfo();

  let timeSpentSeconds = policy.trackingMode === 'per-site' ? 0 : usage.timeSpentSeconds;

  if (policy.trackingMode === 'per-site') {
    const matchedPattern = getMatchedPattern(url, policy.matches);
    if (matchedPattern && usage.perSiteTimeSpentSeconds) {
      timeSpentSeconds = usage.perSiteTimeSpentSeconds[matchedPattern] || 0;
    }
  }

  if (activeTabInfo.policyId === policy.id && activeTabInfo.startTime) {
    // Only attribute pending time if tracking modes and urls align
    const attributePending = (policy.trackingMode !== 'per-site') ||
      (policy.trackingMode === 'per-site' && getMatchedPattern(activeTabInfo.url, policy.matches) === getMatchedPattern(url, policy.matches));

    if (attributePending) {
      const elapsedSeconds = Math.floor((Date.now() - activeTabInfo.startTime) / 1000);
      if (elapsedSeconds > 0) {
        timeSpentSeconds += elapsedSeconds;
      }
    }
  }

  const limitMinutes = getCurrentRuleLimit(policy);

  return {
    policy,
    usage,
    limitMinutes,
    timeSpentSeconds
  };
}

async function handleRequestPause(url) {
  const policies = await getPolicies();
  const policy = findStrictestPolicy(url, policies);

  if (!policy) return { success: false, error: 'No policy found for this URL.' };

  const usageData = await getUsageData();
  const today = getTodayString();
  const usage = usageData[today]?.[policy.id] || { timeSpentSeconds: 0, perSiteTimeSpentSeconds: {}, pausesUsed: 0, activePauseUntil: null };

  const maxPauses = policy.pauseSettings?.maxPausesPerDay || 0;

  if (usage.pausesUsed >= maxPauses) {
    return { success: false, error: 'Maximum daily pauses reached.' };
  }

  const pauseDurationMinutes = policy.pauseSettings?.durationMinutes || 5;

  usage.pausesUsed += 1;
  usage.activePauseUntil = Date.now() + (pauseDurationMinutes * 60 * 1000);

  if (!usageData[today]) usageData[today] = {};
  usageData[today][policy.id] = usage;

  await saveUsageData(usageData);

  return { success: true, pauseUntil: usage.activePauseUntil };
}
