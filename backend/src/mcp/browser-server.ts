/**
 * Browser MCP Server - Provides web browsing capabilities with screenshot streaming
 */
import {
  MCPServerPlugin,
  PluginContext,
  MCPToolDefinition,
  MCPToolResult,
} from '@mosaic/shared';
import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface BrowserSession {
  id: string;
  browser: Browser;
  page: Page;
  agentId?: string;
  createdAt: Date;
  lastActivityAt: Date;
}

export class BrowserMCPServer implements MCPServerPlugin {
  name = 'browser';
  version = '1.0.0';
  type: 'mcp-server' = 'mcp-server';

  metadata = {
    author: 'Project Mosaic',
    description: 'Provides web browsing capabilities with screenshot streaming',
    license: 'MIT',
  };

  private sessions: Map<string, BrowserSession> = new Map();
  private context?: PluginContext;
  private screenshotsDir: string;
  private maxSessions = 5;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  constructor(screenshotsDir?: string) {
    this.screenshotsDir = screenshotsDir || path.join(process.cwd(), 'storage', 'screenshots');
  }

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    // Ensure screenshots directory exists
    await fs.mkdir(this.screenshotsDir, { recursive: true });

    // Start session cleanup interval
    this.startSessionCleanup();

    context.logger.info('Browser MCP server initialized', {
      screenshotsDir: this.screenshotsDir,
      maxSessions: this.maxSessions,
    });
  }

  async shutdown(): Promise<void> {
    this.context?.logger.info('Browser MCP server shutting down');

    // Close all browser sessions
    for (const [sessionId, session] of this.sessions) {
      try {
        await session.browser.close();
        this.context?.logger.debug('Closed browser session', { sessionId });
      } catch (error) {
        this.context?.logger.error('Error closing browser session', { sessionId, error });
      }
    }

    this.sessions.clear();
  }

  getTools(): MCPToolDefinition[] {
    return [
      {
        name: 'navigate_to',
        description: 'Navigate to a URL and capture a screenshot',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to navigate to',
            },
            sessionId: {
              type: 'string',
              description: 'Optional: Browser session ID to reuse',
            },
            waitFor: {
              type: 'number',
              description: 'Optional: Milliseconds to wait after page load (default: 1000)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'capture_screenshot',
        description: 'Capture a screenshot of the current page',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Browser session ID',
            },
            fullPage: {
              type: 'boolean',
              description: 'Capture full page or just viewport (default: false)',
            },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'click_element',
        description: 'Click an element on the page by CSS selector',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Browser session ID',
            },
            selector: {
              type: 'string',
              description: 'CSS selector of the element to click',
            },
            waitAfter: {
              type: 'number',
              description: 'Optional: Milliseconds to wait after click (default: 500)',
            },
          },
          required: ['sessionId', 'selector'],
        },
      },
      {
        name: 'type_text',
        description: 'Type text into an input field by CSS selector',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Browser session ID',
            },
            selector: {
              type: 'string',
              description: 'CSS selector of the input element',
            },
            text: {
              type: 'string',
              description: 'Text to type',
            },
            clearFirst: {
              type: 'boolean',
              description: 'Clear existing text first (default: true)',
            },
          },
          required: ['sessionId', 'selector', 'text'],
        },
      },
      {
        name: 'get_page_content',
        description: 'Extract text content from the current page',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Browser session ID',
            },
            selector: {
              type: 'string',
              description: 'Optional: CSS selector to extract content from specific element',
            },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'evaluate_js',
        description: 'Execute JavaScript in the browser context',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Browser session ID',
            },
            script: {
              type: 'string',
              description: 'JavaScript code to execute',
            },
          },
          required: ['sessionId', 'script'],
        },
      },
      {
        name: 'close_session',
        description: 'Close a browser session',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Browser session ID to close',
            },
          },
          required: ['sessionId'],
        },
      },
    ];
  }

  async invokeTool(name: string, params: any): Promise<MCPToolResult> {
    try {
      this.context?.logger.debug('Invoking browser tool', { name, params });

      switch (name) {
        case 'navigate_to':
          return await this.navigateTo(params.url, params.sessionId, params.waitFor);

        case 'capture_screenshot':
          return await this.captureScreenshot(params.sessionId, params.fullPage);

        case 'click_element':
          return await this.clickElement(params.sessionId, params.selector, params.waitAfter);

        case 'type_text':
          return await this.typeText(
            params.sessionId,
            params.selector,
            params.text,
            params.clearFirst
          );

        case 'get_page_content':
          return await this.getPageContent(params.sessionId, params.selector);

        case 'evaluate_js':
          return await this.evaluateJS(params.sessionId, params.script);

        case 'close_session':
          return await this.closeSession(params.sessionId);

        default:
          return {
            success: false,
            error: `Unknown tool: ${name}`,
          };
      }
    } catch (error: any) {
      this.context?.logger.error('Tool invocation failed', { name, error });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async navigateTo(
    url: string,
    sessionId?: string,
    waitFor: number = 1000
  ): Promise<MCPToolResult> {
    let session: BrowserSession;

    // Reuse existing session or create new one
    if (sessionId && this.sessions.has(sessionId)) {
      session = this.sessions.get(sessionId)!;
    } else {
      session = await this.createSession();
    }

    // Navigate to URL
    await session.page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for additional rendering
    if (waitFor > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitFor));
    }

    session.lastActivityAt = new Date();

    // Capture screenshot automatically
    const screenshotResult = await this.captureScreenshot(session.id, false);

    return {
      success: true,
      data: {
        sessionId: session.id,
        url,
        title: await session.page.title(),
        screenshot: screenshotResult.data,
        message: 'Navigation successful',
      },
    };
  }

  private async captureScreenshot(
    sessionId: string,
    fullPage: boolean = false
  ): Promise<MCPToolResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Invalid session ID',
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const screenshotId = uuidv4();
    const filename = `screenshot_${screenshotId}_${timestamp}.png`;
    const filepath = path.join(this.screenshotsDir, filename);

    // Capture screenshot
    const screenshotBuffer = await session.page.screenshot({
      fullPage,
      type: 'png',
    });

    // Save to disk
    await fs.writeFile(filepath, screenshotBuffer);

    // Convert to base64 for immediate transmission
    const base64Screenshot = screenshotBuffer.toString('base64');

    session.lastActivityAt = new Date();

    // Emit event for real-time streaming to frontend
    await this.context?.eventBus.publish('screenshot.captured', {
      id: screenshotId,
      type: 'screenshot.captured',
      source: 'browser-mcp-server',
      timestamp: new Date().toISOString(),
      data: {
        sessionId: session.id,
        agentId: session.agentId,
        screenshotId,
        filename,
        filepath,
        base64: base64Screenshot,
        timestamp,
        url: session.page.url(),
        title: await session.page.title(),
        fullPage,
      },
    });

    this.context?.logger.info('Screenshot captured', {
      sessionId,
      screenshotId,
      filename,
      fullPage,
    });

    return {
      success: true,
      data: {
        screenshotId,
        filename,
        filepath,
        base64: base64Screenshot,
        url: session.page.url(),
        timestamp,
      },
    };
  }

  private async clickElement(
    sessionId: string,
    selector: string,
    waitAfter: number = 500
  ): Promise<MCPToolResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Invalid session ID',
      };
    }

    await session.page.waitForSelector(selector, { timeout: 5000 });
    await session.page.click(selector);

    if (waitAfter > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitAfter));
    }

    session.lastActivityAt = new Date();

    // Auto-capture screenshot after interaction
    const screenshotResult = await this.captureScreenshot(sessionId, false);

    return {
      success: true,
      data: {
        selector,
        screenshot: screenshotResult.data,
        message: 'Element clicked successfully',
      },
    };
  }

  private async typeText(
    sessionId: string,
    selector: string,
    text: string,
    clearFirst: boolean = true
  ): Promise<MCPToolResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Invalid session ID',
      };
    }

    await session.page.waitForSelector(selector, { timeout: 5000 });

    if (clearFirst) {
      await session.page.click(selector, { clickCount: 3 }); // Select all
      await session.page.keyboard.press('Backspace');
    }

    await session.page.type(selector, text);

    session.lastActivityAt = new Date();

    // Auto-capture screenshot after interaction
    const screenshotResult = await this.captureScreenshot(sessionId, false);

    return {
      success: true,
      data: {
        selector,
        text,
        screenshot: screenshotResult.data,
        message: 'Text typed successfully',
      },
    };
  }

  private async getPageContent(
    sessionId: string,
    selector?: string
  ): Promise<MCPToolResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Invalid session ID',
      };
    }

    let content: string;

    if (selector) {
      content = await session.page.$eval(selector, (el) => el.textContent || '');
    } else {
      // @ts-ignore - document is available in browser context
      content = await session.page.evaluate(() => document.body.innerText);
    }

    session.lastActivityAt = new Date();

    return {
      success: true,
      data: {
        content,
        url: session.page.url(),
        title: await session.page.title(),
      },
    };
  }

  private async evaluateJS(sessionId: string, script: string): Promise<MCPToolResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Invalid session ID',
      };
    }

    const result = await session.page.evaluate(script);

    session.lastActivityAt = new Date();

    return {
      success: true,
      data: {
        result,
        url: session.page.url(),
      },
    };
  }

  private async closeSession(sessionId: string): Promise<MCPToolResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Invalid session ID',
      };
    }

    await session.browser.close();
    this.sessions.delete(sessionId);

    this.context?.logger.info('Browser session closed', { sessionId });

    return {
      success: true,
      data: {
        sessionId,
        message: 'Session closed successfully',
      },
    };
  }

  private async createSession(): Promise<BrowserSession> {
    // Check max sessions limit
    if (this.sessions.size >= this.maxSessions) {
      // Close oldest session
      const oldestSession = Array.from(this.sessions.values()).sort(
        (a, b) => a.lastActivityAt.getTime() - b.lastActivityAt.getTime()
      )[0];

      await this.closeSession(oldestSession.id);
    }

    // Launch new browser instance
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    const session: BrowserSession = {
      id: uuidv4(),
      browser,
      page,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.sessions.set(session.id, session);

    this.context?.logger.info('Created new browser session', {
      sessionId: session.id,
      totalSessions: this.sessions.size,
    });

    return session;
  }

  private startSessionCleanup(): void {
    // Check for stale sessions every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const staleSessionIds: string[] = [];

      for (const [sessionId, session] of this.sessions) {
        if (now - session.lastActivityAt.getTime() > this.sessionTimeout) {
          staleSessionIds.push(sessionId);
        }
      }

      for (const sessionId of staleSessionIds) {
        this.closeSession(sessionId).catch((error) => {
          this.context?.logger.error('Error closing stale session', { sessionId, error });
        });
      }

      if (staleSessionIds.length > 0) {
        this.context?.logger.info('Cleaned up stale browser sessions', {
          count: staleSessionIds.length,
        });
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Associate a session with an agent
   */
  public setAgentId(sessionId: string, agentId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.agentId = agentId;
    }
  }
}
