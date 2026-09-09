export type BookEventType = 'book.created' | 'book.updated' | 'book.deleted';

export type BookEvent = {
  type: BookEventType;
  bookId: string;
  at: string;
};

export type BookJournalEvent = BookEvent & {
  id: string;
};

export type BookEventsJournal = {
  events: BookJournalEvent[];
};

const BOOK_EVENT_TYPES: readonly BookEventType[] = [
  'book.created',
  'book.updated',
  'book.deleted',
];

export function isBookEvent(value: unknown): value is BookEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const event = value as Record<string, unknown>;

  return (
    typeof event.type === 'string' &&
    (BOOK_EVENT_TYPES as readonly string[]).includes(event.type) &&
    typeof event.bookId === 'string' &&
    typeof event.at === 'string'
  );
}
