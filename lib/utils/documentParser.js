const mammoth = require('mammoth');
const { parse, isValid } = require('date-fns');

class DocumentParser {
  static announcementStartKeywords = [
    /marriage\s+preparation/i,
    /archbishop.*invites|beatification/i, // Combined for Beatification Process
    /jumuiya.*officials|subukia.*pilgrimage/i, // Combined for Subukia Pilgrimage
    /registrations.*catechesis|adult\s*catechumen/i, // Combined for Adult Catechumen
    /self-help\s+group/i,
    /tithe.*zaka/i,
    /(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(?:st|nd|rd|th))\s+sunday.*(?:zaka|tithe|fungu\s+la\s+kumi)/i,
    /(?:zaka|tithe|fungu\s+la\s+kumi).*collection|collection.*(?:zaka|tithe|fungu\s+la\s+kumi)/i,
    /(?:tithe|zaka|fungu\s+la\s+kumi)/i,
    /catholic\s*justice.*peace/i,
    /Easter\s*cantata|parish\s*choir\s*invites/i, // For Easter Cantata
    /baptis(?:m|im)\s*prep(?:aration)?/i,
    /holy\s*communion/i,
    /confirmation\s*class/i,
    /YCA|young\s*catholic\s*adults/i,
    /YSC|youth\s*serving\s*christ/i,
    /MYM|(?:the\s+)?mantle\s+(?:of\s+st\.?\s*joseph|movement)/i,
    /CMA|catholic\s*men\s*association/i,
    /CWA|catholic\s*women\s*association/i,
    /PPC|parish\s*pastoral\s*council/i,
    /legion\s*of\s*mary/i,
    /Christmas\s*carol/i,
    /Marian\s*cantata/i,
    /annual\s*general\s*meeting/i,
    /bi-monthly\s*pamphlet/i,
    /on\s*the\s*road\s*to\s*emmaus/i,
    /commissioning/i,
    /retreat\s*program/i,
    /prayer\s*meeting/i,
    /thanksgiving|thanks\s*giving/i,
    /gratitude|thank\s*you|appreciation/i,
    /special\s*thanks/i,
    /bible\s*study/i,
    /choir\s*practice/i,
    /catechist\s*training/i,
    /(?:\W|^)Free\s+Eye\s+Clinic/i, // For Free Eye Clinic
    /(?:\W|^)St\.?\s*Joseph\s+(?:Health\s*Centre|Healthcare)/i, // For St. Joseph Health Centre/Healthcare
    /peter(?:'s|\s*s)\s+pence|second\s+collection/i,
    
     /arch\s*diocese\s*family\s*day|archdiocese\s*family\s*day/i,
    /deanery\s*family\s*day/i,
    /death\s*announcement/i,
    /infant\s+baptism.*registrations?|registrations?.*infant\s+baptism/i,
    /liturgy\s*(group)?/i,
    /congestion|parking|vehicles|exit.*(road|avenue)/i,
    /mediation\s*(services|disputes)/i

    // Add more general keywords as needed
  ];
  
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
        line.includes("NEXT SUNDAY") ||
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
            !todayGroup.includes("NEXT WEEK'S DETAILS") &&
            !todayGroup.includes("NEXT SUNDAY")) {

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

    // Extract next week's occasion - FIXED VERSION
    let nextWeekDetailsIndex = lines.findIndex(line => line.includes("NEXT WEEK'S DETAILS"));
    if (nextWeekDetailsIndex === -1) {
      nextWeekDetailsIndex = lines.findIndex(line => line.includes("NEXT SUNDAY"));
    }

    if (nextWeekDetailsIndex !== -1) {
      // Look for OCCASION line after NEXT WEEK'S DETAILS or NEXT SUNDAY
      // Increased search range to find the occasion line
      for (let i = nextWeekDetailsIndex + 1; i < lines.length && i < nextWeekDetailsIndex + 10; i++) {
        const line = lines[i];
        if (line.match(/OCCASION\s*:/i)) {
          const occasionMatch = line.match(/OCCASION\s*:\s*(.+)/i);
          if (occasionMatch) {
            data.nextWeekOccasion = occasionMatch[1].trim();
            if (debug) {
              console.log(`Found next week occasion: "${data.nextWeekOccasion}"`);
            }
            break;
          }
        }
        // Also check if the entire line is just the occasion (without "OCCASION:" prefix)
        // This handles cases where the occasion might be on its own line
        if (line.match(/THE\s+MOST\s+HOLY\s+TRINITY|PENTECOST|EASTER|CHRISTMAS|ADVENT|LENT|ORDINARY\s+TIME/i)) {
          data.nextWeekOccasion = line.trim();
          if (debug) {
            console.log(`Found next week occasion (no prefix): "${data.nextWeekOccasion}"`);
          }
          break;
        }
      }
    }

    // If still not found, search the entire document for OCCASION lines
    if (!data.nextWeekOccasion) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/OCCASION\s*:\s*(.+)/i)) {
          const occasionMatch = line.match(/OCCASION\s*:\s*(.+)/i);
          if (occasionMatch) {
            data.nextWeekOccasion = occasionMatch[1].trim();
            if (debug) {
              console.log(`Found next week occasion (global search): "${data.nextWeekOccasion}"`);
            }
            break;
          }
        }
      }
    }

    // Extract mass animation - do this BEFORE announcements processing
    const massAnimIndex = lines.findIndex(line => line.includes("MASS ANIMATION"));
    if (massAnimIndex !== -1) {
      // Look for the actual animation content in the line
      let massAnimContent = lines[massAnimIndex].replace(/MASS ANIMATION[-:]\s*/i, '').trim();
      
      // If the content is just a header or empty, look for the actual content
      if (!massAnimContent || massAnimContent.includes('we thank the Jumuiya')) {
        massAnimContent = 'we thank the Jumuiya that has animated this…………';
      }

      data.massAnimation = massAnimContent;

      if (debug) {
        console.log(`Found mass animation: "${massAnimContent}"`);
      }
    }
  }

  static extractAnnouncements(lines, data, debug = false) {
    let startIndex = -1;

    // First, try to find explicit "GENERAL ANNOUNCEMENT" marker
    startIndex = lines.findIndex(line => line.match(/GENERAL ANNOUNCEMENT/i));

    // If not found, look for the end of mass animation section
    if (startIndex === -1) {
      const massAnimIndex = lines.findIndex(line => line.includes("MASS ANIMATION"));
      if (massAnimIndex !== -1) {
        // Start after the mass animation line and its content
        startIndex = massAnimIndex;
        // Skip the mass animation content line if it exists
        if (startIndex + 1 < lines.length &&
          lines[startIndex + 1].includes('we thank the Jumuiya that has animated this')) {
          startIndex = startIndex + 1;
        }
        if (debug) console.log(`Using mass animation section end as announcements start: line ${startIndex}`);
      }
    }

    // If still not found, look for numbered announcements after occasion/next week info
    if (startIndex === -1) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Look for lines that start with numbers (1., 2., etc.) and contain announcement content
        if (line.match(/^\d+\.\s+/) &&
          (line.length > 20 || // Long enough to be an announcement
            line.match(/preparation|committee|tithe|zaka|contribution|register|apply|meeting|pamphlet/i))) {
          startIndex = i - 1; // Start just before the first numbered item
          if (debug) console.log(`Found numbered announcements starting at line ${i}, using ${startIndex} as start`);
          break;
        }
      }
    }

    if (startIndex === -1) {
      if (debug) console.log('Announcements section not found');
      return;
    }

    if (debug) console.log(`Found announcements starting at line ${startIndex}`);

    // Skip the section header line
    let searchStart = startIndex + 1;

    // Skip MASS ANIMATION line if present (don't process it as announcement)
    if (searchStart < lines.length && lines[searchStart].includes('MASS ANIMATION')) {
      searchStart++;
    }

    // Skip the "we thank the Jumuiya..." line if present
    if (searchStart < lines.length &&
      lines[searchStart].includes('we thank the Jumuiya that has animated this')) {
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
        line.includes("NEXT SUNDAY") ||
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
      // Check if line starts with a number (explicit announcement marker)
      const numberedMatch = line.match(/^(\d+)\.\s*(.+)/);
      if (numberedMatch) {
        // Save previous announcement
        if (currentAnnouncement) {
          data.announcements.push(this.finalizeAnnouncement(currentAnnouncement));
        }

        // Start new numbered announcement
        const number = parseInt(numberedMatch[1]);
        const content = numberedMatch[2];

        currentAnnouncement = {
          number: number,
          rawContent: [content],
          priority: this.determinePriority(content)
        };

        currentAnnouncement.title = this.extractTitle(content);

        if (debug) {
          console.log(`Started numbered announcement ${number}: ${currentAnnouncement.title}`);
        }
        continue;
      }

      // Check for key phrases that indicate new announcements (for non-numbered format)
      const isNewAnnouncementKeyword = DocumentParser.announcementStartKeywords.some(keyword => keyword.test(line));

      if (isNewAnnouncementKeyword) {

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
      } else if (line.trim().length > 10) {
        // Start first announcement if we haven't started one yet and line is substantial
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

    // Re-number announcements sequentially
    if (data.announcements && data.announcements.length > 0) {
      data.announcements.forEach((ann, index) => {
        ann.number = index + 1;
      });
    }
  }

  static finalizeAnnouncement(announcement) {
    // Join content with spaces to create readable text
    let content = announcement.rawContent.join(' ').trim();

    // Clean up content by removing duplicate titles (case-insensitive)
    if (announcement.title && content.toLowerCase().startsWith(announcement.title.toLowerCase())) {
      content = content.substring(announcement.title.length).trim();
      // Remove leading colon or hyphen if present after title removal
      if (content.startsWith(':') || content.startsWith('-')) {
        content = content.substring(1).trim();
      }
    }

    // Create the final announcement object
    return {
      number: announcement.number,
      title: announcement.title || this.extractTitle(content),
      content: content,
      priority: announcement.priority || this.determinePriority(content)
    };
  }

  static extractMatrimonyNotices(lines, data, debug = false) {
    let currentNotice = null;
    let bannType = null;
    let inGroupWedding = false;
    let groupWeddingNotice = null;
    
    // Ensure matrimonyNotices array exists in data
    data.matrimonyNotices = data.matrimonyNotices || [];

    // Helper to check if a couple already exists in group notices
    const isCoupleInGroupNotice = (groomName, brideName) => {
      return data.matrimonyNotices.some(notice => 
        notice.isGroupWedding && 
        notice.couples?.some(couple => 
          couple.groomName === groomName && 
          couple.brideName === brideName
        )
      );
    };

    // Process the current group wedding notice
    const finalizeGroupWedding = () => {
      if (groupWeddingNotice && groupWeddingNotice.couples?.length > 0) {
        // Only add the group notice if it has couples
        data.matrimonyNotices.push(groupWeddingNotice);
        if (debug) {
          console.log('Added group wedding notice with', groupWeddingNotice.couples.length, 'couples');
        }
      }
      groupWeddingNotice = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (debug) console.log(`Processing line ${i}: ${line}`);

      // Check for bann type
      const bannMatch = line.match(/MARRIAGE\s+BANN\s*\(([IV]+)\)/i);
      if (bannMatch) {
        // Finalize any pending group wedding
        if (inGroupWedding) {
          finalizeGroupWedding();
          inGroupWedding = false;
        }
        
        // Save previous notice if it's complete
        if (currentNotice && this.isNoticeComplete(currentNotice)) {
          data.matrimonyNotices.push(currentNotice);
        }
        
        bannType = bannMatch[1];
        currentNotice = { bannType };
        continue;
      }

      // Check for start of group wedding
      if (line.includes('The following couples intend to celebrate')) {
        // Finalize any previous group wedding
        if (inGroupWedding) {
          finalizeGroupWedding();
        }
        
        // Save any current individual notice
        if (currentNotice && this.isNoticeComplete(currentNotice)) {
          data.matrimonyNotices.push(currentNotice);
        }
        
        // Start new group wedding notice
        inGroupWedding = true;
        groupWeddingNotice = {
          bannType: bannType || 'I',
          isGroupWedding: true,
          couples: []
        };
        
        // Extract date and venue from the header line
        const dateMatch = line.match(/((?:\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?[A-Za-z]+(?:\s+\d{4})?)|(?:[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?))/i);
        if (dateMatch) {
          groupWeddingNotice.weddingDate = this.parseWeddingDate(dateMatch[0]);
        }
        
        const venueMatch = line.match(/at\s+(.+?)(?:\.|$)/i);
        groupWeddingNotice.venue = venueMatch ? venueMatch[1].trim() : 'Our Parish';
        
        currentNotice = null;
        continue;
      }

      // Process group wedding couples
      if (inGroupWedding && line.trim() !== '') {
        const coupleMatch = line.match(/(?:^[IVX]+\.\s*)?(.+?)\s+&\s+(.+)$/i);
        if (coupleMatch) {
          const groomName = coupleMatch[1].trim();
          const brideName = coupleMatch[2].trim();
          
          // Add to group's couples array
          groupWeddingNotice.couples.push({
            groomName,
            brideName,
            weddingDate: groupWeddingNotice.weddingDate,
            venue: groupWeddingNotice.venue
          });
        }
        continue;
      }

      // Process individual notices (only if not in a group wedding)
      if (!inGroupWedding && currentNotice) {
        // Groom name (with/without "GROOM:" prefix)
        if (!currentNotice.groomName && !line.match(/^S\/o|INTENDS|D\/o|ON\s+\w+DAY/i)) {
          currentNotice.groomName = line.replace(/^GROOM:\s*/i, '').trim();
          continue;
        }

        // Groom parents (handles "S/o" prefix)
        if (!currentNotice.groomParents && line.match(/^S\/o/i)) {
          currentNotice.groomParents = line.replace(/^S\/o\s*/i, '').trim();
          continue;
        }

        // Skip "INTENDS" line
        if (line.match(/INTENDS\s+TO\s+CELEBRATE/i)) {
          continue;
        }

        // Bride name (with/without "BRIDE:" prefix)
        if (!currentNotice.brideName && !line.match(/^D\/o|ON\s+\w+DAY/i)) {
          currentNotice.brideName = line.replace(/^BRIDE:\s*/i, '').trim();
          continue;
        }

        // Bride parents (handles single parent cases like "LATE PARENT")
        if (!currentNotice.brideParents && line.match(/^D\/o/i)) {
          currentNotice.brideParents = line.replace(/^D\/o\s*/i, '').trim();
          continue;
        }

        // Wedding date and venue
        if (line.match(/ON\s+\w+DAY\s+\d{1,2}/i)) {
          const dateMatch = line.match(/(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i);
          if (dateMatch) {
            currentNotice.weddingDate = this.parseWeddingDate(dateMatch[0]);
          }

          const venueMatch = line.match(/at\s+(.+)$/i);
          if (venueMatch) {
            currentNotice.venue = venueMatch[1].trim();
          } else {
            currentNotice.venue = 'Our Parish';
          }
        }
      }
    }
    
    // Finalize any pending group wedding
    if (inGroupWedding) {
      finalizeGroupWedding();
    }
    
    // Save the last notice if it's complete
    if (currentNotice && this.isNoticeComplete(currentNotice) && !inGroupWedding) {
      // Only add individual notice if this couple isn't already in a group notice
      if (!isCoupleInGroupNotice(currentNotice.groomName, currentNotice.brideName)) {
        data.matrimonyNotices.push(currentNotice);
      }
    }
  }

  // Helper: Parse wedding date strings like "August 23rd" or "23rd August 2025"
  static parseWeddingDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // Remove ordinal suffixes and any extra words
      const cleanStr = dateStr
        .replace(/(\d+)(st|nd|rd|th)/gi, '$1')  // Remove ordinals
        .replace(/\s+/g, ' ')  // Normalize spaces
        .trim();
      
      // Try different date formats
      const formats = [
        'MMMM d yyyy',  // August 23 2025
        'd MMMM yyyy',  // 23 August 2025
        'MMMM d',       // August 23 (current year assumed)
        'd MMMM'        // 23 August (current year assumed)
      ];
      
      let parsedDate = null;
      
      // Try each format until one works
      for (const format of formats) {
        parsedDate = parse(cleanStr, format, new Date());
        if (isValid(parsedDate)) {
          // If no year was in the format, set it to the current year
          if (format.includes('y')) {
            return parsedDate;
          } else {
            const now = new Date();
            // If the parsed date is in the past, assume it's for next year
            if (parsedDate < now && parsedDate.getMonth() < now.getMonth()) {
              parsedDate.setFullYear(now.getFullYear() + 1);
            } else {
              parsedDate.setFullYear(now.getFullYear());
            }
            return parsedDate;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
      return null;
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
      // Sacramental Preparations
      { regex: /(\d+(?:st|nd|rd|th)?)\s*baptis(?:m|im)\s*prep(?:aration)?/i, title: "Baptism Preparation Class" },
      { regex: /1st\s*holy\s*communion/i, title: "First Holy Communion Class" },
      { regex: /confirmation\s*classes/i, title: "Confirmation Classes" },
      { regex: /marriage\s*prep(?:aration)?/i, title: "Marriage Preparation Course" },
      { regex: /baptism.*registrations?|registrations?.*baptism/i, title: "Baptism Registration" },
      { regex: /infant\s+baptism.*registrations?|registrations?.*infant\s+baptism/i, title: "Infant Baptism Registration" },
      { regex: /first\s+communion|holy\s*communion/i, title: "First Holy Communion" },

      // Church Groups & Movements
      { regex: /YCA|young\s*catholic\s*adults/i, title: "Young Catholic Adults" },
      { regex: /YSC|youth\s*serving\s*christ/i, title: "Youth Serving Christ" },
      { regex: /MYM|(?:the\s+)?mantle\s+(?:of\s+st\.?\s*joseph|movement)/i, title: "Mantle Of St.Joseph" },
      { regex: /mantle\s*(?:of\s*st\.?\s*joseph|meeting)/i, title: "Mantle of St. Joseph Meeting" },
      { regex: /CMA|catholic\s*men\s*association/i, title: "Catholic Men Association" },
      { regex: /CWA|catholic\s*women\s*association/i, title: "Catholic Women Association" },
      { regex: /PPC|parish\s*pastoral\s*council/i, title: "Parish Pastoral Council" },
      { regex: /legion\s*of\s*mary/i, title: "Legion of Mary" },
      //Cantata
      { regex: /Easter\s*cantata/i, title: "Easter Cantata" },
      { regex: /Christmas\s*carol/i, title: "Christmas Carol" },
      { regex: /Marian\s*cantata/i, title: "Marian Cantata" },

      // Administrative & Financial
      { regex: /self-help\s*group.*management\s*committee/i, title: "Self Help Group" },
      { regex: /annual\s*general\s*meeting/i, title: "Annual General Meeting" },
      { regex: /tithe.*zaka.*fungu\s*la\s*kumi/i, title: "Tithe/Zaka Contribution" },
      { regex: /adult\s*catechumen.*registration|registrations.*catechesis.*adult/i, title: "Adult Catechumen Registration" },
      { regex: /contribution.*register/i, title: "Registration Notice" },
      //Collection
      { regex: /peter(?:'s|\s*s)\s+pence|second\s+collection/i, title: "Peter’s Pence Collection" },
      // Publications & Materials
      { regex: /bi-monthly\s*pamphlet/i, title: "Pamphlet Sale" },
      { regex: /on\s*the\s*road\s*to\s*emmaus/i, title: "On the Road to Emmaus" },
      { regex: /catholic\s*justice.*peace.*department/i, title: "CJPD Publication" },

      { 
        regex: /(\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(?:st|nd|rd|th))\s+sunday.*(zaka|tithe|fungu\s+la\s+kumi|collection)/i, 
        title: (match) => {
          const ordinal = match[1].toLowerCase().replace(/(\d+)(st|nd|rd|th)/, '$1$2');
          return `${ordinal.charAt(0).toUpperCase() + ordinal.slice(1)} Sunday of the Month Zaka Collection`;
        }
      },

      // Meetings & Events
      { regex: /commissioning/i, title: "Commissioning Ceremony" },
      { regex: /(CWA|CMA|YCA|MYM|YSC)\s*lessons/i, title: "$1 Lessons" },
      { regex: /(CWA|CMA|YCA|MYM|YSC)\s*meeting/i, title: "$1 Meeting" },
      { regex: /retreat\s*program/i, title: "Retreat Program" },
      //{ regex: /prayer\s*meeting/i, title: "Prayer Meeting" },

      //Gratitude & Thanksgiving
      { regex: /thanksgiving|thanks\s*giving/i, title: "Thanksgiving" },
      { regex: /gratitude|thank\s*you|appreciation/i, title: "Appreciation Notice" },
      { regex: /special\s*thanks/i, title: "Special Thanks" },

      // Regular Activities
      { regex: /bible\s*study/i, title: "Bible Study" },
      { regex: /choir\s*practice/i, title: "Choir Practice" },
      { regex: /catechist\s*training/i, title: "Catechist Training" },

      // Special Cases / Health Services
      { regex: /(?:\W|^)Free\s+Eye\s+Clinic/i, title: "Free Eye Clinic" },
      {
        regex: /(?:\W|^)St\.?\s*Joseph\s+(Health\s*Centre|Healthcare)/i,
        title: (match) => `St. Joseph ${match[1].trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()).join(' ')}`
      },
      { regex: /beautification.*cardinal.*otunga/i, title: "Beatification Process" },
      { regex: /subukia.*pilgrimage/i, title: "Subukia Pilgrimage" },
     // NEW: Add Archdiocese Family Day and Deanery Family Day
     { regex: /arch\s*diocese\s*family\s*day|archdiocese\s*family\s*day/i, title: "Archdiocese Family Day" },
     { regex: /deanery\s*family\s*day/i, title: "Deanery Family Day" },
     {regex:  /death\s*announcement/i,title: "Death Announcement" },
     { regex: /infant\s+baptism.*registrations?|registrations?.*infant\s+baptism/i, title: "Infant Baptism Registration" },
     { regex: /liturgy.*training/i, title: "Liturgy Group Training" },
     { regex: /liturgy.*meeting/i, title: "Liturgy Group Meeting" },
     { 
      regex: /(\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\w+)\s+(?:sunday|sunday\s+of\s+the\s+month|sunday\s+of\s+this\s+month|sunday\s+being).*?(zaka|tithe|fungu\s+la\s+kumi|collection)/i, 
      title: (match) => {
        // Extract and format the ordinal number
        let ordinal = match[1].toLowerCase();
        // If it's a number with suffix (1st, 2nd, etc.), just use as is
        if (!/\d/.test(ordinal)) {
          ordinal = ordinal.charAt(0).toUpperCase() + ordinal.slice(1);
        }
        return `${ordinal} Sunday of the Month Zaka Collection`;
      }
    },
    // Alternative pattern for "Today being the X Sunday..." format
    { 
      regex: /(\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+sunday.*(zaka|tithe|fungu\s+la\s+kumi|collection)/i, 
      title: (match) => {
        const ordinal = match[1].replace(/(\d+)(st|nd|rd|th)/, '$1$2');
        return `${ordinal} Sunday of the Month Zaka Collection`;
      }
    },
      // General
      { regex: /congestion|parking|vehicles|exit.*(road|avenue)/i, title: "Parking and Traffic Update" },
      { regex: /mediation\s*(services|disputes)/i, title: "Free Mediation Services" },

    ];

    // Special numbered cases (1st, 2nd, 3rd baptism)
    const baptismMatch = text.match(/(\d+(?:st|nd|rd|th))\s*baptis(?:m|im)/i);
    if (baptismMatch) {
      return `${baptismMatch[1]} Baptism Preparation`;
    }

    for (const { regex, title } of patterns) {
      const match = text.match(regex);
      if (match) {
        // Handle replacement patterns (like $1)
        return typeof title === 'function'
          ? title(match)
          : title.replace(/\$(\d+)/g, (_, n) => match[n] || '');
      }
    }

    // Fallback - first meaningful phrase (7 words max)
    const firstPhrase = text.split(/[.!?]/)[0].trim();
    return firstPhrase.split(/\s+/).slice(0, 7).join(' ') || "General Announcement";
  }

  static determinePriority(text) {
    // text is expected to be the full announcement content or the first line initially
    const lowerText = text.toLowerCase(); // Ensure case-insensitive matching for keywords

    // Keywords for High priority
    if (/urgent|important|deadline|register\s+by|apply\s+by|beatification|archbishop\s+invites/i.test(lowerText)) {
      return 'high';
    }
    // Keywords for Medium priority
    if (/contribution|payment|minimum.*kshs|committee|vacancy|marriage\s+preparation|pilgrimage/i.test(lowerText)) {
      return 'medium';
    }
    // Default to Low priority
    return 'low';
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
    // Look for various liturgical season patterns
    const seasonLine = lines.find(line => {
      // Pattern 1: Ordinal Sunday (e.g., "SIXTH SUNDAY OF EASTER")
      if (line.match(/(\d+|FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH|FOURTEENTH|FIFTEENTH|SIXTEENTH|SEVENTEENTH|EIGHTEENTH|NINETEENTH|TWENTIETH|THIRTIETH|FORTIETH|FIFTIETH|SIXTIETH|SEVENTIETH|EIGHTIETH|NINETIETH|HUNDREDTH)(ST|ND|RD|TH)?\s+SUNDAY\s+(OF|IN)\s+[A-Z\s]+/i)) {
        return true;
      }

      // Pattern 2: Named liturgical seasons/feasts (e.g., "PENTECOST SUNDAY", "CHRISTMAS DAY", "EASTER SUNDAY")
      if (line.match(/(PENTECOST|CHRISTMAS|EASTER|EPIPHANY|PALM|GOOD\s+FRIDAY|HOLY\s+THURSDAY|ASH\s+WEDNESDAY|TRINITY|CORPUS\s+CHRISTI|CHRIST\s+THE\s+KING|ALL\s+SAINTS|ALL\s+SOULS|IMMACULATE\s+CONCEPTION|ASSUMPTION|TRANSFIGURATION|ANNUNCIATION|PRESENTATION|CANDLEMAS|ASCENSION)\s*(SUNDAY|DAY|FEAST)?/i)) {
        return true;
      }

      // Pattern 3: Special Sundays (e.g., "THE MOST HOLY TRINITY")
      if (line.match(/(THE\s+MOST\s+HOLY\s+TRINITY|THE\s+MOST\s+HOLY\s+BODY\s+AND\s+BLOOD|THE\s+BAPTISM\s+OF\s+THE\s+LORD|THE\s+HOLY\s+FAMILY)/i)) {
        return true;
      }

      // Pattern 4: Advent and Lent with numbers (e.g., "FIRST SUNDAY OF ADVENT", "THIRD SUNDAY OF LENT")
      if (line.match(/(\d+|FIRST|SECOND|THIRD|FOURTH|FIFTH)\s+SUNDAY\s+OF\s+(ADVENT|LENT)/i)) {
        return true;
      }

      return false;
    });

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