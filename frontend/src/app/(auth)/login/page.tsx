'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { EinsteinTipCard } from '@/components/brand/einstein-tip-card';
import {
  GRADE_OPTIONS,
  SCHOOL_OPTIONS,
  SUBJECT_OPTIONS,
  getClassOptionsByGrade,
} from '@/lib/school-options';
import { getRoleHomePath } from '@/lib/role-route';
import { authService } from '@/services/auth.service';
import { useUserStore } from '@/store/use-user-store';
import type { AuthNextStep, LoginPayload, RegisterPayload, UserRole } from '@/types/api';

type AuthMode = 'login' | 'register';
type OpenRegisterRole = Extract<UserRole, 'STUDENT' | 'TEACHER' | 'PARENT'>;

interface LoginFormValues {
  account: string;
  password: string;
  remember: boolean;
}

interface RegisterFormValues {
  fullName: string;
  studentCode: string;
  teacherCode: string;
  grade: string;
  className: string;
  schoolName: string;
  subject: string;
  relationLabel: string;
  contact: string;
  password: string;
  confirmPassword: string;
  agreement: boolean;
}

const loginRoleOptions = [
  {
    role: 'STUDENT' as UserRole,
    label: '学生入口',
    title: '学生学习中心',
    description: '进入练习闯关、AI 讲题、错题复习和学习报告。',
  },
  {
    role: 'TEACHER' as UserRole,
    label: '教师入口',
    title: '教师工作台',
    description: '查看班级概览、学生进度与学情分析。',
  },
  {
    role: 'PARENT' as UserRole,
    label: '家长入口',
    title: '家长端',
    description: '绑定自己的孩子后，查看近期做题、错题和学习建议。',
  },
];

const registerRoleOptions = [
  {
    role: 'STUDENT' as OpenRegisterRole,
    label: '学生注册',
    description: '完成注册后可直接进入学生学习中心。',
  },
  {
    role: 'TEACHER' as OpenRegisterRole,
    label: '教师注册',
    description: '注册后需先通过基础审核，再申请班级管理权限。',
  },
  {
    role: 'PARENT' as OpenRegisterRole,
    label: '家长注册',
    description: '注册后登录家长端，再通过学生学号和学生密码绑定自己的孩子。',
  },
];

function formalizeAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('does not exist')) {
    return '未找到对应账号，请检查学号、工号、手机号、邮箱或用户名。';
  }
  if (normalized.includes('incorrect password')) {
    return '密码输入不正确，请重新尝试。';
  }
  if (normalized.includes('not activated')) {
    return '该账号尚未激活，请等待审核或联系管理员。';
  }
  if (normalized.includes('teacher review is pending')) {
    return '教师账号正在审核中，请等待学校或平台管理员处理。';
  }
  if (normalized.includes('teacher review was rejected')) {
    return '教师账号审核未通过，请联系管理员确认后重新提交。';
  }
  if (normalized.includes('selected role entry')) {
    return '当前账号与所选入口不匹配，请切换身份后重新登录。';
  }
  if (normalized.includes('already in use')) {
    return '该账号信息已被使用，请更换后重试。';
  }
  if (normalized.includes('student id already exists')) {
    return '该学号已完成注册，请直接登录。';
  }
  if (normalized.includes('teacher id already exists')) {
    return '该工号已完成注册，请直接登录。';
  }
  if (normalized.includes('administrator accounts')) {
    return '管理员账号仅支持后台创建。';
  }
  if (normalized.includes('required')) {
    return '请先将必填信息填写完整。';
  }

  return message || '提交失败，请稍后重试。';
}

const isPhone = (value: string) => /^1\d{10}$/.test(value.trim());
const isEmail = (value: string) => /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value.trim());

