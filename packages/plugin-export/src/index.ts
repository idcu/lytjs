/**
 * @lytjs/plugin-export - Data Export Plugin
 *
 * Provides CSV, Excel (XML Spreadsheet 2003), PDF (HTML print), and JSON export
 * functionality with zero third-party dependencies.
 */

// ============================================================
// Types
// ============================================================

export interface CsvOptions {
  /** Output filename (default: 'export.csv') */
  filename?: string;
  /** Column keys to include (default: all keys from first row) */
  columns?: string[];
  /** Custom header names mapped to column keys */
  header?: Record<string, string>;
  /** Field separator (default: ',') */
  separator?: string;
  /** Prepend UTF-8 BOM for Chinese/Excel compatibility (default: true) */
  bom?: boolean;
}

export interface ExcelOptions {
  /** Output filename (default: 'export.xls') */
  filename?: string;
  /** Sheet name (default: 'Sheet1') */
  sheetName?: string;
  /** Column keys to include */
  columns?: string[];
  /** Custom header names mapped to column keys */
  header?: Record<string, string>;
}

export interface PdfOptions {
  /** Output filename (default: 'export.pdf') */
  filename?: string;
  /** Document title */
  title?: string;
  /** Column keys to include */
  columns?: string[];
  /** Custom header names mapped to column keys */
  header?: Record<string, string>;
  /** Landscape orientation (default: false) */
  landscape?: boolean;
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Trigger a browser download for a Blob.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Cleanup after a short delay to ensure the download starts
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}

/**
 * Escape a CSV field: wrap in quotes if it contains the separator, quotes, or newlines.
 */
