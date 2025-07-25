import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({
    description: '사용자 전체 이름',
    example: '홍길동',
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({
    description: '프로필 이미지 URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
