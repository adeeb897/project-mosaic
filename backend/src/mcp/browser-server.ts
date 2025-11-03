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
  private maxSessions = 5;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    // Start session cleanup interval
    this.startSessionCleanup();

    context.logger.info('Browser MCP server initialized', {
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
        name: 'find_interactive_elements',
        description: 'Discover interactive elements on the page (buttons, links, inputs, etc.) with their selectors. Use this BEFORE attempting to click or type to find the correct selectors.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Browser session ID',
            },
            elementType: {
              type: 'string',
              description: 'Optional: Filter by element type (button, input, link, select, textarea). If not specified, returns all interactive elements.',
            },
          },
          required: ['sessionId'],
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

        case 'find_interactive_elements':
          return await this.findInteractiveElements(params.sessionId, params.elementType);

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
    await session.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

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

    const timestamp = Date.now();
    const screenshotId = uuidv4();

    // Capture screenshot
    const screenshotBuffer = await session.page.screenshot({
      fullPage,
      type: 'png',
    });

    // Convert to base64 - Buffer's toString with 'base64' encoding
    const base64Screenshot = Buffer.from(screenshotBuffer).toString('base64');

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
      fullPage,
    });

    return {
      success: true,
      data: {
        screenshotId,
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

    try {
      await session.page.waitForSelector(selector, { timeout: 5000 });

      // Get element position before clicking for indicator
      const elementRect = await session.page.$eval(selector, (el) => {
        const rect = el.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height
        };
      });

      await session.page.click(selector);

      if (waitAfter > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitAfter));
      }

      // Add visual click indicator
      await session.page.evaluate((rect) => {
        // @ts-ignore - document is available in browser context
        const indicator = document.createElement('div');
        indicator.id = 'click-indicator-mosaic';
        indicator.style.cssText = `
          position: fixed;
          left: ${rect.x - 20}px;
          top: ${rect.y - 20}px;
          width: 40px;
          height: 40px;
          border: 3px solid #ff0000;
          border-radius: 50%;
          background: rgba(255, 0, 0, 0.2);
          pointer-events: none;
          z-index: 999999;
          animation: pulse 0.6s ease-out;
        `;

        // @ts-ignore - document is available in browser context
        const style = document.createElement('style');
        style.textContent = `
          @keyframes pulse {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
          }
        `;
        // @ts-ignore - document is available in browser context
        document.head.appendChild(style);
        // @ts-ignore - document is available in browser context
        document.body.appendChild(indicator);
      }, elementRect);

      session.lastActivityAt = new Date();

      // Auto-capture screenshot after interaction with indicator visible
      const screenshotResult = await this.captureScreenshot(sessionId, false);

      // Remove the indicator after screenshot
      await session.page.evaluate(() => {
        // @ts-ignore - document is available in browser context
        const indicator = document.getElementById('click-indicator-mosaic');
        if (indicator) indicator.remove();
      });

      return {
        success: true,
        data: {
          selector,
          clickPosition: elementRect,
          screenshot: screenshotResult.data,
          message: 'Element clicked successfully',
        },
      };
    } catch (error: any) {
      // Capture screenshot showing current page state for debugging
      const screenshotResult = await this.captureScreenshot(sessionId, false);

      session.lastActivityAt = new Date();

      this.context?.logger.error('Failed to click element', {
        sessionId,
        selector,
        error: error.message,
      });

      return {
        success: false,
        error: `Failed to click element "${selector}": ${error.message}`,
        data: {
          selector,
          screenshot: screenshotResult.data,
          currentUrl: session.page.url(),
          currentTitle: await session.page.title(),
        },
      };
    }
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

    try {
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
    } catch (error: any) {
      // Capture screenshot showing current page state for debugging
      const screenshotResult = await this.captureScreenshot(sessionId, false);

      session.lastActivityAt = new Date();

      this.context?.logger.error('Failed to type text', {
        sessionId,
        selector,
        error: error.message,
      });

      return {
        success: false,
        error: `Failed to type text in "${selector}": ${error.message}`,
        data: {
          selector,
          screenshot: screenshotResult.data,
          currentUrl: session.page.url(),
          currentTitle: await session.page.title(),
        },
      };
    }
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

    // Capture screenshot to show what content was extracted
    const screenshotResult = await this.captureScreenshot(sessionId, false);

    return {
      success: true,
      data: {
        content,
        url: session.page.url(),
        title: await session.page.title(),
        screenshot: screenshotResult.data,
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

    // Capture screenshot after JS execution to show result
    const screenshotResult = await this.captureScreenshot(sessionId, false);

    return {
      success: true,
      data: {
        result,
        url: session.page.url(),
        screenshot: screenshotResult.data,
      },
    };
  }

  private async findInteractiveElements(
    sessionId: string,
    elementType?: string
  ): Promise<MCPToolResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Invalid session ID',
      };
    }

    // Find interactive elements on the page
    // Use 'any' types for browser context code where DOM APIs are available
    const elements = await session.page.evaluate((filterType: any) => {
      // Declare browser globals to avoid TypeScript errors
      const window = (globalThis as any).window || (globalThis as any);
      const document = (globalThis as any).document;

      const results: any[] = [];

      // Helper to check if element is visible
      const isVisible = (el: any): boolean => {
        const style = window.getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0'
        );
      };

      // Helper to generate a good selector for an element
      const generateSelector = (el: any): string => {
        // Prefer ID
        if (el.id) return `#${el.id}`;

        // Try name attribute
        const name = el.getAttribute('name');
        if (name) return `[name="${name}"]`;

        // Try data attributes
        const dataTestId = el.getAttribute('data-testid');
        if (dataTestId) return `[data-testid="${dataTestId}"]`;

        // Try class combination with tag
        if (el.className && typeof el.className === 'string') {
          const classes = el.className
            .split(' ')
            .filter((c: any) => c.trim())
            .slice(0, 3)
            .join('.');
          if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
        }

        // Fall back to tag name with position
        const siblings = Array.from(el.parentElement?.children || []).filter(
          (sibling: any) => sibling.tagName === el.tagName
        );
        const index = siblings.indexOf(el);
        if (siblings.length > 1) {
          return `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
        }

        return el.tagName.toLowerCase();
      };

      // Get text content, limited to 100 chars
      const getText = (el: any): string => {
        const text = (el.textContent || '').trim();
        return text.length > 100 ? text.substring(0, 100) + '...' : text;
      };

      // Find buttons
      if (!filterType || filterType === 'button') {
        document.querySelectorAll('button, input[type="button"], input[type="submit"]').forEach((el: any) => {
          results.push({
            type: 'button',
            selector: generateSelector(el),
            text: getText(el),
            id: el.id || undefined,
            name: el.getAttribute('name') || undefined,
            value: el.value || undefined,
            visible: isVisible(el),
          });
        });
      }

      // Find input fields
      if (!filterType || filterType === 'input') {
        document.querySelectorAll('input:not([type="button"]):not([type="submit"])').forEach((el: any) => {
          results.push({
            type: 'input',
            selector: generateSelector(el),
            text: el.placeholder || '',
            id: el.id || undefined,
            name: el.name || undefined,
            placeholder: el.placeholder || undefined,
            value: el.value || undefined,
            visible: isVisible(el),
          });
        });
      }

      // Find textareas
      if (!filterType || filterType === 'textarea') {
        document.querySelectorAll('textarea').forEach((el: any) => {
          results.push({
            type: 'textarea',
            selector: generateSelector(el),
            text: el.placeholder || '',
            id: el.id || undefined,
            name: el.name || undefined,
            placeholder: el.placeholder || undefined,
            value: el.value || undefined,
            visible: isVisible(el),
          });
        });
      }

      // Find links
      if (!filterType || filterType === 'link') {
        document.querySelectorAll('a[href]').forEach((el: any) => {
          results.push({
            type: 'link',
            selector: generateSelector(el),
            text: getText(el),
            id: el.id || undefined,
            href: el.href || undefined,
            visible: isVisible(el),
          });
        });
      }

      // Find select dropdowns
      if (!filterType || filterType === 'select') {
        document.querySelectorAll('select').forEach((el: any) => {
          results.push({
            type: 'select',
            selector: generateSelector(el),
            text: el.options[el.selectedIndex]?.text || '',
            id: el.id || undefined,
            name: el.name || undefined,
            value: el.value || undefined,
            visible: isVisible(el),
          });
        });
      }

      // Return only visible elements by default, sorted by position on page
      return results.filter((el: any) => el.visible);
    }, elementType);

    session.lastActivityAt = new Date();

    // Capture screenshot to show the elements
    const screenshotResult = await this.captureScreenshot(sessionId, false);

    this.context?.logger.info('Found interactive elements', {
      sessionId,
      elementType: elementType || 'all',
      count: elements.length,
    });

    return {
      success: true,
      data: {
        elements,
        count: elements.length,
        url: session.page.url(),
        screenshot: screenshotResult.data,
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
      headless: true,
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
