import dotenv from "dotenv";
import fs from "fs/promises";
import Kucoin from "kucoin-node-sdk";

dotenv.config();

class KucoinSdk {
  constructor() {
    Kucoin.init({
      baseUrl: "https://openapi-v2.kucoin.com",
      apiAuth: {
        key: process.env.KUCOIN_API_KEY, // KC-API-KEY
        secret: process.env.KUCOIN_SECRET_KEY, // API-Secret
        passphrase: process.env.KUCOIN_PASSPHRASE, // KC-API-PASSPHRASE
      },
      authVersion: 2, // KC-API-KEY-VERSION. Notice: for v2 API-KEY, not required for v1 version.
    });
  }

  async getInstruments() {
    const { data } = await Kucoin.rest.Market.Symbols.getSymbolsList();
    return data.map((inst) => inst.symbol);
  }

  async getFeeRate(symbols, retries = 3) {
    try {
      const response =
        await Kucoin.rest.User.TradeFee.getActualFeeRateBySymbols(symbols);

      return response.data.map((fee) => ({ symbol: fee.symbol, fees: fee }));
    } catch (error) {
      console.log(error);
      if (retries > 0) {
        console.log(
          `Retrying for symbols: ${symbols}... (${retries} retries left)`
        );
        await sleep(5000);
        return this.getFeeRate(symbols, retries - 1);
      } else {
        throw error;
      }
    }
  }
}

const outputFilePath = "./kucoin/kucoin_commissions.json";
const lastProcessedIndexFile = "./kucoin/last_processed_index_kucoin.txt";

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
  const sdk = new KucoinSdk();

  for (let i = startIndex; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize).join(",");
    console.log(`Processing batch starting from index ${i}: ${batch}`);

    try {
      const feeData = await sdk.getFeeRate(batch);
      await appendDataToFile(feeData);
      await updateLastProcessedIndex(i + batchSize);
    } catch (error) {
      console.error(`Failed to process batch starting from index ${i}:`, error);
      break;
    }

    await sleep(5000);
  }
}

async function retrieveCommissionsSafely() {
  const sdk = new KucoinSdk();
  const symbols = await sdk.getInstruments();

  console.log(`Retrieving commissions for ${symbols.length} trading pairs...`);
  await processSymbols(symbols);
  console.log(
    `Commissions data has been safely processed and appended to ${outputFilePath}`
  );
}

retrieveCommissionsSafely().catch(console.error);
