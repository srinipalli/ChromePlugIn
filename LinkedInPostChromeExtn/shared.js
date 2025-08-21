
export async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["settings"], (res) => {
      resolve(res?.settings || {});
    });
  });
}

export async function saveSettings(s) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ settings: s }, resolve);
  });
}

export async function guessOwnerForUrl(url, settings) {
  try {
    const u = new URL(url);
    const path = u.pathname;
    const map = settings.endpointMap || [];
    let file = null;
    for (const rule of map) {
      const re = new RegExp(rule.pattern);
      if (re.test(path)) {
        file = rule.file;
        break;
      }
    }
    if (!file) return { owner: null };

    if (settings.ghToken && settings.ghRepo) {
      const ownerFromCodeowners = await resolveOwnerFromCodeowners(settings, file);
      if (ownerFromCodeowners) return { owner: ownerFromCodeowners, source: "CODEOWNERS" };

      const lastCommitter = await resolveLastCommitter(settings, file);
      if (lastCommitter) return { owner: lastCommitter, source: "Last Commit" };
    }
    return { owner: null };
  } catch (e) {
    console.warn("owner lookup error", e);
    return { owner: null };
  }
}

async function ghFetch(settings, path) {
  const url = `https://api.github.com/repos/${settings.ghRepo}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${settings.ghToken}` }
  });
  if (!res.ok) return null;
  return res;
}

async function resolveOwnerFromCodeowners(settings, filePath) {
  try {
    const res = await ghFetch(settings, `/contents/${settings.ghCodeowners}`);
    if (!res) return null;
    const json = await res.json();
    const content = atob((json.content || "").replace(/\n/g, ""));

    const lines = content.split(/\r?\n/).filter(Boolean);
    let currentOwner = null;
    for (const line of lines) {
      if (line.trim().startsWith("#")) continue;
      const [pattern, ...owners] = line.trim().split(/\s+/);
      if (!pattern || !owners.length) continue;
      // Simplified glob → regex
      let regex = pattern.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
      const re = new RegExp("^" + regex + "$");
      if (re.test(filePath)) {
        currentOwner = owners.join(" ");
      }
    }
    return currentOwner;
  } catch {
    return null;
  }
}

async function resolveLastCommitter(settings, filePath) {
  try {
    const res = await ghFetch(settings, `/commits?path=${encodeURIComponent(filePath)}&per_page=1`);
    if (!res) return null;
    const arr = await res.json();
    const commit = arr?.[0];
    const name = commit?.commit?.author?.name || commit?.author?.login;
    return name || null;
  } catch {
    return null;
  }
}

export async function createJiraIssue({ summary, description }) {
  try {
    const s = await getSettings();
    if (!s.jiraUrl || !s.jiraProject || !s.jiraEmail || !s.jiraToken) return false;
    const url = `${s.jiraUrl}/rest/api/3/issue`;
    const body = {
      fields: {
        project: { key: s.jiraProject },
        summary,
        issuetype: { name: "Bug" },
        description
      }
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(`${s.jiraEmail}:${s.jiraToken}`)
      },
      body: JSON.stringify(body)
    });
    return res.ok;
  } catch (e) {
    console.warn("jira create error", e);
    return false;
  }
}
