type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = [
  'token',
  'secret',
  'password',
  'apikey',
  'api_key',
  'authorization',
  'auth',
  'credential',
  'private',
];

function redactValue(key: string, value: unknown): unknown {
  const lowerKey = key.toLowerCase();

  for (const sensitiveKey of SENSITIVE_KEYS) {
    if (lowerKey.includes(sensitiveKey)) {
      return '[REDACTED]';
    }
  }

  return value;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === 'object'
          ? redactObject(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = redactValue(key, value);
    }
  }

  return result;
}

function formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (data) {
    const redacted = redactObject(data);
    return `${prefix} ${message} ${JSON.stringify(redacted)}`;
  }

  return `${prefix} ${message}`;
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', message, data));
    }
  },

  info(message: string, data?: Record<string, unknown>) {
    console.info(formatMessage('info', message, data));
  },

  warn(message: string, data?: Record<string, unknown>) {
    console.warn(formatMessage('warn', message, data));
  },

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>) {
    const errorData = {
      ...data,
      error: error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error,
    };
    console.error(formatMessage('error', message, errorData));
  },
};
