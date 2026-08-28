import mammoth from 'mammoth';

/**
 * Clean and filter individual topic strings
 */
const cleanTopicString = (text: string): string => {
  return text
    .replace(/^(\d+[\.\)\-:]|\b(Week|Module|Chapter|Unit|Topic|Lesson)\s*\d+[\.\)\-:]|[•\-\*\>])\s*/i, '')
    .trim();
};

/**
 * Post-processes topics according to academic guidelines:
 * 1. Combines Orientation and Week 1 syllabus/policies into a single Item 1.
 * 2. Ensures the final topic is always "Final Examination".
 */
export const normalizeSyllabusTopicList = (rawTopics: string[]): string[] => {
  if (!rawTopics || rawTopics.length === 0) {
    return [
      'Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System',
      'Introduction to Course Subject Matter',
      'Final Examination'
    ];
  }

  const normalized: string[] = [];
  let hasOrientation = false;

  for (let i = 0; i < rawTopics.length; i++) {
    const topic = rawTopics[i].trim();
    if (!topic) continue;

    // Check for Vision/Mission/Orientation/Institutional Outcomes/Week 1 Policies
    const isOrientationOrWeek1 = /^(NEMSU|University|College)?\s*(Vision|Mission|Core Values|Quality Policy|Hymn|Institutional Outcomes|Program Outcomes|Course Outcomes|Course Syllabus|Course Policies|Grading System|Orientation)/i.test(topic);

    if (isOrientationOrWeek1) {
      if (!hasOrientation) {
        normalized.push('Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System');
        hasOrientation = true;
      }
      // Skip duplicate subsequent orientation sub-items to keep it as 1 single item
      continue;
    }

    // Ignore if line is just "Final Exam" in the middle, we add it at the end
    if (/^Final (Exam|Examination|Assessment|Evaluation)$/i.test(topic)) {
      continue;
    }

    if (!normalized.includes(topic)) {
      normalized.push(topic);
    }
  }

  // Ensure orientation is first if missing
  if (!hasOrientation) {
    normalized.unshift('Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System');
  }

  // Ensure Final Examination is the last item
  normalized.push('Final Examination');

  return normalized;
};

/**
 * Extracts clean syllabus topics from text, with support for tab-separated tables (pasted from Word/Excel)
 */
export const extractTopicsFromText = (rawText: string): string[] => {
  if (!rawText) return [];

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rawExtracted: string[] = [];

  // Check if pasted content is a TSV / Table (e.g. copied from Word "Detailed Course Learning Plan")
  const isTable = lines.some(l => l.includes('\t'));

  if (isTable) {
    let topicColIdx = -1;

    for (const line of lines) {
      const columns = line.split('\t').map(c => c.trim());
      
      // Look for the "TOPICS" header column
      if (topicColIdx === -1) {
        const idx = columns.findIndex(c => /^(TOPICS?|COURSE CONTENT|SUBJECT MATTER|LEARNING CONTENT)$/i.test(c));
        if (idx !== -1) {
          topicColIdx = idx;
          continue;
        }
      }

      if (topicColIdx !== -1 && columns[topicColIdx]) {
        const cellContent = columns[topicColIdx];
        const subItems = cellContent.split(/\r?\n|;/).map(s => cleanTopicString(s)).filter(s => s.length > 3);
        for (const item of subItems) {
          if (!rawExtracted.includes(item)) {
            rawExtracted.push(item);
          }
        }
      }
    }

    if (rawExtracted.length > 0) {
      return normalizeSyllabusTopicList(rawExtracted);
    }
  }

  // General text parsing
  for (const line of lines) {
    if (/^(TIME FRAME|TOPICS|LEARNING OUTCOMES|PERFORMANCE INDICATORS|INSTRUCTIONAL METHODOLOGY|LEARNING MATERIALS|ASSESSMENT)/i.test(line)) {
      continue;
    }
    if (/^(Course Title|Subject Code|Instructor|Department|College|University|Semester|School Year|Prerequisite|Credit Units|Room|Schedule|Time|Class Hours)/i.test(line)) {
      continue;
    }

    const cleaned = cleanTopicString(line);
    if (cleaned.length >= 4 && !rawExtracted.includes(cleaned)) {
      rawExtracted.push(cleaned);
    }
  }

  return normalizeSyllabusTopicList(rawExtracted.length > 0 ? rawExtracted : lines.slice(0, 20));
};

/**
 * Extracts topics specifically from the "TOPICS" column in a Word document's
 * "Detailed Course Learning Plan" table.
 */
export const parseWordDocxSyllabus = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();

  try {
    // 1. Convert docx to HTML to preserve table structure (DETAILED COURSE LEARNING PLAN)
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

    if (typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tables = doc.querySelectorAll('table');

      const extractedTopics: string[] = [];

      tables.forEach(table => {
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length === 0) return;

        let topicColIndex = -1;

        // Inspect header row to locate the "TOPICS" column
        for (let r = 0; r < Math.min(rows.length, 3); r++) {
          const cells = Array.from(rows[r].querySelectorAll('th, td'));
          cells.forEach((cell, idx) => {
            const txt = (cell.textContent || '').trim();
            if (/^(TOPICS?|COURSE CONTENT|SUBJECT MATTER|LEARNING CONTENT)$/i.test(txt)) {
              topicColIndex = idx;
            }
          });
          if (topicColIndex !== -1) break;
        }

        // Default to column 1 if table has 4+ columns (OBE layout: Timeframe, Topics, LOs, PIs...)
        if (topicColIndex === -1 && rows[0]?.querySelectorAll('th, td').length >= 4) {
          topicColIndex = 1;
        }

        if (topicColIndex !== -1) {
          rows.forEach((row) => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length > topicColIndex) {
              const topicCell = cells[topicColIndex];
              
              const paragraphs = Array.from(topicCell.querySelectorAll('p, li'));
              const items = paragraphs.length > 0 
                ? paragraphs.map(p => (p.textContent || '').trim()).filter(Boolean)
                : [(topicCell.textContent || '').trim()];

              items.forEach(item => {
                const subLines = item.split(/\r?\n|;/).map(s => cleanTopicString(s)).filter(s => s.length > 3);
                subLines.forEach(cleaned => {
                  if (
                    cleaned && 
                    !/^(TOPICS?|COURSE CONTENT|LEARNING OUTCOMES|PERFORMANCE INDICATORS)$/i.test(cleaned) &&
                    !extractedTopics.includes(cleaned)
                  ) {
                    extractedTopics.push(cleaned);
                  }
                });
              });
            }
          });
        }
      });

      if (extractedTopics.length > 0) {
        return normalizeSyllabusTopicList(extractedTopics);
      }
    }

    // 2. Fallback to raw text extraction
    const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });
    return extractTopicsFromText(rawText);

  } catch (err) {
    console.error('Error in docx HTML parser, fallback to text:', err);
    const text = await file.text();
    return extractTopicsFromText(text);
  }
};

export const parseDocxSyllabus = parseWordDocxSyllabus;
