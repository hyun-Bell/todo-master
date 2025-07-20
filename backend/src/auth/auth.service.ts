import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '@supabase/supabase-js';
import { AuthenticationService } from './services/authentication.service';
import { TokenService } from './services/token.service';

/**
 * 인증 서비스의 퍼사드(Facade) 역할
 * - 하위 서비스들에 대한 단일 진입점 제공
 * - 기존 코드와의 호환성 유지
 */
@Injectable()
export class AuthService {
  constructor(
    private authenticationService: AuthenticationService,
    private tokenService: TokenService,
  ) {}

  async register(registerDto: RegisterDto) {
    return this.authenticationService.register(registerDto);
  }

  async login(loginDto: LoginDto) {
    return this.authenticationService.login(loginDto);
  }

  async refreshToken(userId: string, refreshToken: string) {
    return this.tokenService.refreshToken(userId, refreshToken);
  }

  async logout(userId: string) {
    return this.authenticationService.logout(userId);
  }

  async verifySupabaseToken(token: string): Promise<User | null> {
    return this.authenticationService.verifySupabaseToken(token);
  }

  async getUserProfile(userId: string) {
    return this.authenticationService.getUserProfile(userId);
  }
}
