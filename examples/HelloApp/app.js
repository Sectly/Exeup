const readline = require('readline');

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

async function main() {
    console.log(`Hello ${await promptUser("Whats your name? ")}! :D`);
}

main();