import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Observable, Subject } from 'rxjs';
import { AppEnv } from '../config/env.validation';
import {
  BOOKS_EVENTS_CHANNEL,
  BOOKS_EVENTS_DEFAULT_LIMIT,
  BOOKS_EVENTS_MAX_LIMIT,
  BOOKS_EVENTS_MAXLEN,
  BOOKS_EVENTS_STREAM,
} from './events.constants';
import { BookEvent, BookJournalEvent, isBookEvent } from './events.types';

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private readonly command: Redis;
  private readonly subscriber: Redis;
  private readonly events$ = new Subject<BookEvent>();

  constructor(private readonly config: ConfigService<AppEnv, true>) {
    const redisUrl = this.config.get('REDIS_URL', { infer: true });
    const redisOptions = {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    };

    this.command = new Redis(redisUrl, redisOptions);
    this.subscriber = this.command.duplicate();

    this.command.on('error', (error: Error) => {
      this.logger.warn(`Redis command connection error: ${error.message}`);
    });

    this.subscriber.on('error', (error: Error) => {
      this.logger.warn(`Redis subscriber connection error: ${error.message}`);
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      this.handlePubSubMessage(channel, message);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.command.ping();
      this.logger.log('Redis events command connection ready');
    } catch (error: unknown) {
      this.logFailure('ping', error);
    }

    try {
      await this.subscriber.subscribe(BOOKS_EVENTS_CHANNEL);
      this.logger.log(`Subscribed to Pub/Sub channel ${BOOKS_EVENTS_CHANNEL}`);
    } catch (error: unknown) {
      this.logFailure('subscribe', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.events$.complete();

    await this.closeConnection(this.subscriber);
    await this.closeConnection(this.command);
  }

  async emit(input: Omit<BookEvent, 'at'>): Promise<void> {
    const event: BookEvent = {
      ...input,
      at: new Date().toISOString(),
    };

    try {
      await this.command.xadd(
        BOOKS_EVENTS_STREAM,
        'MAXLEN',
        '~',
        BOOKS_EVENTS_MAXLEN,
        '*',
        'type',
        event.type,
        'bookId',
        event.bookId,
        'at',
        event.at,
      );
      await this.command.publish(BOOKS_EVENTS_CHANNEL, JSON.stringify(event));
    } catch (error: unknown) {
      this.logFailure('emit', error);
    }
  }

  async list(limit = BOOKS_EVENTS_DEFAULT_LIMIT): Promise<BookJournalEvent[]> {
    const count = this.clampLimit(limit);

    try {
      const entries = await this.command.xrevrange(
        BOOKS_EVENTS_STREAM,
        '+',
        '-',
        'COUNT',
        count,
      );

      return entries.flatMap(([id, fields]) => {
        const event = this.toJournalEvent(id, fields);
        return event ? [event] : [];
      });
    } catch (error: unknown) {
      this.logFailure('list', error);
      throw error;
    }
  }

  live(): Observable<BookEvent> {
    return this.events$.asObservable();
  }

  private handlePubSubMessage(channel: string, message: string): void {
    this.logger.log(`Pub/Sub ${channel}: ${message}`);

    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      this.logger.warn(`Invalid Pub/Sub payload on ${channel}: ${message}`);
      return;
    }

    if (!isBookEvent(parsed)) {
      this.logger.warn(`Unexpected Pub/Sub payload on ${channel}: ${message}`);
      return;
    }

    this.events$.next(parsed);
  }

  private toJournalEvent(
    id: string,
    fields: string[],
  ): BookJournalEvent | null {
    const map = new Map<string, string>();

    for (let index = 0; index < fields.length; index += 2) {
      const key = fields[index];
      const value = fields[index + 1];
      if (key !== undefined && value !== undefined) {
        map.set(key, value);
      }
    }

    const event = {
      type: map.get('type'),
      bookId: map.get('bookId'),
      at: map.get('at'),
    };

    if (!isBookEvent(event)) {
      this.logger.warn(`Skipping malformed stream entry ${id}`);
      return null;
    }

    return { id, ...event };
  }

  private clampLimit(limit: number): number {
    if (!Number.isFinite(limit) || limit < 1) {
      return BOOKS_EVENTS_DEFAULT_LIMIT;
    }

    return Math.min(Math.floor(limit), BOOKS_EVENTS_MAX_LIMIT);
  }

  private async closeConnection(client: Redis): Promise<void> {
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  }

  private logFailure(operation: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Redis ${operation} failed: ${message}`);
  }
}
