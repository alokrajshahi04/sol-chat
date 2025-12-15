// Solana SPL token utilities for on-chain credit management

const { Connection, Keypair, PublicKey, Transaction } = require('@solana/web3.js');
const {
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  createMintToInstruction,
  createBurnInstruction,
  getAccount,
} = require('@solana/spl-token');
const bs58 = require('bs58').default;

class SolanaService {
  constructor() {
    this.connection = null;
    this.backendWallet = null;
    this.creditsMint = null;
    this.treasuryWallet = null;
    this.initialized = false;
  }

  initialize(config) {
    this.connection = new Connection(config.SOLANA_RPC_URL, 'confirmed');
    this.backendWallet = Keypair.fromSecretKey(bs58.decode(config.BACKEND_WALLET_PRIVATE_KEY));
    this.creditsMint = new PublicKey(config.CREDITS_TOKEN_MINT);
    this.treasuryWallet = new PublicKey(config.TREASURY_WALLET);
    this.initialized = true;
  }

  ensureInitialized() {
    if (!this.initialized) throw new Error('SolanaService not initialized');
  }

  async getOrCreateTokenAccount(userWalletAddress) {
    this.ensureInitialized();
    const userWallet = new PublicKey(userWalletAddress);
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.backendWallet,
      this.creditsMint,
      userWallet
    );
    return tokenAccount.address;
  }

  async getTokenAccountAddress(userWalletAddress) {
    this.ensureInitialized();
    return await getAssociatedTokenAddress(this.creditsMint, new PublicKey(userWalletAddress));
  }

  async getCreditBalance(userWalletAddress) {
    this.ensureInitialized();
    try {
      const tokenAccountAddress = await this.getTokenAccountAddress(userWalletAddress);
      const tokenAccount = await getAccount(this.connection, tokenAccountAddress);
      return Number(tokenAccount.amount);
    } catch (error) {
      if (error.name === 'TokenAccountNotFoundError') return 0;
      throw error;
    }
  }

  async mintCredits(userWalletAddress, amount) {
    this.ensureInitialized();
    const tokenAccountAddress = await this.getOrCreateTokenAccount(userWalletAddress);

    const tx = new Transaction().add(
      createMintToInstruction(
        this.creditsMint,
        tokenAccountAddress,
        this.backendWallet.publicKey,
        amount
      )
    );

    const signature = await this.connection.sendTransaction(tx, [this.backendWallet]);
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  async burnCredits(userWalletAddress, amount) {
    this.ensureInitialized();
    const tokenAccountAddress = await this.getTokenAccountAddress(userWalletAddress);

    const tx = new Transaction().add(
      createBurnInstruction(
        tokenAccountAddress, // account
        this.creditsMint,    // mint
        this.backendWallet.publicKey, // owner (authority) -> We act as delegate
        amount
      )
    );

    const signature = await this.connection.sendTransaction(tx, [this.backendWallet]);
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  async verifyPayment(signature, expectedPayer, expectedAmountLamports) {
    this.ensureInitialized();
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) return { valid: false, error: 'Transaction not found' };
      if (tx.meta?.err) return { valid: false, error: 'Transaction failed' };

      const accountKeys = tx.transaction.message.staticAccountKeys || tx.transaction.message.accountKeys;
      const treasuryIndex = accountKeys.findIndex(key => key.toString() === this.treasuryWallet.toString());

      if (treasuryIndex === -1) return { valid: false, error: 'Payment not sent to treasury' };

      const received = tx.meta.postBalances[treasuryIndex] - tx.meta.preBalances[treasuryIndex];
      if (received < expectedAmountLamports) {
        return { valid: false, error: `Insufficient payment: got ${received}, need ${expectedAmountLamports}` };
      }

      if (accountKeys[0].toString() !== expectedPayer) {
        return { valid: false, error: 'Payment from wrong wallet' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

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

  getBackendPublicKey() {
    this.ensureInitialized();
    return this.backendWallet.publicKey.toString();
  }
}

module.exports = new SolanaService();