export default function LoginPage() {
  const router = useRouter();
  const setSession = useUserStore((state) => state.setSession);
  const currentUser = useUserStore((state) => state.currentUser);
  const hydrateSession = useUserStore((state) => state.hydrateSession);

  const [mode, setMode] = useState<AuthMode>('login');
  const [loginRole, setLoginRole] = useState<UserRole>('STUDENT');
  const [registerRole, setRegisterRole] = useState<OpenRegisterRole>('STUDENT');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerNextStep, setRegisterNextStep] = useState<AuthNextStep | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [showRecoveryHint, setShowRecoveryHint] = useState(false);
  const [showAdminEntry, setShowAdminEntry] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: {
      account: '',
      password: '',
      remember: true,
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      studentCode: '',
      teacherCode: '',
      grade: '',
      className: '',
      schoolName: SCHOOL_OPTIONS[0],
      subject: SUBJECT_OPTIONS[0],
      relationLabel: '妈妈',
      contact: '',
      password: '',
      confirmPassword: '',
      agreement: false,
    },
  });

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (currentUser?.role) {
      router.replace(getRoleHomePath(currentUser.role));
    }
  }, [currentUser?.role, router]);

  const watchedGrade = registerForm.watch('grade');
  const classOptions = useMemo(
    () => getClassOptionsByGrade(watchedGrade ? Number(watchedGrade) : null),
    [watchedGrade],
  );

  useEffect(() => {
    if (registerRole !== 'STUDENT') {
      return;
    }

    const currentValue = registerForm.getValues('className');
    const availableValues = classOptions.map((item) => item.value as string);

    if (!currentValue || !availableValues.includes(currentValue)) {
      registerForm.setValue('className', classOptions[0]?.value ?? '', {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [classOptions, registerForm, registerRole]);

  const onSubmitLogin = async () => {
    setLoginError('');

    const account = loginForm.getValues('account').trim();
    const password = loginForm.getValues('password');

    if (!account) {
      loginForm.setError('account', { message: '请输入账号' });
      return;
    }
    if (account.length < 4) {
      loginForm.setError('account', { message: '请输入学号、工号、手机号、邮箱或用户名' });
      return;
    }
    if (!password) {
      loginForm.setError('password', { message: '请输入密码' });
      return;
    }
    if (password.length < 6) {
      loginForm.setError('password', { message: '密码至少需要 6 位' });
      return;
    }

    setLoginSubmitting(true);

    try {
      const payload: LoginPayload = {
        account,
        password,
        role: loginRole,
      };
      const result = await authService.login(payload);
      setSession(result.accessToken, result.user, loginForm.getValues('remember'));
      router.push(getRoleHomePath(result.user.role));
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setLoginError(formalizeAuthError(message));
    } finally {
      setLoginSubmitting(false);
    }
  };

  const onSubmitRegister = registerForm.handleSubmit(async (values) => {
    setRegisterError('');
    setRegisterNextStep(null);
    setRegisterSubmitting(true);

    if (values.password !== values.confirmPassword) {
      setRegisterError('两次输入的密码不一致，请重新确认。');
      setRegisterSubmitting(false);
      return;
    }

    try {
      const contact = values.contact.trim();
      const identityCode =
        registerRole === 'STUDENT'
          ? values.studentCode.trim()
          : registerRole === 'TEACHER'
            ? values.teacherCode.trim()
            : values.contact.trim();

      const payload: RegisterPayload = {
        username: identityCode,
        displayName: values.fullName.trim(),
        studentCode: registerRole === 'STUDENT' ? identityCode : undefined,
        teacherCode: registerRole === 'TEACHER' ? identityCode : undefined,
        password: values.password,
        role: registerRole,
        email: isEmail(contact) ? contact : undefined,
        phone: isPhone(contact) ? contact : undefined,
        grade: registerRole === 'STUDENT' ? Number(values.grade) : undefined,
        className: registerRole === 'STUDENT' ? values.className : undefined,
        schoolName:
          registerRole === 'TEACHER'
            ? values.schoolName
            : registerRole === 'PARENT'
              ? values.schoolName
              : undefined,
        subject: registerRole === 'TEACHER' ? values.subject : undefined,
        relationLabel: registerRole === 'PARENT' ? values.relationLabel : undefined,
      };

      const result = await authService.register(payload);
      setRegisterNextStep(result.nextStep);

      if (result.accessToken) {
        setSession(result.accessToken, result.user, true);
        router.push(getRoleHomePath(result.user.role));
        return;
      }

      setMode('login');
      setLoginRole('TEACHER');
      loginForm.reset({
        account: identityCode,
        password: '',
        remember: true,
      });
      registerForm.reset({
        fullName: '',
        studentCode: '',
        teacherCode: '',
        grade: '',
        className: '',
        schoolName: SCHOOL_OPTIONS[0],
        subject: SUBJECT_OPTIONS[0],
        relationLabel: '妈妈',
        contact: '',
        password: '',
        confirmPassword: '',
        agreement: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setRegisterError(formalizeAuthError(message));
    } finally {
      setRegisterSubmitting(false);
    }
  });

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-white/70 blur-3xl hidden sm:block" />
      <div className="pointer-events-none absolute right-0 top-16 h-80 w-80 rounded-full bg-[#FFF4C2]/60 blur-3xl hidden sm:block" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-56 w-56 rounded-full bg-[#8BC34A]/20 blur-3xl hidden sm:block" />

      <div className="mx-auto max-w-6xl pt-4 lg:pt-8">
        {/* Mobile layout */}
        <div className="sm:hidden">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-extrabold text-ink">爱因数学星球</h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'login' ? '登录你的账号' : '注册新账号'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="mb-5 flex rounded-xl border border-slate-200 bg-white p-1">
            {(['login', 'register'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setLoginError('');
                  setRegisterError('');
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
                  mode === item
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {item === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          {mode === 'login' ? (
            <div className="space-y-4">
              {/* Role selection - compact */}
              <div className="flex gap-2">
                {loginRoleOptions.map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => {
                      setLoginRole(item.role);
                      setLoginError('');
                    }}
                    className={`flex-1 rounded-xl border px-3 py-3 text-center transition ${
                      loginRole === item.role
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    <p className="text-sm font-bold">{item.label}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <input
                    value={loginForm.watch('account')}
                    onChange={(e) => {
                      loginForm.setValue('account', e.target.value);
                      loginForm.clearErrors('account');
                      setLoginError('');
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-brand-400"
                    placeholder="学号 / 工号 / 手机号 / 邮箱"
                    autoComplete="username"
                  />
                  {loginForm.formState.errors.account ? (
                    <p className="mt-1.5 text-xs text-red-500">{loginForm.formState.errors.account.message}</p>
                  ) : null}
                </div>

                <div>
                  <input
                    value={loginForm.watch('password')}
                    onChange={(e) => {
                      loginForm.setValue('password', e.target.value);
                      loginForm.clearErrors('password');
                      setLoginError('');
                    }}
                    type="password"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-brand-400"
                    placeholder="登录密码"
                    autoComplete="current-password"
                  />
                  {loginForm.formState.errors.password ? (
                    <p className="mt-1.5 text-xs text-red-500">{loginForm.formState.errors.password.message}</p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-500">
                    <input
                      type="checkbox"
                      checked={loginForm.watch('remember')}
                      onChange={(e) => loginForm.setValue('remember', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-700"
                    />
                    记住登录
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryHint((value) => !value)}
                    className="text-sm font-bold text-brand-700"
                  >
                    忘记密码
                  </button>
                </div>

                {showRecoveryHint ? (
                  <p className="rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-slate-600">
                    如需找回密码，请联系学校老师或平台管理员协助重置。
                  </p>
                ) : null}

                {loginError ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-600">{loginError}</p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void onSubmitLogin()}
                  disabled={loginSubmitting}
                  className="w-full rounded-xl bg-brand-700 py-3.5 text-sm font-bold text-white disabled:opacity-70"
                >
                  {loginSubmitting ? '验证中...' : '登录'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAdminEntry((value) => !value)}
                className="mt-4 w-full text-center text-xs text-slate-400"
              >
                {showAdminEntry ? '收起管理入口' : '管理入口'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Register role selection */}
              <div className="flex gap-2">
                {registerRoleOptions.map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => {
                      setRegisterRole(item.role);
                      setRegisterError('');
                      setRegisterNextStep(null);
                    }}
                    className={`flex-1 rounded-xl border px-3 py-3 text-center transition ${
                      registerRole === item.role
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    <p className="text-sm font-bold">{item.label}</p>
                  </button>
                ))}
              </div>

              <form className="space-y-4" onSubmit={onSubmitRegister}>
                <input
                  {...registerForm.register('fullName', {
                    required: '请输入姓名',
                    minLength: { value: 2, message: '姓名至少需要 2 个字符' },
                  })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-brand-400"
                  placeholder="真实姓名"
                />

                {registerRole !== 'PARENT' ? (
                  <input
                    {...registerForm.register(registerRole === 'STUDENT' ? 'studentCode' : 'teacherCode', {
                      required: registerRole === 'STUDENT' ? '请输入学号' : '请输入工号',
                      minLength: { value: 4, message: '编号至少需要 4 位' },
                    })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-brand-400"
                    placeholder={registerRole === 'STUDENT' ? '学号' : '工号'}
                  />
                ) : null}

                {registerRole === 'STUDENT' ? (
                  <div className="flex gap-3">
                    <select {...registerForm.register('grade', { required: '请选择年级' })} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none">
                      <option value="">年级</option>
                      {GRADE_OPTIONS.map((grade) => (
                        <option key={grade} value={grade}>{grade} 年级</option>
                      ))}
                    </select>
                    <select {...registerForm.register('className', { required: '请选择班级' })} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none">
                      {classOptions.map((classItem) => (
                        <option key={classItem.value} value={classItem.value}>{classItem.label}</option>
                      ))}
                    </select>
                  </div>
                ) : registerRole === 'TEACHER' ? (
                  <div className="flex gap-3">
                    <select {...registerForm.register('schoolName', { required: '请选择学校' })} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none">
                      {SCHOOL_OPTIONS.map((schoolName) => (
                        <option key={schoolName} value={schoolName}>{schoolName}</option>
                      ))}
                    </select>
                    <select {...registerForm.register('subject', { required: '请选择学科' })} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none">
                      {SUBJECT_OPTIONS.map((subject) => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <select {...registerForm.register('relationLabel', { required: '请选择关系' })} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none">
                      {['妈妈', '爸爸', '监护人', '家人'].map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    <select {...registerForm.register('schoolName', { required: '请选择学校' })} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none">
                      {SCHOOL_OPTIONS.map((schoolName) => (
                        <option key={schoolName} value={schoolName}>{schoolName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <input
                  {...registerForm.register('contact', {
                    required: '请输入手机号或邮箱',
                    validate: (value) =>
                      isPhone(value) || isEmail(value) || '请输入有效的手机号或邮箱',
                  })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-brand-400"
                  placeholder="手机号或邮箱"
                />

                <input
                  {...registerForm.register('password', {
                    required: '请输入密码',
                    minLength: { value: 6, message: '密码至少需要 6 位' },
                  })}
                  type="password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-brand-400"
                  placeholder="设置密码（至少6位）"
                />

                <input
                  {...registerForm.register('confirmPassword', { required: '请再次输入密码' })}
                  type="password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-brand-400"
                  placeholder="确认密码"
                />

                <label className="flex items-start gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    {...registerForm.register('agreement', { required: '请先同意用户协议' })}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700"
                  />
                  <span>
                    我已阅读并同意
                    <Link href="/agreement" className="font-bold text-brand-700">《用户协议》</Link>
                    与
                    <Link href="/privacy" className="font-bold text-brand-700">《隐私政策》</Link>
                  </span>
                </label>

                {registerError ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-600">{registerError}</p>
                ) : null}

                {registerNextStep ? (
                  <div className="rounded-lg bg-brand-50 px-3 py-3">
                    <p className="text-sm font-bold text-brand-700">{registerNextStep.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{registerNextStep.description}</p>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={registerSubmitting}
                  className="w-full rounded-xl bg-brand-700 py-3.5 text-sm font-bold text-white disabled:opacity-70"
                >
                  {registerSubmitting ? '提交中...' : '注册'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Desktop layout */}
        <section className="hidden sm:block">
          <div className="portal-board relative overflow-hidden p-4 sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-[2rem] border-2 border-[#F0C95C] bg-[linear-gradient(180deg,rgba(255,255,247,0.97),rgba(255,255,255,0.92))] p-5 shadow-[0_18px_36px_rgba(255,193,7,0.12)] sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="math-chip-warning">正式账号入口</p>
                    <h1 className="mt-3 font-math-display text-3xl font-extrabold text-ink sm:text-4xl">
                      爱因数学星球账号中心
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                      登录后系统会根据身份进入学生学习中心或教师工作台。
                    </p>
                  </div>

                  <div className="flex rounded-full border-2 border-[#F0C95C] bg-white/80 p-1 shadow-sm">
                    {(['login', 'register'] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setMode(item);
                          setLoginError('');
                          setRegisterError('');
                        }}
                        className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                          mode === item
                            ? 'bg-[#3F51B5] text-white shadow-[0_12px_22px_rgba(63,81,181,0.28)]'
                            : 'text-slate-600 hover:bg-[#FFF8D9]'
                        }`}
                      >
                        {item === 'login' ? '登录' : '注册'}
                      </button>
                    ))}
                  </div>
                </div>

                {mode === 'login' ? (
                  <div className="mt-6 space-y-5">
                    <div className={`grid gap-3 ${showAdminEntry ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
                      {loginRoleOptions.map((item) => (
                        <button
                          key={item.role}
                          type="button"
                          onClick={() => {
                            setLoginRole(item.role);
                            setLoginError('');
                          }}
                          className={`rounded-[1.4rem] border-2 px-4 py-4 text-left transition ${
                            loginRole === item.role
                              ? 'border-[#4CAF50] bg-[linear-gradient(180deg,#F7FFF0,#FFFFFF)] shadow-[0_14px_28px_rgba(76,175,80,0.16)]'
                              : 'border-[#F3E4A6] bg-white/90 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(255,193,7,0.12)]'
                          }`}
                        >
                          <p className="text-sm font-black text-slate-500">{item.label}</p>
                          <p className="mt-2 font-math-display text-xl font-extrabold text-ink">{item.title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                        </button>
                      ))}

                      {showAdminEntry ? (
                        <button
                          type="button"
                          onClick={() => {
                            setLoginRole('ADMIN');
                            setLoginError('');
                          }}
                          className={`rounded-[1.4rem] border-2 px-4 py-4 text-left transition ${
                            loginRole === 'ADMIN'
                              ? 'border-[#607D8B] bg-[linear-gradient(180deg,#F5F8FB,#FFFFFF)] shadow-[0_14px_28px_rgba(96,125,139,0.16)]'
                              : 'border-[#D9E2EA] bg-white/90 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(96,125,139,0.12)]'
                          }`}
                        >
                          <p className="text-sm font-black text-slate-500">管理入口</p>
                          <p className="mt-2 font-math-display text-xl font-extrabold text-ink">系统管理中心</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            用于平台账号、题库与审核权限管理。
                          </p>
                        </button>
                      ) : null}
                    </div>

                    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void onSubmitLogin(); }}>
                      <div>
                        <label className="mb-2 block text-sm font-extrabold text-slate-700">账号</label>
                        <input
                          {...loginForm.register('account', {
                            required: '请输入账号',
                            validate: (value) =>
                              value.trim().length >= 4 || '请输入学号、工号、手机号、邮箱或用户名',
                          })}
                          className="math-input"
                          placeholder="请输入学号 / 工号 / 手机号 / 邮箱 / 用户名"
                        />
                        {loginForm.formState.errors.account ? (
                          <p className="mt-2 text-sm font-semibold text-red-500">
                            {loginForm.formState.errors.account.message}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            当前入口：
                            {loginRole === 'ADMIN'
                              ? '系统管理中心'
                              : loginRole === 'PARENT'
                                ? '家长端'
                                : loginRoleOptions.find((item) => item.role === loginRole)?.title}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-extrabold text-slate-700">密码</label>
                        <input
                          {...loginForm.register('password', {
                            required: '请输入密码',
                            minLength: { value: 6, message: '密码至少需要 6 位' },
                          })}
                          type="password"
                          className="math-input"
                          placeholder="请输入登录密码"
                        />
                        {loginForm.formState.errors.password ? (
                          <p className="mt-2 text-sm font-semibold text-red-500">
                            {loginForm.formState.errors.password.message}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] bg-[#F8FAFF] px-4 py-3">
                        <label className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                          <input
                            type="checkbox"
                            {...loginForm.register('remember')}
                            className="h-4 w-4 rounded border-slate-300 text-[#3F51B5] focus:ring-[#3F51B5]"
                          />
                          记住登录状态
                        </label>

                        <button
                          type="button"
                          onClick={() => setShowRecoveryHint((value) => !value)}
                          className="text-sm font-extrabold text-[#3F51B5] underline-offset-4 hover:underline"
                        >
                          忘记密码
                        </button>
                      </div>

                      {showRecoveryHint ? (
                        <div className="rounded-[1.3rem] border border-[#D8E6FF] bg-[#F6FAFF] px-4 py-4 text-sm leading-7 text-slate-600">
                          如需找回密码，可通过帮助中心提交账号核验申请，或联系学校老师、平台管理员协助重置。
                        </div>
                      ) : null}

                      {loginError ? (
                        <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                          {loginError}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => void onSubmitLogin()}
                        disabled={loginSubmitting}
                        className="math-button-primary w-full rounded-[1.2rem] px-5 py-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {loginSubmitting ? '正在验证账号信息...' : '登录进入平台'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="mt-6 space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {registerRoleOptions.map((item) => (
                        <button
                          key={item.role}
                          type="button"
                          onClick={() => {
                            setRegisterRole(item.role);
                            setRegisterError('');
                            setRegisterNextStep(null);
                          }}
                          className={`rounded-[1.4rem] border-2 px-4 py-4 text-left transition ${
                            registerRole === item.role
                              ? 'border-[#4CAF50] bg-[linear-gradient(180deg,#F7FFF0,#FFFFFF)] shadow-[0_14px_28px_rgba(76,175,80,0.16)]'
                              : 'border-[#F3E4A6] bg-white/90 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(255,193,7,0.12)]'
                          }`}
                        >
                          <p className="text-sm font-black text-slate-500">{item.label}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                        </button>
                      ))}
                    </div>

                    <form className="space-y-5" onSubmit={onSubmitRegister}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-extrabold text-slate-700">姓名</label>
                          <input
                            {...registerForm.register('fullName', {
                              required: '请输入姓名',
                              minLength: { value: 2, message: '姓名至少需要 2 个字符' },
                            })}
                            className="math-input"
                            placeholder="请输入真实姓名"
                          />
                        </div>

                        {registerRole !== 'PARENT' ? (
                          <div>
                            <label className="mb-2 block text-sm font-extrabold text-slate-700">
                              {registerRole === 'STUDENT' ? '学号' : '工号'}
                            </label>
                            <input
                              {...registerForm.register(registerRole === 'STUDENT' ? 'studentCode' : 'teacherCode', {
                                required: registerRole === 'STUDENT' ? '请输入学号' : '请输入工号',
                                minLength: { value: 4, message: '编号至少需要 4 位' },
                              })}
                              className="math-input"
                              placeholder={registerRole === 'STUDENT' ? '请输入学号' : '请输入工号'}
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="mb-2 block text-sm font-extrabold text-slate-700">学校</label>
                            <select
                              {...registerForm.register('schoolName', { required: '请选择学校' })}
                              className="math-input"
                            >
                              {SCHOOL_OPTIONS.map((schoolName) => (
                                <option key={schoolName} value={schoolName}>{schoolName}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {registerRole === 'STUDENT' ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-extrabold text-slate-700">年级</label>
                            <select {...registerForm.register('grade', { required: '请选择年级' })} className="math-input">
                              <option value="">请选择年级</option>
                              {GRADE_OPTIONS.map((grade) => (
                                <option key={grade} value={grade}>{grade} 年级</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-extrabold text-slate-700">班级</label>
                            <select {...registerForm.register('className', { required: '请选择班级' })} className="math-input">
                              {classOptions.map((classItem) => (
                                <option key={classItem.value} value={classItem.value}>{classItem.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : registerRole === 'TEACHER' ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-extrabold text-slate-700">学校</label>
                            <select {...registerForm.register('schoolName', { required: '请选择学校' })} className="math-input">
                              {SCHOOL_OPTIONS.map((schoolName) => (
                                <option key={schoolName} value={schoolName}>{schoolName}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-extrabold text-slate-700">学科</label>
                            <select {...registerForm.register('subject', { required: '请选择学科' })} className="math-input">
                              {SUBJECT_OPTIONS.map((subject) => (
                                <option key={subject} value={subject}>{subject}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-extrabold text-slate-700">关系</label>
                            <select {...registerForm.register('relationLabel', { required: '请选择关系' })} className="math-input">
                              {['妈妈', '爸爸', '监护人', '家人'].map((item) => (
                                <option key={item} value={item}>{item}</option>
                              ))}
                            </select>
                          </div>
                          <div className="rounded-[1.2rem] bg-[#F8FBFF] px-4 py-4 text-sm leading-7 text-slate-600">
                            家长注册成功后，需在家长端输入学生学号和学生密码完成孩子绑定。
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="mb-2 block text-sm font-extrabold text-slate-700">手机号或邮箱</label>
                        <input
                          {...registerForm.register('contact', {
                            required: '请输入手机号或邮箱',
                            validate: (value) =>
                              isPhone(value) || isEmail(value) || '请输入有效的手机号或邮箱',
                          })}
                          className="math-input"
                          placeholder="用于通知、找回密码与账号验证"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-extrabold text-slate-700">密码</label>
                          <input
                            {...registerForm.register('password', {
                              required: '请输入密码',
                              minLength: { value: 6, message: '密码至少需要 6 位' },
                            })}
                            type="password"
                            className="math-input"
                            placeholder="请设置登录密码"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-extrabold text-slate-700">确认密码</label>
                          <input
                            {...registerForm.register('confirmPassword', { required: '请再次输入密码' })}
                            type="password"
                            className="math-input"
                            placeholder="请再次输入密码"
                          />
                        </div>
                      </div>

                      <label className="flex items-start gap-3 rounded-[1.2rem] bg-[#F8FAFF] px-4 py-3 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          {...registerForm.register('agreement', { required: '请先同意用户协议' })}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#3F51B5] focus:ring-[#3F51B5]"
                        />
                        <span>
                          我已阅读并同意
                          <Link href="/agreement" className="mx-1 font-extrabold text-[#3F51B5]">《用户协议》</Link>
                          与
                          <Link href="/privacy" className="mx-1 font-extrabold text-[#3F51B5]">《隐私政策》</Link>
                        </span>
                      </label>

                      {registerError ? (
                        <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                          {registerError}
                        </div>
                      ) : null}

                      {registerNextStep ? (
                        <div className="rounded-[1.2rem] border border-[#D8E6FF] bg-[#F8FBFF] px-4 py-4">
                          <p className="text-sm font-black text-brand-700">{registerNextStep.title}</p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">{registerNextStep.description}</p>
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={registerSubmitting}
                        className="math-button-primary w-full rounded-[1.2rem] px-5 py-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {registerSubmitting ? '正在提交注册信息...' : '提交注册信息'}
                      </button>
                    </form>
                  </div>
                )}
              </section>

              <aside className="space-y-4 rounded-[2rem] border-2 border-[#F0C95C] bg-[linear-gradient(180deg,rgba(255,255,251,0.94),rgba(255,255,255,0.9))] p-5 shadow-[0_18px_36px_rgba(255,193,7,0.12)] sm:p-6">
                <EinsteinTipCard
                  tone="green"
                  message="学生注册后可直接开始练习；教师注册完成后，还需申请班级管理权限，审核通过后才能查看对应班级学生信息。"
                />

                <div className="rounded-[1.5rem] border border-[#E6F0FF] bg-white px-5 py-5">
                  <p className="text-sm font-black text-slate-500">登录后可做什么</p>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                    <div>
                      <p className="font-extrabold text-ink">学生学习中心</p>
                      <p>完成练习闯关、AI 讲题、错题复习与学习报告查看。</p>
                    </div>
                    <div>
                      <p className="font-extrabold text-ink">教师工作台</p>
                      <p>查看授权班级的学生表现、薄弱点与 AI 学情分析。</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-[#E6F0FF] bg-white px-5 py-5 text-sm leading-7 text-slate-600">
                  <p className="font-extrabold text-ink">帮助与支持</p>
                  <p className="mt-2">如需找回密码、处理审核或开通管理员入口，请联系学校管理员或平台支持。</p>
                  <button
                    type="button"
                    onClick={() => setShowAdminEntry((value) => !value)}
                    className="mt-3 text-sm font-extrabold text-[#3F51B5] underline-offset-4 hover:underline"
                  >
                    {showAdminEntry ? '收起管理入口' : '显示管理入口'}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
