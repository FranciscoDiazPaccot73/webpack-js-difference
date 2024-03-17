#! /usr/bin/env node
const { Command } = require("commander");
const fs = require("fs");
const path = require("path");
const figlet = require("figlet");
const shell = require("shelljs");

console.log(figlet.textSync("Webpack JS Difference"));

const program = new Command();
program
  .version("1.0.0")
  .description("An example CLI for managing a directory")
  .option("-l, --ls  [value]", "List directory contents")
  .option("-a, --analyze", "Analyze directory")
  .option("-m, --mkdir <value>", "Create a directory")
  .option("-t, --touch <value>", "Create a file")
  .parse(process.argv);

const options = program.opts();

async function listDirContents(filepath: string) {
  try {
    const files = await fs.promises.readdir(filepath);
    const detailedFilesPromises = files.map(async (file: string) => {
      let fileDetails = await fs.promises.lstat(path.resolve(filepath, file));
      const { size, birthtime } = fileDetails;
      return { filename: file, "size(KB)": size, created_at: birthtime };
    });
    const detailedFiles = await Promise.all(detailedFilesPromises);
    console.table(detailedFiles);
  } catch (error) {
    console.error("Error occurred while reading the directory!", error);
  }
}

async function analyze() {
  shell.exec("echo shell.exec works");
  const filePath = path.resolve(__dirname, '/.tmp')

  try {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath);
    }
  } catch (err) {
    console.error(err);
  }

  // shell.exec("npm run build")
}

if (options.ls) {
  const filepath = typeof options.ls === "string" ? options.ls : __dirname;
  listDirContents(filepath);
}

if (options.analyze) {
  analyze();
}

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
