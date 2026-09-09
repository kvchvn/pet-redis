import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { AppEnv } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import {
  BOOKS_LIST_CACHE_KEY,
  BOOKS_LIST_CACHE_MISS_DELAY_MS,
} from './books.cache';
import { bookInclude, BookResponse, toBookResponse } from './books.mapper';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async findAll() {
    const cached =
      await this.cache.getJson<BookResponse[]>(BOOKS_LIST_CACHE_KEY);

    if (cached) {
      return cached;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, BOOKS_LIST_CACHE_MISS_DELAY_MS),
    );

    const books = await this.prisma.book.findMany({
      include: bookInclude,
      orderBy: { title: 'asc' },
    });

    const response = books.map(toBookResponse);
    await this.cache.setJson(
      BOOKS_LIST_CACHE_KEY,
      response,
      this.config.get('BOOKS_CACHE_TTL_SECONDS', { infer: true }),
    );

    return response;
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: bookInclude,
    });

    if (!book) {
      throw new NotFoundException(`Book ${id} not found`);
    }

    return toBookResponse(book);
  }

  async create(dto: CreateBookDto) {
    await this.ensureAuthorExists(dto.authorId);
    await this.ensureCategoryExists(dto.categoryId);

    const book = await this.prisma.book.create({
      data: {
        title: dto.title,
        isbn: dto.isbn,
        description: dto.description,
        price: dto.price,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
        authorId: dto.authorId,
        categoryId: dto.categoryId,
      },
      include: bookInclude,
    });

    await this.invalidateListCache();

    return toBookResponse(book);
  }

  async update(id: string, dto: UpdateBookDto) {
    await this.findOne(id);

    if (dto.authorId) {
      await this.ensureAuthorExists(dto.authorId);
    }

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    const book = await this.prisma.book.update({
      where: { id },
      data: {
        ...dto,
        publishedAt:
          dto.publishedAt !== undefined ? new Date(dto.publishedAt) : undefined,
      },
      include: bookInclude,
    });

    await this.invalidateListCache();

    return toBookResponse(book);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.book.delete({ where: { id } });
    await this.invalidateListCache();
  }

  private async invalidateListCache() {
    await this.cache.del(BOOKS_LIST_CACHE_KEY);
  }

  // Manual check to show more detailed error message
  private async ensureAuthorExists(authorId: string) {
    const author = await this.prisma.author.findUnique({
      where: { id: authorId },
    });

    if (!author) {
      throw new BadRequestException(`Author ${authorId} not found`);
    }
  }

  // Manual check to show more detailed error message
  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new BadRequestException(`Category ${categoryId} not found`);
    }
  }
}
