import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnifiedAuthGuard } from './guards/unified-auth.guard';
import { StrategicAuthGuard } from './guards/strategic-auth.guard';
import { AuthenticationService } from './services/authentication.service';
import { TokenService } from './services/token.service';
import { IAuthProvider } from './interfaces/auth-provider.interface';
import { SupabaseAuthProvider } from './providers/supabase-auth.provider';
import { JwtAuthProvider } from './providers/jwt-auth.provider';

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
    // 환경별 AuthProvider 주입
    {
      provide: 'AUTH_PROVIDER',
      useFactory: (
        configService: ConfigService,
        prisma: PrismaService,
        supabaseService: SupabaseService,
        tokenService: TokenService,
      ): IAuthProvider => {
        const environment = configService.get('NODE_ENV');
        
        if (environment === 'test' || environment === 'development') {
          return new JwtAuthProvider(prisma, tokenService);
        }
        
        return new SupabaseAuthProvider(prisma, supabaseService, tokenService);
      },
      inject: [ConfigService, PrismaService, SupabaseService, TokenService],
    },
    // StrategicAuthGuard 등록 (APP_GUARD에서 사용)
    StrategicAuthGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService, 
    AuthenticationService, 
    UnifiedAuthGuard,
    StrategicAuthGuard, 
    'AUTH_PROVIDER', 
    JwtModule,
    TokenService,
  ],
})
export class AuthModule {}
