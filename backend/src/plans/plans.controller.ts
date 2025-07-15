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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanResponseDto } from './dto/plan-response.dto';
import { PlanStatus } from '../../generated/prisma';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @ApiOperation({ summary: '새 계획 생성' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '계획이 성공적으로 생성되었습니다.',
    type: PlanResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '목표를 찾을 수 없습니다.',
  })
  async create(@Body() createPlanDto: CreatePlanDto): Promise<PlanResponseDto> {
    return this.plansService.create(createPlanDto);
  }

  @Get()
  @ApiOperation({ summary: '계획 목록 조회' })
  @ApiQuery({
    name: 'goalId',
    required: false,
    description: '특정 목표의 계획만 조회',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PlanStatus,
    description: '특정 상태의 계획만 조회',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '계획 목록을 반환합니다.',
    type: [PlanResponseDto],
  })
  async findAll(
    @Query('goalId') goalId?: string,
    @Query('status') status?: PlanStatus,
  ): Promise<PlanResponseDto[]> {
    return this.plansService.findAll(goalId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: '특정 계획 조회' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '계획 정보를 반환합니다.',
    type: PlanResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '계획을 찾을 수 없습니다.',
  })
  async findOne(@Param('id') id: string): Promise<PlanResponseDto> {
    return this.plansService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '계획 정보 수정' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '계획 정보가 수정되었습니다.',
    type: PlanResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '계획을 찾을 수 없습니다.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '권한이 없습니다.',
  })
  async update(
    @Param('id') id: string,
    @Body() updatePlanDto: UpdatePlanDto,
    @Query('userId') userId: string,
  ): Promise<PlanResponseDto> {
    return this.plansService.update(id, updatePlanDto, userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '계획 상태 업데이트' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '계획 상태가 업데이트되었습니다.',
    type: PlanResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '계획을 찾을 수 없습니다.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '권한이 없습니다.',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: PlanStatus,
    @Query('userId') userId: string,
  ): Promise<PlanResponseDto> {
    return this.plansService.updateStatus(id, status, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '계획 삭제' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '계획이 삭제되었습니다.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '계획을 찾을 수 없습니다.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '권한이 없습니다.',
  })
  async remove(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ): Promise<{ message: string }> {
    return this.plansService.remove(id, userId);
  }
}
