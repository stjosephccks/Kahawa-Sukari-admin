import mammoth from 'mammoth';

export class EnhancedLiturgicalParser {
  constructor() {
    this.dayNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    this.months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                   'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    
    this.liturgicalSeasons = ['EASTER', 'ORDINARY TIME', 'ADVENT', 'LENT', 'CHRISTMAS'];
    this.liturgicalRanks = ['SOLEMNITY', 'FEAST', 'MEMORIAL', 'OPTIONAL MEMORIAL'];
    
    this.saintTitles = [
      'APOSTLE', 'MARTYR', 'BISHOP', 'PRIEST', 'DEACON', 'RELIGIOUS', 
      'VIRGIN', 'DOCTOR', 'CONFESSOR', 'ABBOT', 'POPE', 'KING', 'QUEEN',
      'PARENTS OF THE B.V. MARY', 'MOTHER OF THE CHURCH'
    ];

    this.specialCelebrations = [
      'PENTECOST', 'THE MOST HOLY TRINITY', 'THE BODY AND BLOOD OF CHRIST',
      'THE MOST SACRED HEART OF JESUS', 'THE IMMACULATE HEART',
      'THE NATIVITY OF ST JOHN THE BAPTIST', 'SAINTS PETER AND PAUL',
      'OUR LADY OF MT CARMEL', 'ST ALOYSIUS GONZAGA', 'ST MARY MAGDALENE',
      'ST JAMES', 'STS JOACHIM &ANN', 'ST BONAVENTURE'
    ];

    this.saintPrefixes = [
      'ST', 'SAINT', 'ST.', 'S.', 'BLESSED', 'BL.', 'OUR LADY', 
      'MARY', 'MOTHER', 'MOTHER OF', 'ASCENSION', 'TRANSFIGURATION'
    ];
  }

