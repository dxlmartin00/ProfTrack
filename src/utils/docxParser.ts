import mammoth from 'mammoth';

/**
 * Clean and filter individual topic strings:
 * Removes "Week X", "Week X-Y", "W1:", numbers, and bullet points.
 * Returns ONLY the clean topic text without any week indicators.
 */
export const cleanTopicString = (text: string): string => {
  if (!text) return '';
  return text
    // Remove "Week 1", "Week 1-2", "Week 1 to 2", "W1-W2", "W1:" prefixes
    .replace(/^(\bWeek\s*\d+(\s*[-–—to]+\s*\d+)?\b|\bW\d+(\s*[-–—]\s*W?\d+)?\b)\s*[:\.\-–—)]?\s*/i, '')
    // Remove module/chapter/unit prefixes
    .replace(/^\b(Module|Chapter|Unit|Topic|Lesson)\s*\d+(\s*[-–—to]+\s*\d+)?\s*[:\.\-–—)]?\s*/i, '')
    // Remove leading numbering or list markers (e.g., 1., 1.1, a), •, -)
    .replace(/^(\d+(\.\d+)*[\.\)\-:]|[a-zA-Z][\.\)]|[•\-\*\>])\s*/, '')
    .trim();
};

/**
 * Checks if a line is part of an administrative signature block, approval footer, or metadata
 */
export const isSignatureOrAdminBlock = (text: string): boolean => {
  if (!text) return false;
  
  // Underlines, date placeholders, blank lines
  if (/_{3,}|Date\s*:\s*_{0,}/i.test(text)) return true;

  // Administrative / Sign-off headings
  if (/^(CONTENTS NOTED BY|PREPARED BY|REVIEWED BY|APPROVED BY|RECOMMENDING APPROVAL|VERIFIED BY|SUBMITTED BY|NOTED BY|CONCURRED BY)/i.test(text)) {
    return true;
  }

  // Academic titles, roles, positions
  if (/\b(Program Coordinator|Department Chair|Chair,?\s*DCS|Dean|Campus Director|Vice President|Instructor|Faculty|Professor|Director)\b/i.test(text)) {
    return true;
  }

  // Common faculty name patterns with academic degrees
  if (/,\s*(MSCS|MIT|MSIT|Ph\.?D|DIT|Ed\.?D|PECE|CPA|RN|LPT|MAEd|MBA|MS|BSCS|BSIT)\b/i.test(text)) {
    return true;
  }

  // Document control or revision headers/footers
  if (/FM-ACAD|Rev\.\d+|Page\s+\d+\s+of\s+\d+/i.test(text)) {
    return true;
  }

  return false;
};

/**
 * Post-processes topics according to academic guidelines:
 * 1. Combines Orientation and Week 1 syllabus/policies into a single Item 1.
 * 2. Stops strictly at Week 18 / Final Exam and discards signature blocks.
 * 3. Strips all "Week X" references from every topic.
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
    const raw = rawTopics[i];
    
    // Stop immediately if any signature block is encountered
    if (isSignatureOrAdminBlock(raw)) {
      break;
    }

    const topic = cleanTopicString(raw);
    if (!topic || topic.length < 3) continue;

    // Check for Vision/Mission/Orientation/Institutional Outcomes/Week 1 Policies
    const isOrientationOrWeek1 = /^(NEMSU|University|College)?\s*(Vision|Mission|Core Values|Quality Policy|Hymn|Institutional Outcomes|Program Outcomes|Course Outcomes|Course Syllabus|Course References|Course Requirements|Course Policies|Grading System|Orientation)/i.test(topic);

    if (isOrientationOrWeek1) {
      if (!hasOrientation) {
        normalized.push('Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System');
        hasOrientation = true;
      }
      continue;
    }

    // Midterm Examination detection
    if (/^Midterm\s*(Exam|Examination|Assessment)?$/i.test(topic)) {
      if (!normalized.includes('Midterm Exam')) {
        normalized.push('Midterm Exam');
      }
      continue;
    }

    // Final Examination detection (stop here!)
    if (/^Final\s*(Exam|Examination|Assessment)?$/i.test(topic)) {
      if (!normalized.includes('Final Exam')) {
        normalized.push('Final Exam');
      }
      // Reached the end of the 18-week learning plan
      break;
    }

    if (!normalized.includes(topic)) {
      normalized.push(topic);
    }
  }

  // Ensure orientation is first
  if (!hasOrientation) {
    normalized.unshift('Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System');
  }

  // Ensure Final Exam is the last item
  if (!normalized.includes('Final Exam')) {
    normalized.push('Final Exam');
  }

  return normalized;
};

/**
 * Extracts clean syllabus topics from text, with support for tab-separated tables
 */
