import fetch from "node-fetch";
import * as crypto from "crypto";
import fs from "fs/promises";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.BINANCE_API_KEY ?? "";
const apiSecret = process.env.BINANCE_API_SECRET ?? "";
const baseUrl = "https://api.binance.com";
const outputFilePath = "./binance/binance_commissions.json";
const lastProcessedIndexFile = "./last_processed_index.txt";

const generateSignature = (query, secret) =>
  crypto.createHmac("sha256", secret).update(query).digest("hex");

const getAllTradingPairs = async () => {
  const url = `${baseUrl}/api/v3/exchangeInfo`;
  const response = await fetch(url);
  const data = (await response.json()) as any;
  return data.symbols.map((symbol) => symbol.symbol);
};

const getCommissionForPair = async (symbol, retries = 5) => {
  const recvWindow = 5000;
  const timestamp = Date.now();
  const query = `recvWindow=${recvWindow}&timestamp=${timestamp}&symbol=${symbol}`;
  const signature = generateSignature(query, apiSecret);
  const url = `${baseUrl}/api/v3/account/commission?${query}&signature=${signature}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-MBX-APIKEY": apiKey,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok && response.status === 429 && retries > 0) {
      console.log(`Rate limit exceeded, retrying ${symbol}...`);
      await sleep(10000);
      return getCommissionForPair(symbol, retries - 1);
    }
    return response.json();
  } catch (error) {
    if (retries > 0) {
      console.error(
        `Error fetching commission for ${symbol}, retrying...`,
        error
      );
      await sleep(5000);
      return getCommissionForPair(symbol, retries - 1);
    }
    throw error;
  }
};

const appendDataToFile = async (data) => {
  try {
    await fs.appendFile(outputFilePath, JSON.stringify(data, null, 2) + ",\n");
  } catch (error) {
    console.error("Error appending data to file:", error);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readLastProcessedIndex = async () => {
  try {
    const indexStr = await fs.readFile(lastProcessedIndexFile, "utf8");
    return parseInt(indexStr, 10);
  } catch (error) {
    return 0;
  }
};

const updateLastProcessedIndex = async (index) => {
  await fs.writeFile(lastProcessedIndexFile, index.toString());
};

const processSymbols = async (symbols, batchSize) => {
  const startIndex = await readLastProcessedIndex();

  for (let i = startIndex; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    console.log(`Processing batch: ${batch.join(", ")}`);

    try {
      const batchPromises = batch.map((symbol) =>
        getCommissionForPair(symbol).then((commissionData) => {
          appendDataToFile(commissionData);
          return symbol;
        })
      );

      const processedSymbols = await Promise.all(batchPromises);

      await updateLastProcessedIndex(i + processedSymbols.length);

      await sleep(1000);
    } catch (error) {
      console.error(`Failed to process batch starting at index ${i}:`, error);

      break;
    }
  }
};

const retrieveCommissionsSafely = async () => {
  const symbols = await getAllTradingPairs();
  const batchSize = 5;

  console.log(`Retrieving commissions for ${symbols.length} trading pairs...`);
  await processSymbols(symbols, batchSize);
  console.log(
    `Commissions data has been safely processed and appended to ${outputFilePath}`
  );
};

retrieveCommissionsSafely().catch(console.error);
