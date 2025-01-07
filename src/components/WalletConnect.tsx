/* eslint-disable @typescript-eslint/no-unused-vars */


"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useWeb3Modal } from '@web3modal/wagmi/react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await open();
    } catch (err) {
      console.error('Connect error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <Button 
          variant="outline" 
          onClick={handleDisconnect} 
          size="sm"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button 
      onClick={handleConnect} 
      size="sm"
      disabled={isConnecting}
    >
      {isConnecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Connecting...
        </>
      ) : (
        'Connect Wallet'
      )}
    </Button>
  );
}