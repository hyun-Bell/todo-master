import { type Prisma } from '../../../generated/prisma';
import { type PrismaService } from '../../prisma/prisma.service';

export interface IBaseRepository<
  T,
  CreateDto,
  UpdateDto,
  FilterDto = Record<string, unknown>,
> {
  create(data: CreateDto): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(filter?: FilterDto): Promise<T[]>;
  update(id: string, data: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
  transaction<R>(fn: (tx: Prisma.TransactionClient) => Promise<R>): Promise<R>;
}

export abstract class BaseRepository<
  T,
  CreateDto,
  UpdateDto,
  FilterDto = Record<string, unknown>,
> implements IBaseRepository<T, CreateDto, UpdateDto, FilterDto>
{
  constructor(protected readonly prisma: PrismaService) {}

  abstract create(data: CreateDto): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(filter?: FilterDto): Promise<T[]>;
  abstract update(id: string, data: UpdateDto): Promise<T>;
  abstract delete(id: string): Promise<void>;

  /**
   * 트랜잭션 실행
   * @param fn 트랜잭션 내에서 실행할 함수
   * @returns 트랜잭션 결과
   */
  async transaction<R>(
    fn: (tx: Prisma.TransactionClient) => Promise<R>,
  ): Promise<R> {
    return this.prisma.$transaction(fn);
  }

  /**
   * 여러 작업을 하나의 트랜잭션으로 실행
   * @param operations 실행할 작업들
   * @returns 트랜잭션 결과 배열
   */
  async batchTransaction<R>(
    operations: Array<(tx: Prisma.TransactionClient) => Promise<R>>,
  ): Promise<R[]> {
    return this.prisma.$transaction(async (tx) => {
      const results: R[] = [];
      for (const operation of operations) {
        results.push(await operation(tx));
      }
      return results;
    });
  }
}
