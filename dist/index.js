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
console.log(figlet.textSync(chalk.green("Webpack JS Difference")));
const program = new Command();
program
    .version("1.0.0")
    .description("An example CLI Analyze webpack bundle")
    .option("-l, --ls  [value]", "List directory contents")
    .option("-a, --analyze  [value]", "Analyze directory")
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
function analyze(filename) {
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
        const filePath = path.join(folderPath, filename);
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const { assets } = JSON.parse(data);
            const jsTypes = [];
            const cssTypes = [];
            const imagesTypes = [];
            const otherTypes = [];
            assets.forEach(({ name, size, info }) => {
                const obj = { name, size, chunk: info.chunkhash, minimized: info.minimized };
                if (name.includes('.js') && !name.includes('.json'))
                    return jsTypes.push(obj);
                if (name.includes('.css'))
                    return cssTypes.push(obj);
                if (name.includes('.png') || name.includes('.jpg') || name.includes('.jpeg') || name.includes('.webp'))
                    return imagesTypes.push(obj);
                return otherTypes.push(obj);
            });
            const amountOfJs = jsTypes.reduce((acc, asset) => acc + asset.size, 0);
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
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=index.js.map