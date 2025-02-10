#!/usr/bin/env node

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

async function setupConfig() {
    console.log('No configuration file found. Let\'s set one up.');

    const entry = await promptUser('Entry file (default: ./index.js): ') || './index.js';
    const out = await promptUser('Output executable file (default: ./build/output.exe): ') || './build/output.exe';
    const version = await promptUser('Application version (default: 1.0.0): ') || '1.0.0';
    const icon = await promptUser('Icon file (must be .ico, press enter to skip): ');
    const executionLevel = await promptUser('Execution level (asInvoker/highestAvailable/requireAdministrator, default: asInvoker): ') || 'asInvoker';

    const properties = {
        FileDescription: await promptUser('File Description (default: My Application): ') || 'My Application',
        ProductName: await promptUser('Product Name (default: My Application): ') || 'My Application',
        LegalCopyright: await promptUser('Legal Copyright (default: Your Name or Company): ') || 'Your Name or Company',
        OriginalFilename: path.basename(out),
    };

    const config = { entry, out, version, icon, executionLevel, properties };

    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));

    console.log(`Configuration saved to ${CONFIG_FILE}.`);

    return config;
}

async function main() {
    let options = await loadConfig();

    if (!options) {
        options = await setupConfig();
    }

    program
        .name('exeup')
        .description('Exeup: Pack up and bundle your Node.js project into a single .exe file for easy distribution and hassle-free execution on Windows!')
        .version('0.0.1')
        .action(async () => {
            try {
                await exeup(options);

                console.log('Executable created successfully:', options.out);
            } catch (err) {
                console.error('Error:', err.message);
            }
        });

    program.parse(process.argv);
}

main();