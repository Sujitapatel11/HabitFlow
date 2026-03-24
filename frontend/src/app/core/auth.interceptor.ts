import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);

  // Attach Bearer token if we have one in memory (dev proxy mode)
  // Also always send cookies for HTTP-only cookie mode (production)
  const token = auth.accessToken;
  const credReq = req.clone({
    withCredentials: true,
    ...(token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
  });

  return next(credReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // On 401, attempt one silent token refresh then retry
      if (err.status === 401 && !req.url.includes('/auth/refresh') && !isRefreshing) {
        isRefreshing = true;

        return auth.refreshToken().pipe(
          switchMap(() => {
            isRefreshing = false;
            // Retry with new token
            const newToken = auth.accessToken;
            const retryReq = req.clone({
              withCredentials: true,
              ...(newToken ? { setHeaders: { Authorization: `Bearer ${newToken}` } } : {}),
            });
            return next(retryReq);
          }),
          catchError(() => {
            isRefreshing = false;
            auth.clearSession();
            return throwError(() => new HttpErrorResponse({ status: 401 }));
          })
        );
      }
      return throwError(() => err);
    })
  );
};
