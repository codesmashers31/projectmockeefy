const fs = require("fs");
const path = require("path");
const readline = require("readline");

const transcriptPath = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c\\.system_generated\\logs\\transcript.jsonl";
const rl = readline.createInterface({ input: fs.createReadStream(transcriptPath) });

rl.on("line", (line) => {
  if (line.includes("REQUIREMENT 1") && line.includes("REQUIREMENT 2")) {
    const obj = JSON.parse(line);
    const content = obj.content || "";
    const matches = content.match(/## REQUIREMENT \d+[^#\n]+/g) || content.match(/### REQUIREMENT \d+[^#\n]+/g) || content.match(/REQUIREMENT \d+[^#\n]+/g);
    if (matches && matches.length >= 10) {
      console.log("Found requirements:");
      matches.forEach(m => console.log(m.trim()));
      process.exit(0);
    }
  }
});
