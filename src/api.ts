/**
 * @fileoverview This file defines the API for interacting with the blockchain, including endpoints for
 * checking health, retrieving block and account information, and submitting transactions.
 */
import express from "express";
import http from "http";
import bodyParser from "body-parser";
import { WebSocketServer, WebSocket } from "ws";
import { SignedTx, Tx, Block } from "./types.js";
import logger from './logger.js';
import { 
  register,
  blockHeightGauge,
  mempoolSizeGauge,
  totalTransactionsCounter,
  totalBlocksCounter,
  evmContractCounter,
  transactionGasUsedHistogram,
  blockGasUsedHistogram,
  apiRequestDurationHistogram
} from "./metrics.js";

/**
 * Starts the API server with enhanced transaction handling.
 * @param port The port to listen on.
 * @param handlers An object containing the handler functions for the API endpoints.
 */
export function startApi(port: number, handlers: {
submitTx: (stx: SignedTx) => Promise<void>;
getAccount: (addr: string) => any;
getAllAccounts: () => Map<string, any>;
getHead: () => any;
getEVMStats?: () => any;
getContractCode?: (address: string) => string | null;
getContractStorage?: (address: string, key: string) => string | null;
getReceipt?: (txHash: string) => Promise<any>;
subscribeToBlocks?: (callback: (block: Block) => void) => void;
subscribeToTransactions?: (callback: (tx: SignedTx) => void) => void;
subscribeToEvents?: (callback: (event: any) => void) => void;
unsubscribeFromBlocks?: (callback: (block: Block) => void) => void;
unsubscribeFromTransactions?: (callback: (tx: SignedTx) => void) => void;
unsubscribeFromEvents?: (callback: (event: any) => void) => void;
}) {
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Add CORS headers to prevent CSP violations
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Add CSP headers to allow necessary connections
app.use((req, res, next) => {
  res.header('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: http: https:; img-src 'self' data: https:; font-src 'self' data: https:;");
  next();
});

// Store active WebSocket subscriptions
const subscriptions: {
  blocks: Array<{ ws: WebSocket; send: (data: any) => void }>;
  transactions: Array<{ ws: WebSocket; send: (data: any) => void }>;
  events: Array<{ ws: WebSocket; send: (data: any) => void }>;
} = {
  blocks: [],
  transactions: [],
  events: []
};

app.use(bodyParser.json());

// Add metrics middleware for all routes
app.use(metricsMiddleware);

app.get("/health", (req, res) => {
  try {
    // Perform health checks
    const healthChecks: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      blockchain: {
        initialized: handlers.getHead !== undefined,
        hasHead: handlers.getHead() !== null,
      },
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024), // MB
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
      }
    };
    
    // Add EVM status if available
    if (handlers.getEVMStats) {
      try {
        const evmStats = handlers.getEVMStats();
        healthChecks.blockchain.evm = {
          status: 'ok',
          contracts: evmStats.contractCount
        };
      } catch (error) {
        healthChecks.blockchain.evm = {
          status: 'error',
          error: (error as Error).message
        };
      }
    }
    
    logger.info('Health check performed', { 
      status: healthChecks.status,
      hasHead: healthChecks.blockchain.hasHead
    });
    
    res.status(200).json(healthChecks);
  } catch (error) {
    logger.error('Health check failed', { error: (error as Error).message });
    res.status(500).json({ 
      status: 'error', 
      error: (error as Error).message 
    });
  }
});

app.get("/head", (_req, res) => {
  const head = handlers.getHead();
  res.json(JSON.parse(JSON.stringify(head, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  )));
});
app.get("/account/:addr", (req, res) => {
  const account = handlers.getAccount(req.params.addr) || null;
  
  // Format response with explicit token information
  if (account) {
    const formattedAccount = {
      ...account,
      forgeBalance: account.forgeBalance.toString(),
      forgeBalanceFormatted: formatForgeTokens(account.forgeBalance)
    };
    
    res.json(JSON.parse(JSON.stringify(formattedAccount, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    )));
  } else {
    res.json(null);
  }
});

// EVM stats endpoint
app.get("/evm/stats", (_req, res) => {
  if (!handlers.getEVMStats) {
    return res.status(404).json({ error: "EVM not available" });
  }
  
  try {
    const stats = handlers.getEVMStats();
    res.json(JSON.parse(JSON.stringify(stats, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    )));
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`[api] EVM stats retrieval failed: ${errorMessage}`);
    res.status(500).json({ error: errorMessage });
  }
});

// Contract endpoints
app.get("/contract/:address/code", (req, res) => {
  if (!handlers.getContractCode) {
    return res.status(404).json({ error: "EVM not available" });
  }
  
  try {
    const code = handlers.getContractCode(req.params.address);
    if (code === null) {
      return res.status(404).json({ error: "Contract not found" });
    }
    res.json({ code });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`[api] Contract code retrieval failed: ${errorMessage}`);
    res.status(500).json({ error: errorMessage });
  }
});

