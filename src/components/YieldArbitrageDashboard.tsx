/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from 'next/image';
import { WalletConnect } from "./WalletConnect";
import { Button } from "@/components/ui/button";
import { useSilo } from '@/hooks/useSilo';
import axios from 'axios';
import { EnhancedTransactionFlow } from './EnhancedTransactionFlow';
import { ArrowRight, TrendingUp, Wallet, Loader2, ExternalLink } from 'lucide-react';



interface MarketData {
  marketSymbol: string;
  marketName: string;
  marketAddress: string;
  maxLTV: number;
  baseAsset: {
    symbol: string;  
    depositTotalApr: string;
  };
  bridgeAssets: Array<{
    symbol: string;
    debtTotalApr: string;
    depositTotalApr?: string; 
  }>;
}

interface TokenInfo {
  symbol: string;  
  name: string;
  borrowApy: number;
  depositApy: number;
  ltv: number;
  marketAddress: string;
}

interface Strategy {
  address: string;
  name: string;
  apy: number;
  type: string;
  vault: string;
}

interface GoatData {
  [key: string]: {
    vaultApy: number;
  };
}

const TARGET_VAULTS = {
  USDC_E: {
    address: '0x8a1eF3066553275829d1c0F64EE8D5871D5ce9d3',
    symbol: 'USDC.e'
  },
  CRV_USD: {
    address: '0xA7781F1D982Eb9000BC1733E29Ff5ba2824cDBE5',
    symbol: 'USDC.e'
  },
  YCSETH: {
    address: '0x878b7897C60fA51c2A7bfBdd4E3cB5708D9eEE43',
    symbol: 'ETH'
  },
  YCETH: {
    address: '0xe1c410eefAeBB052E17E0cB6F1c3197F35765Aab',
    symbol: 'ETH'
  }//,
  //YCUSDC: {
  //  address: '0x0df2e3a0b5997AdC69f8768E495FD98A4D00F134',
 //   symbol: 'USDC'
 // }
};

const LTV_RATIOS: Record<string, number> = {
  "SILO": 0.50, "gmETH": 0.85, "weETH": 0.75, "ezETH": 0.87, "ARB": 0.70,
  "PENDLE": 0.50, "GRAIL": 0.50, "wstETH": 0.80, "WBTC": 0.80, "GNS": 0.50,
  "ETH+": 0.82, "WINR": 0.50, "tBTC": 0.75, "rETH": 0.70, "wUSD+": 0.88,
  "WOO": 0.50, "PEAS": 0.50, "GMX": 0.70, "TANGO": 0.65, "uniETH": 0.82,
  "MAGIC": 0.60, "PT-eETH (26 Dec)": 0.82, "PREMIA": 0.50, "PT-rsETH (26 Dec)": 0.87,
  "RDNT": 0.65, "JONES": 0.50, "WOETH": 0.85, "PT-ezETH (26 Dec)": 0.87,
  "DOPEX": 0.55, "Y2K": 0.50, "UNI": 0.50, "wUSDM": 0.90, "PT-eETH (26 Sept)": 0.85,
  "stEUR": 0.75, "PT-ezETH (26 Sept)": 0.80, "PT-USDe (29 Aug)": 0.87, "JOE": 0.45,
  "PT-USDe (28 Nov)": 0.87, "DLCBTC": 0.82, "ORDER": 0.60, "PT-rsETH (26 Jun 2025)": 0.90,
  "PT-eETH (26 Jun 2025)": 0.90
};

const LTV_ETH_RATIOS: Record<string, number> = {
  "SILO": 0.75, "gmETH": 0.85, "weETH": 0.75, "ezETH": 0.85, "ARB": 0.75,
  "PENDLE": 0.75, "GRAIL": 0.75, "wstETH": 0.85, "WBTC": 0.80, "GNS": 0.75,
  "ETH+": 0.5, "WINR": 0.50, "tBTC": 0.65, "rETH": 0.75, "wUSD+": 0.85,
  "WOO": 0.50, "PEAS": 0.50, "GMX": 0.75, "TANGO": 0.65, "uniETH": 0.82,
  "MAGIC": 0.75, "PREMIA": 0.75, 
  "RDNT": 0.65, "JONES": 0.75, "WOETH": 0.85, "Y2K": 0.75, "UNI": 0.75, "wUSDM": 0.80, 
  "stEUR": 0.75, "JOE": 0.65,
   "DLCBTC": 0.82, "ORDER": 0.60
};

