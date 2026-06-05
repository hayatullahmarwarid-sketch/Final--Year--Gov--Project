import { Platform } from 'react-native';

import { getApiBaseUrl } from '@/constants/api';
import { registerExpoDeviceToken, registerFcmDeviceToken } from '@/lib/api/devices';

type RegOk = { ok: true; deviceTokenId: string };
type RegFail = { ok: false; message: string };

/**
 * Registers push credentials for the decree-upload dashboard user on this device.
 * - Web: FCM web token (Firebase JS SDK + `/public/push-sw.js`).
 * - Android: native FCM registration token.
 * - iOS: Expo push token (APNs via Expo).
 */
export async function registerDeptDashboardPush(): Promise<RegOk | RegFail> {
  if (Platform.OS === 'web') {
    return registerDeptDashboardPushWeb();
  }

  const Notifications = await import('expo-notifications');

  const perm = await Notifications.getPermissionsAsync();
  const finalPerm = perm.status === 'granted' ? perm : await Notifications.requestPermissionsAsync();
  if (finalPerm.status !== 'granted') {
    return { ok: false, message: 'Notification permission was not granted.' };
  }

  if (Platform.OS === 'android') {
    const native = await Notifications.getDevicePushTokenAsync();
    const token =
      native &&
      typeof native === 'object' &&
      'data' in native &&
      typeof (native as { data?: unknown }).data === 'string'
        ? String((native as { data: string }).data)
        : '';
    if (!token) return { ok: false, message: 'Could not read Android FCM token.' };
    const reg = await registerFcmDeviceToken({ token });
    if (!reg.ok) return reg;
    return { ok: true, deviceTokenId: reg.id };
  }

  const Constants = await import('expo-constants');
  const projectId =
    (Constants.default as { expoConfig?: { extra?: { eas?: { projectId?: string } } }; easConfig?: { projectId?: string } })
      ?.expoConfig?.extra?.eas?.projectId ?? (Constants.default as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  const tokenRes = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const expoTok = tokenRes?.data;
  if (!expoTok) return { ok: false, message: 'Could not read Expo push token.' };
  const reg = await registerExpoDeviceToken({ token: expoTok });
  if (!reg.ok) return reg;
  return { ok: true, deviceTokenId: reg.id };
}

async function registerDeptDashboardPushWeb(): Promise<RegOk | RegFail> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false, message: 'Service workers are not available in this browser.' };
  }

  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API base URL is not configured.' };

  let firebaseConfig: {
    apiKey: string;
    authDomain?: string | null;
    projectId?: string | null;
    storageBucket?: string | null;
    messagingSenderId?: string | null;
    appId: string;
    vapidKey?: string | null;
  };

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/public-config/firebase-web`);
    const json = (await res.json()) as { success?: boolean; data?: typeof firebaseConfig };
    if (!json?.data?.apiKey || !json?.data?.appId) {
      return { ok: false, message: 'Firebase web is not configured on the API.' };
    }
    firebaseConfig = json.data;
  } catch {
    return { ok: false, message: 'Could not load Firebase configuration.' };
  }

  const vapidKey = firebaseConfig.vapidKey?.trim();
  if (!vapidKey) {
    return { ok: false, message: 'Firebase web push VAPID key is missing on the server.' };
  }

  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const messagingMod = await import('firebase/messaging');

  const { vapidKey: _omit, ...rest } = firebaseConfig;
  /** @type {import('firebase/app').FirebaseOptions} */
  const appOpts = {
    apiKey: rest.apiKey,
    appId: rest.appId,
    ...(rest.authDomain ? { authDomain: String(rest.authDomain) } : {}),
    ...(rest.projectId ? { projectId: String(rest.projectId) } : {}),
    ...(rest.storageBucket ? { storageBucket: String(rest.storageBucket) } : {}),
    ...(rest.messagingSenderId ? { messagingSenderId: String(rest.messagingSenderId) } : {}),
  };

  const app = getApps().length ? getApp() : initializeApp(appOpts);

  const registration = await navigator.serviceWorker.register('/push-sw.js');

  const messaging = messagingMod.getMessaging(app);
  const supported = await messagingMod.isSupported().catch(() => false);
  if (!supported) return { ok: false, message: 'Firebase messaging is not supported in this browser.' };

  const token = await messagingMod.getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) return { ok: false, message: 'Could not obtain FCM web token.' };

  const reg = await registerFcmDeviceToken({ token });
  if (!reg.ok) return reg;
  return { ok: true, deviceTokenId: reg.id };
}