app.get("/contract/:address/storage/:key", (req, res) => {
  if (!handlers.getContractStorage) {
    return res.status(404).json({ error: "EVM not available" });
  }
  
  try {
    const value = handlers.getContractStorage(req.params.address, req.params.key);
    if (value === null) {
      return res.status(404).json({ error: "Storage key not found" });
    }
    res.json({ value });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`[api] Contract storage retrieval failed: ${errorMessage}`);
    res.status(500).json({ error: errorMessage });
  }
});

// Transaction receipt endpoint
app.get("/tx/:hash/receipt", async (req, res) => {
  if (!handlers.getReceipt) {
    return res.status(404).json({ error: "Receipts not available" });
  }
  
  try {
    const receipt = await handlers.getReceipt(req.params.hash);
    if (receipt === null) {
      return res.status(404).json({ error: "Receipt not found" });
    }
    res.json(JSON.parse(JSON.stringify(receipt, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    )));
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`[api] Receipt retrieval failed: ${errorMessage}`);
    res.status(500).json({ error: errorMessage });
  }
});

// Helper function to format token amounts
function formatForgeTokens(wei: bigint): string {
  const forge = Number(wei) / 1e18;
  return forge.toFixed(2) + " FORGE";
}

// Token supply endpoint
app.get("/supply", (req, res) => {
  try {
    // Calculate current total supply from all accounts
    let totalSupply = 0n;
    
    // Get all accounts and sum their forgeBalance
    if (handlers && typeof handlers.getAllAccounts === 'function') {
      const accounts = handlers.getAllAccounts();
      for (const [address, account] of accounts.entries()) {
        totalSupply += account.forgeBalance;
      }
      
      const supplyInfo = {
        totalSupply: totalSupply.toString(),
        totalSupplyFormatted: formatForgeTokens(totalSupply),
        supplyCap: "2000000000000000000000000000", // 2B FORGE
        supplyCapFormatted: "2,000,000,000.00 FORGE",
        percentageMinted: totalSupply > 0 ? Number((totalSupply * 100n) / 2000000000000000000000000000n) : 0
      };
      
      res.json(supplyInfo);
    } else {
      // Fallback response
      const supplyInfo = {
        totalSupply: "0",
        totalSupplyFormatted: "0.00 FORGE",
        supplyCap: "2000000000000000000000000000", // 2B FORGE
        supplyCapFormatted: "2,000,000,000.00 FORGE",
        percentageMinted: 0
      };
      
      res.json(supplyInfo);
    }
  } catch (error) {
    logger.error('Supply retrieval failed', { error: (error as Error).message });
    res.status(500).json({ error: (error as Error).message });
  }
});

