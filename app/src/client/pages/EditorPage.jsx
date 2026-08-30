import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import BadgeEditor from '../components/BadgeEditor.jsx';
import ExportPanel from '../components/ExportPanel.jsx';

export default function EditorPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [currentDesign, setCurrentDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const designRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api.getProject(id);
        if (!cancelled) {
          setProject(data);
          setCurrentDesign(data.design_json);
          designRef.current = data.design_json;
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDesignChange = useCallback((design) => {
    designRef.current = design;
    setCurrentDesign(design);
  }, []);

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    setSaveStatus('Saving…');
    try {
      const design = editorRef.current?.getDesign() || designRef.current;
      if (!design || typeof design !== 'object') {
        throw new Error('Nothing to save yet. Wait for the editor to load.');
      }
      const updated = await api.updateProject(project.id, {
        name: project.name,
        design_json: design,
      });
      setProject(updated);
      setCurrentDesign(updated.design_json);
      designRef.current = updated.design_json;
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      setSaveStatus(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNameChange = (event) => {
    setProject((current) => ({ ...current, name: event.target.value }));
  };

  const handleShare = async () => {
    if (!project?.is_owner) return;
    setSaveStatus(project.shared ? 'Making private…' : 'Sharing…');
    try {
      const updated = await api.updateProject(project.id, { shared: !project.shared });
      setProject((current) => ({
        ...current,
        shared: updated.shared,
        is_owner: updated.is_owner,
        owner_email: updated.owner_email,
      }));
      setSaveStatus(updated.shared ? 'Visible to all logged-in users' : 'Private again');
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (err) {
      setSaveStatus(err.message);
    }
  };

  const handleNameBlur = async () => {
    if (!project) return;
    try {
      await api.updateProject(project.id, { name: project.name });
    } catch (err) {
      setSaveStatus(err.message);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p>Loading project…</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page">
        <p className="error">{error || 'Project not found'}</p>
        <Link to="/">Back to projects</Link>
      </div>
    );
  }

  return (
    <div className="page editor-page">
      <header className="topbar">
        <div className="editor-title">
          <Link to="/" className="back-link">
            ← Badges
          </Link>
          <input
            className="title-input"
            value={project.name}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            aria-label="Project name"
          />
          {project.shared && (
            <p className="muted small">
              Shared with all logged-in users
              {project.owner_email ? ` · Owner ${project.owner_email}` : ''}
            </p>
          )}
        </div>
        <div className="topbar-actions">
          {saveStatus && <span className="status">{saveStatus}</span>}
          {project.is_owner && (
            <button type="button" className="secondary" onClick={handleShare}>
              {project.shared ? 'Make private' : 'Share with everyone'}
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save design'}
          </button>
        </div>
      </header>

      <BadgeEditor
        ref={editorRef}
        projectId={project.id}
        designJson={project.design_json}
        onDesignChange={handleDesignChange}
        onSaveStatus={setSaveStatus}
      />

      <ExportPanel designJson={currentDesign || project.design_json} projectName={project.name} />
    </div>
  );
}
