import Toast from 'react-native-toast-message';

export type ToastKind = 'success' | 'error' | 'info';

export function showToast(message: string, type: ToastKind = 'info') {
  Toast.show({ type, text1: message });
}
