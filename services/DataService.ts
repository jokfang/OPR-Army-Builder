import { nanoid } from "nanoid";
import { IUnit, IUpgrade, IUpgradeGains, IUpgradeGainsItem, IUpgradeGainsWeapon, IUpgradeOption, IUpgradePackage } from "../data/interfaces";
import DataParsingService from "./DataParsingService";
import { groupBy } from "./Helpers";
import router from "next/router";
import _ from "lodash";
import pluralise from "pluralize";
import styleFunctionSx from "@mui/system/styleFunctionSx";
import EquipmentService from "./EquipmentService";
import UnitService from "./UnitService";

export default class DataService {

  private static useStaging: boolean = false;
  //const webCompanionUrl = `https://opr-list-builder${useStaging ? "-staging" : ""}.herokuapp.com/api`;
  private static webCompanionUrl = 'https://webapp.onepagerules.com/api';

  public static getJsonData(filePath: string, callback: (armyData: any) => void, fallback?: (err: string) => void) {

    fetch(filePath)
      .then((res) => res.json())
      .then((data) => {

        console.log(data);
        var transformData = this.transformApiData(data, fallback);
        console.log(transformData);
        if (transformData) callback(transformData);

      }, fallback);
  }

  public static getApiData(armyId: string, callback: (armyData: any) => void, fallback?: (err: string) => void) {

    const dataSourceName = Array.isArray(router.query.dataSourceUrl) ? router.query.dataSourceUrl[0] : router.query.dataSourceUrl;
    let dataSourceUrl = dataSourceName ? `https://${dataSourceName}.herokuapp.com/api` : this.webCompanionUrl
    fetch(dataSourceUrl + `/army-books/${armyId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load army book (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        
        //console.log(data);
        const afData = DataService.transformApiData(data, fallback);
        //console.log(afData);

        callback(afData);
      })
      .catch((err) => {
        console.error("Failed to load army book:", err);
        if (typeof (fallback) == "function") fallback(err);
      });
  }

  public static transformApiData(input, fallback?: (err: string) => void) {
    try {
      input = this.normalizeDefinitionData(input);
      const countRegex = /^(\d+)x\s/;

      const upgradePackages: IUpgradePackage[] = input.upgradePackages.map(pkg => {
        return {
        ...pkg,
        sections: pkg.sections.map(section => {
          const upgrade = DataParsingService.parseUpgradeText(section.label);

          // Sanitise dodgy/old data
          delete section.select;
          delete section.affects;
          delete section.replaceWhat;

          return {
            id: section.id ?? nanoid(7),
            ...section,
            ...upgrade,
            options: section.options.map((opt: IUpgradeOption) => {
              const gains = [];
              // Iterate backwards through gains array so we can push new 
              if (opt.gains) for (let original of opt.gains) {
                // Replace "2x " in label/name of original gain
                const gain = {
                  count: 1,
                  ...original,
                  label: original.label?.replace(countRegex, ""),
                  name: original.name?.replace(countRegex, "")
                };
                // Capture the count digit from the name
                const countMatch = countRegex.exec(original.name);
                // Parse the count if present, otherwise default to 1
                const count = countMatch ? parseInt(countMatch[1]) : 1;
                // Push the gain into the array as many times as the count
                for (let y = 0; y < count; y++) {
                  gains.push(gain);
                }
              }

              // Group/combine gains with same name...
              const gainsGroups = _.groupBy(gains, g => g.label);

              return ({
                ...opt,
                isModel: upgrade.attachModel ?? false,
                cost: typeof (opt.cost ?? 0) === "number" ? opt.cost : parseInt((opt.cost as any).toString().replace(/pts?/, "")),
                id: opt.id || nanoid(5), // Assign ID to upgrade option if one doesn't exist

                // Group same items back together and sum the count
                gains: Object.values(gainsGroups).map((grp: any[]) => {
                  const count = grp.reduce((c, next) => c + (next.count || 1), 0);
                  //console.log(grp[0].label + " " + count, grp);
                  return {
                    ...grp[0],
                    count: count,
                    mods: []
                  }
                })
              });
            })
          };
        })
      }});

      const units: IUnit[] = input.units.map((u: IUnit) => ({
        ...u,
        // Transform this into a collection of upgrades
        equipment: u.equipment.map(e => {
          // Capture the count digit from the name
          const countMatch = countRegex.exec(e.label);
          const label = e.label.replace(countRegex, "");
          const count = e.count
            ? e.count * u.size
            : (countMatch ? parseInt(countMatch[1]) * u.size : u.size);
          return {
            ...e,
            label: label,
            name: e.name || label,
            count: count,
            mods: [],
            type: "ArmyBookWeapon",
            specialRules: (e as IUpgradeGainsWeapon).specialRules.map(DataParsingService.parseRule)
          }
        }),
        disabledUpgradeSections: (() => {
          const sections: IUpgrade[] = _.compact(u.upgrades
            // Map all upgrade packages
            .map(uid => upgradePackages.find(pkg => pkg.uid === uid)))
            // Flatten down to array of all upgrade sections
            .reduce((sections, next) => sections.concat(next.sections), []);

          const allGains: IUpgradeGains[] = sections
            .flatMap(section => section.options)
            .flatMap(option => option.gains)
            .flatMap(gain => gain.type == "ArmyBookItem" ? 
             (gain as IUpgradeGainsItem).content :
             [gain])
            //.reduce((opts, next) => opts.concat(next.options), [])
            //.reduce((gains, next) => gains.concat(next.gains), [])
            //.map(gain => gain.name);

          const disabledSections: string[] = [];

          // For each section, check that the unit has access to the things it wants to replace
          // Only need sections that are replacing (or looking for) something
          for (let section of sections.filter(s => s.replaceWhat)) {
            let disable = false
            for (let alt of section.replaceWhat) {
              let altworks = true
              for (let what of alt) {
                // Does equipment contain this thing?
                const equipmentMatch = u.equipment.some(e => EquipmentService.compareEquipment({...e, label:e.label.replace(countRegex, "")}, what));
                if (equipmentMatch) continue
                // Do any upgrade sections contain this thing?
                const upgradeGains = allGains.find(g => EquipmentService.compareEquipment(g, what));
                if (upgradeGains) continue
                altworks = false
                break
              }
              if (altworks) {
                break
              }
              disable = true
            }
            if (disable) {
              //console.log("Disabled upgrade section:", u, section)
              disabledSections.push(section.id);
            }
          }

          return disabledSections;
        })()
      }));

      const data = {
        ...input,
        units,
        upgradePackages
      };

      for (let unit of data.units) {
        // Group equipment by name
        const groups = groupBy(unit.equipment, "name");

        // Take first equipment in each group, with a count set to how many are in the group
        unit.equipment = Object
          .values(groups)
          .map((group: any[]) => {
            const countInGroup = group.reduce((count, next) => count + (next.count ?? 1), 0);
            return {
              ...group[0],
              count: countInGroup// * unit.size
            };
          });
      }

      return data;
    } catch (err) {
      console.error("Failed to transform army data:", err);
      if (typeof (fallback) == "function") fallback(err);
      return null;
    }
  }

  private static normalizeDefinitionData(input) {
    if (!input?.armyName || !Array.isArray(input.units) || input.upgradePackages) {
      return input;
    }

    const weaponGain = (weapon) => {
      const range = parseInt((weapon.range || "").replace(/"/g, ""));
      const attacks = parseInt((weapon.attacks || "").replace(/^A/i, ""));
      const specialRules = []
        .concat(weapon.ap && weapon.ap !== "-" ? [`PA (${weapon.ap})`] : [])
        .concat(weapon.special && weapon.special !== "-" ? weapon.special.split(/\s*,\s*/) : [])
        .filter(Boolean);

      return {
        id: nanoid(7),
        label: weapon.name,
        attacks: Number.isNaN(attacks) ? undefined : attacks,
        range: Number.isNaN(range) ? 0 : range,
        specialRules
      };
    };

    const ruleGain = (rule) => ({
      id: nanoid(7),
      count: 1,
      ...DataParsingService.parseRule(rule),
      label: rule,
      type: "ArmyBookRule"
    });

    const optionGains = (option) => {
      const details = option.details || "";
      const weaponText = `${option.name} (${details}) ${option.cost || "+0pts"}`;

      try {
        const parsed = DataParsingService.parseEquipment(weaponText, true);
        return parsed.gains || [parsed];
      } catch (_) {
        return details
          .split(/\s*,\s*/)
          .filter(Boolean)
          .filter(rule => rule !== "-")
          .map(ruleGain);
      }
    };

    const upgradePackages = input.units.map((unit, unitIndex) => {
      const uid = `unit-${unitIndex + 1}`;
      return {
        uid,
        hint: unit.name,
        sections: (unit.upgrades || []).map((upgrade, upgradeIndex) => ({
          id: `${uid}-upgrade-${upgradeIndex + 1}`,
          label: upgrade.type.endsWith(":") ? upgrade.type : `${upgrade.type}:`,
          options: (upgrade.options || []).map(option => ({
            id: nanoid(5),
            type: "ArmyBookUpgradeOption",
            cost: typeof option.cost === "number" ? option.cost : parseInt((option.cost || "0").replace(/pts?/i, "")) || 0,
            label: option.name,
            gains: optionGains(option)
          }))
        }))
      };
    });

    return {
      uid: input.sourceBookUid,
      name: input.armyName,
      factionName: input.armyName,
      factionRelation: "",
      versionString: input.version ? `v${input.version}` : "",
      dataToolVersion: input.version || "",
      background: input.backgroundStory || input.introduction || "",
      units: input.units.map((unit, unitIndex) => ({
        id: `${input.sourceBookUid || "local"}-${unitIndex + 1}`,
        name: unit.name,
        size: unit.size,
        cost: unit.cost,
        quality: parseInt(unit.quality),
        defense: parseInt(unit.defense),
        category: unit.unitType,
        specialRules: (unit.specialRules || []).map(DataParsingService.parseRule),
        upgrades: [`unit-${unitIndex + 1}`],
        equipment: (unit.weapons || []).map(weaponGain)
      })),
      upgradePackages,
      specialRules: []
        .concat(input.armyWideSpecialRule || [])
        .concat(input.specialRules || [])
        .concat(input.auraSpecialRules || [])
        .map(rule => ({
          id: nanoid(5),
          key: (rule.keywords?.[0] || rule.name || "").toLowerCase().replace(/\s+/g, "-"),
          name: rule.name,
          label: rule.name,
          description: rule.keywords?.join(", ") || "",
          options: []
        })),
      spells: (input.armySpells || []).map(spell => ({
        id: nanoid(5),
        name: spell.name,
        threshold: spell.cost,
        effect: spell.keywords?.join(", ") || ""
      })),
      isLive: true,
      official: true,
      coverImagePath: ""
    };
  }
}
