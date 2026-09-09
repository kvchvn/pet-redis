import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  Sse,
} from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { map, Observable } from 'rxjs';
import { EventsService } from '../events/events.service';
import { BookEventsJournal } from '../events/events.types';
import { BOOKS_LIST_CACHE_HEADER } from './books.cache';
import { BooksService } from './books.service';
import {
  CreateBookDto,
  ListBookEventsQueryDto,
  UpdateBookDto,
} from './dto/book.dto';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly events: EventsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all books with author and category',
    description: 'Sets X-Cache to HIT or MISS for the Redis list cache.',
  })
  async findAll(@Res({ passthrough: true }) res: Response) {
    const { books, cache } = await this.booksService.findAll();
    res.setHeader(BOOKS_LIST_CACHE_HEADER, cache);
    return books;
  }

  @Get('events')
  @ApiOperation({
    summary: 'List recent book events from the Redis Stream journal',
    description:
      'Newest first. Survives API restart. Query limit defaults to 20, max 100.',
  })
  async listEvents(
    @Query() query: ListBookEventsQueryDto,
  ): Promise<BookEventsJournal> {
    return { events: await this.events.list(query.limit) };
  }

  @Sse('events/live')
  @ApiProduces('text/event-stream')
  @ApiOperation({
    summary: 'Subscribe to live book events',
    description:
      'Server-Sent Events stream. The connection stays open; each book create/update/delete arrives as `data: {...}`. History is not replayed — use GET /books/events for the journal.',
  })
  live(): Observable<MessageEvent> {
    return this.events.live().pipe(map((data) => ({ data })));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a book by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.booksService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a book' })
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a book' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a book' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.booksService.remove(id);
  }
}
