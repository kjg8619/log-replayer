import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const RawEventSchema = z.object({
  id: z.string().optional(),
  sequence: z.number().int().positive().optional(),
  timestamp: z.string().min(1),
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const JsonSessionWrapperSchema = z.object({
  name: z.string().min(1).optional(),
  sessionName: z.string().min(1).optional(),
  events: z.array(RawEventSchema),
});

export type ParsedLogEvent = z.infer<typeof RawEventSchema>;

export type ParseError = {
  line: number;
  error: string;
};

export type ParseLogResult = {
  sessionName: string;
  events: ParsedLogEvent[];
  errors: ParseError[];
};

function inferSessionName(filePath?: string): string {
  if (!filePath) {
    return `Session ${new Date().toISOString()}`;
  }

  const fileName = basename(filePath);
  const extension = extname(fileName);
  return fileName.replace(extension, '') || `Session ${new Date().toISOString()}`;
}

function normalizeEvent(raw: ParsedLogEvent, fallbackSequence: number): ParsedLogEvent {
  return {
    ...raw,
    id: raw.id ?? randomUUID(),
    sequence: raw.sequence ?? fallbackSequence,
    payload: raw.payload ?? {},
  };
}

function parseJsonContent(content: string, sessionName: string): ParseLogResult {
  const errors: ParseError[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    return {
      sessionName,
      events: [],
      errors: [{ line: 1, error: (error as Error).message }],
    };
  }

  const items: unknown[] = [];
  let resolvedName = sessionName;

  if (Array.isArray(parsed)) {
    items.push(...parsed);
  } else {
    const wrapper = JsonSessionWrapperSchema.safeParse(parsed);
    if (!wrapper.success) {
      return {
        sessionName,
        events: [],
        errors: [{ line: 1, error: 'JSON must be an event array or an object with an events array' }],
      };
    }

    resolvedName = wrapper.data.name ?? wrapper.data.sessionName ?? sessionName;
    items.push(...wrapper.data.events);
  }

  const events: ParsedLogEvent[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const validated = RawEventSchema.safeParse(items[index]);
    if (!validated.success) {
      errors.push({
        line: index + 1,
        error: validated.error.issues.map((issue) => `${issue.path.join('.') || 'event'}: ${issue.message}`).join(', '),
      });
      continue;
    }

    events.push(normalizeEvent(validated.data, events.length + 1));
  }

  return { sessionName: resolvedName, events, errors };
}

function parseLineDelimitedContent(content: string, sessionName: string): ParseLogResult {
  const errors: ParseError[] = [];
  const events: ParsedLogEvent[] = [];
  const lines = content.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]?.trim();
    if (!rawLine) {
      continue;
    }

    try {
      const parsed = JSON.parse(rawLine);
      const validated = RawEventSchema.safeParse(parsed);
      if (!validated.success) {
        errors.push({
          line: index + 1,
          error: validated.error.issues.map((issue) => `${issue.path.join('.') || 'event'}: ${issue.message}`).join(', '),
        });
        continue;
      }

      events.push(normalizeEvent(validated.data, events.length + 1));
    } catch (error) {
      errors.push({ line: index + 1, error: (error as Error).message });
    }
  }

  return { sessionName, events, errors };
}

function isLikelyJsonArray(content: string): boolean {
  return content.trimStart().startsWith('[') || content.trimStart().startsWith('{');
}

export async function parseLogContent(content: string, fileNameHint?: string): Promise<ParseLogResult> {
  const sessionName = inferSessionName(fileNameHint);

  if (isLikelyJsonArray(content)) {
    const parsed = parseJsonContent(content, sessionName);
    if (parsed.events.length > 0 || !content.includes('\n')) {
      return parsed;
    }

    return parseLineDelimitedContent(content, sessionName);
  }

  return parseLineDelimitedContent(content, sessionName);
}

export async function parseLogFile(filePath: string): Promise<ParseLogResult> {
  const extension = extname(filePath).toLowerCase();

  if (extension === '.jsonl') {
    const events: ParsedLogEvent[] = [];
    const errors: ParseError[] = [];

    for await (const batch of parseLogFileStreaming(filePath, 1000)) {
      events.push(...batch);
    }

    return {
      sessionName: inferSessionName(filePath),
      events,
      errors,
    };
  }

  const content = await readFile(filePath, 'utf-8');
  return parseLogContent(content, filePath);
}

export async function* parseLogFileStreaming(
  filePath: string,
  batchSize = 1000,
): AsyncGenerator<ParsedLogEvent[], void, unknown> {
  const stream = createReadStream(filePath, { encoding: 'utf-8' });
  const reader = createInterface({ input: stream, crlfDelay: Infinity });
  const currentBatch: ParsedLogEvent[] = [];
  let parsedCount = 0;

  try {
    for await (const line of reader) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        continue;
      }

      const validated = RawEventSchema.safeParse(parsed);
      if (!validated.success) {
        continue;
      }

      parsedCount += 1;
      currentBatch.push(normalizeEvent(validated.data, parsedCount));
      if (currentBatch.length >= batchSize) {
        yield [...currentBatch];
        currentBatch.length = 0;
      }
    }

    if (currentBatch.length > 0) {
      yield [...currentBatch];
    }
  } finally {
    reader.close();
  }
}
