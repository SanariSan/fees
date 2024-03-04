import { RestClient } from "okx-api";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

class OkxSdk {
  private restClient: RestClient;
  constructor() {
    this.restClient = new RestClient({
      apiKey: process.env.OKX_API_KEY ?? "",
      apiSecret: process.env.OKX_API_SECRET ?? "",
      apiPass: process.env.OKX_API_PASSPHRASE ?? "",
    });
  }

  async getInstruments() {
    const data = await this.restClient.getInstruments("SPOT");
    return data.map((inst) => inst.instId);
  }

  async getFeeRate(symbol: string, retries = 3) {
    try {
      const data = await this.restClient.getFeeRates("SPOT", symbol);
      return { symbol, fees: data };
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying ${symbol}... (${retries} retries left)`);
        await sleep(5000);
        return this.getFeeRate(symbol, retries - 1);
      } else {
        throw error;
      }
    }
  }
}

const outputFilePath = "./okx/okx_commissions.json";
const lastProcessedIndexFile = "./okx/last_processed_index_okx.txt";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function appendDataToFile(data) {
  await fs.appendFile(outputFilePath, JSON.stringify(data, null, 2) + ",\n");
}

async function readLastProcessedIndex() {
  try {
    const indexStr = await fs.readFile(lastProcessedIndexFile, "utf8");
    return parseInt(indexStr, 10);
  } catch (error) {
    return 0;
  }
}

async function updateLastProcessedIndex(index) {
  await fs.writeFile(lastProcessedIndexFile, index.toString());
}

async function processSymbols(symbols, batchSize) {
  const startIndex = await readLastProcessedIndex();
  const okx = new OkxSdk();

  for (let i = startIndex; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, Math.min(i + batchSize, symbols.length));
    console.log(`Processing batch: ${batch.join(", ")}`);

    const batchPromises = batch.map(async (symbol) => {
      try {
        const feeData = await okx.getFeeRate(symbol);
        await appendDataToFile(feeData);
        return symbol;
      } catch (error) {
        console.error(`Failed to fetch fee for ${symbol}:`, error.message);
        return null;
      }
    });

    const processedSymbols = (await Promise.all(batchPromises)).filter(
      (s) => s !== null
    );
    if (processedSymbols.length > 0) {
      await updateLastProcessedIndex(i + processedSymbols.length);
    } else {
      console.log(`All requests in the current batch failed. Stopping...`);
      break;
    }

    await sleep(5000);
  }
}

async function retrieveCommissionsSafely() {
  const okx = new OkxSdk();
  const symbols = await okx.getInstruments();
  const batchSize = 5;

  console.log(`Retrieving commissions for ${symbols.length} trading pairs...`);
  await processSymbols(symbols, batchSize);
  console.log(
    `Commissions data has been safely processed and appended to ${outputFilePath}`
  );
}

retrieveCommissionsSafely().catch(console.error);
