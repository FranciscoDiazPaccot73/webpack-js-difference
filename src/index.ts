#! /usr/bin/env node

import { Analyze, Difference } from "./types";

const { Command } = require("commander");
const fs = require("fs");
const path = require("path");
const figlet = require("figlet");
const shell = require("shelljs");
const { Octokit } = require('@octokit/rest');

console.log(figlet.textSync("Webpack JS Difference"));

const program = new Command();
program
  .version("1.0.0")
  .description("An example CLI Analyze webpack bundle")
  .option("-l, --ls  [value]", "List directory contents")
  .option("-a, --analyze  [value]", "Analyze directory")
  .option("-c, --compare  [value]", "Compare both stats")
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

async function baseActions() {
  const folderPath = path.join(process.cwd(), "/.tmp")

  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
  } catch (err) {
    console.error("Error occurred while creating the directory!", err);
  }

  console.log("Installing dependencies...")
  const installWorks = shell.exec("npm install").code

  console.log("Building...")
  shell.exec("npm run build")

  if (installWorks !== 0) shell.exit(1)

  return folderPath
}

async function analyze(filename: string) {
  const folderPath = await baseActions()

  const filePath = path.join(folderPath, filename)

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const { assets } = JSON.parse(data)

    const jsTypes: Analyze[] = []
    const cssTypes: Analyze[] = []
    const imagesTypes: Analyze[] = []
    const otherTypes: Analyze[] = []

    assets.forEach(({ name, size, info }: { name: Analyze['name'], size: Analyze['size (Kb)'], info: { chunkhash: Analyze['chunk'], minimized: Analyze['minimized'] } }) => {
      const obj = { name, 'size (Kb)': size, chunk: info.chunkhash || '-', minimized: info.minimized }
      if (name.includes('.js') && !name.includes('.json')) return jsTypes.push(obj)
      if (name.includes('.css')) return cssTypes.push(obj)
      if (name.includes('.png') || name.includes('.jpg') || name.includes('.jpeg') || name.includes('.webp')) return imagesTypes.push(obj)

      return otherTypes.push(obj)
    })
    
    const amountOfJs = jsTypes.reduce((acc, asset) => acc + Number(asset['size (Kb)'] || 0), 0)
    console.log('JAVASCRIPT')
    console.table(jsTypes);
    console.log(`TOTAL: ${amountOfJs / 1000} Kb \n \n`)

    console.log('CSS')
    console.table(cssTypes);

    console.log(`\n \n Images`)
    console.table(imagesTypes);

    console.log(`\n \n Others`)
    console.table(otherTypes);
  } catch (err) {
    console.error(`Error occurred while reading ${filePath}!`, err);
    shell.exit(1)
  }

  try {
    fs.rmSync(folderPath, { recursive: true, force: true });
    console.log("Temporal folder successfuly removed.")
  } catch (err) {
    console.log(`Error occurred while deleting ${folderPath}!`, err)
  }


  console.log(figlet.textSync("Execution completed successfully!"));
}

async function formatComment(values: Object[]) {
  let comments = ''

  values.forEach((value: any) => {
    comments += `| **${value.type}** | ${value['base size (Kb)']} | ${value['PR size (Kb)']} | ${value['Difference (Kb)']} | \n`
  })

  return comments
}

async function addComment(values: Difference[]) {
  const token = process.env.GH_TOKEN;
  const user = process.env.GH_USER
  const repository = process.env.GH_REPO

  const commentBasedOnValues = await formatComment(values)

  if (!token) return

  const octokit = new Octokit({ auth: token });

  const eventData = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));

  const pullRequestId = eventData.pull_request.number;

  const comment = `**These are the bundle size changes in this PR.**

| Type | Base size (Kb) | PR size (Kb) | Difference (Kb) | 
| :--- | :----- | :------ | :------- |
${commentBasedOnValues}`

  octokit.issues.createComment({
    owner: user,
    repo: repository,
    issue_number: pullRequestId,
    body: comment
  })
}

async function getAssetsSizes(assets: { name: string, size: number }[]) {
  let jsSize: number = 0
  let cssSize: number = 0
  let imagesSize: number = 0
  let othersSize: number = 0

  assets.forEach(({ name, size }: { name: string, size: number }) => {
    if (name.includes('.js') && !name.includes('.json')) return jsSize += size
    if (name.includes('.css')) return cssSize += size
    if (name.includes('.png') || name.includes('.jpg') || name.includes('.jpeg') || name.includes('.webp')) return imagesSize += size

    return othersSize += size
  })

  return { jsSize, cssSize, imagesSize, othersSize }
}

async function compare(baseStatsLocation: string, filename: string) {
  const folderPath = await baseActions()

  const filePath = path.join(folderPath, filename)

  try {
    const newData = fs.readFileSync(filePath, 'utf8');
    const { assets } = JSON.parse(newData)

    const { jsSize, cssSize, imagesSize, othersSize } = await getAssetsSizes(assets)

    const prevStats = fs.readFileSync(baseStatsLocation, 'utf8')
    const { assets: prevStatsAssets } = JSON.parse(prevStats)

    const { jsSize: prevjsSize, cssSize: prevcssSize, imagesSize: previmagesSize, othersSize: prevothersSize } = await getAssetsSizes(prevStatsAssets)

    const difference: Difference[] = [
      { type: 'JAVASCRIPT', 'base size (Kb)': prevjsSize / 1000, 'PR size (Kb)': jsSize / 1000, 'Difference (Kb)': jsSize - prevjsSize },
      { type: 'CSS', 'base size (Kb)': prevcssSize / 1000, 'PR size (Kb)': cssSize / 1000, 'Difference (Kb)': cssSize - prevcssSize },
      { type: 'IMAGES', 'base size (Kb)': previmagesSize / 1000, 'PR size (Kb)': imagesSize / 1000, 'Difference (Kb)': imagesSize - previmagesSize },
      { type: 'OTHERS', 'base size (Kb)': prevothersSize / 1000, 'PR size (Kb)': othersSize / 1000, 'Difference (Kb)': othersSize - prevothersSize }
    ]

    console.table(difference)
    addComment(difference)
  } catch (err) {
    console.error(`Error occurred while reading ${filePath}!`, err);
    shell.exit(1)
  }

  try {
    fs.rmSync(folderPath, { recursive: true, force: true });
    console.log("Temporal folder successfuly removed.")
  } catch (err) {
    console.log(`Error occurred while deleting ${folderPath}!`, err)
  }


  console.log(figlet.textSync("Execution completed successfully!"));
}

if (options.ls) {
  const filepath = typeof options.ls === "string" ? options.ls : __dirname;
  listDirContents(filepath);
}

if (options.analyze) {
  const filename = typeof options.analyze === "string" ? options.analyze : "webpack-stats.json";
  analyze(filename);
}

if (options.compare) {
  const baseStats = typeof options.compare === "string" ? options.compare : "webpack-stats-base.json";
  const baseStatsFilePath = path.join(process.cwd(), baseStats)
  compare(baseStatsFilePath, 'webpack-stats.json');
}

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
