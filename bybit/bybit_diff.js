const fs = require("fs/promises");

// Function to collect all unique maker and taker fee values and associated symbols
const collectUniqueFeesAndSymbols = (data) => {
  const fees = {
    makerFees: {},
    takerFees: {},
  };

  data.forEach((asset) => {
    const {
      symbol,
      fees: { makerFeeRate, takerFeeRate },
    } = asset;

    // Collect unique maker fees
    if (!fees.makerFees[makerFeeRate]) {
      fees.makerFees[makerFeeRate] = [symbol];
    } else if (!fees.makerFees[makerFeeRate].includes(symbol)) {
      fees.makerFees[makerFeeRate].push(symbol);
    }

    // Collect unique taker fees
    if (!fees.takerFees[takerFeeRate]) {
      fees.takerFees[takerFeeRate] = [symbol];
    } else if (!fees.takerFees[takerFeeRate].includes(symbol)) {
      fees.takerFees[takerFeeRate].push(symbol);
    }
  });

  return fees;
};

// Function to write the collected fee data to files
const writeFeesAndSymbolsToFile = async (fees) => {
  // Writing maker fees and symbols to file
  await fs.writeFile(
    "bybit/bybit_unique_maker_fees.json",
    JSON.stringify(fees.makerFees, null, 2)
  );
  console.log(
    "Unique maker fees and their symbols have been written to bybit_unique_maker_fees.json"
  );

  // Writing taker fees and symbols to file
  await fs.writeFile(
    "bybit/bybit_unique_taker_fees.json",
    JSON.stringify(fees.takerFees, null, 2)
  );
  console.log(
    "Unique taker fees and their symbols have been written to bybit_unique_taker_fees.json"
  );
};

// Main execution function
const main = async () => {
  const rawData = await fs.readFile("bybit/bybit_commissions.json", "utf8"); // Adjust the filename as needed
  const data = JSON.parse(rawData);

  const fees = collectUniqueFeesAndSymbols(data);
  await writeFeesAndSymbolsToFile(fees);
};

main().catch(console.error);
