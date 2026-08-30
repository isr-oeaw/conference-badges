import React, { useState } from 'react';
import { parseSpreadsheet, suggestColumnMapping, mapParticipants } from '../spreadsheet.js';
import { generateBadgesPdf } from '../pdfExport.js';

export default function ExportPanel({ designJson, projectName }) {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [nameIndex, setNameIndex] = useState(0);
  const [institutionIndex, setInstitutionIndex] = useState(1);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('');
    try {
      const parsed = await parseSpreadsheet(file);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      const suggested = suggestColumnMapping(parsed.headers);
      setNameIndex(suggested.nameIndex);
      setInstitutionIndex(suggested.institutionIndex);
      setStatus(`Loaded ${parsed.rows.length} row(s)`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      event.target.value = '';
    }
  };

  const handleExport = async () => {
    if (!rows.length) {
      setStatus('Upload a CSV or Excel file first');
      return;
    }
    const participants = mapParticipants(headers, rows, nameIndex, institutionIndex);
    if (!participants.length) {
      setStatus('No participant rows with name or institution found');
      return;
    }

    setBusy(true);
    setStatus(`Generating PDF for ${participants.length} badge(s)…`);
    try {
      await generateBadgesPdf(designJson, participants);
      setStatus(`Downloaded badges.pdf (${participants.length} badges)`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="export-panel">
      <h2>Export badges to PDF</h2>
      <p className="muted">
        Upload participant data (CSV, XLS, or XLSX). Badges are laid out on A4 portrait sheets with 2 columns and 5 rows (10 per page).
      </p>

      <div className="export-controls">
        <label className="file-label">
          Participant file
          <input type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFile} />
        </label>

        {headers.length > 0 && (
          <>
            <label>
              Name column
              <select value={nameIndex} onChange={(e) => setNameIndex(Number(e.target.value))}>
                {headers.map((header, index) => (
                  <option key={`name-${header}-${index}`} value={index}>
                    {header || `Column ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Institution column
              <select
                value={institutionIndex}
                onChange={(e) => setInstitutionIndex(Number(e.target.value))}
              >
                {headers.map((header, index) => (
                  <option key={`inst-${header}-${index}`} value={index}>
                    {header || `Column ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <button type="button" onClick={handleExport} disabled={busy || !rows.length}>
          {busy ? 'Generating…' : `Download PDF${projectName ? ` — ${projectName}` : ''}`}
        </button>
      </div>

      {status && <p className="status">{status}</p>}
    </section>
  );
}
