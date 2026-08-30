import { beforeEach, describe, expect, it, vi } from 'vitest';
import { suggestColumnMapping, mapParticipants } from './spreadsheet.js';

describe('spreadsheet helpers', () => {
  it('suggests name and institution columns from English headers', () => {
    const headers = ['Name', 'Institution', 'Notes'];
    const mapping = suggestColumnMapping(headers);
    expect(mapping.nameIndex).toBe(0);
    expect(mapping.institutionIndex).toBe(1);
  });

  it('suggests German institution headers', () => {
    const headers = ['Nachname', 'Einrichtung'];
    const mapping = suggestColumnMapping(headers);
    expect(mapping.nameIndex).toBe(0);
    expect(mapping.institutionIndex).toBe(1);
  });

  it('maps participant rows and skips empty rows', () => {
    const headers = ['Name', 'Institution'];
    const rows = [
      ['Alice', 'OEAW'],
      ['', ''],
      ['Bob', 'University of Vienna'],
    ];

    const participants = mapParticipants(headers, rows, 0, 1);
    expect(participants).toEqual([
      { name: 'Alice', institution: 'OEAW' },
      { name: 'Bob', institution: 'University of Vienna' },
    ]);
  });
});

describe('parseSpreadsheet', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses CSV file content via FileReader', async () => {
    const { parseSpreadsheet } = await import('./spreadsheet.js');
    const csv = 'Name,Institution\nAlice,OEAW\n';
    const file = new File([csv], 'participants.csv', { type: 'text/csv' });

    const result = await parseSpreadsheet(file);
    expect(result.headers).toEqual(['Name', 'Institution']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0][0]).toBe('Alice');
  });
});
