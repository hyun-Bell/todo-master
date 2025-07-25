import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { UserRepository } from './repositories/user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  providers: [UsersService, UserRepository],
  controllers: [UsersController],
  exports: [UserRepository],
})
export class UsersModule {}
