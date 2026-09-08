import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.author.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const author = await this.prisma.author.findUnique({ where: { id } });

    if (!author) {
      throw new NotFoundException(`Author ${id} not found`);
    }

    return author;
  }
}
