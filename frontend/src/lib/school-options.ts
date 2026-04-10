export const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

export const BASE_CLASS_OPTIONS = [
  '\u4e00\u73ed',
  '\u4e8c\u73ed',
  '\u4e09\u73ed',
  '\u56db\u73ed',
  '\u4e94\u73ed',
  '\u516d\u73ed',
  '\u4e03\u73ed',
  '\u516b\u73ed',
  '\u4e5d\u73ed',
  '\u5341\u73ed',
] as const;

export const CLASS_NAME_OPTIONS = BASE_CLASS_OPTIONS;

export const SCHOOL_OPTIONS = [
  '\u672a\u6765\u5c0f\u5b66',
  '\u5b9e\u9a8c\u5c0f\u5b66',
  '\u661f\u6cb3\u5c0f\u5b66',
] as const;

export const SUBJECT_OPTIONS = ['\u6570\u5b66'] as const;

export function getClassOptionsByGrade(grade?: number | string | null) {
  const numericGrade =
    typeof grade === 'string' ? Number(grade) : typeof grade === 'number' ? grade : null;

  if (!numericGrade || Number.isNaN(numericGrade)) {
    return BASE_CLASS_OPTIONS.map((name) => ({
      value: name,
      label: name,
    }));
  }

  return BASE_CLASS_OPTIONS.map((name) => ({
    value: name,
    label: `${numericGrade} \u5e74\u7ea7${name}`,
  }));
}

export function normalizeClassName(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  const removedGrade = trimmed.replace(
    /^(?:[1-6]|\u4e00|\u4e8c|\u4e09|\u56db|\u4e94|\u516d)\s*\u5e74\u7ea7/,
    '',
  );

  const numericToChinese: Record<string, string> = {
    '1': '\u4e00\u73ed',
    '2': '\u4e8c\u73ed',
    '3': '\u4e09\u73ed',
    '4': '\u56db\u73ed',
    '5': '\u4e94\u73ed',
    '6': '\u516d\u73ed',
    '7': '\u4e03\u73ed',
    '8': '\u516b\u73ed',
    '9': '\u4e5d\u73ed',
    '10': '\u5341\u73ed',
  };

  const numericClassMatch = removedGrade.match(/^([1-9]|10)\s*\u73ed$/);
  if (numericClassMatch) {
    return numericToChinese[numericClassMatch[1]] ?? removedGrade.trim();
  }

  return removedGrade.trim();
}
