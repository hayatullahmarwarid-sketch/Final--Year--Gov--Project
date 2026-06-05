/** Same rules as public login / registration phone entry (+93 local formats). */
export function isPublicLoginPhoneValid(digits: string): boolean {
  const clean = digits.replace(/\D/g, '');
  return (
    /^7\d{9}$/.test(clean) ||
    /^\d{10}$/.test(clean) ||
    /^0\d{9}$/.test(clean)
  );
}
