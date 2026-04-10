export type PlatformErrorKind =
  | 'auth_required'
  | 'session_expired'
  | 'permission_denied'
  | 'network_error'
  | 'maintenance'
  | 'page_load_error';

export function normalizeUserMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('unauthorized')) {
    return '登录状态已失效，请重新登录后继续操作。';
  }
  if (normalized.includes('forbidden') || normalized.includes('permission')) {
    return '当前账号暂时没有访问该功能的权限。';
  }
  if (normalized.includes('network') || normalized.includes('timeout')) {
    return '网络连接异常，请检查网络后重试。';
  }
  if (normalized.includes('maint')) {
    return '平台正在维护中，请稍后再访问。';
  }
  if (normalized.includes('account does not exist')) {
    return '未找到对应账号，请检查后重新输入。';
  }
  if (normalized.includes('incorrect password')) {
    return '密码输入不正确，请重新尝试。';
  }
  if (normalized.includes('not activated')) {
    return '当前账号尚未激活，请等待审核或联系管理员。';
  }

  return message;
}

export function getPlatformErrorKind(message: string): PlatformErrorKind {
  const normalized = message.toLowerCase();

  if (normalized.includes('unauthorized') || normalized.includes('登录状态已失效')) {
    return 'session_expired';
  }
  if (normalized.includes('forbidden') || normalized.includes('权限')) {
    return 'permission_denied';
  }
  if (
    normalized.includes('network') ||
    normalized.includes('timeout') ||
    normalized.includes('网络')
  ) {
    return 'network_error';
  }
  if (normalized.includes('maint') || normalized.includes('维护')) {
    return 'maintenance';
  }

  return 'page_load_error';
}
