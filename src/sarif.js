const fs = require("fs/promises");
const path = require("path");
const { searchKnowledgeBase, formatKnowledgeBaseMarkdown } = require("./knowledgebase");

module.exports = {
  loadSarifFile,
  processSarif,
  saveSarifFile,
  processRule,
};

/**
 * Saves a SARIF object to the specified file path
 * @param {string} filePath - Path to save the SARIF file
 * @param {object} sarifObject - SARIF object to save
 * @returns {Promise<boolean>} - True if saved successfully, false if error
 */
async function saveSarifFile(filePath, sarifObject) {
  if (!sarifObject) return false;

  try {
    const fileName = path.basename(filePath);
    const jsonContent = JSON.stringify(sarifObject, null, 2);

    await fs.writeFile(filePath, jsonContent, "utf8");
    console.log(`Successfully saved updated ${fileName}`);
    return true;
  } catch (error) {
    console.error(`Error saving SARIF file ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Loads a SARIF file and returns the parsed object
 * @param {string} filePath - Path to the SARIF file
 * @returns {Promise<object|null>} - Parsed SARIF object or null if error
 */
async function loadSarifFile(filePath) {
  const fileName = path.basename(filePath);

  try {
    const stats = await fs.stat(filePath);
    const size = `${stats.size} bytes`;
    console.log(`- ${fileName} (${size})`);

    const fileContent = await fs.readFile(filePath, "utf8");

    const sarifObject = JSON.parse(fileContent);
    console.log(`Successfully parsed ${fileName} as JSON`);

    return sarifObject;
  } catch (parseError) {
    console.error(`Error processing ${fileName}: ${parseError.message}`);
    return null;
  }
}

/**
 * Processes a SARIF object, augmenting with SecureFlag training links
 * @param {object} sarifObject - Parsed SARIF object
 * @returns {object|null} - Processed SARIF object or null if error
 */
async function processSarif(sarifObject) {
  if (!sarifObject) return null;

  try {
    for (const run of sarifObject.runs) {
      if (run.results) {
        // Each result has a rule ID it is linked to.
        // Get a set of seen rule IDs to avoid augmenting them all.
        const triggeredRules = new Set();
        for (const result of run.results) {
          const ruleId = result.ruleId;
          if (!triggeredRules.has(ruleId)) {
            triggeredRules.add(ruleId);
          }
        }

        if (run.tool?.driver?.rules) {
          if (run.tool?.driver?.name.trim().toLowerCase() === "codeql") {
            // workaround for help text being overwritten by CodeQL template when GitHub detects CodeQL
            // ref: https://github.com/github/codeql-action/issues/305
            run.tool.driver.name = "GitHub CodeQL";
          }
        }

        for (const rule of run.tool.driver.rules) {
          if (triggeredRules.has(rule.id)) {
            try {
              await processRule(rule);
            } catch (e) {
              console.error(e);
            }
          }
        }

        if (run.tool?.extensions) {
          for (const extension of run.tool.extensions) {
            if (!extension.rules || !Array.isArray(extension.rules)) continue;
            for (const rule of extension.rules) {
              if (!triggeredRules.has(rule.id)) continue;
              try {
                await processRule(rule);
              } catch (e) {
                console.error(e);
              }
            }
          }
        }
      }
    }

    return sarifObject;
  } catch (error) {
    console.error(`Error during SARIF processing: ${error.message}`);
    return null;
  }
}

/**
 * Extract available text from a SARIF text object
 * @param {object} textObject
 * @returns {string}
 */
function extractText(textObject) {
  let result = "";
  if (textObject.text) result = `${result}\n${textObject.text}`;
  if (textObject.markdown) result = `${result}\n${textObject.markdown}`;
  return result;
}

/**
 * Process a SARIF rule and add SecureFlag training links as help
 * @param {object} rule - Rule object from SARIF to augment
 * @returns {Promise<void>}
 */
async function processRule(rule) {
  let searchTextElements = [];
  if (rule.id) searchTextElements.push(rule.id);
  if (rule.name) searchTextElements.push(rule.name);
  if (rule.message) searchTextElements.push(extractText(rule.message));
  if (rule.messageStrings) {
    for (const messageStringId in rule.messageStrings) {
      const messageString = rule.messageStrings[messageStringId];
      searchTextElements.push(extractText(messageString));
    }
  }

  if (rule.shortDescription)
    searchTextElements.push(extractText(rule.shortDescription));

  if (rule.fullDescription)
    searchTextElements.push(extractText(rule.fullDescription));

  if (rule.help) searchTextElements.push(extractText(rule.help));

  if (
    rule.properties &&
    rule.properties.tags &&
    Array.isArray(rule.properties.tags)
  ) {
    searchTextElements.push(rule.properties.tags.join(" "));
  }

  let searchText = searchTextElements.join(" ");

  let markdown = await searchKnowledgeBase(searchText);
  if (markdown === '') return;
  markdown = formatKnowledgeBaseMarkdown(markdown);

  if (!rule.help)
    rule.help = {
      // if `help` is not present but fullDescription is present
      // init `help` with `fullDescription` to avoid overwriting the displayed description
      // for `markdown` fallback to `text` if there is no `fullDescription.markdown`
      // for `text` fallback to "No description" if there is no `fullDescription.text`
      text: (rule.fullDescription && rule.fullDescription.text) || "",
      markdown:
        (rule.fullDescription &&
          (rule.fullDescription.markdown || rule.fullDescription.text)) ||
        "",
    };

  let text = "\n\nSecureFlag";
  if (rule.help.text) {
    rule.help.text += text;
  } else {
    rule.help.text = text;
  }

  if (rule.help.markdown) {
    rule.help.markdown += markdown;
  } else {
    rule.help.markdown = markdown;
  }
}
