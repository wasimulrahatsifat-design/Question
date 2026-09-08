import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageOrientation,
  ColumnBreak,
  TabStopType
} from 'docx';
import { saveAs } from 'file-saver';

// Helper to convert English digits to Bengali numerals (e.g. 5 -> ০৫, 15 -> ১৫)
export function toBengaliNumerals(num, padZero = false) {
  if (num === null || num === undefined) return '';
  const val = Number(num);
  let str = isNaN(val) ? String(num) : String(val);
  if (padZero && !isNaN(val) && val >= 0 && val < 10) {
    str = '0' + str;
  }
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
}

// Clean prefixes from options e.g. "ক. পানি" -> "পানি", "1) Water" -> "Water", "(a) Tree" -> "Tree"
export function cleanOptionText(text) {
  if (!text) return '';
  let str = String(text).trim();
  // Strip parenthesized prefix e.g. "(a) ", "(1) ", "(ক) "
  str = str.replace(/^\([a-zA-Z0-9\u09E6-\u09EFক-হivxlcIVXLC]+\)\s*/, '');
  // Strip single/double letter or digits followed strictly by punctuation e.g. "a. ", "1) ", "ক. "
  str = str.replace(/^([0-9\u09E6-\u09EF]+|[a-zA-Z]{1,2}|[ক-হ])[\.\)\।\-\:]\s*/, '');
  return str.trim();
}

// Clean prefixes from questions e.g. "১) টাইফয়েড" -> "টাইফয়েড", "a) Where is..." -> "Where is..."
export function cleanQuestionText(text) {
  if (!text) return '';
  let str = String(text).trim();
  // Strip parenthesized prefix e.g. "(a) ", "(1) ", "(১) ", "(ক) "
  str = str.replace(/^\([a-zA-Z0-9\u09E6-\u09EFক-হivxlcIVXLC]+\)\s*/, '');
  // Strip single/double letter, roman numerals, digits followed strictly by punctuation e.g. "a) ", "1. ", "১। ", "ক) "
  // Punctuation is strictly required so that regular words like "Can", "Where", "Today", "Protect" are NEVER stripped!
  str = str.replace(/^([0-9\u09E6-\u09EF]+|[a-zA-Z]{1,2}|[ivxlcIVXLC]{1,4}|[ক-হ])[\.\)\।\-\:]\s*/, '');
  // Strip arithmetic instruction prefixes e.g. "গুণ কর:", "ভাগ কর:", "হিসাব কর:"
  str = str.replace(/^(গুণ\s*কর|ভাগ\s*কর|হিসাব\s*কর|গুণফল\s*নির্ণয়\s*কর|ভাগফল\s*নির্ণয়\s*কর|মান\s*নির্ণয়\s*কর)[\s\:\।\-\–]+/i, '');
  // Strip any accidental page reference tags from question text e.g. "[পৃষ্ঠা: ৫]", "[পৃষ্ঠা ৫]", "(পৃষ্ঠা: ৫)", "[পৃষ্ঠা নং- ৫]"
  str = str.replace(/[\(\[]\s*পৃষ্ঠা[\s\:\-–নং\.০-৯0-9a-zA-Z]+\s*[\)\]]/gi, '');
  return str.trim();
}

const bnSubLetters = ['ক)', 'খ)', 'গ)', 'ঘ)', 'ঙ)', 'চ)', 'ছ)', 'জ)', 'ঝ)', 'ঞ)'];
const enSubLetters = ['a)', 'b)', 'c)', 'd)', 'e)', 'f)', 'g)', 'h)', 'i)', 'j)'];
const enRomanNumerals = ['i)', 'ii)', 'iii)', 'iv)', 'v)', 'vi)', 'vii)', 'viii)', 'ix)', 'x)'];
const bnOptPrefixes = ['ক.', 'খ.', 'গ.', 'ঘ.'];

// Helper to safely shuffle array for matching column
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (shuffled.length > 1 && JSON.stringify(shuffled) === JSON.stringify(array)) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

