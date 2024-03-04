import axios from "axios";
import fs from "fs/promises";

interface KrakenPairsResponse {
  error: string[];
  result: {
    [key: string]: {
      wsname: string;
      fees: [number, number][];
      fees_maker: [number, number][];
    };
  };
}

class KrakenSdk {
  public static async getFees(): Promise<void> {
    try {
      const response = await axios.get<KrakenPairsResponse>(
        "https://api.kraken.com/0/public/AssetPairs"
      );
      const pairs = response.data.result;

      const feesDataAllTiers = Object.entries(pairs).map(([_, pair]) => ({
        symbol: pair.wsname,
        fees: {
          symbol: pair.wsname,
          takerFeeRates: pair.fees.map((fee) => ({
            volume: fee[0],
            rate: fee[1] / 100,
          })),
          makerFeeRates: pair.fees_maker.map((fee) => ({
            volume: fee[0],
            rate: fee[1] / 100,
          })),
        },
      }));

      const feesDataFirstTierOnly = Object.entries(pairs).map(([_, pair]) => ({
        symbol: pair.wsname,
        fees: {
          symbol: pair.wsname,
          takerFeeRate: pair.fees[0][1] / 100, // value in percent, need to divide by 100
          makerFeeRate: pair.fees_maker[0]
            ? pair.fees_maker[0][1] / 100
            : pair.fees[0][1] / 100,
        },
      }));

      await fs.writeFile(
        "kraken/kraken_multi_tier.json",
        JSON.stringify(feesDataAllTiers, null, 2)
      );
      console.log(
        "All tiers fees data has been written to kraken_multi_tier.json"
      );

      await fs.writeFile(
        "kraken/kraken_first_tier_only.json",
        JSON.stringify(feesDataFirstTierOnly, null, 2)
      );
      console.log(
        "First tier only fees data has been written to kraken_first_tier_only.json"
      );
    } catch (error) {
      console.error("Failed to fetch or process Kraken fees:", error);
    }
  }
}

KrakenSdk.getFees().catch(console.error);
