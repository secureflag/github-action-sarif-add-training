import * as core from "@actions/core";

import * as fs from 'fs';
import * as path from 'path';

try {
  // Get current directory
  const currentDir = process.cwd();
  console.log(`Current directory: ${currentDir}`);

  // Read directory contents
  const files = fs.readdirSync(currentDir);

  console.log('Files and folders:');
  files.forEach(file => {
    const stats = fs.statSync(path.join(currentDir, file));
    const type = stats.isDirectory() ? 'Directory' : 'File';
    const size = stats.isDirectory() ? '-' : `${stats.size} bytes`;
    console.log(`- ${file} (${type}, ${size})`);
  });
} catch (error) {
  core.setFailed(`Error reading directory: ${error.message}`);
}
