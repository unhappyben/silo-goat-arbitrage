# Silo x Goat.fi Yield Arbitrage Calculator

A real-time DeFi yield arbitrage calculator that helps users maximize returns by calculating optimal borrowing and lending strategies between Silo Finance and Goat.fi on Arbitrum.

![Screenshot](screenshot.png)

## What it Does

The calculator enables users to:
- Compare lending rates across different assets on Silo Finance
- Calculate maximum borrowing capacity based on asset-specific LTV ratios
- View real-time APYs for Goat.fi vaults
- Calculate potential yields across different timeframes (daily, weekly, monthly, annual)
- Visualize the complete yield strategy flow
- Access direct links to both platforms for easy execution

## Data Sources

The application sources data from two primary endpoints:

1. **Silo Finance**
   - Market data from `https://app.silo.finance`
   - Includes asset prices, lending rates, borrowing rates, and LTV ratios
   - Data is extracted from the embedded Next.js data script

2. **Goat.fi**
   - Vault APY data from `https://api.goat.fi/apy/breakdown`
   - Currently tracking USDC.e and CRV.USD vault strategies
   - Real-time APY updates based on current market conditions

## How Data is Fetched

The application employs a multi-step data fetching process:

1. **Silo Finance Data**
   - Fetches the HTML content from Silo's frontend
   - Extracts the JSON data from the `__NEXT_DATA__` script tag
   - Processes market data to extract relevant lending and borrowing rates

2. **Goat.fi Data**
   - Makes a direct API call to Goat.fi's APY endpoint
   - Includes timestamp parameter to ensure fresh data
   - Filters for specific vault strategies

3. **Data Processing**
   - Combines data from both sources
   - Applies predefined LTV ratios for supported assets
   - Calculates potential yields based on user inputs

## How to Use

1. Visit [silo-goat-arbitrage.vercel.app](https://silo-goat-arbitrage.vercel.app)
2. Select your deposit asset from the dropdown
3. Enter your desired deposit amount
4. Input your intended borrow amount (respecting the max LTV)
5. Choose your preferred Goat.fi vault strategy
6. View calculated yields across different timeframes
7. Use the provided links to execute the strategy on both platforms

## Development

### Prerequisites
- Node.js 16+
- npm or yarn
- Next.js 13+

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/silo-goat-arbitrage

# Install dependencies
npm install

# Run development server
npm run dev
```

### Built With
- Next.js
- React
- Tailwind CSS
- shadcn/ui components
- Lucide React icons

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.