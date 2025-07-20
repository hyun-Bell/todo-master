import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * 엔티티 존재 여부와 소유권을 검증하는 유틸리티 함수
 * @param entity - 검증할 엔티티
 * @param userId - 현재 사용자 ID
 * @param entityName - 엔티티 이름 (에러 메시지용)
 * @returns 검증된 엔티티
 */
export function validateEntityOwnership<T extends { userId?: string }>(
  entity: T | null,
  userId: string,
  entityName = '리소스',
): T {
  if (!entity) {
    throw new NotFoundException(`${entityName}를 찾을 수 없습니다.`);
  }

  if (entity.userId && entity.userId !== userId) {
    throw new ForbiddenException(`${entityName}에 대한 권한이 없습니다.`);
  }

  return entity;
}

/**
 * 엔티티 존재 여부만 검증하는 유틸리티 함수 (타입 가드)
 * @param entity - 검증할 엔티티
 * @param entityName - 엔티티 이름 (에러 메시지용)
 * @returns 검증된 엔티티
 */
export function validateEntityExists<T>(
  entity: T | null,
  entityName = '리소스',
): asserts entity is T {
  if (!entity) {
    throw new NotFoundException(`${entityName}를 찾을 수 없습니다.`);
  }
}
