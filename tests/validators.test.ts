/**
 * 登录校验器单元测试
 * 纯函数，不需要 DOM，跑得飞快
 *
 * 运行方式：npm test
 */
import { describe, it, expect } from 'vitest';
import {
  validateUsername,
  validatePassword,
  validateConfirmPassword,
  validatePhone,
  validateCaptcha,
  validateAll,
  hasNoErrors,
} from '../lib/validators';

describe('validateUsername', () => {
  it('空字符串应报错', () => {
    expect(validateUsername('')).toContain('不能为空');
    expect(validateUsername('   ')).toContain('不能为空');
  });

  it('少于 3 位应报错', () => {
    expect(validateUsername('ab')).toContain('3~20');
  });

  it('超过 20 位应报错', () => {
    expect(validateUsername('a'.repeat(21))).toContain('3~20');
  });

  it('含非法字符（中文、@、空格）应报错', () => {
    expect(validateUsername('张三')).toContain('3~20');
    expect(validateUsername('abc@123')).toContain('3~20');
    expect(validateUsername('a b c')).toContain('3~20');
  });

  it('合法用户名应返回空串', () => {
    expect(validateUsername('admin')).toBe('');
    expect(validateUsername('staff_01')).toBe('');
    expect(validateUsername('a'.repeat(20))).toBe('');
  });
});

describe('validatePassword', () => {
  it('空/过短/过长应报错', () => {
    expect(validatePassword('')).toContain('不能为空');
    expect(validatePassword('Abc1')).toContain('少于 8');
    expect(validatePassword('aB1'.repeat(11))).toContain('超过 32');
  });

  it('只有字母或只有数字应报错', () => {
    expect(validatePassword('aaaaaaaa')).toContain('必须同时包含字母和数字');
    expect(validatePassword('12345678')).toContain('必须同时包含字母和数字');
  });

  it('合法密码应返回空串', () => {
    expect(validatePassword('admin123')).toBe('');
    expect(validatePassword('a'.repeat(7) + '1')).toBe('');
  });
});

describe('validateConfirmPassword', () => {
  it('空/不一致应报错', () => {
    expect(validateConfirmPassword('Abc123456', '')).toContain('再次输入');
    expect(validateConfirmPassword('Abc123456', 'Abc123457')).toContain('不一致');
  });

  it('一致应返回空串', () => {
    expect(validateConfirmPassword('Abc123456', 'Abc123456')).toBe('');
  });
});

describe('validatePhone', () => {
  it('空串通过（可选）', () => {
    expect(validatePhone('')).toBe('');
  });

  it('非法格式报错', () => {
    expect(validatePhone('12345')).toContain('正确的 11 位');
    expect(validatePhone('21345678901')).toContain('正确的 11 位'); // 不以 1 开头
    expect(validatePhone('11111111111')).toContain('正确的 11 位'); // 第二位 1 不合法
  });

  it('合法手机号通过', () => {
    expect(validatePhone('13800138000')).toBe('');
    expect(validatePhone('15912345678')).toBe('');
  });
});

describe('validateCaptcha', () => {
  it('空/错误报错', () => {
    expect(validateCaptcha('', 'A8B3')).toContain('请输入');
    expect(validateCaptcha('1234', 'A8B3')).toContain('错误');
  });

  it('正确（忽略大小写）通过', () => {
    expect(validateCaptcha('a8b3', 'A8B3')).toBe('');
    expect(validateCaptcha('A8B3', 'A8B3')).toBe('');
  });
});

describe('validateAll & hasNoErrors', () => {
  it('全部合法应返回全空 errors', () => {
    const errors = validateAll({
      username: 'staff01',
      password: 'Admin123456',
      confirmPassword: 'Admin123456',
      phone: '13800138000',
      captcha: 'a8b3',
    }, 'A8B3');
    expect(hasNoErrors(errors)).toBe(true);
    expect(errors).toEqual({
      username: '', password: '', confirmPassword: '',
      phone: '', captcha: '',
    });
  });

  it('全部非法应返回全非空 errors', () => {
    const errors = validateAll({
      username: 'ab',
      password: '12345678',
      confirmPassword: 'abcdefgh',
      phone: '000',
      captcha: '',
    }, 'A8B3');
    expect(hasNoErrors(errors)).toBe(false);
    expect(errors.username).toBeTruthy();
    expect(errors.password).toBeTruthy();
    expect(errors.confirmPassword).toBeTruthy();
    expect(errors.phone).toBeTruthy();
    expect(errors.captcha).toBeTruthy();
  });
});
