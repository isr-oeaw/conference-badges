import * as XLSX from 'xlsx';
import { NAME_HEADERS, INSTITUTION_HEADERS } from './constants.js';

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function findColumnIndex(headers, candidates) {
  const normalized = headers.map(normalizeHeader);
  for (let i = 0; i < normalized.length; i += 1) {
    if (candidates.includes(normalized[i])) {
      return i;
    }
  }
  for (let i = 0; i < normalized.length; i += 1) {
    if (candidates.some((candidate) => normalized[i].includes(candidate))) {
      return i;
    }
  }
  return -1;
}

export function parseSpreadsheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (!rows.length) {
          reject(new Error('Spreadsheet is empty'));
          return;
        }
        const headers = rows[0].map((cell) => String(cell));
        const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell).trim()));
        resolve({ headers, rows: dataRows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function suggestColumnMapping(headers) {
  const nameIndex = findColumnIndex(headers, NAME_HEADERS);
  const institutionIndex = findColumnIndex(headers, INSTITUTION_HEADERS);
  return {
    nameIndex: nameIndex >= 0 ? nameIndex : 0,
    institutionIndex: institutionIndex >= 0 ? institutionIndex : Math.min(1, headers.length - 1),
  };
}

export function mapParticipants(headers, rows, nameIndex, institutionIndex) {
  return rows
    .map((row) => ({
      name: String(row[nameIndex] ?? '').trim(),
      institution: String(row[institutionIndex] ?? '').trim(),
    }))
    .filter((row) => row.name || row.institution);
}
