import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    const url = 'https://bible.usccb.org/daily-bible-reading';
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    const date = $('h2.date-display-single').first().text().trim();
    const title = $('h1.title-page').text().trim(); 

    const allowed = [
      'Reading I',
      'Responsorial Psalm',
      'Reading II',
      'Alleluia',
      'Gospel',
      'Sequence'
    ];

    const readings = [];

    $('.wr-block.b-verse').each((_, verseBlock) => {
      const $verseBlock = $(verseBlock); 

      const headingText = $verseBlock.find('h3.name').text().trim();
      const readingType = allowed.find(label => headingText.includes(label));

      if (readingType) {
        let citation = '';
        let fullText = '';

        const citationElement = $verseBlock.find('div.address a').first();
        if (citationElement.length) {
          citation = citationElement.text().trim();
        }
        const contentBody = $verseBlock.find('div.content-body').first();
        if (contentBody.length) {
          
          fullText = contentBody.text().trim();
        }

        readings.push({
          title: readingType,
          citation,
          text: fullText.replace(/\s+/g, ' ').trim() 
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