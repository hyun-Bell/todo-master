import { ConflictException, Injectable } from '@nestjs/common';

import { validateEntityExists } from '../common/utils/auth.utils';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.userRepository.findByEmail(
      createUserDto.email,
    );

    if (existingUser) {
      throw new ConflictException('이미 존재하는 이메일입니다.');
    }

    const user = await this.userRepository.create(createUserDto);

    return new UserResponseDto(user);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return users.map((user) => new UserResponseDto(user));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findByIdWithGoals(id);

    validateEntityExists(user, '사용자');
    return new UserResponseDto(user);
  }

  async findByEmail(email: string) {
    return await this.userRepository.findByEmail(email);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto | UpdateUserProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);

    validateEntityExists(user, '사용자');

    const updatedUser = await this.userRepository.update(id, updateUserDto);

    return new UserResponseDto(updatedUser);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.userRepository.findById(id);

    validateEntityExists(user, '사용자');

    await this.userRepository.delete(id);

    return { message: '사용자가 삭제되었습니다.' };
  }
}
