import React, { useState, useEffect } from 'react';
import { useWriteContract, useAccount, useReadContract, useWalletClient } from 'wagmi';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ADDRESSES, ABIS, config } from '@/config/wagmi';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApprovals } from '@/hooks/useApprovals';
import { parseUnits, parseEther } from 'viem';
import { arbitrum } from 'viem/chains';
import axios from 'axios';

export interface TokenInfo {
  symbol: string;
  name: string;
  borrowApy: number;
  depositApy: number;
  ltv: number;
  marketAddress: string;
}

export interface Strategy {
  address: string;
  name: string;
  apy: number;
  type: string;
  vault: string;
}

interface EnhancedTransactionFlowProps {
  depositAmount: string;
  borrowAmount: string;
  selectedAsset: TokenInfo | null;
  selectedStrategy: Strategy | null;
  strategyType: string;
  borrowAsset: 'ETH' | 'USDC.e';
  depositAsset: 'ETH' | 'USDC.e';
}

type TransactionState = 'idle' | 'awaitingSignature' | 'pending' | 'confirmed' | 'failed';

interface StepState {
  id: number;
  status: TransactionState;
}

export function EnhancedTransactionFlow({
  depositAmount,
  borrowAmount,
  selectedAsset,
  selectedStrategy,
  strategyType,
  borrowAsset,
  depositAsset
}: EnhancedTransactionFlowProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [stepStates, setStepStates] = useState<StepState[]>([]);

  const needsWethWrap = strategyType !== 'deposit' && borrowAsset === 'ETH';
  const needsUSDCSwap = selectedStrategy?.type === 'YCUSDC' && borrowAsset === 'USDC.e';

  const handleOdosSwap = async () => {
    if (!address || !walletClient || !selectedStrategy?.vault) {
      setError("Required data is missing. Ensure wallet is connected and strategy is selected.");
      return;
    }

    try {
      const stepId = needsWethWrap ? 5 : 4;
      updateStepState(stepId, 'awaitingSignature');

      const usdceAmount = parseUnits(borrowAmount, 6).toString(); // Dynamic amount based on borrowAmount

      // Step 1: Quote
      const quoteUrl = 'https://api.odos.xyz/sor/quote/v2';
      const quoteRequestBody = {
        chainId: 42161,
        inputTokens: [
          {
            tokenAddress: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8", // USDC.e
            amount: usdceAmount,
          },
        ],
        outputTokens: [
          {
            tokenAddress: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // USDC
            proportion: 1,
          },
        ],
        userAddr: address,
        slippageLimitPercent: 1.0,
        referralCode: 0,
        disableRFQs: true,
        compact: true,
        paths: [["0xff970a61a04b1ca14834a43f5de4533ebddb5cc8", "0xaf88d065e77c8cc2239327c5edb3a432268e5831"]],
      };

      console.log('Quote request body:', quoteRequestBody);

      const quoteResponse = await axios.post(quoteUrl, quoteRequestBody, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (quoteResponse.status !== 200) {
        throw new Error('Failed to fetch quote from Odos');
      }

      const quote = quoteResponse.data;
      if (!quote.pathId) {
        throw new Error('Quote response missing pathId');
      }

      console.log('Quote response:', quote);

      // Step 2: Assemble
      const assembleUrl = 'https://api.odos.xyz/sor/assemble';
      const assembleRequestBody = {
        userAddr: address,
        pathId: quote.pathId,
        simulate: false,
      };

      const assembleResponse = await axios.post(assembleUrl, assembleRequestBody, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (assembleResponse.status !== 200) {
        throw new Error('Failed to assemble transaction');
      }

      const assembledTransaction = assembleResponse.data;
      const transaction = assembledTransaction.transaction;

      if (!transaction || !transaction.to || !transaction.data) {
        throw new Error('Assembled transaction is incomplete');
      }

      console.log('Assembled transaction details:', assembledTransaction);

      // Step 3: Execute Transaction
      const hash = await walletClient.sendTransaction({
        to: transaction.to as `0x${string}`,
        data: transaction.data as `0x${string}`,
        value: BigInt(transaction.value || 0),
        chain: arbitrum,
      });

      console.log('Transaction submitted:', hash);

      if (hash) {
        updateStepState(stepId, 'pending');
        const receipt = await walletClient.waitForTransactionReceipt({
          hash,
          chainId: arbitrum.id,
        });

        if (receipt.status === 'success') {
          updateStepState(stepId, 'confirmed');
          setTimeout(() => setCurrentStep(needsWethWrap ? 6 : 5), 500);
        } else {
          throw new Error('Transaction failed');
        }
      }
    } catch (error: any) {
      console.error('Odos swap error:', error);
      const stepId = needsWethWrap ? 5 : 4;
      updateStepState(stepId, 'failed');
      setError(`Swap failed: ${error.message || 'Unknown error occurred'}`);
    }
  };

  const updateStepState = (stepId: number, status: TransactionState) => {
    setStepStates((prev) => {
      const existing = prev.find((s) => s.id === stepId);
      if (existing) {
        return prev.map((s) => (s.id === stepId ? { ...s, status } : s));
      }
      return [...prev, { id: stepId, status }];
    });
  };

  return (
    <div className="mt-6 space-y-4">
      <Button onClick={handleOdosSwap}>Execute Swap</Button>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    </div>
  );
}

export default EnhancedTransactionFlow;
