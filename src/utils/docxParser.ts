import mammoth from 'mammoth';

export const parseDocxSyllabus = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const topicsList: string[] = [];

  // Helper to clean topic string (strips "Week X:", "Week X -", numbering, and bullets)
  const cleanTopicString = (str: string): string => {
    return str
      .replace(/^week\s*\d+(\s*[-–—]\s*\d+)?[:\-–—\s]+/i, '') // strip "Week 1:", "Week 2 -", "Week 3-4:"
      .replace(/^[•\-\*\d\.\)\s]+/, '') // strip leading bullets or numbers
      .trim();
  };

  // Find the "Detailed Course Learning Plan" table
  const allTables = Array.from(doc.querySelectorAll('table'));
  let targetTable: HTMLTableElement | null = null;
  let topicsColIndex = 1;

  for (const table of allTables) {
    const headerCells = Array.from(table.querySelectorAll('tr:first-child th, tr:first-child td, tr:nth-child(2) th, tr:nth-child(2) td'))
      .map(c => c.textContent?.trim().toUpperCase() || '');

    const foundTopics = headerCells.findIndex(h => /^TOPICS?$|^CONTENT$|^SUBJECT\s*MATTER$|^COURSE\s*CONTENT$/.test(h));

    if (foundTopics !== -1) {
      targetTable = table;
      topicsColIndex = foundTopics;
      break;
    }
  }

  // Fallback to table with the most rows if not found by header
  if (!targetTable && allTables.length > 0) {
    targetTable = allTables.reduce((prev, current) => 
      (current.querySelectorAll('tr').length > prev.querySelectorAll('tr').length) ? current : prev
    );
  }

  // Extract pure topics from the Learning Plan Table
  if (targetTable) {
    const rows = Array.from(targetTable.querySelectorAll('tr'));
    
    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim() || '');
      if (cells.length <= topicsColIndex) return;

      // Skip header row
      const isHeader = cells.some(c => /^(TIME\s*FRAME|TOPICS?|LEARNING\s*OUTCOMES|PERFORMANCE\s*INDICATORS|INSTRUCTIONAL)/i.test(c));
      if (isHeader) return;

      const topicsRaw = (cells[topicsColIndex] || '').trim();
      if (!topicsRaw) return;

      // Clean lines in the topics cell
      const rawLines = topicsRaw
        .split(/\r?\n+/)
        .map(l => cleanTopicString(l))
        .filter(l => l.length > 2 && !/^(time\s*frame|topics|learning\s*outcomes)/i.test(l));

      if (rawLines.length === 0) return;

      // Check for University Vision / Mission / Orientation row
      const isVisionMission = rawLines.some(l => /NEMSU\s*(Vision|Mission|Hymn)|Core\s*Values|Quality\s*Policy/i.test(l));
      if (isVisionMission) {
        const title = 'University Vision, Mission, Core Values & Quality Policy';
        if (!topicsList.includes(title)) {
          topicsList.push(title);
        }
        return;
      }

      // Check for Course Orientation / Outcomes row (Week 1 items)
      const isCourseOrientation = rawLines.some(l => /(Institutional|Program|Course)\s*Outcomes|Course\s*(Syllabus|Policies|Requirements)|Grading\s*System/i.test(l));
      if (isCourseOrientation) {
        const title = 'Course Orientation, Syllabus, Policies & Grading System';
        if (!topicsList.includes(title)) {
          topicsList.push(title);
        }
        return;
      }

      // Standard Subject Matter Topic Rows
      if (rawLines.length === 1) {
        const formatted = cleanTopicString(rawLines[0]);
        if (formatted.length > 2 && !topicsList.includes(formatted)) {
          topicsList.push(formatted);
        }
      } else if (rawLines.length > 1) {
        if (rawLines.length <= 3) {
          const joined = rawLines.map(l => cleanTopicString(l)).join(' & ');
          if (joined.length > 2 && !topicsList.includes(joined)) {
            topicsList.push(joined);
          }
        } else {
          rawLines.forEach((sub) => {
            const formatted = cleanTopicString(sub);
            if (formatted.length > 2 && !topicsList.includes(formatted)) {
              topicsList.push(formatted);
            }
          });
        }
      }
    });
  }

  // Fallback if table extraction was empty
  if (topicsList.length === 0) {
    const listItems = doc.querySelectorAll('li, p');
    listItems.forEach((item) => {
      const text = item.textContent?.trim() || '';
      if (text.length > 5 && text.length < 120 && !/^(course|syllabus|vision|mission|curriculum|page)/i.test(text)) {
        const clean = cleanTopicString(text);
        if (clean && !topicsList.includes(clean)) {
          topicsList.push(clean);
        }
      }
    });
  }

  return topicsList;
};
