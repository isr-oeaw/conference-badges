async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }

  return data;
}

export const api = {
  me: () => request('/api/me'),
  requestLink: (email) =>
    request('/api/auth/request-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  listProjects: () => request('/api/projects'),
  createProject: (name) =>
    request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  getProject: (id) => request(`/api/projects/${id}`),
  updateProject: (id, payload) =>
    request(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteProject: (id) =>
    request(`/api/projects/${id}`, {
      method: 'DELETE',
    }),
  uploadAsset: (projectId, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`/api/projects/${projectId}/assets`, {
      method: 'POST',
      body: form,
    });
  },
};
