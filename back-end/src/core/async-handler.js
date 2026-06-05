/**
 * Wraps async Express handlers so rejections reach centralized error middleware.
 * @template {import('express').Request} Req
 * @template {import('express').Response} Res
 * @template {import('express').NextFunction} Next
 * @param {(req: Req, res: Res, next: Next) => Promise<unknown>} fn
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
