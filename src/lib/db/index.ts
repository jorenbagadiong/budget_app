import type { IBudgetStorage } from './types';
import { MockStorageAdapter } from './mock-storage';
import { AppsScriptClient } from './apps-script-client';

// Global singleton instances to preserve in-memory state across Next.js dev server requests
declare global {
  // eslint-disable-next-line no-var
  var __budgetStorageInstance: IBudgetStorage | undefined;
}

export function getStorage(): IBudgetStorage {
  if (global.__budgetStorageInstance) {
    return global.__budgetStorageInstance;
  }

  const useMock = process.env.USE_MOCK_STORAGE === 'true' || !process.env.APPS_SCRIPT_URL;

  let instance: IBudgetStorage;
  if (useMock) {
    instance = new MockStorageAdapter();
  } else {
    instance = new AppsScriptClient();
  }

  global.__budgetStorageInstance = instance;
  return instance;
}

export * from './types';