function escapeCsvField(value: string, separator: string): string {
  if (value.includes(separator) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * Convert a value to a string suitable for CSV/Excel export.
 */
function toExportValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Resolve the effective column keys from data and options.
 */
function resolveColumns(
  data: Record<string, unknown>[],
  columns?: string[],
): string[] {
  if (columns && columns.length > 0) return columns;
  if (data.length > 0) return Object.keys(data[0]);
  return [];
}

/**
 * Resolve the display header for each column key.
 */
function resolveHeaders(
  cols: string[],
  header?: Record<string, string>,
): string[] {
  return cols.map((col) => (header && header[col] !== undefined ? header[col] : col));
}

// ============================================================
// CSV Export
// ============================================================

/**
 * Export data as a CSV file.
 *
 * @param data - Array of row objects
 * @param options - Export options
 *
 * @example
 * ```ts
 * exportCsv([
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 },
 * ], { filename: 'users.csv' });
 * ```
 */
export function exportCsv(
  data: Record<string, unknown>[],
  options: CsvOptions = {},
): void {
  const {
    filename = 'export.csv',
    columns,
    header,
    separator = ',',
    bom = true,
  } = options;

  const cols = resolveColumns(data, columns);
  const headers = resolveHeaders(cols, header);

  const lines: string[] = [];

  // Header row
  lines.push(headers.map((h) => escapeCsvField(h, separator)).join(separator));

  // Data rows
  for (const row of data) {
    const fields = cols.map((col) =>
      escapeCsvField(toExportValue(row[col]), separator),
    );
    lines.push(fields.join(separator));
  }

  const csvString = lines.join('\n');
  const bomPrefix = bom ? '\uFEFF' : '';
  const blob = new Blob([bomPrefix + csvString], {
    type: 'text/csv;charset=utf-8',
  });

  downloadBlob(blob, filename);
}

// ============================================================
// Excel Export (XML Spreadsheet 2003)
// ============================================================

/**
 * Export data as an Excel-compatible XML Spreadsheet 2003 file (.xls).
 *
 * This format can be opened by Microsoft Excel, LibreOffice Calc, and WPS Office
 * without any third-party libraries.
 *
 * @param data - Array of row objects
 * @param options - Export options
 *
 * @example
 * ```ts
 * exportExcel([
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 },
 * ], { filename: 'users.xls', sheetName: 'Users' });
 * ```
 */
export function exportExcel(
  data: Record<string, unknown>[],
  options: ExcelOptions = {},
): void {
  const {
    filename = 'export.xls',
    sheetName = 'Sheet1',
    columns,
    header,
  } = options;

  const cols = resolveColumns(data, columns);
  const headers = resolveHeaders(cols, header);

  // Escape XML special characters
  const esc = (str: string): string =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const rows: string[] = [];

  // Header row with bold styling
  const headerCells = headers
    .map((h) => `<Cell><Data ss:Type="String">${esc(h)}</Data></Cell>`)
    .join('');
  rows.push(
    `<Row ss:StyleID="header">${headerCells}</Row>`,
  );

  // Data rows
  for (const row of data) {
    const cells = cols
      .map((col) => {
        const val = row[col];
        let typeAttr = 'String';
        let cellValue = esc(toExportValue(val));

        // Auto-detect numeric values
        if (typeof val === 'number' && isFinite(val)) {
          typeAttr = 'Number';
          cellValue = String(val);
        }

        return `<Cell><Data ss:Type="${typeAttr}">${cellValue}</Data></Cell>`;
      })
      .join('');
    rows.push(`<Row>${cells}</Row>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#E0E0E0" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="default">
      <Alignment ss:Vertical="Center"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${esc(sheetName)}">
    <Table>
      ${rows.join('\n      ')}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });

  downloadBlob(blob, filename);
}

// ============================================================
// PDF Export (HTML Print)
// ============================================================

/**
 * Export data as a PDF by generating an HTML table and triggering the browser's
 * print dialog. The user can then choose "Save as PDF" in the print dialog.
 *
 * @param data - Array of row objects
 * @param options - Export options
 *
 * @example
 * ```ts
 * exportPdf(
 *   [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }],
 *   { title: 'User Report', landscape: true },
 * );
 * ```
 */
export function exportPdf(
  data: Record<string, unknown>[],
  options: PdfOptions = {},
): void {
  const {
    filename = 'export.pdf',
    title = 'Export',
    columns,
    header,
    landscape = false,
  } = options;

  const cols = resolveColumns(data, columns);
  const headers = resolveHeaders(cols, header);

  const esc = (str: string): string =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const headerCells = headers
    .map((h) => `<th>${esc(h)}</th>`)
    .join('');

  const dataRows = data
    .map(
      (row) =>
        '<tr>' +
        cols
          .map((col) => `<td>${esc(toExportValue(row[col]))}</td>`)
          .join('') +
        '</tr>',
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <style>
    @page {
      size: ${landscape ? 'landscape' : 'portrait'};
      margin: 15mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      color: #333;
      padding: 20px;
    }
    h1 {
      font-size: 18px;
      margin-bottom: 16px;
      color: #1a1a1a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th, td {
      border: 1px solid #d0d0d0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: 600;
    }
    tr:nth-child(even) td {
      background-color: #fafafa;
    }
    @media print {
      body { padding: 0; }
      h1 { font-size: 16px; }
    }
  </style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <table>
    <thead>
      <tr>${headerCells}</tr>
    </thead>
    <tbody>
      ${dataRows}
    </tbody>
  </table>
  <script>
    window.onload = function() {
      window.print();
      // Close the window after printing
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const printWindow = window.open(url, '_blank');
  if (!printWindow) {
    // Fallback: download the HTML file
    downloadBlob(blob, filename.replace('.pdf', '.html'));
    URL.revokeObjectURL(url);
  }
  // URL will be revoked when the window is closed
}

// ============================================================
// JSON Export
// ============================================================

/**
 * Export data as a JSON file.
 *
 * @param data - Any JSON-serializable data
 * @param filename - Output filename (default: 'export.json')
 *
 * @example
 * ```ts
 * exportJson({ name: 'Alice', items: [1, 2, 3] }, 'data.json');
 * ```
 */
export function exportJson(data: unknown, filename: string = 'export.json'): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], {
    type: 'application/json;charset=utf-8',
  });

  downloadBlob(blob, filename);
}
