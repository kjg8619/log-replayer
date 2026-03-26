import express from 'express';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openSqliteDatabase, type SqliteDatabase } from './db/helper';
import { createEventsRouter } from './routes/events';
import { createSessionsRouter } from './routes/sessions';

export function createApp(db?: SqliteDatabase) {
  const database = db ?? openSqliteDatabase(join(process.cwd(), 'log-replayer.sqlite'));
  const app = express();

  app.use(express.json());
  app.use('/api/sessions', createSessionsRouter(database));
  app.use('/api/sessions', createEventsRouter(database));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  return app;
}

function isDirectExecution() {
  if (!process.argv[1]) {
    return false;
  }

  return fileURLToPath(import.meta.url) === process.argv[1];
}

if (isDirectExecution()) {
  const port = 3001;
  const app = createApp();

  app.listen(port, () => {
    console.log(`Log replayer server listening on ${port}`);
  });
}
