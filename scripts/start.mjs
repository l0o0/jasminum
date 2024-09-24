import process from "process";
import { execSync } from "child_process";
import { exit } from "process";
import minimist from "minimist";
import cmd from "./zotero-cmd.json" assert { type: "json" };
import { start } from "repl";
const { exec } = cmd;

// Run node start.js -h for help
const args = minimist(process.argv.slice(2));

if (args.help || args.h) {
    console.log("Start Zotero Args:");
    console.log(
        "--zotero(-z): Zotero exec key in zotero-cmd.json. Default the first one."
    );
    console.log("--profile(-p): Zotero profile name.");
    exit(0);
}

const zoteroPath = exec[args.zotero || args.z || Object.keys(exec)[0]];
const profile = args.profile || args.p;

const startZotero = `${zoteroPath} --jsdebugger --purgecaches ${profile ? `-p ${profile}` : "-p test"
    }`;
console.log(startZotero);

execSync(startZotero);
exit(0);
