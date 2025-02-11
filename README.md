# Exeup

Exeup: Pack up and bundle your Node.js project into a single .exe file for easy distribution and hassle-free execution on Windows!

---

## 📌 Table of Contents

- [Installation](#installation)
- [Usage](#usage)
  - [Using the CLI](#using-the-cli)
  - [Using the npm Package](#using-the-npm-package)
- [Configuration (CLI Only)](#configuration-cli-only)
- [Options](#options)
- [License](#license)

---

## 🚀 Installation

### Install as a CLI Tool

To install Exeup globally, run:

```sh
npm install -g exeup
```

### Install as a Developer Dependency

To use Exeup within a Node.js project:

```sh
npm install -D exeup
```

---

## 🔧 Usage

### Using the CLI

Once installed, you can use the `exeup` command to package your Node.js project into an executable file.

#### Initialize Configuration

Before building, configure Exeup by running:

```sh
exeup config
```

This will prompt you for essential configuration details, such as the entry file, output path, version, and execution level.

#### Build an Executable

To create an executable from your project:

```sh
exeup build
```

#### Check Version

To check the installed version of Exeup:

```sh
exeup version
```

#### View Help

For a list of available commands:

```sh
exeup help
```

---

### Using the npm Package

Exeup can be used programmatically within your Node.js project.

#### Example Usage

```javascript
const exeup = require('exeup');

const options = {
    entry: './index.js',
    out: './build/myapp.exe',
    version: '1.0.0',
    icon: './assets/icon.ico',
    skipBundle: false,
    executionLevel: 'asInvoker',
    properties: {
        FileDescription: 'My Application',
        ProductName: 'MyApp',
        LegalCopyright: 'My Company',
        OriginalFilename: 'myapp.exe',
    }
};

exeup(options, (progressData) => {
    console.log(`${progressData.progress}% - ${progressData.message}`);
    if (progressData.done) {
        console.log('Executable successfully created!');
    }
}).catch(console.error);
```

---

## ⚙️ Configuration (CLI Only)

The CLI tool relies on a configuration file (`exeup.config.json`). You can generate this file using:

```sh
exeup config
```

Example `exeup.config.json`:

```json
{
    "entry": "./index.js",
    "out": "./build/myapp.exe",
    "version": "1.0.0",
    "icon": "./assets/icon.ico",
    "skipBundle": false,
    "executionLevel": "asInvoker",
    "properties": {
        "FileDescription": "My Application",
        "ProductName": "MyApp",
        "LegalCopyright": "My Company",
        "OriginalFilename": "myapp.exe"
    }
}
```

---

## ⚡ Options

| Option              | Type    | CLI Only | Description                                                                                         |
|---------------------|---------|----------|-----------------------------------------------------------------------------------------------------|
| `entry`            | String  | No       | The entry file of your application.                                                                |
| `out`              | String  | No       | The output file path for the generated executable.                                                 |
| `version`          | String  | No       | The application version number.                                                                    |
| `icon`             | String  | No       | The path to an `.ico` or `.png` file for the application icon.                                     |
| `skipBundle`       | Boolean | No       | If `true`, skips the bundling process.                                                             |
| `executionLevel`   | String  | No       | Sets execution privileges (`asInvoker`, `highestAvailable`, or `requireAdministrator`).            |
| `properties`       | Object  | No       | Custom metadata (e.g., `FileDescription`, `ProductName`).                                          |
| `exeup.config.json`| File    | Yes      | The CLI configuration file. Not required when using Exeup as a package.                           |

---

## 📜 License

Exeup is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

## 📂 Source Code

Find the source code on GitHub: [Sectly/Exeup](https://github.com/Sectly/Exeup)

