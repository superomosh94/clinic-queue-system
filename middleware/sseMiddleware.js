/**
 * Server-Sent Events (SSE) middleware for real-time updates
 */
const { log } = require('../utils/helpers');

// Store connected clients
const clients = new Map();

class SSEMiddleware {
  /**
   * Initialize SSE connection
   */
  static initialize(req, res) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Send initial comment to establish connection
    res.write(': SSE Connection Established\n\n');
    
    // Store client connection
    const clientId = Date.now();
    clients.set(clientId, res);
    
    log(`SSE client connected: ${clientId}`, 'info');
    
    // Remove client on disconnect
    req.on('close', () => {
      clients.delete(clientId);
      log(`SSE client disconnected: ${clientId}`, 'info');
    });
    
    // Send keep-alive every 15 seconds
    const keepAlive = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': keep-alive\n\n');
      } else {
        clearInterval(keepAlive);
      }
    }, 15000);
    
    return clientId;
  }
  
  /**
   * Send event to all connected clients
   */
  static broadcast(event, data) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    
    clients.forEach((res, clientId) => {
      try {
        if (!res.writableEnded) {
          res.write(message);
        } else {
          clients.delete(clientId);
        }
      } catch (error) {
        log(`Error sending SSE to client ${clientId}: ${error.message}`, 'error');
        clients.delete(clientId);
      }
    });
  }
  
  /**
   * Send event to specific client
   */
  static sendToClient(clientId, event, data) {
    const client = clients.get(clientId);
    if (client && !client.writableEnded) {
      try {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        client.write(message);
        return true;
      } catch (error) {
        log(`Error sending SSE to client ${clientId}: ${error.message}`, 'error');
        clients.delete(clientId);
        return false;
      }
    }
    return false;
  }
  
  /**
   * Get connected clients count
   */
  static getClientCount() {
    return clients.size;
  }
  
  /**
   * Close all connections
   */
  static closeAll() {
    clients.forEach((res, clientId) => {
      try {
        res.end();
      } catch (error) {
        // Ignore errors on close
      }
    });
    clients.clear();
  }
}

module.exports = SSEMiddleware;