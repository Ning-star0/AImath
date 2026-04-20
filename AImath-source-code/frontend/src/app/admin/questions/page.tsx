'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { PageShell } from '@/components/base/page-shell';
import {
  AuthRequiredState,
  NetworkErrorState,
  PageLoadErrorState,
  PermissionDeniedState,
  SessionExpiredState,
} from '@/components/states/platform-states';
import { getPlatformErrorKind } from '@/lib/platform-errors';
import {
  adminService,
  type AdminQuestionsResult,
  type DeleteQuestionsResult,
  type ImportQuestionsPayload,
  type ImportQuestionsResult,
} from '@/services/admin.service';
import { useUserStore } from '@/store/use-user-store';

const adminNavItems = [
  { href: '/admin', label: '管理首页' },
  { href: '/admin/questions', label: '题库管理' },
  { href: '/admin/users', label: '用户列表' },
];

const questionTypeOptions = [
  { value: '', label: '全部题型' },
  { value: 'SINGLE_CHOICE', label: '单选题' },
  { value: 'MULTIPLE_CHOICE', label: '多选题' },
  { value: 'FILL_BLANK', label: '填空题' },
  { value: 'SHORT_ANSWER', label: '解答题' },
];

const gradeOptions = [
  { value: '', label: '全部年级' },
  { value: '1', label: '一年级' },
  { value: '2', label: '二年级' },
  { value: '3', label: '三年级' },
  { value: '4', label: '四年级' },
  { value: '5', label: '五年级' },
  { value: '6', label: '六年级' },
];

const sampleImportJson = `{
  "batchName": "grade6-basic-batch",
  "knowledgePoints": [
    {
      "code": "GRADE6-FRACTION-001",
      "name": "分数乘法",
      "grade": 6,
      "chapter": "分数计算",
      "description": "理解分数与整数、分数与分数相乘。"
    }
  ],
  "questions": [
    {
      "id": "grade6-choice-001",
      "title": "六年级分数乘法选择题 1",
      "stem": "计算 3/5 × 10，正确结果是多少？",
      "questionType": "SINGLE_CHOICE",
      "grade": 6,
      "difficulty": 1,
      "answer": "B",
      "options": [
        { "label": "A", "value": "5" },
        { "label": "B", "value": "6" },
        { "label": "C", "value": "8" },
        { "label": "D", "value": "10" }
      ],
      "analysis": "3/5 × 10 = 6。",
      "tags": ["分数乘法", "六年级"],
      "knowledgePointCodes": ["GRADE6-FRACTION-001"],
      "source": "manual-json-import"
    }
  ]
}`;

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const toQuestionTypeLabel = (value: string) => {
  return questionTypeOptions.find((item) => item.value === value)?.label ?? value;
};

