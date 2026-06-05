import type { AppLanguageId } from '@/constants/languages';
import i18n from '@/lib/i18n/init';
import { appLanguageToI18n } from '@/lib/i18n/locale-map';

/**
 * Public auth/home strings backed by lib/i18n locale JSON (common namespace).
 * Prefer useAppTranslation() in new code; this helper stays for existing screens.
 */
export function getPublicUiCopy(lang: AppLanguageId) {
  const t = i18n.getFixedT(appLanguageToI18n(lang), 'common');
  return {
    homeAppTitle: t('homeAppTitle'),
    homeSearchPlaceholder: t('homeSearchPlaceholder'),

    loginTitle: t('loginTitle'),
    loginSubtitle: t('loginSubtitle'),
    loginEmailLabel: t('loginEmailLabel'),
    loginPasswordLabel: t('loginPasswordLabel'),
    loginEmailPlaceholder: t('loginEmailPlaceholder'),
    loginPasswordPlaceholder: t('loginPasswordPlaceholder'),
    loginRemember: t('loginRemember'),
    loginForgot: t('loginForgot'),
    loginButton: t('loginButton'),
    loginOr: t('loginOr'),
    loginNoAccount: t('loginNoAccount'),
    loginCreateAccount: t('loginCreateAccount'),
    loginInspectorLink: t('loginInspectorLink'),
    loginUnifiedInspectorHint: t('loginUnifiedInspectorHint'),
    loginInvalidEmailPassword: t('loginInvalidEmailPassword'),

    registerTitle: t('registerTitle'),
    registerFullName: t('registerFullName'),
    registerFullNamePh: t('registerFullNamePh'),
    registerEmail: t('registerEmail'),
    registerEmailPh: t('registerEmailPh'),
    registerProvince: t('registerProvince'),
    registerProvincePh: t('registerProvincePh'),
    registerDistrictOptional: t('registerDistrictOptional'),
    registerDistrictPhNeedProvince: t('registerDistrictPhNeedProvince'),
    registerDistrictPh: t('registerDistrictPh'),
    registerGender: t('registerGender'),
    registerMale: t('registerMale'),
    registerFemale: t('registerFemale'),
    registerPassword: t('registerPassword'),
    registerConfirmPassword: t('registerConfirmPassword'),
    registerPasswordPh: t('registerPasswordPh'),
    registerConfirmPasswordPh: t('registerConfirmPasswordPh'),
    registerRegister: t('registerRegister'),
    registerAlreadyHave: t('registerAlreadyHave'),
    registerLogIn: t('registerLogIn'),
    registerDistrictPickerTitle: t('registerDistrictPickerTitle'),

    forgotResetNewPassword: t('forgotResetNewPassword'),
    forgotResetConfirmPassword: t('forgotResetConfirmPassword'),
    forgotResetConfirmPh: t('forgotResetConfirmPh'),

    changePasswordTitle: t('changePasswordTitle'),
    changePasswordCurrent: t('changePasswordCurrent'),
    changePasswordNew: t('changePasswordNew'),
    changePasswordConfirm: t('changePasswordConfirm'),
    changePasswordPh: t('changePasswordPh'),
    changePasswordConfirmPh: t('changePasswordConfirmPh'),

    inspectorLoginTitle: t('inspectorLoginTitle'),
    inspectorLoginSubtitle: t('inspectorLoginSubtitle'),
    inspectorUsername: t('inspectorUsername'),
    inspectorUsernamePh: t('inspectorUsernamePh'),
    inspectorPassword: t('inspectorPassword'),
    inspectorPasswordPh: t('inspectorPasswordPh'),
    inspectorSignIn: t('inspectorSignIn'),
  } as const;
}

export type PublicUiCopy = ReturnType<typeof getPublicUiCopy>;
