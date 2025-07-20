import { Test, type TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UserRepository } from './repositories/user.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { type CreateUserDto } from './dto/create-user.dto';

const mockUserRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdWithGoals: jest.fn(),
  findByEmail: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  existsByEmail: jest.fn(),
};

describe('UsersService 사용자 서비스', () => {
  let service: UsersService;
  let userRepository: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<UserRepository>(UserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create 사용자 생성', () => {
    const createUserDto: CreateUserDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      fullName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    it('새로운 사용자를 성공적으로 생성해야 함', async () => {
      const mockUser = {
        ...createUserDto,
        fullName: createUserDto.fullName || '',
        avatarUrl: createUserDto.avatarUrl || '',
        supabaseId: null,
        refreshToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        createUserDto.email,
      );
      expect(userRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
        }),
      );
    });

    it('이메일이 이미 존재하면 ConflictException을 발생시켜야 함', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'existing-id',
        email: createUserDto.email,
        fullName: '',
        avatarUrl: '',
        supabaseId: null,
        refreshToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findOne 사용자 단건 조회', () => {
    it('사용자가 존재하지 않으면 NotFoundException을 발생시켜야 함', async () => {
      mockUserRepository.findByIdWithGoals.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update 사용자 수정', () => {
    it('사용자가 존재하지 않으면 NotFoundException을 발생시켜야 함', async () => {
      const updateUserDto = { fullName: 'Updated User' };
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateUserDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove 사용자 삭제', () => {
    it('사용자가 존재하지 않으면 NotFoundException을 발생시켜야 함', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
