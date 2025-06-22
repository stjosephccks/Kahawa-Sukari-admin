import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    const url = 'https://bible.usccb.org/daily-bible-reading';
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    const date = $('h2.date-display-single').first().text().trim();
    // The page title is "Daily Bible Reading - June 22, 2025 | USCCB"
    // If you want just "Daily Readings", you might extract it from `h1.title-page` instead.
    const title = $('h1.title-page').text().trim(); // Changed to get "Daily Readings"

    const allowed = [
      'Reading I',
      'Responsorial Psalm',
      'Reading II',
      'Alleluia',
      'Gospel',
      // Added 'Sequence' as it appears in your provided HTML
      'Sequence'
    ];

    const readings = [];

    // Find each 'b-verse' block, as this seems to encapsulate a single reading
    $('.wr-block.b-verse').each((_, verseBlock) => {
      const $verseBlock = $(verseBlock); // Create a Cheerio object for the current verse block

      // Get the reading type from the h3.name within this block
      const headingText = $verseBlock.find('h3.name').text().trim();
      const readingType = allowed.find(label => headingText.includes(label));

      if (readingType) {
        let citation = '';
        let fullText = '';

        // Extract citation from the 'div.address a' within the current verse block
        const citationElement = $verseBlock.find('div.address a').first();
        if (citationElement.length) {
          citation = citationElement.text().trim();
        }

        // Extract the full text from 'div.content-body' within the current verse block
        const contentBody = $verseBlock.find('div.content-body').first();
        if (contentBody.length) {
          // Get all text content from within the 'content-body' div,
          // including nested p and span tags.
          // .text() method on a parent element will concatenate all descendant text.
          fullText = contentBody.text().trim();
        }

        readings.push({
          title: readingType,
          citation,
          text: fullText.replace(/\s+/g, ' ').trim() // Clean up extra whitespace
        });
      }
    });

    if (!readings.length) {
      throw new Error('No valid readings found on the page.');
    }

    res.status(200).json({
      source: url,
      date,
      title,
      readings
    });
  } catch (err) {
    console.error('USCCB Scraping Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch readings.' });
  }
}