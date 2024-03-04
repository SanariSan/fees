import axios from "axios";
import * as crypto from "crypto";
import fs from "fs/promises";
import dotenv from "dotenv";

dotenv.config();

class HuobiSdk {
  headers;
  accessKey;
  secretKey;
  baseApiUrl;
  rateLimitDelay;

  constructor() {
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36",
      "Content-Type": "application/json",
    };
    this.accessKey = process.env.HUOBI_API_KEY ?? "";
    this.secretKey = process.env.HUOBI_API_SECRET ?? "";
    this.baseApiUrl = "api.huobi.pro";
    this.rateLimitDelay = 300;
  }

  createHuobiRequestUrl({ path, method, queryParams = {} }) {
    const timestamp = new Date().toISOString().split(".")[0]; // Format: YYYY-MM-DDTHH:mm:ss

    const params = {
      AccessKeyId: this.accessKey,
      SignatureMethod: "HmacSHA256",
      SignatureVersion: "2",
      Timestamp: timestamp,
      ...queryParams,
    };

    const signature = this.createSignature({
      secretKey: this.secretKey,
      method,
      path,
      params,
    });
    params["Signature"] = encodeURIComponent(signature);

    const queryString = Object.keys(params)
      .map((key) => `${key}=${params[key]}`)
      .join("&");
    return `https://${this.baseApiUrl}${path}?${queryString}`;
  }

  createSignature({ secretKey, method, path, params }) {
    const orderedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&");
    const baseString = `${method}\n${this.baseApiUrl}\n${path}\n${orderedParams}`;
    const hmac = crypto.createHmac("sha256", secretKey);
    hmac.update(baseString);
    return hmac.digest("base64");
  }

  async fetchAllSymbols() {
    const path = "/v2/settings/common/symbols";
    const method = "GET";
    const requestUrl = this.createHuobiRequestUrl({ path, method });
    const response = await axios.get(requestUrl, { headers: this.headers });

    if (response.data.status === "ok") {
      // Use the 'bc' (base currency) and 'qc' (quote currency) fields to construct the symbol strings.
      const symbols = response.data.data.map((item) => `${item.bc}${item.qc}`);
      return symbols;
    } else {
      throw new Error(
        `Huobi fetchAllSymbols error: ${JSON.stringify(response.data)}`
      );
    }
  }

  async queryAllAssets() {
    const symbols = await this.fetchAllSymbols();
    const batchSize = 10;
    const symbolBatches = this.splitIntoBatches(symbols, batchSize);
    let batchIndex = await this.readLastProcessedIndex(); // Assuming batchIndex management

    for (let i = batchIndex; i < symbolBatches.length; i++) {
      const batchSymbols = symbolBatches[i].join(",");
      try {
        console.log(`Querying information for batch: ${i} | ${batchSymbols}`);
        const info = await this.getChainsInformation(batchSymbols); // Adjusted to handle batch

        await this.appendDataToFile({ symbols: batchSymbols, data: info });
        await this.updateLastProcessedIndex(i); // Update to reflect batch processing

        await new Promise((resolve) =>
          setTimeout(resolve, this.rateLimitDelay)
        );
      } catch (error) {
        console.error(error);
        i -= 1;
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // break; // Break on error
      }
    }
  }

  async getChainsInformation(symbol) {
    const requestUrl = this.createHuobiRequestUrl({
      path: "/v1/fee/fee-rate/get",
      method: "GET",
      queryParams: {
        symbols: symbol,
      },
    });

    const response = await axios.get(requestUrl, { headers: this.headers });
    if (response.data.status === "ok") {
      return response.data.data;
    } else {
      throw new Error(
        `Huobi getChainsInformation error: ${JSON.stringify(response.data)}`
      );
    }
  }

  splitIntoBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      batches.push(batch);
    }
    return batches;
  }

  async updateLastProcessedIndex(index) {
    try {
      await fs.writeFile("lastProcessedIndex.txt", index.toString());
    } catch (error) {
      console.error("Error updating last processed index:", error);
    }
  }

  async readLastProcessedIndex() {
    try {
      const index = await fs.readFile("lastProcessedIndex.txt", "utf8");
      return parseInt(index);
    } catch (error) {
      console.error(
        "Error reading last processed index, starting from 0:",
        error
      );
      return 0;
    }
  }

  async appendDataToFile(data) {
    try {
      await fs.appendFile(
        "commissions1.json",
        JSON.stringify(data, null, 2) + ",\n"
      );
    } catch (error) {
      console.error("Error appending data to file:", error);
    }
  }
}

const sdk = new HuobiSdk();
sdk
  .queryAllAssets()
  .then(() => console.log("Finished processing all symbols."))
  .catch((error) => console.error("An error occurred:", error));
