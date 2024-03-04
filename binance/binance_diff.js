const fs = require("fs/promises");

// Function to collect all unique maker and taker fee values and associated symbols
const collectUniqueFeesAndSymbols = (data) => {
  const fees = {
    makerFees: {},
    takerFees: {},
  };

  data.forEach((asset) => {
    const { symbol, standardCommission } = asset;
    const { maker, taker } = standardCommission;

    // Collect unique maker fees
    if (!fees.makerFees[maker]) {
      fees.makerFees[maker] = [symbol];
    } else if (!fees.makerFees[maker].includes(symbol)) {
      fees.makerFees[maker].push(symbol);
    }

    // Collect unique taker fees
    if (!fees.takerFees[taker]) {
      fees.takerFees[taker] = [symbol];
    } else if (!fees.takerFees[taker].includes(symbol)) {
      fees.takerFees[taker].push(symbol);
    }
  });

  return fees;
};

// Function to write the collected fee data to files
const writeFeesAndSymbolsToFile = async (fees) => {
  // Writing maker fees and symbols to file
  await fs.writeFile(
    "binance/binance_unique_maker_fees.json",
    JSON.stringify(fees.makerFees, null, 2)
  );
  console.log(
    `Unique maker fees and their symbols have been written to binance_unique_maker_fees.json`
  );

  // Writing taker fees and symbols to file
  await fs.writeFile(
    "binance/binance_unique_taker_fees.json",
    JSON.stringify(fees.takerFees, null, 2)
  );
  console.log(
    `Unique taker fees and their symbols have been written to binance_unique_taker_fees.json`
  );
};

// Main execution function
const main = async () => {
  const data = JSON.parse(
    await fs.readFile("binance/binance_commissions.json", "utf8")
  );

  const fees = collectUniqueFeesAndSymbols(data);
  await writeFeesAndSymbolsToFile(fees);
};

main().catch(console.error);
