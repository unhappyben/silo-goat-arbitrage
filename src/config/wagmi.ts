// src/config/wagmi.ts
import { http, createConfig } from 'wagmi';
import { arbitrum } from 'viem/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { createWeb3Modal } from '@web3modal/wagmi/react';



// 1. Get projectId from WalletConnect Cloud
const projectId = 'f17c24781f509b448e85f4ad22200700';

// 2. Create wagmi config
export const config = createConfig({
  chains: [arbitrum],
  connectors: [
    injected(),
    walletConnect({ 
      projectId,
      showQrModal: true,
      metadata: {
        name: 'Silo x Goat.fi',
        description: 'Yield Arbitrage Calculator',
        url: 'https://siloxgoat.fi',
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      }
    }),
  ],
  transports: {
    [arbitrum.id]: http()
  }
});

// 3. Create modal
createWeb3Modal({ 
  wagmiConfig: config,
  projectId,
  //chains: [arbitrum],
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0'  // Trust Wallet
  ]
});

// Contract addresses
export const ADDRESSES = {
  SILO_ROUTER: '0x9992f660137979C1ca7f8b119Cd16361594E3681',
  TOKENS: {
    "USDC.e": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    "USDC": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    "ETH": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "WETH": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "SILO": "0x0341c0c0ec423328621788d4854119b97f44e391",
    "gmETH": "0xfB3264D1129824933a52374c2C1696F4470D041e",
    "weETH": "0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe",
    "PENDLE": "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8",
    "ARB": "0x912ce59144191c1204e64559fe8253a0e49e6548",
    "GRAIL": "0x3d9907f9a368ad0a51be60f7da3b97cf940982d8",
    "RDNT": "0x3082CC23568eA640225c2467653dB90e9250AaA0",
    "EZ_ETH": "0x2416092f143378750bb29b79eD961ab195CcEea5",
    "WST_ETH": "0x5979D7b546E38E414F7E9822514be443A4800529",
    "WBTC": "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    "GNS": "0x18c11FD286C5EC11c3b683Caa813B77f5163A122",
    "ETH_PLUS": "0x18C14C2D707b2212e17d1579789Fc06010cfca23",
    "WINR": "0xD77B108d4f6cefaa0Cae9506A934e825BEccA46E",
    "tbtc": "0x6c84a8f1c29108F47a79964b5Fe888D4f4D0dE40",
    "R_ETH": "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8",
    "W_USD_PLUS": "0xB86fb1047A955C0186c77ff6263819b37B32440D",
    "WOO": "0xcAFcD85D8ca7Ad1e1C6F82F651fA15E33AEfD07b",
    "PEAS": "0x02f92800F57BCD74066F5709F1Daa1A4302Df875",
    "GMX": "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
    "TANGO": "0xC760F9782F8ceA5B06D862574464729537159966",
    "UNI_ETH": "0x3d15fD46CE9e551498328B1C83071D9509E2C3a0",
    "MAGIC": "0x539bdE0d7Dbd336b79148AA742883198BBF60342",
    "PREMIA": "0x51fC0f6660482Ea73330E414eFd7808811a57Fa2",
    "JONES": "0x10393c20975cF177a3513071bC110f7962CD67da",
    "WOETH": "0xd8724322f44e5c58d7a815f542036fb17dbbf839",
    "Y2K": "0x65c936f008BC34fE819bce9Fa5afD9dc2d49977f",
    "UNI": "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
    "W_USDM": "0x57F5E098CaD7A3D1Eed53991D4d66C45C9AF7812",
    "ST_EUR": "0x004626A008B1aCdC4c74ab51644093b155e59A23",
    "JOE": "0xf57f2cCbB30c3C5ea982F21195df435d179d6b48",
    "DLC_BTC": "0x050C24dBf1eEc17babE5fc585F06116A259CC77A",
    "ORDER": "0x4E200fE2f3eFb977d5fd9c430A41531FB04d97B8"
  },
  VAULTS: {
    USDC_E: '0x8a1eF3066553275829d1c0F64EE8D5871D5ce9d3',
    CRV_USD: '0xA7781F1D982Eb9000BC1733E29Ff5ba2824cDBE5',
    YCSETH: '0x878b7897C60fA51c2A7bfBdd4E3cB5708D9eEE43',
    YCETH: '0xe1c410eefAeBB052E17E0cB6F1c3197F35765Aab',
    YCUSDC: '0x0df2e3a0b5997AdC69f8768E495FD98A4D00F134'

  }
};

// Contract ABIs
export const ABIS = {
  SILO_ROUTER: [
    {
      "inputs": [{
        "components": [
          { "internalType": "uint8", "name": "actionType", "type": "uint8" },
          { "internalType": "address", "name": "silo", "type": "address" },
          { "internalType": "address", "name": "asset", "type": "address" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "bool", "name": "collateralOnly", "type": "bool" }
        ],
        "internalType": "struct ISiloRouter.Action[]",
        "name": "actions",
        "type": "tuple[]"
      }],
      "name": "execute",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    }
  ],
  ERC20: [
    {
      "inputs": [
        { "internalType": "address", "name": "spender", "type": "address" },
        { "internalType": "uint256", "name": "amount", "type": "uint256" }
      ],
      "name": "approve",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
      "name": "balanceOf",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "owner", "type": "address" },
        { "internalType": "address", "name": "spender", "type": "address" }
      ],
      "name": "allowance",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  VAULT: [
    {
      "inputs": [
        { "internalType": "uint256", "name": "assets", "type": "uint256" },
        { "internalType": "address", "name": "receiver", "type": "address" }
      ],
      "name": "deposit",
      "outputs": [{ "internalType": "uint256", "name": "shares", "type": "uint256" }],
      "stateMutability": "nonpayable", 
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "shares", "type": "uint256" }],
      "name": "withdraw",
      "outputs": [{ "internalType": "uint256", "name": "assets", "type": "uint256" }],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
  SILO: [
    {
      "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
      "name": "userPosition",
      "outputs": [
        {
          "components": [
            {"internalType": "uint256", "name": "collateralAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "borrowAmount", "type": "uint256"}
          ],
          "internalType": "struct ISilo.UserPosition",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  WETH: [
    {
      "constant": false,
      "inputs": [],
      "name": "deposit",
      "outputs": [],
      "payable": true,
      "stateMutability": "payable",
      "type": "function"
    }
  ]
}