export default function AdminQuestionsPage() {
  const accessToken = useUserStore((state) => state.accessToken);
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [data, setData] = useState<AdminQuestionsResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<ImportQuestionsResult | null>(null);
  const [deleteResult, setDeleteResult] = useState<DeleteQuestionsResult | null>(null);
  const [jsonText, setJsonText] = useState(sampleImportJson);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [importError, setImportError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [gradeFilter, setGradeFilter] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('');

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const loadQuestions = async (nextPage = page, nextGrade = gradeFilter, nextType = questionTypeFilter) => {
    setLoading(true);

    try {
      const response = await adminService.getQuestions({
        page: nextPage,
        pageSize,
        grade: nextGrade ? Number(nextGrade) : undefined,
        questionType: nextType || undefined,
      });
      setData(response);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '题目列表加载失败。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuestions(page, gradeFilter, questionTypeFilter);
  }, [page, gradeFilter, questionTypeFilter]);

  const allSelectableIds = useMemo(() => data?.list.map((item) => item.id) ?? [], [data]);

  const stats = useMemo(() => {
    if (!data) {
      return { total: 0, currentPageCount: 0, referenced: 0, avgDifficulty: '0.0' };
    }

    return {
      total: data.total,
      currentPageCount: data.list.length,
      referenced: data.list.filter(
        (item) => item.exerciseReferenceCount > 0 || item.wrongbookReferenceCount > 0,
      ).length,
      avgDifficulty:
        data.list.length === 0
          ? '0.0'
          : (data.list.reduce((sum, item) => sum + item.difficulty, 0) / data.list.length).toFixed(1),
    };
  }, [data]);

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
      await loadQuestions(page, gradeFilter, questionTypeFilter);
    } catch (submitError) {
      setImportError(submitError instanceof Error ? submitError.message : '批量导入失败。');
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
      await loadQuestions(page, gradeFilter, questionTypeFilter);
    } catch (submitError) {
      setDeleteError(submitError instanceof Error ? submitError.message : '删除题目失败。');
    } finally {
      setDeleting(false);
    }
  };

  const handleJsonFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
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
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds((current) =>
      current.length === allSelectableIds.length ? [] : allSelectableIds,
    );
  };

  const handleResetFilters = () => {
    setGradeFilter('');
    setQuestionTypeFilter('');
    setPage(1);
  };

  if (!accessToken && !currentUser) {
    return (
      <PageShell title="题库管理" description="导入、筛选、分页查看并维护平台题库。">
        <AuthRequiredState />
      </PageShell>
    );
  }

  if (currentUser?.role && currentUser.role !== 'ADMIN') {
    return (
      <PageShell title="题库管理" description="导入、筛选、分页查看并维护平台题库。">
        <PermissionDeniedState />
      </PageShell>
    );
  }

  if (error) {
    const kind = getPlatformErrorKind(error);
    return (
      <PageShell title="题库管理" description="导入、筛选、分页查看并维护平台题库。">
        {kind === 'session_expired' ? (
          <SessionExpiredState />
        ) : kind === 'network_error' ? (
          <NetworkErrorState />
        ) : kind === 'permission_denied' ? (
          <PermissionDeniedState />
        ) : (
          <PageLoadErrorState />
        )}
      </PageShell>
    );
  }

  return (
    <PageShell
      title="题库管理"
      description="现在支持按年级和题型筛选，并通过分页查看完整题库，不再只显示前 50 条。"
      navItems={adminNavItems}
    >
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">Question Bank</p>
          <h2 className="mt-2 font-math-display text-3xl font-extrabold text-ink">支持筛选与分页的正式题库管理</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            题库现在按真实总量统计，并支持按年级、题型筛选后分页浏览，适合正式运营维护。
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['题目总数', stats.total, 'bg-[#EEF1FF] text-brand-700'],
              ['本页题目', stats.currentPageCount, 'bg-[#EAF7EC] text-[#2E7D32]'],
              ['存在引用', stats.referenced, 'bg-[#FFF4E5] text-[#EF6C00]'],
              ['平均难度', stats.avgDifficulty, 'bg-[#F4EBFF] text-[#8E24AA]'],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-[1.4rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className={`inline-flex rounded-[0.9rem] px-3 py-2 text-xs font-black ${tone}`}>
                  {label}
                </div>
                <p className="mt-4 font-math-display text-3xl font-extrabold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="math-card rounded-[2rem] px-6 py-6">
          <h3 className="font-math-display text-2xl font-extrabold text-ink">维护说明</h3>
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.5rem] bg-[#FFF6E8] px-5 py-5">
              <p className="font-semibold text-[#EF6C00]">导入与去重</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                提供 `id` 时优先更新原题；没有 `id` 时，系统会按“年级 + 题型 + 题干”自动去重。
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-[#EEF4FF] px-5 py-5">
              <p className="font-semibold text-brand-700">筛选与分页</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                支持按年级和题型组合筛选，每页显示 12 条，方便按专题和来源进行排查。
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-[#F8FAFF] px-5 py-5 ring-1 ring-slate-100">
              <p className="font-semibold text-slate-700">删除与清理</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                删除题目时会同步清理相关练习明细和错题引用，并自动修正受影响的学习统计。
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <article className="math-card rounded-[2rem] px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-math-display text-3xl font-extrabold text-ink">JSON 批量导入</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                支持直接粘贴 JSON 或上传 `.json` 文件，导入结果会即时反馈在当前页面。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setJsonText(sampleImportJson)}
              className="math-button-secondary inline-flex rounded-[1rem] px-4 py-3 text-sm font-extrabold text-slate-700"
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
            <span className="text-sm text-slate-500">文件内容会自动填入下方编辑区。</span>
          </div>

          <textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            rows={20}
            className="mt-5 w-full rounded-[1.8rem] border border-slate-200 bg-[#FCFDFF] px-4 py-4 font-mono text-sm leading-6 outline-none transition focus:border-brand-500"
            placeholder="请粘贴批量导入 JSON"
          />

          {importError ? (
            <div className="mt-4 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm text-red-600">{importError}</div>
          ) : null}

          {importResult ? (
            <div className="mt-4 rounded-[1.2rem] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              处理完成：新增 {importResult.importedQuestions} 道，更新 {importResult.updatedQuestions ?? 0} 道，
              复用 {importResult.deduplicatedQuestions ?? 0} 道，知识点 {importResult.importedKnowledgePoints} 个。
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="math-button-primary inline-flex rounded-[1rem] px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
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

        <article className="math-card rounded-[2rem] px-6 py-6">
          <h3 className="font-math-display text-3xl font-extrabold text-ink">导入规范</h3>
          <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
            <p>1. 顶层结构建议包含 `batchName`、`knowledgePoints`、`questions`。</p>
            <p>2. `questions` 必须是数组，且至少包含 1 道题目。</p>
            <p>3. 选择题需要提供 `options`，并至少有 2 个选项。</p>
            <p>4. 建议先定义知识点编码，再通过 `knowledgePointCodes` 建立关联。</p>
            <p>5. 删除题目时会自动清理相关练习与错题引用数据。</p>
          </div>

          <div className="mt-6 rounded-[1.6rem] bg-[#F8FAFF] px-4 py-4 ring-1 ring-slate-100">
            <p className="font-semibold text-ink">规范 JSON 示例</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-[1.2rem] bg-white px-4 py-4 text-xs leading-6 text-slate-700">
              {sampleImportJson}
            </pre>
          </div>
        </article>
      </section>

      {deleteResult?.cleanupSummary ? (
        <div className="mt-8 rounded-[1.2rem] bg-amber-50 px-4 py-3 text-sm text-amber-700">
          已同步清理：练习明细 {deleteResult.cleanupSummary.removedExerciseDetails} 条，错题记录{' '}
          {deleteResult.cleanupSummary.removedWrongQuestions} 条，空练习记录{' '}
          {deleteResult.cleanupSummary.removedEmptyExerciseRecords} 条。
        </div>
      ) : null}

      <section className="mt-8 rounded-[2rem] bg-white/85 p-6 shadow-card ring-1 ring-white/70">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="font-math-display text-3xl font-extrabold text-ink">当前题目列表</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                可按年级、题型查看题库，并配合分页浏览全部题目。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
              >
                {selectedIds.length === allSelectableIds.length && allSelectableIds.length > 0 ? '取消全选' : '全选本页'}
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

          <div className="grid gap-3 rounded-[1.5rem] bg-[#F8FAFF] p-4 ring-1 ring-slate-100 md:grid-cols-[1fr_1fr_auto]">
            <label className="grid gap-2 text-sm font-semibold text-slate-600">
              年级筛选
              <select
                value={gradeFilter}
                onChange={(event) => {
                  setPage(1);
                  setGradeFilter(event.target.value);
                }}
                className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-300"
              >
                {gradeOptions.map((item) => (
                  <option key={item.value || 'all'} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-600">
              题型筛选
              <select
                value={questionTypeFilter}
                onChange={(event) => {
                  setPage(1);
                  setQuestionTypeFilter(event.target.value);
                }}
                className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-300"
              >
                {questionTypeOptions.map((item) => (
                  <option key={item.value || 'all'} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="math-button-secondary inline-flex rounded-[1rem] px-5 py-3 text-sm font-extrabold text-slate-700"
              >
                重置筛选
              </button>
            </div>
          </div>
        </div>

        {deleteError ? (
          <div className="mt-4 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm text-red-600">{deleteError}</div>
        ) : null}

        {deleteResult ? (
          <div className="mt-4 rounded-[1.2rem] bg-amber-50 px-4 py-3 text-sm text-amber-800">
            已删除 {deleteResult.deletedCount} 道，拦截 {deleteResult.blockedCount} 道。
            {deleteResult.blocked.length > 0 && (
              <div className="mt-2 space-y-1">
                {deleteResult.blocked.map((item) => (
                  <p key={item.id}>
                    {item.title}：{item.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {data?.list.map((item) => {
            const selected = selectedIds.includes(item.id);

            return (
              <article
                key={item.id}
                className={`rounded-[1.8rem] border p-5 transition ${
                  selected
                    ? 'border-brand-300 bg-brand-50/70'
                    : 'border-slate-100 bg-[linear-gradient(180deg,#FFFFFF,#F8FAFF)]'
                }`}
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex gap-4">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleQuestionSelection(item.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="font-math-display text-2xl font-extrabold text-ink">{item.title}</h4>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                          {toQuestionTypeLabel(item.questionType)}
                        </span>
                        <span className="rounded-full bg-[#EAF7EC] px-3 py-1 text-xs font-black text-[#2E7D32]">
                          可删除
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                        <span className="rounded-full bg-slate-100 px-3 py-2">{item.grade} 年级</span>
                        <span className="rounded-full bg-slate-100 px-3 py-2">难度 {item.difficulty}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-2">
                          来源：{item.source ?? '未标记'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-2">
                          创建于：{formatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-[15rem] rounded-[1.4rem] bg-white/90 px-4 py-4 text-sm text-slate-500 ring-1 ring-slate-100">
                    <p>练习引用：{item.exerciseReferenceCount} 条</p>
                    <p className="mt-2">错题引用：{item.wrongbookReferenceCount} 条</p>
                    <p className="mt-2 text-xs leading-6">
                      删除题目时会同步清理这些关联数据，并修正相关学习统计。
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            当前第 {data?.page ?? 1} 页，共 {data?.totalPages ?? 1} 页，筛选后共 {data?.total ?? 0} 道题。
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!data || data.page <= 1}
              className="math-button-secondary rounded-[1rem] px-4 py-3 text-sm font-extrabold text-slate-700 disabled:opacity-50"
            >
              上一页
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(data?.totalPages ?? current, current + 1))}
              disabled={!data || data.page >= data.totalPages}
              className="math-button-secondary rounded-[1rem] px-4 py-3 text-sm font-extrabold text-slate-700 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
