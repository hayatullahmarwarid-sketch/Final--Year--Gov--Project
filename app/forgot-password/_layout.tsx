import { Stack } from 'expo-router';

import { ForgotPasswordRecoveryProvider } from '@/contexts/forgot-password-recovery-context';

export default function ForgotPasswordLayout() {
  return (
    <ForgotPasswordRecoveryProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="verify" />
        <Stack.Screen name="reset" />
      </Stack>
    </ForgotPasswordRecoveryProvider>
  );
}
