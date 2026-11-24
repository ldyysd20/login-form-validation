'use client';

import { useState, useMemo } from 'react';
import {
  validateAll,
  validateUsername,
  validatePassword,
  validateConfirmPassword,
  validatePhone,
  validateCaptcha,
  hasNoErrors,
  type LoginFormErrors,
  type LoginFormData,
} from '../lib/validators';

/**
 * 登录表单组件
 * 作用：5 个字段 + 实时校验 + 失焦校验 + 提交总校验
 */
export default function LoginForm() {
  const [form, setForm] = useState<LoginFormData>({
    username: '',
    password: '',
    confirmPassword: '',
    phone: '',
    captcha: '',
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [success, setSuccess] = useState(false);

  // 模拟一个固定验证码（实际应由后端生成 + 图片）
  const expectedCaptcha = 'A8B3';

  const errors: LoginFormErrors = useMemo(() => {
    if (submitted) return validateAll(form, expectedCaptcha);
    return {
      username: validateUsername(form.username),
      password: validatePassword(form.password),
      confirmPassword: validateConfirmPassword(form.password, form.confirmPassword),
      phone: validatePhone(form.phone ?? ''),
      captcha: validateCaptcha(form.captcha, expectedCaptcha),
    };
  }, [form, submitted]);

  const getFieldError = (key: keyof LoginFormErrors): string => {
    if (submitted) return errors[key] ?? '';
    return touched[key as string] ? errors[key] ?? '' : '';
  };

  const handleChange = (key: keyof LoginFormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSuccess(false);
  };

  const handleBlur = (key: string) => {
    setTouched(prev => ({ ...prev, [key]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTouched({
      username: true, password: true, confirmPassword: true,
      phone: true, captcha: true,
    });
    if (hasNoErrors(errors)) {
      setSuccess(true);
    } else {
      setSuccess(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">
          老年综合评估系统
        </h1>
        <p className="text-center text-slate-500 text-sm mb-8">
          医护人员登录 · 前端校验演示
        </p>

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            ✅ 校验全部通过！（实际项目此处调用后端 <code>/api/auth/staff/login</code>）
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* 用户名 */}
          <Field
            label="用户名"
            htmlFor="username"
            error={getFieldError('username')}
          >
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="3~20 位字母/数字/下划线"
              className={inputCls(getFieldError('username'))}
              value={form.username}
              onChange={e => handleChange('username', e.target.value)}
              onBlur={() => handleBlur('username')}
            />
          </Field>

          {/* 密码 */}
          <Field label="密码" htmlFor="password" error={getFieldError('password')}>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="8~32 位，字母+数字"
                className={inputCls(getFieldError('password')) + ' pr-16'}
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-sky-600 hover:text-sky-800 px-2 py-1"
                onClick={() => setShowPwd(s => !s)}
              >
                {showPwd ? '隐藏' : '显示'}
              </button>
            </div>
          </Field>

          {/* 确认密码 */}
          <Field label="确认密码" htmlFor="confirmPassword" error={getFieldError('confirmPassword')}>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPwd ? 'text' : 'password'}
              placeholder="再次输入密码"
              className={inputCls(getFieldError('confirmPassword'))}
              value={form.confirmPassword}
              onChange={e => handleChange('confirmPassword', e.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
            />
          </Field>

          {/* 手机号（可选） */}
          <Field
            label="手机号（可选）"
            htmlFor="phone"
            error={getFieldError('phone')}
            hint="填写则需校验"
          >
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              maxLength={11}
              placeholder="11 位手机号"
              className={inputCls(getFieldError('phone'))}
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
            />
          </Field>

          {/* 验证码 */}
          <Field label="验证码" htmlFor="captcha" error={getFieldError('captcha')}>
            <div className="flex gap-2">
              <input
                id="captcha"
                name="captcha"
                type="text"
                maxLength={4}
                placeholder="4 位验证码"
                className={inputCls(getFieldError('captcha')) + ' flex-1'}
                value={form.captcha}
                onChange={e => handleChange('captcha', e.target.value)}
                onBlur={() => handleBlur('captcha')}
              />
              <div
                className="w-20 h-10 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-lg font-bold text-lg flex items-center justify-center tracking-widest select-none cursor-pointer"
                title="点击刷新（演示用）"
                onClick={() => setForm(prev => ({ ...prev, captcha: '' }))}
              >
                {expectedCaptcha}
              </div>
            </div>
          </Field>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-semibold rounded-lg hover:opacity-90 active:scale-[0.99] transition shadow-md mt-6"
          >
            登 录
          </button>

          <p className="text-center text-xs text-slate-400 pt-2">
            校验通过前无法提交；提交后显示全部错误
          </p>
        </form>
      </div>
    </div>
  );
}

/* ---------- 辅助 ---------- */

function Field({
  label, htmlFor, error, hint, children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {hint && <span className="text-xs text-slate-400 ml-1">· {hint}</span>}
      </label>
      {children}
      <div className="min-h-[18px] mt-1">
        {error && (
          <span className="text-xs text-red-500" role="alert">
            ⚠ {error}
          </span>
        )}
      </div>
    </div>
  );
}

function inputCls(error?: string): string {
  const base = 'w-full h-10 px-3 border rounded-lg text-sm outline-none transition focus:ring-2';
  if (error) {
    return `${base} border-red-300 bg-red-50 focus:ring-red-200 focus:border-red-400`;
  }
  return `${base} border-slate-200 bg-white focus:ring-sky-200 focus:border-sky-400`;
}
