import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnifiedAuthGuard } from './guards/unified-auth.guard';
import { AuthenticationService } from './services/authentication.service';
import { TokenService } from './services/token.service';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'test-secret'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    AuthenticationService,
    TokenService,
    UnifiedAuthGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, AuthenticationService, UnifiedAuthGuard, JwtModule],
})
export class AuthModule {}
