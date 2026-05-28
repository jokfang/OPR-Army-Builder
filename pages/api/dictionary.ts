import type { NextApiRequest, NextApiResponse } from "next";

const dictionaryUrl = "https://johammer.netlify.app/api/dictionary";

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch(dictionaryUrl);

    if (!response.ok) {
      res.status(response.status).json({ error: "Failed to load dictionary" });
      return;
    }

    const dictionary = await response.json();

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json(dictionary);
  } catch (err) {
    console.error("Failed to proxy dictionary:", err);
    res.status(500).json({ error: "Failed to load dictionary" });
  }
}
