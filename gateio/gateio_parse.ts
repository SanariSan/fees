import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

const outputFilePath = "./gateio/gateio_commissions.json";

class GateioApiHelper {
  host = "https://api.gateio.ws";
  prefix = "/api/v4";
  apiKey = process.env.GATEIO_API_KEY ?? "";
  secretKey = process.env.GATEIO_SECRET_KEY ?? "";

  genSign(
    method: string,
    url: string,
    queryParam: string,
    body: string = ""
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hashedPayload = crypto
      .createHash("sha512")
      .update(body)
      .digest("hex");
    const signatureString = `${method}\n${url}\n${queryParam}\n${hashedPayload}\n${timestamp}`;
    const sign = crypto
      .createHmac("sha512", this.secretKey)
      .update(signatureString)
      .digest("hex");

    return {
      KEY: this.apiKey,
      Timestamp: timestamp,
      SIGN: sign,
      "Content-Type": "application/json",
    };
  }

  async getPairs(): Promise<GateioPair[]> {
    try {
      const response = await axios.get(
        `${this.host}${this.prefix}/spot/currency_pairs`
      );
      return response.data.map((pair: any) => ({
        id: pair.id,
        base: pair.base,
        quote: pair.quote,
        fee: pair.fee,
        sell_start: pair.sell_start,
        buy_start: pair.buy_start,
        trade_status: pair.trade_status,
      }));
    } catch (error) {
      console.error(`Error fetching pairs for Gate.io:`, error);
      return [];
    }
  }

  async fetchBatchFee(currencyPairs: string): Promise<any> {
    const url = "/spot/batch_fee";
    const queryParam = `currency_pairs=${currencyPairs}`;
    const signHeaders = this.genSign("GET", this.prefix + url, queryParam);

    try {
      const response = await axios.get(
        `${this.host}${this.prefix}${url}?${queryParam}`,
        { headers: signHeaders }
      );

      return Object.values(response.data);
    } catch (error) {
      console.error("Error fetching batch fee:", error);
      return null;
    }
  }
}

interface GateioPair {
  id: string;
  base: string;
  quote: string;
  fee: string;
  sell_start: number;
  buy_start: number;
  trade_status: string;
}

const appendDataToFile = async (data) => {
  try {
    await fs.appendFile(outputFilePath, JSON.stringify(data, null, 2) + ",\n");
  } catch (error) {
    console.error("Error appending data to file:", error);
  }
};

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

(async () => {
  const apiHelper = new GateioApiHelper();
  try {
    const pairs = await apiHelper.getPairs();
    const pairStrings = pairs.map((pair) => pair.id);
    const chunkedPairStrings = chunkArray(pairStrings, 50);

    for (const chunk of chunkedPairStrings) {
      const currencyPairs = chunk.join(",");
      const batchFeeData = await apiHelper.fetchBatchFee(currencyPairs);

      appendDataToFile(batchFeeData);
    }
  } catch (error) {
    console.error("Error processing batch fees:", error);
  }
})();
