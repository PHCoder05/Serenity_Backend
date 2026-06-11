import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AllConfigType } from '../../config/config.type';

@Injectable()
export class PetpoojaAuthGuard implements CanActivate {
  constructor(private configService: ConfigService<AllConfigType>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    const appKey = request.headers['app-key'];
    const appSecret = request.headers['app-secret'];
    const accessToken = request.headers['access-token'];

    const expectedAppKey = this.configService.get('petpooja.appKey', { infer: true });
    const expectedAppSecret = this.configService.get('petpooja.appSecret', { infer: true });
    const expectedAccessToken = this.configService.get('petpooja.accessToken', { infer: true });

    if (!appKey || !appSecret || !accessToken) {
      throw new UnauthorizedException('Missing Petpooja authentication headers');
    }

    if (
      appKey !== expectedAppKey ||
      appSecret !== expectedAppSecret ||
      accessToken !== expectedAccessToken
    ) {
      throw new UnauthorizedException('Invalid Petpooja credentials');
    }

    return true;
  }
}
