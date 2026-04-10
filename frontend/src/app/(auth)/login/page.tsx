'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { EinsteinTipCard } from '@/components/brand/einstein-tip-card';
import { getRoleHomePath } from '@/lib/role-route';
import { authService } from '@/services/auth.service';
import { useUserStore } from '@/store/use-user-store';
import type { AuthNextStep, LoginPayload, RegisterPayload, UserRole } from '@/types/api';

type AuthMode = 'login' | 'register';
type OpenRegisterRole = Extract<UserRole, 'STUDENT' | 'TEACHER'>;

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
    description: '进入练习闯关、AI 讲题、错题本和学习报告。',
  },
  {
    role: 'TEACHER' as UserRole,
    label: '教师入口',
    title: '教师工作台',
    description: '查看班级概览、学生进度与学情分析。',
  },
];

const registerRoleOptions = [
  {
    role: 'STUDENT' as OpenRegisterRole,
    label: '学生注册',
    description: '创建学习账号后可直接进入学生学习中心。',
  },
  {
    role: 'TEACHER' as OpenRegisterRole,
    label: '教师注册',
    description: '提交教师信息后进入审核流程，审核通过后可登录教师端。',
  },
];

function formalizeAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('does not exist')) {
    return '未找到对应账号，请检查学号、工号、手机号、邮箱或用户名是否输入正确。';
  }
  if (normalized.includes('incorrect password')) {
    return '密码输入不正确，请重新输入后再试。';
  }
  if (normalized.includes('not activated')) {
    return '该账号尚未激活。教师账号需审核通过后方可登录。';
  }
  if (normalized.includes('teacher review is pending')) {
    return '教师账号正在审核中，请等待学校或平台管理员审核通过后再登录。';
  }
  if (normalized.includes('teacher review was rejected')) {
    return '教师账号审核未通过，请联系学校管理员或平台客服确认后重新申请。';
  }
  if (normalized.includes('selected role entry')) {
    return '当前账号与所选身份入口不匹配，请切换身份后重新登录。';
  }
  if (normalized.includes('already in use')) {
    return '该账号信息已被使用，请更换学号、工号、手机号或邮箱后重试。';
  }
  if (normalized.includes('student id already exists')) {
    return '该学号已完成注册，请直接登录或联系老师处理。';
  }
  if (normalized.includes('teacher id already exists')) {
    return '该工号已完成注册，请直接登录或联系管理员处理。';
  }
  if (normalized.includes('grade is required')) {
    return '学生注册需要填写年级信息。';
  }
  if (normalized.includes('administrator accounts')) {
    return '管理员账号仅支持由系统后台创建，前台不开放注册。';
  }
  if (normalized.includes('required')) {
    return '请将必填信息补充完整后再提交。';
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
    mode: 'onChange',
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
      schoolName: '',
      subject: '数学',
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
    if (!currentUser?.role) {
      return;
    }

    router.replace(getRoleHomePath(currentUser.role));
  }, [currentUser?.role, router]);

  const watchedContact = registerForm.watch('contact');
  const contactLabel = useMemo(() => {
    if (!watchedContact) {
      return '支持手机号或邮箱';
    }
    if (isPhone(watchedContact)) {
      return '当前将作为手机号保存';
    }
    if (isEmail(watchedContact)) {
      return '当前将作为邮箱保存';
    }
    return '请输入有效的手机号或邮箱';
  }, [watchedContact]);

  const onSubmitLogin = loginForm.handleSubmit(async (values) => {
    setLoginError('');
    setLoginSubmitting(true);

    try {
      const payload: LoginPayload = {
        account: values.account.trim(),
        password: values.password,
        role: loginRole,
      };
      const result = await authService.login(payload);
      setSession(result.accessToken, result.user, values.remember);
      router.push(getRoleHomePath(result.user.role));
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setLoginError(formalizeAuthError(message));
    } finally {
      setLoginSubmitting(false);
    }
  });

  const onSubmitRegister = registerForm.handleSubmit(async (values) => {
    setRegisterError('');
    setRegisterNextStep(null);
    setRegisterSubmitting(true);

    try {
      const contact = values.contact.trim();
      const identityCode = registerRole === 'STUDENT' ? values.studentCode.trim() : values.teacherCode.trim();

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
        className: registerRole === 'STUDENT' ? values.className.trim() : undefined,
        schoolName: registerRole === 'TEACHER' ? values.schoolName.trim() : undefined,
        subject: registerRole === 'TEACHER' ? values.subject.trim() : undefined,
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
      registerForm.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setRegisterError(formalizeAuthError(message));
    } finally {
      setRegisterSubmitting(false);
    }
  });

  return (
    <main className="storybook-scene relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-white/70 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-16 h-80 w-80 rounded-full bg-[#FFF4C2]/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-56 w-56 rounded-full bg-[#8BC34A]/20 blur-3xl" />

      <div className="mx-auto max-w-6xl pt-4 lg:pt-8">
        <section className="portal-board relative overflow-hidden p-4 sm:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
            <section className="rounded-[2rem] border-2 border-[#F0C95C] bg-[linear-gradient(180deg,rgba(255,255,247,0.97),rgba(255,255,255,0.92))] p-5 shadow-[0_18px_36px_rgba(255,193,7,0.12)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="math-chip-warning">正式账号入口</p>
                  <h1 className="mt-3 font-math-display text-3xl font-extrabold text-ink sm:text-4xl">
                    爱因数学星球账号中心
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                    登录后将根据身份进入学生学习中心或教师工作台。
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
                  <div className={`grid gap-3 ${showAdminEntry ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
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
                        <p className="text-sm font-black text-slate-500">平台管理入口</p>
                        <p className="mt-2 font-math-display text-xl font-extrabold text-ink">系统管理中心</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">用于平台用户、角色权限、题库与系统配置管理。</p>
                      </button>
                    ) : null}
                  </div>

                  <form className="space-y-5" onSubmit={onSubmitLogin}>
                    <div>
                      <label className="mb-2 block text-sm font-extrabold text-slate-700">账号</label>
                      <input
                        {...loginForm.register('account', {
                          required: '请输入账号',
                          validate: (value) => value.trim().length >= 4 || '请输入学号、工号、手机号、邮箱或用户名',
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
                          当前身份入口：
                          {loginRole === 'ADMIN'
                            ? '系统管理中心'
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
                        如需找回密码，可通过帮助中心提交账号核验申请，或联系学校老师 / 平台管理员协助重置。
                      </div>
                    ) : null}

                    {loginError ? (
                      <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                        {loginError}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={loginSubmitting}
                      className="math-button-primary w-full rounded-[1.2rem] px-5 py-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loginSubmitting ? '正在验证账号信息...' : '登录进入平台'}
                    </button>

                    <p className="text-xs leading-6 text-slate-500">
                      登录即表示你已阅读并同意
                      <Link href="/agreement" className="mx-1 font-extrabold text-[#3F51B5]">
                        《用户协议》
                      </Link>
                      和
                      <Link href="/privacy" className="mx-1 font-extrabold text-[#3F51B5]">
                        《隐私政策》
                      </Link>
                      。
                    </p>
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
                    </div>

                    {registerRole === 'STUDENT' ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-extrabold text-slate-700">年级</label>
                          <select {...registerForm.register('grade', { required: '请选择年级' })} className="math-input">
                            <option value="">请选择年级</option>
                            {[1, 2, 3, 4, 5, 6].map((grade) => (
                              <option key={grade} value={grade}>
                                {grade} 年级
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-extrabold text-slate-700">班级</label>
                          <input
                            {...registerForm.register('className', { required: '请输入班级' })}
                            className="math-input"
                            placeholder="如：六年级二班"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-extrabold text-slate-700">学校</label>
                          <input
                            {...registerForm.register('schoolName', { required: '请输入学校名称' })}
                            className="math-input"
                            placeholder="请输入学校名称"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-extrabold text-slate-700">学科</label>
                          <input
                            {...registerForm.register('subject', { required: '请输入学科' })}
                            className="math-input"
                            placeholder="如：数学"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="mb-2 block text-sm font-extrabold text-slate-700">手机号或邮箱</label>
                      <input
                        {...registerForm.register('contact', {
                          required: '请输入手机号或邮箱',
                          validate: (value) => isPhone(value) || isEmail(value) || '请输入有效的手机号或邮箱',
                        })}
                        className="math-input"
                        placeholder="用于通知、找回密码与账号验证"
                      />
                      <p className="mt-2 text-xs font-semibold text-slate-500">{contactLabel}</p>
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
                          {...registerForm.register('confirmPassword', {
                            required: '请再次输入密码',
                            validate: (value) => value === registerForm.getValues('password') || '两次输入的密码不一致',
                          })}
                          type="password"
                          className="math-input"
                          placeholder="请再次输入密码"
                        />
                      </div>
                    </div>

                    <label className="flex items-start gap-3 rounded-[1.2rem] bg-[#F8FAFF] px-4 py-4 text-sm leading-7 text-slate-600">
                      <input
                        type="checkbox"
                        {...registerForm.register('agreement', { required: '请先阅读并同意相关协议' })}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-[#3F51B5] focus:ring-[#3F51B5]"
                      />
                      <span>
                        我已阅读并同意
                        <Link href="/agreement" className="mx-1 font-extrabold text-[#3F51B5]">
                          《用户协议》
                        </Link>
                        与
                        <Link href="/privacy" className="mx-1 font-extrabold text-[#3F51B5]">
                          《隐私政策》
                        </Link>
                        ，并确认提交的信息真实有效。
                      </span>
                    </label>

                    {registerError ? (
                      <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                        {registerError}
                      </div>
                    ) : null}

                    {registerNextStep ? (
                      <div className="rounded-[1.4rem] border border-[#C9E7D0] bg-[linear-gradient(180deg,#F6FFF6,#FFFFFF)] px-4 py-4">
                        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#4CAF50]">下一步</p>
                        <p className="mt-2 font-math-display text-2xl font-extrabold text-ink">{registerNextStep.title}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{registerNextStep.description}</p>
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={registerSubmitting}
                      className="math-button-primary w-full rounded-[1.2rem] px-5 py-4 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {registerSubmitting ? '正在创建账号...' : '提交注册信息'}
                    </button>
                  </form>
                </div>
              )}
            </section>

            <aside className="rounded-[2rem] border-2 border-[#F0C95C] bg-[linear-gradient(180deg,rgba(255,251,240,0.96),rgba(255,255,255,0.92))] p-5 shadow-[0_18px_36px_rgba(255,193,7,0.12)] sm:p-6">
              <EinsteinTipCard
                title="爱因导师提醒"
                message="先完成账号登录或注册，再进入今天的学习任务。老师账号提交后会进入审核流程。"
                mood="focus"
                tone="green"
              />

              <div className="mt-5 rounded-[1.5rem] border border-[#E8E2C8] bg-white/90 px-4 py-4">
                <p className="text-base font-extrabold text-ink">简要说明</p>
                <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                  <p>学生账号用于练习闯关、AI 讲题、错题复习与学习报告查看。</p>
                  <p>教师账号用于班级概览、学生进度与基础学情管理。</p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[#D9E2EA] bg-white/90 px-4 py-4">
                <p className="text-sm font-semibold text-ink">帮助与支持</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  如需账号协助、学校接入或平台治理操作，请通过支持入口处理。
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <a href="mailto:support@einmath.cn" className="math-button-secondary rounded-full px-4 py-2 text-sm">
                    联系客服
                  </a>
                  <a href="mailto:help@einmath.cn" className="math-button-secondary rounded-full px-4 py-2 text-sm">
                    帮助中心
                  </a>
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setLoginRole('ADMIN');
                      setShowAdminEntry((current) => !current);
                      setLoginError('');
                    }}
                    className="font-semibold text-slate-500 underline-offset-4 hover:text-[#455A64] hover:underline"
                  >
                    {showAdminEntry ? '收起平台管理入口' : '平台管理入口'}
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
