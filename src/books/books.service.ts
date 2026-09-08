import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { bookInclude, toBookResponse } from './books.mapper';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const books = await this.prisma.book.findMany({
      include: bookInclude,
      orderBy: { title: 'asc' },
    });

    return books.map(toBookResponse);
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
        publishedAt: dto.publishedAt,
        authorId: dto.authorId,
        categoryId: dto.categoryId,
      },
      include: bookInclude,
    });

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
      },
      include: bookInclude,
    });

    return toBookResponse(book);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.book.delete({ where: { id } });
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
