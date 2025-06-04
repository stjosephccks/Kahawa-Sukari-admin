const DocumentParser = require('./documentParser');
const fs = require('fs');
const path = require('path');

describe('DocumentParser Template Extraction', () => {
  it('should extract all fields from a typical parish bulletin', async () => {
    // Simulate extracted text from the screenshot (as if from mammoth.extractRawText)
    const sampleText = `
GENERAL ANNOUNCEMENTS

SIXTH SUNDAY OF EASTER
25/05/2025
TIME        TODAY'S GROUPS         NEXT WEEK'S GROUP
7:30 AM     ST ANN                 ST AMBROSE
9:00 AM     CMA                    PMC
10:30 AM    ST MARY                ST BENEDICT
12 NOON     ST PETER               ST PAUL
WENDANI 9:30 AM  ST CATHERINE      ST DOMINIC

NEXT WEEK'S DETAILS
OCCASION: PENTECOST
MASS ANIMATION:- we thank the Jumuiya that has animated this............

1. The second marriage preparation course will start on 8th of June in the former social office of the parish. All interested couples are invited to register by Sunday 8th of June with the catechist or the parish secretary. For more information, please see the notice board.

2. His Grace Archbishop Philip Anyolo invites representatives of all parishes to a dinner on Friday 30th May in support of the beautification process of the servant of God Maurice Michael Cardinal Otunga at Consolata Shrine. We are making an appeal to each Jumuiya and ecclesial groups to make a contribution of a minimum of Kshs 3,000 towards this.

3. Jumuiya officials are requested to make payments of the registered pilgrims towards the Subukia pilgrimage for logistic purposes.

4. Registrations and catechesis of adult catechumen is ongoing with the catechists.

MARRIAGE  BANN (I)
GROOM : WILSON KIMANI KAMAU
S/o  DAVID KARIUKI RITWA & FRIDA WAITHIRA KAMAU
INTENDS TO CELEBRATE THE SACRAMENT OF MATRIMONY WITH
BRIDE: ELIZABETH WAMBUI NDUNGU
D/o  NDUNG'U MUBIA MAHIUHA & VERONICA WANGUI NDUNGU
ON SATURDAY 10TH JULY 2025 AT ST FRANCIS OF ASSISI MWIHOKO PARISH
`;
    
    // Directly test the structured data extraction
    const data = DocumentParser.extractStructuredData(sampleText);
    expect(data.liturgicalSeason).toBe('SIXTH SUNDAY OF EASTER');
    expect(data.documentDate.toISOString()).toBe('2025-05-25T00:00:00.000Z');
    expect(data.currentWeekMass).toEqual([
      { time: '7:30 AM', group: 'ST ANN' },
      { time: '9:00 AM', group: 'CMA' },
      { time: '10:30 AM', group: 'ST MARY' },
      { time: '12:00 NOON', group: 'ST PETER' },
      { time: '9:30 AM WENDANI', group: 'ST CATHERINE' }
    ]);
    expect(data.nextWeekMasses).toEqual([
      { time: '7:30 AM', group: 'ST AMBROSE' },
      { time: '9:00 AM', group: 'PMC' },
      { time: '10:30 AM', group: 'ST BENEDICT' },
      { time: '12:00 NOON', group: 'ST PAUL' },
      { time: '9:30 AM WENDANI', group: 'ST DOMINIC' }
    ]);
    expect(data.massAnimation.toLowerCase()).toContain('jumuiya');
    expect(data.nextWeekOccasion).toBe(''); // Not present in this sample
    expect(data.occasion).toBe('PENTECOST');
    expect(data.announcements.length).toBe(4);
    expect(data.announcements[0].title).toMatch(/marriage preparation/i);
    expect(data.announcements[1].title).toMatch(/beatification/i);
    expect(data.announcements[2].title).toMatch(/subukia/i);
    expect(data.announcements[3].title).toMatch(/catechumen/i);
    expect(data.matrimonyNotices.length).toBe(1);
    expect(data.matrimonyNotices[0].groomName).toMatch(/WILSON KIMANI KAMAU/);
    expect(data.matrimonyNotices[0].brideName).toMatch(/ELIZABETH WAMBUI NDUNGU/);
    expect(data.matrimonyNotices[0].weddingDate instanceof Date).toBe(true);
    expect(data.matrimonyNotices[0].venue).toMatch(/ST FRANCIS OF ASSISI MWIHOKO PARISH/);
  });
});




// let currentNotice = null;
    
// for (let i = 0; i < lines.length; i++) {
//   const line = lines[i].trim();
  
//   if (this.isMatrimonyStart(line)) {
//     // Save previous notice if complete
//     if (currentNotice && this.isNoticeComplete(currentNotice)) {
//       data.matrimonyNotices.push(currentNotice);
//     }
    
//     // Start new notice
//     if (line.match(/^GROOM\s*:/i)) {
//       currentNotice = {
//         groomName: line.replace(/^GROOM\s*:/i, '').trim()
//       };
//     }
//     continue;
//   }
  
//   if (currentNotice) {
//     if (!currentNotice.groomParents && line.match(/^S\/o/i)) {
//       currentNotice.groomParents = line.replace(/^S\/o/i, '').trim();
//     } 
//     else if (!currentNotice.brideName && line.match(/^BRIDE\s*:/i)) {
//       currentNotice.brideName = line.replace(/^BRIDE\s*:/i, '').trim();
//     }
//     else if (!currentNotice.brideParents && line.match(/^D\/o/i)) {
//       currentNotice.brideParents = line.replace(/^D\/o/i, '').trim();
//     }
//     else if (line.match(/ON\s+\w+DAY\s+\d{1,2}/i) || line.match(/ON\s+\d{1,2}/i)) {
//       const dateMatch = line.match(/ON\s+(?:\w+DAY\s+)?(\d{1,2})(?:ST|ND|RD|TH)?\s+([A-Z]+)\s+(\d{4})/i);
//       if (dateMatch) {
//         currentNotice.weddingDate = new Date(
//           parseInt(dateMatch[3]),
//           this.monthNameToNumber(dateMatch[2]),
//           parseInt(dateMatch[1])
//         );
//       }
      
//       const venueMatch = line.match(/AT\s+(.+)$/i);
//       if (venueMatch) currentNotice.venue = venueMatch[1].trim();
//     }
//   }
// }

// // Save any remaining notice
// if (currentNotice && this.isNoticeComplete(currentNotice)) {
//   data.matrimonyNotices.push(currentNotice);
// }
// }