const ZERO_SPACING = { before: 0, after: 0, line: 240, lineRule: 'auto' };
const ZERO_INDENT = { left: 0, right: 0, firstLine: 0, hanging: 0 };

export async function exportQuestionPaperDocx({
  schoolName = 'শওকত ভূঁইয়া চাইল্ড কেয়ার হোমস্',
  schoolSubtitle = 'প্রি-ক্যাডেট চাইল্ড কেয়ার হোমস্',
  className = 'পঞ্চম',
  subject = 'বিজ্ঞান',
  examTitle = '২য় সেমিস্টার পরীক্ষা- ২০২৬ ইং',
  timeAllowed = '২ ঘণ্টা',
  fullMarks = '১০০',
  sections = [],
  includeAnswers = false,
  orientation = 'landscape',
  columnCount = 2,
  paperSize = 'A4',
}) {
  const isEnglish = Boolean(subject && (subject.includes('ইংরেজি') || subject.toLowerCase().includes('english')));
  const fontName = isEnglish ? 'Times New Roman' : 'Kalpurush';
  const FONT_RUN = {
    name: fontName,
    ascii: fontName,
    hAnsi: fontName,
    cs: fontName,
    eastAsia: fontName,
  };

  const totalCalculated = sections.reduce(
    (sum, sec) => sum + (sec.questions?.length || 0) * (sec.marksPerQuestion || 1),
    0
  );
  const displayMarks = isEnglish 
    ? (fullMarks || totalCalculated) 
    : (fullMarks ? toBengaliNumerals(fullMarks) : toBengaliNumerals(totalCalculated));

  const docChildren = [];

  // ==================== 1. HEADER ====================
  if (!includeAnswers) {
    // QUESTION PAPER HEADER
    // Line 1: School Name Line 1
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: ZERO_SPACING,
        indent: ZERO_INDENT,
        children: [
          new TextRun({ 
            text: isEnglish && schoolName === 'শওকত ভূঁইয়া চাইল্ড কেয়ার হোমস্' ? 'Showkot Bhuiyan Child Care Homes' : schoolName, 
            bold: true, 
            size: 32, // 16pt
            font: FONT_RUN 
          }),
        ],
      })
    );

    // Line 2: School Name Line 2
    if (schoolSubtitle && schoolSubtitle.trim()) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: ZERO_SPACING,
          indent: ZERO_INDENT,
          children: [
            new TextRun({ 
              text: isEnglish && schoolSubtitle.trim() === 'প্রি-ক্যাডেট চাইল্ড কেয়ার হোমস্' ? 'Pre-Cadet Child Care Homes' : schoolSubtitle.trim(), 
              bold: true, 
              size: 32, // 16pt
              font: FONT_RUN 
            }),
          ],
        })
      );
    }

    // Line 3: Exam Title
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: ZERO_SPACING,
        indent: ZERO_INDENT,
        children: [
          new TextRun({
            text: isEnglish && examTitle === '২য় সেমিস্টার পরীক্ষা- ২০২৬ ইং' ? '2ⁿᵈ Semester Examination- 2026' : examTitle,
            bold: true,
            size: 28, // 14pt
            font: FONT_RUN,
          }),
        ],
      })
    );

    // Line 4: Subject
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: ZERO_SPACING,
        indent: ZERO_INDENT,
        children: [
          new TextRun({ text: isEnglish ? 'Subject- ' : 'বিষয়: ', bold: true, font: FONT_RUN, size: 24 }),
          new TextRun({ text: `${subject}`, bold: true, font: FONT_RUN, size: 24 }),
        ],
      })
    );

    // Line 5: Class
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: ZERO_SPACING,
        indent: ZERO_INDENT,
        children: [
          new TextRun({ text: isEnglish ? 'Class- ' : 'শ্রেণি: ', bold: true, font: FONT_RUN, size: 24 }),
          new TextRun({ text: `${isEnglish ? (className === 'পঞ্চম' ? 'Five' : className) : toBengaliNumerals(className)}`, bold: true, font: FONT_RUN, size: 24 }),
        ],
      })
    );

    // Line 6: Time & Full marks
    docChildren.push(
      new Paragraph({
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: 7200,
          },
        ],
        spacing: ZERO_SPACING,
        indent: ZERO_INDENT,
        children: [
          new TextRun({ text: isEnglish ? 'Time: ' : 'সময়: ', bold: isEnglish, font: FONT_RUN, size: 20 }),
          new TextRun({ text: `${isEnglish && timeAllowed === '২ ঘণ্টা' ? '2hr' : timeAllowed}`, bold: isEnglish, font: FONT_RUN, size: 20 }),
          new TextRun({ text: `\t` }),
          new TextRun({ text: isEnglish ? 'Full marks: ' : 'পূর্ণমান: ', bold: isEnglish, font: FONT_RUN, size: 20 }),
          new TextRun({ text: `${displayMarks}`, bold: isEnglish, font: FONT_RUN, size: 20 }),
        ],
      })
    );

  } else {
    // ANSWER KEY COMPACT HEADER
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: ZERO_SPACING,
        indent: ZERO_INDENT,
        children: [
          new TextRun({ 
            text: `${examTitle} - ${isEnglish ? 'Answer Key' : 'উত্তরমালা'}`, 
            bold: true, 
            size: 28, // 14pt
            color: 'B91C1C', 
            font: FONT_RUN 
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: ZERO_SPACING,
        indent: ZERO_INDENT,
        children: [
          new TextRun({ text: `${isEnglish ? 'Subject: ' : 'বিষয়: '}${subject}  |  ${isEnglish ? 'Class: ' : 'শ্রেণি: '}${isEnglish ? className : toBengaliNumerals(className)}  |  ${isEnglish ? 'Full Marks: ' : 'পূর্ণমান: '}${displayMarks}`, bold: true, font: FONT_RUN, size: 24 }),
        ],
      })
    );
  }

  // ==================== 2. QUESTIONS ====================
  const splitIndex = sections.length >= 6 ? 2 : Math.ceil(sections.length / 2);

  sections.forEach((section, sIndex) => {
    if (columnCount === 2 && sIndex === splitIndex) {
      docChildren.push(
        new Paragraph({
          spacing: ZERO_SPACING,
          indent: ZERO_INDENT,
          children: [new ColumnBreak()],
        })
      );
    }

    const qCount = section.questions?.length || (section.count || 0);
    const markPerQ = section.marksPerQuestion !== undefined ? section.marksPerQuestion : 1;
    const totalSecMarks = section.id?.includes('oral') ? (section.marksPerQuestion || 15) : (Math.round(qCount * markPerQ * 10) / 10);
    const sectionNumStr = isEnglish ? `${sIndex + 1}.` : `${toBengaliNumerals(sIndex + 1)}।`;
    const secMarksStr = isEnglish 
      ? (totalSecMarks < 10 ? `0${totalSecMarks}` : String(totalSecMarks)) 
      : toBengaliNumerals(totalSecMarks, true);

    const isOralSection = section.id === 'oral' || section.id?.endsWith('_oral') || (section.title && section.title.includes('মৌখিক'));
    const isMatchSection = (section.id?.includes('match') || section.title?.includes('মিল') || section.title?.toLowerCase().includes('match')) && !section.title?.toLowerCase().includes('question') && !section.id?.includes('questions');
    const isFibSection = section.id?.includes('fib') || section.title?.includes('শূন্যস্থান') || section.title?.toLowerCase().includes('fill in the blank');
    const isTfSection = section.id?.includes('tf') || section.title?.includes('সত্য/মিথ্যা') || section.title?.includes('সত্য-মিথ্যা') || section.title?.toLowerCase().includes('true or false') || section.title?.toLowerCase().includes('true/false');
    const isMcq = section.id?.includes('mcq') || section.title?.includes('সঠিক উত্তর') || (section.questions?.[0]?.options?.length > 0);

    const isVocab = section.id?.includes('vocab') || section.id?.includes('word_meaning') || section.title?.includes('শব্দার্থ') || section.title?.toLowerCase().includes('word meaning');
    const isSentence = section.id?.includes('sentence') || section.id?.includes('make_sentence') || section.title?.includes('বাক্য গঠন') || section.title?.toLowerCase().includes('make sentence');
    const isPoem = section.id?.includes('poem') || section.title?.includes('কবিতা');
    const isPunctuation = section.id?.includes('punctuation') || section.title?.includes('বিরাম') || section.title?.toLowerCase().includes('punctuation') || section.title?.toLowerCase().includes('capital letters');
    const isComposition = section.id?.includes('composition') || section.title?.toLowerCase().includes('composition') || section.title?.includes('রচনা');
    const isConjunct = section.id?.includes('conjunct') || section.title?.includes('যুক্তবর্ণ');
    const isSinglePrompt = isPunctuation || isComposition || ((section.id?.includes('theme') || section.id?.includes('desc') || section.id?.includes('long') || section.title?.includes('মূলভাব') || section.title?.includes('বর্ণনামূলক') || section.title?.includes('দরখাস্ত') || section.title?.includes('চিঠি')) && section.questions?.length <= 1);
    const isInlineComma = isVocab || isSentence || isConjunct;

    const isSingleMathProblem = section.questions?.length === 1 && (section.id?.startsWith('math_word') || section.id?.startsWith('math_problem') || section.id === 'math_lcm_gcd');
    const isMathGrid = (
      section.id === 'math_blank_box' ||
      section.id === 'math_mul_div' ||
      section.id === 'math_decimal_mul_div' ||
      section.title?.includes('খালি ঘর') ||
      (section.title?.includes('গুণ') && (section.title?.includes('ভাগ') || section.title?.includes('কর'))) ||
      section.title?.includes('ভাগ কর') ||
      section.title?.includes('গুণ কর') ||
      section.title?.includes('দশমিকের গুণ')
    ) && (section.questions?.length >= 4);

    // Display title: For poem, composition, or single math problem, format the single header line
    let displayTitle = section.title;
    if (isPoem && section.questions?.[0]?.questionText) {
      displayTitle = cleanQuestionText(section.questions[0].questionText).replace(/^\d+[\।\.\-\s]+/, '').replace(/^[\u09E6-\u09EF]+[\।\.\-\s]+/, '');
    } else if (isSingleMathProblem && section.questions?.[0]?.questionText) {
      displayTitle = cleanQuestionText(section.questions[0].questionText).replace(/^\d+[\।\.\-\s]+/, '').replace(/^[\u09E6-\u09EF]+[\।\.\-\s]+/, '');
    } else if (isComposition) {
      const qText = cleanQuestionText(section.questions?.[0]?.questionText || section.title || '').replace(/^\d+[\.\।\-\s]+/, '');
      if (qText.toLowerCase().startsWith('write a composition about')) {
        displayTitle = qText;
      } else {
        const match = qText.match(/[“"']([^“"']+)["'”]/);
        if (match) {
          displayTitle = `Write a composition about “${match[1]}”`;
        } else if (qText) {
          displayTitle = `Write a composition about “${qText}”`;
        } else {
          displayTitle = `Write a composition about “The Sundarbans”`;
        }
      }
    }

    // Section Header Line: ১। সঠিক উত্তরটি খাতায় লিখ             ০৫ (Size 12pt, Bold, Spacing 0)
    // Note: For Sections 6-9 single math problems, question number is bold, but problem body is unbolded as requested!
    if (isSingleMathProblem) {
      docChildren.push(
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: 7200,
            },
          ],
          spacing: ZERO_SPACING,
          indent: ZERO_INDENT,
          children: [
            new TextRun({ 
              text: `${sectionNumStr} `, 
              bold: true, 
              font: FONT_RUN, 
              size: 24 // 12pt
            }),
            new TextRun({ 
              text: `${displayTitle}`, 
              bold: false, // User requested: ৬ থেকে ৯ নং বোল্ড হবে না
              font: FONT_RUN, 
              size: 24 // 12pt
            }),
            new TextRun({ text: `\t` }),
            new TextRun({ 
              text: `${secMarksStr}`, 
              bold: true, 
              font: FONT_RUN, 
              size: 24 // 12pt
            }),
          ],
        })
      );
    } else {
      docChildren.push(
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: 7200,
            },
          ],
          spacing: ZERO_SPACING,
          indent: ZERO_INDENT,
          children: [
            new TextRun({ 
              text: `${sectionNumStr} ${displayTitle}`, 
              bold: true, 
              font: FONT_RUN, 
              size: 24 // 12pt
            }),
            new TextRun({ text: `\t` }),
            new TextRun({ 
              text: `${secMarksStr}`, 
              bold: true, 
              font: FONT_RUN, 
              size: 24 // 12pt
            }),
          ],
        })
      );
    }

    // 1. ORAL or POEM or COMPOSITION or SINGLE MATH PROBLEM SECTION: Has all info in heading, no extra question below
    if (isOralSection || isPoem || isComposition || isSingleMathProblem) {
      if (includeAnswers && (isComposition || isSingleMathProblem) && section.questions?.[0]?.answer) {
        docChildren.push(
          new Paragraph({
            spacing: ZERO_SPACING,
            indent: ZERO_INDENT,
            children: [
              new TextRun({ text: isComposition ? 'Model Composition: ' : 'সমাধান/উত্তর: ', bold: true, color: '047857', size: 24, font: FONT_RUN }),
              new TextRun({ text: `${section.questions[0].answer}`, color: '065F46', size: 24, font: FONT_RUN }),
            ],
          })
        );
      }
      return;
    }

    // 2. MATCHING SECTION (The Boxed Table)
    if (isMatchSection && section.questions && section.questions.length > 0) {
      const leftItems = [];
      const rightItemsRaw = [];

      section.questions.forEach((q) => {
        let left = cleanQuestionText(q.questionText || '');
        let right = cleanQuestionText(q.answer || '');
        if (left.includes(':')) {
          const parts = left.split(':');
          left = parts[0];
          right = parts[1] || right;
        }
        leftItems.push({ text: left.trim(), originalAnswer: right.trim() });
        rightItemsRaw.push(right.trim());
      });

      // Shuffled right column
      const rightItems = shuffleArray(rightItemsRaw);

      const tableRows = [];

      // Header Row: বামপাশ | ডানপাশ (Size 12pt = 24, Spacing 0)
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: ZERO_SPACING,
                  indent: ZERO_INDENT,
                  children: [
                    new TextRun({ text: isEnglish ? 'Column A' : 'বামপাশ', bold: true, font: FONT_RUN, size: 24 }),
                  ],
                }),
              ],
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              },
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: ZERO_SPACING,
                  indent: ZERO_INDENT,
                  children: [
                    new TextRun({ text: isEnglish ? 'Column B' : 'ডানপাশ', bold: true, font: FONT_RUN, size: 24 }),
                  ],
                }),
              ],
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              },
            }),
          ],
        })
      );

      // Data Rows (Size 12pt = 24, Spacing 0)
      leftItems.forEach((item, idx) => {
        const leftLetter = (isEnglish ? enSubLetters[idx] : bnSubLetters[idx]) || `${idx + 1})`;
        const rightPrefix = isEnglish ? `${enRomanNumerals[idx] || `${idx + 1})`} ` : '';
        const rightText = rightItems[idx] || '';

        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    spacing: ZERO_SPACING,
                    indent: ZERO_INDENT,
                    children: [
                      new TextRun({ text: `${leftLetter} `, bold: true, font: FONT_RUN, size: 24 }),
                      new TextRun({ text: `${item.text}`, font: FONT_RUN, size: 24 }),
                    ],
                  }),
                ],
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
                  bottom: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  right: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
                },
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    spacing: ZERO_SPACING,
                    indent: ZERO_INDENT,
                    children: [
                      new TextRun({ text: `${rightPrefix}${rightText}`, font: FONT_RUN, size: 24 }),
                    ],
                  }),
                ],
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
                  bottom: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
                  left: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                },
              }),
            ],
          })
        );
      });

      const matchTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        },
        rows: tableRows,
      });

      docChildren.push(matchTable);

      // Answer Key match line
      if (includeAnswers) {
        docChildren.push(
          new Paragraph({
            spacing: ZERO_SPACING,
            indent: ZERO_INDENT,
            children: [
              new TextRun({ text: `${isEnglish ? 'Answer: ' : 'উত্তর: '}`, bold: true, color: '047857', font: FONT_RUN, size: 24 }),
              new TextRun({ 
                text: `${leftItems.map((item, idx) => `${(isEnglish ? enSubLetters[idx] : bnSubLetters[idx]) || ''} ${item.text} → ${item.originalAnswer}`).join(';  ')}`, 
                color: '047857', 
                font: FONT_RUN, 
                size: 24 
              }),
            ],
          })
        );
      }

    } else if (isInlineComma) {
      // 3. INLINE COMMA SECTIONS: শব্দার্থ লিখ, বাক্য গঠন কর, যুক্তবর্ণ
      // Question: All items in 1 line separated by commas without ক, খ
      const commaWords = (section.questions || [])
        .map((q) => cleanQuestionText(q.questionText))
        .filter(Boolean)
        .join(', ');

      docChildren.push(
        new Paragraph({
          spacing: ZERO_SPACING,
          indent: ZERO_INDENT,
          children: [
            new TextRun({ text: `${commaWords}`, font: FONT_RUN, size: 24 }),
          ],
        })
      );

      // Answer Key for Vocab / Sentence / Conjunct (Line by line, without ক, খ)
      if (includeAnswers) {
        (section.questions || []).forEach((q) => {
          const rawAns = (q.answer || '').trim();
          const qWord = cleanQuestionText(q.questionText || '').trim();
          let lineText = rawAns;

          if (isVocab) {
            if (rawAns.includes('=')) {
              lineText = rawAns;
            } else if (rawAns) {
              lineText = `${qWord} = ${rawAns}`;
            } else {
              lineText = qWord;
            }
          } else if (isSentence) {
            if (rawAns.includes('-') || rawAns.includes('–') || rawAns.startsWith(qWord)) {
              lineText = rawAns;
            } else if (rawAns) {
              lineText = `${qWord}- ${rawAns}`;
            } else {
              lineText = qWord;
            }
          } else if (isConjunct) {
            if (rawAns.includes('=')) {
              lineText = rawAns;
            } else if (rawAns) {
              lineText = `${qWord}= ${rawAns}`;
            } else {
              lineText = qWord;
            }
          }

          docChildren.push(
            new Paragraph({
              spacing: ZERO_SPACING,
              indent: ZERO_INDENT,
              children: [
                new TextRun({ text: `  ${lineText}`, color: '065F46', size: 24, font: FONT_RUN }),
              ],
            })
          );
        });
      }

    } else if (isMathGrid) {
      // 4. MATH EQUATION GRID: 2 rows (Row 1: ক, খ, গ; Row 2: ঘ, ঙ) with 5-6 space gap
      const questions = section.questions || [];
      const row1 = questions.slice(0, 3);
      const row2 = questions.slice(3);

      if (row1.length > 0) {
        const row1Runs = [];
        row1.forEach((q, idx) => {
          let cleanQ = cleanQuestionText(q.questionText);
          const letter = (isEnglish ? enSubLetters[idx] : bnSubLetters[idx]) || `${idx + 1})`;
          row1Runs.push(
            new TextRun({ text: `${letter} `, bold: true, font: FONT_RUN, size: 24 }),
            new TextRun({ text: `${cleanQ}${idx < row1.length - 1 ? '      ' : ''}`, font: FONT_RUN, size: 24 })
          );
        });
        docChildren.push(
          new Paragraph({
            spacing: ZERO_SPACING,
            indent: ZERO_INDENT,
            children: row1Runs,
          })
        );
      }

      if (row2.length > 0) {
        const row2Runs = [];
        row2.forEach((q, idx) => {
          let cleanQ = cleanQuestionText(q.questionText);
          const letter = (isEnglish ? enSubLetters[idx + row1.length] : bnSubLetters[idx + row1.length]) || `${idx + row1.length + 1})`;
          row2Runs.push(
            new TextRun({ text: `${letter} `, bold: true, font: FONT_RUN, size: 24 }),
            new TextRun({ text: `${cleanQ}${idx < row2.length - 1 ? '      ' : ''}`, font: FONT_RUN, size: 24 })
          );
        });
        docChildren.push(
          new Paragraph({
            spacing: ZERO_SPACING,
            indent: ZERO_INDENT,
            children: row2Runs,
          })
        );
      }

      // Answer key for Math Grid
      if (includeAnswers) {
        const ansRuns = [];
        questions.forEach((q, idx) => {
          if (q.answer) {
            const letter = (isEnglish ? enSubLetters[idx] : bnSubLetters[idx]) || `${idx + 1})`;
            ansRuns.push(
              new TextRun({ text: `${letter} `, bold: true, color: '047857', font: FONT_RUN, size: 24 }),
              new TextRun({ text: `${q.answer}${idx < questions.length - 1 ? '  |  ' : ''}`, color: '065F46', font: FONT_RUN, size: 24 })
            );
          }
        });
        if (ansRuns.length > 0) {
          docChildren.push(
            new Paragraph({
              spacing: ZERO_SPACING,
              indent: ZERO_INDENT,
              children: [
                new TextRun({ text: `${isEnglish ? 'Answers: ' : 'উত্তর: '}`, bold: true, color: '047857', font: FONT_RUN, size: 24 }),
                ...ansRuns,
              ],
            })
          );
        }
      }

    } else if (isSinglePrompt) {
      // 4. SINGLE PROMPT SECTIONS: কবিতা, বিরামচিহ্ন, গল্পের মূলভাব
      const singleQ = section.questions?.[0];
      const qText = cleanQuestionText(singleQ?.questionText || '');

      docChildren.push(
        new Paragraph({
          spacing: ZERO_SPACING,
          indent: ZERO_INDENT,
          children: [
            new TextRun({ text: `${qText}`, font: FONT_RUN, size: 24 }),
          ],
        })
      );

      // In Answer Key: omit for poem, full text for punctuation & theme
      if (includeAnswers && !isPoem && singleQ?.answer) {
        docChildren.push(
          new Paragraph({
            spacing: ZERO_SPACING,
            indent: ZERO_INDENT,
            children: [
              new TextRun({ text: `${isEnglish ? 'Answer: ' : 'উত্তর: '}`, bold: true, color: '047857', size: 24, font: FONT_RUN }),
              new TextRun({ text: `${singleQ.answer}`, color: '065F46', size: 24, font: FONT_RUN }),
            ],
          })
        );
      }

    } else {
      // 5. STANDARD NUMBERED SECTIONS: MCQ, শূন্যস্থান, সত্য-মিথ্যা, প্রশ্নোত্তর (with a), b), c) or ক, খ, গ...)
      (section.questions || []).forEach((q, qIndex) => {
        let cleanQ = cleanQuestionText(q.questionText);
        const prefix = isMcq 
          ? (isEnglish ? `${qIndex + 1}) ` : `${toBengaliNumerals(qIndex + 1)}) `) 
          : (isEnglish ? `${enSubLetters[qIndex] || `${qIndex + 1})`} ` : `${bnSubLetters[qIndex] || `(${qIndex + 1})`} `);

        // Fill in Blanks in Answer Key
        if (includeAnswers && isFibSection && q.answer) {
          if (cleanQ.includes('_______')) {
            cleanQ = cleanQ.replace('_______', ` __${q.answer.trim()}__ `);
          } else {
            cleanQ = `${cleanQ} __${q.answer.trim()}__`;
          }
        }

        // True/False in Answer Key
        let tfAnswerSuffix = '';
        if (includeAnswers && isTfSection && q.answer) {
          const ansClean = q.answer.trim();
          tfAnswerSuffix = `   [${ansClean}]`;
        }

        // Question Line (Size 12pt = 24, Spacing 0)
        docChildren.push(
          new Paragraph({
            spacing: ZERO_SPACING,
            indent: ZERO_INDENT,
            children: [
              new TextRun({ text: `${prefix}`, bold: true, font: FONT_RUN, size: 24 }), // 12pt
              new TextRun({ text: `${cleanQ}`, font: FONT_RUN, size: 24 }),             // 12pt
              ...(tfAnswerSuffix ? [new TextRun({ text: tfAnswerSuffix, bold: true, color: '047857', font: FONT_RUN, size: 24 })] : []),
            ],
          })
        );

        // MCQ Options: a. Option 1     b. Option 2 OR ক. অপশন ১     খ. অপশন ২
        if (q.options && q.options.length > 0) {
          const optRuns = [];
          const cleanAns = cleanOptionText(q.answer);

          q.options.slice(0, 2).forEach((opt, optIdx) => {
            const cleanOpt = cleanOptionText(opt);
            const optLabel = isEnglish ? (enOptPrefixes[optIdx] || `${optIdx + 1}.`) : (bnOptPrefixes[optIdx] || `${optIdx + 1}.`);
            const isCorrect = includeAnswers && (cleanOpt === cleanAns || q.answer?.includes(cleanOpt) || optIdx === 0 && !cleanAns);

            optRuns.push(
              new TextRun({
                text: `${optLabel} ${cleanOpt}${isCorrect ? ' (✔)' : ''}        `,
                bold: isCorrect,
                color: isCorrect ? '047857' : '000000',
                font: FONT_RUN,
                size: 24, // 12pt
              })
            );
          });

          docChildren.push(
            new Paragraph({
              spacing: ZERO_SPACING,
              indent: ZERO_INDENT,
              children: [
                new TextRun({ text: '    ' }),
                ...optRuns,
              ],
            })
          );
        }

        // Answer Key for Short / Descriptive Questions (Omit for MCQ, FIB, TF)
        if (includeAnswers && !isFibSection && !isTfSection && !isMcq && !(q.options && q.options.length > 0) && q.answer) {
          const ansLines = String(q.answer).split('\n').map((l) => l.trim()).filter(Boolean);
          if (ansLines.length > 0) {
            ansLines.forEach((line, lIdx) => {
              docChildren.push(
                new Paragraph({
                  spacing: ZERO_SPACING,
                  indent: ZERO_INDENT,
                  children: [
                    ...(lIdx === 0 
                      ? [new TextRun({ text: `  ${isEnglish ? 'Ans: ' : 'উ: '}`, bold: true, color: '047857', font: FONT_RUN, size: 24 })] 
                      : [new TextRun({ text: '      ', font: FONT_RUN, size: 24 })]),
                    new TextRun({ text: `${line}`, color: '065F46', font: FONT_RUN, size: 24 }),
                  ],
                })
              );
            });
          }
        }
      });
    }
  });

  // ==================== 3. PAGE SETUP (A4 LANDSCAPE 2-COLUMN) ====================
  const isLandscape = orientation === 'landscape';
  const pageWidth = isLandscape ? 16838 : 11906;  // A4: 297mm x 210mm
  const pageHeight = isLandscape ? 11906 : 16838;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_RUN,
            size: 24, // 12pt
          },
          paragraph: {
            spacing: ZERO_SPACING,
            indent: ZERO_INDENT,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
              width: pageWidth,
              height: pageHeight,
            },
            margin: {
              top: 450,
              right: 450,
              bottom: 450,
              left: 450,
            },
          },
          column: {
            count: Number(columnCount) || 2,
            space: 500,
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanSub = (subject || 'QuestionPaper').replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_');
  const filename = `${cleanSub}_${examTitle.replace(/[\s/]/g, '_')}_${includeAnswers ? 'AnswerKey' : 'QuestionPaper'}.docx`;
  saveAs(blob, filename);
}
