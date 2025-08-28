export const authorise = (permission: Boolean, userRole: String, ...roles: String[]) => {
  const result = roles.includes(userRole);
  let grant = true;
  if (permission && !result) {
    grant = false;
  }
  if (!permission && result) {
    grant = false;
  }
  return grant;
};
