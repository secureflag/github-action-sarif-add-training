const { loadSarifFile, processSarif } = require("../src/sarif");
const { test } = require("node:test");
const assert = require("node:assert");
const util = require('util')

test("CodeQL output", async (t) => {
  const sarifOriginal = await loadSarifFile('./tests/fixtures/codeql.sarif');
  const sarif = await loadSarifFile('./tests/fixtures/codeql.sarif');
  await processSarif(sarif);

  assert.notDeepStrictEqual(
    sarifOriginal,
    sarif,
  );

  assert(sarif.runs[0].tool.driver.rules[1].help.markdown.includes("SecureFlag"))
})

test("processSarif should load test001 and not add anything", async (t) => {
  const sarifOriginal = await loadSarifFile("./tests/fixtures/test001.sarif");
  const sarif = await loadSarifFile("./tests/fixtures/test001.sarif");
  await processSarif(sarif);

  // expect no change
  assert.deepStrictEqual(
    sarifOriginal.runs[0].tool.driver.rules[0],
    sarif.runs[0].tool.driver.rules[0],
  );
});

// test("processSarif should load test002 and add contextual micro-learning material 4 times (for cWe-352 [ONLY ONCE - cwe-----352 should not add duplicate material], cwe89, CWE: 79 and CWE_94)", async () => {
//   const sarif = await loadSarifFile("./tests/fixtures/test002.sarif");
//   const NAME = "AAA";
//   const DESCRIPTION = "bbb";
//   const URL = "ccc";
//   const VIDEOS = ["ddd"];
//   // directLinking.getTrainingData.mockResolvedValue({
//   //   name: NAME,
//   //   description: DESCRIPTION,
//   //   url: URL,
//   //   videos: VIDEOS,
//   // });

//   const processedSarif = await processSarif(sarif);

//   // expect material added to help.text only
//   assert.deepStrictEqual(processedSarif.runs[0].tool.driver.rules[0], {
//     ...sarif.runs[0].tool.driver.rules[0],
//     help: {
//       text: `some help text\n\nSecureFlag`,
//       markdown: `\n\n## SecureFlag`,
//     },
//   });

//   // expect material added to help.text and help.markdown
//   assert.deepStrictEqual(sarif.runs[0].tool.driver.rules[1], {
//     id: "TEST02",
//     name: "Test 02 rule name",
//     messageStrings: {
//       default: {
//         text: "aaa",
//       },
//     },
//     shortDescription: {
//       text: "blah blah\na there is a cWe-352 vulnerability\nhow about that",
//     },
//     fullDescription: {
//       text: "something something cwe89 something CWE: 79 and\nsomething else cwe-----352 again",
//     },
//     help: {
//       text: `Some text here some text here`,
//       markdown: `# A Heading\n\nSome text here some text here some text here some text here some text here some text here some text here some text here some text here some text here some text here some text here some text here\n\n## A Smaller Heading\n\nMore text here more text here more text here more text here more text here more text here CWE_94 more text here more text here`,
//     },
//   });
// });
