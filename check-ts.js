const ts = require('typescript');
const fs = require('fs');

const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
if (!configPath) {
  console.error("Could not find a valid 'tsconfig.json'.");
  process.exit(1);
}

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedCommandLine = ts.parseJsonConfigFileContent(configFile.config, ts.sys, './');

const program = ts.createProgram(parsedCommandLine.fileNames, parsedCommandLine.options);
const emitResult = program.emit();

const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

let output = '';
allDiagnostics.forEach(diagnostic => {
  if (diagnostic.file) {
    const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    output += `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}\n`;
  } else {
    output += `${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}\n`;
  }
});

fs.writeFileSync('ts-errors.txt', output);
console.log('Done');
