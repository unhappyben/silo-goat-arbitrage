/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from 'next/image';
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
  }
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
  const [depositAsset, setDepositAsset] = useState('USDC.e');
  const [borrowAsset, setBorrowAsset] = useState('ETH');
  const [activeTab, setActiveTab] = useState<'home' | 'best-strat'>('home');
  const [selectedAsset, setSelectedAsset] = useState<TokenInfo | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<TokenInfo[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  const StrategySelector = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => {
            setStrategyType('borrow');
            setBorrowAsset('ETH');
          }}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
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
          <span className="ml-1">ETH Borrow</span>
        </button>
        <button
          onClick={() => {
            setStrategyType('borrow');
            setBorrowAsset('USDC.e');
          }}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
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
          <span className="ml-1">USDC.e Borrow</span>
        </button>
        <button
          onClick={() => {
            setStrategyType('deposit');
            setDepositAsset('ETH');
          }}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
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
          <span className="ml-1">ETH Deposit</span>
        </button>
        <button
          onClick={() => {
            setStrategyType('deposit');
            setDepositAsset('USDC.e');
          }}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
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
          <span className="ml-1">USDC.e Deposit</span>
        </button>
      </div>
    </div>
  );

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
                name: `${market.marketName} ${depositApy.toFixed(1)}%`,
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
                  name: `${market.marketName} - ETH - ${ethDepositApy.toFixed(1)}%`,
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
                  name: `${market.marketName} - USDC.e - ${usdceDepositApy.toFixed(1)}%`,
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
              return vault.symbol === borrowAsset;
            } else if (strategyType === 'deposit') {
              // When in deposit mode, show vaults for what we'll borrow
              // If depositing ETH, show USDC.e vaults; if depositing USDC.e, show ETH vaults
              return vault.symbol === (depositAsset === 'ETH' ? 'USDC.e' : 'ETH');
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
                      {asset.symbol} - {asset.name}
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
                <label className="block text-sm font-medium mb-1">{strategyType === 'deposit' ? 'Deposit' : 'Collateral'} Amount ($)</label>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Borrow Amount ($)</label>
                <Input
                  type="number"
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                  className="w-full"
                />
                <div className="text-sm text-gray-500 mt-1">
                  Max: ${selectedAsset ? (parseFloat(depositAmount || '0') * selectedAsset.ltv).toFixed(2) : '0.00'}
                </div>
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
              <div>{strategyType === 'deposit' ? 'Deposit' : 'Supply'} {selectedAsset?.symbol}</div>
              <div className="text-sm text-gray-500">${depositAmount || '0'}</div>
            </div>
            <ArrowRight className="h-6 w-6" />
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2" />
              <div>Borrow {strategyType === 'deposit' ? borrowAsset : depositAsset}</div>
              <div className="text-sm text-gray-500">${borrowAmount || '0'}</div>
            </div>
            <ArrowRight className="h-6 w-6" />
            <div className="text-center">
              <Wallet className="h-8 w-8 mx-auto mb-2" />
              <div>Earn on {selectedStrategy?.type}</div>
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
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'home'
                  ? 'bg-gray-200 font-medium'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('best-strat')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'best-strat'
                  ? 'bg-gray-200 font-medium'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Best Yield Strategy
            </button>
          </div>
        </CardHeader>
      </Card>

      {activeTab === 'home' ? renderMainCalculator() : renderBestStrategy()}
    </div>
  );
};

export default YieldArbitrageDashboard;