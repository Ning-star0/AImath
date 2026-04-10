export type PlatformErrorKind =
  | 'auth_required'
  | 'session_expired'
  | 'permission_denied'
  | 'network_error'
  | 'maintenance'
  | 'page_load_error';

const MSG = {
  roleMismatch:
    '\u5f53\u524d\u8d26\u53f7\u4e0e\u6240\u9009\u8eab\u4efd\u5165\u53e3\u4e0d\u5339\u914d\uff0c\u8bf7\u5207\u6362\u5230\u6b63\u786e\u5165\u53e3\u540e\u518d\u767b\u5f55\u3002',
  forbidden:
    '\u5f53\u524d\u8d26\u53f7\u6682\u65f6\u6ca1\u6709\u8bbf\u95ee\u8be5\u529f\u80fd\u7684\u6743\u9650\u3002',
  network:
    '\u7f51\u7edc\u8fde\u63a5\u5f02\u5e38\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u540e\u518d\u8bd5\u3002',
  maintenance:
    '\u5e73\u53f0\u6b63\u5728\u7ef4\u62a4\u4e2d\uff0c\u8bf7\u7a0d\u540e\u518d\u8bbf\u95ee\u3002',
  accountNotFound:
    '\u672a\u627e\u5230\u5bf9\u5e94\u8d26\u53f7\uff0c\u8bf7\u68c0\u67e5\u540e\u91cd\u65b0\u8f93\u5165\u3002',
  wrongPassword:
    '\u5bc6\u7801\u8f93\u5165\u4e0d\u6b63\u786e\uff0c\u8bf7\u91cd\u65b0\u5c1d\u8bd5\u3002',
  notActivated:
    '\u5f53\u524d\u8d26\u53f7\u5c1a\u672a\u6fc0\u6d3b\uff0c\u8bf7\u7b49\u5f85\u5ba1\u6838\u6216\u8054\u7cfb\u7ba1\u7406\u5458\u3002',
  sessionExpired:
    '\u767b\u5f55\u72b6\u6001\u5df2\u5931\u6548\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55\u540e\u7ee7\u7eed\u64cd\u4f5c\u3002',
};

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

export function normalizeUserMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    includesAny(normalized, [
      'unauthorized',
      '\u5f53\u524d\u8d26\u53f7\u4e0e\u6240\u9009\u8eab\u4efd\u5165\u53e3\u4e0d\u5339\u914d',
      '褰撳墠璐﹀彿涓庢墍閫夎韩浠藉叆鍙ｄ笉鍖归厤',
    ])
  ) {
    return MSG.roleMismatch;
  }

  if (includesAny(normalized, ['forbidden', 'permission'])) {
    return MSG.forbidden;
  }

  if (includesAny(normalized, ['network', 'timeout'])) {
    return MSG.network;
  }

  if (normalized.includes('maint')) {
    return MSG.maintenance;
  }

  if (
    includesAny(normalized, [
      'account does not exist',
      '\u672a\u627e\u5230\u5bf9\u5e94\u8d26\u53f7',
      '鏈壘鍒板搴旇处鍙',
    ])
  ) {
    return MSG.accountNotFound;
  }

  if (
    includesAny(normalized, [
      'incorrect password',
      '\u5bc6\u7801\u8f93\u5165\u4e0d\u6b63\u786e',
      '瀵嗙爜杈撳叆涓嶆纭',
    ])
  ) {
    return MSG.wrongPassword;
  }

  if (includesAny(normalized, ['not activated', '\u5c1a\u672a\u6fc0\u6d3b'])) {
    return MSG.notActivated;
  }

  return message;
}

export function getPlatformErrorKind(message: string): PlatformErrorKind {
  const normalized = message.toLowerCase();

  if (
    includesAny(normalized, [
      'unauthorized',
      '\u8eab\u4efd\u5165\u53e3\u4e0d\u5339\u914d',
      '\u767b\u5f55\u72b6\u6001\u5df2\u5931\u6548',
      MSG.sessionExpired.toLowerCase(),
    ])
  ) {
    return 'session_expired';
  }

  if (includesAny(normalized, ['forbidden', '\u6743\u9650'])) {
    return 'permission_denied';
  }

  if (includesAny(normalized, ['network', 'timeout', '\u7f51\u7edc'])) {
    return 'network_error';
  }

  if (includesAny(normalized, ['maint', '\u7ef4\u62a4'])) {
    return 'maintenance';
  }

  return 'page_load_error';
}
