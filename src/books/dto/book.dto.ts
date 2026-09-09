import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { BOOKS_EVENTS_MAX_LIMIT } from '../../events/events.constants';

export const createBookSchema = z.object({
  title: z.string().min(1),
  isbn: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  publishedAt: z.iso.date().optional(),
  authorId: z.uuid(),
  categoryId: z.uuid(),
});

export const updateBookSchema = createBookSchema.partial();

export const listBookEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(BOOKS_EVENTS_MAX_LIMIT).optional(),
});

export class CreateBookDto extends createZodDto(createBookSchema) {}

export class UpdateBookDto extends createZodDto(updateBookSchema) {}

export class ListBookEventsQueryDto extends createZodDto(
  listBookEventsQuerySchema,
) {}
