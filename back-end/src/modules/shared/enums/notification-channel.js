export const NotificationChannel = Object.freeze({
  IN_APP: 'in_app',
  PUSH: 'push',
  EMAIL: 'email',
});

/** @type {readonly string[]} */
export const NOTIFICATION_CHANNELS = Object.freeze(Object.values(NotificationChannel));
