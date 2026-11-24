/**
 * 登录表单校验器
 * 作用：对每个字段返回错误字符串；"" 表示通过
 *      所有函数都是纯函数，方便单元测试
 */

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
export const PHONE_REGEX = /^1[3-9]\d{9}$/;

export interface LoginFormData {
  username: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  captcha: string;
}

export interface LoginFormErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  captcha?: string;
}

/** 校验用户名：必填，3~20 字符，只允许字母/数字/下划线 */
export function validateUsername(username: string): string {
  const trimmed = username.trim();
  if (!trimmed) return '用户名不能为空';
  if (!USERNAME_REGEX.test(trimmed)) {
    return '用户名需为 3~20 位字母、数字或下划线';
  }
  return '';
}

/** 校验密码：必填，8~32 字符，必须同时包含字母和数字 */
export function validatePassword(password: string): string {
  if (!password) return '密码不能为空';
  if (password.length < 8) return '密码长度不能少于 8 位';
  if (password.length > 32) return '密码长度不能超过 32 位';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return '密码必须同时包含字母和数字';
  }
  return '';
}

/** 校验确认密码：必须与密码一致 */
export function validateConfirmPassword(password: string, confirm: string): string {
  if (!confirm) return '请再次输入密码';
  if (password !== confirm) return '两次输入的密码不一致';
  return '';
}

/** 校验手机号（可选字段，填了才校验） */
export function validatePhone(phone: string): string {
  if (!phone) return ''; // 可选
  if (!PHONE_REGEX.test(phone.trim())) return '请输入正确的 11 位手机号';
  return '';
}

/** 校验图形验证码：必填，忽略大小写 */
export function validateCaptcha(captcha: string, expected: string): string {
  if (!captcha.trim()) return '请输入验证码';
  if (captcha.trim().toUpperCase() !== expected.toUpperCase()) {
    return '验证码错误';
  }
  return '';
}

/** 一次校验全部字段 */
export function validateAll(data: LoginFormData, expectedCaptcha: string): LoginFormErrors {
  return {
    username: validateUsername(data.username),
    password: validatePassword(data.password),
    confirmPassword: validateConfirmPassword(data.password, data.confirmPassword),
    phone: validatePhone(data.phone ?? ''),
    captcha: validateCaptcha(data.captcha, expectedCaptcha),
  };
}

/** 判断全部通过 */
export function hasNoErrors(errors: LoginFormErrors): boolean {
  return Object.values(errors).every(v => !v);
}
