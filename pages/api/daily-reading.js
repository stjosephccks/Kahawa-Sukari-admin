import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    const { data: html } = await axios.get('https://universalis.com/mass.htm');
    const $ = cheerio.load(html);

    const title = $('h2').first().text().trim();
    let rawText = $('body').text();

    const continueIndex = rawText.indexOf('Continue');
    if (continueIndex !== -1) {
      rawText = rawText.slice(0, continueIndex);
    }

    const readingLabels = [
      'First reading',
      'Responsorial Psalm',
      'Second reading',
      'Gospel Acclamation',
      'Gospel'
    ];

    const readings = {};
    for (let i = 0; i < readingLabels.length; i++) {
      const label = readingLabels[i];
      const nextLabel = readingLabels[i + 1] || '$END$';

      const regex = new RegExp(`${label}:?[\\s\\S]*?(?=${nextLabel === '$END$' ? '$' : nextLabel})`, 'i');
      const match = rawText.match(regex);

      if (match) {
        let cleaned = match[0]
          .replace(/\s+/g, ' ')
          .trim()
          .replace(new RegExp(`^${label}:?\\s*`, 'i'), '');

        readings[label] = cleaned;
      }
    }

    if (readings['Gospel Acclamation'] && readings['Gospel']) {
      const acclamationClean = readings['Gospel Acclamation'].replace(/\s+/g, ' ').trim();
      readings['Gospel'] = readings['Gospel'].replace(acclamationClean, '').trim();
    }

    const formattedReadings = Object.entries(readings).map(([title, text]) => ({
      title,
      text,
    }));

    if (formattedReadings.length === 0) {
      throw new Error("No readings found.");
    }

    res.status(200).json({
      title,
      readings: formattedReadings,
      link: 'https://universalis.com/mass.htm',
    });

  } catch (err) {
    console.error("Scraping error:", err.message);
    res.status(500).json({ error: "Failed to load daily readings" });
  }
}
