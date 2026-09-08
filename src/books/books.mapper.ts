import { Author, Book, Category, Prisma } from '@prisma/client';

export type BookWithRelations = Book & {
  author: Author;
  category: Category;
};

// To send price as number in JSON response
export type BookResponse = Omit<Book, 'price'> & {
  price: number;
  author: Author;
  category: Category;
};

export const bookInclude: Prisma.BookInclude = {
  author: true,
  category: true,
};

export function toBookResponse(book: BookWithRelations): BookResponse {
  return {
    ...book,
    price: Number(book.price),
  };
}
