/**
 * Phase 8.5 - MatrixCoin - Internal Credit System
 * 
 * Internal currency system for Matrix Platform
 * - MatrixCoin (MXC) creation and management
 * - Balance tracking for accounts and AIs
 * - Conversion to real currencies (EUR/USD/USDT)
 * - Integration with Matrix Wallet and Central Ledger
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type AccountType = 'user' | 'developer' | 'ai' | 'app' | 'system'
export type TransactionType = 'transfer' | 'payment' | 'reward' | 'fee' | 'conversion' | 'mint' | 'burn'
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'reversed'
export type Currency = 'MXC' | 'USD' | 'EUR' | 'USDT' | 'BTC' | 'ETH'

export interface MatrixCoinWallet {
  id: string
  accountId: string
  accountType: AccountType
  balance: number // MXC
  lockedBalance: number // MXC (locked in contracts)
  totalEarned: number // MXC
  totalSpent: number // MXC
  lastUpdated: Date
}

export interface MatrixCoinTransaction {
  id: string
  fromAccountId: string
  fromAccountType: AccountType
  toAccountId: string
  toAccountType: AccountType
  amount: number // MXC
  currency: Currency
  type: TransactionType
  status: TransactionStatus
  description?: string
  metadata: Record<string, any>
  blockHash?: string
  transactionHash?: string
  createdAt: Date
  processedAt?: Date
}

export interface CurrencyConversion {
  id: string
  accountId: string
  fromCurrency: Currency
  toCurrency: Currency
  fromAmount: number
  toAmount: number
  exchangeRate: number
  fee: number
  status: TransactionStatus
  createdAt: Date
  completedAt?: Date
}

class MatrixCoinManager {
  private wallets: Map<string, MatrixCoinWallet> = new Map()
  private transactions: Map<string, MatrixCoinTransaction> = new Map()
  private exchangeRates: Map<string, number> = new Map()

  async initialize() {
    logInfo('Initializing MatrixCoin - Internal Credit System...')

    // Initialize exchange rates
    await this.initializeExchangeRates()

    // Load wallets from database
    try {
      const { prisma } = await import('../config/database')
      const wallets = await prisma.matrixCoinWallet.findMany()
      
      for (const wallet of wallets) {
        this.wallets.set(wallet.accountId, {
          id: wallet.id,
          accountId: wallet.accountId,
          accountType: wallet.accountType as AccountType,
          balance: wallet.balance,
          lockedBalance: wallet.lockedBalance,
          totalEarned: wallet.totalEarned,
          totalSpent: wallet.totalSpent,
          lastUpdated: wallet.lastUpdated
        })
      }
      
      logInfo(`✅ Loaded ${wallets.length} MatrixCoin wallets from database`)
    } catch (error) {
      logError(error as Error, { context: 'MatrixCoin initialization' })
    }

    // Update exchange rates periodically
    setInterval(() => {
      this.initializeExchangeRates()
    }, 60 * 60 * 1000) // Every hour

    logInfo('✅ MatrixCoin - Internal Credit System initialized')
  }

  // Initialize exchange rates
  private async initializeExchangeRates(): Promise<void> {
    // In production, fetch from external API
    // For now, use fixed rates
    this.exchangeRates.set('MXC_USD', 0.01) // 1 MXC = 0.01 USD
    this.exchangeRates.set('MXC_EUR', 0.009) // 1 MXC = 0.009 EUR
    this.exchangeRates.set('MXC_USDT', 0.01) // 1 MXC = 0.01 USDT
    this.exchangeRates.set('MXC_BTC', 0.00000025) // 1 MXC = 0.00000025 BTC
    this.exchangeRates.set('MXC_ETH', 0.000004) // 1 MXC = 0.000004 ETH
  }

  // Create wallet
  async createWallet(
    accountId: string,
    accountType: AccountType
  ): Promise<MatrixCoinWallet> {
    try {
      const walletId = nanoid()
      const now = new Date()

      const wallet: MatrixCoinWallet = {
        id: walletId,
        accountId,
        accountType,
        balance: 0,
        lockedBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.matrixCoinWallet.create({
          data: {
            id: walletId,
            accountId,
            accountType,
            balance: 0,
            lockedBalance: 0,
            totalEarned: 0,
            totalSpent: 0
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create wallet in database' })
      }

      this.wallets.set(accountId, wallet)
      logInfo(`✅ Created MatrixCoin wallet ${walletId} for ${accountType} ${accountId}`)

      return wallet
    } catch (error) {
      logError(error as Error, { context: 'Create wallet' })
      throw error
    }
  }

  // Mint coins (system only)
  async mintCoins(
    toAccountId: string,
    amount: number,
    reason: string
  ): Promise<MatrixCoinTransaction> {
    try {
      const transactionId = nanoid()
      const now = new Date()

      // Get or create wallet
      let wallet = this.wallets.get(toAccountId)
      if (!wallet) {
        // Determine account type
        const accountType = await this.determineAccountType(toAccountId)
        wallet = await this.createWallet(toAccountId, accountType)
      }

      // Create transaction
      const transaction: MatrixCoinTransaction = {
        id: transactionId,
        fromAccountId: 'system',
        fromAccountType: 'system',
        toAccountId,
        toAccountType: wallet.accountType,
        amount,
        currency: 'MXC',
        type: 'mint',
        status: 'pending',
        description: reason,
        metadata: {},
        createdAt: now
      }

      // Process transaction
      await this.processTransaction(transactionId, transaction)

      logInfo(`✅ Minted ${amount} MXC to ${toAccountId}: ${reason}`)

      return transaction
    } catch (error) {
      logError(error as Error, { context: 'Mint coins' })
      throw error
    }
  }

  // Transfer coins
  async transferCoins(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    type: TransactionType = 'transfer',
    description?: string
  ): Promise<MatrixCoinTransaction> {
    try {
      const transactionId = nanoid()
      const now = new Date()

      // Get wallets
      let fromWallet = this.wallets.get(fromAccountId)
      let toWallet = this.wallets.get(toAccountId)

      if (!fromWallet) {
        const accountType = await this.determineAccountType(fromAccountId)
        fromWallet = await this.createWallet(fromAccountId, accountType)
      }

      if (!toWallet) {
        const accountType = await this.determineAccountType(toAccountId)
        toWallet = await this.createWallet(toAccountId, accountType)
      }

      // Check balance
      const availableBalance = fromWallet.balance - fromWallet.lockedBalance
      if (availableBalance < amount) {
        throw new Error('Insufficient balance')
      }

      // Create transaction
      const transaction: MatrixCoinTransaction = {
        id: transactionId,
        fromAccountId,
        fromAccountType: fromWallet.accountType,
        toAccountId,
        toAccountType: toWallet.accountType,
        amount,
        currency: 'MXC',
        type,
        status: 'pending',
        description,
        metadata: {},
        createdAt: now
      }

      // Process transaction
      await this.processTransaction(transactionId, transaction)

      logInfo(`✅ Transferred ${amount} MXC from ${fromAccountId} to ${toAccountId}`)

      return transaction
    } catch (error) {
      logError(error as Error, { context: 'Transfer coins' })
      throw error
    }
  }

  // Process transaction
  private async processTransaction(
    transactionId: string,
    transaction: MatrixCoinTransaction
  ): Promise<void> {
    try {
      transaction.status = 'processing'

      // Get wallets
      const fromWallet = transaction.fromAccountId !== 'system' 
        ? this.wallets.get(transaction.fromAccountId)
        : null
      const toWallet = this.wallets.get(transaction.toAccountId)

      if (!toWallet) {
        throw new Error('Recipient wallet not found')
      }

      // Update balances
      if (fromWallet) {
        fromWallet.balance -= transaction.amount
        fromWallet.totalSpent += transaction.amount
        fromWallet.lastUpdated = new Date()
      }

      toWallet.balance += transaction.amount
      toWallet.totalEarned += transaction.amount
      toWallet.lastUpdated = new Date()

      // Generate transaction hash
      transaction.transactionHash = `tx_${nanoid(32)}`
      transaction.status = 'completed'
      transaction.processedAt = new Date()

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.matrixCoinTransaction.create({
          data: {
            id: transactionId,
            fromAccountId: transaction.fromAccountId,
            fromAccountType: transaction.fromAccountType,
            toAccountId: transaction.toAccountId,
            toAccountType: transaction.toAccountType,
            amount: transaction.amount,
            currency: transaction.currency,
            type: transaction.type,
            status: transaction.status,
            description: transaction.description || null,
            metadata: transaction.metadata,
            transactionHash: transaction.transactionHash,
            processedAt: transaction.processedAt
          }
        })

        // Update wallets
        if (fromWallet) {
          await prisma.matrixCoinWallet.update({
            where: { accountId: fromWallet.accountId },
            data: {
              balance: fromWallet.balance,
              totalSpent: fromWallet.totalSpent,
              lastUpdated: fromWallet.lastUpdated
            }
          })
        }

        await prisma.matrixCoinWallet.update({
          where: { accountId: toWallet.accountId },
          data: {
            balance: toWallet.balance,
            totalEarned: toWallet.totalEarned,
            lastUpdated: toWallet.lastUpdated
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Process transaction in database' })
      }

      this.transactions.set(transactionId, transaction)
      if (fromWallet) {
        this.wallets.set(fromWallet.accountId, fromWallet)
      }
      this.wallets.set(toWallet.accountId, toWallet)

      logInfo(`✅ Processed transaction ${transactionId}`)
    } catch (error) {
      logError(error as Error, { context: 'Process transaction' })
      throw error
    }
  }

  // Convert currency
  async convertCurrency(
    accountId: string,
    fromCurrency: Currency,
    toCurrency: Currency,
    fromAmount: number
  ): Promise<CurrencyConversion> {
    try {
      if (fromCurrency === toCurrency) {
        throw new Error('Cannot convert to same currency')
      }

      const conversionId = nanoid()
      const now = new Date()

      // Get exchange rate
      const rateKey = `${fromCurrency}_${toCurrency}`
      let exchangeRate = this.exchangeRates.get(rateKey)

      if (!exchangeRate) {
        // Calculate reverse rate
        const reverseKey = `${toCurrency}_${fromCurrency}`
        const reverseRate = this.exchangeRates.get(reverseKey)
        if (reverseRate) {
          exchangeRate = 1 / reverseRate
        } else {
          throw new Error(`Exchange rate not found for ${rateKey}`)
        }
      }

      const toAmount = fromAmount * exchangeRate
      const fee = toAmount * 0.01 // 1% fee
      const finalAmount = toAmount - fee

      const conversion: CurrencyConversion = {
        id: conversionId,
        accountId,
        fromCurrency,
        toCurrency,
        fromAmount,
        toAmount: finalAmount,
        exchangeRate,
        fee,
        status: 'pending',
        createdAt: now
      }

      // Process conversion
      if (fromCurrency === 'MXC') {
        // Convert from MXC to real currency
        await this.transferCoins(accountId, 'system', fromAmount, 'conversion', `Convert to ${toCurrency}`)
      } else if (toCurrency === 'MXC') {
        // Convert from real currency to MXC
        await this.mintCoins(accountId, finalAmount, `Convert from ${fromCurrency}`)
      }

      conversion.status = 'completed'
      conversion.completedAt = new Date()

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.currencyConversion.create({
          data: {
            id: conversionId,
            accountId,
            fromCurrency,
            toCurrency,
            fromAmount,
            toAmount: finalAmount,
            exchangeRate,
            fee,
            status: 'completed',
            completedAt: conversion.completedAt
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Convert currency in database' })
      }

      logInfo(`✅ Converted ${fromAmount} ${fromCurrency} to ${finalAmount} ${toCurrency}`)

      return conversion
    } catch (error) {
      logError(error as Error, { context: 'Convert currency' })
      throw error
    }
  }

  // Get wallet
  async getWallet(accountId: string): Promise<MatrixCoinWallet | null> {
    return this.wallets.get(accountId) || null
  }

  // Get transactions
  async getTransactions(
    accountId?: string,
    limit: number = 100
  ): Promise<MatrixCoinTransaction[]> {
    const transactions: MatrixCoinTransaction[] = []
    for (const transaction of this.transactions.values()) {
      if (accountId && transaction.fromAccountId !== accountId && transaction.toAccountId !== accountId) {
        continue
      }
      transactions.push(transaction)
    }
    return transactions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  // Determine account type
  private async determineAccountType(accountId: string): Promise<AccountType> {
    // In production, check database to determine account type
    // For now, default to 'user'
    if (accountId.startsWith('ai_')) return 'ai'
    if (accountId.startsWith('app_')) return 'app'
    if (accountId.startsWith('dev_')) return 'developer'
    return 'user'
  }
}

export const matrixCoinManager = new MatrixCoinManager()

