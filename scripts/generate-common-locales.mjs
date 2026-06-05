/**
 * Generates lib/i18n/locales/{en,ps,fa}/common.json from a single source table.
 * Run: node scripts/generate-common-locales.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { UI_EXTRA } from './i18n-ui-extra.mjs';
import { UI_MORE } from './i18n-ui-more.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const localesDir = path.join(root, 'lib', 'i18n', 'locales');

/** @type {Record<string, { en: string; ps: string; fa: string }>} */
const AUTH_TABLE = {
  homeAppTitle: { en: 'Sharia Decrees', ps: 'د احکامو نظام', fa: 'احکام شرعی' },
  homeSearchPlaceholder: {
    en: 'Search decrees by title, category, or number…',
    ps: 'د فرامینو لټون — سرلیک، کټګورۍ، شمېره…',
    fa: 'جستجوی فرامین — عنوان، دسته، شماره…',
  },
  loginTitle: { en: 'Welcome back', ps: 'بېرته ښه راغلاست', fa: 'خوش آمدید' },
  loginSubtitle: {
    en: 'Sign in to your account to continue',
    ps: 'د خپل حساب ننوتلو لپاره معلومات ولیکئ',
    fa: 'برای ورود به حساب خود اطلاعات را وارد کنید',
  },
  loginEmailLabel: { en: 'Email', ps: 'برېښنالیک', fa: 'ایمیل' },
  loginPasswordLabel: { en: 'Password', ps: 'پټنوم', fa: 'رمز عبور' },
  loginEmailPlaceholder: { en: 'you@example.com', ps: 'ستاسو@بېلګه.کام', fa: 'you@example.com' },
  loginPasswordPlaceholder: { en: '••••••••', ps: '••••••••', fa: '••••••••' },
  loginRemember: { en: 'Remember me', ps: 'ما په یاد ولره', fa: 'مرا به خاطر بسپار' },
  loginForgot: { en: 'Forgot password?', ps: 'پټنوم هیر شوی؟', fa: 'رمز را فراموش کرده‌اید؟' },
  loginButton: { en: 'Log in', ps: 'ننوتل', fa: 'ورود' },
  loginOr: { en: 'OR', ps: 'یا', fa: 'یا' },
  loginNoAccount: { en: "Don't have an account? ", ps: 'حساب نلرئ؟ ', fa: 'حساب ندارید؟ ' },
  loginCreateAccount: { en: 'Create account', ps: 'حساب جوړول', fa: 'ایجاد حساب' },
  loginInspectorLink: { en: 'Field inspector sign-in', ps: 'د ساحوي معاینې ننوتل', fa: 'ورود بازرس میدانی' },
  loginUnifiedInspectorHint: {
    en: 'Field inspectors sign in here with the assigned work email and password.',
    ps: 'د ساحوي معاینې کاروونکي د هماغې ننوتلو پاڼې له لارې خپل برېښنالیک او پټنوم ولیکي.',
    fa: 'بازرسان میدانی از همین صفحه با ایمیل و رمز عبور اختصاصی وارد شوند.',
  },
  loginInvalidEmailPassword: {
    en: 'Invalid email or password.',
    ps: 'ناسم برېښنالیک یا پټنوم',
    fa: 'ایمیل یا رمز عبور نادرست است',
  },
  registerTitle: { en: 'Create account', ps: 'حساب جوړول', fa: 'ایجاد حساب' },
  registerFullName: { en: 'Full name', ps: 'بشپړ نوم', fa: 'نام کامل' },
  registerFullNamePh: {
    en: 'Enter your full name',
    ps: 'خپل بشپړ نوم ولیکئ',
    fa: 'نام کامل خود را وارد کنید',
  },
  registerFullNameInvalid: {
    en: 'Letters only (any language). Spaces, apostrophes, and hyphens are allowed. No numbers or symbols.',
    ps: 'یوازې توري (هر ژبه). تشېشې، اپاستروف، او خط اجازه دي. شمېرې یا نښې نه.',
    fa: 'فقط حروف (هر زبانی). فاصله، آپاستروف و خط تیره مجاز است. اعداد و نمادها مجاز نیست.',
  },
  registerEmail: { en: 'Email', ps: 'برېښنالیک', fa: 'ایمیل' },
  registerEmailPh: { en: 'you@example.com', ps: 'ستاسو@بېلګه.کام', fa: 'you@example.com' },
  registerProvince: { en: 'Province', ps: 'ولایت', fa: 'ولایت' },
  registerProvincePh: { en: 'Select province', ps: 'ولایت وټاکئ', fa: 'ولایت را انتخاب کنید' },
  registerDistrictOptional: {
    en: 'District (optional)',
    ps: 'ولسوالی (اختیاري)',
    fa: 'ولسوالی (اختیاری)',
  },
  registerDistrictPhNeedProvince: {
    en: 'Select province first',
    ps: 'لومړی ولایت وټاکئ',
    fa: 'ابتدا ولایت را انتخاب کنید',
  },
  registerDistrictPh: { en: 'Select district', ps: 'ولسوالی وټاکئ', fa: 'ولسوالی را انتخاب کنید' },
  registerGender: { en: 'Gender', ps: 'جنسیت', fa: 'جنسیت' },
  registerMale: { en: 'Male', ps: 'نارینه', fa: 'مرد' },
  registerFemale: { en: 'Female', ps: 'ښځینه', fa: 'زن' },
  registerPassword: { en: 'Password', ps: 'پټنوم', fa: 'رمز عبور' },
  registerConfirmPassword: { en: 'Confirm password', ps: 'د پټنوم تایید', fa: 'تأیید رمز عبور' },
  registerPasswordPh: {
    en: '8+ characters: upper, lower, number, symbol',
    ps: '۸+ توري: لوی، واړ، شمېره، نښه',
    fa: '۸+ نویسه: حروف بزرگ و کوچک، عدد، نماد',
  },
  registerPasswordPolicyHint: {
    en: 'Use at least 8 characters including uppercase, lowercase, a number, and a symbol.',
    ps: 'لږترلږه ۸ توري ولیکئ چې کې لوی حرف، واړ حرف، شمېره او ځانګړی نښه ولري.',
    fa: 'حداقل ۸ نویسه با حروف بزرگ و کوچک، یک عدد و یک نماد وارد کنید.',
  },
  registerConfirmPasswordPh: {
    en: 'Re-enter your password',
    ps: 'پټنوم بیا ولیکئ',
    fa: 'رمز را دوباره وارد کنید',
  },
  registerRegister: { en: 'Register', ps: 'ثبتول', fa: 'ثبت نام' },
  registerAlreadyHave: {
    en: 'Already have an account? ',
    ps: 'دمخه حساب لرئ؟ ',
    fa: 'از قبل حساب دارید؟ ',
  },
  registerLogIn: { en: 'Log in', ps: 'ننوتل', fa: 'ورود' },
  registerDistrictPickerTitle: { en: 'District', ps: 'ولسوالی', fa: 'ولسوالی' },
  verifyPhoneTitleSms: { en: 'Phone number', ps: 'موبایل نمبر', fa: 'شماره موبایل' },
  verifyPhoneTitleEmail: { en: 'Email address', ps: 'بریښنالیک', fa: 'ایمیل' },
  verifyPhoneInstSms: {
    en: "We'll send you a verification code",
    ps: 'موږ به تاسو ته تایید کوډ لیږو',
    fa: 'کد تأیید برای شما ارسال می‌شود',
  },
  verifyPhoneInstEmail: {
    en: "We'll email you a verification code",
    ps: 'موږ به تاسو ته بریښنالیک کې کوډ لیږو',
    fa: 'کد به به ایمیل شما فرستاده می‌شود',
  },
  verifyPhoneLabelPhone: { en: 'Phone number', ps: 'موبایل نمبر', fa: 'شماره موبایل' },
  verifyPhoneLabelEmail: { en: 'Email', ps: 'بریښنالیک', fa: 'ایمیل' },
  verifyPhonePhPhone: { en: '788 907 860', ps: '۷۸۸ ۹۰۷ ۸۶۰', fa: '۷۸۸ ۹۰۷ ۸۶۰' },
  verifyPhonePhEmail: { en: 'you@example.com', ps: 'ستاسو@بریښنالیک.com', fa: 'you@example.com' },
  verifyPhoneHelperEmail: {
    en: 'Use an inbox you can open now',
    ps: 'هغه بریښنالیک وکاروئ چې اوس یې خلاصولی شئ',
    fa: 'ایمیلی را وارد کنید که هم‌اکنون به آن دسترسی دارید',
  },
  verifyOtpTitle: { en: 'Verification code', ps: 'تایید کوډ', fa: 'کد تأیید' },
  verifyOtpInstruction: {
    en: 'Enter the code sent to {{target}}',
    ps: 'کوډ ولیکئ چې {{target}} ته لیږل شوی',
    fa: 'کدی را که به {{target}} فرستاده شده وارد کنید',
  },
  verifyOtpResendWait: {
    en: 'Resend in {{timer}}',
    ps: 'بیا لیږل {{timer}} وروسته',
    fa: 'ارسال مجدد تا {{timer}}',
  },
  verifyOtpResend: { en: 'Resend code', ps: 'کوډ بیا لیږل', fa: 'ارسال مجدد کد' },
  verifyOtpVerify: { en: 'Verify', ps: 'تایید', fa: 'تأیید' },
  verifyOtpFooterSms: {
    en: "Didn't receive the code? Check SMS or try resending.",
    ps: 'کوډ نه دی راغلی؟ SMS وګورئ یا بیا هڅه وکړئ',
    fa: 'کد نیامده؟ پیامک را بررسی کنید یا دوباره بفرستید',
  },
  verifyOtpFooterEmail: {
    en: "Didn't receive the code? Check spam or try resending.",
    ps: 'کوډ نه دی راغلی؟ سپام فولډر وګورئ یا بیا هڅه وکړئ',
    fa: 'کد نیامده؟ پوشهٔ هرزنامه را بررسی کنید',
  },
  forgotPhoneLabel: { en: 'Phone number', ps: 'موبایل نمبر', fa: 'شماره موبایل' },
  forgotPhonePh: { en: '675 887 8776', ps: '۶۷۵ ۸۸۷ ۸۷۷۶', fa: '۶۷۵ ۸۸۷ ۸۷۷۶' },
  forgotResetNewPassword: { en: 'New password', ps: 'نوی پټنوم', fa: 'رمز عبور جدید' },
  forgotResetConfirmPassword: { en: 'Confirm password', ps: 'د پټنوم تایید', fa: 'تأیید رمز عبور' },
  forgotResetConfirmPh: {
    en: 'Re-enter your password',
    ps: 'پټنوم بیا ولیکئ',
    fa: 'رمز را دوباره وارد کنید',
  },
  changePasswordTitle: { en: 'Change password', ps: 'پټنوم بدلول', fa: 'تغییر رمز عبور' },
  changePasswordCurrent: { en: 'Current password', ps: 'اوسنی پټنوم', fa: 'رمز فعلی' },
  changePasswordNew: { en: 'New password', ps: 'نوی پټنوم', fa: 'رمز جدید' },
  changePasswordConfirm: { en: 'Confirm password', ps: 'د پټنوم تایید', fa: 'تأیید رمز' },
  changePasswordPh: { en: '••••••••', ps: '••••••••', fa: '••••••••' },
  changePasswordConfirmPh: {
    en: 'Re-enter new password',
    ps: 'پټنوم بیا ولیکئ',
    fa: 'رمز را دوباره وارد کنید',
  },
  inspectorLoginTitle: { en: 'Inspector sign-in', ps: 'د معاینې ننوتل', fa: 'ورود بازرس' },
  inspectorLoginSubtitle: {
    en: 'Enter your username and password',
    ps: 'خپل ننوتن معلومات ولیکئ',
    fa: 'نام کاربری و رمز را وارد کنید',
  },
  inspectorUsername: { en: 'Username', ps: 'کارن نوم', fa: 'نام کاربری' },
  inspectorUsernamePh: { en: 'username', ps: 'کارن نوم', fa: 'نام کاربری' },
  inspectorPassword: { en: 'Password', ps: 'پټنوم', fa: 'رمز عبور' },
  inspectorPasswordPh: { en: '••••••••', ps: '••••••••', fa: '••••••••' },
  inspectorSignIn: { en: 'Sign in', ps: 'ننوتل', fa: 'ورود' },
};

const TABLE = { ...AUTH_TABLE, ...UI_EXTRA, ...UI_MORE };

function buildLocale(which) {
  const out = {};
  for (const [k, v] of Object.entries(TABLE)) {
    out[k] = v[which];
  }
  return out;
}

for (const loc of ['en', 'ps', 'fa']) {
  const dir = path.join(localesDir, loc);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'common.json');
  fs.writeFileSync(file, JSON.stringify(buildLocale(loc), null, 2), 'utf8');
  console.log('Wrote', file);
}
