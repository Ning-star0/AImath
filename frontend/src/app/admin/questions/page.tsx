'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { PageShell } from '@/components/base/page-shell';
import {
  adminService,
  type AdminQuestionsResult,
  type ImportQuestionsPayload,
  type ImportQuestionsResult,
  type DeleteQuestionsResult,
} from '@/services/admin.service';

const adminNavItems = [
  { href: '/admin', label: '管理首页' },
  { href: '/admin/questions', label: '题库管理' },
  { href: '/admin/users', label: '用户列表' },
];

const sampleImportJson = `{
  "batchName": "grade3-mixed-demo-batch",
  "knowledgePoints": [
    {
      "code": "GRADE3-ADD-001",
      "name": "万以内加法",
      "grade": 3,
      "chapter": "整数加法",
      "description": "理解万以内整数加法的运算规则。"
    },
    {
      "code": "GRADE3-MUL-001",
      "name": "表内乘法",
      "grade": 3,
      "chapter": "乘法",
      "description": "掌握表内乘法和简单应用。"
    }
  ],
  "questions": [
    {
      "id": "grade3-choice-001",
      "title": "三年级加法选择题",
      "stem": "计算 36 + 14，正确答案是哪一个？",
      "questionType": "SINGLE_CHOICE",
      "grade": 3,
      "difficulty": 1,
      "answer": "B",
      "options": [
        { "label": "A", "value": "40" },
        { "label": "B", "value": "50" },
        { "label": "C", "value": "52" },
        { "label": "D", "value": "60" }
      ],
      "analysis": "个位 6 + 4 = 10，写 0 进 1；十位 3 + 1 + 1 = 5，所以结果是 50。",
      "tags": ["加法", "选择题"],
      "knowledgePointCodes": ["GRADE3-ADD-001"],
      "source": "manual-json-import"
    },
    {
      "id": "grade3-blank-001",
      "title": "三年级乘法填空题",
      "stem": "8 × 7 = ____",
      "questionType": "FILL_BLANK",
      "grade": 3,
      "difficulty": 1,
      "answer": "56",
      "analysis": "根据乘法口诀“七八五十六”，所以答案是 56。",
      "tags": ["乘法", "填空题"],
      "knowledgePointCodes": ["GRADE3-MUL-001"],
      "source": "manual-json-import"
    },
    {
      "id": "grade3-application-001",
      "title": "三年级加法应用题",
      "stem": "小红有 25 张贴纸，又买了 13 张，现在一共有多少张？",
      "questionType": "SHORT_ANSWER",
      "grade": 3,
      "difficulty": 2,
      "answer": "38",
      "analysis": "把原来的 25 张和新买的 13 张加起来，25 + 13 = 38。",
      "tags": ["应用题", "加法", "简答题"],
      "knowledgePointCodes": ["GRADE3-ADD-001"],
      "source": "manual-json-import"
    }
  ]
}`;

