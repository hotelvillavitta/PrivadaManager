/** Cuenta maestra de respaldo: no visible ni editable por otros admins. */
export const MASTER_ADMIN_EMAIL = "admin";

export function isMasterAdminEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === MASTER_ADMIN_EMAIL;
}
