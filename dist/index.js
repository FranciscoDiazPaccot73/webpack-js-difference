#! /usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
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
function listDirContents(filepath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const files = yield fs.promises.readdir(filepath);
            const detailedFilesPromises = files.map((file) => __awaiter(this, void 0, void 0, function* () {
                let fileDetails = yield fs.promises.lstat(path.resolve(filepath, file));
                const { size, birthtime } = fileDetails;
                return { filename: file, "size(KB)": size, created_at: birthtime };
            }));
            const detailedFiles = yield Promise.all(detailedFilesPromises);
            console.table(detailedFiles);
        }
        catch (error) {
            console.error("Error occurred while reading the directory!", error);
        }
    });
}
function baseActions() {
    return __awaiter(this, void 0, void 0, function* () {
        const folderPath = path.join(process.cwd(), "/.tmp");
        try {
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath);
            }
        }
        catch (err) {
            console.error("Error occurred while creating the directory!", err);
        }
        // console.log("Installing dependencies...")
        // const installWorks = shell.exec("npm install").code
        console.log("Building...");
        shell.exec("npm run build");
        // if (installWorks !== 0) shell.exit(1)
        return folderPath;
    });
}
function analyze(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        const folderPath = yield baseActions();
        const filePath = path.join(folderPath, filename);
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const { assets } = JSON.parse(data);
            const jsTypes = [];
            const cssTypes = [];
            const imagesTypes = [];
            const otherTypes = [];
            assets.forEach(({ name, size, info }) => {
                const obj = { name, 'size (Kb)': size, chunk: info.chunkhash || '-', minimized: info.minimized };
                if (name.includes('.js') && !name.includes('.json'))
                    return jsTypes.push(obj);
                if (name.includes('.css'))
                    return cssTypes.push(obj);
                if (name.includes('.png') || name.includes('.jpg') || name.includes('.jpeg') || name.includes('.webp'))
                    return imagesTypes.push(obj);
                return otherTypes.push(obj);
            });
            const amountOfJs = jsTypes.reduce((acc, asset) => acc + Number(asset['size (Kb)'] || 0), 0);
            console.log('JAVASCRIPT');
            console.table(jsTypes);
            console.log(`TOTAL: ${amountOfJs / 1000} Kb \n \n`);
            console.log('CSS');
            console.table(cssTypes);
            console.log(`\n \n Images`);
            console.table(imagesTypes);
            console.log(`\n \n Others`);
            console.table(otherTypes);
        }
        catch (err) {
            console.error(`Error occurred while reading ${filePath}!`, err);
            shell.exit(1);
        }
        try {
            fs.rmSync(folderPath, { recursive: true, force: true });
            console.log("Temporal folder successfuly removed.");
        }
        catch (err) {
            console.log(`Error occurred while deleting ${folderPath}!`, err);
        }
        console.log(figlet.textSync("Execution completed successfully!"));
    });
}
function formatComment(values) {
    return __awaiter(this, void 0, void 0, function* () {
        let comments = '';
        values.forEach((value) => {
            comments += `| **${value.type}** | ${value['base size (Kb)']} | ${value['PR size (Kb)']} | ${value['Difference (Kb)']} | \n`;
        });
        return comments;
    });
}
function addComment(values) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = process.env.GH_TOKEN;
        const user = process.env.GH_USER;
        const repository = process.env.GH_REPO;
        const commentBasedOnValues = yield formatComment(values);
        if (!token)
            return;
        const octokit = new Octokit({ auth: token });
        const eventData = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
        const pullRequestId = eventData.pull_request.number;
        const comment = `**These are the bundle size changes in this PR.**

| Type | Base size (Kb) | PR size (Kb) | Difference (Kb) | 
| :--- | :----- | :------ | :------- |
${commentBasedOnValues}`;
        octokit.issues.createComment({
            owner: user,
            repo: repository,
            issue_number: pullRequestId,
            body: comment
        });
    });
}
function getAssetsSizes(assets) {
    return __awaiter(this, void 0, void 0, function* () {
        let jsSize = 0;
        let cssSize = 0;
        let imagesSize = 0;
        let othersSize = 0;
        assets.forEach(({ name, size }) => {
            if (name.includes('.js') && !name.includes('.json'))
                return Math.round(jsSize += size);
            if (name.includes('.css'))
                return Math.round(cssSize += size);
            if (name.includes('.png') || name.includes('.jpg') || name.includes('.jpeg') || name.includes('.webp'))
                return Math.round(imagesSize += size);
            return Math.round(othersSize += size);
        });
        return { jsSize, cssSize, imagesSize, othersSize };
    });
}
function compare(baseStatsLocation, filename) {
    return __awaiter(this, void 0, void 0, function* () {
        const folderPath = yield baseActions();
        const filePath = path.join(folderPath, filename);
        try {
            const newData = fs.readFileSync(filePath, 'utf8');
            const { assets } = JSON.parse(newData);
            const { jsSize, cssSize, imagesSize, othersSize } = yield getAssetsSizes(assets);
            const prevStats = fs.readFileSync(baseStatsLocation, 'utf8');
            const { assets: prevStatsAssets } = JSON.parse(prevStats);
            const { jsSize: prevjsSize, cssSize: prevcssSize, imagesSize: previmagesSize, othersSize: prevothersSize } = yield getAssetsSizes(prevStatsAssets);
            const difference = [
                { type: 'JAVASCRIPT', 'base size (Kb)': prevjsSize / 1000, 'PR size (Kb)': jsSize / 1000, 'Difference (Kb)': (jsSize - prevjsSize) / 1000 },
                { type: 'CSS', 'base size (Kb)': prevcssSize / 1000, 'PR size (Kb)': cssSize / 1000, 'Difference (Kb)': (cssSize - prevcssSize) / 1000 },
                { type: 'IMAGES', 'base size (Kb)': previmagesSize / 1000, 'PR size (Kb)': imagesSize / 1000, 'Difference (Kb)': (imagesSize - previmagesSize) / 1000 },
                { type: 'OTHERS', 'base size (Kb)': prevothersSize / 1000, 'PR size (Kb)': othersSize / 1000, 'Difference (Kb)': (othersSize - prevothersSize) / 1000 }
            ];
            console.table(difference);
            addComment(difference);
        }
        catch (err) {
            console.error(`Error occurred while reading ${filePath}!`, err);
            shell.exit(1);
        }
        try {
            fs.rmSync(folderPath, { recursive: true, force: true });
            console.log("Temporal folder successfuly removed.");
        }
        catch (err) {
            console.log(`Error occurred while deleting ${folderPath}!`, err);
        }
        console.log(figlet.textSync("Execution completed successfully!"));
    });
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
    const baseStatsFilePath = path.join(process.cwd(), baseStats);
    compare(baseStatsFilePath, 'webpack-stats.json');
}
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=index.js.map