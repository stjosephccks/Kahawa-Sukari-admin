// enhanced-liturgical-parser.js
import mammoth from 'mammoth';

export class EnhancedLiturgicalParser {
  constructor() {
    this.dayNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    this.months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                   'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    
    // Catholic liturgical seasons and ranks
    this.liturgicalSeasons = [
      'EASTER', 'ORDINARY TIME', 'ADVENT', 'LENT', 'CHRISTMAS'
    ];
    
    this.liturgicalRanks = [
      'SOLEMNITY', 'FEAST', 'MEMORIAL', 'OPTIONAL MEMORIAL'
    ];
    
    // Saint titles and descriptions
    this.saintTitles = [
      'APOSTLE', 'MARTYR', 'BISHOP', 'PRIEST', 'DEACON', 'RELIGIOUS', 
      'VIRGIN', 'DOCTOR', 'CONFESSOR', 'ABBOT', 'POPE', 'KING', 'QUEEN',
      'PARENTS OF THE B.V. MARY', 'MOTHER OF THE CHURCH'
    ];

    // Special liturgical celebrations
    this.specialCelebrations = [
      'PENTECOST', 'THE MOST HOLY TRINITY', 'THE BODY AND BLOOD OF CHRIST',
      'THE MOST SACRED HEART OF JESUS', 'THE IMMACULATE HEART',
      'THE NATIVITY OF ST JOHN THE BAPTIST', 'SAINTS PETER AND PAUL',
      'OUR LADY OF MT CARMEL', 'ST ALOYSIUS GONZAGA', 'ST MARY MAGDALENE',
      'ST JAMES', 'STS JOACHIM &ANN', 'ST BONAVENTURE'
    ];
  }

  async parseDocxFromS3(filePath) {
    try {
      // Read the file directly from the temporary path provided by formidable
      const result = await mammoth.extractRawText({ path: filePath });
      return this.parseTextContent(result.value);
    } catch (error) {
      console.error('Error parsing document:', error);
      throw new Error(`Failed to parse liturgical document: ${error.message}`);
    }
  }

  parseTextContent(text) {
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

    // Extract comprehensive liturgical information
    liturgicalData.weekTitle = this.extractWeekTitle(lines);
    liturgicalData.period = this.extractPeriod(lines);
    liturgicalData.year = this.extractYear(lines);
    liturgicalData.liturgicalSeason = this.extractLiturgicalSeason(liturgicalData.weekTitle);
    liturgicalData.weekNumber = this.extractWeekNumber(liturgicalData.weekTitle);
    liturgicalData.liturgicalYear = this.extractLiturgicalYear(liturgicalData.weekTitle);

    // Parse daily schedules with enhanced saint detection
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
      
      // Check if this line contains a day name
      const dayMatch = this.findDayInLine(line);
      if (dayMatch) {
        // Save previous day if exists
        if (currentDay) {
          days.push(currentDay);
        }

        // Start new day with enhanced parsing
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
      
      // Parse schedule items with enhanced detection
      if (currentDay && this.isScheduleLine(line)) {
        const scheduleItem = this.parseScheduleLine(line);
        if (scheduleItem) {
          // Check if this is a Sunday service being added to Saturday
          if (currentDay.day === 'SATURDAY' && this.isSundayService(scheduleItem)) {
            // Save Saturday first
            if (currentDay.schedule.length > 0) {
              days.push(currentDay);
            }
            
            // Create new Sunday entry
            currentDay = {
              date: this.getNextDate(currentDay.date),
              day: 'SUNDAY',
              saint: '',
              saintType: '',
              liturgicalRank: '',
              specialCelebration: this.extractSundaySpecialCelebration(line, lines, i),
              schedule: [scheduleItem]
            };
          } else {
            currentDay.schedule.push(scheduleItem);
          }
        }
      }

      i++;
    }

    // Don't forget the last day
    if (currentDay) {
      days.push(currentDay);
    }

    return days.filter(day => day.schedule.length > 0); // Only return days with schedules
  }

  findDayInLine(line) {
    const upperLine = line.toUpperCase();
    
    // Check for explicit day names first (but not Sunday special celebrations)
    for (const day of this.dayNames.slice(0, 6)) { // Only Mon-Sat
      if (upperLine.includes(day)) {
        return { day, index: upperLine.indexOf(day) };
      }
    }
    
    // Special case for Sunday - look for Sunday celebrations that don't explicitly say SUNDAY
    const sundayCelebrations = [
      'SAINTS PETER AND PAUL',
      'PENTECOST SUNDAY',
      'THE MOST HOLY TRINITY',
      'THE BODY AND BLOOD OF CHRIST',
      'FOURTEENTH SUNDAY',
      'FIFTEENTH SUNDAY',
      'SIXTEENTH SUNDAY',
      'SEVENTEENTH SUNDAY',
      'EIGHTEENTH SUNDAY',
      'NINETEENTH SUNDAY',
      'TWENTIETH SUNDAY',
      'SUNDAY IN ORDINARY TIME'
    ];
    
    for (const celebration of sundayCelebrations) {
      if (upperLine.includes(celebration)) {
        return { day: 'SUNDAY', index: upperLine.indexOf(celebration) };
      }
    }
    
    // Check for explicit SUNDAY last to avoid conflicts
    if (upperLine.includes('SUNDAY')) {
      return { day: 'SUNDAY', index: upperLine.indexOf('SUNDAY') };
    }
    
    return null;
  }

