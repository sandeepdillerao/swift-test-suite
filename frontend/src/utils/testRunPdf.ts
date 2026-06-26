import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { TestRun, TestRunCase, ScriptExecution } from '@/types';
import { httpClient } from '@/services/http-client';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary:   [37, 99, 235] as [number, number, number],
  passed:    [22, 163, 74] as [number, number, number],
  failed:    [220, 38, 38] as [number, number, number],
  blocked:   [234, 88, 12] as [number, number, number],
  notRun:    [107, 114, 128] as [number, number, number],
  inProg:    [59, 130, 246] as [number, number, number],
  dark:      [17, 24, 39] as [number, number, number],
  mid:       [75, 85, 99] as [number, number, number],
  muted:     [156, 163, 175] as [number, number, number],
  border:    [229, 231, 235] as [number, number, number],
  bg:        [248, 250, 252] as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
};

const STATUS_COLOR: Record<string, [number, number, number]> = {
  passed:      C.passed,
  failed:      C.failed,
  blocked:     C.blocked,
  not_run:     C.notRun,
  in_progress: C.inProg,
};

const STATUS_LABEL: Record<string, string> = {
  passed:      'PASSED',
  failed:      'FAILED',
  blocked:     'BLOCKED',
  not_run:     'NOT RUN',
  in_progress: 'IN PROGRESS',
};

// ── Page constants (A4, mm) ───────────────────────────────────────────────────
const W = 210;   // page width
const H = 297;   // page height
const ML = 14;   // left margin
const MR = 14;   // right margin
const CW = W - ML - MR;  // content width
const MB = 14;   // bottom margin

// ── Helpers ───────────────────────────────────────────────────────────────────

function rgb(doc: jsPDF, color: [number, number, number]) {
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setTextColor(...color);
}

function text(doc: jsPDF, color: [number, number, number], size: number, style: 'normal' | 'bold' | 'italic' = 'normal') {
  doc.setTextColor(...color);
  doc.setFontSize(size);
  doc.setFont('helvetica', style);
}

function checkPage(doc: jsPDF, y: number, needed = 20): number {
  if (y + needed > H - MB) {
    doc.addPage();
    return 20;
  }
  return y;
}

function pill(doc: jsPDF, x: number, y: number, label: string, color: [number, number, number]) {
  const padding = 3;
  doc.setFontSize(7);
  const tw = doc.getTextWidth(label);
  doc.setFillColor(...color);
  doc.roundedRect(x, y - 3.5, tw + padding * 2, 5.5, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(label, x + padding, y);
  return tw + padding * 2 + 2;
}

async function fetchImageBase64(executionId: string, filename: string): Promise<string | null> {
  try {
    const res = await httpClient.get<Blob>(
      `/automation/executions/${executionId}/artifacts/${filename}`,
      { responseType: 'blob' }
    );
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(res.data as Blob);
    });
  } catch {
    return null;
  }
}

async function fetchExecution(executionId: string): Promise<ScriptExecution | null> {
  try {
    const res = await httpClient.get<ScriptExecution>(`/automation/executions/${executionId}`);
    return (res as any).data ?? res;
  } catch {
    return null;
  }
}

// ── Section: Cover / Header ───────────────────────────────────────────────────

