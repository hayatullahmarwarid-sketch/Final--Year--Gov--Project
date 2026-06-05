export const UserAccountStatus = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
});

/** @type {readonly string[]} */
export const USER_ACCOUNT_STATUS_KEYS = Object.freeze(Object.values(UserAccountStatus));