  async parseDocxFromS3(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return this.parseTextContent(result.value);
    } catch (error) {
      console.error('Error parsing document:', error);
      throw new Error(`Failed to parse liturgical document: ${error.message}`);
    }
  }

 parseTextContent(text) {
  // Normalize different dash characters to standard dash
  text = text.replace(/[–—]/g, '-');
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const liturgicalData = {
    weekTitle: '',
    period: '',
    year: '',
    liturgicalSeason: '',
    weekNumber: '',
    liturgicalYear: '',
    days: []
  };

  liturgicalData.weekTitle = this.extractWeekTitle(lines);
  liturgicalData.period = this.extractPeriod(lines);
  liturgicalData.year = this.extractYear(lines);
  liturgicalData.liturgicalSeason = this.extractLiturgicalSeason(liturgicalData.weekTitle);
  liturgicalData.weekNumber = this.extractWeekNumber(liturgicalData.weekTitle);
  liturgicalData.liturgicalYear = this.extractLiturgicalYear(liturgicalData.weekTitle);
  liturgicalData.days = this.parseDailySchedules(lines);

  // Validate date sequence
  const dateWarnings = this.validateDateSequence(liturgicalData.days);
  if (dateWarnings.length > 0) {
    console.warn('Date validation warnings:', dateWarnings);
    liturgicalData.dateWarnings = dateWarnings;
  }

  return liturgicalData;
}

  extractWeekTitle(lines) {
    const titlePatterns = [
      /liturgical program for the (.+)/i,
      /(SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH|FOURTEENTH|FIFTEENTH|SIXTEENTH|SEVENTEENTH|EIGHTEENTH|NINETEENTH|TWENTIETH).+WEEK/i,
      /(PENTECOST|THE MOST HOLY TRINITY|THE BODY AND BLOOD OF CHRIST)/i
    ];

    for (const line of lines) {
      for (const pattern of titlePatterns) {
        const match = line.match(pattern);
        if (match) {
          return match[1] || match[0];
        }
      }
    }
    return 'Liturgical Week';
  }

  extractLiturgicalSeason(title) {
    const upperTitle = title.toUpperCase();
    for (const season of this.liturgicalSeasons) {
      if (upperTitle.includes(season)) {
        return season;
      }
    }
    return 'ORDINARY TIME';
  }

  extractWeekNumber(title) {
    const weekNumbers = {
      'SEVENTH': '7th', 'EIGHTH': '8th', 'NINTH': '9th', 'TENTH': '10th',
      'ELEVENTH': '11th', 'TWELFTH': '12th', 'THIRTEENTH': '13th', 
      'FOURTEENTH': '14th', 'FIFTEENTH': '15th', 'SIXTEENTH': '16th',
      'SEVENTEENTH': '17th', 'EIGHTEENTH': '18th', 'NINETEENTH': '19th',
      'TWENTIETH': '20th'
    };

    for (const [word, number] of Object.entries(weekNumbers)) {
      if (title.toUpperCase().includes(word)) {
        return number;
      }
    }
    return '';
  }

  extractLiturgicalYear(title) {
    const yearMatch = title.match(/\(Year ([ABC])\)/i);
    return yearMatch ? yearMatch[1].toUpperCase() : 'C';
  }

  extractPeriod(lines) {
    const periodPatterns = [
      /^(JUNE|JULY|MAY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JANUARY|FEBRUARY|MARCH|APRIL)[\s-]*(\d{4}|JUNE|JULY|MAY|AUGUST)$/i,
      /(JUNE|JULY|MAY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JANUARY|FEBRUARY|MARCH|APRIL)[\s-]+(JUNE|JULY|MAY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JANUARY|FEBRUARY|MARCH|APRIL)\s+(\d{4})/i
    ];

    for (const line of lines) {
      for (const pattern of periodPatterns) {
        if (pattern.test(line)) {
          return line.trim();
        }
      }
    }
    return new Date().getFullYear().toString();
  }

  extractYear(lines) {
    for (const line of lines) {
      const yearMatch = line.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        return yearMatch[1];
      }
    }
    return new Date().getFullYear().toString();
  }

  parseDailySchedules(lines) {
  const days = [];
  let currentDay = null;
  let i = 0;
  let expectedDates = this.generateExpectedDates(); // Generate expected dates for the week
  let dateIndex = 0;
  

  while (i < lines.length) {
    const line = lines[i];
    
    const dayMatch = this.findDayInLine(line);
    if (dayMatch) {
      if (currentDay) days.push(currentDay);

      // Extract date with improved logic
      let extractedDate = this.extractDate(line, lines, i);
      
      // If no date found or invalid, use expected date
      if (!extractedDate && dateIndex < expectedDates.length) {
        extractedDate = expectedDates[dateIndex];
      }
      
      // Validate against expected sequence
      if (dateIndex < expectedDates.length && extractedDate !== expectedDates[dateIndex]) {
        console.warn(`Date mismatch for ${dayMatch.day}: expected ${expectedDates[dateIndex]}, got ${extractedDate}`);
        extractedDate = expectedDates[dateIndex]; // Use expected date
      }

      let saintName = this.extractSaint(line, lines, i);
      if (!saintName && dayMatch.day !== 'SUNDAY') {
        saintName = 'Ordinary Weekday';
      }

      currentDay = {
        date: extractedDate,
        day: dayMatch.day,
        saint: saintName,
        saintType: this.extractSaintType(line, lines, i),
        liturgicalRank: this.extractLiturgicalRank(line, lines, i),
        specialCelebration: this.extractSpecialCelebration(line, lines, i),
        schedule: []
      };
      
      dateIndex++;
    }
    
    // Better schedule line detection
    if (currentDay && this.isScheduleLine(line)) {
      const scheduleItems = this.parseScheduleLine(line);
      if (scheduleItems) {
        if (Array.isArray(scheduleItems)) {
          currentDay.schedule.push(...scheduleItems);
        } else {
          currentDay.schedule.push(scheduleItems);
        }
      }
    }

    i++;
  }

  if (currentDay) days.push(currentDay);
  
  return days.filter(day => day.schedule.length > 0);
}
generateExpectedDates() {
  // This should ideally use the weekStartDate if provided
  // For now, we'll generate a sequence based on the document period
  const currentDate = new Date();
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday
  
  const expectedDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    expectedDates.push(date.getDate().toString().padStart(2, '0'));
  }
  
  return expectedDates;
}
extractDateFromTableStructure(lines, currentIndex) {
  // Look for table patterns around current line
  const searchRange = 3;
  const startIndex = Math.max(0, currentIndex - searchRange);
  const endIndex = Math.min(lines.length, currentIndex + searchRange);
  
  for (let i = startIndex; i < endIndex; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Look for table cell with just a date
    const tableCellPatterns = [
      /^\s*\|\s*\*?\s*(\d{1,2})\s*\*?\s*\|\s*$/,  // |*12*| or |12|
      /^\s*\*\s*(\d{1,2})\s*\*\s*$/,              // *12*
      /^\s*(\d{1,2})\s*\|\s*\*?\s*[A-Z]/          // 12|*MONDAY
    ];
    
    for (const pattern of tableCellPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const dateNum = parseInt(match[1]);
        if (dateNum >= 1 && dateNum <= 31) {
          return dateNum.toString().padStart(2, '0');
        }
      }
    }
  }
  
  return '';
}
validateDateSequence(days) {
  const warnings = [];
  
  for (let i = 1; i < days.length; i++) {
    const prevDate = parseInt(days[i - 1].date);
    const currentDate = parseInt(days[i].date);
    
    // Check for reasonable date progression
    if (currentDate < prevDate && (prevDate - currentDate) > 25) {
      // Likely month transition
      continue;
    } else if (currentDate > prevDate + 2) {
      warnings.push(`Possible date gap between ${days[i - 1].day} (${days[i - 1].date}) and ${days[i].day} (${days[i].date})`);
    } else if (currentDate === prevDate) {
      warnings.push(`Duplicate date ${currentDate} for ${days[i - 1].day} and ${days[i].day}`);
    }
  }
  
  return warnings;
}


  // FIXED SAINT EXTRACTION - Added null checks throughout
  extractSaint(line, allLines, currentIndex) {
    try {
      // Defensive programming - ensure we have valid inputs
      if (!line || !allLines || typeof currentIndex !== 'number') {
        return '';
      }

      // Get context lines for multi-line saint names
      const contextLines = allLines.slice(currentIndex, Math.min(currentIndex + 6, allLines.length));
      const contextText = contextLines.join(' ');
      if (/ordinary\s+weekday/i.test(contextText)) {
        return 'Ordinary Weekday';
      }
      if (/ordinary\s+weekday/i.test(line)) {
        return 'Ordinary Weekday';
      }
      // More comprehensive saint patterns
      const saintPatterns = [
        // Saint patterns with formatting
        /\*\*([^*]+)\*\*/g,                    // **Saint Name**
        /\*([^*]+)\*/g,                        // *Saint Name*
        
        // Standard saint prefixes
        /\b(St\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,           // St. Name
        /\b(Saint\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,          // Saint Name
        /\b(Blessed\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,        // Blessed Name
        /\b(Bl\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,          // Bl. Name
        
        // Multiple saints
        /\b((?:Sts?\.?\s+)?[A-Z][a-z]+\s+and\s+[A-Z][a-z]+)/gi,  // Saints X and Y
        /\b((?:Sts?\.?\s+)?[A-Z][a-z]+\s+&\s+[A-Z][a-z]+)/gi,    // Saints X & Y
        
        // Our Lady variations
        /\b(Our Lady\s+[A-Z][a-z\s]+)/gi,
        /\b(Mother\s+of\s+[A-Z][a-z\s]+)/gi,
        
        // Major feasts
        /\b(THE\s+ASSUMPTION\s+OF\s+THE\s+B\.?\s*V\.?\s*MARY)/gi,
        /\b(THE\s+ASSUMPTION\s+OF\s+(?:THE\s+)?(?:BLESSED\s+VIRGIN\s+)?MARY)/gi,
        /\b(TRANSFIGURATION\s+OF\s+THE\s+LORD)/gi,
        /\b(IMMACULATE\s+CONCEPTION)/gi,
        /\b(SACRED\s+HEART)/gi,
        /\b(IMMACULATE\s+HEART)/gi,
        
        // Liturgical terms
        /\b(Mass\s+of\s+the\s+Blessed\s+Virgin\s+Mary)/gi,
        /\b(Ordinary\s+[Ww]eekday)/gi,
        /\b(Blessed\s+Virgin\s+Mary)/gi,
        
        // Special celebrations
        /\b([A-Z]+\s+SUNDAY\s+IN\s+ORDINARY\s+TIME)/gi,
      ];

      // First, look for saints in formatted text (**, *, etc.)
      for (const pattern of saintPatterns) {
        const matches = [...contextText.matchAll(pattern)];
        for (const match of matches) {
          let saintName = match[1] || match[0];
          // FIXED: Add null check before calling replace
          if (saintName) {
            saintName = saintName.replace(/\*+/g, '').trim();
            
            if (this.isValidSaintName(saintName)) {
              return this.formatSaintName(saintName);
            }
          }
        }
      }

      // Look line by line for saint names
      for (let j = currentIndex; j < Math.min(currentIndex + 4, allLines.length); j++) {
        const checkLine = allLines[j];
        
        // FIXED: Add null check for checkLine
        if (!checkLine) continue;
        
        // Skip obvious schedule lines
        if (this.isObviousScheduleLine(checkLine)) continue;
        
        // Check if line contains potential saint name
        if (this.containsPotentialSaint(checkLine)) {
          const extractedSaint = this.extractSaintFromLine(checkLine);
          if (extractedSaint) return extractedSaint;
        }
      }

      return '';
    } catch (error) {
      console.error('Error extracting saint:', error);
      return '';
    }
  }

  containsPotentialSaint(line) {
    // FIXED: Add null check
    if (!line) return false;
    
    const upperLine = line.toUpperCase();
    return this.saintPrefixes.some(prefix => upperLine.includes(prefix)) ||
           /\*\*[^*]+\*\*/.test(line) ||
           /\*[^*]+\*/.test(line);
  }

  extractSaintFromLine(line) {
    // FIXED: Add null check
    if (!line) return null;
    
    // Remove table formatting
    const cleanLine = line.replace(/[|+*]/g, ' ').trim();
    
    // Look for formatted saint names
    const formattedMatch = cleanLine.match(/\*\*([^*]+)\*\*|\*([^*]+)\*/);
    if (formattedMatch) {
      const saintName = formattedMatch[1] || formattedMatch[2];
      if (saintName && this.isValidSaintName(saintName)) {
        return this.formatSaintName(saintName);
      }
    }
    if (/ordinary\s+weekday/i.test(line)) {
      return 'Ordinary Weekday';
    }
   

    // Look for saint patterns in the clean line
    const saintPatterns = [
      /(St\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /(Saint\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /(Blessed\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /(Our Lady[^,\n]*)/,
      /(THE\s+ASSUMPTION[^,\n]*)/,
      /(TRANSFIGURATION[^,\n]*)/,
      /(Mass\s+of\s+the\s+Blessed\s+Virgin\s+Mary)/,
      /(Ordinary\s+weekday)/
    ];
  

    if (/ordinary\s+weekday/i.test(match[1])) {
      return 'Ordinary Weekday';
    }

    for (const pattern of saintPatterns) {
      const match = cleanLine.match(pattern);
      if (match && match[1]) {
        return this.formatSaintName(match[1]);
      }
    }

    return null;
  }

  isValidSaintName(name) {
    // FIXED: Add comprehensive null checks
    if (!name || typeof name !== 'string' || name.length < 3) return false;
    
    const upperName = name.toUpperCase();
    if (upperName === 'ORDINARY WEEKDAY') return true;

    
    // Exclude common non-saint words
    const excludeWords = [
      ...this.dayNames, ...this.months,
      'MASS', 'HOLY', 'ADORATION', 'ROSARY', 'CONFESSION',
      'MORNING', 'EVENING', 'AFTERNOON', 'NIGHT'
    ];
    
    return !excludeWords.some(word => upperName === word);
  }

  formatSaintName(name) {
    // FIXED: Add null check and ensure name is string
    if (!name || typeof name !== 'string') return '';
    
    return name
      .replace(/\*+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b(of|the|and)\b/gi, match => match.toLowerCase())
      .replace(/\b\w/g, match => match.toUpperCase())
      .replace(/\b(Of|The|And)\b/g, match => match.toLowerCase())
      .replace(/^(Of|The|And)\b/g, match => match.charAt(0).toUpperCase() + match.slice(1));
  }

  // FIXED LITURGICAL RANK EXTRACTION
  extractLiturgicalRank(line, allLines, currentIndex) {
    try {
      // FIXED: Add null checks
      if (!allLines || typeof currentIndex !== 'number') return '';
      
      // Look for italicized text and rank keywords
      const searchLines = allLines.slice(currentIndex, Math.min(currentIndex + 6, allLines.length));
      
      for (const searchLine of searchLines) {
        // FIXED: Add null check for searchLine
        if (!searchLine) continue;
        
        // Check for ranks in italics (single asterisks)
        const italicMatches = [...searchLine.matchAll(/\*([^*]+)\*/g)];
        for (const match of italicMatches) {
          if (match[1]) {
            const italicText = match[1].toLowerCase();
            if (italicText.includes('solemnity')) return 'SOLEMNITY';
            if (italicText.includes('feast')) return 'FEAST';
            if (italicText.includes('optional memorial')) return 'OPTIONAL MEMORIAL';
            if (italicText.includes('memorial')) return 'MEMORIAL';
          }
        }
        
        // Check for direct rank mentions
        const rankPatterns = [
          /\b(Solemnity)\b/gi,
          /\b(Feast)\b/gi,
          /\b(Optional Memorial)\b/gi,
          /\b(Memorial)\b/gi
        ];
        
        for (const pattern of rankPatterns) {
          const match = searchLine.match(pattern);
          if (match && match[1]) return match[1].toUpperCase();
        }
      }
      
      return '';
    } catch (error) {
      console.error('Error extracting liturgical rank:', error);
      return '';
    }
  }

  // FIXED SCHEDULE PARSING
  parseScheduleLine(line) {
    if (!this.isScheduleLine(line)) return null;
    
    const scheduleItems = [];
    
    // More comprehensive time patterns
    const timePatterns = [
      /(\d{1,2}(?:[:.]\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|am|pm))/gi,
      /(noon|midday)/gi,
      /(midnight)/gi,
      /(kuabudu)/gi
    ];
    
    let remainingLine = line;
    const foundTimes = [];
    
    // Extract all times from the line
    for (const pattern of timePatterns) {
      const matches = [...line.matchAll(pattern)];
      for (const match of matches) {
        foundTimes.push({
          time: match[1] || match[0],
          index: match.index,
          length: match[0].length
        });
      }
    }
    
    // Sort times by position
    foundTimes.sort((a, b) => a.index - b.index);
    
    if (foundTimes.length === 0) {
      // No time found, check if it's a service description
      const serviceOnly = this.extractServiceWithoutTime(line);
      if (serviceOnly) return serviceOnly;
      return null;
    }
    
    // Process each time found
    for (let i = 0; i < foundTimes.length; i++) {
      const currentTime = foundTimes[i];
      const nextTime = foundTimes[i + 1];
      
      // Extract service text between current time and next time (or end of line)
      const startPos = currentTime.index + currentTime.length;
      const endPos = nextTime ? nextTime.index : line.length;
      let serviceText = line.substring(startPos, endPos);
      
      // Clean the service text
      serviceText = this.cleanServiceText(serviceText);
      
      if (serviceText) {
        const scheduleItem = this.createScheduleItem(currentTime.time, serviceText, line);
        if (scheduleItem) scheduleItems.push(scheduleItem);
      }
    }
    
    return scheduleItems.length === 0 ? null : 
           scheduleItems.length === 1 ? scheduleItems[0] : scheduleItems;
  }

  extractServiceWithoutTime(line) {
    const cleaned = this.cleanServiceText(line);
    if (cleaned && this.isValidService(cleaned)) {
      return this.createScheduleItem('', cleaned, line);
    }
    return null;
  }

  cleanServiceText(text) {
    // FIXED: Add null check
    if (!text) return '';
    
    return text
      .replace(/^[–-]+\s*/, '')
      .replace(/\s*[–-]+$/, '')
      .replace(/\*+/g, '')
      .replace(/[|+]/g, '')
      .replace(/^\s*--\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  isValidService(text) {
    if (!text || text.length < 3) return false;
    
    const serviceKeywords = [
      'mass', 'misa', 'holy', 'adoration', 'rosary', 'rosari',
      'confession', 'kitubio', 'kuabudu', 'prayer', 'children',
      'english', 'kiswahili', 'takatifu', 'blessed'
    ];
    
    const lowerText = text.toLowerCase();
    return serviceKeywords.some(keyword => lowerText.includes(keyword));
  }

  createScheduleItem(time, service, originalLine) {
    const item = {
      time: this.standardizeTime(time),
      service: service || '',
      language: this.detectLanguage(service),
      location: this.extractLocation(service),
      highlight: this.isHighlightedService(service),
      serviceType: this.categorizeService(service),
      originalText: originalLine ? originalLine.trim() : ''
    };
    
    // Remove location from service text
    if (item.location && item.service) {
      item.service = item.service.replace(new RegExp(`@\\s*${item.location}`, 'gi'), '').trim();
    }
    
    return item;
  }

  detectLanguage(service) {
    // FIXED: Add null check
    if (!service) return null;
    
    const lowerService = service.toLowerCase();
    
    // Swahili indicators
    if (/(misa|takatifu|kiswahili|rosari|kitubio|maombi)/.test(lowerService)) {
      return 'SW';
    }
    
    // English indicators
    if (/(holy mass|mass|english|holy|prayer|confession|rosary)/.test(lowerService)) {
      return 'EN';
    }
    
    return null;
  }

  extractLocation(service) {
    // FIXED: Add null check
    if (!service) return null;
    
    const locationPatterns = [
      /@\s*([^@\n,]+)/,
      /\b(wendani|upstairs|downstairs|chapel|hall)\b/gi,
      /\bconfession\s*box\b/gi
    ];
    
    for (const pattern of locationPatterns) {
      const match = service.match(pattern);
      if (match) {
        return match[1] ? match[1].trim() : match[0].trim();
      }
    }
    return null;
  }

  isHighlightedService(service) {
    // FIXED: Add null check
    if (!service) return false;
    
    const highlightTerms = [
      'confession', 'rosary', 'rosari', 'kitubio', 'adoration'
    ];
    const serviceLower = service.toLowerCase();
    return highlightTerms.some(term => serviceLower.includes(term));
  }

  categorizeService(service) {
    // FIXED: Add null check
    if (!service) return 'Other';
    
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('mass') || serviceLower.includes('misa')) return 'Mass';
    if (serviceLower.includes('adoration')) return 'Adoration';
    if (serviceLower.includes('rosary') || serviceLower.includes('rosari')) return 'Rosary';
    if (serviceLower.includes('confession') || serviceLower.includes('kitubio')) return 'Confession';
    if (serviceLower.includes('kuabudu')) return 'Worship';
    return 'Other';
  }

  standardizeTime(time) {
    // FIXED: Add null check
    if (!time) return '';
    
    // Handle special cases
    if (time.toLowerCase().includes('kuabudu')) return 'Kuabudu';
    if (time.toLowerCase().includes('noon') || time.toLowerCase().includes('midday')) return 'Noon';
    if (time.toLowerCase().includes('midnight')) return 'Midnight';
    
    return time
      .replace(/(\d):(\d)([ap]):/gi, '$1:$2$3.m.')
      .replace(/(\d)([ap]):/gi, '$1:00 $2.m.')
      .replace(/\s*[–-]+\s*/g, ' - ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // HELPER METHODS
  findDayInLine(line) {
    // FIXED: Add null check
    if (!line) return null;
    
    const upperLine = line.toUpperCase();
    for (const day of this.dayNames) {
      if (upperLine.includes(day)) {
        return { day, index: upperLine.indexOf(day) };
      }
    }
    return null;
  }

extractDate(line, allLines, currentIndex) {
  try {
    if (!allLines || typeof currentIndex !== 'number') return '';
    
    const dayMatch = this.findDayInLine(line);
    if (!dayMatch) return '';
    
    // Look for date in the same line as the day first
    const dateFromSameLine = this.extractDateFromLine(line, dayMatch.day);
    if (dateFromSameLine) return dateFromSameLine;
    
    // Look in nearby lines (within table structure)
    for (let j = Math.max(0, currentIndex - 2); j < Math.min(currentIndex + 3, allLines.length); j++) {
      const checkLine = allLines[j];
      if (!checkLine) continue;
      
      // Skip lines that are clearly not date lines
      if (this.isScheduleLine(checkLine) || 
          checkLine.toLowerCase().includes('adoration') ||
          checkLine.toLowerCase().includes('mass')) continue;
      
      const extractedDate = this.extractDateFromLine(checkLine, dayMatch.day);
      if (extractedDate) return extractedDate;
    }
    
    return '';
  } catch (error) {
    console.error('Error extracting date:', error);
    return '';
  }
}
extractDateFromLine(line, dayName) {
  if (!line) return '';
  
  // Table format patterns - looking for date in table cells
  const tablePatterns = [
    // Date in asterisks or pipes (table format)
    /\|\s*\*?\s*(\d{1,2})\s*\*?\s*\|/,
    /\*\s*(\d{1,2})\s*\*/,
    /\|\s*(\d{1,2})\s*\|/,
    
    // Date at beginning of line
    /^\s*(\d{1,2})\s*\|/,
    /^\s*\*\s*(\d{1,2})/,
    
    // Date after day name
    new RegExp(`${dayName}[^\\d]*?(\\d{1,2})`, 'i')
  ];
  
  for (const pattern of tablePatterns) {
    const match = line.match(pattern);
    if (match && match[1]) {
      const dateNum = parseInt(match[1]);
      if (dateNum >= 1 && dateNum <= 31) {
        return dateNum.toString().padStart(2, '0');
      }
    }
  }
  
  return '';
}

  extractSaintType(line, allLines, currentIndex) {
    try {
      // FIXED: Add null checks
      if (!allLines || typeof currentIndex !== 'number') return '';
      
      const typePatterns = [
        /(Apostle|Martyr|Bishop|Priest|Deacon|Religious|Virgin|Doctor|Confessor|Abbot|Pope|King|Queen)/gi,
        /(Parents of the B\.V\. Mary|Mother of the Church)/gi,
        /\*([^*]*(?:Priest|Martyr|Bishop|Virgin|Apostle|Doctor)[^*]*)\*/gi
      ];

      for (let j = currentIndex; j < Math.min(currentIndex + 6, allLines.length); j++) {
        const checkLine = allLines[j];
        // FIXED: Add null check
        if (!checkLine) continue;
        
        for (const pattern of typePatterns) {
          const match = checkLine.match(pattern);
          if (match && match[1]) {
            return match[1].replace(/\*/g, '').trim();
          }
        }
      }
      return '';
    } catch (error) {
      console.error('Error extracting saint type:', error);
      return '';
    }
  }

  extractSpecialCelebration(line, allLines, currentIndex) {
    try {
      // FIXED: Add null checks
      if (!allLines || typeof currentIndex !== 'number') return '';
      
      const sundayPatterns = [
        /(NINETEENTH\s+SUNDAY\s+IN\s+ORDINARY\s+TIME)/gi,
        /(EIGHTEENTH\s+SUNDAY\s+IN\s+ORDINARY\s+TIME)/gi,
        /(\d+(?:st|nd|rd|th)?\s+SUNDAY\s+IN\s+ORDINARY\s+TIME)/gi,
        /(SAINTS PETER AND PAUL|PENTECOST|THE MOST HOLY TRINITY)/gi
      ];
      
      const contextText = allLines.slice(currentIndex, currentIndex + 4).join(' ');
      
      for (const pattern of sundayPatterns) {
        const match = contextText.match(pattern);
        if (match && match[1]) {
          return match[1].toUpperCase();
        }
      }
      
      return '';
    } catch (error) {
      console.error('Error extracting special celebration:', error);
      return '';
    }
  }

  isScheduleLine(line) {
    if (!line || line.trim().length === 0) return false;
    
    const timePatterns = [
      /\d{1,2}[:.]?\d{0,2}\s*(a\.?m\.?|p\.?m\.?|am|pm)/i,
      /\d{1,2}[:.]?\d{2}\s*[–-]+/i,
      /(kuabudu|noon|midday|midnight)/i,
    ];
    
    return timePatterns.some(pattern => pattern.test(line)) ||
           /mass|misa|adoration|rosary|confession|holy|prayer/.test(line.toLowerCase());
  }

  isObviousScheduleLine(line) {
    if (!line) return false;
    const lowerLine = line.toLowerCase();
    return /\d{1,2}[:.]?\d{0,2}\s*[ap]\.?m|mass|misa|adoration|rosary|confession|kuabudu|holy|takatifu/.test(lowerLine);
  }
}

// Enhanced API endpoint with better error handling and validation
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { filePath, fileName, weekStartDate } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ message: 'File path is required' });
    }

    const parser = new EnhancedLiturgicalParser();
    const liturgicalData = await parser.parseDocxFromS3(filePath);
    
    // Add metadata
    liturgicalData.fileName = fileName;
    liturgicalData.filePath = filePath;
    liturgicalData.weekStartDate = weekStartDate;
    liturgicalData.parsedAt = new Date().toISOString();
    
    // Calculate stats AFTER parsing
    liturgicalData.stats = {
      totalDays: liturgicalData.days.length,
      totalServices: liturgicalData.days.reduce((sum, day) => sum + day.schedule.length, 0),
      specialCelebrations: liturgicalData.days.filter(day => 
        day.specialCelebration && day.specialCelebration.trim() !== ''
      ).length,
      saints: liturgicalData.days.filter(day => 
        day.saint && day.saint.trim() !== '' && 
        !day.saint.toLowerCase().includes('weekday') &&
        !day.saint.toLowerCase().includes('blessed virgin mary')
      ).length
    };
    
    // Validate the parsed data
    const validation = validateLiturgicalData(liturgicalData);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        message: 'Parsing completed with warnings',
        data: liturgicalData,
        warnings: validation.warnings
      });
    }

    res.status(200).json({
      success: true,
      data: liturgicalData,
      message: 'Liturgical program parsed successfully',
      stats: liturgicalData.stats
    });

  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to parse liturgical document',
      errorType: error.name || 'ParseError'
    });
  }
}

function validateLiturgicalData(data) {
  const warnings = [];
  
  if (!data.weekTitle) warnings.push('Week title not found');
  if (!data.period) warnings.push('Period not found');
  if (data.days.length === 0) warnings.push('No days with schedules found');
  
  data.days.forEach((day, index) => {
    if (!day.date) warnings.push(`Day ${index + 1} (${day.day}): Missing date`);
    if (day.schedule.length === 0) warnings.push(`Day ${index + 1} (${day.day}): No schedule items`);
  });
  
  return {
    isValid: warnings.length < 3, // Allow some warnings but not too many
    warnings
  };
}