function drawCover(doc: jsPDF, testRun: TestRun, stats: ReturnType<typeof computeStats>) {
  // Blue header bar
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 38, 'F');

  // Brand name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TestFlow TCM', ML, 13);

  // Report title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(186, 210, 255);
  doc.text('Test Execution Report', ML, 21);

  // Generated date
  doc.setFontSize(8);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, W - MR, 21, { align: 'right' });

  // Test run name
  let y = 50;
  text(doc, C.dark, 18, 'bold');
  doc.text(testRun.name, ML, y);
  y += 7;

  // Status pill + description
  if (testRun.description) {
    text(doc, C.mid, 9);
    doc.text(testRun.description, ML, y, { maxWidth: CW - 30 });
    y += 6;
  }

  // Run Metadata grid
  y += 2;
  const metaItems: [string, string][] = [
    ['Status', testRun.status.charAt(0).toUpperCase() + testRun.status.slice(1)],
    ['Environment', testRun.environment || 'Not specified'],
    ['Build', testRun.buildNumber || 'Not specified'],
    ['Started', testRun.startedAt ? format(new Date(testRun.startedAt), 'MMM dd, yyyy HH:mm') : '—'],
    ['Completed', testRun.completedAt ? format(new Date(testRun.completedAt), 'MMM dd, yyyy HH:mm') : '—'],
    ['Pass Rate', `${Math.round(testRun.passRate)}%`],
  ];

  doc.setFillColor(...C.bg);
  doc.rect(ML, y, CW, 28, 'F');
  doc.setDrawColor(...C.border);
  doc.rect(ML, y, CW, 28);

  const colW = CW / 3;
  metaItems.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const mx = ML + col * colW + 4;
    const my = y + row * 13 + 6;
    text(doc, C.muted, 7);
    doc.text(label.toUpperCase(), mx, my);
    text(doc, C.dark, 9, 'bold');
    doc.text(value, mx, my + 4.5);
  });
  y += 33;

  // ── Summary boxes
  y += 4;
  text(doc, C.dark, 11, 'bold');
  doc.text('EXECUTIVE SUMMARY', ML, y);
  y += 6;

  const boxW = (CW - 12) / 5;
  const boxes: [string, number, [number, number, number]][] = [
    ['Passed',      stats.passed,     C.passed],
    ['Failed',      stats.failed,     C.failed],
    ['Blocked',     stats.blocked,    C.blocked],
    ['Not Run',     stats.notRun,     C.notRun],
    ['In Progress', stats.inProgress, C.inProg],
  ];

  boxes.forEach(([label, count, color], i) => {
    const bx = ML + i * (boxW + 3);
    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
    doc.setFillColor(...C.bg);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.rect(bx, y, boxW, 22, 'FD');
    doc.setLineWidth(0.2);
    // Color top bar
    doc.setFillColor(...color);
    doc.rect(bx, y, boxW, 2.5, 'F');
    // Count
    text(doc, color, 18, 'bold');
    doc.text(String(count), bx + boxW / 2, y + 13, { align: 'center' });
    // Label
    text(doc, C.mid, 7);
    doc.text(label, bx + boxW / 2, y + 18.5, { align: 'center' });
    // Percent
    text(doc, C.muted, 7);
    doc.text(`${pct}%`, bx + boxW / 2, y + 22.5, { align: 'center' });
  });
  y += 27;

  // Pass rate bar
  text(doc, C.dark, 9, 'bold');
  doc.text('Pass Rate', ML, y);
  const passRate = Math.round(testRun.passRate);
  text(doc, C.primary, 9, 'bold');
  doc.text(`${passRate}%`, W - MR, y, { align: 'right' });
  y += 4;

  // Background track
  doc.setFillColor(...C.border);
  doc.roundedRect(ML, y, CW, 5, 1, 1, 'F');
  // Fill
  if (passRate > 0) {
    doc.setFillColor(...C.passed);
    doc.roundedRect(ML, y, CW * passRate / 100, 5, 1, 1, 'F');
  }
  y += 10;

  // Automated vs Manual summary
  const autoTotal  = stats.automatedTotal;
  const manTotal   = stats.manualTotal;
  const autoPassed = stats.automatedPassed;
  const manPassed  = stats.manualPassed;

  doc.setFillColor(...C.bg);
  doc.rect(ML, y, CW, 18, 'F');
  doc.setDrawColor(...C.border);
  doc.rect(ML, y, CW, 18);

  const halfW = (CW - 4) / 2;

  // Automated box
  text(doc, C.dark, 8, 'bold');
  doc.text('⚡ Automated', ML + 4, y + 6);
  text(doc, C.mid, 8);
  doc.text(`${autoTotal} cases · ${autoPassed} passed · ${autoTotal - autoPassed} failed`, ML + 4, y + 12);

  // Manual box
  text(doc, C.dark, 8, 'bold');
  doc.text('✎ Manual', ML + halfW + 6, y + 6);
  text(doc, C.mid, 8);
  doc.text(`${manTotal} cases · ${manPassed} passed · ${manTotal - manPassed} failed`, ML + halfW + 6, y + 12);

  return y + 24;
}