export const extractTopicsFromText = (rawText: string): string[] => {
  if (!rawText) return [];

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rawExtracted: string[] = [];

  const isTable = lines.some(l => l.includes('\t'));

  if (isTable) {
    let topicColIdx = -1;

    for (const line of lines) {
      // If signature block reached, stop
      if (isSignatureOrAdminBlock(line)) break;

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
        if (isSignatureOrAdminBlock(cellContent)) break;

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
    if (isSignatureOrAdminBlock(line)) break;

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
 * "Detailed Course Learning Plan" table. Discards all text and signature blocks outside or after the table.
 */
export const parseWordDocxSyllabus = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

    if (typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tables = Array.from(doc.querySelectorAll('table'));

      const extractedTopics: string[] = [];
      let reachedFinalExam = false;

      for (const table of tables) {
        if (reachedFinalExam) break;

        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length === 0) continue;

        let topicColIndex = -1;

        // Inspect header rows to locate the "TOPICS" column
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

        // Fallback: If table has 4+ columns (OBE layout: Timeframe, Topics, LOs, PIs...), topic is column 1
        if (topicColIndex === -1 && rows[0]?.querySelectorAll('th, td').length >= 4) {
          topicColIndex = 1;
        }

        if (topicColIndex !== -1) {
          for (const row of rows) {
            const rowText = (row.textContent || '').trim();
            
            // Check if signature / noted by block reached
            if (isSignatureOrAdminBlock(rowText)) {
              reachedFinalExam = true;
              break;
            }

            const cells = Array.from(row.querySelectorAll('td'));
            
            // Check if entire row is a banner like "Week 18 - FINAL EXAM" or "MIDTERM EXAM"
            if (/FINAL\s*EXAM/i.test(rowText)) {
              extractedTopics.push('Final Exam');
              reachedFinalExam = true;
              break;
            }
            if (/MIDTERM\s*EXAM/i.test(rowText)) {
              extractedTopics.push('Midterm Exam');
              continue;
            }

            if (cells.length > topicColIndex) {
              const topicCell = cells[topicColIndex];
              const cellText = (topicCell.textContent || '').trim();

              if (isSignatureOrAdminBlock(cellText)) {
                reachedFinalExam = true;
                break;
              }

              const paragraphs = Array.from(topicCell.querySelectorAll('p, li'));
              const items = paragraphs.length > 0 
                ? paragraphs.map(p => (p.textContent || '').trim()).filter(Boolean)
                : [cellText];

              for (const item of items) {
                if (isSignatureOrAdminBlock(item)) {
                  reachedFinalExam = true;
                  break;
                }

                const subLines = item.split(/\r?\n|;/).map(s => cleanTopicString(s)).filter(s => s.length > 3);
                for (const cleaned of subLines) {
                  if (
                    cleaned && 
                    !/^(TOPICS?|COURSE CONTENT|LEARNING OUTCOMES|PERFORMANCE INDICATORS)$/i.test(cleaned) &&
                    !extractedTopics.includes(cleaned)
                  ) {
                    extractedTopics.push(cleaned);
                  }
                }
              }
            }
          }
        }
      }

      if (extractedTopics.length > 0) {
        return normalizeSyllabusTopicList(extractedTopics);
      }
    }

    // 2. Fallback to raw text extraction only if no HTML table was parsed
    const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });
    return extractTopicsFromText(rawText);

  } catch (err) {
    console.error('Error in docx HTML parser, fallback to text:', err);
    const text = await file.text();
    return extractTopicsFromText(text);
  }
};

export const parseDocxSyllabus = parseWordDocxSyllabus;
