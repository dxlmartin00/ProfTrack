import mammoth from 'mammoth';

/**
 * Extracts clean syllabus topics from Word (.docx) ArrayBuffer or raw text string.
 * Detects numbered items (1., Week 1, Module 1, Chapter 1, bullets, etc.)
 */
export const extractTopicsFromText = (rawText: string): string[] => {
  if (!rawText) return [];

  // Split by line breaks
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 3); // Filter out tiny noise lines

  const topics: string[] = [];

  for (const line of lines) {
    // Ignore obvious header metadata
    if (/^(Course Title|Subject Code|Instructor|Department|College|University|Semester|School Year|Prerequisite|Credit Units|Room|Schedule|Time|Class Hours)/i.test(line)) {
      continue;
    }

    // Clean leading bullets, numbers, "Week X:", "Module X:", "Topic X:"
    const cleaned = line
      .replace(/^(\d+[\.\)\-:]|\b(Week|Module|Chapter|Unit|Topic|Lesson)\s*\d+[\.\)\-:]|[•\-\*\>])\s*/i, '')
      .trim();

    if (cleaned.length >= 4 && !topics.includes(cleaned)) {
      topics.push(cleaned);
    }
  }

  // If filtered line count is reasonable, return topics; otherwise return non-empty lines
  return topics.length > 0 ? topics : lines.slice(0, 30);
};

export const parseWordDocxSyllabus = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return extractTopicsFromText(result.value);
  } catch (err) {
    console.error('Failed to parse docx via mammoth, fallback to text reader:', err);
    const text = await file.text();
    return extractTopicsFromText(text);
  }
};

export const parseDocxSyllabus = parseWordDocxSyllabus;
