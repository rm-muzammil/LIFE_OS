import { isDateString } from '@/lib/faith/date';
import {
  ROADMAP_DOMAINS,
  type RoadmapCsvPreview,
  type RoadmapCsvRow,
  type RoadmapDomain,
  type RoadmapPriority,
  type RoadmapRowIssue,
  type RoadmapRowType,
} from '@/lib/roadmap/types';

export const MAX_CSV_BYTES = 1024 * 1024;
export const MAX_CSV_ROWS = 5000;

const FIELD_LIMITS = {
  type: 16,
  title: 200,
  parent: 200,
  domain: 32,
  start_date: 10,
  due_date: 10,
  priority: 16,
  estimate_minutes: 10,
  notes: 4000,
} as const;

const HEADERS = new Set(Object.keys(FIELD_LIMITS));
const TYPE_VALUES = new Set<RoadmapRowType>(['goal', 'milestone', 'task']);
const PRIORITIES = new Set<RoadmapPriority>(['low', 'medium', 'high']);
const DOMAIN_VALUES = new Set<string>(ROADMAP_DOMAINS);

class CsvFormatError extends Error {}

interface CsvRecord {
  cells: string[];
  rowNumber: number;
}

function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim();
}

function parseRecords(source: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let record: string[] = [];
  let cell = '';
  let quoted = false;
  let quoteClosed = false;
  let physicalLine = 1;
  let recordStartLine = 1;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          quoteClosed = true;
        }
      } else {
        cell += character;
        if (character === '\r' || character === '\n') {
          if (character === '\r' && source[index + 1] === '\n') {
            cell += '\n';
            index += 1;
          }
          physicalLine += 1;
        }
      }
      continue;
    }

    if (quoteClosed && character !== ',' && character !== '\r' && character !== '\n') {
      throw new CsvFormatError('Unexpected character after a quoted CSV field.');
    }
    if (character === '"' && cell.length === 0 && !quoteClosed) {
      quoted = true;
    } else if (character === ',') {
      record.push(cell);
      cell = '';
      quoteClosed = false;
    } else if (character === '\r' || character === '\n') {
      record.push(cell);
      records.push({ cells: record, rowNumber: recordStartLine });
      record = [];
      cell = '';
      quoteClosed = false;
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      physicalLine += 1;
      recordStartLine = physicalLine;
    } else {
      if (character === '"' || quoteClosed) {
        throw new CsvFormatError('Malformed CSV quoting.');
      }
      cell += character;
    }
  }

  if (quoted) throw new CsvFormatError('Unclosed quoted CSV field.');
  if (cell.length > 0 || record.length > 0 || quoteClosed) {
    record.push(cell);
    records.push({ cells: record, rowNumber: recordStartLine });
  }
  return records;
}

function issue(row: number, column: string, reason: string): RoadmapRowIssue {
  return { row, column, reason };
}

function normalizeCell(
  value: string | undefined,
  rowNumber: number,
  column: keyof typeof FIELD_LIMITS,
  issues: RoadmapRowIssue[]
): string {
  const clean = stripControlCharacters(value ?? '');
  if (clean.length > FIELD_LIMITS[column]) {
    issues.push(issue(rowNumber, column, 'value exceeds the field length limit'));
  }
  return clean.slice(0, FIELD_LIMITS[column]);
}

function validDate(
  value: string,
  rowNumber: number,
  column: 'start_date' | 'due_date',
  issues: RoadmapRowIssue[]
): string | null {
  if (!value) return null;
  if (!isDateString(value)) {
    issues.push(issue(rowNumber, column, 'must be a valid YYYY-MM-DD date'));
    return null;
  }
  return value;
}

function recordIsEmpty(record: CsvRecord): boolean {
  return record.cells.every((cell) => stripControlCharacters(cell) === '');
}

