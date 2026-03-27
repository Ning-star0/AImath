import type { UserRole } from '@/types/api';

export function getRoleHomePath(role?: UserRole | null) {
  if (role === 'ADMIN') {
    return '/admin';
  }

  if (role === 'TEACHER') {
    return '/teacher';
  }

  return '/student';
}

export function getRoleProfilePath(role?: UserRole | null) {
  if (role === 'STUDENT') {
    return '/student/profile';
  }

  return getRoleHomePath(role);
}
