import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    const { data: html } = await axios.get('https://universalis.com/mass.htm');
    const $ = cheerio.load(html);

    const title = $('h2').first().text().trim();
    const rawText = $('body').text();

    const readingLabels = [
      'First reading',
      'Responsorial Psalm',
      'Gospel Acclamation',
      'Gospel'
    ];

    const readings = [];
    for (let i = 0; i < readingLabels.length; i++) {
      const label = readingLabels[i];
      const nextLabel = readingLabels[i + 1] || 'Christian Art';

      const regex = new RegExp(`${label}[\\s\\S]*?(?=${nextLabel})`, 'i');
      const match = rawText.match(regex);

      if (match) {
        const cleaned = match[0].replace(/\s+/g, ' ').trim();
        readings.push({
          title: label,
          text: cleaned.replace(label, '').trim()
        });
      }
    }

    if (readings.length === 0) {
      throw new Error("No readings found.");
    }

    res.status(200).json({
      title,
      readings,
      link: 'https://universalis.com/mass.htm'
    });

  } catch (err) {
    console.error("Scraping error:", err);
    res.status(500).json({ error: "Failed to load daily readings" });
  }
}