// ── Section: Test Cases Table ─────────────────────────────────────────────────

function drawTestCasesTable(doc: jsPDF, testRun: TestRun, users: Map<string, string>): number {
  doc.addPage();
  let y = 18;

  text(doc, C.primary, 8, 'bold');
  doc.text('TEST CASES OVERVIEW', ML, y);
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.4);
  doc.line(ML, y + 1.5, ML + 45, y + 1.5);
  y += 6;

  const rows = testRun.testCases.map((tc, i) => {
    const tc2 = tc.testCase;
    const color = STATUS_COLOR[tc.status] ?? C.notRun;
    return {
      cells: [
        String(i + 1),
        tc2?.tcId ?? '—',
        tc2?.title ?? tc.testCaseId,
        tc.executionMode === 'automated' ? '⚡ Auto' : '✎ Manual',
        STATUS_LABEL[tc.status] ?? tc.status.toUpperCase(),
        tc.duration != null ? `${tc.duration}s` : '—',
        tc.executedBy ? (users.get(tc.executedBy) ?? tc.executedBy.slice(0, 8) + '…') : '—',
      ],
      statusColor: color,
    };
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'TC ID', 'Title', 'Mode', 'Status', 'Duration', 'Executed By']],
    body: rows.map(r => r.cells),
    margin: { left: ML, right: MR },
    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'ellipsize' },
    headStyles: { fillColor: C.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 18, fontStyle: 'bold' },
      2: { cellWidth: 72 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 16, halign: 'right' },
      6: { cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const row = rows[data.row.index];
        if (row) {
          const [r, g, b] = row.statusColor;
          data.cell.styles.textColor = [r, g, b];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  return (doc as any).lastAutoTable?.finalY ?? y + 20;
}

// ── Section: Detailed results per test case ───────────────────────────────────

async function drawDetailedResults(
  doc: jsPDF,
  testRun: TestRun,
  users: Map<string, string>,
  onProgress: (msg: string) => void,
) {
  doc.addPage();
  let y = 18;

  text(doc, C.primary, 8, 'bold');
  doc.text('DETAILED RESULTS', ML, y);
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.4);
  doc.line(ML, y + 1.5, ML + 40, y + 1.5);
  y += 8;

  const sorted = [...testRun.testCases].sort((a, b) => {
    const order = { failed: 0, blocked: 1, in_progress: 2, passed: 3, not_run: 4 };
    return (order[a.status as keyof typeof order] ?? 5) - (order[b.status as keyof typeof order] ?? 5);
  });

  for (let i = 0; i < sorted.length; i++) {
    const tc = sorted[i];
    const tcDetail = tc.testCase;
    const statusColor = STATUS_COLOR[tc.status] ?? C.notRun;

    onProgress(`Processing ${i + 1}/${sorted.length}: ${tcDetail?.tcId ?? ''}`);

    // Fetch execution data and screenshots
    let execution: ScriptExecution | null = null;
    let screenshots: string[] = [];
    if (tc.scriptExecutionId) {
      execution = await fetchExecution(tc.scriptExecutionId);
      if (execution?.screenshots?.length) {
        screenshots = execution.screenshots.slice(0, 4); // max 4 screenshots per case
      }
    }

    const estimatedHeight = 34 + (screenshots.length > 0 ? Math.ceil(screenshots.length / 2) * 58 : 0);
    y = checkPage(doc, y, estimatedHeight);

    // ── Case header ──────────────────────────────────────────────────────────
    doc.setFillColor(...C.bg);
    doc.setDrawColor(...C.border);
    doc.rect(ML, y, CW, 11, 'FD');

    // Status color left bar
    doc.setFillColor(...statusColor);
    doc.rect(ML, y, 2.5, 11, 'F');

    // TC ID
    text(doc, C.primary, 8, 'bold');
    doc.text(tcDetail?.tcId ?? `#${i + 1}`, ML + 5, y + 4.5);

    // Title
    text(doc, C.dark, 8, 'bold');
    const titleX = ML + 5 + doc.getTextWidth(tcDetail?.tcId ?? `#${i + 1}`) + 4;
    const maxTitleW = CW - (titleX - ML) - 35;
    const title = tcDetail?.title ?? tc.testCaseId;
    doc.text(title, titleX, y + 4.5, { maxWidth: maxTitleW });

    // Status pill (right aligned)
    pill(doc, ML + CW - 30, y + 5.5, STATUS_LABEL[tc.status] ?? tc.status.toUpperCase(), statusColor);

    // Mode / Duration / Executed by line
    text(doc, C.muted, 7);
    const metaLine = [
      tc.executionMode === 'automated' ? '⚡ Automated' : '✎ Manual',
      tc.duration != null ? `${tc.duration}s` : null,
      tc.executedBy ? `by ${users.get(tc.executedBy) ?? ''}` : null,
      tc.executedAt ? format(new Date(tc.executedAt), 'MMM dd, yyyy HH:mm') : null,
    ].filter(Boolean).join('  ·  ');
    doc.text(metaLine, ML + 5, y + 9);
    y += 14;

    // Comment
    if (tc.comment) {
      y = checkPage(doc, y, 12);
      text(doc, C.muted, 7, 'bold');
      doc.text('Comment:', ML, y);
      text(doc, C.mid, 7);
      doc.text(tc.comment, ML + 18, y, { maxWidth: CW - 18 });
      y += 5;
    }

    // Actual result
    if (tc.actualResult) {
      y = checkPage(doc, y, 12);
      text(doc, C.muted, 7, 'bold');
      doc.text('Actual Result:', ML, y);
      text(doc, C.mid, 7);
      doc.text(tc.actualResult, ML + 24, y, { maxWidth: CW - 24 });
      y += 5;
    }

    // Defects
    if (tc.defects?.length) {
      y = checkPage(doc, y, 10);
      text(doc, C.muted, 7, 'bold');
      doc.text('Defects:', ML, y);
      text(doc, C.failed, 7);
      doc.text(tc.defects.join(', '), ML + 16, y, { maxWidth: CW - 16 });
      y += 5;
    }

    // Error message from execution
    if (execution?.errorMessage) {
      y = checkPage(doc, y, 14);
      text(doc, C.failed, 7, 'bold');
      doc.text('Error:', ML, y);
      text(doc, C.failed, 7);
      doc.setFillColor(255, 240, 240);
      const errLines = doc.splitTextToSize(execution.errorMessage.slice(0, 300), CW - 4);
      const errH = errLines.length * 3.5 + 3;
      doc.rect(ML, y + 2, CW, errH, 'F');
      doc.text(errLines, ML + 2, y + 5);
      y += errH + 5;
    }

    // Screenshots
    if (screenshots.length > 0) {
      y = checkPage(doc, y, 14);
      text(doc, C.muted, 7, 'bold');
      doc.text('Screenshots:', ML, y);
      y += 4;

      const perRow = 2;
      const imgW = (CW - 4) / perRow;
      const imgH = imgW * (720 / 1280); // 16:9 ratio

      for (let s = 0; s < screenshots.length; s += perRow) {
        y = checkPage(doc, y, imgH + 4);
        for (let j = 0; j < perRow && s + j < screenshots.length; j++) {
          const filename = screenshots[s + j];
          const imgX = ML + j * (imgW + 4);
          const b64 = await fetchImageBase64(tc.scriptExecutionId!, filename);
          if (b64) {
            try {
              // Border
              doc.setDrawColor(...C.border);
              doc.setLineWidth(0.3);
              doc.rect(imgX, y, imgW, imgH);
              doc.addImage(b64, 'PNG', imgX, y, imgW, imgH, undefined, 'FAST');
              // Caption
              text(doc, C.muted, 6);
              doc.text(filename, imgX + imgW / 2, y + imgH + 2.5, { align: 'center' });
            } catch {
              // Could not embed image — draw placeholder
              doc.setFillColor(...C.bg);
              doc.rect(imgX, y, imgW, imgH, 'F');
              text(doc, C.muted, 8);
              doc.text('[Image unavailable]', imgX + imgW / 2, y + imgH / 2, { align: 'center' });
            }
          } else {
            doc.setFillColor(...C.bg);
            doc.rect(imgX, y, imgW, imgH, 'F');
            text(doc, C.muted, 8);
            doc.text('[Screenshot not found]', imgX + imgW / 2, y + imgH / 2, { align: 'center' });
          }
        }
        y += imgH + 7;
      }
    }

    // Separator between cases
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(ML, y, ML + CW, y);
    y += 6;
  }

  return y;
}

