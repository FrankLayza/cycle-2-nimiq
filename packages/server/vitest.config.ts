import { defineConfig } from 'vitest/config';

// Server tests intentionally share a process-wide SQLite singleton and DB_PATH.
// Run files serially so one suite cannot swap the database under another suite.
export default defineConfig({
  test: {
    fileParallelism: false,
  },
});
