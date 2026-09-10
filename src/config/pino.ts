import { RequestMethod } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Params } from 'nestjs-pino';

export function createPinoParams(level: string): Params {
  return {
    pinoHttp: {
      level,
      genReqId(req: IncomingMessage, res: ServerResponse) {
        const header = req.headers['x-request-id'];
        const id =
          (Array.isArray(header) ? header[0] : header)?.trim() || randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie'],
        censor: '[Redacted]',
      },
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: { colorize: true, singleLine: true },
            }
          : undefined,
    },
    exclude: [
      { method: RequestMethod.ALL, path: 'health' },
      { method: RequestMethod.ALL, path: 'metrics' },
    ],
  };
}
