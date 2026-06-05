export type PasswordRequirements = {
  len8: boolean;
  mixCase: boolean;
  numOrSpecial: boolean;
};

export function getPasswordRequirements(password: string): PasswordRequirements {
  return {
    len8: password.length >= 8,
    mixCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    numOrSpecial: /\d/.test(password) || /[^A-Za-z0-9]/.test(password),
  };
}

export function allPasswordRequirementsMet(r: PasswordRequirements): boolean {
  return r.len8 && r.mixCase && r.numOrSpecial;
}

export function countMetRequirements(r: PasswordRequirements): number {
  return Number(r.len8) + Number(r.mixCase) + Number(r.numOrSpecial);
}
