// @Package: Exeup
// @License: MIT
// @Author: Sectly
// @Version: 0.0.2
// @Source: https://github.com/Sectly/Exeup

const fs = require('fs').promises;
const { resolve } = require('path');
const pngToIco = require('png-to-ico');
const ncc = require('@vercel/ncc');
const { inject } = require('postject');
const { load } = require('resedit/cjs');
const { exec } = require('child_process');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

const signtoolPackagePath = require.resolve('signtool');

function getSigntoolPath() {
    const signtoolPath = path.dirname(signtoolPackagePath);
    switch (process.arch) {
        case 'ia32':
            return path.join(signtoolPath, 'signtool', 'x86', 'signtool.exe').replace(/\\/g, '/');
        case 'x64':
            return path.join(signtoolPath, 'signtool', 'x64', 'signtool.exe').replace(/\\/g, '/');
        default:
            throw new Error('Signtool is not supported in this environment');
    }
}

function signtool(args) {
    const signtoolPath = getSigntoolPath();

    return execAsync(`"${signtoolPath}" ${args.join(' ')}`);
}

const warningSuppression =
    "const originalError=console.error;console.error=(msg,...args)=>{if(typeof msg==='string'&&msg.includes('Single executable application is an experimental feature and might change at any time')||msg.includes('Currently the require() provided to the main script embedded into single-executable applications only supports loading built-in modules.'))return;originalError(msg,...args);};";

function parseObject(data, reference) {
    for (const [key, value] of Object.entries(data)) {
        switch (typeof value) {
            case 'string': {
                const regex = /\{(package:(?<prop>[a-z]+)(\.(?<subProp>[a-z]+))?)\}/gi;
                const match = regex.exec(value);
                const { prop, subProp } = match?.groups || {};

                if (prop && reference[prop]) {
                    if (subProp && reference[prop][subProp])
                        data[key] = value.replace(regex, reference[prop][subProp]);
                    else data[key] = value.replace(regex, reference[prop]);
                }

                break;
            }

            case 'object': {
                if (value && !Array.isArray(value)) data[key] = parseObject(value, reference);

                break;
            }
        }
    }
    return data;
}

async function parseOptions(options) {
    try {
        const packageJSONPath = path.resolve(process.cwd(), 'package.json');
        const packageJSON = JSON.parse(await fs.readFile(packageJSONPath, 'utf8'));

        parseObject(options, packageJSON);
    } catch (_err) { }

    return options;
}

const language = {
    lang: 1033, // Language: en-us
    codepage: 1200 // Encoding: UTF-16
};

async function ensurePath(targetPath) {
    const dirPath = path.extname(targetPath) ? path.dirname(targetPath) : targetPath;

    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        console.error(`Error ensuring directory: ${dirPath}`, error);
    }
}

async function exeup(options, progressCallback) {
    progressCallback({
        message: "Initializing...",
        progress: 0,
        done: false,
    });

    if (process.platform !== "win32") {
        throw new Error(`Unsupported platform, Exeup requires the Windows platform (win32) ${process.platform === "linux" && "You may use something like appimagetool to turn the .exe into an .AppImage or use the Wine compatibility layer!" || ""}`);
    }

    const opts = await parseOptions(options);
    const out = opts.out.replace(/\\/g, '/');
    const bundle = `${out}.bundle.js`;
    const seaConfig = `${out}.sea-config.json`;
    const seaBlob = `${out}.blob`;

    if (!opts.out || !opts.entry) {
        throw new Error('Out and/or Entry options are missing!');
    }

    await ensurePath(path.normalize(out));
    await ensurePath(path.normalize(opts.entry));

    if (opts.icon && String(opts.icon).endsWith(".png")) {
        progressCallback({
            message: "Converting icon...",
            progress: 15,
            done: false,
        });

        await ensurePath(path.normalize(opts.icon));

        const icoBuffer = await pngToIco(opts.icon);
        const icoIcon = `${String(opts.icon).replace(".png", ".ico")}`;

        await ensurePath(path.normalize(icoIcon));

        await fs.writeFile(icoIcon, icoBuffer);

        opts.icon = icoIcon;
    }

    progressCallback({
        message: "Processing code...",
        progress: 25,
        done: false,
    });

    let code = '';

    if (opts.skipBundle) {
        code = await fs.readFile(resolve(opts.entry), 'utf8');
    } else {
        const output = await ncc(resolve(opts.entry), {
            minify: true,
            quiet: true,
            target: 'es2021'
        });

        code = output.code;
    }

    progressCallback({
        message: "Processing executable...",
        progress: 35,
        done: false,
    });

    const pattern = /^#!.*\n/;
    const match = code.match(pattern);

    if (match) {
        code = `${match[0]}${warningSuppression}${code.slice(match[0].length)}`;
    } else {
        code = `${warningSuppression}${code}`;
    }

    await fs.writeFile(bundle, code);
    await fs.writeFile(
        seaConfig,
        JSON.stringify({ main: bundle, output: seaBlob, disableExperimentalSEAWarning: true }, null, 2)
    );

    await execAsync(`node --experimental-sea-config "${seaConfig}"`);

    await fs.copyFile(process.execPath, out);

    await signtool(['remove', '/s', `"${out}"`]);

    const seaBlobData = await fs.readFile(seaBlob);

    await inject(out, 'NODE_SEA_BLOB', Buffer.from(seaBlobData), { sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2' });

    progressCallback({
        message: "Cleaning up...",
        progress: 50,
        done: false,
    });

    await fs.unlink(bundle);
    await fs.unlink(seaConfig);
    await fs.unlink(seaBlob);

    progressCallback({
        message: "Rectifying executable...",
        progress: 75,
        done: false,
    });

    const RE = await load();
    const data = await fs.readFile(opts.out);
    const executable = RE.NtExecutable.from(data);
    const res = RE.NtExecutableResource.from(executable);
    const vi = RE.Resource.VersionInfo.fromEntries(res.entries)[0];

    vi.removeStringValue(language, 'OriginalFilename');
    vi.removeStringValue(language, 'InternalName');

    if (opts.version) {
        const version = opts.version.split('.').map(v => Number(v) || 0).slice(0, 3);

        vi.setProductVersion(...version, 0, language.lang);
        vi.setFileVersion(...version, 0, language.lang);
    }

    if (opts.properties) {
        vi.setStringValues(language, opts.properties);
    }

    vi.outputToResourceEntries(res.entries);

    progressCallback({
        message: "Finishing up...",
        progress: 85,
        done: false,
    });

    if (opts.icon) {
        const iconFile = RE.Data.IconFile.from(await fs.readFile(opts.icon));

        RE.Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, language.lang, iconFile.icons.map(item => item.data));
    }

    const level = opts.executionLevel || 'asInvoker';
    const manifest = res.getResourceEntriesAsString(24, 1)[0][1];

    res.replaceResourceEntryFromString(24, 1, language.lang, manifest.replace('asInvoker', level));
    res.outputResource(executable);

    await fs.writeFile(opts.out, Buffer.from(executable.generate()));

    progressCallback({
        message: "Complete!",
        progress: 100,
        done: true,
    });
}

module.exports = exeup;