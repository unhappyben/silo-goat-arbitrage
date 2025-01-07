// src/hooks/useSilo.ts
"use client";

import { useReadContract, useWriteContract, useAccount } from 'wagmi'
import { ADDRESSES, ABIS } from '@/config/wagmi'
import { parseUnits, parseEther } from 'viem'

// Only enforce types for borrowable assets
type BorrowableToken = 'ETH' | 'USDC.e';

export function useSilo(marketAddress: string, borrowAsset: BorrowableToken) {
  const { address } = useAccount()

  // For USDC.e specific checks
  const { data: usdceAllowance } = useReadContract({
    address: ADDRESSES.TOKENS['USDC.e'] as `0x${string}`,
    abi: ABIS.ERC20,
    functionName: 'allowance',
    args: address ? [address as `0x${string}`, ADDRESSES.SILO_ROUTER as `0x${string}`] : undefined
  })

  // Approve USDC.e
  const { writeContract: approveUSDCe } = useWriteContract()

  // Execute Silo Actions
  const { writeContract: executeSilo } = useWriteContract()

  const approveToken = async (amount: string) => {
    try {
      const tx = await approveUSDCe({
        address: ADDRESSES.TOKENS['USDC.e'] as `0x${string}`,
        abi: ABIS.ERC20,
        functionName: 'approve',
        args: [ADDRESSES.SILO_ROUTER as `0x${string}`, parseUnits(amount, 6)]
      })
      return tx
    } catch (error) {
      console.error('Error approving token:', error)
      throw error
    }
  }

  const depositAndBorrow = async (
    depositAmount: string,
    borrowAmount: string,
    collateralToken: string
  ) => {
    try {
      const collateralDecimals = collateralToken === 'USDC.e' ? 6 : 18;
      
      const actions = [
        {
          actionType: 0, // deposit
          silo: marketAddress,
          asset: ADDRESSES.TOKENS[collateralToken as keyof typeof ADDRESSES.TOKENS],
          amount: collateralDecimals === 18
            ? parseEther(depositAmount)
            : parseUnits(depositAmount, collateralDecimals),
          collateralOnly: false
        },
        {
          actionType: 2, // borrow
          silo: marketAddress,
          asset: borrowAsset === 'ETH' 
            ? ADDRESSES.TOKENS.ETH 
            : ADDRESSES.TOKENS['USDC.e'],
          amount: borrowAsset === 'ETH'
            ? parseEther(borrowAmount)
            : parseUnits(borrowAmount, 6),
          collateralOnly: false
        }
      ]

      const tx = await executeSilo({
        address: ADDRESSES.SILO_ROUTER as `0x${string}`,
        abi: ABIS.SILO_ROUTER,
        functionName: 'execute',
        args: [actions],
        value: collateralToken === 'ETH' ? parseEther(depositAmount) : BigInt(0)
      })

      return tx
    } catch (error) {
      console.error('Error in depositAndBorrow:', error)
      throw error
    }
  }

  return {
    allowance: usdceAllowance,
    approveToken,
    depositAndBorrow
  }
}