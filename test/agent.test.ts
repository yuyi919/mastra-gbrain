import { test, expect } from 'bun:test';
import { gbrainAgent } from '../src/index.ts';

test('GBrain Agent is configured correctly', async () => {
  expect(gbrainAgent.id).toBe('gbrain');
  expect(gbrainAgent.name).toBe('GBrain Agent');
  
  // Test tools exist
  const tools = await gbrainAgent.listTools();
  expect(tools).toHaveProperty('searchTool');
  expect(tools).toHaveProperty('ingestTool');
});
