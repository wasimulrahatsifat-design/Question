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

// Clean prefixes from options e.g. "ক. পানি" -> "পানি"
export function cleanOptionText(text) {
  if (!text) return '';
  return String(text).replace(/^[কখগঘabcdABCD\d]+[\.\)\-\:\s]+/i, '').trim();
}

// Clean prefixes from questions e.g. "১) টাইফয়েড" -> "টাইফয়েড"
export function cleanQuestionText(text) {
  if (!text) return '';
  return String(text).replace(/^[ক-ঞa-zA-Z\d]+[\.\)\-\:\s]+/i, '').trim();
}

const bnSubLetters = ['ক)', 'খ)', 'গ)', 'ঘ)', 'ঙ)', 'চ)', 'ছ)', 'জ)', 'ঝ)', 'ঞ)'];
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
  const fontName = 'Kalpurush';
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
  const displayMarks = fullMarks ? toBengaliNumerals(fullMarks) : toBengaliNumerals(totalCalculated);

  const docChildren = [];

  // ==================== 1. HEADER ====================
  if (!includeAnswers) {
    // QUESTION PAPER HEADER
    // Line 1: School Name Line 1 -> Size: 16pt (32 in half-points), Bold, Spacing 0
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: ZERO_SPACING,
        indent: ZERO_INDENT,
        children: [
          new TextRun({ 
            text: schoolName, 
            bold: true, 
            size: 32, // 16pt
            font: FONT_RUN 
          }),
        ],
      })
    );

    // Line 2: School Name Line 2 -> Size: 16pt (32 in half-points), Bold, Spacing 0
    if (schoolSubtitle && schoolSubtitle.trim()) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: ZERO_SPACING,
          indent: ZERO_INDENT,
          children: [
            new TextRun({ 
              text: schoolSubtitle.trim(), 
              bold: true, 
              size: 32, // 16pt (Both schools exact same size 16)
              font: FONT_RUN 
            }),
          ],
        })
      );
    }

    // Line 3: Exam Title -> Size: 14pt (28 in half-points), Bold, Spacing 0
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: ZERO_SPACING,
        indent: ZERO_INDENT,
        children: [
          new TextRun({
            text: examTitle,
            bold: true,
            size: 28, // 14pt
            font: FONT_RUN,
          }),
        ],
      })
    );

    // Line 4: Subject -> Size: 12pt (24 in half-points), Spacing 0
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: ZERO_SPACING,
        indent: ZERO_INDENT,
        children: [
          new TextRun({ text: `বিষয়: `, bold: true, font: FONT_RUN, size: 24 }),
          new TextRun({ text: `${subject}`, bold: true, font: FONT_RUN, size: 24 }),
        ],
      })
    );

    // Line 5: Class -> Size: 12pt (24 in half-points), Spacing 0
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: ZERO_SPACING,
        indent: ZERO_INDENT,
        children: [
          new TextRun({ text: `শ্রেণি: `, bold: true, font: FONT_RUN, size: 24 }),
          new TextRun({ text: `${toBengaliNumerals(className)}`, bold: true, font: FONT_RUN, size: 24 }),
        ],
      })
    );

    // Line 6: সময়: ২ ঘণ্টা ................ পূর্ণমান: ১০০ -> Size: 10pt (20 in half-points), NOT BOLD, Spacing 0
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
          new TextRun({ text: `সময়: `, bold: false, font: FONT_RUN, size: 20 }), // 10pt not bold
          new TextRun({ text: `${timeAllowed}`, bold: false, font: FONT_RUN, size: 20 }),
          new TextRun({ text: `\t` }),
          new TextRun({ text: `পূর্ণমান: `, bold: false, font: FONT_RUN, size: 20 }),
          new TextRun({ text: `${displayMarks}`, bold: false, font: FONT_RUN, size: 20 }),
        ],
      })
    );

  } else {
    // ANSWER KEY COMPACT HEADER -> Spacing 0, Indent 0, Size 12pt
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: ZERO_SPACING,
        indent: ZERO_INDENT,
        children: [
          new TextRun({ 
            text: `${examTitle} - উত্তরমালা`, 
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
          new TextRun({ text: `বিষয়: ${subject}  |  শ্রেণি: ${toBengaliNumerals(className)}  |  পূর্ণমান: ${displayMarks}`, bold: true, font: FONT_RUN, size: 24 }),
        ],
      })
    );
  }

  // ==================== 2. QUESTIONS (EXACT FONT SIZE 12pt = 24, ZERO SPACING, ZERO INDENT) ====================
  const splitIndex = sections.length >= 6 ? 2 : Math.ceil(sections.length / 2);

  sections.forEach((section, sIndex) => {
    // Column break between Left and Right columns in 2-column mode
    if (columnCount === 2 && sIndex === splitIndex) {
      docChildren.push(
        new Paragraph({
          spacing: ZERO_SPACING,
          indent: ZERO_INDENT,
          children: [new ColumnBreak()],
        })
      );
    }

    const qCount = section.questions?.length || 0;
    const markPerQ = section.marksPerQuestion || 1;
    const totalSecMarks = section.id.includes('oral') ? (section.marksPerQuestion || 15) : (qCount * markPerQ);
    const sectionNumStr = `${toBengaliNumerals(sIndex + 1)}।`;
    const secMarksStr = toBengaliNumerals(totalSecMarks, true);

    const isOralSection = section.id?.includes('oral') || section.title?.includes('মৌখিক');
    const isMatchSection = section.id?.includes('match') || section.title?.includes('মিল') || section.title?.toLowerCase().includes('match');
    const isFibSection = section.id?.includes('fib') || section.title?.includes('শূন্যস্থান');
    const isTfSection = section.id?.includes('tf') || section.title?.includes('সত্য/মিথ্যা') || section.title?.includes('সত্য অথবা মিথ্যা') || section.title?.includes('সত্য-মিথ্যা');
    const isMcq = section.id?.includes('mcq') || section.title?.includes('সঠিক উত্তর') || (section.questions?.[0]?.options?.length > 0);

    const isVocab = section.id?.includes('vocab') || section.title?.includes('শব্দার্থ');
    const isSentence = section.id?.includes('sentence') || section.title?.includes('বাক্য গঠন');
    const isPoem = section.id?.includes('poem') || section.title?.includes('কবিতা');
    const isPunctuation = section.id?.includes('punctuation') || section.title?.includes('বিরাম');
    const isConjunct = section.id?.includes('conjunct') || section.title?.includes('যুক্তবর্ণ');
    const isSinglePrompt = isPunctuation || ((section.id?.includes('theme') || section.id?.includes('desc') || section.id?.includes('long') || section.title?.includes('মূলভাব') || section.title?.includes('বর্ণনামূলক') || section.title?.includes('রচনা') || section.title?.includes('দরখাস্ত') || section.title?.includes('চিঠি')) && section.questions?.length <= 1);
    const isInlineComma = isVocab || isSentence || isConjunct;

    // Display title: For poem, use the exact poem prompt with quotes
    let displayTitle = section.title;
    if (isPoem && section.questions?.[0]?.questionText) {
      displayTitle = cleanQuestionText(section.questions[0].questionText).replace(/^\d+[\।\.\-\s]+/, '').replace(/^[\u09E6-\u09EF]+[\।\.\-\s]+/, '');
    }

    // Section Header Line: ১। সঠিক উত্তরটি খাতায় লিখ             ০৫ (Size 12pt, Bold, Spacing 0)
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

    // 1. ORAL or POEM SECTION: Poem has all info in heading, no extra question below
    if (isOralSection || isPoem) {
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
                    new TextRun({ text: 'বামপাশ', bold: true, font: FONT_RUN, size: 24 }),
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
                    new TextRun({ text: 'ডানপাশ', bold: true, font: FONT_RUN, size: 24 }),
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
        const leftLetter = bnSubLetters[idx] || `${idx + 1})`;
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
                      new TextRun({ text: `${rightText}`, font: FONT_RUN, size: 24 }),
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
              new TextRun({ text: `উত্তর: `, bold: true, color: '047857', font: FONT_RUN, size: 24 }),
              new TextRun({ 
                text: `${leftItems.map((item, idx) => `${bnSubLetters[idx]} ${item.text} → ${item.originalAnswer}`).join(';  ')}`, 
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
              new TextRun({ text: `উত্তর: `, bold: true, color: '047857', size: 24, font: FONT_RUN }),
              new TextRun({ text: `${singleQ.answer}`, color: '065F46', size: 24, font: FONT_RUN }),
            ],
          })
        );
      }

    } else {
      // 5. STANDARD NUMBERED SECTIONS: MCQ, শূন্যস্থান, সত্য-মিথ্যা, প্রশ্নোত্তর (with ক, খ, গ...)
      (section.questions || []).forEach((q, qIndex) => {
        let cleanQ = cleanQuestionText(q.questionText);
        const prefix = isMcq 
          ? `${toBengaliNumerals(qIndex + 1)}) ` 
          : `${bnSubLetters[qIndex] || `(${qIndex + 1})`} `;

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

        // MCQ Options: ক. অপশন ১     খ. অপশন ২ (Size 12pt = 24, Spacing 0)
        if (q.options && q.options.length > 0) {
          const optRuns = [];
          const cleanAns = cleanOptionText(q.answer);

          q.options.slice(0, 2).forEach((opt, optIdx) => {
            const cleanOpt = cleanOptionText(opt);
            const optLabel = bnOptPrefixes[optIdx] || `${optIdx + 1}.`;
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

        // Short & Long Descriptive Answers in Answer Key (Size 12pt = 24, Spacing 0)
        if (includeAnswers && !isFibSection && !isTfSection && !isMcq && q.answer) {
          docChildren.push(
            new Paragraph({
              spacing: ZERO_SPACING,
              indent: ZERO_INDENT,
              children: [
                new TextRun({ text: `    উত্তর: `, bold: true, color: '047857', size: 24, font: FONT_RUN }),
                new TextRun({ text: `${q.answer}`, color: '065F46', size: 24, font: FONT_RUN }),
              ],
            })
          );
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