  capitalizeWords(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  }

  extractDate(line, allLines, currentIndex) {
    // Enhanced date extraction - look for patterns like *30*, *01*, etc.
    // Also check the position in the week (Saturday should be followed by Sunday)
    
    for (let j = Math.max(0, currentIndex - 2); j < Math.min(currentIndex + 4, allLines.length); j++) {
      const checkLine = allLines[j];
      
      // Look for date patterns - asterisks with numbers
      const datePatterns = [
        /\*\s*(\d{1,2})\s*\*/,  // *30*, *01*, etc.
        /^\s*(\d{1,2})\s*$/,     // standalone numbers
        /\|\s*(\d{1,2})\s*\|/    // |30|, |01|, etc.
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
    
    // If no explicit date found, try to infer from position
    // This is a fallback for cases where the date might be in a different format
    return '';
  }

  extractSaint(line, allLines, currentIndex) {
    // Enhanced saint name extraction
    const saintPatterns = [
      /\*\*([^*]+)\*\*/g, // Text between double asterisks
      /St\.?\s+([^*\n,]+)/gi, // Saint names starting with St.
      /Our Lady ([^*\n,]+)/gi, // Our Lady titles
      /THE\s+(MOST\s+)?([^*\n,]+)/g, // Special titles in caps
    ];

    // Check current line and next few lines
    for (let j = currentIndex; j < Math.min(currentIndex + 4, allLines.length); j++) {
      const checkLine = allLines[j];
      
      for (const pattern of saintPatterns) {
        const matches = [...checkLine.matchAll(pattern)];
        for (const match of matches) {
          let saintName = match[1] || match[2] || match[0];
          
          // Clean up the saint name
          saintName = this.cleanSaintName(saintName);
          
          // Skip if it's clearly not a saint name
          if (this.isValidSaintName(saintName)) {
            return saintName;
          }
        }
      }
    }

    // Check for standard liturgical terms
    const liturgicalTerms = [
      'easter weekday', 'ordinary weekday', 'mass of the blessed virgin mary',
      'maass of the blessed virgin mary' // Handle typos
    ];

    for (let j = currentIndex; j < Math.min(currentIndex + 3, allLines.length); j++) {
      const checkLine = allLines[j].toLowerCase();
      for (const term of liturgicalTerms) {
        if (checkLine.includes(term)) {
          return this.capitalizeWords(term);
        }
      }
    }
    
    return '';
  }

  cleanSaintName(name) {
    return name
      .replace(/\*+/g, '')
      .replace(/^\d+\s*/, '')
      .replace(/[A-Z]+DAY/i, '')
      .replace(/^[,\s-]+|[,\s-]+$/g, '')
      .replace(/SAINTS?/i, '') // Remove "Saints" or "Saint" prefix if standalone
      .trim();
  }

  isValidSaintName(name) {
    const invalidPatterns = [
      /^\d+$/, // Just numbers
      /^[a-z\s]*weekday/i, // Contains weekday
      /^[a-z\s]*time/i, // Contains time
      /am|pm/i, // Contains time indicators
      /adoration|mass|misa|rosary|confession/i, // Service names
      /^[\s\-*]*$/, // Just whitespace/punctuation
      /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i, // Day names
    ];

    if (name.length < 2 || name.length > 100) return false;
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(name)) return false;
    }
    
    return true;
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

  extractLiturgicalRank(line, allLines, currentIndex) {
    for (let j = currentIndex; j < Math.min(currentIndex + 4, allLines.length); j++) {
      const checkLine = allLines[j].toLowerCase();
      
      for (const rank of this.liturgicalRanks) {
        if (checkLine.includes(rank.toLowerCase())) {
          return rank;
        }
      }
    }
    return '';
  }

  extractSpecialCelebration(line, allLines, currentIndex) {
    // Look for Sunday special celebrations first
    const sundayPatterns = [
      /SAINTS PETER AND PAUL/i,
      /PENTECOST/i,
      /THE MOST HOLY TRINITY/i,
      /THE BODY AND BLOOD OF CHRIST/i,
      /(FOURTEENTH|FIFTEENTH|SIXTEENTH|SEVENTEENTH|EIGHTEENTH|NINETEENTH|TWENTIETH)\s+SUNDAY\s+IN\s+ORDINARY\s+TIME/i
    ];
    
    for (let j = currentIndex; j < Math.min(currentIndex + 4, allLines.length); j++) {
      const checkLine = allLines[j];
      
      // Check Sunday patterns first
      for (const pattern of sundayPatterns) {
        const match = checkLine.match(pattern);
        if (match) {
          return match[0].toUpperCase();
        }
      }
      
      // Then check general special celebrations
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
      /\d{1,2}[:.]?\d{2}\s*[–-]+/i, // Time with dash
      /kuabudu/i, // Swahili term for worship
    ];

    return timePatterns.some(pattern => pattern.test(line));
  }

  parseScheduleLine(line) {
    const timePatterns = [
      /(\d{1,2}(?:[:.]?\d{2})?\s*(?:[–-]+\s*\d{1,2}(?:[:.]?\d{2})?)?\s*(?:a\.?m\.?|p\.?m\.?|am|pm))/i,
      /(kuabudu)/gi
    ];

    let timeMatch = null;
    let time = '';

    for (const pattern of timePatterns) {
      timeMatch = line.match(pattern);
      if (timeMatch) {
        time = timeMatch[1].trim();
        break;
      }
    }

    if (!timeMatch) return null;

    let service = line.replace(timeMatch[0], '').replace(/[–-]+/g, '').trim();
    
    // Clean up service description
    service = service.replace(/^\*+|\*+$/g, '').trim();
    
    // Handle special Swahili terms
    if (time.toLowerCase() === 'kuabudu') {
      time = '7:00 a.m.';
      service = 'Kuabudu (Swahili Worship)';
    }
    
    // Fix time formatting issues (replace colons in wrong places)
    time = this.standardizeTime(time);
    
    // Determine language more accurately
    let language = null;
    const serviceUpper = service.toUpperCase();
    
    if (serviceUpper.includes('ENGLISH') || serviceUpper.includes('HOLY MASS') || 
        serviceUpper.includes('MASS') && !serviceUpper.includes('MISA')) {
      language = 'EN';
    } else if (serviceUpper.includes('KISWAHILI') || serviceUpper.includes('TAKATIFU') || 
               serviceUpper.includes('MISA') || serviceUpper.includes('ROSARI')) {
      language = 'SW';
    }
    
    // Extract location information
    let location = null;
    const locationPatterns = [
      /@\s*([^*\n]+)/,
      /wendani/gi
    ];
    
    for (const pattern of locationPatterns) {
      const locationMatch = service.match(pattern);
      if (locationMatch) {
        location = locationMatch[1] ? locationMatch[1].trim() : 'Wendani';
        service = service.replace(locationMatch[0], '').trim();
        break;
      }
    }
    
    // Check for highlighted/special services
    const highlight = this.isHighlightedService(service);
    
    // Determine service type for better categorization
    const serviceType = this.categorizeService(service);

    return {
      time,
      service: service.replace(/\s+/g, ' ').trim(),
      language,
      location,
      highlight,
      serviceType,
      originalText: line.trim() // Keep original for debugging
    };
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
    // Fix common time formatting issues
    return time
      .replace(/(\d):(\d)([ap]):/gi, '$1:$2$3.m.') // Fix "7:30a:" to "7:30a.m."
      .replace(/(\d)([ap]):/gi, '$1:00 $2.m.') // Fix "7a:" to "7:00 a.m."
      .replace(/\s*[–-]+\s*/g, ' - ') // Standardize dashes
      .replace(/\s+/g, ' ')
      .trim();
  }

  isSundayService(scheduleItem) {
    // Check if this service item indicates it's a Sunday service
    const sundayIndicators = [
      /7:30.*mass.*english/i,
      /9:00.*misa.*kiswahili/i,
      /9:30.*misa.*kiswahili.*wendani/i,
      /10:30.*mass.*english/i,
      /12:?00.*mass.*english/i,
      /noon.*mass/i,
      /7:15.*11:30.*confessions/i // Sunday confession hours
    ];
    
    const serviceText = `${scheduleItem.time} ${scheduleItem.service}`.toLowerCase();
    
    return sundayIndicators.some(pattern => pattern.test(serviceText));
  }

  getNextDate(currentDate) {
    // Simple increment for date (this could be more sophisticated)
    if (!currentDate || currentDate === '') return '';
    
    const dateNum = parseInt(currentDate);
    return (dateNum + 1).toString().padStart(2, '0');
  }

  extractSundaySpecialCelebration(line, allLines, currentIndex) {
    // Look specifically for Sunday celebrations in the surrounding lines
    const sundayPatterns = [
      /SAINTS PETER AND PAUL/i,
      /(FOURTEENTH|FIFTEENTH|SIXTEENTH|SEVENTEENTH|EIGHTEENTH|NINETEENTH|TWENTIETH)\s+SUNDAY\s+IN\s+ORDINARY\s+TIME/i,
      /PENTECOST/i,
      /THE MOST HOLY TRINITY/i,
      /THE BODY AND BLOOD OF CHRIST/i
    ];
    
    for (let j = Math.max(0, currentIndex - 3); j < Math.min(currentIndex + 3, allLines.length); j++) {
      const checkLine = allLines[j];
      
      for (const pattern of sundayPatterns) {
        const match = checkLine.match(pattern);
        if (match) {
          return match[0].toUpperCase();
        }
      }
    }
    
    return '';
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