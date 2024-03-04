const fs = require("fs/promises");

// Helper function to format fee tiers
const formatFeeTiers = (feeRates, firstTierOnly = false) => {
  if (firstTierOnly) {
    // Return just the rate for the first tier
    return `${feeRates[0].rate}`;
  } else {
    // For all tiers, format as "volume=>rate"
    return feeRates.map(({ volume, rate }) => `${volume}=>${rate}`).join(", ");
  }
};

// Process and collect unique fees and their associated symbols
const collectUniqueFeesAndSymbols = (data, firstTierOnly = false) => {
  const fees = {
    makerFees: {},
    takerFees: {},
  };

  data.forEach(({ symbol, fees: feeData }) => {
    const makerFeeKey = formatFeeTiers(feeData.makerFeeRates, firstTierOnly);
    const takerFeeKey = formatFeeTiers(feeData.takerFeeRates, firstTierOnly);

    // Collect symbols sharing the same fee rate
    fees.makerFees[makerFeeKey] = fees.makerFees[makerFeeKey] || [];
    fees.makerFees[makerFeeKey].push(symbol);

    fees.takerFees[takerFeeKey] = fees.takerFees[takerFeeKey] || [];
    fees.takerFees[takerFeeKey].push(symbol);
  });

  return fees;
};

// Write fees to file
const writeFeesToFile = async (fees, baseFilename, firstTierOnly = false) => {
  const tierLabel = firstTierOnly ? "first_tier" : "all_tiers";
  await fs.writeFile(
    `${baseFilename}_${tierLabel}_maker_fees.json`,
    JSON.stringify(fees.makerFees, null, 2)
  );
  console.log(
    `Maker fee data (for ${tierLabel}) has been written to ${baseFilename}_${tierLabel}_maker_fees.json`
  );

  await fs.writeFile(
    `${baseFilename}_${tierLabel}_taker_fees.json`,
    JSON.stringify(fees.takerFees, null, 2)
  );
  console.log(
    `Taker fee data (for ${tierLabel}) has been written to ${baseFilename}_${tierLabel}_taker_fees.json`
  );
};

// Main execution function
const main = async () => {
  const rawData = await fs.readFile("kraken/kraken_multi_tier.json", "utf8");
  const data = JSON.parse(rawData);

  // Process for first tier only
  const feesFirstTier = collectUniqueFeesAndSymbols(data, true);
  await writeFeesToFile(feesFirstTier, "kraken/kraken", true);

  // Process for all tiers
  const feesAllTiers = collectUniqueFeesAndSymbols(data, false);
  await writeFeesToFile(feesAllTiers, "kraken/kraken", false);
};

main().catch(console.error);
