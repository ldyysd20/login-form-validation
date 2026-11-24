/**
 * 登录表单组件集成测试（DOM 级别）
 * 运行方式：npm test
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from '../components/LoginForm';

/** 帮助函数：按 placeholder 取输入框，避免多个"密码"同名冲突 */
function inputByPlaceholder(ph: string) {
  return screen.getByPlaceholderText(ph);
}

describe('LoginForm', () => {
  beforeEach(() => {
    render(<LoginForm />);
  });

  it('初始不显示任何错误（未失焦未提交）', () => {
    expect(screen.queryByText(/⚠/)).toBeNull();
  });

  it('用户名失焦后立即显示错误', () => {
    const input = inputByPlaceholder('3~20 位字母/数字/下划线');
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.blur(input);
    expect(screen.getByText(/3~20/)).toBeInTheDocument();
  });

  it('密码含纯字母时报错', () => {
    const input = inputByPlaceholder('8~32 位，字母+数字');
    fireEvent.change(input, { target: { value: 'aaaaaaaa' } });
    fireEvent.blur(input);
    expect(screen.getByText(/必须同时包含字母和数字/)).toBeInTheDocument();
  });

  it('提交按钮点击后显示全部错误', () => {
    const btn = screen.getByRole('button', { name: /登 录/i });
    fireEvent.click(btn);
    // 空表单有 4 条错误（用户名/密码/确认密码/验证码），手机号可选所以空串不报错
    expect(screen.getAllByText(/⚠/).length).toBe(4);
  });

  it('填对所有字段后点击提交显示 ✅ 成功', () => {
    fireEvent.change(inputByPlaceholder('3~20 位字母/数字/下划线'), { target: { value: 'staff01' } });
    fireEvent.change(inputByPlaceholder('8~32 位，字母+数字'), { target: { value: 'Admin123' } });
    fireEvent.change(inputByPlaceholder('再次输入密码'), { target: { value: 'Admin123' } });
    fireEvent.change(inputByPlaceholder('11 位手机号'), { target: { value: '13800138000' } });
    fireEvent.change(inputByPlaceholder('4 位验证码'), { target: { value: 'a8b3' } });
    fireEvent.click(screen.getByRole('button', { name: /登 录/i }));
    expect(screen.getByText(/✅ 校验全部通过/)).toBeInTheDocument();
  });
});
