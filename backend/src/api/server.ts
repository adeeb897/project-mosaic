/**
 * API Server - Express server with REST API and WebSocket support
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { EventBus } from '../core/event-bus';
import { TaskManager } from '../services/task/task-manager.service';
import { SessionManager } from '../services/session/session-manager.service';
import { MemoryManager } from '../services/memory/memory-manager.service';
import { LLMProviderPlugin, MCPServerPlugin } from '@mosaic/shared';
import { createAgentRoutes } from './routes/agent.routes';
import { createTaskRoutes } from './routes/task.routes';
import { createSessionRoutes } from './routes/session.routes';
import { createMemoryRoutes } from './routes/memory.routes';
import { logger } from '../core/logger';

export interface ServerConfig {
  port?: number;
  cors?: {
    origin?: string | string[];
  };
}

export class APIServer {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private io: SocketIOServer;
  private eventBus: EventBus;
  private taskManager: TaskManager;
  private sessionManager: SessionManager;
  private memoryManager: MemoryManager;
  private llmProvider: LLMProviderPlugin;
  private mcpServers: MCPServerPlugin[];
  private config: ServerConfig;

  constructor(
    eventBus: EventBus,
    taskManager: TaskManager,
    sessionManager: SessionManager,
    memoryManager: MemoryManager,
    llmProvider: LLMProviderPlugin,
    mcpServers: MCPServerPlugin[],
    config: ServerConfig = {}
  ) {
    this.eventBus = eventBus;
    this.taskManager = taskManager;
    this.sessionManager = sessionManager;
    this.memoryManager = memoryManager;
    this.llmProvider = llmProvider;
    this.mcpServers = mcpServers;
    this.config = config;

    // Initialize Express
    this.app = express();
    this.httpServer = createServer(this.app);

    // Initialize Socket.IO
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: config.cors?.origin || '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware() {
    // CORS
    this.app.use(
      cors({
        origin: this.config.cors?.origin || '*',
      })
    );

    // JSON body parser
    this.app.use(express.json());

    // Request logging
    this.app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path}`, {
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
      });
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    });

    // API routes
    this.app.use('/api/agents', createAgentRoutes(
      this.taskManager,
      this.sessionManager,
      this.llmProvider,
      this.mcpServers
    ));
    this.app.use('/api/tasks', createTaskRoutes(this.taskManager));
    this.app.use('/api/sessions', createSessionRoutes(this.sessionManager));
    this.app.use('/api', createMemoryRoutes(this.memoryManager));

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
      });
    });

    // Error handler
    this.app.use(
      (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        logger.error('API error', { error: err.message, stack: err.stack });
        res.status(500).json({
          success: false,
          error: err.message,
        });
      }
    );
  }

  private setupWebSocket() {
    this.io.on('connection', (socket) => {
      logger.info('Client connected', { socketId: socket.id });

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to Project Mosaic',
        timestamp: new Date().toISOString(),
      });

      // Subscribe to all events and forward to clients
      const unsubscribers: Array<() => void> = [];

      // Task events
      unsubscribers.push(
        this.eventBus.subscribe('task.created', (event) => {
          socket.emit('task:created', event.data);
        })
      );

      unsubscribers.push(
        this.eventBus.subscribe('task.updated', (event) => {
          socket.emit('task:updated', event.data);
        })
      );

      // Agent events
      unsubscribers.push(
        this.eventBus.subscribe('agent.started', (event) => {
          socket.emit('agent:started', event.data);
        })
      );

      unsubscribers.push(
        this.eventBus.subscribe('agent.stopped', (event) => {
          socket.emit('agent:stopped', event.data);
        })
      );

      unsubscribers.push(
        this.eventBus.subscribe('agent.progress', (event) => {
          socket.emit('agent:progress', event.data);
        })
      );

      unsubscribers.push(
        this.eventBus.subscribe('agent.error', (event) => {
          socket.emit('agent:error', event.data);
        })
      );

      unsubscribers.push(
        this.eventBus.subscribe('agent.completed', (event) => {
          socket.emit('agent:completed', event.data);
        })
      );

      // Action events
      unsubscribers.push(
        this.eventBus.subscribe('action.recorded', (event) => {
          socket.emit('action:recorded', event.data);
        })
      );

      unsubscribers.push(
        this.eventBus.subscribe('action.completed', (event) => {
          socket.emit('action:completed', event.data);
        })
      );

      // Screenshot events
      unsubscribers.push(
        this.eventBus.subscribe('screenshot.captured', (event) => {
          socket.emit('screenshot:captured', event.data);
        })
      );

      // Cleanup on disconnect
      socket.on('disconnect', () => {
        logger.info('Client disconnected', { socketId: socket.id });
        unsubscribers.forEach((unsub) => unsub());
      });
    });
  }

  async start(): Promise<void> {
    const port = this.config.port || 3000;

    return new Promise((resolve) => {
      this.httpServer.listen(port, () => {
        logger.info(`🚀 API Server started on port ${port}`);
        logger.info(`   REST API: http://localhost:${port}/api`);
        logger.info(`   WebSocket: ws://localhost:${port}`);
        logger.info(`   Health check: http://localhost:${port}/health`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        this.httpServer.close(() => {
          logger.info('API Server stopped');
          resolve();
        });
      });
    });
  }
}
