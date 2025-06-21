// Mock the `open` package globally before imports that might load it
jest.mock('open', () => ({ default: async () => undefined }));

import WebSocket from 'ws';
import { configureExpress, startExpressServer, server } from '../src/server/express';
import { configureWebSocketServer, wss } from '../src/server/websocket';
import { freePortIfOccupied } from '../src/server/port';
import { PORT } from '../src/config';
import { solicitUserInput } from '../src/mcp/solicit-input';

describe('MCP feedback session integration', () => {
  beforeAll(async () => {
    configureExpress();
    configureWebSocketServer();
    freePortIfOccupied(PORT);
    await startExpressServer();
  });

  afterAll(async () => {
    wss.close();
    server.close();
  });

  it('should resolve feedback session with user text', async () => {

    // 1. Agent requests a feedback session before any client connects
    const feedbackPromise = solicitUserInput(process.cwd(), 'test summary');

    // Simulate the UI client connecting via WebSocket
    const wsClient = new WebSocket(`ws://localhost:${PORT}`);

    // Wait for connection open
    await new Promise<void>((resolve) => {
      wsClient.on('open', () => resolve());
    });

    // Wait until summary received before sending feedback
    await new Promise<void>((resolve) => {
      wsClient.once('message', () => resolve());
    });

    // Small delay to ensure server ready
    // small delay
    await new Promise((r)=>setTimeout(r,50));
    // Now UI submits feedback
    wsClient.send(
      JSON.stringify({
        type: 'composite_feedback',
        data: { text: 'Looks good!' },
      })
    );

    // Wait for the solicitUserInput promise to resolve
    const feedback = await feedbackPromise;
    expect(feedback).toEqual({ text: 'Looks good!' });

    wsClient.close();
  });
});
