import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { GoalStatus } from '../../generated/prisma';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';

@ApiTags('goals')
@ApiBearerAuth()
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
  async create(
    @CurrentUser() user: CurrentUser,
    @Body() createGoalDto: CreateGoalDto,
  ): Promise<GoalResponseDto> {
    return this.goalsService.create(user.userId, createGoalDto);
  }

  @Get()
  @ApiOperation({ summary: '내 목표 목록 조회' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '목표 목록을 반환합니다.',
    type: [GoalResponseDto],
  })
  async findAll(@CurrentUser() user: CurrentUser): Promise<GoalResponseDto[]> {
    return this.goalsService.findAll(user.userId);
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
  async findOne(@Param('id', UuidValidationPipe) id: string): Promise<GoalResponseDto> {
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
    @CurrentUser() user: CurrentUser,
    @Param('id', UuidValidationPipe) id: string,
    @Body() updateGoalDto: UpdateGoalDto,
  ): Promise<GoalResponseDto> {
    return this.goalsService.update(id, updateGoalDto, user.userId);
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
    @CurrentUser() user: CurrentUser,
    @Param('id', UuidValidationPipe) id: string,
    @Body('status') status: string,
  ): Promise<GoalResponseDto> {
    return this.goalsService.updateStatus(
      id,
      status as GoalStatus,
      user.userId,
    );
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
    @CurrentUser() user: CurrentUser,
    @Param('id', UuidValidationPipe) id: string,
  ): Promise<{ message: string }> {
    return this.goalsService.remove(id, user.userId);
  }
}