export function parseRoadmapCsv(bytes: Uint8Array): RoadmapCsvPreview {
  if (bytes.byteLength > MAX_CSV_BYTES) {
    throw new Error('CSV file exceeds the 1 MB limit.');
  }
  let source: string;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  } catch {
    throw new Error('CSV file must be valid UTF-8.');
  }

  let records: CsvRecord[];
  try {
    records = parseRecords(source);
  } catch (error) {
    throw new Error(error instanceof CsvFormatError ? error.message : 'CSV file is malformed.');
  }
  while (records.length > 0 && recordIsEmpty(records[records.length - 1])) records.pop();
  if (records.length === 0) throw new Error('CSV file must include a header row.');

  const headerCells = records[0].cells.map((cell) => stripControlCharacters(cell).toLowerCase());
  const positions = new Map<string, number>();
  const headerIssues: RoadmapRowIssue[] = [];
  headerCells.forEach((header, index) => {
    if (!HEADERS.has(header)) return;
    if (positions.has(header)) {
      headerIssues.push(issue(1, header, 'header appears more than once'));
      return;
    }
    positions.set(header, index);
  });
  for (const requiredHeader of ['type', 'title']) {
    if (!positions.has(requiredHeader)) {
      headerIssues.push(issue(1, requiredHeader, 'required header is missing'));
    }
  }
  if (headerIssues.length > 0) {
    const first = headerIssues[0];
    throw new Error(`CSV header error in '${first.column}': ${first.reason}.`);
  }

  const dataRecords = records.slice(1).filter((record) => !recordIsEmpty(record));
  if (dataRecords.length > MAX_CSV_ROWS) {
    throw new Error('CSV file exceeds the 5,000 row limit.');
  }

  const rows: RoadmapCsvRow[] = dataRecords.map((record) => {
    const rowNumber = record.rowNumber;
    const issues: RoadmapRowIssue[] = [];
    const cell = (column: keyof typeof FIELD_LIMITS) =>
      normalizeCell(record.cells[positions.get(column) ?? -1], rowNumber, column, issues);

    const rawType = cell('type').toLowerCase();
    const type = TYPE_VALUES.has(rawType as RoadmapRowType)
      ? rawType as RoadmapRowType
      : null;
    if (!type) issues.push(issue(rowNumber, 'type', 'must be goal, milestone, or task'));

    const title = cell('title');
    if (!title) issues.push(issue(rowNumber, 'title', 'is required'));

    const rawDomain = cell('domain').toLowerCase();
    const domain: RoadmapDomain = DOMAIN_VALUES.has(rawDomain)
      ? rawDomain as RoadmapDomain
      : 'other';

    const rawPriority = cell('priority').toLowerCase();
    const priority = rawPriority
      ? PRIORITIES.has(rawPriority as RoadmapPriority)
        ? rawPriority as RoadmapPriority
        : null
      : 'medium';
    if (!priority) issues.push(issue(rowNumber, 'priority', 'must be low, medium, or high'));

    const startDate = validDate(cell('start_date'), rowNumber, 'start_date', issues);
    const dueDate = validDate(cell('due_date'), rowNumber, 'due_date', issues);
    if (startDate && dueDate && startDate > dueDate) {
      issues.push(issue(rowNumber, 'due_date', 'must not be earlier than start_date'));
    }

    const rawEstimate = cell('estimate_minutes');
    let estimateMinutes: number | null = null;
    if (rawEstimate) {
      const parsedEstimate = Number(rawEstimate);
      if (!Number.isSafeInteger(parsedEstimate) || parsedEstimate <= 0 || parsedEstimate > 2_147_483_647) {
        issues.push(issue(rowNumber, 'estimate_minutes', 'must be a positive whole number'));
      } else {
        estimateMinutes = parsedEstimate;
      }
    }

    return {
      rowNumber,
      type,
      title,
      parent: cell('parent') || null,
      domain,
      startDate,
      dueDate,
      priority: priority ?? 'medium',
      estimateMinutes,
      description: cell('notes') || null,
      goalParentRow: null,
      milestoneParentRow: null,
      issues,
    };
  });

  if (rows.length === 0) {
    return {
      rows,
      errors: [],
      counts: { goal: 0, milestone: 0, task: 0 },
      importableCounts: { goal: 0, milestone: 0, task: 0 },
      skippedCount: 0,
    };
  }

  const goalsByTitle = new Map<string, RoadmapCsvRow[]>();
  for (const row of rows) {
    if (row.type !== 'goal' || !row.title) continue;
    const matches = goalsByTitle.get(row.title) ?? [];
    matches.push(row);
    goalsByTitle.set(row.title, matches);
  }
  for (const matches of goalsByTitle.values()) {
    if (matches.length > 1) {
      for (const match of matches) {
        match.issues.push(issue(match.rowNumber, 'title', 'goal title is duplicated in this file'));
      }
    }
  }

  const goalsByValidTitle = (title: string) =>
    (goalsByTitle.get(title) ?? []).filter((row) => row.issues.length === 0);
  const milestonesByTitle = new Map<string, RoadmapCsvRow[]>();

  for (const row of rows) {
    if (row.type !== 'milestone') continue;
    if (!row.parent) {
      row.issues.push(issue(row.rowNumber, 'parent', 'milestone requires a goal title'));
      continue;
    }
    const matchingGoals = goalsByTitle.get(row.parent) ?? [];
    const validGoals = goalsByValidTitle(row.parent);
    if (validGoals.length === 1) {
      row.goalParentRow = validGoals[0].rowNumber;
    } else if (matchingGoals.length > 0) {
      row.issues.push(issue(row.rowNumber, 'parent', 'parent skipped'));
    } else {
      row.issues.push(issue(row.rowNumber, 'parent', 'goal parent not found'));
    }
    const matches = milestonesByTitle.get(row.title) ?? [];
    matches.push(row);
    milestonesByTitle.set(row.title, matches);
  }

  for (const row of rows) {
    if (row.type !== 'task' || !row.parent) continue;
    const goalMatches = goalsByTitle.get(row.parent) ?? [];
    const milestoneMatches = milestonesByTitle.get(row.parent) ?? [];
    const parents = [...goalMatches, ...milestoneMatches];
    const validParents = parents.filter((parent) => parent.issues.length === 0);
    if (parents.some((parent) => parent.issues.length > 0)) {
      row.issues.push(issue(row.rowNumber, 'parent', 'parent skipped'));
    } else if (validParents.length === 1) {
      const parent = validParents[0];
      if (parent.type === 'goal') {
        row.goalParentRow = parent.rowNumber;
      } else if (parent.type === 'milestone') {
        row.milestoneParentRow = parent.rowNumber;
        row.goalParentRow = parent.goalParentRow;
      }
    } else if (validParents.length > 1) {
      row.issues.push(issue(row.rowNumber, 'parent', 'parent title is ambiguous'));
    } else {
      row.issues.push(issue(row.rowNumber, 'parent', 'task parent not found'));
    }
  }

  const counts: RoadmapCsvPreview['counts'] = { goal: 0, milestone: 0, task: 0 };
  const importableCounts: RoadmapCsvPreview['importableCounts'] = {
    goal: 0,
    milestone: 0,
    task: 0,
  };
  for (const row of rows) {
    if (row.type) {
      counts[row.type] += 1;
      if (row.issues.length === 0) importableCounts[row.type] += 1;
    }
  }
  const errors = rows.flatMap((row) => row.issues);
  return {
    rows,
    errors,
    counts,
    importableCounts,
    skippedCount: rows.filter((row) => row.issues.length > 0).length,
  };
}
