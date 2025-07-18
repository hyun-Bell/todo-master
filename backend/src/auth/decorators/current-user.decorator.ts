import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface CurrentUser {
  userId: string;
  email: string;
  fullName?: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
