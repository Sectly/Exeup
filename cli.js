#!/usr/bin/env node

// @Package: Exeup CLI
// @License: MIT
// @Author: Sectly
// @Version: 0.0.2
// @Source: https://github.com/Sectly/Exeup

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { program } = require('commander');
const exeup = require('./index');
const CONFIG_FILE = 'exeup.config.json';

async function loadConfig() {
    try {
        const configPath = path.resolve(process.cwd(), CONFIG_FILE);
        const configData = await fs.readFile(configPath, 'utf8');

        return JSON.parse(configData);
    } catch (error) {
        return null;
    }
}

async function promptUser(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => rl.question(query, (answer) => {
        rl.close();

        resolve(answer);
    }));
}

async function promptUserYesNo(query) {
    const userInput = await promptUser(`${query} [Yes(y) / No(n)]`) || 'n';

    if (String(userInput).includes("y")) {
        return true;
    }

    return false;
}

async function setupConfig(asCommand) {
    if (asCommand) {
        console.log("Let's configure Exeup.");
    } else {
        console.log("No configuration file found. Let's set one up.");
    }

    const entry = await promptUser('Entry file (default: ./index.js): ') || './index.js';
    const out = await promptUser('Output executable file (default: ./build/output.exe): ') || './build/output.exe';
    const version = await promptUser('Application version (default: 1.0.0): ') || '1.0.0';
    const icon = await promptUser('Icon file (must be .ico or .png, press enter to skip): ');
    const skipBundle = await promptUserYesNo('Skip the bundling process (yes/no, default: no): ') || false;
    const executionLevel = await promptUser('Execution level (asInvoker/highestAvailable/requireAdministrator, default: asInvoker): ') || 'asInvoker';

    const properties = {
        FileDescription: await promptUser('File Description (default: My Application): ') || 'My Application',
        ProductName: await promptUser('Product Name (default: My Application): ') || 'My Application',
        LegalCopyright: await promptUser('Legal Copyright (default: Your Name or Company): ') || 'Your Name or Company',
        OriginalFilename: path.basename(out),
    };

    const config = { entry, out, version, icon, skipBundle, executionLevel, properties };

    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));

    console.log(`Configuration saved to ${CONFIG_FILE}.`);

    return config;
}

function updateProgress(message, progress) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);

    const barLength = 30;
    const filledLength = Math.round((progress / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '-'.repeat(barLength - filledLength);

    process.stdout.write(`[${bar}] ${progress}% - ${message}`);
}

async function doBuild() {
    console.log('Initializing...');

    let options = await loadConfig();

    if (!options) {
        options = await setupConfig(false);
    }

    try {
        await exeup(options, (progressData) => {
            updateProgress(progressData.message, progressData.progress);

            if (progressData.done) {
                console.log('\nExecutable created successfully:', options.out);
            }
        });
    } catch (err) {
        console.error('\nError:', err.message);
    }
}

async function main() {
    program
        .name('exeup')
        .description('Exeup: Pack up and bundle your Node.js project into a single .exe file for easy distribution and hassle-free execution on Windows!')
        .version('0.0.2')
        .action(async () => {
            let options = await loadConfig();

            const runBuild = options && await promptUserYesNo('Run "exeup build"?') || false;

            if (runBuild) {
                await doBuild();
            } else {
                program.help();
            }
        });

    program
        .command('build')
        .description('Build the executable')
        .action(async () => {
            await doBuild();
        });

    program
        .command('version')
        .description('Display version information')
        .action(async () => {
            console.log("ExeUp Version: 0.0.2");
        });

    program
        .command('config')
        .description('Reconfigure the exeup config')
        .action(async () => {
            await setupConfig(true);
        });

    program
        .command('help')
        .description('Display help information')
        .action(async () => {
            program.help();
        });

    program.parse(process.argv);
}

main();