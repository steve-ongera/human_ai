// services/api.js
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// ── Token helpers ────────────────────────────────────────────────────────────

const getAccess  = () => localStorage.getItem("access");
const getRefresh = () => localStorage.getItem("refresh");

function saveTokens({ access, refresh }) {
  if (access)  localStorage.setItem("access",  access);
  if (refresh) localStorage.setItem("refresh", refresh);
}

function clearTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────

async function request(path, options = {}, retry = true) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = getAccess();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    const refresh = getRefresh();
    if (refresh) {
      const rr = await fetch(`${BASE}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (rr.ok) {
        const data = await rr.json();
        saveTokens(data);
        return request(path, options, false);
      }
    }
    clearTokens();
    window.dispatchEvent(new CustomEvent("auth:expired"));
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(err.detail || "Request failed"), { data: err, status: res.status });
  }

  if (res.status === 204) return null;
  return res.json();
}

const get    = (path, opts)        => request(path, { method: "GET",    ...opts });
const post   = (path, body, opts)  => request(path, { method: "POST",   body: JSON.stringify(body), ...opts });
const patch  = (path, body, opts)  => request(path, { method: "PATCH",  body: JSON.stringify(body), ...opts });
const put    = (path, body, opts)  => request(path, { method: "PUT",    body: JSON.stringify(body), ...opts });
const del    = (path, opts)        => request(path, { method: "DELETE", ...opts });

// ── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  register: (data)     => post("/auth/register/", data).then(r => { saveTokens(r); return r; }),
  login:    (data)     => post("/auth/login/",    data).then(r => { saveTokens(r); return r; }),
  logout:   ()         => post("/auth/logout/",   { refresh: getRefresh() }).finally(clearTokens),
  me:       ()         => get("/auth/me/"),
  updateMe: (data)     => patch("/auth/me/",      data),
  changePassword: (d)  => post("/auth/change-password/", d),
};

// ── Models ───────────────────────────────────────────────────────────────────

export const models = {
  list:    ()    => get("/models/"),
  get:     (id)  => get(`/models/${id}/`),
  default: ()    => get("/models/default/"),
  create:  (d)   => post("/models/", d),
  update:  (id, d) => patch(`/models/${id}/`, d),
  delete:  (id)  => del(`/models/${id}/`),
};

// ── Conversations ─────────────────────────────────────────────────────────────

export const conversations = {
  list:    (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`/conversations/${q ? "?" + q : ""}`);
  },
  get:     (id)          => get(`/conversations/${id}/`),
  create:  (data)        => post("/conversations/", data),
  update:  (id, data)    => patch(`/conversations/${id}/`, data),
  delete:  (id)          => del(`/conversations/${id}/`),
  messages:(id)          => get(`/conversations/${id}/messages/`),
  share:   (id, enabled) => post(`/conversations/${id}/share/`, { enabled }),
  archive: (id)          => post(`/conversations/${id}/archive/`),
  pin:     (id)          => post(`/conversations/${id}/pin/`),
};

// ── Messages ─────────────────────────────────────────────────────────────────

export const messages = {
  rate: (id, rating) => post(`/messages/${id}/rate/`, { message_id: id, rating }),
};

// ── Chat completions ──────────────────────────────────────────────────────────

export const chat = {
  complete: (payload) => post("/chat/completions/", payload),
  regenerate: (payload) => post("/chat/regenerate/", payload),

  /** Returns an EventSource-like async generator over streamed deltas. */
  stream: async function* (payload) {
    const token = getAccess();
    const res = await fetch(`${BASE}/chat/stream/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Stream error");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete line
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            yield JSON.parse(line.slice(6));
          } catch { /* ignore parse errors */ }
        }
      }
    }
  },
};

// ── Agents ───────────────────────────────────────────────────────────────────

export const agents = {
  list:   ()       => get("/agents/"),
  get:    (id)     => get(`/agents/${id}/`),
  create: (data)   => post("/agents/", data),
  update: (id, d)  => patch(`/agents/${id}/`, d),
  delete: (id)     => del(`/agents/${id}/`),
};

// ── Knowledge Bases ───────────────────────────────────────────────────────────

export const knowledgeBases = {
  list:       ()        => get("/knowledge-bases/"),
  get:        (id)      => get(`/knowledge-bases/${id}/`),
  create:     (data)    => post("/knowledge-bases/", data),
  update:     (id, d)   => patch(`/knowledge-bases/${id}/`, d),
  delete:     (id)      => del(`/knowledge-bases/${id}/`),
  documents:  (id)      => get(`/knowledge-bases/${id}/documents/`),
  addDoc:     (id, d)   => post(`/knowledge-bases/${id}/documents/`, d),
};

// ── Prompt Templates ──────────────────────────────────────────────────────────

export const templates = {
  list:   ()      => get("/prompt-templates/"),
  create: (data)  => post("/prompt-templates/", data),
  update: (id, d) => patch(`/prompt-templates/${id}/`, d),
  delete: (id)    => del(`/prompt-templates/${id}/`),
};

// ── Folders ───────────────────────────────────────────────────────────────────

export const folders = {
  list:   ()      => get("/folders/"),
  create: (data)  => post("/folders/", data),
  update: (id, d) => patch(`/folders/${id}/`, d),
  delete: (id)    => del(`/folders/${id}/`),
};

// ── Preferences ───────────────────────────────────────────────────────────────

export const preferences = {
  get:    ()     => get("/preferences/"),
  update: (data) => patch("/preferences/", data),
};

// ── Usage ─────────────────────────────────────────────────────────────────────

export const usage = {
  get: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`/usage/${q ? "?" + q : ""}`);
  },
};

// ── File upload ───────────────────────────────────────────────────────────────

export const attachments = {
  upload: (file, conversationId) => {
    const form = new FormData();
    form.append("file", file);
    form.append("conversation_id", conversationId);
    return request("/attachments/upload/", {
      method: "POST",
      body: form,
      headers: {}, // let browser set multipart boundary
    });
  },
};

// ── Feedback ──────────────────────────────────────────────────────────────────

export const feedback = {
  submit: (data) => post("/feedback/", data),
};

// ── Datasets ──────────────────────────────────────────────────────────────────

export const datasets = {
  list:   ()         => get("/datasets/"),
  get:    (id)       => get(`/datasets/${id}/`),
  create: (data)     => post("/datasets/", data),
  samples:(id)       => get(`/datasets/${id}/samples/`),
  bulkAdd:(id, samp) => post(`/datasets/${id}/bulk-samples/`, { samples: samp }),
};

export { saveTokens, clearTokens, getAccess };