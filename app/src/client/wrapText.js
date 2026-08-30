import { BADGE_WIDTH } from './constants.js';

const SIDE_MARGIN = 40;
const MIN_WIDTH = 80;

function measureContext({ fontFamily, fontSize, fontWeight }) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontWeight || 'normal'} ${Number(fontSize) || 32}px ${fontFamily || 'Arial'}`;
  return ctx;
}

export function wrapTextToWidth(text, options) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';

  const maxWidth = Number(options.maxWidth) || BADGE_WIDTH - SIDE_MARGIN * 2;
  const ctx = measureContext(options);

  if (ctx.measureText(raw).width <= maxWidth) {
    return raw;
  }

  const words = raw.split(' ');
  const lines = [];
  let current = '';

  const pushOverflowWord = (word) => {
    let chunk = '';
    for (const char of word) {
      const next = chunk + char;
      if (chunk && ctx.measureText(next).width > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = next;
      }
    }
    return chunk;
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = '';
    }
    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
    } else {
      current = pushOverflowWord(word);
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.join('\n');
}

export function availableTextWidth(obj) {
  const originX = obj.originX || 'left';
  const left = Number(obj.left) || 0;
  const scaleX = Number(obj.scaleX) || 1;
  let visualWidth;

  if (originX === 'center') {
    visualWidth =
      2 *
      Math.min(Math.max(left - SIDE_MARGIN, 0), Math.max(BADGE_WIDTH - SIDE_MARGIN - left, 0));
  } else if (originX === 'right') {
    visualWidth = Math.max(left - SIDE_MARGIN, 0);
  } else {
    visualWidth = Math.max(BADGE_WIDTH - SIDE_MARGIN - left, 0);
  }

  if (visualWidth < MIN_WIDTH) {
    visualWidth = BADGE_WIDTH - SIDE_MARGIN * 2;
  }

  return visualWidth / scaleX;
}

function isTextbox(obj) {
  return String(obj.type || '').toLowerCase() === 'textbox';
}

export function wrapRoleObjectText(obj, value) {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const maxWidth = availableTextWidth(obj);
  const font = {
    fontFamily: obj.fontFamily || 'Arial',
    fontSize: Number(obj.fontSize) || 32,
    fontWeight: obj.fontWeight || 'normal',
  };

  const apply = (props) => {
    if (typeof obj.set === 'function') {
      obj.set(props);
    } else {
      Object.assign(obj, props);
    }
  };

  if (isTextbox(obj)) {
    apply({ text: raw, width: maxWidth });
    return;
  }

  apply({ text: wrapTextToWidth(raw, { ...font, maxWidth }) });
}
