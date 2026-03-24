import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  // Always send cookies with every request to the API
  const credReq = req.clone({ withCredentials: true });

  return next(credReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // On 401, attempt one silent token refresh then retry
      if (err.status === 401 && !req.url.includes('/auth/refresh') && !isRefreshing) {
        isRefreshing = true;
        const auth = inject(AuthService);

        return auth.refreshToken().pipe(
          switchMap(() => {
            isRefreshing = false;
            return next(credReq);
          }),
          catchError(() => {
            isRefreshing = false;
            // Refresh failed — session is dead, redirect to login
            auth.clearSession();
            return throwError(() => new HttpErrorResponse({ status: 401 }));
          })
        );
      }
      return throwError(() => err);
    })
  );
};
