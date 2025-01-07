import { ADDRESSES } from '@/config/wagmi'

export type TokenSymbol = keyof typeof ADDRESSES.TOKENS;
export type BorrowableToken = 'ETH' | 'USDC.e';

export interface TokenInfo {
  symbol: TokenSymbol;
  name: string;
  borrowApy: number;
  depositApy: number;
  ltv: number;
  marketAddress: string;
}