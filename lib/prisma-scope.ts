/**
 * MongoDB often omits optional fields instead of storing null. Prisma `where` filters on
 * `deletedAt` are unreliable — load `member` + `user` and filter with these helpers.
 */
export function isActiveUser(user: { deletedAt?: Date | null }): boolean {
  return user.deletedAt == null;
}

export function isActiveMemberWithUser(member: {
  deletedAt?: Date | null;
  user: { deletedAt?: Date | null };
}): boolean {
  return member.deletedAt == null && member.user.deletedAt == null;
}

export function archivedUserEmail(userId: string) {
  return `archived_${userId}@archived.local`;
}
