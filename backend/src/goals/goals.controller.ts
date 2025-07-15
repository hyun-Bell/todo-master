import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { GoalStatus } from '../../generated/prisma';

@ApiTags('goals')
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({ summary: '새 목표 생성' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '목표가 성공적으로 생성되었습니다.',
    type: GoalResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '사용자를 찾을 수 없습니다.',
  })
  async create(@Body() createGoalDto: CreateGoalDto): Promise<GoalResponseDto> {
    return this.goalsService.create(createGoalDto);
  }

  @Get()
  @ApiOperation({ summary: '목표 목록 조회' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: '특정 사용자의 목표만 조회',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '목표 목록을 반환합니다.',
    type: [GoalResponseDto],
  })
  async findAll(@Query('userId') userId?: string): Promise<GoalResponseDto[]> {
    return this.goalsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '특정 목표 조회' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '목표 정보를 반환합니다.',
    type: GoalResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '목표를 찾을 수 없습니다.',
  })
  async findOne(@Param('id') id: string): Promise<GoalResponseDto> {
    return this.goalsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '목표 정보 수정' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '목표 정보가 수정되었습니다.',
    type: GoalResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '목표를 찾을 수 없습니다.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '권한이 없습니다.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateGoalDto: UpdateGoalDto,
  ): Promise<GoalResponseDto> {
    // 임시로 userId를 하드코딩 (추후 인증 구현 시 수정)
    const userId = updateGoalDto.userId || 'temp-user-id';
    return this.goalsService.update(id, updateGoalDto, userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '목표 상태 업데이트' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '목표 상태가 업데이트되었습니다.',
    type: GoalResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '목표를 찾을 수 없습니다.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '권한이 없습니다.',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Query('userId') userId: string,
  ): Promise<GoalResponseDto> {
    return this.goalsService.updateStatus(id, status as GoalStatus, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '목표 삭제' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '목표가 삭제되었습니다.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '목표를 찾을 수 없습니다.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '권한이 없습니다.',
  })
  async remove(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ): Promise<{ message: string }> {
    if (!userId) {
      throw new ForbiddenException('userId가 필요합니다.');
    }
    return this.goalsService.remove(id, userId);
  }
}
