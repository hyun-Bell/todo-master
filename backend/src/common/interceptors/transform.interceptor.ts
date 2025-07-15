import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data: T) => {
        const response = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>();
        return {
          statusCode: response.statusCode,
          message: '요청이 성공적으로 처리되었습니다.',
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
