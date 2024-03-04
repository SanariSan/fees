const fs = require("fs/promises");

// Function to collect all unique maker and taker fee values and their associated symbols
const collectUniqueFeesAndSymbols = (data) => {
  const fees = {
    makerFees: new Map(), // Using a Map to associate fee values with symbols
    takerFees: new Map(),
  };

  data.forEach((batch) => {
    batch.data.forEach(
      ({ "maker-fee": makerFee, "taker-fee": takerFee, symbol }) => {
        // Update the Map for maker fees
        if (!fees.makerFees.has(makerFee)) {
          fees.makerFees.set(makerFee, [symbol]);
        } else {
          fees.makerFees.get(makerFee).push(symbol);
        }

        // Update the Map for taker fees
        if (!fees.takerFees.has(takerFee)) {
          fees.takerFees.set(takerFee, [symbol]);
        } else {
          fees.takerFees.get(takerFee).push(symbol);
        }
      }
    );
  });

  return fees;
};

// Function to write the unique fee values and their associated symbols to files
const writeUniqueFeesToFile = async (fees) => {
  // Convert the Maps to objects for JSON serialization
  const makerFeesObject = Object.fromEntries(fees.makerFees);
  const takerFeesObject = Object.fromEntries(fees.takerFees);

  await fs.writeFile(
    "htx/htx_unique_maker_fees.json",
    JSON.stringify(makerFeesObject, null, 2)
  );
  await fs.writeFile(
    "htx/htx_unique_taker_fees.json",
    JSON.stringify(takerFeesObject, null, 2)
  );
  console.log(
    "Unique maker and taker fees and their associated symbols have been written to files."
  );
};

// Main execution function
const main = async () => {
  const rawData = await fs.readFile("htx/htx_commissions.json", "utf8"); // Ensure this filename matches your actual file
  const data = JSON.parse(rawData);

  const uniqueFees = collectUniqueFeesAndSymbols(data);
  await writeUniqueFeesToFile(uniqueFees);
};

main().catch(console.error);
