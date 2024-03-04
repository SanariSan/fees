import dotenv from "dotenv";
import fs from "fs/promises";
import { RestClientV5 } from "bybit-api";

dotenv.config();

class BybitSdk {
  restClient: RestClientV5;

  constructor() {
    this.restClient = new RestClientV5({
      key: process.env.BYBIT_API_KEY,
      secret: process.env.BYBIT_API_SECRET,
    });
  }

  async getInstruments() {
    const { result } = await this.restClient.getInstrumentsInfo({
      category: "spot",
    });
    return result.list.map((inst) => inst.symbol);
  }

  async getFeeRate(symbols, retries = 3) {
    try {
      const promises = symbols.map((symbol) =>
        this.restClient.getFeeRate(symbol)
      );
      const responses = await Promise.all(promises);
      return responses.map(({ result }, index) => ({
        symbol: result.list[0].symbol,
        fees: result.list[0],
      }));
    } catch (error) {
      console.log(error);
      if (retries > 0) {
        console.log(`Retrying for symbols... (${retries} retries left)`);
        await sleep(5000);
        return this.getFeeRate(symbols, retries - 1);
      } else {
        throw error;
      }
    }
  }
}

const outputFilePath = "./bybit/bybit_commissions.json";
const lastProcessedIndexFile = "./bybit/last_processed_index_bybit.txt";
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

async function processSymbols(symbols, batchSize = 10) {
  const startIndex = await readLastProcessedIndex();
  const sdk = new BybitSdk();

  for (let i = startIndex; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, Math.min(i + batchSize, symbols.length));
    console.log(
      `Processing batch starting from index ${i}: ${batch.join(", ")}`
    );

    try {
      const feeData = await sdk.getFeeRate(batch);
      await appendDataToFile(feeData);
      await updateLastProcessedIndex(i + batchSize);
    } catch (error) {
      console.error(`Failed to process batch starting from index ${i}:`, error);
      break;
    }

    await sleep(2000);
  }
}

async function retrieveCommissionsSafely() {
  const sdk = new BybitSdk();
  const symbols = await sdk.getInstruments();

  console.log(`Retrieving commissions for ${symbols.length} trading pairs...`);
  await processSymbols(symbols);
  console.log(
    `Commissions data has been safely processed and appended to ${outputFilePath}`
  );
}

retrieveCommissionsSafely().catch(console.error);
