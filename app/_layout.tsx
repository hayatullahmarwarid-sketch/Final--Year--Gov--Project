import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { I18nextProvider } from 'react-i18next';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import { AppBootstrap } from '@/components/app-bootstrap';
import { AppAppearanceProvider } from '@/contexts/app-appearance-context';
import { AppLanguageProvider } from '@/contexts/app-language-context';
import { AuthSessionProvider } from '@/contexts/auth-session-context';
import { CalendarTypeProvider } from '@/contexts/calendar-type-context';
import { NotificationInboxProvider } from '@/contexts/notification-inbox-context';
import { NotificationSettingsProvider } from '@/contexts/notification-settings-context';
import { PublicUserDataProvider } from '@/contexts/public-user-data-context';
import { UserProfileProvider } from '@/contexts/user-profile-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import i18n from '@/lib/i18n/init';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigationTree() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppLanguageProvider>
        <CalendarTypeProvider>
          <AuthSessionProvider>
            <NotificationInboxProvider>
              <NotificationSettingsProvider>
                <UserProfileProvider>
                  <PublicUserDataProvider>
                    <I18nextProvider i18n={i18n}>
                      <AppBootstrap>
                        <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="index" />
                      <Stack.Screen name="language" />
                      <Stack.Screen name="register" />
                      <Stack.Screen name="verify-email" />
                      <Stack.Screen name="login" />
                      <Stack.Screen name="inspector-login" />
                      <Stack.Screen name="inspector" />
                      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="edit-profile" />
                      <Stack.Screen name="change-account-email" />
                      <Stack.Screen name="change-password" />
                      <Stack.Screen name="settings-language" />
                      <Stack.Screen name="notification-settings" />
                      <Stack.Screen name="notifications" />
                      <Stack.Screen name="search" />
                      <Stack.Screen name="verify-certificate" />
                      <Stack.Screen name="bookmarked-decrees" />
                      <Stack.Screen name="exam" />
                      <Stack.Screen name="certificate" />
                      <Stack.Screen name="decree" />
                      <Stack.Screen name="dept-upload" />
                      <Stack.Screen name="system-admin" />
                      <Stack.Screen name="inspector-admin" />
                        </Stack>
                      </AppBootstrap>
                    </I18nextProvider>
                  </PublicUserDataProvider>
                </UserProfileProvider>
              </NotificationSettingsProvider>
            </NotificationInboxProvider>
          </AuthSessionProvider>
        </CalendarTypeProvider>
      </AppLanguageProvider>
      <Toast />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppAppearanceProvider>
      <RootNavigationTree />
    </AppAppearanceProvider>
  );
}
