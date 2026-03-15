import { HttpInterceptorFn } from '@angular/common/http';

// No JWT in use — interceptor is a no-op
export const authInterceptor: HttpInterceptorFn = (req, next) => next(req);
