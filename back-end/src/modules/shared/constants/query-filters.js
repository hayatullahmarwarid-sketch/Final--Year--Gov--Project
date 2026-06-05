/** Default filter for domain reads — prefer composing with `{ ...excludeDeleted }`. */
export const excludeDeleted = Object.freeze({ isDeleted: { $ne: true } });
