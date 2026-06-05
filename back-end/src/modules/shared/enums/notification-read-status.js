export const NotificationReadStatus = Object.freeze({
  UNREAD: 'unread',
  READ: 'read',
  DELETED: 'deleted',
});

/** @type {readonly string[]} */
export const NOTIFICATION_READ_STATUS_KEYS = Object.freeze(
  Object.values(NotificationReadStatus),
);