// Tokenomics endpoint
app.get("/tokenomics", (req, res) => {
  try {
    const tokenomics = {
      tokenName: "Forge Token",
      tokenSymbol: "FORGE",
      decimals: 18,
      blockReward: "5000000000000000000", // 5 FORGE
      blockRewardFormatted: "5.00 FORGE",
      minGasPrice: "1000000000", // 1 Gwei
      minGasPriceFormatted: "1.00 Gwei per gas",
      blockGasLimit: "30000000", // 30M gas
      supplyCap: "2000000000000000000000000000", // 2B FORGE
      supplyCapFormatted: "2,000,000,000.00 FORGE",
      initialSupply: "1000000000000000000000000000", // 1B FORGE
      initialSupplyFormatted: "1,000,000,000.00 FORGE"
    };
    
    res.json(tokenomics);
  } catch (error) {
    logger.error('Tokenomics retrieval failed', { error: (error as Error).message });
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/tx", async (req, res) => {
  try {
    const stx = req.body as SignedTx;
    if (!stx?.tx?.type) {
      logger.warn('Invalid transaction format received', { body: req.body });
      return res.status(400).json({ error: "Invalid transaction format" });
    }
    
    logger.info('Transaction submission received', { 
      txType: stx.tx.type,
      txHash: stx.hash,
      from: stx.tx.from
    });
    
    await handlers.submitTx(stx);
    logger.info('Transaction submitted successfully', { 
      txHash: stx.hash,
      from: stx.tx.from
    });
    res.json({ ok: true, hash: stx.hash });
  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.error('Transaction submission failed', { 
      error: errorMessage,
      stack: (error as Error).stack
    });
    res.status(400).json({ error: errorMessage });
  }
});

// WebSocket subscription endpoint
wss.on("connection", (ws, req) => {
  logger.info('WebSocket connection established', {
    remoteAddress: req.socket.remoteAddress,
    url: req.url
  });
  
  // Parse the subscription type from the URL
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  const subscriptionType = url.pathname.split("/")[2]; // /subscribe/:type
  
  // Helper function to send data to WebSocket with BigInt serialization
  const send = (data: any) => {
    try {
      ws.send(JSON.stringify(data, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ));
    } catch (error) {
      console.error(`[api] Error sending WebSocket message: ${(error as Error).message}`);
    }
  };
  
  switch (subscriptionType) {
    case "blocks":
      // Add to blocks subscriptions
      subscriptions.blocks.push({ ws, send });
      
      // Set up cleanup on disconnect
      ws.on("close", () => {
        subscriptions.blocks = subscriptions.blocks.filter(sub => sub.ws !== ws);
      });
      
      // Acknowledge the connection
      send({ type: "subscription", subscription: "blocks", status: "active" });
      logger.info('Blocks subscription established', {
        remoteAddress: req.socket.remoteAddress
      });
      
      // If blockchain handler is available, subscribe to blocks
      if (handlers.subscribeToBlocks) {
        const callback = (block: Block) => {
          send({ type: "block", data: block });
        };
        handlers.subscribeToBlocks(callback);
        
        // Store callback for cleanup
        (ws as any)._blockCallback = callback;
        
        // Clean up subscription on disconnect
        ws.on("close", () => {
          if (handlers.unsubscribeFromBlocks && (ws as any)._blockCallback) {
            handlers.unsubscribeFromBlocks((ws as any)._blockCallback);
          }
        });
      }
      break;
      
    case "transactions":
      // Add to transactions subscriptions
      subscriptions.transactions.push({ ws, send });
      
      // Set up cleanup on disconnect
      ws.on("close", () => {
        subscriptions.transactions = subscriptions.transactions.filter(sub => sub.ws !== ws);
      });
      
      // Acknowledge the connection
      send({ type: "subscription", subscription: "transactions", status: "active" });
      logger.info('Transactions subscription established', {
        remoteAddress: req.socket.remoteAddress
      });
      
      // If blockchain handler is available, subscribe to transactions
      if (handlers.subscribeToTransactions) {
        const callback = (tx: SignedTx) => {
          send({ type: "transaction", data: tx });
        };
        handlers.subscribeToTransactions(callback);
        
        // Store callback for cleanup
        (ws as any)._txCallback = callback;
        
        // Clean up subscription on disconnect
        ws.on("close", () => {
          if (handlers.unsubscribeFromTransactions && (ws as any)._txCallback) {
            handlers.unsubscribeFromTransactions((ws as any)._txCallback);
          }
        });
      }
      break;
      
    case "events":
      // Add to events subscriptions
      subscriptions.events.push({ ws, send });
      
      // Set up cleanup on disconnect
      ws.on("close", () => {
        subscriptions.events = subscriptions.events.filter(sub => sub.ws !== ws);
      });
      
      // Acknowledge the connection
      send({ type: "subscription", subscription: "events", status: "active" });
      logger.info('Events subscription established', {
        remoteAddress: req.socket.remoteAddress
      });
      
      // If blockchain handler is available, subscribe to events
      if (handlers.subscribeToEvents) {
        const callback = (event: any) => {
          send({ type: "event", data: event });
        };
        handlers.subscribeToEvents(callback);
        
        // Store callback for cleanup
        (ws as any)._eventCallback = callback;
        
        // Clean up subscription on disconnect
        ws.on("close", () => {
          if (handlers.unsubscribeFromEvents && (ws as any)._eventCallback) {
            handlers.unsubscribeFromEvents((ws as any)._eventCallback);
          }
        });
      }
      break;
      
    default:
      logger.warn('Unknown subscription type requested', {
        subscriptionType,
        remoteAddress: req.socket.remoteAddress
      });
      send({ type: "error", message: "Unknown subscription type" });
      ws.close();
  }
  
  ws.on("close", () => {
    logger.info('WebSocket connection closed', {
      remoteAddress: req.socket.remoteAddress
    });
  });
});

// Add metrics endpoint
app.get("/metrics", async (_req, res) => {
  try {
    // Update blockchain metrics
    const head = handlers.getHead();
    if (head) {
      blockHeightGauge.set(Number(head.header.height));
      if (head.header.gasUsed) {
        blockGasUsedHistogram.observe(Number(head.header.gasUsed));
      }
    }
    
    // Update EVM metrics if available
    if (handlers.getEVMStats) {
      try {
        const evmStats = handlers.getEVMStats();
        evmContractCounter.set(evmStats.contractCount);
      } catch (error) {
        console.error('[api] Failed to get EVM stats for metrics:', error);
      }
    }
    
    // Return metrics
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('[api] Metrics collection failed:', error);
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

server.listen(port, () => console.log(`[api] http://localhost:${port}`));
}

// Add metrics middleware
function metricsMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    apiRequestDurationHistogram.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode.toString()
      },
      duration
    );
    
    // Log slow requests (> 1 second)
    if (duration > 1) {
      logger.warn('Slow API request detected', {
        method: req.method,
        url: req.url,
        duration: duration,
        statusCode: res.statusCode
      });
    }
  });
  
  next();
}