const LTV_USDCE_RATIOS: Record<string, number> = {
  "SILO": 0.80, "gmETH": 0.50, "weETH": 0.4, "ezETH": 0.2, "ARB": 0.8,
  "PENDLE": 0.75, "GRAIL": 0.75, "wstETH": 0.80, "WBTC": 0.80, "GNS": 0.8,
  "ETH+": 0.2, "WINR": 0.50, "tBTC": 0.65, "rETH": 0.80, "wUSD+": 0.1,
  "WOO": 0.50, "PEAS": 0.50, "GMX": 0.80, "TANGO": 0.65, "uniETH": 0.1,
  "MAGIC": 0.8,  "PREMIA": 0.8, 
  "RDNT": 0.65, "JONES": 0.8, "WOETH": 0.2, 
  "Y2K": 0.8, "UNI": 0.8, "wUSDM": 0.8, 
  "stEUR": 0.75, "JOE": 0.65,
   "DLCBTC": 0.82, "ORDER": 0.60
};

const formatTokenAddress = (chain: string, address: string) => {
  return address;  
};

const TOKENS = {
  // Base tokens
  ETH: formatTokenAddress('arbitrum', '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'),
  USDC_E: formatTokenAddress('arbitrum', '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'),
  USDC: formatTokenAddress('arbitrum', '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'),

  // Tokens from LTV_RATIOS
  SILO: formatTokenAddress('arbitrum', '0x0341c0c0ec423328621788d4854119b97f44e391'),
  GM_ETH: formatTokenAddress('arbitrum', '0xfB3264D1129824933a52374c2C1696F4470D041e'),
  WE_ETH: formatTokenAddress('arbitrum', '0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe'),
  EZ_ETH: formatTokenAddress('arbitrum', '0x2416092f143378750bb29b79eD961ab195CcEea5'),
  ARB: formatTokenAddress('arbitrum', '0x912ce59144191c1204e64559fe8253a0e49e6548'),
  PENDLE: formatTokenAddress('arbitrum', '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8'),
  GRAIL: formatTokenAddress('arbitrum', '0x3d9907f9a368ad0a51be60f7da3b97cf940982d8'),
  WST_ETH: formatTokenAddress('arbitrum', '0x5979D7b546E38E414F7E9822514be443A4800529'),
  WBTC: formatTokenAddress('arbitrum', '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'),
  GNS: formatTokenAddress('arbitrum', '0x18c11FD286C5EC11c3b683Caa813B77f5163A122'),
  ETH_PLUS: formatTokenAddress('arbitrum', '0x18C14C2D707b2212e17d1579789Fc06010cfca23'),
  WINR: formatTokenAddress('arbitrum', '0xD77B108d4f6cefaa0Cae9506A934e825BEccA46E'),
  tbtc: formatTokenAddress('arbitrum', '0x6c84a8f1c29108F47a79964b5Fe888D4f4D0dE40'),
  R_ETH: formatTokenAddress('arbitrum', '0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8'),
  W_USD_PLUS: formatTokenAddress('arbitrum', '0xB86fb1047A955C0186c77ff6263819b37B32440D'),
  WOO: formatTokenAddress('arbitrum', '0xcAFcD85D8ca7Ad1e1C6F82F651fA15E33AEfD07b'),
  PEAS: formatTokenAddress('arbitrum', '0x02f92800F57BCD74066F5709F1Daa1A4302Df875'),
  GMX: formatTokenAddress('arbitrum', '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'),
  TANGO: formatTokenAddress('arbitrum', '0xC760F9782F8ceA5B06D862574464729537159966'),
  UNI_ETH: formatTokenAddress('arbitrum', '0x3d15fD46CE9e551498328B1C83071D9509E2C3a0'),
  MAGIC: formatTokenAddress('arbitrum', '0x539bdE0d7Dbd336b79148AA742883198BBF60342'),
  PREMIA: formatTokenAddress('arbitrum', '0x51fC0f6660482Ea73330E414eFd7808811a57Fa2'),
  RDNT: formatTokenAddress('arbitrum', '0x3082CC23568eA640225c2467653dB90e9250AaA0'),
  JONES: formatTokenAddress('arbitrum', '0x10393c20975cF177a3513071bC110f7962CD67da'),
  WOETH: formatTokenAddress('arbitrum', '0xd8724322f44e5c58d7a815f542036fb17dbbf839'),
  Y2K: formatTokenAddress('arbitrum', '0x65c936f008BC34fE819bce9Fa5afD9dc2d49977f'),
  UNI: formatTokenAddress('arbitrum', '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0'),
  W_USDM: formatTokenAddress('arbitrum', '0x57F5E098CaD7A3D1Eed53991D4d66C45C9AF7812'),
  ST_EUR: formatTokenAddress('arbitrum', '0x004626A008B1aCdC4c74ab51644093b155e59A23'),
  JOE: formatTokenAddress('arbitrum', '0xf57f2cCbB30c3C5ea982F21195df435d179d6b48'),
  DLC_BTC: formatTokenAddress('arbitrum', '0x050C24dBf1eEc17babE5fc585F06116A259CC77A'),
  ORDER: formatTokenAddress('arbitrum', '0x4E200fE2f3eFb977d5fd9c430A41531FB04d97B8'),
  
  // Additional specific tokens
  PT_EETH_DEC: formatTokenAddress('arbitrum', 'PT-eETH (26 Dec)'),
  PT_RSET_DEC: formatTokenAddress('arbitrum', 'PT-rsETH (26 Dec)'),
  PT_EZETH_DEC: formatTokenAddress('arbitrum', 'PT-ezETH (26 Dec)'),
  PT_EETH_SEPT: formatTokenAddress('arbitrum', 'PT-eETH (26 Sept)'),
  PT_EZETH_SEPT: formatTokenAddress('arbitrum', 'PT-ezETH (26 Sept)'),
  PT_USDCE_AUG: formatTokenAddress('arbitrum', 'PT-USDe (29 Aug)'),
  PT_USDCE_NOV: formatTokenAddress('arbitrum', 'PT-USDe (28 Nov)'),
  PT_RSET_LONG: formatTokenAddress('arbitrum', 'PT-rsETH (26 Jun 2025)'),
  PT_EETH_LONG: formatTokenAddress('arbitrum', 'PT-eETH (26 Jun 2025)'),
};




