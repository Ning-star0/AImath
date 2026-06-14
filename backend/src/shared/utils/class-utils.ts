export interface ManagedClassAssignment {
  grade: number;
  className: string;
  schoolName?: string | null;
}

export interface TeacherExtraState {
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  classAccessStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  classAccessNote: string | null;
  requestedClasses: ManagedClassAssignment[];
  approvedClasses: ManagedClassAssignment[];
}

export function normalizeManagedClassName(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  const removedGrade = trimmed.replace(
    /^(?:[1-6]|一|二|三|四|五|六)\s*年级/,
    '',
  );
  const map: Record<string, string> = {
    '1': '一班',
    '2': '二班',
    '3': '三班',
    '4': '四班',
    '5': '五班',
    '6': '六班',
  };
  const numericClassMatch = removedGrade.match(/^([1-6])\s*班$/);
  if (numericClassMatch) {
    return map[numericClassMatch[1]] ?? removedGrade.trim();
  }

  return removedGrade.trim();
}

export function normalizeManagedClasses(value: unknown): ManagedClassAssignment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: ManagedClassAssignment[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const record = item as Record<string, unknown>;
    const grade = Number(record.grade);
    const className =
      typeof record.className === 'string' ? normalizeManagedClassName(record.className) : '';
    const schoolName =
      typeof record.schoolName === 'string' ? record.schoolName.trim() : null;

    if (!Number.isInteger(grade) || grade < 1 || grade > 6 || !className) {
      continue;
    }

    const dedupeKey = `${grade}:${className}:${schoolName ?? ''}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    result.push({
      grade,
      className,
      schoolName,
    });
  }

  return result;
}

export function readTeacherExtra(extra: unknown): TeacherExtraState {
  const value =
    extra && typeof extra === 'object' && !Array.isArray(extra)
      ? (extra as Record<string, unknown>)
      : {};

  return {
    reviewStatus:
      value.reviewStatus === 'APPROVED' || value.reviewStatus === 'REJECTED'
        ? value.reviewStatus
        : 'PENDING',
    reviewNote: typeof value.reviewNote === 'string' ? value.reviewNote : null,
    classAccessStatus:
      value.classAccessStatus === 'PENDING' ||
      value.classAccessStatus === 'APPROVED' ||
      value.classAccessStatus === 'REJECTED'
        ? value.classAccessStatus
        : 'NOT_SUBMITTED',
    classAccessNote:
      typeof value.classAccessNote === 'string' ? value.classAccessNote : null,
    requestedClasses: normalizeManagedClasses(value.requestedClasses),
    approvedClasses: normalizeManagedClasses(value.approvedClasses),
  };
}
