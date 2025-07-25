import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: '사용자 ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    description: '사용자 이메일',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

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
