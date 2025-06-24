import * as core from "@actions/core";
import * as fs from "fs/promises";
import * as path from "path";
import { loadSarifFile, processSarif, saveSarifFile } from "./sarif";

async function run() {
  const sarifPath = core.getInput("sarif_path");
  const resultsDir = path.resolve(process.cwd(), sarifPath);
  console.log(`Reading directory: ${resultsDir}`);

  let files;
  try {
    files = await fs.readdir(resultsDir);
  } catch (error) {
    core.setFailed(`Error reading directory: ${error.message}`);
    return;
  }

  console.log(`SARIF files in ${sarifPath}:`);

  const sarifFiles = files.filter((file) => path.extname(file) === ".sarif");

  if (sarifFiles.length === 0) {
    console.log("No SARIF files found.");
    core.setFailed("No SARIF files found.");
    return;
  }

  const processResults = await Promise.all(
    sarifFiles.map(async (file) => {
      const filePath = path.join(resultsDir, file);
      const sarifObject = await loadSarifFile(filePath);
      
      if (!sarifObject) {
        return false;
      }
      
      const processedSarif = await processSarif(sarifObject);
      if (!processedSarif) {
        return false;
      }
      
      // Overwrite the original file with the processed content
      return saveSarifFile(filePath, processedSarif);
    }),
  );

  // Count successful results
  const successCount = processResults.filter(Boolean).length;
  console.log(
    `Successfully processed and saved ${successCount} of ${sarifFiles.length} SARIF files`,
  );
}

run().catch((error) => {
  core.setFailed(`Unhandled error: ${error.message}`);
});
