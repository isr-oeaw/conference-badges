import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function OverviewPage({ user, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listProjects();
      setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      const project = await api.createProject(newName);
      setNewName('');
      navigate(`/badges/${project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleShare = async (project) => {
    try {
      const updated = await api.updateProject(project.id, { shared: !project.shared });
      setProjects((current) =>
        current.map((item) =>
          item.id === project.id
            ? { ...item, shared: updated.shared, updated_at: updated.updated_at }
            : item
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteProject(id);
      setProjects((current) => current.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <p className="muted">Signed in as {user.email}</p>
        <button type="button" className="secondary" onClick={onLogout}>
          Log out
        </button>
      </header>

      <section className="card">
        <h2>Create new badge</h2>
        <form className="inline-form" onSubmit={handleCreate}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Conference name or badge title"
          />
          <button type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create badge'}
          </button>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Badges</h2>
        {loading ? (
          <p>Loading…</p>
        ) : projects.length === 0 ? (
          <p className="muted">No projects yet. Create your first badge design above.</p>
        ) : (
          <ul className="project-list">
            {projects.map((project) => (
              <li key={project.id}>
                <div>
                  <Link to={`/badges/${project.id}`}>{project.name}</Link>
                  <p className="muted small">
                    Updated {new Date(project.updated_at).toLocaleString()}
                    {project.shared ? ' · Shared with all users' : ''}
                    {!project.is_owner && project.owner_email ? ` · Owner ${project.owner_email}` : ''}
                  </p>
                </div>
                <div className="project-actions">
                  {project.is_owner && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleShare(project)}
                    >
                      {project.shared ? 'Make private' : 'Share with everyone'}
                    </button>
                  )}
                  {project.is_owner && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDelete(project.id, project.name)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
