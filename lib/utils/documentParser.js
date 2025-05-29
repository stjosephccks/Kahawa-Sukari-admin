// Enhanced Church Document Parser (utils/documentParser.js)
const mammoth = require('mammoth');
const fs = require('fs');

class ChurchDocumentParser {
  static async parseDocx(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      
      return this.extractStructuredData(text);
    } catch (error) {
      throw new Error(`Document parsing failed: ${error.message}`);
    }
  }
  
  static extractStructuredData(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    const data = {
      liturgicalSeason: '',
      documentDate: null,
      currentWeekMasses: [],
      nextWeekMasses: [],
      nextWeekOccasion: '',
      nextWeekDate: null,
      announcements: [],
      matrimonyNotices: []
    };
    
    // Extract liturgical season - comprehensive patterns for church calendar
    const seasonPatterns = [
      // Ordinary Time Sundays
      /(\d+(?:ST|ND|RD|TH)?\s+SUNDAY\s+(?:IN|OF)\s+ORDINARY\s+TIME)/i,
      /(\d+(?:ST|ND|RD|TH)?\s+SUNDAY\s+AFTER\s+PENTECOST)/i,
      /(\d+(?:ST|ND|RD|TH)?\s+SUNDAY\s+AFTER\s+EPIPHANY)/i,
      
      // Easter Season
      /(EASTER\s+SUNDAY|RESURRECTION\s+OF\s+THE\s+LORD)/i,
      /(\d+(?:ST|ND|RD|TH)?\s+SUNDAY\s+OF\s+EASTER)/i,
      /(ASCENSION\s+OF\s+THE\s+LORD|ASCENSION\s+THURSDAY)/i,
      /(PENTECOST\s+SUNDAY|WHIT\s+SUNDAY)/i,
      /(DIVINE\s+MERCY\s+SUNDAY)/i,
      
      // Advent and Christmas
      /(\d+(?:ST|ND|RD|TH)?\s+SUNDAY\s+OF\s+ADVENT)/i,
      /(CHRISTMAS\s+(?:DAY|EVE)|NATIVITY\s+OF\s+THE\s+LORD)/i,
      /(HOLY\s+FAMILY|FEAST\s+OF\s+THE\s+HOLY\s+FAMILY)/i,
      /(MARY\s+MOTHER\s+OF\s+GOD|SOLEMNITY\s+OF\s+MARY)/i,
      /(EPIPHANY\s+OF\s+THE\s+LORD|MANIFESTATION\s+OF\s+THE\s+LORD)/i,
      /(BAPTISM\s+OF\s+THE\s+LORD)/i,
      
      // Lent and Holy Week
      /(ASH\s+WEDNESDAY|BEGINNING\s+OF\s+LENT)/i,
      /(\d+(?:ST|ND|RD|TH)?\s+SUNDAY\s+(?:IN|OF)\s+LENT)/i,
      /(PALM\s+SUNDAY|PASSION\s+SUNDAY)/i,
      /(HOLY\s+THURSDAY|MAUNDY\s+THURSDAY)/i,
      /(GOOD\s+FRIDAY|PASSION\s+OF\s+THE\s+LORD)/i,
      /(HOLY\s+SATURDAY|EASTER\s+VIGIL)/i,
      
      // Major Feasts and Solemnities
      /(TRINITY\s+SUNDAY|SOLEMNITY\s+OF\s+THE\s+TRINITY)/i,
      /(CORPUS\s+CHRISTI|BODY\s+AND\s+BLOOD\s+OF\s+CHRIST)/i,
      /(SACRED\s+HEART\s+OF\s+JESUS)/i,
      /(IMMACULATE\s+HEART\s+OF\s+MARY)/i,
      /(ASSUMPTION\s+OF\s+MARY|ASSUMPTION\s+OF\s+THE\s+BLESSED\s+VIRGIN)/i,
      /(IMMACULATE\s+CONCEPTION)/i,
      /(ALL\s+SAINTS\s+DAY|SOLEMNITY\s+OF\s+ALL\s+SAINTS)/i,
      /(ALL\s+SOULS\s+DAY|COMMEMORATION\s+OF\s+ALL\s+FAITHFUL\s+DEPARTED)/i,
      /(CHRIST\s+THE\s+KING|SOLEMNITY\s+OF\s+CHRIST\s+THE\s+KING)/i,
      
      // Marian Feasts
      /(ANNUNCIATION\s+OF\s+THE\s+LORD|ANNUNCIATION\s+TO\s+MARY)/i,
      /(VISITATION\s+OF\s+MARY)/i,
      /(PRESENTATION\s+OF\s+THE\s+LORD|CANDLEMAS)/i,
      /(OUR\s+LADY\s+OF\s+[A-Z\s]+)/i,
      
      // Saints' Days (Common patterns)
      /(ST\.?\s+[A-Z\s]+(?:DAY|FEAST))/i,
      /(SAINT\s+[A-Z\s]+(?:DAY|FEAST))/i,
      /(FEAST\s+OF\s+ST\.?\s+[A-Z\s]+)/i,
      /(BLESSED\s+[A-Z\s]+)/i,
      
      // Special Observances
      /(WORLD\s+DAY\s+OF\s+[A-Z\s]+)/i,
      /(VOCATIONS\s+SUNDAY|GOOD\s+SHEPHERD\s+SUNDAY)/i,
      /(MISSION\s+SUNDAY|WORLD\s+MISSION\s+DAY)/i,
      /(YOUTH\s+SUNDAY|CATECHETICAL\s+SUNDAY)/i,
      
      // Generic patterns for any feast
      /(FEAST\s+OF\s+[A-Z\s]+)/i,
      /(SOLEMNITY\s+OF\s+[A-Z\s]+)/i,
      /(MEMORIAL\s+OF\s+[A-Z\s]+)/i
    ];
    
    for (const pattern of seasonPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.liturgicalSeason = match[1].trim();
        break;
      }
    }
    
    // Extract date (multiple formats)
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/,  // DD/MM/YYYY or D/M/YYYY
      /(\d{1,2}\/\d{1,2}\/\d{2})/,  // DD/MM/YY
      /(\d{1,2}[-\.]\d{1,2}[-\.]\d{4})/,  // DD-MM-YYYY or DD.MM.YYYY
      /(\d{1,2}(?:st|nd|rd|th)?\s+[A-Z]+\s+\d{4})/i  // 25th May 2025
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.documentDate = this.parseDate(match[1]);
        break;
      }
    }
    
    // Extract mass schedules
    this.extractMassSchedules(text, data);
    
    // Extract announcements
    this.extractAnnouncements(text, data);
    
    // Extract matrimony notices
    this.extractMatrimonyNotices(text, data);
    
    return data;
  }
  
  static extractMassSchedules(text, data) {
    // Look for mass times in format like "7:30 AM", "12:00 NOON", "WENDANI 9:30 AM"
    const massTimePattern = /(\d{1,2}:\d{2}\s*(?:AM|NOON)|WENDANI\s*\d{1,2}:\d{2}\s*AM)/gi;
    const times = text.match(massTimePattern) || [];
    
    // Look for group names between ** markers
    const groupPattern = /\*\*(ST\s+[A-Z\s]+|CMA|PMC)\*\*/gi;
    const groups = text.match(groupPattern) || [];
    
    // Clean up the groups by removing asterisks
    const cleanGroups = groups.map(group => group.replace(/\*\*/g, '').trim());
    
    // Extract current week masses (TODAY section)
    const todayIndex = text.indexOf('TODAY');
    const nextSundayIndex = text.indexOf('NEXT SUNDAY');
    
    if (todayIndex !== -1 && nextSundayIndex !== -1) {
      const todaySection = text.substring(todayIndex, nextSundayIndex);
      const todayGroups = todaySection.match(groupPattern) || [];
      const todayTimes = todaySection.match(massTimePattern) || [];
      
      for (let i = 0; i < Math.min(todayTimes.length, todayGroups.length); i++) {
        data.currentWeekMasses.push({
          time: todayTimes[i].trim(),
          group: todayGroups[i].replace(/\*\*/g, '').trim()
        });
      }
      
      // Extract next week masses
      const nextSundaySection = text.substring(nextSundayIndex);
      const nextGroups = nextSundaySection.match(groupPattern) || [];
      const nextTimes = nextSundaySection.match(massTimePattern) || [];
      
      for (let i = 0; i < Math.min(nextTimes.length, nextGroups.length); i++) {
        data.nextWeekMasses.push({
          time: nextTimes[i].trim(),
          group: nextGroups[i].replace(/\*\*/g, '').trim()
        });
      }
    }
    
    // Extract next week occasion and date
    const nextWeekMatch = text.match(/NEXT SUNDAY\s+(\d{2}\/\d{2}\/\d{2})\s+(.*?)(?=\*\*|\n)/i);
    if (nextWeekMatch) {
      const [, dateStr, occasion] = nextWeekMatch;
      data.nextWeekOccasion = occasion.trim();
      
      // Parse date (assuming DD/MM/YY format, convert to full year)
      const [day, month, year] = dateStr.split('/');
      const fullYear = year.length === 2 ? (parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year)) : parseInt(year);
      data.nextWeekDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
    }
    
    // Alternative pattern for "THE ASCENSION OF THE LORD"
    const ascensionMatch = text.match(/THE ASCENSION OF THE LORD/i);
    if (ascensionMatch && !data.nextWeekOccasion) {
      data.nextWeekOccasion = 'THE ASCENSION OF THE LORD';
    }
  }
  
  static extractAnnouncements(text, data) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    let currentAnnouncement = null;
    let inAnnouncementSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Start capturing announcements after mass schedules
      if (line.includes('MASS ANIMATION') || /^\d+\./.test(line)) {
        inAnnouncementSection = true;
      }
      
      // Skip matrimony section
      if (this.isMatrimonySection(line)) {
        inAnnouncementSection = false;
        break;
      }
      
      if (inAnnouncementSection && /^\d+\./.test(line)) {
        // Save previous announcement
        if (currentAnnouncement) {
          data.announcements.push(currentAnnouncement);
        }
        
        // Start new announcement
        currentAnnouncement = {
          title: this.extractTitle(line),
          content: line.replace(/^\d+\.\s*/, '').trim(),
          priority: this.determinePriority(line)
        };
      } else if (currentAnnouncement && inAnnouncementSection && line.length > 0 && !line.startsWith('**')) {
        // Continue current announcement
        currentAnnouncement.content += ' ' + line;
      }
    }
    
    // Add the last announcement
    if (currentAnnouncement) {
      data.announcements.push(currentAnnouncement);
    }
  }
  
  static isMatrimonySection(line) {
    return /^[A-Z\s]+KAMAU$|^[A-Z\s]+NDUNGU$|INTENDS TO CELEBRATE|SACRAMENT OF MATRIMONY/i.test(line);
  }
  
  static extractTitle(text) {
    const titlePatterns = [
      // Marriage and Family
      { pattern: /marriage preparation|pre.*marriage|matrimony.*course|couples.*preparation/i, title: "Marriage Preparation Course" },
      { pattern: /wedding.*preparation|bridal.*preparation|marriage.*counseling/i, title: "Wedding Preparation" },
      { pattern: /family.*life|marriage.*enrichment|couples.*retreat/i, title: "Family Life Program" },
      
      // Sacraments and Religious Education
      { pattern: /adult.*catechumen|adult.*baptism|rcia|adult.*confirmation/i, title: "Adult Catechumen Registration" },
      { pattern: /first.*communion|holy.*communion|communion.*class/i, title: "First Holy Communion" },
      { pattern: /confirmation.*class|confirmation.*preparation|chrism.*mass/i, title: "Confirmation Preparation" },
      { pattern: /baptism.*preparation|infant.*baptism|child.*baptism/i, title: "Baptism Preparation" },
      
      // Pilgrimages and Spiritual Journeys
      { pattern: /subukia.*pilgrimage|subukia.*shrine/i, title: "Subukia Pilgrimage" },
      { pattern: /holy.*land.*pilgrimage|jerusalem.*pilgrimage|israel.*pilgrimage/i, title: "Holy Land Pilgrimage" },
      { pattern: /fatima.*pilgrimage|lourdes.*pilgrimage|medjugorje.*pilgrimage/i, title: "International Pilgrimage" },
      { pattern: /kibeho.*pilgrimage|kibeho.*shrine/i, title: "Kibeho Pilgrimage" },
      { pattern: /pilgrimage|shrine.*visit|spiritual.*journey/i, title: "Pilgrimage" },
      
      // Saints and Beatification
      { pattern: /beautification.*cardinal.*otunga|cardinal.*otunga.*beautification/i, title: "Cardinal Otunga Beautification Process" },
      { pattern: /beautification.*process|beatification.*process|canonization/i, title: "Beatification Process" },
      { pattern: /blessed.*bakanja|blessed.*isidore|saint.*charles/i, title: "Saints Commemoration" },
      
      // Parish Activities and Groups
      { pattern: /mass.*animation|animation.*appreciation|animating.*group/i, title: "Mass Animation Appreciation" },
      { pattern: /choir.*practice|music.*ministry|singing.*group/i, title: "Choir and Music Ministry" },
      { pattern: /youth.*group|youth.*meeting|young.*adults/i, title: "Youth Ministry" },
      { pattern: /women.*group|mothers.*union|ladies.*group/i, title: "Women's Ministry" },
      { pattern: /men.*group|fathers.*union|gentlemen.*group/i, title: "Men's Ministry" },
      { pattern: /children.*ministry|sunday.*school|kids.*program/i, title: "Children's Ministry" },
      
      // Fundraising and Contributions
      { pattern: /harambee|fundraising|fund.*raising|contribution.*drive/i, title: "Fundraising Activity" },
      { pattern: /building.*fund|construction.*project|church.*development/i, title: "Building Fund" },
      { pattern: /tithing|tithe|offering|collection/i, title: "Tithing and Offerings" },
      { pattern: /school.*fees|education.*fund|bursary|scholarship/i, title: "Education Support" },
      
      // Special Events and Celebrations
      { pattern: /parish.*feast|patron.*saint|parish.*day/i, title: "Parish Feast Day" },
      { pattern: /harvest.*thanksgiving|thanksgiving.*service|harvest.*festival/i, title: "Harvest Thanksgiving" },
      { pattern: /christmas.*celebration|easter.*celebration|pentecost.*celebration/i, title: "Liturgical Celebration" },
      { pattern: /ordination|priestly.*ordination|diaconate.*ordination/i, title: "Ordination Ceremony" },
      
      // Community Outreach
      { pattern: /charity.*work|community.*service|outreach.*program/i, title: "Community Outreach" },
      { pattern: /feeding.*program|food.*drive|soup.*kitchen/i, title: "Feeding Program" },
      { pattern: /medical.*camp|health.*screening|medical.*outreach/i, title: "Medical Outreach" },
      { pattern: /prison.*ministry|hospital.*ministry|sick.*visitation/i, title: "Pastoral Visitation" },
      
      // Training and Workshops
      { pattern: /leadership.*training|leadership.*workshop|capacity.*building/i, title: "Leadership Training" },
      { pattern: /bible.*study|scripture.*study|theological.*training/i, title: "Bible Study" },
      { pattern: /workshop|seminar|training.*session|capacity.*building/i, title: "Training Workshop" },
      
      // Administrative and General
      { pattern: /parish.*meeting|pastoral.*council|finance.*committee/i, title: "Parish Meeting" },
      { pattern: /registration|enrollment|sign.*up|joining/i, title: "Registration" },
      { pattern: /announcement|notice|information|update/i, title: "General Announcement" },
      { pattern: /deadline|due.*date|last.*call|final.*notice/i, title: "Important Deadline" },
      { pattern: /thanks|gratitude|appreciation|acknowledgment/i, title: "Appreciation Notice" }
    ];
    
    for (const { pattern, title } of titlePatterns) {
      if (pattern.test(text)) return title;
    }
    
    // Try to extract a meaningful title from the first few words
    const firstWords = text.replace(/^\d+\.\s*/, '').split(' ').slice(0, 4).join(' ');
    if (firstWords.length > 5) {
      return firstWords.charAt(0).toUpperCase() + firstWords.slice(1).toLowerCase();
    }
    
    return "General Announcement";
  }
  
  static determinePriority(text) {
    if (/urgent|important|deadline|register by/i.test(text)) return 'high';
    if (/contribution|payment|register|appeal/i.test(text)) return 'medium';
    return 'low';
  }
  
  static extractMatrimonyNotices(text, data) {
    // Look for matrimony patterns in the document - make it more flexible
    const matrimonySection = this.findMatrimonySection(text);
    
    if (!matrimonySection) return;
    
    // More flexible patterns for names (handle different surnames)
    const groomPatterns = [
      /([A-Z\s]+(?:KAMAU|MWANGI|KIPROTICH|OCHIENG|WANJIKU|MUTUA|KIPCHOGE|KARIUKI|NJOROGE|MACHARIA))\s*S\/o\s*([A-Z\s&]+)/i,
      /([A-Z\s]+)\s*S\/o\s*([A-Z\s&]+)/i  // Generic pattern
    ];
    
    const bridePatterns = [
      /([A-Z\s]+(?:NDUNGU|WANJIKU|ACHIENG|WAMBUI|NJERI|WAIRIMU|WANJIRU|NYAMBURA|MUTHONI|GATHONI))\s*D\/o\s*([A-Z\s&]+)/i,
      /([A-Z\s]+)\s*D\/o\s*([A-Z\s&]+)/i  // Generic pattern
    ];
    
    let groomMatch = null;
    let brideMatch = null;
    
    // Try to find groom
    for (const pattern of groomPatterns) {
      groomMatch = matrimonySection.match(pattern);
      if (groomMatch) break;
    }
    
    // Try to find bride
    for (const pattern of bridePatterns) {
      brideMatch = matrimonySection.match(pattern);
      if (brideMatch) break;
    }
    
    // More flexible date and venue patterns
    const dateVenuePatterns = [
      /ON\s+(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s+(\d+)(?:TH|ST|ND|RD)?\s+([A-Z]+)\s+(\d{4})\s+AT\s+([A-Z\s]+(?:PARISH|CHURCH|CATHEDRAL|CHAPEL))/i,
      /(\d+)(?:TH|ST|ND|RD)?\s+([A-Z]+)\s+(\d{4})\s+AT\s+([A-Z\s]+(?:PARISH|CHURCH|CATHEDRAL|CHAPEL))/i,
      /AT\s+([A-Z\s]+(?:PARISH|CHURCH|CATHEDRAL|CHAPEL))/i  // Just venue
    ];
    
    let dateVenueMatch = null;
    for (const pattern of dateVenuePatterns) {
      dateVenueMatch = matrimonySection.match(pattern);
      if (dateVenueMatch) break;
    }
    
    if (groomMatch && brideMatch) {
      const matrimony = {
        groomName: groomMatch[1].trim(),
        groomParents: groomMatch[2].trim(),
        brideName: brideMatch[1].trim(),
        brideParents: brideMatch[2].trim(),
        venue: ''
      };
      
      // Handle different date-venue match patterns
      if (dateVenueMatch) {
        if (dateVenueMatch.length === 6) {
          // Full pattern with day of week
          const [, dayOfWeek, day, month, year, venue] = dateVenueMatch;
          matrimony.weddingDate = new Date(
            parseInt(year), 
            this.monthNameToNumber(month), 
            parseInt(day)
          );
          matrimony.venue = venue.trim();
        } else if (dateVenueMatch.length === 5) {
          // Pattern without day of week
          const [, day, month, year, venue] = dateVenueMatch;
          matrimony.weddingDate = new Date(
            parseInt(year), 
            this.monthNameToNumber(month), 
            parseInt(day)
          );
          matrimony.venue = venue.trim();
        } else if (dateVenueMatch.length === 2) {
          // Just venue
          matrimony.venue = dateVenueMatch[1].trim();
        }
      }
      
      data.matrimonyNotices.push(matrimony);
    }
  }
  
  static findMatrimonySection(text) {
    // More flexible patterns for finding matrimony sections
    const startPatterns = [
      /[A-Z\s]+(?:KAMAU|MWANGI|KIPROTICH|OCHIENG|MUTUA|KIPCHOGE|KARIUKI|NJOROGE|MACHARIA).*S\/o/i,
      /INTENDS TO CELEBRATE.*SACRAMENT OF MATRIMONY/i,
      /SACRAMENT OF MATRIMONY/i,
      /MARRIAGE BANNS/i,
      /WEDDING ANNOUNCEMENT/i
    ];
    
    let startIndex = -1;
    let endIndex = text.length;
    
    // Find start of matrimony section
    for (const pattern of startPatterns) {
      const match = text.search(pattern);
      if (match !== -1) {
        startIndex = match;
        break;
      }
    }
    
    if (startIndex === -1) return null;
    
    // Find end of matrimony section - look for parish/church or end of document
    const afterStart = text.substring(startIndex);
    const endPatterns = [
      /(?:PARISH|CHURCH|CATHEDRAL|CHAPEL)\s*$/mi,
      /(?:PARISH|CHURCH|CATHEDRAL|CHAPEL)[^A-Z]*$/mi,
      /^\s*$/m // Empty line
    ];
    
    for (const pattern of endPatterns) {
      const match = afterStart.search(pattern);
      if (match !== -1) {
        const matchEnd = afterStart.match(pattern);
        endIndex = startIndex + match + (matchEnd ? matchEnd[0].length : 0);
        break;
      }
    }
    
    return text.substring(startIndex, endIndex);
  }
  
  // Add a helper method to parse different date formats
  static parseDate(dateStr) {
    // Handle different date formats
    if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (/\d{1,2}\/\d{1,2}\/\d{2}/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      const fullYear = parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year);
      return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    } else if (/\d{1,2}[-\.]\d{1,2}[-\.]\d{4}/.test(dateStr)) {
      const parts = dateStr.split(/[-\.]/);
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    } else if (/\d{1,2}(?:st|nd|rd|th)?\s+[A-Z]+\s+\d{4}/i.test(dateStr)) {
      // Handle "25th May 2025" format
      const match = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Z]+)\s+(\d{4})/i);
      if (match) {
        const [, day, month, year] = match;
        return new Date(parseInt(year), this.monthNameToNumber(month), parseInt(day));
      }
    }
    
    return null;
  }
  
  static monthNameToNumber(monthName) {
    const months = {
      'JANUARY': 0, 'FEBRUARY': 1, 'MARCH': 2, 'APRIL': 3,
      'MAY': 4, 'JUNE': 5, 'JULY': 6, 'AUGUST': 7,
      'SEPTEMBER': 8, 'OCTOBER': 9, 'NOVEMBER': 10, 'DECEMBER': 11
    };
    return months[monthName.toUpperCase()] || 0;
  }
  
  // Additional helper method to clean up extracted text
  static cleanText(text) {
    return text
      .replace(/\*\*/g, '') // Remove markdown bold markers
      .replace(/\[.*?\]/g, '') // Remove square brackets and content
      .replace(/\{.*?\}/g, '') // Remove curly brackets and content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}

module.exports = ChurchDocumentParser;