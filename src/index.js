import * as core from "@actions/core";

import * as fs from 'fs';
import * as path from 'path';

try {
  // Get results directory path
  const resultsDir = path.resolve(process.cwd(), '../results');
  console.log(`Reading directory: ${resultsDir}`);

  // Read directory contents
  const files = fs.readdirSync(resultsDir);

  console.log('Files and folders in ../results:');
  files.forEach(file => {
    const stats = fs.statSync(path.join(resultsDir, file));
    const type = stats.isDirectory() ? 'Directory' : 'File';
    const size = stats.isDirectory() ? '-' : `${stats.size} bytes`;
    console.log(`- ${file} (${type}, ${size})`);
  });
} catch (error) {
  core.setFailed(`Error reading directory: ${error.message}`);
}
