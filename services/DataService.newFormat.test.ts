import DataService from "./DataService";
import freresDeBataille from "../public/definitions/gf/gf-freres-de-bataille-3.5.3.json";
import fs from "fs";
import path from "path";

describe("DataService new definition format", () => {
  it("transforms translated GF definition files", () => {
    const data = DataService.transformApiData(freresDeBataille);

    expect(data).toBeTruthy();
    expect(data.name).toBe("Frères de Bataille");
    expect(data.units.length).toBeGreaterThan(0);
    expect(data.upgradePackages.length).toBe(data.units.length);
    expect(data.units[0].equipment.length).toBeGreaterThan(0);
  });

  it("transforms all translated GF and AOF definition files", () => {
    const definitionRoot = path.join(__dirname, "..", "public", "definitions");
    const files = ["gf", "aof"].flatMap(gameSystem =>
      fs.readdirSync(path.join(definitionRoot, gameSystem))
        .filter(file => file.endsWith(".json"))
        .map(file => path.join(definitionRoot, gameSystem, file))
    );

    for (const file of files) {
      const input = JSON.parse(fs.readFileSync(file, "utf8"));
      const data = DataService.transformApiData(input);

      expect(data).toBeTruthy();
      expect(data.name).toBeTruthy();
      expect(data.units.length).toBeGreaterThan(0);
      expect(data.upgradePackages.length).toBe(data.units.length);
    }
  });
});
