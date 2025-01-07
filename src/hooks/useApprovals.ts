// src/hooks/useApprovals.ts
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { ADDRESSES, ABIS } from '@/config/wagmi';
import { parseUnits, parseEther } from 'viem';

export function useApprovals(
  token: string,
  spender: string,
  amount: string,
  decimals: number = 18
) {
  const { address } = useAccount();
  
  // Check allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: token as `0x${string}`,
    abi: ABIS.ERC20,
    functionName: 'allowance',
    args: address && spender ? [
      address as `0x${string}`,
      spender as `0x${string}`
    ] : undefined,
    query: {
      enabled: Boolean(address && token && token !== ADDRESSES.TOKENS.ETH && token !== '')
    }
  });

  // Check token balance
  const { data: balance } = useReadContract({
    address: token as `0x${string}`,
    abi: ABIS.ERC20,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: Boolean(address && token && token !== ADDRESSES.TOKENS.ETH && token !== '')
    }
  });

  const { writeContract: approve, isPending } = useWriteContract();

  const approveToken = async () => {
    if (!token || token === ADDRESSES.TOKENS.WETH || token === '') {
      console.log('Invalid token for approval:', token);
      return;
    }

    try {
      console.log('Approving token:', token);
      console.log('Amount:', amount);
      console.log('Decimals:', decimals);

      const hash = await approve({
        address: token as `0x${string}`,
        abi: ABIS.ERC20,
        functionName: 'approve',
        args: [
          spender as `0x${string}`,
          decimals === 18 
            ? parseEther(amount || '0')
            : parseUnits(amount || '0', decimals)
        ]
      });

      console.log('Approval hash:', hash);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refetchAllowance();
      return hash;
    } catch (error) {
      console.error('Approval error:', error);
      throw error;
    }
  };

  const hasApproval = (amount: string): boolean => {
    if (!allowance || !amount) return false;
    if (token === ADDRESSES.TOKENS.WETH || token === '') return true;
    
    try {
      const requiredAmount = decimals === 18 
        ? parseEther(amount || '0')
        : parseUnits(amount || '0', decimals);
        
      const allowanceBigInt = BigInt(allowance?.toString() || '0');
      console.log('Current allowance:', allowanceBigInt.toString());
      console.log('Required amount:', requiredAmount.toString());
      
      return allowanceBigInt >= requiredAmount;
    } catch (error) {
      console.error('Error checking approval:', error);
      return false;
    }
  };

  const hasBalance = (amount: string): boolean => {
    if (!balance || !amount) return false;
    if (token === ADDRESSES.TOKENS.WETH || token === '') return true;
    
    try {
      const requiredAmount = decimals === 18 
        ? parseEther(amount || '0')
        : parseUnits(amount || '0', decimals);
        
      const balanceBigInt = BigInt(balance?.toString() || '0');
      console.log('Current balance:', balanceBigInt.toString());
      console.log('Required amount:', requiredAmount.toString());
      
      return balanceBigInt >= requiredAmount;
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  };

  return {
    allowance,
    balance,
    approveToken,
    hasApproval,
    hasBalance,
    isApproving: isPending
  };
}