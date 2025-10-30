/**
 * Base Repository
 * Common database operations
 */

import Database from 'better-sqlite3';

export abstract class BaseRepository {
  constructor(protected db: Database.Database) {}

  protected toTimestamp(date: Date | string): number {
    return typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  }

  protected fromTimestamp(timestamp: number | null): Date | null {
    return timestamp ? new Date(timestamp) : null;
  }

  protected serializeJson<T>(obj: T): string {
    return JSON.stringify(obj);
  }

  protected deserializeJson<T>(json: string | null): T | null {
    return json ? JSON.parse(json) : null;
  }

  protected serializeArray(arr: string[]): string {
    return JSON.stringify(arr);
  }

  protected deserializeArray(json: string | null): string[] {
    return json ? JSON.parse(json) : [];
  }
}
