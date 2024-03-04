const fs = require("fs/promises");

// Function to collect all unique maker and taker fee values and associated symbols
const collectUniqueFeesAndSymbols = (data) => {
  const fees = {
    makerFees: {},
    takerFees: {},
  };

  data.forEach((asset) => {
    const { symbol, fees: assetFees } = asset;
    assetFees.forEach((fee) => {
      // Considering both general maker/taker fees and fiat-specific fees
      const makerFees = [fee.maker, ...fee.fiat.map((fiat) => fiat.maker)];
      const takerFees = [fee.taker, ...fee.fiat.map((fiat) => fiat.taker)];

      makerFees.forEach((makerFee) => {
        if (!fees.makerFees[makerFee]) {
          fees.makerFees[makerFee] = [symbol];
        } else if (!fees.makerFees[makerFee].includes(symbol)) {
          fees.makerFees[makerFee].push(symbol);
        }
      });

      takerFees.forEach((takerFee) => {
        if (!fees.takerFees[takerFee]) {
          fees.takerFees[takerFee] = [symbol];
        } else if (!fees.takerFees[takerFee].includes(symbol)) {
          fees.takerFees[takerFee].push(symbol);
        }
      });
    });
  });

  return fees;
};

// Function to write the collected fee data to files
const writeFeesAndSymbolsToFile = async (fees) => {
  // Writing maker fees and symbols to file
  await fs.writeFile(
    "okx/okx_unique_maker_fees.json",
    JSON.stringify(fees.makerFees, null, 2)
  );
  console.log(
    "Unique maker fees and their symbols have been written to okx_unique_maker_fees.json"
  );

  // Writing taker fees and symbols to file
  await fs.writeFile(
    "okx/okx_unique_taker_fees.json",
    JSON.stringify(fees.takerFees, null, 2)
  );
  console.log(
    "Unique taker fees and their symbols have been written to okx_unique_taker_fees.json"
  );
};

// Main execution function
const main = async () => {
  const rawData = await fs.readFile("okx/okx_commissions.json", "utf8");
  const data = JSON.parse(rawData);

  const fees = collectUniqueFeesAndSymbols(data);
  await writeFeesAndSymbolsToFile(fees);
};

main().catch(console.error);
