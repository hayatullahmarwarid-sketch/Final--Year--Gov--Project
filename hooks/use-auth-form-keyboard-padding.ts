import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

/**
 * Extra bottom padding for scrollable auth forms when the keyboard is open.
 * Android (especially edge-to-edge) often does not resize the window, so content must scroll above the keyboard.
 */
export function useAuthFormKeyboardPadding(): number {
  const [pad, setPad] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const onShow = (e: KeyboardEvent) => {
      setPad(e.endCoordinates.height);
    };
    const onHide = () => setPad(0);

    const subShow = Keyboard.addListener('keyboardDidShow', onShow);
    const subHide = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  return pad;
}
