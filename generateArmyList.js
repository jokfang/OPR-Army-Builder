const fs = require("fs");
const path = require("path");

const isDir = (fileName) => {
  return !fs.lstatSync(fileName).isFile();
};
const dir = "./public/definitions";

const armyLists = fs
  .readdirSync(dir)
  .map((fileName) => path.join(dir, fileName))
  .filter(isDir)
  .map((gameDir) => {
    // Each in gf/aof folders
    return {
      key: gameDir.substring(gameDir.lastIndexOf("\\") + 1),
      items: fs
        .readdirSync(gameDir)
        .map((fileName) => path.join(gameDir, fileName))
        .map((filePath) => {
          // Read json file string
          const fileContent = fs.readFileSync(filePath, "utf8");
          // Parse json file
          const armyData = JSON.parse(fileContent);

          return {
            name: armyData.name || armyData.armyName,
            dataToolVersion: armyData.dataToolVersion || armyData.version,
            version: armyData.version,
            path: filePath
              .replace(/\\/g, "/")
              .replace(/^public\//, "")
          };
        }),
    };
  });

fs.writeFile("./public/definitions/army-files.json", JSON.stringify(armyLists), (err) => {
  console.error(err);
});
