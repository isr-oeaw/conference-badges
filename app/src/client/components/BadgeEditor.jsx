import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, IText, FabricImage } from 'fabric';
import { BADGE_WIDTH, BADGE_HEIGHT } from '../constants.js';
import { api } from '../api.js';
import { restoreObjectRoles } from '../designRoles.js';

function serializeDesign(canvas) {
  const json = canvas.toJSON(['dataRole', 'assetId']);
  delete json.viewportTransform;
  json.width = BADGE_WIDTH;
  json.height = BADGE_HEIGHT;
  return json;
}

function fitCanvasToWidth(canvas, container) {
  if (!canvas || !container) return;
  const available = container.clientWidth;
  if (available <= 0) return;
  const zoom = available / BADGE_WIDTH;
  canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
  canvas.setDimensions({
    width: available,
    height: Math.round(BADGE_HEIGHT * zoom),
  });
  canvas.calcOffset();
  canvas.requestRenderAll();
}

function isTextObject(obj) {
  const type = String(obj?.type || '').toLowerCase();
  return type === 'i-text' || type === 'itext' || type === 'textbox' || type === 'text';
}

export default function BadgeEditor({ projectId, designJson, onDesignChange, onSaveStatus }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const fabricRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [fontSize, setFontSize] = useState(32);
  const [fill, setFill] = useState('#111111');
  const [fontWeight, setFontWeight] = useState('normal');
  const [textAlign, setTextAlign] = useState('center');

  const syncSelection = useCallback((obj) => {
    if (!obj) {
      setSelected(null);
      return;
    }
    setSelected(obj);
    if (isTextObject(obj)) {
      setFontSize(obj.fontSize || 32);
      setFill(obj.fill || '#111111');
      setFontWeight(obj.fontWeight || 'normal');
      setTextAlign(obj.textAlign || 'left');
    }
  }, []);

  const getDesignJson = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return designJson;
    return serializeDesign(canvas);
  }, [designJson]);

  useEffect(() => {
    onDesignChange?.(getDesignJson);
  }, [selected, onDesignChange, getDesignJson]);

  useEffect(() => {
    const el = canvasRef.current;
    const wrap = wrapRef.current;
    if (!el) return undefined;

    const canvas = new Canvas(el, {
      width: BADGE_WIDTH,
      height: BADGE_HEIGHT,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    const handleSelection = () => {
      const obj = canvas.getActiveObject();
      syncSelection(obj);
    };

    const protectRoleObjects = (e) => {
      if (e.target?.dataRole) {
        canvas.add(e.target);
        canvas.renderAll();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const obj = canvas.getActiveObject();
      if (obj?.dataRole) {
        e.preventDefault();
      }
    };

    const emitDesign = () => onDesignChange?.(serializeDesign(canvas));

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => syncSelection(null));
    canvas.on('object:modified', emitDesign);
    canvas.on('object:removed', protectRoleObjects);

    document.addEventListener('keydown', handleKeyDown);

    const observer = new ResizeObserver(() => {
      fitCanvasToWidth(canvas, wrap);
    });
    if (wrap) observer.observe(wrap);

    async function loadDesign() {
      const json = { ...designJson, objects: designJson.objects || [] };
      delete json.viewportTransform;
      await canvas.loadFromJSON(json);
      restoreObjectRoles(canvas.getObjects(), json.objects);
      fitCanvasToWidth(canvas, wrap);
      emitDesign();
    }

    loadDesign();

    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', handleKeyDown);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSelectedText = (updates) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj || !isTextObject(obj)) return;
    obj.set(updates);
    canvas.renderAll();
    onDesignChange?.(serializeDesign(canvas));
  };

  const addText = () => {
    const canvas = fabricRef.current;
    const text = new IText('New text', {
      left: BADGE_WIDTH / 2,
      top: BADGE_HEIGHT / 2,
      originX: 'center',
      originY: 'center',
      fontSize: 28,
      fontFamily: 'Arial',
      fill: '#222222',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    syncSelection(text);
    onDesignChange?.(serializeDesign(canvas));
  };

  const deleteSelected = () => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj || obj.dataRole) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.renderAll();
    syncSelection(null);
    onDesignChange?.(serializeDesign(canvas));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onSaveStatus?.('Uploading image…');

    try {
      const asset = await api.uploadAsset(projectId, file);
      const canvas = fabricRef.current;
      const img = await FabricImage.fromURL(asset.url);
      const maxWidth = BADGE_WIDTH * 0.4;
      const scale = Math.min(1, maxWidth / img.width);
      img.set({
        left: BADGE_WIDTH / 2,
        top: BADGE_HEIGHT * 0.2,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        assetId: asset.id,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      syncSelection(img);
      onDesignChange?.(serializeDesign(canvas));
      onSaveStatus?.('');
    } catch (err) {
      onSaveStatus?.(err.message);
    } finally {
      event.target.value = '';
    }
  };

  const isTextSelected = selected && isTextObject(selected);
  const canDelete = selected && !selected.dataRole;

  return (
    <div className="editor-layout">
      <div className="toolbar">
        <button type="button" onClick={addText}>
          Add text
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          Upload logo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleImageUpload}
        />
        {canDelete && (
          <button type="button" className="danger" onClick={deleteSelected}>
            Delete selected
          </button>
        )}

        {isTextSelected && (
          <div className="toolbar-group">
            <label>
              Size
              <input
                type="number"
                min="8"
                max="120"
                value={fontSize}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setFontSize(value);
                  updateSelectedText({ fontSize: value });
                }}
              />
            </label>
            <label>
              Color
              <input
                type="color"
                value={fill}
                onChange={(e) => {
                  setFill(e.target.value);
                  updateSelectedText({ fill: e.target.value });
                }}
              />
            </label>
            <label>
              Weight
              <select
                value={fontWeight}
                onChange={(e) => {
                  setFontWeight(e.target.value);
                  updateSelectedText({ fontWeight: e.target.value });
                }}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
              </select>
            </label>
            <label>
              Align
              <select
                value={textAlign}
                onChange={(e) => {
                  setTextAlign(e.target.value);
                  updateSelectedText({ textAlign: e.target.value });
                }}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} />
      </div>
      <p className="hint">
        Name and Institution are required fields for CSV export. You can move and style them, but not delete them.
      </p>
    </div>
  );
}

export { BADGE_WIDTH, BADGE_HEIGHT };
