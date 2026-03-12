import { API } from '@/lib/constants';

interface CoinData {
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    fully_diluted_valuation: { usd: number };
    total_volume: { usd: number };
    circulating_supply: number;
    total_supply: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
  };
}

export async function getHypeTokenData() {
  const res = await fetch(
    `${API.COINGECKO}/coins/hyperliquid?localization=false&tickers=false&community_data=false&developer_data=false`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
  const data: CoinData = await res.json();

  return {
    price: data.market_data.current_price.usd,
    marketCap: data.market_data.market_cap.usd,
    fdv: data.market_data.fully_diluted_valuation.usd,
    volume24h: data.market_data.total_volume.usd,
    circulatingSupply: data.market_data.circulating_supply,
    totalSupply: data.market_data.total_supply,
    priceChange24h: data.market_data.price_change_percentage_24h,
    priceChange7d: data.market_data.price_change_percentage_7d,
  };
}
