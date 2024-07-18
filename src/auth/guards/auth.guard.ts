/*
  Free and Open Source - GNU LGPLv3
  Copyright © 2023
  Afonso Barracha
*/

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isJWT } from 'class-validator';
import { FastifyRequest } from 'fastify';
import { isNull, isUndefined } from '../../common/utils/validation.util';
import { TokenTypeEnum } from '../../jwt/enums/token-type.enum';
import { JwtService } from '../../jwt/jwt.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const activate = await this.setHttpHeader(
      context.switchToHttp().getRequest<FastifyRequest>(),
      isPublic,
    );

    if (!activate) {
      throw new UnauthorizedException();
    }

    return activate;
  }

  /**
   * Sets HTTP Header
   *
   * Checks if the header has a valid Bearer token, validates it and sets the User ID as the user.
   */
  private async setHttpHeader(
    req: FastifyRequest,
    isPublic: boolean,
  ): Promise<boolean> {
    const { cookie } = req.headers;

    if (isUndefined(cookie) || isNull(cookie) || cookie?.length === 0) {
      return isPublic;
    }

    const { access_token } = parseCookieString(cookie);

    if (
      isUndefined(access_token) ||
      isNull(access_token) ||
      access_token?.length === 0
    ) {
      return isPublic;
    }

    try {
      const { id } = await this.jwtService.verifyToken(
        access_token,
        TokenTypeEnum.ACCESS,
      );

      req.user = id;
      return true;
    } catch (_) {
      return isPublic;
    }
  }
}

function parseCookieString(cookieString): Record<string, string> {
  const cookies = cookieString.split(';');
  const cookieObj: Record<string, string> = {};

  cookies.forEach((cookie: string) => {
    const [name, value] = cookie.trim().split('=');
    cookieObj[name] = value;
  });

  return cookieObj;
}