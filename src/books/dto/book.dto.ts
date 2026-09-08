import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createBookSchema = z.object({
  title: z.string().min(1),
  isbn: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  publishedAt: z.coerce.date().optional(),
  authorId: z.uuid(),
  categoryId: z.uuid(),
});

export const updateBookSchema = createBookSchema.partial();

export class CreateBookDto extends createZodDto(createBookSchema) {}

export class UpdateBookDto extends createZodDto(updateBookSchema) {}
