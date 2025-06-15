import { WebSocket } from 'ws';
import { exec } from 'child_process';
import { IncomingMessage } from 'http';

// This function handles individual WebSocket connections
export function handleSolicitInputConnection(ws: WebSocket, req: IncomingMessage) {
    console.log('Client connected');

    // Send a summary to the client upon connection
    // In a real scenario, this summary would be dynamic.
    ws.send(JSON.stringify({ type: 'summary', data: 'AI is waiting for your feedback. Please provide text, upload an image, or run a command.' }));

    ws.on('message', (message: string) => {
        try {
            const parsedMessage = JSON.parse(message);
            console.log('Received message:', parsedMessage);

            switch (parsedMessage.type) {
                case 'command':
                    if (typeof parsedMessage.data === 'string') {
                        // Execute the command and send back the output
                        exec(parsedMessage.data, (error, stdout, stderr) => {
                            if (error) {
                                ws.send(JSON.stringify({ type: 'command_result', data: `Error: ${error.message}` }));
                                return;
                            }
                            if (stderr) {
                                ws.send(JSON.stringify({ type: 'command_result', data: `Stderr: ${stderr}` }));
                                return;
                            }
                            ws.send(JSON.stringify({ type: 'command_result', data: stdout }));
                        });
                    } else {
                        ws.send(JSON.stringify({ type: 'error', data: 'Invalid command format.' }));
                    }
                    break;

                case 'composite_feedback':
                    const { text, imageData } = parsedMessage.data;
                    console.log('Composite feedback received:');
                    if (text) {
                        console.log('  Text:', text);
                    }
                    if (imageData) {
                        console.log('  Image (first 100 chars):', imageData.substring(0, 100));
                    }
                    ws.send(JSON.stringify({ type: 'info', data: 'Feedback received successfully.' }));
                    break;

                default:
                    ws.send(JSON.stringify({ type: 'error', data: 'Unknown message type.' }));
            }
        } catch (e) {
            console.error('Failed to parse message or handle it:', e);
            ws.send(JSON.stringify({ type: 'error', data: 'Invalid message format.' }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
}
