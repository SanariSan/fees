const fs = require("fs/promises");

// Function to collect all unique maker and taker fee values and associated symbols
const collectUniqueFeesAndSymbols = (data) => {
  const fees = {
    makerFees: {},
    takerFees: {},
  };

  data.forEach((asset) => {
    const makerFee = asset.maker_fee;
    const takerFee = asset.taker_fee;
    const symbol = asset.currency_pair;

    // Collect unique maker fees
    if (!fees.makerFees[makerFee]) {
      fees.makerFees[makerFee] = [symbol];
    } else if (!fees.makerFees[makerFee].includes(symbol)) {
      fees.makerFees[makerFee].push(symbol);
    }

    // Collect unique taker fees
    if (!fees.takerFees[takerFee]) {
      fees.takerFees[takerFee] = [symbol];
    } else if (!fees.takerFees[takerFee].includes(symbol)) {
      fees.takerFees[takerFee].push(symbol);
    }
  });

  return fees;
};

// Function to write the collected fee data to files
const writeFeesAndSymbolsToFile = async (fees) => {
  // Writing maker fees and symbols to file
  await fs.writeFile(
    "gateio/gateio_unique_maker_fees.json",
    JSON.stringify(fees.makerFees, null, 2)
  );
  console.log(
    "Unique maker fees and their symbols have been written to gateio_unique_maker_fees.json"
  );

  // Writing taker fees and symbols to file
  await fs.writeFile(
    "gateio/gateio_unique_taker_fees.json",
    JSON.stringify(fees.takerFees, null, 2)
  );
  console.log(
    "Unique taker fees and their symbols have been written to gateio_unique_taker_fees.json"
  );
};

// Main execution function
const main = async () => {
  const rawData = await fs.readFile("gateio/gateio_commissions.json", "utf8");
  const data = JSON.parse(rawData);

  const fees = collectUniqueFeesAndSymbols(data);
  await writeFeesAndSymbolsToFile(fees);
};

main().catch(console.error);
