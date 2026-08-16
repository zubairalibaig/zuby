/**
 * Minimal RFC-4180 CSV parser — handles quoted fields, embedded commas,
 * escaped quotes and CRLF. Small enough to keep dependency-free and read.
 */

export function parseCsv(input: string): Record<string, string>[] {
  const rows = parseRows(input.replace(/^﻿/, ""));
  if (rows.length === 0) return [];

  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const out: Record<string, string>[] = [];

  for (const row of rows.slice(1)) {
    if (row.length === 1 && (row[0] ?? "").trim() === "") continue; // blank line
    const record: Record<string, string> = {};
    header.forEach((key, i) => {
      if (key) record[key] = (row[i] ?? "").trim();
    });
    out.push(record);
  }
  return out;
}

function parseRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]!;

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Turn a Google Sheets share link into a CSV export URL.
 * Accepts an already-published CSV link or a plain URL unchanged.
 */
export function toCsvUrl(url: string): string {
  const match = url.match(/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (!match) return url;
  const id = match[1];
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}