export default function AdminQuestionsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [data, setData] = useState<AdminQuestionsResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<ImportQuestionsResult | null>(
    null,
  );
  const [deleteResult, setDeleteResult] = useState<DeleteQuestionsResult | null>(
    null,
  );
  const [jsonText, setJsonText] = useState(sampleImportJson);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [importError, setImportError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const response = await adminService.getQuestions();
      setData(response);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '题目列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuestions();
  }, []);

  const allSelectableIds = useMemo(
    () => data?.list.map((item) => item.id) ?? [],
    [data],
  );

  const handleImport = async () => {
    setImportError('');
    setImportResult(null);
    setDeleteResult(null);

    let parsedPayload: ImportQuestionsPayload;
    try {
      parsedPayload = JSON.parse(jsonText) as ImportQuestionsPayload;
    } catch {
      setImportError('JSON 格式不正确，请先检查逗号、引号和括号。');
      return;
    }

    if (!Array.isArray(parsedPayload.questions) || parsedPayload.questions.length === 0) {
      setImportError('至少需要提供 1 道题目。');
      return;
    }

    setImporting(true);
    try {
      const response = await adminService.importQuestions(parsedPayload);
      setImportResult(response);
      await loadQuestions();
    } catch (submitError) {
      setImportError(
        submitError instanceof Error ? submitError.message : '批量导入失败',
      );
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      setDeleteError('请先勾选要删除的题目。');
      return;
    }

    setDeleteError('');
    setDeleteResult(null);
    setDeleting(true);

    try {
      const response = await adminService.deleteQuestions(selectedIds);
      setDeleteResult(response);
      setSelectedIds([]);
      await loadQuestions();
    } catch (submitError) {
      setDeleteError(
        submitError instanceof Error ? submitError.message : '删除题目失败',
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleJsonFileSelect = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      setImportError('请选择 .json 格式的文件。');
      event.target.value = '';
      return;
    }

    try {
      const content = await file.text();
      JSON.parse(content);
      setJsonText(content);
      setImportError('');
      setImportResult(null);
    } catch {
      setImportError('上传的 JSON 文件格式不正确，请检查后重新选择。');
    } finally {
      event.target.value = '';
    }
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds((current) =>
      current.length === allSelectableIds.length ? [] : allSelectableIds,
    );
  };

  return (
    <PageShell
      title="管理端题目列表"
      description="这里可以批量导入题目、自动去重，并直接删除已存在的题目。删除时系统会同步清理相关练习和错题数据。"
      navItems={adminNavItems}
    >
      {error ? (
        <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <section className="mb-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-ink">题库 JSON 批量导入</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                管理员可以直接粘贴 JSON 或上传 `.json` 文件。系统会优先按 `id`
                更新，没有 `id` 时会按“年级 + 题型 + 题干”做去重。下面的示例同时包含单选题、填空题和应用题。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setJsonText(sampleImportJson)}
              className="rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-white"
            >
              填入示例
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleJsonFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
            >
              上传 .json 文件
            </button>
            <p className="text-sm text-slate-500">
              文件内容会自动读入下方输入框，方便导入前再检查一次。
            </p>
          </div>

          <textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            rows={20}
            className="mt-5 w-full rounded-3xl border border-slate-200 px-4 py-4 font-mono text-sm leading-6 outline-none transition focus:border-brand-500"
            placeholder="请粘贴批量导入 JSON"
          />

          {importError ? (
            <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {importError}
            </div>
          ) : null}

          {importResult ? (
            <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              处理完成：新增 {importResult.importedQuestions} 道，更新{' '}
              {importResult.updatedQuestions ?? 0} 道，去重复用{' '}
              {importResult.deduplicatedQuestions ?? 0} 道，知识点{' '}
              {importResult.importedKnowledgePoints} 个。
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {importing ? '正在导入...' : '开始导入'}
            </button>
            <button
              type="button"
              onClick={() => setJsonText('')}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300"
            >
              清空内容
            </button>
          </div>
        </article>

        <article className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card">
          <h2 className="text-xl font-bold text-ink">导入规范</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            <p>1. 顶层结构固定为：`batchName`、`knowledgePoints`、`questions`。</p>
            <p>2. `questions` 必须是数组，至少 1 道题；每道题建议带 `title`、`stem`、`questionType`、`grade`、`difficulty`、`answer`、`tags`。</p>
            <p>3. 如果提供 `id`，系统会按 `id` 更新已有题目；适合你多次维护同一批题目。</p>
            <p>4. 如果不提供 `id`，系统会按“年级 + 题型 + 题干”自动去重，避免同题重复导入。</p>
            <p>5. `knowledgePoints` 建议先定义知识点编码，题目里再通过 `knowledgePointCodes` 关联。</p>
            <p>6. `SINGLE_CHOICE`、`MULTIPLE_CHOICE` 类型必须提供 `options`，而且至少要有 2 个选项。</p>
            <p>7. 选择题建议把 `answer` 写成选项标签，例如 `A`、`B`；题干里不用重复写选项，统一放到 `options` 字段。</p>
            <p>8. 删除题目时，系统会同时清理相关练习明细、错题记录，并自动修正受影响的学习统计。</p>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/80 p-5">
            <h3 className="text-lg font-semibold text-ink">规范 JSON 示例</h3>
            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-white px-4 py-4 text-xs leading-6 text-slate-700">
{`{
  "batchName": "grade3-mixed-demo-batch",
  "knowledgePoints": [
    {
      "code": "GRADE3-ADD-001",
      "name": "万以内加法",
      "grade": 3,
      "chapter": "整数加法",
      "description": "理解万以内整数加法的运算规则。"
    },
    {
      "code": "GRADE3-MUL-001",
      "name": "表内乘法",
      "grade": 3,
      "chapter": "乘法",
      "description": "掌握表内乘法和简单应用。"
    }
  ],
  "questions": [
    {
      "id": "grade3-choice-001",
      "title": "三年级加法选择题",
      "stem": "计算 36 + 14，正确答案是哪一个？",
      "questionType": "SINGLE_CHOICE",
      "grade": 3,
      "difficulty": 1,
      "answer": "B",
      "options": [
        { "label": "A", "value": "40" },
        { "label": "B", "value": "50" },
        { "label": "C", "value": "52" },
        { "label": "D", "value": "60" }
      ],
      "analysis": "个位 6 + 4 = 10，写 0 进 1；十位 3 + 1 + 1 = 5，所以结果是 50。",
      "tags": ["加法", "选择题"],
      "knowledgePointCodes": ["GRADE3-ADD-001"],
      "source": "manual-json-import",
      "metadata": {
        "author": "admin",
        "version": "v1"
      }
    },
    {
      "id": "grade3-blank-001",
      "title": "三年级乘法填空题",
      "stem": "8 × 7 = ____",
      "questionType": "FILL_BLANK",
      "grade": 3,
      "difficulty": 1,
      "answer": "56",
      "analysis": "根据乘法口诀“七八五十六”，所以答案是 56。",
      "tags": ["乘法", "填空题"],
      "knowledgePointCodes": ["GRADE3-MUL-001"]
    },
    {
      "id": "grade3-application-001",
      "title": "三年级加法应用题",
      "stem": "小红有 25 张贴纸，又买了 13 张，现在一共有多少张？",
      "questionType": "SHORT_ANSWER",
      "grade": 3,
      "difficulty": 2,
      "answer": "38",
      "analysis": "把原来的 25 张和新买的 13 张加起来，25 + 13 = 38。",
      "tags": ["应用题", "加法", "简答题"],
      "knowledgePointCodes": ["GRADE3-ADD-001"]
    }
  ]
}`}
            </pre>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/80 p-5">
            <h3 className="text-lg font-semibold text-ink">导入处理示例</h3>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>
                例 1：你再次导入同一个 `id` 为 `grade3-choice-001`
                的题目，系统会更新原题，不会新增一条重复题目。
              </p>
              <p>
                例 2：你没有写 `id`，但题干、年级、题型和已有题完全一致，系统会判定为重复题，自动复用原题。
              </p>
              <p>
                例 3：你勾选删除一批题目时，系统会同步清理相关练习明细、错题记录，并自动修正学习统计。
              </p>
            </div>
          </div>
        </article>
      </section>

      {deleteResult?.cleanupSummary ? (
        <div className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          已同步清理：练习明细 {deleteResult.cleanupSummary.removedExerciseDetails} 条，错题记录{' '}
          {deleteResult.cleanupSummary.removedWrongQuestions} 条，空练习记录{' '}
          {deleteResult.cleanupSummary.removedEmptyExerciseRecords} 条。
        </div>
      ) : null}

      <section className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">当前题目列表</h2>
              <p className="mt-2 text-sm text-slate-500">
              支持勾选删除。删除题目时会同步清理相关练习明细和错题记录，并自动修正受影响的学习统计。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
            >
              {selectedIds.length === allSelectableIds.length &&
              allSelectableIds.length > 0
                ? '取消全选'
                : '全选题目'}
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={deleting || selectedIds.length === 0}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {deleting ? '正在删除...' : `删除已选题目 (${selectedIds.length})`}
            </button>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
              {loading ? '加载中...' : `共 ${data?.total ?? 0} 道`}
            </span>
          </div>
        </div>

        {deleteError ? (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {deleteError}
          </div>
        ) : null}

        {deleteResult ? (
          <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            已删除 {deleteResult.deletedCount} 道，拦截 {deleteResult.blockedCount}{' '}
            道。
            {deleteResult.blocked.length > 0 ? (
              <div className="mt-2 space-y-1">
                {deleteResult.blocked.map((item) => (
                  <p key={item.id}>
                    {item.title}：{item.reason}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-4">
          {data?.list.map((item) => {
            const selected = selectedIds.includes(item.id);

            return (
              <article
                key={item.id}
                className={`rounded-3xl border p-5 transition ${
                  selected
                    ? 'border-brand-300 bg-brand-50/70'
                    : 'border-slate-100 bg-slate-50/80'
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleQuestionSelection(item.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                        <span>{item.grade} 年级</span>
                        <span>难度 {item.difficulty}</span>
                        <span>{item.questionType}</span>
                        <span>来源：{item.source ?? '未标记'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/80 px-4 py-3 text-xs leading-6 text-slate-500">
                    <p>练习引用 {item.exerciseReferenceCount} 条</p>
                    <p>错题引用 {item.wrongbookReferenceCount} 条</p>
                    <p>删除时会同步清理这些关联数据。</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
