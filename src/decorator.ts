import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const KMSClientId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.KMSClientId;
  },
);

export const KMSKeyName = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.KMSkeyName;
  },
);