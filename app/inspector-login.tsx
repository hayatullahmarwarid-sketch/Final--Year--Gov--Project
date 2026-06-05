import { Redirect } from 'expo-router';
import React from 'react';

/**
 * Legacy route — all roles (including field inspectors) use the unified `/login` screen.
 */
export default function InspectorLoginRedirect() {
  return <Redirect href="/login" />;
}
