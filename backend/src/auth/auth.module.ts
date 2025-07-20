import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
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
