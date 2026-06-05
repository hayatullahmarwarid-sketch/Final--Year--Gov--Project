import { Stack } from 'expo-router';
import React from 'react';

import { useRedirectNonPublicFromPublicRoutes } from '@/hooks/use-redirect-non-public-from-public-routes';

export default function CertificateLayout() {
  useRedirectNonPublicFromPublicRoutes();
  return <Stack screenOptions={{ headerShown: false }} />;
}
