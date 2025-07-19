const fs = require("fs");

const txt = fs.readFileSync("./valid-wordle-words.txt", "utf-8");
const lines = txt
  .split("\n")
  .map((line) => line.trim().toUpperCase())
  .filter((word) => word.length === 5 && /^[A-Z]+$/.test(word));

const json = { 5: lines };

fs.writeFileSync("./words.json", JSON.stringify(json, null, 2));
console.log(`Converted ${lines.length} words to words.json!`);
