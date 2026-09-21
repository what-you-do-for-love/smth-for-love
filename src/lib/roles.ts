export const ROLES = {
  ADMIN: 'Admin',
  USER: 'User',
} as const;

export function isAdmin(role: string | null | undefined): boolean {
  return role === ROLES.ADMIN;
}

export function isUser(role: string | null | undefined): boolean {
  return role === ROLES.USER;
}

/** Quyền quản trị hệ thống (Admin). */
export function hasAdminPrivileges(role: string | null | undefined): boolean {
  return isAdmin(role);
}
