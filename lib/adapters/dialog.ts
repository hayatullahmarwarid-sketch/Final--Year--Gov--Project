import { Alert } from 'react-native';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

export function confirm(options: ConfirmOptions): Promise<boolean> {
  const {
    title = 'Confirm',
    message,
    confirmText = 'OK',
    cancelText = 'Cancel',
    destructive,
  } = options;
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export function showAlert(title: string, message?: string): void {
  Alert.alert(title, message ?? '');
}
