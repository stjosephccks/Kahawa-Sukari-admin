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

    while (i < lines.length) {
      const line = lines[i];
      
      const dayMatch = this.findDayInLine(line);
      if (dayMatch) {
        if (currentDay) days.push(currentDay);

        currentDay = {
          date: this.extractDate(line, lines, i),
          day: dayMatch.day,
          saint: this.extractSaint(line, lines, i),
          saintType: this.extractSaintType(line, lines, i),
          liturgicalRank: this.extractLiturgicalRank(line, lines, i),
          specialCelebration: this.extractSpecialCelebration(line, lines, i),
          schedule: []
        };
      }
      
      if (currentDay && this.isScheduleLine(line)) {
        const scheduleItem = this.parseScheduleLine(line);
        if (scheduleItem) {
          currentDay.schedule.push(scheduleItem);
        }
      }

      i++;
    }

    if (currentDay) days.push(currentDay);
    
    return days.filter(day => day.schedule.length > 0);
  }

  // ENHANCED SAINT EXTRACTION =====================================
  extractSaint(line, allLines, currentIndex) {
    // First, check for multi-line feast titles (like "THE TRANSFIGURATION\nOF THE LORD")
    const nextLine = currentIndex + 1 < allLines.length ? allLines[currentIndex + 1] : '';
    const twoLineCheck = `${line} ${nextLine}`.toUpperCase();
    
    // Check for multi-line feast titles first
    const multiLineFeast = this.extractMultiLineFeast(allLines, currentIndex);
    if (multiLineFeast) return multiLineFeast;
    
    // Check for shared feast days (e.g., "Sts. Peter and Paul")
    const sharedSaints = this.extractSharedSaints(line, allLines, currentIndex);
    if (sharedSaints) return sharedSaints;
    
    // Check for standard saint patterns
    const saintPatterns = [
      /(Sts?\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/, // St. John Vianney
      /(Our Lady [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i, // Our Lady of...
      /\*\*([^*]+)\*\*/, // Text between double asterisks
    ];
    
    // Check current line and next few lines
    for (let j = currentIndex; j < Math.min(currentIndex + 4, allLines.length); j++) {
      const checkLine = allLines[j];
      
      // Skip schedule lines and empty lines
      if (this.isScheduleLine(checkLine) || !checkLine.trim()) continue;
      
      // Try each pattern
      for (const pattern of saintPatterns) {
        const match = checkLine.match(pattern);
        if (match) {
          const name = (match[1] || match[0]).trim();
          if (name && !this.isCommonWord(name)) {
            return name;
          }
        }
      }
    }
    
    // Check for liturgical terms as fallback
    const liturgicalTerms = [
      'easter weekday', 'ordinary weekday', 
      'mass of the blessed virgin mary',
      'blessed virgin mary',
      'nineteenth sunday in ordinary time'
    ];
    
    const context = allLines.slice(currentIndex, currentIndex + 4).join(' ').toLowerCase();
    for (const term of liturgicalTerms) {
      if (context.includes(term)) {
        return this.capitalizeWords(term);
      }
    }
    
    return '';
  }
  
  extractMultiLineFeast(allLines, currentIndex) {
    // Comprehensive Catholic feast day patterns
    const commonFeastPatterns = [
      // Commemorations of the Faithful Departed
      /(ALL\s+SAINTS'?\s+DAY)/i,
      /(ALL\s+SOULS'?\s+DAY)/i,
      /(COMMEMORATION\s+OF\s+ALL\s+THE\s+FAITHFUL\s+DEPARTED)/i,
      
      // Major Feasts of the Lord
      /(TRANSFIGURATION)(?:\s+OF\s+THE\s+LORD)?/i,
      /(CHRIST\s+THE\s+KING)/i,
      /(EXALTATION\s+OF\s+THE\s+CROSS)/i,
      /(PRESENTATION\s+OF\s+THE\s+LORD)/i,
      /(HOLY\s+INNOCENTS)/i,
      
      // Marian Feasts
      /(IMMACULATE\s+HEART\s+OF\s+MARY)/i,
      /(IMMACULATE\s+CONCEPTION)/i,
      /(ASSUMPTION\s+OF\s+MARY)/i,
      /(QUEENSHIP\s+OF\s+MARY)/i,
      /(OUR\s+LADY\s+OF\s+[A-Z\s]+)/i,
      
      // Holy Trinity and Eucharist
      /(MOST\s+HOLY\s+TRINITY)/i,
      /(BODY\s+AND\s+BLOOD\s+OF\s+CHRIST)/i,
      /(SACRED\s+HEART\s+OF\s+JESUS)/i,
      /(HOLY\s+FAMILY)/i,
      
      // Saints
      /(ST\.?\s+JOSEPH\s+[A-Z\s]+)/i,
      /(ST\.?\s+PETER\s+AND\s+PAUL)/i,
      /(ST\.?\s+JOHN\s+[A-Z\s]+)/i,
      /(ST\.?\s+MICHAEL\s+[A-Z\s]*)/i,
      /(ST\.?\s+FRANCIS\s+[A-Z\s]*)/i,
      
      // Liturgical Seasons
      /(BAPTISM\s+OF\s+THE\s+LORD)/i,
      /(ANNUNCIATION)/i,
      /(ASCENSION)/i,
      /(PENTECOST)/i,
      /(HOLY\s+THURSDAY)/i,
      /(GOOD\s+FRIDAY)/i,
      /(EASTER\s+SUNDAY?)/i,
      /(DIVINE\s+MERCY)/i
    ];
    
    // First, check for known feast patterns in the current and next few lines
    const context = allLines.slice(currentIndex, currentIndex + 4).join(' ').toUpperCase();
    for (const pattern of commonFeastPatterns) {
      const match = context.match(pattern);
      if (match) {
        // Return the properly formatted feast name
        const feastMap = {
          // Major Feasts of the Lord
          'TRANSFIGURATION': 'Transfiguration of the Lord',
          'CHRIST THE KING': 'Our Lord Jesus Christ, King of the Universe',
          'EXALTATION OF THE CROSS': 'Exaltation of the Holy Cross',
          'PRESENTATION OF THE LORD': 'Presentation of the Lord',
          'HOLY INNOCENTS': 'The Holy Innocents, Martyrs',
          
          // Marian Feasts
          'IMMACULATE HEART OF MARY': 'Immaculate Heart of Mary',
          'IMMACULATE CONCEPTION': 'Immaculate Conception of the Blessed Virgin Mary',
          'ASSUMPTION OF MARY': 'Assumption of the Blessed Virgin Mary',
          'QUEENSHIP OF MARY': 'Queenship of the Blessed Virgin Mary',
          
          // Holy Trinity and Eucharist
          'MOST HOLY TRINITY': 'The Most Holy Trinity',
          'BODY AND BLOOD OF CHRIST': 'The Most Holy Body and Blood of Christ',
          'SACRED HEART OF JESUS': 'The Most Sacred Heart of Jesus',
          'HOLY FAMILY': 'The Holy Family of Jesus, Mary and Joseph',
          
          // Commemorations
          'ALL SAINTS DAY': 'All Saints\' Day',
          'ALL SAINTS\' DAY': 'All Saints\' Day',
          'ALL SOULS DAY': 'All Souls\' Day',
          'ALL SOULS\' DAY': 'All Souls\' Day',
          'COMMEMORATION OF ALL THE FAITHFUL DEPARTED': 'The Commemoration of All the Faithful Departed (All Souls\' Day)',
          
          // Liturgical Seasons
          'BAPTISM OF THE LORD': 'The Baptism of the Lord',
          'ANNUNCIATION': 'The Annunciation of the Lord',
          'ASCENSION': 'The Ascension of the Lord',
          'PENTECOST': 'Pentecost Sunday',
          'HOLY THURSDAY': 'Holy Thursday',
          'GOOD FRIDAY': 'Good Friday of the Lord\'s Passion',
          'EASTER SUNDAY': 'Easter Sunday of the Resurrection of the Lord',
          'DIVINE MERCY': 'Divine Mercy Sunday'
        };
        
        // Handle Our Lady titles
        if (match[0].startsWith('OUR LADY OF ')) {
          const title = match[0].replace('OUR LADY OF ', '').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          return `Our Lady of ${title}`;
        }
        
        // Handle Saint names
        if (match[0].startsWith('ST ')) {
          const saintName = match[0].replace('ST ', 'St. ');
          return saintName;
        }
        
        const matchedText = match[0].toUpperCase();
        return feastMap[matchedText] || matchedText;
      }
    }
    
    // If no known pattern matched, try to reconstruct the feast name from the text
    const linesToCheck = allLines.slice(currentIndex, currentIndex + 4);
    let feastParts = [];
    
    for (const line of linesToCheck) {
      // Skip empty lines, schedule lines, or lines that are too short
      if (!line.trim() || this.isScheduleLine(line) || line.trim().length < 3) continue;
      
      // If the line is all uppercase, it's likely part of the feast title
      if (line === line.toUpperCase()) {
        // Split into words and filter out common words
        const words = line.split(/\s+/).filter(word => {
          const upperWord = word.toUpperCase();
          return !this.dayNames.includes(upperWord) && 
                 !this.months.includes(upperWord) &&
                 !['MASS', 'FEAST', 'MEMORIAL', 'OPTIONAL', 'OF', 'THE', 'AND'].includes(upperWord) &&
                 word.length > 2;
        });
        
        if (words.length > 0) {
          feastParts = feastParts.concat(words);
        }
      } else if (feastParts.length > 0) {
        // If we were collecting feast parts but hit a non-uppercase line, we're done
        break;
      }
    }
    
    // If we found any feast parts, join them with spaces
    if (feastParts.length > 0) {
      // Special case for "OF THE" which is common in feast titles
      const feastName = feastParts.join(' ')
        .replace(/\b(OF|THE|AND)\b/gi, match => match.toLowerCase())
        .replace(/\b(\w)/g, match => match.toUpperCase())
        .replace(/Of The/g, 'of the')
        .replace(/And/g, 'and');
      
      return feastName;
    }
    
    return null;
  }
  
  extractSharedSaints(line, allLines, currentIndex) {
    // Look for patterns like "Sts. Peter and Paul" or "St. Peter and Paul"
    const sharedPatterns = [
      /(?:Sts?\.?\s+)([A-Z][a-z]+)(?:\s+and\s+)([A-Z][a-z]+)/i,
      /(?:Sts?\.?\s+)([A-Z][a-z]+)(?:\s*&\s*)([A-Z][a-z]+)/i,
      /([A-Z][a-z]+)(?:\s+and\s+)([A-Z][a-z]+)(?:\s+Apostles?)?/i
    ];
    
    // Check current line and next few lines
    for (let j = currentIndex; j < Math.min(currentIndex + 3, allLines.length); j++) {
      const checkLine = allLines[j];
      
      for (const pattern of sharedPatterns) {
        const match = checkLine.match(pattern);
        if (match) {
          // Format as "St. [Name1] and [Name2]"
          return `Sts. ${match[1]} and ${match[2]}`;
        }
      }
    }
    
    return null;
  }

  isCommonWord(text) {
    const upperText = text.toUpperCase();
    const commonWords = [
      ...this.dayNames, 
      ...this.months, 
      'ORDINARY', 'WEEKDAY', 'WEEK', 'TIME', 'YEAR', 
      'MASS', 'MISA', 'HOLY', 'ADORATION', 'ROSARY'
    ];
    return commonWords.some(word => upperText.includes(word));
  }
  // END OF FIXED SAINT EXTRACTION =================================

  // FIXED LITURGICAL RANK EXTRACTION ==============================
  extractLiturgicalRank(line, allLines, currentIndex) {
    // Look for italicized text (single asterisks)
    for (let j = currentIndex; j < Math.min(currentIndex + 4, allLines.length); j++) {
      const lineText = allLines[j];
      const italicMatch = lineText.match(/\*([^*]+)\*/);
      if (italicMatch) {
        const italicText = italicMatch[1].toLowerCase();
        if (italicText.includes('feast')) return 'FEAST';
        if (italicText.includes('memorial')) return 'MEMORIAL';
        if (italicText.includes('solemnity')) return 'SOLEMNITY';
      }
    }
    
    // Look for rank words in the text
    const rankPatterns = [
      /(Solemnity|Feast|Memorial|Optional Memorial)/i
    ];
    
    for (let j = currentIndex; j < Math.min(currentIndex + 4, allLines.length); j++) {
      const lineText = allLines[j];
      for (const pattern of rankPatterns) {
        const match = lineText.match(pattern);
        if (match) {
          return match[1].toUpperCase();
        }
      }
    }
    
    return '';
  }
  // END OF FIXED LITURGICAL RANK EXTRACTION =======================

  // FIXED SCHEDULE PARSING ========================================
  parseScheduleLine(line) {
    // First, extract time with more robust pattern
    const timePattern = /(\d{1,2}(?:[:.]\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|am|pm)|kuabudu)/i;
    const timeMatch = line.match(timePattern);
    
    if (!timeMatch) return null;

    const time = timeMatch[1].trim();
    let service = line.replace(timeMatch[0], '').replace(/[–-]+/g, ' ').trim();
    
    // Remove asterisks but preserve the text
    service = service.replace(/\*+/g, '').trim();
    
    // Handle special Swahili terms
    if (time.toLowerCase().includes('kuabudu')) {
      service = 'Kuabudu (Swahili Worship)';
    }
    
    // Extract location information
    let location = null;
    const locationPatterns = [
      /@\s*([^*\n]+)/,
      /Wendani/gi,
      /Confession\s*box/gi
    ];
    
    for (const pattern of locationPatterns) {
      const locationMatch = service.match(pattern);
      if (locationMatch) {
        location = locationMatch[1] 
          ? locationMatch[1].trim() 
          : locationMatch[0].trim();
        service = service.replace(locationMatch[0], '').trim();
        break;
      }
    }

    // Determine language based on keywords WITHOUT removing them
    let language = null;
    if (/(^|\s)English(\s|$)/i.test(service) || 
        /Mass.*English/i.test(service) || 
        /Holy Mass/i.test(service)) {
      language = 'EN';
    } 
    else if (/(^|\s)Kiswahili(\s|$)/i.test(service) || 
             /Misa Takatifu/i.test(service) ||
             /Rosari/i.test(service) ||
             /Misa.*Kiswahili/i.test(service)) {
      language = 'SW';
    }
    
    // Check for highlighted services
    const highlight = this.isHighlightedService(service);
    const serviceType = this.categorizeService(service);

    return {
      time: this.standardizeTime(time),
      service: service.replace(/\s+/g, ' ').trim(),
      language,
      location,
      highlight,
      serviceType,
      originalText: line.trim()
    };
  }
  // END OF FIXED SCHEDULE PARSING ================================

  // HELPER FUNCTIONS ==============================================
  capitalizeWords(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  }

  findDayInLine(line) {
    const upperLine = line.toUpperCase();
    for (const day of this.dayNames) {
      if (upperLine.includes(day)) {
        return { day, index: upperLine.indexOf(day) };
      }
    }
    return null;
  }

  extractDate(line, allLines, currentIndex) {
    for (let j = Math.max(0, currentIndex - 2); j < Math.min(currentIndex + 4, allLines.length); j++) {
      const checkLine = allLines[j];
      const datePatterns = [
        /\*\s*(\d{1,2})\s*\*/,
        /^\s*(\d{1,2})\s*$/,
        /\|\s*(\d{1,2})\s*\|/
      ];
      
      for (const pattern of datePatterns) {
        const dateMatch = checkLine.match(pattern);
        if (dateMatch) {
          const dateNum = parseInt(dateMatch[1]);
          if (dateNum >= 1 && dateNum <= 31) {
            return dateMatch[1].padStart(2, '0');
          }
        }
      }
    }
    return '';
  }

  extractSaintType(line, allLines, currentIndex) {
    const typePatterns = [
      /(Apostle|Martyr|Bishop|Priest|Deacon|Religious|Virgin|Doctor|Confessor|Abbot|Pope|King|Queen)/gi,
      /(Parents of the B\.V\. Mary|Mother of the Church)/gi
    ];

    for (let j = currentIndex; j < Math.min(currentIndex + 4, allLines.length); j++) {
      const checkLine = allLines[j];
      for (const pattern of typePatterns) {
        const match = checkLine.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }
    return '';
  }

  extractSpecialCelebration(line, allLines, currentIndex) {
    const sundayPatterns = [
      /SAINTS PETER AND PAUL/i,
      /PENTECOST/i,
      /THE MOST HOLY TRINITY/i,
      /THE BODY AND BLOOD OF CHRIST/i,
      /(FOURTEENTH|FIFTEENTH|SIXTEENTH|SEVENTEENTH|EIGHTEENTH|NINETEENTH|TWENTIETH)\s+SUNDAY\s+IN\s+ORDINARY\s+TIME/i
    ];
    
    for (let j = currentIndex; j < Math.min(currentIndex + 4, allLines.length); j++) {
      const checkLine = allLines[j];
      for (const pattern of sundayPatterns) {
        const match = checkLine.match(pattern);
        if (match) {
          return match[0].toUpperCase();
        }
      }
      for (const celebration of this.specialCelebrations) {
        if (checkLine.toUpperCase().includes(celebration)) {
          return celebration;
        }
      }
    }
    return '';
  }

  isScheduleLine(line) {
    const timePatterns = [
      /\d{1,2}[:.]?\d{0,2}\s*(a\.?m\.?|p\.?m\.?|am|pm)/i,
      /\d{1,2}[:.]?\d{2}\s*[–-]+/i,
      /kuabudu/i,
    ];
    return timePatterns.some(pattern => pattern.test(line));
  }

  isHighlightedService(service) {
    const highlightTerms = [
      'confession', 'rosary', 'rosari', 'kitubio', 'adoration'
    ];
    const serviceLower = service.toLowerCase();
    return highlightTerms.some(term => serviceLower.includes(term));
  }

  categorizeService(service) {
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('mass') || serviceLower.includes('misa')) return 'Mass';
    if (serviceLower.includes('adoration')) return 'Adoration';
    if (serviceLower.includes('rosary') || serviceLower.includes('rosari')) return 'Rosary';
    if (serviceLower.includes('confession') || serviceLower.includes('kitubio')) return 'Confession';
    if (serviceLower.includes('kuabudu')) return 'Worship';
    return 'Other';
  }

  standardizeTime(time) {
    return time
      .replace(/(\d):(\d)([ap]):/gi, '$1:$2$3.m.')
      .replace(/(\d)([ap]):/gi, '$1:00 $2.m.')
      .replace(/\s*[–-]+\s*/g, ' - ')
      .replace(/\s+/g, ' ')
      .trim();
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