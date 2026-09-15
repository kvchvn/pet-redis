import { PrismaClient } from '@prisma/client';

export type Catalog = {
  categories: { name: string; slug: string }[];
  authors: { name: string; bio: string }[];
  books: {
    title: string;
    isbn: string;
    description: string;
    price: number;
    publishedAt: string;
    author: string;
    category: string;
  }[];
};

export async function seedCatalog(
  prisma: PrismaClient,
  catalog: Catalog,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const category of catalog.categories) {
      await tx.category.upsert({
        where: { slug: category.slug },
        create: category,
        update: { name: category.name },
      });
    }

    for (const author of catalog.authors) {
      await tx.author.upsert({
        where: { name: author.name },
        create: author,
        update: { bio: author.bio },
      });
    }

    for (const book of catalog.books) {
      const author = await tx.author.findUniqueOrThrow({
        where: { name: book.author },
      });
      const category = await tx.category.findUniqueOrThrow({
        where: { slug: book.category },
      });

      await tx.book.upsert({
        where: { isbn: book.isbn },
        create: {
          title: book.title,
          isbn: book.isbn,
          description: book.description,
          price: book.price,
          publishedAt: new Date(book.publishedAt),
          authorId: author.id,
          categoryId: category.id,
        },
        update: {
          title: book.title,
          description: book.description,
          price: book.price,
          publishedAt: new Date(book.publishedAt),
          authorId: author.id,
          categoryId: category.id,
        },
      });
    }
  });
}
