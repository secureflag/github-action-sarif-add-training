const https = require("https");
const util = require("node:util");

module.exports = {
  searchKnowledgeBase,
  formatKnowledgeBaseMarkdown,
};

/**
 * Get relevant training from the SecureFlag Knowledge Base API
 * @param {string} text - The text to analyze
 * @returns {Promise<string>} - The markdown content from the API response
 */
async function searchKnowledgeBase(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      author: "GitHub Actions",
      text: text,
      platformString: "GITHUB",
    });

    const options = {
      hostname: "knowledge-base-api.secureflag.com",
      port: 443,
      path: "/vuln/extract/markdown",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData.markdown);
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`API request failed: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

function formatKnowledgeBaseMarkdown(markdown) {
  const frontmatterRegex = /---.*?---/s;
  markdown = markdown.replace(
    frontmatterRegex,
    '<p align="left" width="60%"><img src="https://user-images.githubusercontent.com/87369283/128739726-f334fbf2-c531-4972-a175-547485ba2322.png" width="50%"></p>',
  );

  const tocRegex = /^1. TOC\n{:toc}$/m;
  markdown = markdown.replace(tocRegex, "");

  const imageRegex = /^(!\[\w+\]\()(\/assets\/images.*)(\))$/gm;
  markdown = markdown.replace(imageRegex, "");

  const inlineImageRegex = /^!\[image\]\(data:image.*\)/m;
  markdown = markdown.replace(inlineImageRegex, "");

  const playLabsRegex = /(<span>Play Labs on this vulnerability)/;
  markdown = markdown.replace(playLabsRegex, "<br>$1");

  const collapsibleRegex = /(## Description.+?)(#+ \w+)/s;
  const collapsibleText = "Read more";
  markdown = markdown.replace(
    collapsibleRegex,
    "$1<details><summary>" + collapsibleText + "</summary>\n\n$2",
  );
  markdown += "</details>";

  return markdown;
}
