import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { StoreProvider } from '../store/interface.ts';

export function createConfigTools(store: StoreProvider) {
  const configTool = createTool({
    id: 'get-config',
    description: 'Get a global configuration value by key.',
    inputSchema: z.object({
      key: z.string().describe('The configuration key to read.')
    }),
    execute: async (inputData) => {
      const value = await store.getConfig(inputData.key);
      if (value === null) {
        return { error: `Config key '${inputData.key}' not found` };
      }
      return { key: inputData.key, value };
    }
  });

  const setConfigTool = createTool({
    id: 'set-config',
    description: 'Set a global configuration value.',
    inputSchema: z.object({
      key: z.string().describe('The configuration key.'),
      value: z.string().describe('The value to store.')
    }),
    execute: async (inputData) => {
      await store.setConfig(inputData.key, inputData.value);
      return { success: true, message: `Config '${inputData.key}' updated` };
    }
  });

  return { configTool, setConfigTool };
}