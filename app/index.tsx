import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand } from '@/constants/brand';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { getHealth } from '@/lib/api/health';
import { homeHrefForRole } from '@/lib/auth-routing';
import { palette } from '@/lib/theme';

const SPLASH_HOLD_MS = 1200;
const SLOW_FALLBACK_MS = 5000;

/**
 * Entry splash: waits for auth + language hydration, restores JWT sessions, then routes to home,
 * `/language` (first install), or `/login`.
 */
export default function SplashRoute() {
  const { width, height } = useWindowDimensions();
  const { t } = useAppTranslation();
  const router = useRouter();
  const { hydrated: authHydrated, role } = useAuthSession();
  const { hydrated: langHydrated, hasPersistedUserLanguage } = useAppLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);

  /** Square box so `contain` never clips the logo; scales with shortest screen edge. */
  const logoBoxSize = Math.round(
    Math.min(width * 0.44, height * 0.22, width < 360 ? 132 : width > 600 ? 168 : 148),
  );

  useEffect(() => {
    if (!authHydrated || !langHydrated) return;
    if (role === null) return;
    setLoading(false);
    setError(null);
    try {
      router.replace(homeHrefForRole(role));
    } catch {
      /* ignore */
    }
  }, [authHydrated, langHydrated, role, router]);

  useEffect(() => {
    if (!authHydrated || !langHydrated) return;
    if (role !== null) return;

    let cancelled = false;
    setSlow(false);
    const slowTimer = setTimeout(() => {
      if (!cancelled) setSlow(true);
    }, SLOW_FALLBACK_MS);

    const run = async () => {
      setError(null);
      setLoading(true);
      const minHold = new Promise<void>((resolve) => {
        setTimeout(resolve, SPLASH_HOLD_MS);
      });
      const health = await getHealth();
      await minHold;
      clearTimeout(slowTimer);
      if (cancelled) return;
      if (!health.ok) {
        setError(health.message);
        setLoading(false);
        return;
      }
      setLoading(false);
      try {
        if (!hasPersistedUserLanguage) {
          router.replace('/language');
        } else {
          router.replace('/login');
        }
      } catch {
        /* ignore */
      }
    };

    void run();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [attempt, authHydrated, langHydrated, role, hasPersistedUserLanguage, router]);

  const onRetry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  const showSpinner = !authHydrated || !langHydrated || loading;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={[styles.logoFrame, { width: logoBoxSize, height: logoBoxSize }]}>
            <Image
              source={require('../assets/images/islamic logo.png')}
              style={styles.logoImage}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <Text style={styles.appNamePs} maxFontSizeMultiplier={1.3}>
            {t('splashAppNamePs')}
          </Text>
          <Text style={styles.appNameEn} maxFontSizeMultiplier={1.25}>
            {t('splashAppNameEn')}
          </Text>
          {showSpinner ? (
            <ActivityIndicator color={Brand.gold} style={styles.spinner} />
          ) : null}
          {showSpinner && slow ? (
            <Text style={styles.slowHint} maxFontSizeMultiplier={1.2}>
              {t('splashCheckingConnection')}
            </Text>
          ) : null}
          {!showSpinner && error ? (
            <View style={styles.errorBlock}>
              <Text style={styles.errorText} maxFontSizeMultiplier={1.2}>
                {error}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('splashRetry')}
                onPress={onRetry}
                style={({ pressed }) => [styles.retryBtn, pressed && styles.retryPressed]}>
                <Text style={styles.retryLabel} maxFontSizeMultiplier={1.2}>
                  {t('splashRetry')}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.green,
  },
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appNamePs: {
    marginTop: 20,
    color: palette.white,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  appNameEn: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  spinner: {
    marginTop: 36,
  },
  slowHint: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    textAlign: 'center',
  },
  errorBlock: {
    marginTop: 28,
    alignItems: 'center',
    alignSelf: 'stretch',
    maxWidth: 400,
  },
  errorText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    minWidth: 160,
    alignItems: 'center',
  },
  retryPressed: {
    opacity: 0.88,
  },
  retryLabel: {
    color: palette.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
