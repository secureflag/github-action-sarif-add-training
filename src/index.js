import * as core from "@actions/core";

import * as fs from "fs/promises";
import * as path from "path";

async function processSarifFile(filePath, fileName) {
  try {
    const stats = await fs.stat(filePath);
    const size = `${stats.size} bytes`;
    console.log(`- ${fileName} (${size})`);

    // Read the file content asynchronously
    const fileContent = await fs.readFile(filePath, "utf8");

    // Parse as JSON
    const sarifObject = JSON.parse(fileContent);
    console.log(`Successfully parsed ${fileName} as JSON`);
    console.log(`SARIF version: ${sarifObject.version || "unknown"}`);

    console.debug(sarifObject);

    return sarifObject;
  } catch (parseError) {
    console.error(`Error processing ${fileName}: ${parseError.message}`);
    return null;
  }
}

async function run() {
  // Get input path from GitHub Actions
  const sarifPath = core.getInput("sarif_path");
  const resultsDir = path.resolve(process.cwd(), sarifPath);
  console.log(`Reading directory: ${resultsDir}`);

  let files;
  try {
    // Read directory contents asynchronously
    files = await fs.readdir(resultsDir);
  } catch (error) {
    core.setFailed(`Error reading directory: ${error.message}`);
    return;
  }

  console.log(`SARIF files in ${sarifPath}:`);

  // Filter for .sarif files
  const sarifFiles = files.filter((file) => path.extname(file) === ".sarif");

  if (sarifFiles.length === 0) {
    console.log("No SARIF files found.");
    core.setFailed("No SARIF files found.");
    return;
  }

  // Process all files concurrently
  const results = await Promise.all(
    sarifFiles.map((file) =>
      processSarifFile(path.join(resultsDir, file), file),
    ),
  );

  // Filter out null results (files that had errors)
  const validResults = results.filter(Boolean);
  console.log(
    `Successfully processed ${validResults.length} of ${sarifFiles.length} SARIF files`,
  );
}

// Execute the async function
run().catch((error) => {
  core.setFailed(`Unhandled error: ${error.message}`);
});
