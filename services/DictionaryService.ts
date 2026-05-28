const dictionaryUrl = "/api/dictionary";

const stripDictionaryTags = (text: string) => text
  ?.replace(/<\/?key>/gi, "")
  .trim();

export default class DictionaryService {
  private static rulesPromise = null;

  public static getRules() {
    if (!this.rulesPromise) {
      this.rulesPromise = fetch(dictionaryUrl)
        .then(res => res.json())
        .then(dictionary => this.dictionaryRulesToGameRules(dictionary));
    }

    return this.rulesPromise;
  }

  private static dictionaryRulesToGameRules(dictionary) {
    const rulesByLanguage = [
      dictionary?.commonRules?.fr,
      dictionary?.commonRules?.en,
    ].filter(Boolean);

    return rulesByLanguage.flatMap(rules =>
      Object.keys(rules).flatMap(key => {
        const rule = rules[key];
        const descriptions = (rule.description || [])
          .map(description => stripDictionaryTags(description.text))
          .filter(Boolean);
        const description = descriptions.join(" - ");
        const title = rule.title || key;

        return [
          {
            name: title,
            description,
            options: []
          },
          title === key ? null : {
            name: key,
            description,
            options: []
          }
        ].filter(Boolean);
      })
    );
  }
}