// ── Footer on every page ──────────────────────────────────────────────────────

function addFooters(doc: jsPDF, testRun: TestRun) {
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(ML, H - MB + 2, W - MR, H - MB + 2);
    text(doc, C.muted, 7);
    doc.text(`TestFlow TCM · ${testRun.name}`, ML, H - MB + 6);
    doc.text(`Page ${p} of ${pageCount}`, W - MR, H - MB + 6, { align: 'right' });
  }
}

// ── Stats helper ──────────────────────────────────────────────────────────────

function computeStats(testRun: TestRun) {
  const tcs = testRun.testCases;
  const passed      = tcs.filter(tc => tc.status === 'passed').length;
  const failed      = tcs.filter(tc => tc.status === 'failed').length;
  const blocked     = tcs.filter(tc => tc.status === 'blocked').length;
  const notRun      = tcs.filter(tc => tc.status === 'not_run').length;
  const inProgress  = tcs.filter(tc => tc.status === 'in_progress').length;
  const total       = tcs.length;
  const automatedTotal  = tcs.filter(tc => tc.executionMode === 'automated').length;
  const automatedPassed = tcs.filter(tc => tc.executionMode === 'automated' && tc.status === 'passed').length;
  const manualTotal  = tcs.filter(tc => tc.executionMode === 'manual').length;
  const manualPassed = tcs.filter(tc => tc.executionMode === 'manual' && tc.status === 'passed').length;
  return { passed, failed, blocked, notRun, inProgress, total, automatedTotal, automatedPassed, manualTotal, manualPassed };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface PDFGenerationOptions {
  onProgress?: (msg: string) => void;
}

export async function generateTestRunPDF(
  testRun: TestRun,
  users: User[],
  options: PDFGenerationOptions = {},
): Promise<void> {
  const onProgress = options.onProgress ?? (() => {});
  const userMap = new Map(users.map(u => [u.id, `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()]));

  onProgress('Building PDF…');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const stats = computeStats(testRun);

  // Page 1 — cover + summary
  onProgress('Rendering summary…');
  drawCover(doc, testRun, stats);

  // Page 2 — test cases table
  onProgress('Rendering test cases table…');
  drawTestCasesTable(doc, testRun, userMap);

  // Page 3+ — detailed results with screenshots
  onProgress('Loading screenshots…');
  await drawDetailedResults(doc, testRun, userMap, onProgress);

  // Add page footers
  addFooters(doc, testRun);

  const filename = `testrun-report-${testRun.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
  onProgress('Done');
}

// Needed for type reference
interface User {
  id: string;
  firstName?: string;
  lastName?: string;
}
