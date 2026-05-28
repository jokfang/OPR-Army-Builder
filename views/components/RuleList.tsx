import RuleItem from "./RuleItem";
import { RootState } from '../../data/store';
import { useDispatch, useSelector } from 'react-redux';
import { IGameRule } from "../../data/armySlice";
import { Fragment, useEffect } from "react";
import { ISpecialRule } from "../../data/interfaces";
import RulesService from "../../services/RulesService";
import { groupBy } from "../../services/Helpers";
import DictionaryService from "../../services/DictionaryService";
import { setGameRules } from "../../data/armySlice";

const baseRuleName = (name: string) => /(.+?)(?:\(|$)/.exec(name)?.[1]?.trim() || name;

const normalizeRuleName = (name: string) => baseRuleName(name || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export default function RuleList({ specialRules }: { specialRules: ISpecialRule[] }) {
  const army = useSelector((state: RootState) => state.army);
  const dispatch = useDispatch();
  const gameRules = army.rules;
  const armyRules = army.data?.specialRules || [];
  const ruleDefinitions: IGameRule[] = gameRules.length > 0 ? gameRules.concat(armyRules) : [];

  useEffect(() => {
    if (gameRules.length > 0)
      return;

    DictionaryService.getRules()
      .then(rules => dispatch(setGameRules(rules)))
      .catch(err => console.error("Failed to load rules dictionary:", err));
  }, [dispatch, gameRules.length]);

  const rules = specialRules.filter(r => !!r && r.name != "-");

  if (!rules || rules.length === 0)
    return null;

  const ruleGroups = groupBy(rules, "name");
  const keys = Object.keys(ruleGroups);
  // Sort rules alphabetically
  keys.sort((a, b) => a.localeCompare(b));

  return (
    <>
      {keys.map((key, index) => {
        const group: ISpecialRule[] = ruleGroups[key];
        const rule = group[0];
        const rating = (rule.rating == null || rule.rating == "") ? null : key === "Psychic"

          // Take Highest
          ? Math.max(...group.map(rule => parseInt(rule.rating)))
          // Sum all occurrences
          : group.reduce((total, next) => next.rating ? total + parseInt(next.rating) : total, 0);

        // Rules with ratings do not show multiple instances
        const count = rating > 0 ? 0 : group.length;

        //console.log(rule)
        const ruleDefinition = ruleDefinitions
          .find(r => normalizeRuleName(r.name) === normalizeRuleName(rule.name));
        return (
          <Fragment key={index}>
            {index > 0 ? <span className="mr-1">, </span> : null}
            <RuleItem
              label={(count > 1 ? `${count}x ` : "") + RulesService.displayName({ ...rule, rating: rule.rating ? rating.toString() : null })}
              description={ruleDefinition?.description || (gameRules.length === 0 ? "Chargement de la description..." : "Description non disponible pour ce mot cle.")} />
          </Fragment>
        );
      })}
    </>
  );
}
