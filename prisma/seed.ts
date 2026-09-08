import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

type Catalog = {
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

const prisma = new PrismaClient();

async function main() {
  const catalog = JSON.parse(
    readFileSync(join(__dirname, 'data', 'catalog.json'), 'utf8'),
  ) as Catalog;

  for (const category of catalog.categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: { name: category.name },
    });
  }

  for (const author of catalog.authors) {
    await prisma.author.upsert({
      where: { name: author.name },
      create: author,
      update: { bio: author.bio },
    });
  }

  for (const book of catalog.books) {
    const author = await prisma.author.findUniqueOrThrow({
      where: { name: book.author },
    });
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: book.category },
    });

    await prisma.book.upsert({
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
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
