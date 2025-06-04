const mammoth = require('mammoth');

class DocumentParser {
  static async parseDocx(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      const data = this.extractStructuredData(text, true); // Enable debug
      return data;
    } catch (error) {
      throw new Error(`Document parsing failed: ${error.message}`);
    }
  }

  static extractStructuredData(text, debug = false) {
    // Normalize line endings and clean text
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let lines = text.split('\n')
      .map(line => this.cleanText(line))
      .filter(line => line.trim().length > 0);

    if (debug) {
      console.log('--- CLEANED LINES ---');
      lines.forEach((line, idx) => console.log(`${idx}: ${line}`));
    }

    const data = {
      liturgicalSeason: this.extractLiturgicalSeason(lines),
      documentDate: this.extractDocumentDate(lines),
      massAnimation: '',
      currentWeekMass: [],
      nextWeekMasses: [],
      nextWeekOccasion: '',
      occasion: '',
      announcements: [],
      matrimonyNotices: []
    };

    // Extract occasion
    const occasionLine = lines.find(line => line.match(/^OCCASION:/i));
    if (occasionLine) {
      const occasionMatch = occasionLine.match(/OCCASION:\s*(.+)/i);
      if (occasionMatch) data.occasion = occasionMatch[1].trim();
    }

    // Extract mass schedules
    this.extractMassSchedules(lines, data, debug);

    // Extract announcements
    this.extractAnnouncements(lines, data, debug);

    // Extract matrimony notices
    this.extractMatrimonyNotices(lines, data);

    if (debug) {
      console.log('--- PARSED DATA ---');
      console.log(JSON.stringify(data, null, 2));
    }

    return data;
  }

  static extractMassSchedules(lines, data, debug = false) {
    // Find where the schedule starts - look for TIME header
    const timeIndex = lines.findIndex(line => line.trim() === 'TIME');

    if (timeIndex === -1) {
      if (debug) console.log('TIME header not found');
      return;
    }

    // Check if we have the column headers
    const todayIndex = timeIndex + 1;
    const nextWeekIndex = timeIndex + 2;

    if (todayIndex >= lines.length || nextWeekIndex >= lines.length) {
      if (debug) console.log('Column headers not found after TIME');
      return;
    }

    if (debug) {
      console.log(`Found TIME at line ${timeIndex}`);
      console.log(`TODAY'S GROUPS at line ${todayIndex}: ${lines[todayIndex]}`);
      console.log(`NEXT WEEK'S GROUP at line ${nextWeekIndex}: ${lines[nextWeekIndex]}`);
    }

    // Extract schedule data - starting after the headers
    let currentIndex = nextWeekIndex + 1;

    // Process each time slot (expect alternating pattern: TIME, TODAY_GROUP, NEXT_GROUP)
    while (currentIndex < lines.length) {
      const line = lines[currentIndex];

      // Stop if we hit the next section
      if (line.includes("NEXT WEEK'S DETAILS") ||
        line.includes("GENERAL ANNOUNCEMENT") ||
        this.isMatrimonyStart(line)) {
        break;
      }

      // Check if this looks like a time (has AM/PM, is a time format, or is WENDANI)
      if (line.match(/\d+:\d+\s*(AM|PM)|^\d+\s+(AM|PM)|WENDANI|NOON/i)) {
        const time = line.trim();

        // Get the next two lines for today's and next week's groups
        if (currentIndex + 1 < lines.length && currentIndex + 2 < lines.length) {
          const todayGroup = lines[currentIndex + 1].trim();
          const nextGroup = lines[currentIndex + 2].trim();

          // Only add if we have valid group names (not empty or time-like)
          if (todayGroup && nextGroup &&
            !todayGroup.match(/\d+:\d+/) && !nextGroup.match(/\d+:\d+/) &&
            !todayGroup.includes("NEXT WEEK'S DETAILS")) {

            data.currentWeekMass.push({
              time: time,
              group: todayGroup
            });

            data.nextWeekMasses.push({
              time: time,
              group: nextGroup
            });

            if (debug) {
              console.log(`Added schedule: ${time} - Today: ${todayGroup}, Next: ${nextGroup}`);
            }
          }

          currentIndex += 3; // Move past time and both groups
        } else {
          currentIndex++;
        }
      } else {
        currentIndex++;
      }
    }

    // Extract next week's occasion
    const nextWeekDetailsIndex = lines.findIndex(line => line.includes("NEXT WEEK'S DETAILS"));
    if (nextWeekDetailsIndex !== -1) {
      // Look for OCCASION line after NEXT WEEK'S DETAILS
      for (let i = nextWeekDetailsIndex + 1; i < lines.length && i < nextWeekDetailsIndex + 3; i++) {
        if (lines[i].match(/OCCASION:/i)) {
          const occasionMatch = lines[i].match(/OCCASION:\s*(.+)/i);
          if (occasionMatch) {
            data.nextWeekOccasion = occasionMatch[1].trim();
            break;
          }
        }
      }
    }

    // Extract mass animation - do this BEFORE announcements processing
    const massAnimIndex = lines.findIndex(line => line.includes("MASS ANIMATION"));
    if (massAnimIndex !== -1) {
      // The mass animation content is on the same line after "MASS ANIMATION-"
      let massAnimContent = lines[massAnimIndex].replace(/MASS ANIMATION[-:]\s*/i, '').trim();

      // Keep the original content as it appears
      data.massAnimation = massAnimContent;

      if (debug) {
        console.log(`Found mass animation: "${massAnimContent}"`);
      }
    }
  }

  static extractAnnouncements(lines, data, debug = false) {
    // Find the explicit "GENERAL ANNOUNCEMENT" marker
    const startIndex = lines.findIndex(line =>
      line.match(/GENERAL ANNOUNCEMENT/i)
    );

    if (startIndex === -1) {
      if (debug) console.log('Announcements section not found - missing GENERAL ANNOUNCEMENT marker');
      return;
    }

    if (debug) console.log(`Found announcements starting at line ${startIndex}`);

    // Skip the GENERAL ANNOUNCEMENT line and MASS ANIMATION line
    let searchStart = startIndex + 1;

    // Skip MASS ANIMATION line if present (don't process it as announcement)
    if (searchStart < lines.length && lines[searchStart].includes('MASS ANIMATION')) {
      searchStart++;
    }

    // Look for lines that contain announcement content
    let announcementLines = [];

    for (let i = searchStart; i < lines.length; i++) {
      const line = lines[i].trim();

      // Stop if we hit matrimony section
      if (this.isMatrimonyStart(line)) {
        break;
      }

      // Skip empty lines, section headers, and mass animation content
      if (!line ||
        line.includes("NEXT WEEK'S DETAILS") ||
        line.match(/OCCASION:/i) ||
        line.includes('MASS ANIMATION') ||
        line === 'we thank the Jumuiya that has animated this…………') {
        continue;
      }

      // Collect announcement content
      announcementLines.push(line);
    }

    if (debug) {
      console.log('Announcement lines found:', announcementLines);
    }

    // Process announcement lines into structured announcements
    this.processAnnouncementLines(announcementLines, data, debug);
  }

  static processAnnouncementLines(lines, data, debug = false) {
    let currentAnnouncement = null;
    let announcementNumber = 1;

    for (const line of lines) {
      // Check for key phrases that indicate new announcements
      if (line.match(/marriage\s+preparation/i) ||
        line.match(/archbishop.*invites/i) ||
        line.match(/jumuiya.*officials/i) ||
        line.match(/registrations.*catechesis/i)) {

        // Save previous announcement
        if (currentAnnouncement) {
          data.announcements.push(this.finalizeAnnouncement(currentAnnouncement));
        }

        // Start new announcement
        currentAnnouncement = {
          number: announcementNumber++,
          rawContent: [line],
          priority: this.determinePriority(line)
        };

        currentAnnouncement.title = this.extractTitle(line);

        if (debug) {
          console.log(`Started new announcement: ${currentAnnouncement.title}`);
        }
      } else if (currentAnnouncement) {
        // Add to current announcement
        currentAnnouncement.rawContent.push(line);
      } else {
        // Start first announcement if we haven't started one yet
        currentAnnouncement = {
          number: announcementNumber++,
          rawContent: [line],
          priority: this.determinePriority(line)
        };
        currentAnnouncement.title = this.extractTitle(line);
      }
    }

    // Add the last announcement
    if (currentAnnouncement) {
      data.announcements.push(this.finalizeAnnouncement(currentAnnouncement));
    }
  }

  static finalizeAnnouncement(announcement) {
    // Join content with spaces to create readable text
    let content = announcement.rawContent.join(' ').trim();

    // Clean up content by removing duplicate titles
    if (announcement.title && content.startsWith(announcement.title)) {
      content = content.substring(announcement.title.length).trim();
    }

    // Create the final announcement object
    return {
      number: announcement.number,
      title: announcement.title || this.extractTitle(content),
      content: content,
      priority: announcement.priority || this.determinePriority(content)
    };
  }

  static extractMatrimonyNotices(lines, data) {
    let currentNotice = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (this.isMatrimonyStart(line)) {
        // Save previous notice if complete
        if (currentNotice && this.isNoticeComplete(currentNotice)) {
          data.matrimonyNotices.push(currentNotice);
        }

        // Start new notice
        if (line.match(/^GROOM\s*:/i)) {
          currentNotice = {
            groomName: line.replace(/^GROOM\s*:/i, '').trim()
          };
        }
        continue;
      }

      if (currentNotice) {
        if (!currentNotice.groomParents && line.match(/^S\/o/i)) {
          currentNotice.groomParents = line.replace(/^S\/o/i, '').trim();
        }
        else if (!currentNotice.brideName && line.match(/^BRIDE\s*:/i)) {
          currentNotice.brideName = line.replace(/^BRIDE\s*:/i, '').trim();
        }
        else if (!currentNotice.brideParents && line.match(/^D\/o/i)) {
          currentNotice.brideParents = line.replace(/^D\/o/i, '').trim();
        }
        else if (line.match(/ON\s+\w+DAY\s+\d{1,2}/i) || line.match(/ON\s+\d{1,2}/i)) {
          const dateMatch = line.match(/ON\s+(?:\w+DAY\s+)?(\d{1,2})(?:ST|ND|RD|TH)?\s+([A-Z]+)\s+(\d{4})/i);
          if (dateMatch) {
            currentNotice.weddingDate = new Date(
              parseInt(dateMatch[3]),
              this.monthNameToNumber(dateMatch[2]),
              parseInt(dateMatch[1])
            );
          }

          const venueMatch = line.match(/AT\s+(.+)$/i);
          if (venueMatch) currentNotice.venue = venueMatch[1].trim();
        }
      }
    }

    // Save any remaining notice
    if (currentNotice && this.isNoticeComplete(currentNotice)) {
      data.matrimonyNotices.push(currentNotice);
    }
  }

  // Helper methods
  static isMatrimonyStart(line) {
    return line.match(/^GROOM\s*:/i) || line.match(/MARRIAGE\s+BANN/i);
  }

  static isNoticeComplete(notice) {
    return notice?.groomName && notice?.brideName && notice?.weddingDate && notice?.venue;
  }

  static extractTitle(text) {
    const patterns = [
      { regex: /marriage\s+preparation/i, title: "Marriage Preparation Course" },
      { regex: /beautification.*cardinal.*otunga/i, title: "Beatification Process" },
      { regex: /subukia.*pilgrimage/i, title: "Subukia Pilgrimage" },
      { regex: /adult.*catechumen/i, title: "Adult Catechumen Registration" },
      { regex: /mass\s+animation/i, title: "Mass Animation" }
    ];

    for (const { regex, title } of patterns) {
      if (regex.test(text)) return title;
    }

    // Fallback to first meaningful phrase
    const firstSentence = text.split(/[.!?]/)[0].trim();
    const words = firstSentence.split(/\s+/).slice(0, 5).join(' ');
    return words.length > 5 ? words : "General Announcement";
  }

  static determinePriority(text) {
    if (/urgent|important|deadline|register\s+by/i.test(text)) return 'High';
    if (/contribution|payment|minimum.*kshs/i.test(text)) return 'Medium';
    return 'Low';
  }

  static cleanText(text) {
    return text
      .replace(/\*\*/g, '')
      .replace(/[\[\]\{\}]/g, '')
      .replace(/\.underline/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static extractLiturgicalSeason(lines) {
    const seasonLine = lines.find(line =>
      line.match(/(\d+|FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH|FOURTEENTH|FIFTEENTH|SIXTEENTH|SEVENTEENTH|EIGHTEENTH|NINETEENTH|TWENTIETH|THIRTIETH|FORTIETH|FIFTIETH|SIXTIETH|SEVENTIETH|EIGHTIETH|NINETIETH|HUNDREDTH)(ST|ND|RD|TH)?\s+SUNDAY\s+(OF|IN)\s+[A-Z\s]+/i)
    );
    return seasonLine ? seasonLine.trim() : '';
  }

  static extractDocumentDate(lines) {
    for (const line of lines) {
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) return this.parseDate(dateMatch[0]);
    }
    return null;
  }

  static parseDate(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
  }

  static monthNameToNumber(month) {
    const months = {
      'JANUARY': 0, 'FEBRUARY': 1, 'MARCH': 2, 'APRIL': 3, 'MAY': 4,
      'JUNE': 5, 'JULY': 6, 'AUGUST': 7, 'SEPTEMBER': 8, 'OCTOBER': 9,
      'NOVEMBER': 10, 'DECEMBER': 11
    };
    return months[month.toUpperCase()] || 0;
  }
}

module.exports = DocumentParser;