import './fabricConfig.js';
import { PDFDocument } from 'pdf-lib';
import { StaticCanvas } from 'fabric';
import {
  A4_WIDTH_PT,
  A4_HEIGHT_PT,
  COLS,
  ROWS,
  BADGES_PER_PAGE,
  CELL_WIDTH_PT,
  CELL_HEIGHT_PT,
  BADGE_WIDTH,
  BADGE_HEIGHT,
} from './constants.js';
import { applyParticipantToDesign, getObjectRole } from './designRoles.js';
import { wrapRoleObjectText } from './wrapText.js';

async function renderBadgePng(designJson, participant) {
  const canvasEl = document.createElement('canvas');
  const canvas = new StaticCanvas(canvasEl, {
    width: BADGE_WIDTH,
    height: BADGE_HEIGHT,
  });

  const json = applyParticipantToDesign(designJson, participant);
  await canvas.loadFromJSON(json);

  for (const obj of canvas.getObjects()) {
    const role = getObjectRole(obj);
    if (role === 'name' || role === 'institution') {
      wrapRoleObjectText(obj, role === 'name' ? participant.name : participant.institution);
      obj.initDimensions?.();
      obj.setCoords?.();
    }
  }

  canvas.renderAll();
  const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
  canvas.dispose();
  return dataUrl;
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function generateBadgesPdf(designJson, participants) {
  const pdfDoc = await PDFDocument.create();
  const pngCache = new Map();

  for (let i = 0; i < participants.length; i += 1) {
    const pageIndex = Math.floor(i / BADGES_PER_PAGE);
    const indexOnPage = i % BADGES_PER_PAGE;

    if (indexOnPage === 0) {
      pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    }

    const page = pdfDoc.getPage(pageIndex);
    const col = indexOnPage % COLS;
    const row = Math.floor(indexOnPage / COLS);

    const x = col * CELL_WIDTH_PT;
    const y = A4_HEIGHT_PT - (row + 1) * CELL_HEIGHT_PT;

    const participant = participants[i];
    const cacheKey = `${participant.name}::${participant.institution}`;
    let pngBytes = pngCache.get(cacheKey);

    if (!pngBytes) {
      const dataUrl = await renderBadgePng(designJson, participant);
      pngBytes = dataUrlToUint8Array(dataUrl);
      pngCache.set(cacheKey, pngBytes);
    }

    const image = await pdfDoc.embedPng(pngBytes);
    const scale = Math.min(CELL_WIDTH_PT / BADGE_WIDTH, CELL_HEIGHT_PT / BADGE_HEIGHT);
    const drawWidth = BADGE_WIDTH * scale;
    const drawHeight = BADGE_HEIGHT * scale;
    const offsetX = x + (CELL_WIDTH_PT - drawWidth) / 2;
    const offsetY = y + (CELL_HEIGHT_PT - drawHeight) / 2;

    page.drawImage(image, {
      x: offsetX,
      y: offsetY,
      width: drawWidth,
      height: drawHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'badges.pdf';
  anchor.click();
  URL.revokeObjectURL(url);
}
