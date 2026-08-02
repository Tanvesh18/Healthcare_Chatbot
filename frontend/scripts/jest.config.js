const createJestConfig = require("react-scripts/scripts/utils/createJestConfig");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
const resolve = relativePath => require.resolve(`react-scripts/${relativePath}`);
const config = createJestConfig(resolve, rootDir, false);

// Jest's default glob does not discover tests when an ancestor directory is
// hidden (this repository lives under `.vscode`). A regex keeps discovery
// independent of the workspace's parent directory name.
delete config.testMatch;
config.testRegex = [String.raw`[/\\]src[/\\].*\.(?:spec|test)\.[jt]sx?$`];

module.exports = config;
