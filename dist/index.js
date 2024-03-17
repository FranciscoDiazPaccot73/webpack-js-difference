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
const { Command } = require("commander");
const fs = require("fs");
const path = require("path");
const figlet = require("figlet");
const shell = require("shelljs");
const chalk = require('chalk');
const { Octokit } = require('@octokit/rest');
console.log(figlet.textSync(chalk.green("Webpack JS Difference")));
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
            console.error(err);
        }
        console.log("Installing dependencies...");
        const installWorks = shell.exec("npm install").code;
        console.log("Building...");
        shell.exec("npm run build");
        if (installWorks !== 0)
            shell.exit(1);
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
                const obj = { name, 'size (Kb)': size, chunk: info.chunkhash || '-', minimized: info.minimized || '-' };
                if (name.includes('.js') && !name.includes('.json'))
                    return jsTypes.push(obj);
                if (name.includes('.css'))
                    return cssTypes.push(obj);
                if (name.includes('.png') || name.includes('.jpg') || name.includes('.jpeg') || name.includes('.webp'))
                    return imagesTypes.push(obj);
                return otherTypes.push(obj);
            });
            const amountOfJs = jsTypes.reduce((acc, asset) => acc + Number(asset['size (Kb)'] || 0), 0);
            console.log(chalk.yellow('JAVASCRIPT'));
            console.table(jsTypes);
            console.log(`TOTAL: ${amountOfJs / 1000} Kb \n \n`);
            console.log(chalk.blue('CSS'));
            console.table(cssTypes);
            console.log(`\n \n Images`);
            console.table(imagesTypes);
            console.log(`\n \n Others`);
            console.table(otherTypes);
        }
        catch (err) {
            console.error(err);
            shell.exit(1);
        }
        try {
            fs.rmSync(folderPath, { recursive: true, force: true });
            console.log("Successfuly removed.");
        }
        catch (err) {
            console.log(err);
        }
        console.log(figlet.textSync("Execution completed"));
    });
}
function addComment(values) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = process.env.GH_TOKEN;
        console.log(values);
        if (!token)
            return;
        const user = process.env.GH_USER;
        const repository = process.env.GH_REPO;
        const octokit = new Octokit({ auth: token });
        const eventData = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
        const pullRequestId = eventData.pull_request.number;
        octokit.issues.createComment({
            owner: user,
            repo: repository,
            issue_number: pullRequestId,
            body: 'COMENTARIO'
        }).then(response => {
            console.log('Comment added:', response.data.html_url);
        }).catch(error => {
            console.error(error);
        });
    });
}
function compare(baseStatsLocation, filename) {
    return __awaiter(this, void 0, void 0, function* () {
        const folderPath = yield baseActions();
        const filePath = path.join(folderPath, filename);
        try {
            const newData = fs.readFileSync(filePath, 'utf8');
            const { assets } = JSON.parse(newData);
            let jsSize = 0;
            let cssSize = 0;
            let imagesSize = 0;
            let othersSize = 0;
            assets.forEach(({ name, size }) => {
                if (name.includes('.js') && !name.includes('.json'))
                    return jsSize += size;
                if (name.includes('.css'))
                    return cssSize += size;
                if (name.includes('.png') || name.includes('.jpg') || name.includes('.jpeg') || name.includes('.webp'))
                    return imagesSize += size;
                return othersSize += size;
            });
            const prevStats = fs.readFileSync(baseStatsLocation, 'utf8');
            const { assets: prevStatsAssets } = JSON.parse(prevStats);
            let prevjsSize = 0;
            let prevcssSize = 0;
            let previmagesSize = 0;
            let prevothersSize = 0;
            prevStatsAssets.forEach(({ name, size }) => {
                if (name.includes('.js') && !name.includes('.json'))
                    return prevjsSize += size;
                if (name.includes('.css'))
                    return prevcssSize += size;
                if (name.includes('.png') || name.includes('.jpg') || name.includes('.jpeg') || name.includes('.webp'))
                    return previmagesSize += size;
                return prevothersSize += size;
            });
            const difference = [
                { type: 'JAVASCRIPT', 'base size (Kb)': prevjsSize / 1000, 'PR size (Kb)': jsSize / 1000, 'Difference (Kb)': jsSize - prevjsSize },
                { type: 'CSS', 'base size (Kb)': prevcssSize / 1000, 'PR size (Kb)': cssSize / 1000, 'Difference (Kb)': cssSize - prevcssSize },
                { type: 'IMAGES', 'base size (Kb)': previmagesSize / 1000, 'PR size (Kb)': imagesSize / 1000, 'Difference (Kb)': imagesSize - previmagesSize },
                { type: 'OTHERS', 'base size (Kb)': prevothersSize / 1000, 'PR size (Kb)': othersSize / 1000, 'Difference (Kb)': othersSize - prevothersSize }
            ];
            console.table(difference);
            addComment(difference);
        }
        catch (err) {
            console.error(err);
            shell.exit(1);
        }
        try {
            fs.rmSync(folderPath, { recursive: true, force: true });
            console.log("Successfuly removed.");
        }
        catch (err) {
            console.log(err);
        }
        console.log(figlet.textSync("Execution completed"));
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