/**
 * Solana SPL Token utilities for credit management
 * 
 * Credits are stored as SPL tokens on-chain.
 * The backend has authority to mint tokens when users purchase credits
 * and burn tokens when users make queries.
 */

const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');
const {
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createBurnInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} = require('@solana/spl-token');
const bs58 = require('bs58');

class SolanaService {
  constructor() {
    this.connection = null;
    this.backendWallet = null;
    this.creditsMint = null;
    this.treasuryWallet = null;
    this.initialized = false;
  }

  /**
   * Initialize the Solana service with environment configuration
   */
  initialize(config) {
    this.connection = new Connection(config.SOLANA_RPC_URL, 'confirmed');
    this.backendWallet = Keypair.fromSecretKey(
      bs58.decode(config.BACKEND_WALLET_PRIVATE_KEY)
    );
    this.creditsMint = new PublicKey(config.CREDITS_TOKEN_MINT);
    this.treasuryWallet = new PublicKey(config.TREASURY_WALLET);
    this.initialized = true;
  }

  /**
   * Ensure the service is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('SolanaService not initialized. Call initialize() first.');
    }
  }

  /**
   * Get or create a token account for a user's wallet
   * @param {string} userWalletAddress - User's Solana wallet public key
   * @returns {Promise<PublicKey>} - Associated token account address
   */
  async getOrCreateTokenAccount(userWalletAddress) {
    this.ensureInitialized();
    
    const userWallet = new PublicKey(userWalletAddress);
    
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.backendWallet, // Payer for account creation
      this.creditsMint,
      userWallet
    );
    
    return tokenAccount.address;
  }

  /**
   * Get the associated token account address for a user (doesn't create it)
   * @param {string} userWalletAddress - User's Solana wallet public key
   * @returns {Promise<PublicKey>} - Associated token account address
   */
  async getTokenAccountAddress(userWalletAddress) {
    this.ensureInitialized();
    
    const userWallet = new PublicKey(userWalletAddress);
    
    return await getAssociatedTokenAddress(
      this.creditsMint,
      userWallet
    );
  }

  /**
   * Get the credit balance for a user
   * @param {string} userWalletAddress - User's Solana wallet public key
   * @returns {Promise<number>} - Credit balance (0 if no token account exists)
   */
  async getCreditBalance(userWalletAddress) {
    this.ensureInitialized();
    
    try {
      const tokenAccountAddress = await this.getTokenAccountAddress(userWalletAddress);
      const tokenAccount = await getAccount(this.connection, tokenAccountAddress);
      return Number(tokenAccount.amount);
    } catch (error) {
      // Account doesn't exist, return 0
      if (error.name === 'TokenAccountNotFoundError') {
        return 0;
      }
      throw error;
    }
  }

  /**
   * Mint credits to a user's token account
   * Called after successful payment verification
   * @param {string} userWalletAddress - User's Solana wallet public key
   * @param {number} amount - Number of credits to mint
   * @returns {Promise<string>} - Transaction signature
   */
  async mintCredits(userWalletAddress, amount) {
    this.ensureInitialized();
    
    const userWallet = new PublicKey(userWalletAddress);
    
    // Get or create the user's token account
    const tokenAccountAddress = await this.getOrCreateTokenAccount(userWalletAddress);
    
    // Create mint instruction
    const mintInstruction = createMintToInstruction(
      this.creditsMint,
      tokenAccountAddress,
      this.backendWallet.publicKey, // Mint authority
      amount
    );
    
    // Build and send transaction
    const transaction = new Transaction().add(mintInstruction);
    
    const signature = await this.connection.sendTransaction(
      transaction,
      [this.backendWallet]
    );
    
    await this.connection.confirmTransaction(signature);
    
    return signature;
  }

  /**
   * Burn credits from a user's token account
   * Called when a user makes a query
   * 
   * Note: This requires the backend wallet to have authority over the user's token account.
   * This can be achieved through a delegate or by using a PDA-based token account.
   * 
   * For simplicity, we'll use a delegate-based approach where users grant
   * the backend wallet delegate authority over their credits.
   * 
   * @param {string} userWalletAddress - User's Solana wallet public key
   * @param {number} amount - Number of credits to burn
   * @returns {Promise<string>} - Transaction signature
   */
  async burnCredits(userWalletAddress, amount) {
    this.ensureInitialized();
    
    const tokenAccountAddress = await this.getTokenAccountAddress(userWalletAddress);
    
    // Create burn instruction
    // The backend wallet must be the delegate/owner to burn
    const burnInstruction = createBurnInstruction(
      tokenAccountAddress,
      this.creditsMint,
      this.backendWallet.publicKey, // Authority (delegate)
      amount
    );
    
    // Build and send transaction
    const transaction = new Transaction().add(burnInstruction);
    
    const signature = await this.connection.sendTransaction(
      transaction,
      [this.backendWallet]
    );
    
    await this.connection.confirmTransaction(signature);
    
    return signature;
  }

  /**
   * Verify a SOL payment transaction
   * @param {string} signature - Transaction signature
   * @param {string} expectedPayer - Expected payer wallet address
   * @param {number} expectedAmountLamports - Expected amount in lamports
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  async verifyPayment(signature, expectedPayer, expectedAmountLamports) {
    this.ensureInitialized();
    
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      
      if (!tx) {
        return { valid: false, error: 'Transaction not found' };
      }
      
      if (tx.meta?.err) {
        return { valid: false, error: 'Transaction failed' };
      }
      
      // Check if the transaction is a transfer to our treasury
      const accountKeys = tx.transaction.message.staticAccountKeys || 
                          tx.transaction.message.accountKeys;
      
      const treasuryIndex = accountKeys.findIndex(
        key => key.toString() === this.treasuryWallet.toString()
      );
      
      if (treasuryIndex === -1) {
        return { valid: false, error: 'Payment not sent to treasury' };
      }
      
      // Check the amount received by treasury
      const preBalance = tx.meta.preBalances[treasuryIndex];
      const postBalance = tx.meta.postBalances[treasuryIndex];
      const received = postBalance - preBalance;
      
      if (received < expectedAmountLamports) {
        return { 
          valid: false, 
          error: `Insufficient payment. Expected ${expectedAmountLamports} lamports, received ${received}` 
        };
      }
      
      // Verify the payer
      const payerKey = accountKeys[0].toString();
      if (payerKey !== expectedPayer) {
        return { valid: false, error: 'Payment from wrong wallet' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Generate payment details for x402 response
   * @param {number} creditsRequired - Number of credits needed
   * @param {number} pricePerCredit - Price per credit in lamports
   * @returns {Object} - Payment details object
   */
  generatePaymentDetails(creditsRequired, pricePerCredit) {
    this.ensureInitialized();
    
    const totalLamports = creditsRequired * pricePerCredit;
    
    return {
      network: 'solana',
      recipient: this.treasuryWallet.toString(),
      amount: totalLamports.toString(),
      currency: 'lamports',
      credits: creditsRequired,
      memo: `sol-chat-credits:${creditsRequired}`,
    };
  }
}

// Export singleton instance
module.exports = new SolanaService();

