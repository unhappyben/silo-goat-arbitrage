"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, TrendingUp, Wallet, Loader2, ExternalLink } from 'lucide-react';

interface MarketData {
  marketSymbol: string;
  marketName: string;
  marketAddress: string;
  maxLTV: number;
  baseAsset: {
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
  USDC_E: '0x8a1eF3066553275829d1c0F64EE8D5871D5ce9d3',
  CRV_USD: '0xA7781F1D982Eb9000BC1733E29Ff5ba2824cDBE5'
};

const YieldArbitrageDashboard = () => {
  const [selectedAsset, setSelectedAsset] = useState<TokenInfo | null>(null);
  const [depositAmount, setDepositAmount] = useState('1000');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<TokenInfo[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);

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
          .filter(market => market.bridgeAssets?.length > 0)
          .map(market => {
            const bridgeAsset = market.bridgeAssets.find(asset => asset.symbol === 'USDC.e');
            if (!bridgeAsset) return null;
            const depositApy = Number(market.baseAsset.depositTotalApr) / 1e18 * 100;
            const borrowApy = Number(bridgeAsset.debtTotalApr) / 1e18 * 100;
            return {
              symbol: market.marketSymbol,
              name: market.marketName,
              borrowApy,
              depositApy,
              ltv: market.maxLTV || 0.75,
              marketAddress: market.marketAddress
            };
          })
          .filter((asset): asset is TokenInfo => asset !== null);

        setAssets(processedAssets);

        const processedStrategies = Object.entries(TARGET_VAULTS)
          .map(([key, address]) => ({
            address,
            name: `${key.replace('_', '.')} Vault Strategy`,
            apy: (goatData[address]?.vaultApy || 0) * 100,
            type: key.replace('_', '.'),
            vault: address
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
  }, []);

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

  const netYield = calculateYields();
  const timeFrameYields = calculateTimeFrameYields();

  return (
    <div className="w-full max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Yield Arbitrage Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Select Deposit Asset</label>
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
                      Deposit {selectedAsset.symbol} here <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Deposit Amount ($)</label>
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
                    Max: ${selectedAsset ? (parseFloat(depositAmount) * selectedAsset.ltv).toFixed(2) : '0.00'}
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
                  <span className="font-medium">Deposit APY:</span>
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
                  <span className={netYield !== null && netYield >= 0 ? "text-green-500" : "text-red-500"}>
                    ${netYield?.toFixed(2) || '0.00'}
                  </span>
                </div>

                {timeFrameYields && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Estimated Returns</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Daily</div>
                        <div className="font-medium">${timeFrameYields.daily.toFixed(2)}</div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Weekly</div>
                        <div className="font-medium">${timeFrameYields.weekly.toFixed(2)}</div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Monthly</div>
                        <div className="font-medium">${timeFrameYields.monthly.toFixed(2)}</div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Annual</div>
                        <div className="font-medium">${timeFrameYields.annual.toFixed(2)}</div>
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
                <div>Deposit {selectedAsset?.symbol}</div>
                <div className="text-sm text-gray-500">${depositAmount}</div>
              </div>
              <ArrowRight className="h-6 w-6" />
              <div className="text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                <div>Borrow USDC.e</div>
                <div className="text-sm text-gray-500">${borrowAmount}</div>
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
    </div>
  );
};

export default YieldArbitrageDashboard;
