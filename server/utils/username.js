export const normalizeUsername = (username = '') => {
  if (typeof username !== 'string') return '';
  return username.trim().toLowerCase();
};

export const validateUsernameFormat = (username = '') => {
  return /^[a-z0-9_-]{3,20}$/i.test(username.trim());
};
