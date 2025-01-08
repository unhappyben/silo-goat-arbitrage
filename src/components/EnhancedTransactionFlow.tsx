/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState, useEffect } from 'react';
import { useWriteContract, useAccount, useReadContract } from 'wagmi';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ADDRESSES, ABIS, config } from '@/config/wagmi';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApprovals } from '@/hooks/useApprovals';
import { parseUnits, parseEther } from 'viem';
import { arbitrum } from 'viem/chains';
import { type Hash } from 'viem';
import axios from 'axios';
import { TOKENS } from './YieldArbitrageDashboard';
import { useWalletClient } from 'wagmi';
import { waitForTransactionReceipt, readContract, writeContract } from '@wagmi/core';

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
type StrategyType = 'borrow' | 'deposit';

interface StepState {
  id: number;
  status: TransactionState;
}

type UserPosition = {
  collateralAmount: bigint;
  debtAmount: bigint;
};

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
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [stepStates, setStepStates] = useState<StepState[]>([]);

  const needsWethWrap = strategyType !== 'deposit' && borrowAsset === 'ETH';
  const needsUSDCSwap = (selectedStrategy?.type === 'YCUSDC' || selectedStrategy?.type === 'CRV_USD') && borrowAsset === 'USDC.e';
  const depositToken = selectedAsset?.symbol === 'ETH'
    ? ADDRESSES.TOKENS.ETH
    : selectedAsset?.symbol ? ADDRESSES.TOKENS[selectedAsset.symbol as keyof typeof ADDRESSES.TOKENS] : '';

  const { data: userPosition, isError: userPositionError } = useReadContract({
    address: selectedAsset?.marketAddress as `0x${string}`,
    abi: ABIS.SILO,
    functionName: 'userPosition',
    args: [address],
  }) as { data: UserPosition | undefined, isError: boolean };

  const { writeContract: wrapEth } = useWriteContract();
  const { writeContract: approveToken } = useWriteContract();
  const { writeContract: executeSilo } = useWriteContract();
  const { writeContract: approveVault } = useWriteContract();

  const {
    hasApproval: hasSiloApproval,
    approveToken: approveSilo,
    hasBalance: hasDepositBalance
  } = useApprovals(
    depositToken,
    ADDRESSES.SILO_ROUTER,
    depositAmount,
    selectedAsset?.symbol === 'USDC.e' ? 6 : 18
  );

  const {
    hasApproval: hasVaultApproval,
    approveToken: approveVaultToken
  } = useApprovals(
    borrowAsset === 'ETH' ? ADDRESSES.TOKENS.WETH : ADDRESSES.TOKENS[borrowAsset],
    selectedStrategy?.vault || '',
    borrowAmount,
    borrowAsset === 'USDC.e' ? 6 : 18
  );

  const updateStepState = (stepId: number, status: TransactionState) => {
    setStepStates(prev => {
      const existing = prev.find(s => s.id === stepId);
      if (existing) {
        return prev.map(s => s.id === stepId ? { ...s, status } : s);
      }
      return [...prev, { id: stepId, status }];
    });
  };

  const getStepState = (stepId: number): TransactionState => {
    return stepStates.find(s => s.id === stepId)?.status || 'idle';
  };

  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    console.log('Current step:', currentStep);
    console.log('Step states:', stepStates);
  }, [currentStep, stepStates]);

  useEffect(() => {
    const maxSteps = needsWethWrap ? 5 : 4;
    console.log(`Step ${maxSteps} conditions:`, {
      currentStep,
      hasVaultApproval: hasVaultApproval(borrowAmount),
      borrowAmount,
      stepEnabled: currentStep === maxSteps && hasVaultApproval(borrowAmount)
    });
  }, [currentStep, hasVaultApproval, borrowAmount, needsWethWrap]);

  useEffect(() => {
    const updateInitialState = () => {
      if (selectedAsset && depositAmount) {
        if (selectedAsset.symbol === 'ETH' || hasSiloApproval(depositAmount)) {
          const currentState = stepStates.find(s => s.id === 1)?.status;
          if (currentState !== 'confirmed') {
            updateStepState(1, 'confirmed');
            setCurrentStep(2);
          }
        }
      }
    };

    updateInitialState();
  }, [selectedAsset, depositAmount, hasSiloApproval, stepStates]);

  useEffect(() => {
    console.log('Step states updated:', stepStates, 'Current step:', currentStep);

    const lastCompletedStep = Math.max(
      ...stepStates
        .filter(s => s.status === 'confirmed')
        .map(s => s.id)
    );

    const nextStep = lastCompletedStep + 1;
    const maxSteps = needsWethWrap ? 5 : 4;

    if (nextStep > currentStep && nextStep <= maxSteps) {
      setTimeout(() => setCurrentStep(nextStep), 500);
    }
  }, [stepStates, currentStep, needsWethWrap]);

  useEffect(() => {
    console.log('Step states updated:', {
      stepStates,
      currentStep,
      needsWethWrap,
      needsUSDCSwap,
      totalSteps: steps.length
    });

    const lastCompletedStep = Math.max(
      ...stepStates
        .filter(s => s.status === 'confirmed')
        .map(s => s.id),
      0  // Default to 0 if no steps completed
    );

    const nextStep = lastCompletedStep + 1;
    const maxSteps = steps.length;

    if (nextStep > currentStep && nextStep <= maxSteps) {
      console.log('Moving to next step:', nextStep);
      setTimeout(() => setCurrentStep(nextStep), 500);
    }
  }, [stepStates, currentStep]);

  const getStepId = (baseId: number) => {
    let id = baseId;
    if (needsWethWrap && baseId > 2) id++;
    if (needsUSDCSwap && baseId > (needsWethWrap ? 3 : 2)) id += 2;
    return id;
  };

  const handleWethWrap = async () => {
    if (!address || !needsWethWrap) return;
    try {
      updateStepState(3, 'awaitingSignature');

      const hash = await writeContract(config, {
        address: ADDRESSES.TOKENS.WETH as `0x${string}`,
        abi: ABIS.WETH,
        functionName: 'deposit',
        value: parseEther(borrowAmount),
        chain: arbitrum,
      });

      if (hash) {
        updateStepState(3, 'pending');
        await waitForTransactionReceipt(config, {
          hash,
          chainId: arbitrum.id
        });
        updateStepState(3, 'confirmed');
        setTimeout(() => setCurrentStep(4), 500);
      }
    } catch (error: unknown) {
      console.error('WETH wrap error:', error);
      updateStepState(3, 'failed');
      setError('Failed to wrap ETH to WETH. Please try again.');
    }
  };

  const handleOdosApproval = async () => {
    if (!address) return;
    try {
      const stepId = needsWethWrap ? 4 : 3;
      updateStepState(stepId, 'awaitingSignature');

      const ODOS_ROUTER = "0xa669e7a0d4b3e4fa48af2de86bd4cd7126be4e13";
      const usdceToken = ADDRESSES.TOKENS['USDC.e'];

      const hash = await writeContract(config, {
        address: usdceToken as `0x${string}`,
        abi: ABIS.ERC20,
        functionName: 'approve',
        args: [
          ODOS_ROUTER as `0x${string}`,
          BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
        ]
      });

      if (hash) {
        updateStepState(stepId, 'pending');
        const receipt = await waitForTransactionReceipt(config, {
          hash,
          chainId: arbitrum.id
        });

        if (receipt.status === 'success') {
          updateStepState(stepId, 'confirmed');
          const nextStep = needsWethWrap ? 5 : 4;
          setTimeout(() => setCurrentStep(nextStep), 500);
        } else {
          throw new Error('Approval transaction failed');
        }
      }
    } catch (error) {
      console.error('Odos approval error:', error);
      const stepId = needsWethWrap ? 4 : 3;
      updateStepState(stepId, 'failed');
      setError('Failed to approve USDC.e for Odos. Please try again.');
    }
  };

  const handleOdosSwap = async () => {
    if (!address || !selectedStrategy?.vault || !borrowAmount) {
      setError("Missing required transaction parameters");
      return;
    }
  
    if (!walletClient) {
      setError("Wallet client is not available. Please connect your wallet.");
      return;
    }
  
    try {
      const stepId = needsWethWrap ? 5 : 4;
      updateStepState(stepId, 'awaitingSignature');
  
      // Determine decimals based on borrow asset
      const decimals = borrowAsset === 'USDC.e' ? 6 : 18;
      const amountToSwap = parseUnits(borrowAmount, decimals);
  
      // Determine target token based on strategy type
      const targetToken = selectedStrategy?.type === 'CRV_USD' ? 'crvUSD' : 'USDC';
      const targetTokenAddress = TOKENS[targetToken];
  
      console.log('Swap Details:', {
        sourceToken: 'USDC.e',
        targetToken,
        amount: amountToSwap.toString(),
        targetAddress: targetTokenAddress
      });
  
      const quoteUrl = 'https://api.odos.xyz/sor/quote/v2';
      const quoteRequestBody = {
        chainId: 42161, // Arbitrum
        inputTokens: [{
          tokenAddress: TOKENS['USDC.e'],
          amount: amountToSwap.toString()
        }],
        outputTokens: [{
          tokenAddress: targetTokenAddress,
          proportion: 1
        }],
        userAddr: address,
        slippageLimitPercent: 1.0,
        referralCode: 0,
        disableRFQs: true,
        compact: true,
        // Force path through specific tokens for better routing
        paths: [[TOKENS['USDC.e'], targetTokenAddress]]
      };
  
      console.log('Requesting quote with:', quoteRequestBody);
      const quoteResponse = await axios.post(quoteUrl, quoteRequestBody, {
        headers: { 'Content-Type': 'application/json' }
      });
  
      if (quoteResponse.status !== 200) {
        throw new Error('Failed to get quote from Odos');
      }
  
      const quote = quoteResponse.data;
      console.log('Received quote:', quote);
  
      const assembleUrl = 'https://api.odos.xyz/sor/assemble';
      const assembleRequestBody = {
        userAddr: address,
        pathId: quote.pathId,
        simulate: true
      };
  
      console.log('Requesting transaction assembly with:', assembleRequestBody);
      const assembleResponse = await axios.post(assembleUrl, assembleRequestBody, {
        headers: { 'Content-Type': 'application/json' }
      });
  
      if (assembleResponse.status !== 200) {
        throw new Error('Failed to assemble transaction');
      }
  
      const transaction = assembleResponse.data.transaction;
      console.log('Transaction assembled:', transaction);
  
      const hash = await walletClient.sendTransaction({
        to: transaction.to as `0x${string}`,
        data: transaction.data as `0x${string}`,
        value: BigInt(transaction.value || 0),
        chain: arbitrum
      });
  
      if (hash) {
        console.log('Transaction submitted:', hash);
        updateStepState(stepId, 'pending');
        const receipt = await waitForTransactionReceipt(config, {
          hash,
          chainId: arbitrum.id,
          timeout: 60_000
        });
  
        if (receipt.status === 'success') {
          console.log('Transaction confirmed');
          updateStepState(stepId, 'confirmed');
          const nextStep = needsWethWrap ? 6 : 5;
          setTimeout(() => setCurrentStep(nextStep), 500);
        } else {
          throw new Error('Transaction failed');
        }
      }
    } catch (error: unknown) {
      console.error('Odos swap error:', error);
      const stepId = needsWethWrap ? 5 : 4;
      updateStepState(stepId, 'failed');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Swap failed: ${errorMessage}`);
    }
  };
  
  

  const handleSiloApproval = async () => {
    if (!selectedAsset) return;
    try {
      updateStepState(1, 'awaitingSignature');
      const tokenToApprove = strategyType === 'deposit'
        ? ADDRESSES.TOKENS[depositAsset as keyof typeof ADDRESSES.TOKENS]
        : ADDRESSES.TOKENS[selectedAsset.symbol as keyof typeof ADDRESSES.TOKENS];

      const isUSDCe = depositAsset === 'USDC.e' || selectedAsset.symbol === 'USDC.e';
      const decimals = isUSDCe ? 6 : 18;

      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

      const hash = await writeContract(config, {
        address: tokenToApprove as `0x${string}`,
        abi: ABIS.ERC20,
        functionName: 'approve',
        args: [
          ADDRESSES.SILO_ROUTER as `0x${string}`,
          maxApproval
        ],
        chain: arbitrum,
      });

      if (hash) {
        updateStepState(1, 'pending');
        await waitForTransactionReceipt(config, {
          hash,
          chainId: arbitrum.id
        });
        updateStepState(1, 'confirmed');
        setTimeout(() => setCurrentStep(2), 500);
      }
    } catch (error: unknown) {
      console.error('Approval error:', error);
      updateStepState(1, 'failed');
      setError('Failed to approve deposit. Please try again.');
    }
  };

  const handleSiloDepositAndBorrow = async () => {
    if (!selectedAsset) return;
    try {
      updateStepState(2, 'awaitingSignature');

      const depositAmountParsed = selectedAsset.symbol === 'USDC.e'
        ? parseUnits(depositAmount, 6)
        : parseEther(depositAmount);

      const borrowAmountParsed = borrowAsset === 'USDC.e' || (strategyType === 'deposit' && depositAsset === 'ETH')
        ? parseUnits(borrowAmount, 6)
        : parseEther(borrowAmount);

      const actions = [
        {
          actionType: 0,
          silo: selectedAsset.marketAddress,
          asset: depositToken,
          amount: depositAmountParsed,
          collateralOnly: false
        },
        {
          actionType: 2,
          silo: selectedAsset.marketAddress,
          asset: strategyType === 'deposit'
            ? ADDRESSES.TOKENS['USDC.e']
            : ADDRESSES.TOKENS[borrowAsset],
          amount: borrowAmountParsed,
          collateralOnly: false
        }
      ];

      const hash = await writeContract(config, {
        address: ADDRESSES.SILO_ROUTER as `0x${string}`,
        abi: ABIS.SILO_ROUTER,
        functionName: 'execute',
        args: [actions],
        value: (strategyType === 'deposit' && depositAsset === 'ETH') ||
               (strategyType !== 'deposit' && selectedAsset.symbol === 'ETH')
          ? depositAmountParsed
          : BigInt(0),
        chain: arbitrum,
      });

      if (hash) {
        updateStepState(2, 'pending');
        await waitForTransactionReceipt(config, {
          hash,
          chainId: arbitrum.id
        });
        updateStepState(2, 'confirmed');
        const nextStep = needsWethWrap ? 3 : 3;
        setTimeout(() => setCurrentStep(nextStep), 500);
      }
    } catch (error: unknown) {
      console.error('Deposit/Borrow error:', error);
      updateStepState(2, 'failed');
      setError('Failed to deposit and borrow. Please try again.');
    }
  };

  const handleVaultApproval = async () => {
    if (!selectedStrategy?.vault) return;
    try {
      console.log("Starting vault approval with:", {
        strategy: selectedStrategy,
        borrowAmount,
        tokenToApprove: selectedStrategy.type === 'YCUSDC' ? 'USDC' : borrowAsset,
        vault: selectedStrategy.vault
      });

      const stepId = (needsWethWrap ? 4 : 3) + (needsUSDCSwap ? 2 : 0);
      updateStepState(stepId, 'awaitingSignature');

      const tokenToApprove = selectedStrategy.type === 'YCUSDC'
      ? ADDRESSES.TOKENS['USDC']
      : selectedStrategy.type === 'CRV_USD'
        ? ADDRESSES.TOKENS['crvUSD']
        : ADDRESSES.TOKENS[borrowAsset];

      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

      console.log("Approval params:", {
        tokenAddress: tokenToApprove,
        spender: selectedStrategy.vault,
        amount: maxApproval.toString()
      });

      const hash = await writeContract(config, {
        address: tokenToApprove as `0x${string}`,
        abi: ABIS.ERC20,
        functionName: 'approve',
        args: [
          selectedStrategy.vault as `0x${string}`,
          maxApproval
        ],
        chain: arbitrum,
      });

      if (hash) {
        console.log("Approval tx hash:", hash);
        updateStepState(stepId, 'pending');
        await waitForTransactionReceipt(config, {
          hash,
          chainId: arbitrum.id
        });
        console.log("Approval confirmed - moving to final step");
        updateStepState(stepId, 'confirmed');
        const nextStep = (needsWethWrap ? 5 : 4) + (needsUSDCSwap ? 2 : 0);
        setTimeout(() => setCurrentStep(nextStep), 500);
      }
    } catch (error: unknown) {
      console.error('Vault approval error:', error);
      const stepId = (needsWethWrap ? 4 : 3) + (needsUSDCSwap ? 2 : 0);
      updateStepState(stepId, 'failed');
      setError('Failed to approve vault. Please try again.');
    }
  };

  const handleVaultDeposit = async () => {
    if (!selectedStrategy?.vault || !address) return;
    try {
      console.log("Starting vault deposit with:", {
        strategy: selectedStrategy,
        borrowAmount,
        userAddress: address
      });
  
      const stepId = (needsWethWrap ? 5 : 4) + (needsUSDCSwap ? 2 : 0);
      updateStepState(stepId, 'awaitingSignature');
  
      const decimals = selectedStrategy.type === 'CRV_USD'
        ? 18 // Assuming crvUSD has 18 decimals
        : (strategyType === 'deposit' && needsUSDCSwap
          ? 6
          : (borrowAsset === 'USDC.e' ? 6 : 18));
  
      const depositAmount = decimals === 18
        ? parseEther(borrowAmount)
        : parseUnits(borrowAmount, decimals);
  
      console.log("Deposit params:", {
        vault: selectedStrategy.vault,
        amount: depositAmount.toString(),
        decimals,
        recipient: address
      });
  
      const hash = await writeContract(config, {
        address: selectedStrategy.vault as `0x${string}`,
        abi: ABIS.VAULT,
        functionName: 'deposit',
        args: [
          depositAmount,
          address as `0x${string}`
        ],
        chain: arbitrum,
      });
  
      if (hash) {
        console.log("Deposit tx hash:", hash);
        updateStepState(stepId, 'pending');
        await waitForTransactionReceipt(config, {
          hash,
          chainId: arbitrum.id
        });
        console.log("Deposit confirmed");
        updateStepState(stepId, 'confirmed');
      }
    } catch (error: unknown) {
      console.error('Vault deposit error:', error);
      const stepId = (needsWethWrap ? 5 : 4) + (needsUSDCSwap ? 2 : 0);
      updateStepState(stepId, 'failed');
      setError('Failed to deposit in vault. Please try again.');
    }
  };
  

const getApprovalTitle = () => {
  if (strategyType === 'deposit' && needsUSDCSwap) {
    return selectedStrategy?.type === 'CRV_USD' 
      ? 'Approve crvUSD for Goat.fi' 
      : 'Approve USDC for Goat.fi';
  }
  return `Approve ${
    needsUSDCSwap 
      ? (selectedStrategy?.type === 'CRV_USD' ? 'crvUSD' : 'USDC') 
      : (borrowAsset === 'ETH' ? 'WETH' : borrowAsset)
  } for Goat.fi`;
};

const getApprovalDescription = () => {
  if (strategyType === 'deposit' && needsUSDCSwap) {
    return selectedStrategy?.type === 'CRV_USD'
      ? 'Approve Goat.fi vault to use your crvUSD'
      : 'Approve Goat.fi vault to use your USDC';
  }
  return `Approve Goat.fi vault to use your ${
    needsUSDCSwap 
      ? (selectedStrategy?.type === 'CRV_USD' ? 'crvUSD' : 'USDC') 
      : (borrowAsset === 'ETH' ? 'WETH' : borrowAsset)
  }`;
};

const getDepositDescription = () => {
  if (strategyType === 'deposit' && needsUSDCSwap) {
    return selectedStrategy?.type === 'CRV_USD'
      ? 'Deposit crvUSD in Goat.fi vault'
      : 'Deposit USDC in Goat.fi vault';
  }
  return `Deposit ${
    needsUSDCSwap 
      ? (selectedStrategy?.type === 'CRV_USD' ? 'crvUSD' : 'USDC') 
      : (borrowAsset === 'ETH' ? 'WETH' : borrowAsset)
  } in Goat.fi vault`;
};

const steps = [
  {
    id: 1,
    title: strategyType === 'deposit'
      ? `Approve ${depositAsset} Deposit`
      : `Approve ${selectedAsset?.symbol || ''} Deposit`,
    description: strategyType === 'deposit'
      ? `Approve Silo market to use your ${depositAsset}`
      : `Approve Silo market to use your ${selectedAsset?.symbol || ''}`,
    action: handleSiloApproval,
    isEnabled: !!selectedAsset && !!depositAmount && hasDepositBalance(depositAmount)
  },
  {
    id: 2,
    title: `Deposit & Borrow`,
    description: strategyType === 'deposit'
      ? `Deposit ${depositAsset} and borrow USDC.e`
      : `Deposit ${selectedAsset?.symbol || ''} and borrow ${borrowAsset}`,
    action: handleSiloDepositAndBorrow,
    isEnabled: !!selectedAsset && (selectedAsset.symbol === 'ETH' || hasSiloApproval(depositAmount))
  },
  ...(needsWethWrap ? [{
    id: 3,
    title: 'Wrap ETH to WETH',
    description: 'Wrap your borrowed ETH to WETH for Goat.fi',
    action: handleWethWrap,
    isEnabled: currentStep === 3
  }] : []),
  ...(needsUSDCSwap ? [
    {
      id: needsWethWrap ? 4 : 3,
      title: 'Approve USDC.e for Odos',
      description: 'Approve Odos router to use your USDC.e',
      action: handleOdosApproval,
      isEnabled: currentStep === (needsWethWrap ? 4 : 3)
    },
    {
      id: needsWethWrap ? 5 : 4,
      title: selectedStrategy?.type === 'CRV_USD' ? 'Swap USDC.e to crvUSD' : 'Swap USDC.e to USDC',
      description: selectedStrategy?.type === 'CRV_USD' ? 'Swap your USDC.e to crvUSD using Odos' : 'Swap your USDC.e to USDC using Odos',
      action: handleOdosSwap,
      isEnabled: currentStep === (needsWethWrap ? 5 : 4)
    }
  ] : []),
  {
    id: (needsWethWrap ? 4 : 3) + (needsUSDCSwap ? 2 : 0),
    title: getApprovalTitle(),
    description: getApprovalDescription(),
    action: handleVaultApproval,
    isEnabled: currentStep === ((needsWethWrap ? 4 : 3) + (needsUSDCSwap ? 2 : 0))
  },
  {
    id: (needsWethWrap ? 5 : 4) + (needsUSDCSwap ? 2 : 0),
    title: `Deposit in Vault`,
    description: getDepositDescription(),
    action: handleVaultDeposit,
    isEnabled: currentStep === ((needsWethWrap ? 5 : 4) + (needsUSDCSwap ? 2 : 0))
  }
];

console.log('Step Debug:', {
  needsUSDCSwap,
  selectedStrategyType: selectedStrategy?.type,
  borrowAsset,
  totalSteps: steps.length,
  currentStep,
  hasSwapSteps: steps.some(s => s.title.includes('Swap'))
});
  
  

  const currentStepObj = steps.find(step => step.id === currentStep);

  if (!address) {
    return (
      <Alert>
        <AlertDescription>
          Please connect your wallet to continue
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <div className="text-sm">Transaction Progress</div>
          <div className="text-sm text-gray-500">
            Step {Math.min(currentStep, steps.length)} of {steps.length}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 rounded-full h-2 transition-all duration-500"
            style={{ width: `${(Math.min(currentStep, steps.length) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-3 rounded-lg border ${
              currentStep === step.id
                ? 'border-blue-500 bg-blue-50'
                : getStepState(step.id) === 'confirmed'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">
                  {step.title}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {step.description}
                </p>
              </div>
              {getStepState(step.id) === 'awaitingSignature' && (
                <span className="text-blue-500 text-sm flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Waiting for signature...
                </span>
              )}
              {getStepState(step.id) === 'pending' && (
                <span className="text-blue-500 text-sm flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Transaction pending...
                </span>
              )}
              {getStepState(step.id) === 'confirmed' && (
                <span className="text-green-500 text-sm">✓ Complete</span>
              )}
              {getStepState(step.id) === 'failed' && (
                <span className="text-red-500 text-sm">✗ Failed</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {currentStepObj && getStepState(currentStep) !== 'confirmed' && (
        <div className="flex justify-end">
          <Button
            onClick={currentStepObj.action}
            disabled={!currentStepObj.isEnabled || ['awaitingSignature', 'pending'].includes(getStepState(currentStep))}
            className="w-48"
          >
            {['awaitingSignature', 'pending'].includes(getStepState(currentStep)) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {getStepState(currentStep) === 'awaitingSignature' ? 'Sign in Wallet...' : 'Processing...'}
              </>
            ) : (
              currentStepObj.title
            )}
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default EnhancedTransactionFlow;
