import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '회원가입 성공',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '이미 존재하는 이메일',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '로그인 성공',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '이메일 또는 비밀번호가 올바르지 않습니다.',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '토큰 갱신 성공',
  })
  async refresh(
    @CurrentUser() user: CurrentUser,
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.authService.refreshToken(user.userId, refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '로그아웃 성공',
  })
  async logout(@CurrentUser() user: CurrentUser) {
    await this.authService.logout(user.userId);
    return { message: '로그아웃되었습니다.' };
  }

  @Get('profile')
  @ApiOperation({ summary: '사용자 프로필 조회' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '프로필 조회 성공',
  })
  async getProfile(@CurrentUser() user: CurrentUser) {
    return this.authService.getUserProfile(user.userId);
  }
}