const calculateBestStrategy = (assets: TokenInfo[], strategies: Strategy[]) => {
  const DEPOSIT_AMOUNT = 1000;
  const LTV_SAFETY_FACTOR = 0.8;
  
  let bestStrategy = {
    asset: null as TokenInfo | null,
    strategy: null as Strategy | null,
    borrowAmount: 0,
    netYield: -Infinity,
    depositYield: 0,
    borrowCost: 0,
    strategyYield: 0
  };

  assets.forEach(asset => {
    const maxBorrow = DEPOSIT_AMOUNT * asset.ltv * LTV_SAFETY_FACTOR;
    
    strategies.forEach(strategy => {
      const depositYield = DEPOSIT_AMOUNT * (asset.depositApy / 100);
      const borrowCost = maxBorrow * (asset.borrowApy / 100);
      const strategyYield = maxBorrow * (strategy.apy / 100);
      const netYield = depositYield + strategyYield - borrowCost;
      
      if (netYield > bestStrategy.netYield) {
        bestStrategy = {
          asset,
          strategy,
          borrowAmount: maxBorrow,
          netYield,
          depositYield,
          borrowCost,
          strategyYield
        };
      }
    });
  });
  
  return bestStrategy;
};

const YieldArbitrageDashboard = () => {
  const [strategyType, setStrategyType] = useState('borrow');
  const [depositAsset, setDepositAsset] = useState<'ETH' | 'USDC.e'>('USDC.e');
  const [isExecuting, setIsExecuting] = useState(false);
  const [borrowAsset, setBorrowAsset] = useState<'ETH' | 'USDC.e'>('ETH');
  const [activeTab, setActiveTab] = useState<'home' | 'best-strat'>('home');
  const [selectedAsset, setSelectedAsset] = useState<TokenInfo | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<TokenInfo[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const { depositAndBorrow } = useSilo(
    selectedAsset?.marketAddress || '', 
    borrowAsset  
  );
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(false);

  const fetchTokenPrice = async (tokenKey: string) => {
    try {
      setPriceLoading(true);
      const tokenAddress = TOKENS[tokenKey as keyof typeof TOKENS];
      
      if (!tokenAddress) {
        console.error(`No token address found for ${tokenKey}`);
        return;
      }
  
      // Add chain prefix for API call
      const defilllamaAddress = `arbitrum:${tokenAddress}`;
      
      const response = await axios.get(
        `https://coins.llama.fi/prices/current/${defilllamaAddress}`
      );
      
      const price = response.data.coins[defilllamaAddress]?.price;
      
      if (price) {
        setPrices(prev => ({
          ...prev,
          [tokenAddress]: price  // Store with original address as key
        }));
      }
    } catch (error) {
      console.error(`Error fetching price for ${tokenKey}:`, error);
    } finally {
      setPriceLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAsset) {
      fetchTokenPrice(selectedAsset.symbol);
    }
  }, [selectedAsset]);

  // Fetch price for borrow asset
  useEffect(() => {
    fetchTokenPrice(borrowAsset);
  }, [borrowAsset]);

  //hardcoded bc for some reason defillama api didnt like usdce -- too lazy to look at 
  const getUSDValue = (amount: string, token: string) => {
    if (token === 'USDC.e') {
      return parseFloat(amount).toFixed(2);  // Direct 1:1 conversion
    }
    const tokenAddress = TOKENS[token as keyof typeof TOKENS];
    const tokenPrice = prices[tokenAddress];
    return tokenPrice ? (parseFloat(amount) * tokenPrice).toFixed(2) : '0.00';
  };

  const getMaxBorrow = () => {
    if (!selectedAsset || !depositAmount) return 0;
    
    // For deposit strategies
    if (strategyType === 'deposit') {
      const depositUsdValue = depositAsset === 'USDC.e' 
        ? parseFloat(depositAmount) // 1:1 for USDC.e
        : parseFloat(depositAmount) * (prices[TOKENS['ETH' as keyof typeof TOKENS]] || 0);
      return depositUsdValue * selectedAsset.ltv;
    }
    
    // For borrow strategies
    const depositUsdValue = selectedAsset.symbol === 'USDC.e'
      ? parseFloat(depositAmount)
      : parseFloat(depositAmount) * (prices[TOKENS[selectedAsset.symbol as keyof typeof TOKENS]] || 0);
    return depositUsdValue * selectedAsset.ltv;
  };
  
  const isOverMaxBorrow = () => {
    const maxBorrow = getMaxBorrow();
    if (maxBorrow === 0) return false;
    
    const currentBorrowUsd = strategyType === 'deposit'
      ? (depositAsset === 'ETH' 
          ? parseFloat(borrowAmount || '0') // USDC.e borrow
          : parseFloat(borrowAmount || '0') * (prices[TOKENS['ETH' as keyof typeof TOKENS]] || 0)) // ETH borrow
      : (borrowAsset === 'USDC.e'
          ? parseFloat(borrowAmount || '0')
          : parseFloat(borrowAmount || '0') * (prices[TOKENS[borrowAsset as keyof typeof TOKENS]] || 0));
          
    return currentBorrowUsd > maxBorrow;
  };


const StrategySelector = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <button
        onClick={() => {
          console.log('Strategy button clicked');
          setStrategyType('borrow');
          setBorrowAsset('ETH');
        }}
        className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 p-3 md:px-4 md:py-2 rounded-lg transition-all tab-button ${
          strategyType === 'borrow' && borrowAsset === 'ETH' ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        <Image 
          src="https://assets.coingecko.com/coins/images/279/standard/ethereum.png?1696501628" 
          alt="ETH"
          width={24} 
          height={24} 
          className="h-6 w-6" 
        />
        <span className="text-sm md:text-base text-center">ETH Borrow</span>
      </button>
      <button
        onClick={() => {
          console.log('Strategy button clicked');
          setStrategyType('borrow');
          setBorrowAsset('USDC.e');
        }}
        className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 p-3 md:px-4 md:py-2 rounded-lg transition-all tab-button ${
          strategyType === 'borrow' && borrowAsset === 'USDC.e' ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        <Image 
          src="https://assets.coingecko.com/coins/images/6319/standard/usdc.png?1696506694" 
          alt="USDC.e"
          width={24} 
          height={24} 
          className="h-6 w-6"
        />
        <span className="text-sm md:text-base text-center">USDC.e Borrow</span>
      </button>
      <button
        onClick={() => {
          console.log('Strategy button clicked');
          setStrategyType('deposit');
          setDepositAsset('ETH');
        }}
        className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 p-3 md:px-4 md:py-2 rounded-lg transition-all tab-button ${
          strategyType === 'deposit' && depositAsset === 'ETH' ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        <Image 
          src="https://assets.coingecko.com/coins/images/279/standard/ethereum.png?1696501628" 
          alt="ETH"
          width={24} 
          height={24} 
          className="h-6 w-6"
        />
        <span className="text-sm md:text-base text-center">ETH Deposit</span>
      </button>
      <button
        onClick={() => {
          console.log('Strategy button clicked');
          setStrategyType('deposit');
          setDepositAsset('USDC.e');
        }}
        className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 p-3 md:px-4 md:py-2 rounded-lg transition-all tab-button ${
          strategyType === 'deposit' && depositAsset === 'USDC.e' ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        <Image 
          src="https://assets.coingecko.com/coins/images/6319/standard/usdc.png?1696506694" 
          alt="USDC.e"
          width={24} 
          height={24} 
          className="h-6 w-6"
        />
        <span className="text-sm md:text-base text-center">USDC.e Deposit</span>
      </button>
    </div>
  </div>
);

const executeTransaction = async () => {
  try {
    setIsExecuting(true);
    if (!selectedAsset?.symbol) throw new Error('No asset selected');
    await depositAndBorrow(
      depositAmount,
      borrowAmount,
      selectedAsset.symbol
    );
  } catch (error) {
    console.error('Transaction failed:', error);
  } finally {
    setIsExecuting(false);
  }
};

  

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const siloResponse = await fetch('https://app.silo.finance');
        const html = await siloResponse.text();
        const scriptMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        
        if (!scriptMatch) throw new Error('Could not find market data');
        
        const jsonData = JSON.parse(scriptMatch[1]);
        const siloData = jsonData.props.pageProps.data;
        const timestamp = Date.now();
        const goatResponse = await fetch(`https://api.goat.fi/apy/breakdown?_=${timestamp}`);
        const goatData: GoatData = await goatResponse.json();
  
        const markets: MarketData[] = siloData.marketsByProtocol
          .find((p: { protocolKey: string }) => p.protocolKey === 'arbitrum')?.markets || [];
  
        const processedAssets = markets
          .filter(market => {
            const logData = {
              marketSymbol: market.marketSymbol,
              marketName: market.marketName,
              baseAsset: market.baseAsset,
              bridgeAssets: market.bridgeAssets
            };
            console.log('Processing market:', logData);

            if (!market.bridgeAssets?.length) return false;
            
            if (strategyType === 'borrow') {
              // For borrow strategies, show markets that can borrow the target asset
              return market.bridgeAssets.some(asset => asset.symbol === borrowAsset);
            } else if (strategyType === 'deposit') {
              // For deposit mode:
              const ethAsset = market.bridgeAssets.find(asset => asset.symbol === 'ETH');
              const usdceAsset = market.bridgeAssets.find(asset => asset.symbol === 'USDC.e');
              
              // Check if this market:
              // 1. Has both ETH and USDC.e as bridge assets
              // 2. Market exists in our LTV ratios
              // 3. Has non-zero deposit and borrow APRs
              if (depositAsset === 'ETH') {
                return ethAsset && usdceAsset && 
                       LTV_ETH_RATIOS[market.marketSymbol] && 
                       Number(ethAsset.depositTotalApr) > 0 && 
                       Number(usdceAsset.debtTotalApr) > 0;
              } else {
                return ethAsset && usdceAsset && 
                       LTV_USDCE_RATIOS[market.marketSymbol] && 
                       Number(usdceAsset.depositTotalApr) > 0 && 
                       Number(ethAsset.debtTotalApr) > 0;
              }
            }
            return false;
          })
          .map(market => {
            if (strategyType === 'borrow') {
              // Original borrow mode logic
              const depositApy = Number(market.baseAsset.depositTotalApr) / 1e18 * 100;
              const bridgeAsset = market.bridgeAssets.find(asset => asset.symbol === borrowAsset);
              const borrowApy = bridgeAsset ? Number(bridgeAsset.debtTotalApr) / 1e18 * 100 : 0;
              
              return {
                symbol: market.marketSymbol,
                name: `${market.marketSymbol} ${depositApy.toFixed(1)}%`,
                borrowApy,
                depositApy,
                ltv: LTV_RATIOS[market.marketSymbol],
                marketAddress: market.marketAddress
              };
            } else if (strategyType === 'deposit') {
              // Deposit mode logic
              const ethAsset = market.bridgeAssets.find(asset => asset.symbol === 'ETH');
              const usdceAsset = market.bridgeAssets.find(asset => asset.symbol === 'USDC.e');
              
              if (depositAsset === 'ETH') {
                // ETH Deposit mode
                const ethDepositApy = Number(ethAsset!.depositTotalApr) / 1e18 * 100;
                const usdceBorrowApy = Number(usdceAsset!.debtTotalApr) / 1e18 * 100;
                
                return {
                  symbol: market.marketSymbol,
                  name: `${market.marketSymbol} - ETH - ${ethDepositApy.toFixed(1)}%`,
                  borrowApy: usdceBorrowApy,
                  depositApy: ethDepositApy,
                  ltv: LTV_ETH_RATIOS[market.marketSymbol],
                  marketAddress: market.marketAddress
                };
              } else {
                // USDC.e Deposit mode
                const usdceDepositApy = Number(usdceAsset!.depositTotalApr) / 1e18 * 100;
                const ethBorrowApy = Number(ethAsset!.debtTotalApr) / 1e18 * 100;
                
                return {
                  symbol: market.marketSymbol,
                  name: `${market.marketSymbol} - USDC.e - ${usdceDepositApy.toFixed(1)}%`,
                  borrowApy: ethBorrowApy,
                  depositApy: usdceDepositApy,
                  ltv: LTV_USDCE_RATIOS[market.marketSymbol],
                  marketAddress: market.marketAddress
                };
              }
            }
            
            // Shouldn't reach here, but TypeScript wants a return
            return null;
          })
          .filter((asset): asset is TokenInfo => asset !== null);
  
        setAssets(processedAssets);
  
        const processedStrategies = Object.entries(TARGET_VAULTS)
        .filter(([_, vault]) => {
          if (strategyType === 'borrow') {
            // When in borrow mode, show vaults for the borrowed asset
            // If borrowing USDC.e, show both USDC.e and USDC vaults
            if (borrowAsset === 'USDC.e') {
              return vault.symbol === 'USDC.e' || vault.symbol === 'USDC';
            }
            return vault.symbol === borrowAsset;
          } else if (strategyType === 'deposit') {
            // When in deposit mode, show vaults for what we'll borrow
            if (depositAsset === 'ETH') {
              // If depositing ETH, show both USDC.e and USDC vaults
              return vault.symbol === 'USDC.e' || vault.symbol === 'USDC';
            } else {
              // If depositing USDC.e, show ETH vaults
              return vault.symbol === 'ETH';
            }
          }
          return false;
        })
          .map(([key, vault]) => ({
            address: vault.address,
            name: `${key.replace('_', '.')} Vault Strategy`,
            apy: (goatData[vault.address]?.vaultApy || 0) * 100,
            type: key.replace('_', '.'),
            vault: vault.address
          }))
          .filter(strategy => strategy.apy > 0);
  
        setStrategies(processedStrategies);
        if (processedAssets.length > 0) setSelectedAsset(processedAssets[0]);
        if (processedStrategies.length > 0) setSelectedStrategy(processedStrategies[0]);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [strategyType, borrowAsset, depositAsset]);


  const getSiloUrl = (address: string) => `https://app.silo.finance/silo/${address}`;
  const getGoatUrl = (address: string) => `https://app.goat.fi/#/arbitrum/vault/${address}`;

  const calculateYields = () => {
    if (!selectedAsset || !selectedStrategy || !depositAmount || !borrowAmount) return null;
    
    const deposit = parseFloat(depositAmount);
    const borrow = parseFloat(borrowAmount);
    
    if (isNaN(deposit) || isNaN(borrow) || deposit <= 0 || borrow <= 0) return null;
  
    const depositPrice = prices[TOKENS[selectedAsset.symbol as keyof typeof TOKENS]] || 0;
    const borrowPrice = prices[TOKENS[borrowAsset as keyof typeof TOKENS]] || 0;
  
    const depositYield = deposit * (selectedAsset.depositApy / 100);
    const borrowCost = borrow * (selectedAsset.borrowApy / 100);
    const strategyYield = borrow * (selectedStrategy.apy / 100);
    const netYield = depositYield + strategyYield - borrowCost;
    
    return netYield;
  };

  const calculateTimeFrameYields = () => {
    const annualYield = calculateYields();
    if (!annualYield) return null;
    
    return {
      daily: annualYield / 365,
      weekly: annualYield / 52,
      monthly: annualYield / 12,
      annual: annualYield
    };
  };

  const renderMainCalculator = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Silo x Goat.fi Yield Arbitrage Calculator
        </CardTitle>
        <div className="text-sm text-gray-500">
          Made by <a href="https://twitter.com/unhappyben" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">@unhappyben</a>
        </div>
        <StrategySelector />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {strategyType === 'deposit' 
                    ? 'Select Deposit Market' 
                    : 'Select Collateral Asset'
                  }
                </label>
                <select 
                  className="w-full p-2 border rounded"
                  value={selectedAsset?.symbol || ''}
                  onChange={(e) => {
                    const asset = assets.find(a => a.symbol === e.target.value);
                    setSelectedAsset(asset || null);
                  }}
                >
                  {assets.map((asset) => (
                    <option key={asset.symbol} value={asset.symbol}>
                      {asset.name}
                    </option>
                  ))}
                </select>
                {selectedAsset && (
                  <a 
                    href={getSiloUrl(selectedAsset.marketAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-1"
                  >
                    {strategyType === 'deposit' ? 'Deposit' : 'Supply'} {selectedAsset.symbol} here <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {strategyType === 'deposit' ? 'Deposit' : 'Collateral'} Amount
                </label>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full"
                />
                {selectedAsset && prices[TOKENS[selectedAsset.symbol as keyof typeof TOKENS]] && (
                  <div className="text-sm text-gray-500 mt-1">
                    ≈ ${getUSDValue(depositAmount, selectedAsset.symbol)} USD
                    {priceLoading && <span className="ml-2 text-blue-500">Updating price...</span>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Borrow Amount ({strategyType === 'deposit' 
                    ? (depositAsset === 'ETH' ? 'USDC.e' : 'ETH')
                    : borrowAsset})
                </label>
                <Input
                  type="number"
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                  className={`w-full ${isOverMaxBorrow() ? 'border-red-500 ring-red-500' : ''}`}
                />
                {(() => {
                  const priceToken = strategyType === 'deposit'
                    ? (depositAsset === 'ETH' ? 'USDC.e' : 'ETH')
                    : borrowAsset;
                  
                  return (
                    <div className="text-sm text-gray-500 mt-1">
                      ≈ ${getUSDValue(borrowAmount, priceToken)} USD
                      {priceLoading && <span className="ml-2 text-blue-500">Updating price...</span>}
                    </div>
                  );
                })()}
                <div className={`text-sm mt-1 ${isOverMaxBorrow() ? 'text-red-500' : 'text-gray-500'}`}>
                  Max: ${getMaxBorrow().toFixed(2)}
                </div>
                {isOverMaxBorrow() && (
                  <div className="text-sm text-red-500 mt-1">
                    Borrow amount exceeds maximum allowed
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Strategy</label>
                <select 
                  className="w-full p-2 border rounded"
                  value={selectedStrategy?.type || ''}
                  onChange={(e) => {
                    const strategy = strategies.find(s => s.type === e.target.value);
                    setSelectedStrategy(strategy || null);
                  }}
                >
                  {strategies.map((strategy) => (
                    <option key={strategy.type} value={strategy.type}>
                      {strategy.name} ({strategy.apy.toFixed(2)}% APY)
                    </option>
                  ))}
                </select>
                {selectedStrategy && (
                  <a 
                    href={getGoatUrl(selectedStrategy.vault)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-1"
                  >
                    Earn yield here <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                )}

              <EnhancedTransactionFlow
                depositAmount={depositAmount}
                borrowAmount={borrowAmount}
                selectedAsset={selectedAsset}
                selectedStrategy={selectedStrategy}
                strategyType={strategyType}
                borrowAsset={borrowAsset}
                depositAsset={depositAsset}
              />

              </div>
            </div>
          </Card>

          {/* Stats Section */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">Max LTV:</span>
                <span>{selectedAsset ? (selectedAsset.ltv * 100).toFixed(0) : 0}%</span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">{strategyType === 'deposit' ? 'Deposit' : 'Collateral'} APY:</span>
                <span className="text-green-500">+{selectedAsset?.depositApy.toFixed(2)}%</span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">Borrow APY:</span>
                <span className="text-red-500">-{selectedAsset?.borrowApy.toFixed(2)}%</span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">Strategy APY:</span>
                <span className="text-green-500">+{selectedStrategy?.apy.toFixed(2)}%</span>
              </div>

              <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                <span className="font-medium">Net Annual Yield:</span>
                <span className={`${calculateYields() !== null && calculateYields()! >= 0 ? "text-green-500" : "text-red-500"}`}>
                  ${calculateYields()?.toFixed(2) || '0.00'}
                </span>
              </div>

              {calculateTimeFrameYields() && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium">Estimated Returns</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-sm text-gray-600">Daily</div>
                      <div className="font-medium">${calculateTimeFrameYields()!.daily.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-sm text-gray-600">Weekly</div>
                      <div className="font-medium">${calculateTimeFrameYields()!.weekly.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-sm text-gray-600">Monthly</div>
                      <div className="font-medium">${calculateTimeFrameYields()!.monthly.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-sm text-gray-600">Annual</div>
                      <div className="font-medium">${calculateTimeFrameYields()!.annual.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Flow Diagram */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <Wallet className="h-8 w-8 mx-auto mb-2" />
              <div>{strategyType === 'deposit' ? `Deposit ${depositAsset}` : `Supply ${selectedAsset?.symbol}`}</div>
              <div className="text-sm text-gray-500">${depositAmount || '0'}</div>
            </div>
            <ArrowRight className="h-6 w-6" />
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2" />
              <div>Borrow {strategyType === 'deposit' ? (depositAsset === 'ETH' ? 'USDC.e' : 'ETH') : borrowAsset}</div>
              <div className="text-sm text-gray-500">${borrowAmount || '0'}</div>
            </div>
            <ArrowRight className="h-6 w-6" />
            <div className="text-center">
              <Wallet className="h-8 w-8 mx-auto mb-2" />
              <div>Earn on {strategyType === 'deposit' ? (depositAsset === 'ETH' ? 'USDC.e' : 'ETH') : selectedStrategy?.type}</div>
              <div className="text-sm text-green-500">+{selectedStrategy?.apy.toFixed(2)}% APY</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderBestStrategy = () => {
    const bestStrategy = calculateBestStrategy(assets, strategies);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Best Yield Strategy
          </CardTitle>
          <div className="text-sm text-gray-500">
            Made by <a href="https://twitter.com/unhappyben" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">@unhappyben</a>
          </div>
        </CardHeader>
        <CardContent>
          {bestStrategy.asset && bestStrategy.strategy ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Best Asset</div>
                  <div className="font-medium">{bestStrategy.asset.symbol}</div>
                  <div className="text-sm text-green-500">+{bestStrategy.asset.depositApy.toFixed(2)}% Deposit APY</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Optimal Strategy</div>
                  <div className="font-medium">{bestStrategy.strategy.name}</div>
                  <div className="text-sm text-green-500">+{bestStrategy.strategy.apy.toFixed(2)}% Strategy APY</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Positions</div>
                  <div className="font-medium">Deposit: $1,000</div>
                  <div className="font-medium">Borrow: ${bestStrategy.borrowAmount.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-2 italic">*assumes safe borrow of 80% of LTV</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 font-medium">Projected Returns</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Daily</div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Deposit:</span>
                          <span className="text-green-500">+${(bestStrategy.depositYield / 365).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Strategy:</span>
                          <span className="text-green-500">+${(bestStrategy.strategyYield / 365).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Borrow:</span>
                          <span className="text-red-500">-${(bestStrategy.borrowCost / 365).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium pt-1 border-t">
                          <span>Net:</span>
                          <span className="text-blue-600">${(bestStrategy.netYield / 365).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Weekly</div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Deposit:</span>
                          <span className="text-green-500">+${(bestStrategy.depositYield / 52).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Strategy:</span>
                          <span className="text-green-500">+${(bestStrategy.strategyYield / 52).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Borrow:</span>
                          <span className="text-red-500">-${(bestStrategy.borrowCost / 52).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium pt-1 border-t">
                          <span>Net:</span>
                          <span className="text-blue-600">${(bestStrategy.netYield / 52).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Monthly</div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Deposit:</span>
                          <span className="text-green-500">+${(bestStrategy.depositYield / 12).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Strategy:</span>
                          <span className="text-green-500">+${(bestStrategy.strategyYield / 12).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Borrow:</span>
                          <span className="text-red-500">-${(bestStrategy.borrowCost / 12).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium pt-1 border-t">
                          <span>Net:</span>
                          <span className="text-blue-600">${(bestStrategy.netYield / 12).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Yearly</div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Deposit:</span>
                          <span className="text-green-500">+${bestStrategy.depositYield.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Strategy:</span>
                          <span className="text-green-500">+${bestStrategy.strategyYield.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Borrow:</span>
                          <span className="text-red-500">-${bestStrategy.borrowCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium pt-1 border-t">
                          <span>Net:</span>
                          <span className="text-blue-600">${bestStrategy.netYield.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">Loading best strategy...</div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <CardTitle className="text-red-500">Error loading data</CardTitle>
          <CardContent>{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-4">
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2 rounded-md tab-button ${
                activeTab === 'home'
                  ? 'bg-gray-200 font-medium'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('best-strat')}
              className={`px-4 py-2 rounded-md tab-button ${
                activeTab === 'best-strat'
                  ? 'bg-gray-200 font-medium'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Best Yield Strategy
            </button>
          </div>
          <WalletConnect />
        </div>
      </CardHeader>
    </Card>

      {activeTab === 'home' ? renderMainCalculator() : renderBestStrategy()}
    </div>
  );
};

export default YieldArbitrageDashboard;