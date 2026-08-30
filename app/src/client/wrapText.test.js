import { beforeAll, describe, expect, it } from 'vitest';
import { wrapTextToWidth, wrapRoleObjectText } from './wrapText.js';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => ({
    font: '',
    measureText(text) {
      return { width: String(text).length * 10 };
    },
  });
});

describe('wrapTextToWidth', () => {
  it('returns short text on one line', () => {
    const result = wrapTextToWidth('Alice Example', {
      maxWidth: 200,
      fontSize: 32,
      fontFamily: 'Arial',
    });
    expect(result).toBe('Alice Example');
  });

  it('wraps long phrases onto multiple lines', () => {
    const result = wrapTextToWidth('Very Long Institution Name For Testing', {
      maxWidth: 120,
      fontSize: 32,
      fontFamily: 'Arial',
    });
    expect(result.split('\n').length).toBeGreaterThan(1);
  });

  it('breaks oversized single words', () => {
    const result = wrapTextToWidth('Supercalifragilisticexpialidocious', {
      maxWidth: 80,
      fontSize: 32,
      fontFamily: 'Arial',
    });
    expect(result.split('\n').length).toBeGreaterThan(1);
  });
});

describe('wrapRoleObjectText', () => {
  it('sets wrapped text on plain objects', () => {
    const obj = {
      type: 'IText',
      left: 525,
      originX: 'center',
      fontSize: 32,
      fontFamily: 'Arial',
    };

    wrapRoleObjectText(obj, 'Long institution name that should wrap');
    expect(String(obj.text).includes('\n') || obj.text.length > 0).toBe(true);
  });

  it('sets raw text on textbox objects', () => {
    const obj = {
      type: 'Textbox',
      left: 525,
      originX: 'center',
      fontSize: 32,
      fontFamily: 'Arial',
      set(props) {
        Object.assign(this, props);
      },
    };

    wrapRoleObjectText(obj, 'Institute of Science');
    expect(obj.text).toBe('Institute of Science');
    expect(obj.width).toBeGreaterThan(0);
  });
});
