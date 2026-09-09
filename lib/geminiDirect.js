import { extractAndParseJson } from './jsonHelper.js';
import { loadCustomPrompt, loadUniversalRules } from './promptStorage.js';
import { fixBilingualGrammarQuestion, ensureBengaliGrammarAnswer, cleanQuestionText } from './docxGenerator.js';

/**
 * Subject-specific prompt generator for Google Gemini API
 * Supports dynamic user-customized prompts configured via Admin Panel.
 */
export function buildSubjectPrompt(subjectName, classNameStr, reqSections, sourcesBlock, customInst, mainSourceTitle = '') {
  const sub = subjectName || 'পরীক্ষা';
  const cls = classNameStr || 'পঞ্চম';

  const universalRules = loadUniversalRules();
  const rawTemplate = loadCustomPrompt(sub, cls, reqSections);

  const sectionsJson = JSON.stringify(reqSections || [], null, 2);
  const teacherInst = customInst ? `শিক্ষকের অতিরিক্ত নির্দেশনা:\n${customInst}` : '';

  // Interpolate placeholders in prompt template
  let prompt = rawTemplate
    .replace(/\{className\}/g, cls)
    .replace(/\{subjectName\}/g, sub)
    .replace(/\{universalRules\}/g, universalRules)
    .replace(/\{sourcesBlock\}/g, sourcesBlock || '')
    .replace(/\{requestedSections\}/g, sectionsJson)
    .replace(/\{customInstructions\}/g, teacherInst);

  return prompt;
}

export const responseSchema = {
  type: 'object',
  properties: {
    examTitle: { type: 'string' },
    className: { type: 'string' },
    subject: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          instructions: { type: 'string' },
          marksPerQuestion: { type: 'number' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                questionText: { type: 'string' },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '2 options for MCQs',
                },
                answer: { type: 'string' },
                points: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Bullet points for descriptive answers or rubrics',
                },
              },
              required: ['id', 'questionText'],
            },
          },
        },
        required: ['id', 'title', 'questions'],
      },
    },
  },
  required: ['examTitle', 'sections'],
};

/**
 * 100% Deterministic Source Page Reference Verifier & Corrector
 */
export function correctSourcePageReferences(parsedData, fullExtractedText, subject) {
  if (!parsedData || !Array.isArray(parsedData.sections) || !fullExtractedText) {
    return;
  }

  const subName = (subject || '').toLowerCase().trim();
  const isBangla = (subName.includes('বাংলা') || subName.includes('bangla')) && !subName.includes('২য়') && !subName.includes('2nd');
  const isEnglish = subName.includes('ইংরেজি') || subName.includes('english');

  const chunkRegex = /===\s*\[(?:সোর্স\s*পৃষ্ঠা|সোর্স)\s*:\s*["']?([^"'\n\]]+)["']?\]\s*===\s*([\s\S]*?)(?====\s*\[(?:সোর্স\s*পৃষ্ঠা|সোর্স)|$)/gi;
  
  const chunks = [];
  let match;
  while ((match = chunkRegex.exec(fullExtractedText)) !== null) {
    const headerTitle = match[1]?.trim() || '';
    const textContent = match[2]?.trim() || '';
    
    let pageNum = '';
    const printedPageMatch = textContent.match(/\[বইয়ের\s*মুদ্রিত\s*পৃষ্ঠা\s*:\s*([০-৯0-9]+)\]/i) || textContent.match(/(?:মুদ্রিত\s*পৃষ্ঠা|বইয়ের\s*পৃষ্ঠা)\s*:\s*([০-৯0-9]+)/i);
    if (printedPageMatch) {
      pageNum = printedPageMatch[1];
    } else {
      const pageMatch = headerTitle.match(/(?:পৃষ্ঠা|page|p\.)\s*([০-৯0-9]+)/i);
      if (pageMatch) {
        pageNum = pageMatch[1];
      }
    }

    chunks.push({
      headerTitle,
      pageNum,
      textContent: textContent.toLowerCase(),
      words: new Set(
        textContent.toLowerCase()
          .split(/[\s,।?!;:"'()[\]{}।\-_/]+/)
          .filter(w => w.length > 2 && !['এবং', 'বা', 'অথবা', 'কি', 'কী', 'কে', 'কোন', 'কোনটি', 'হলো', 'হবে', 'কর', 'লিখ', 'বলতে', 'কাকে', 'বলে', 'এর', 'একটি', 'দুটি', 'তিনটি', 'নাম', 'প্রশ্ন'].includes(w))
      ),
    });
  }

  if (chunks.length === 0) return;

  const toBn = (num) => {
    const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (d) => bn[d]);
  };

  function findBestChunk(questionText) {
    if (!questionText) return null;
    const cleanQ = questionText.replace(/[?|।!]+/g, '').trim().toLowerCase();
    
    if (cleanQ.length > 6) {
      for (const chunk of chunks) {
        const isExerciseChunk = chunk.textContent.includes('অনুশীলনী') || chunk.textContent.includes('প্রশ্ন') || chunk.headerTitle.includes('অনুশীলনী');
        if (isExerciseChunk && chunk.textContent.includes(cleanQ)) {
          return chunk;
        }
      }
      for (const chunk of chunks) {
        if (chunk.textContent.includes(cleanQ)) {
          return chunk;
        }
      }
    }

    const qTokens = cleanQ.split(/[\s,।?!;:"'()[\]{}।\-_/]+/)
      .filter(w => w.length > 2 && !['এবং', 'বা', 'অথবা', 'কি', 'কী', 'কে', 'কোন', 'কোনটি', 'হলো', 'হবে', 'কর', 'লিখ', 'বলতে', 'কাকে', 'বলে', 'এর', 'একটি', 'দুটি', 'তিনটি', 'নাম', 'প্রশ্ন'].includes(w));
    
    if (qTokens.length === 0) return null;

    let bestChunk = null;
    let maxScore = -1;

    for (const chunk of chunks) {
      let score = 0;
      const isExerciseChunk = chunk.textContent.includes('অনুশীলনী') || chunk.textContent.includes('প্রশ্ন') || chunk.headerTitle.includes('অনুশীলনী');
      if (isExerciseChunk) score += 4;

      for (const token of qTokens) {
        if (chunk.words.has(token)) {
          score += 2;
        } else if (chunk.textContent.includes(token)) {
          score += 1;
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestChunk = chunk;
      }
    }

    return maxScore > 0 ? bestChunk : null;
  }

  parsedData.sections.forEach((sec, sIdx) => {
    const isVocab = sec.id?.includes('vocab') || sec.title?.includes('শব্দার্থ');
    const isSentence = sec.id?.includes('sentence') || sec.title?.includes('বাক্য গঠন');
    const isPoem = sec.id?.includes('poem') || sec.title?.includes('কবিতা');
    const isPunctuation = sec.id?.includes('punctuation') || sec.title?.includes('বিরাম');
    const isConjunct = sec.id?.includes('conjunct') || sec.title?.includes('যুক্তবর্ণ');
    const isMcq = sec.id?.includes('mcq') || sec.title?.includes('সঠিক উত্তর');
    const isFib = sec.id?.includes('fib') || sec.title?.includes('শূন্যস্থান');
    const isTf = sec.id?.includes('tf') || sec.title?.includes('সত্য');
    const isMatch = sec.id?.includes('match') || sec.title?.includes('মিল');
    const isShort = sec.id?.includes('short') || sec.title?.includes('সংক্ষেপ') || sec.title?.includes('সংক্ষিপ্ত');
    const isLong = sec.id?.includes('long') || sec.id?.includes('desc') || sec.title?.includes('বর্ণনামূলক') || sec.title?.includes('কাঠামোবদ্ধ') || sec.title?.includes('রচনামূলক');
    const isQa = sec.id?.includes('qa') || sec.title?.includes('প্রশ্নের উত্তর') || sec.title?.includes('নিচের প্রশ্ন');

    const isMath = subName.includes('গণিত') || subName.includes('math');
    const isMathWordProb = sec.id?.startsWith('math_word_prob') || sec.id?.startsWith('math_problem') || sec.title?.includes('গাণিতিক সমস্যা') || (isMath && (sIdx === 5 || sIdx === 6 || sIdx === 7 || sIdx === 8));

    let shouldHavePage = false;
    if (isEnglish) {
      shouldHavePage = false;
    } else if (isBangla) {
      shouldHavePage = (sec.id === 'bn_qa' || sec.id === 'bn_desc' || isQa || (isLong && !isVocab && !isSentence && !isPunctuation && !isConjunct)) && !isVocab && !isSentence && !isPunctuation && !isConjunct && !isMcq && !isFib && !isTf && !isMatch && !isPoem;
    } else if (isMath) {
      shouldHavePage = isMathWordProb;
    } else {
      shouldHavePage = (isShort || isLong || sIdx === 1 || sIdx === 5) && !isMcq && !isFib && !isTf && !isMatch && !isPoem;
    }

    if (!Array.isArray(sec.questions)) return;

    sec.questions.forEach((q) => {
      if (q.questionText) {
        q.questionText = q.questionText.replace(/[\(\[]\s*পৃষ্ঠা[\s\:\-–নং\.০-৯0-9a-zA-Z]+\s*[\)\]]/gi, '').trim();
      }

      if (isEnglish && (sec.id === 'en_word_meaning' || sec.title?.toLowerCase().includes('word meaning') || sec.title?.includes('শব্দার্থ'))) {
        if (q.questionText) {
          const trimmed = q.questionText.trim();
          q.questionText = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        }
      }

      if (!q.answer) return;

      const pageTagRegex = /^\[পৃষ্ঠা\s*([০-৯0-9]+)([^\]]*)\]\s*/i;
      const tagMatch = q.answer.match(pageTagRegex);

      if (!shouldHavePage && tagMatch) {
        q.answer = q.answer.replace(pageTagRegex, '').trim();
        return;
      }

      if (shouldHavePage) {
        const bestChunk = findBestChunk(q.questionText);
        if (bestChunk && bestChunk.pageNum) {
          const truePage = toBn(bestChunk.pageNum);
          if (tagMatch) {
            const existingPage = tagMatch[1];
            const restOfTag = tagMatch[2] || '';
            if (existingPage !== truePage) {
              q.answer = q.answer.replace(pageTagRegex, `[পৃষ্ঠা ${truePage}${restOfTag}] `).trim();
            }
          } else {
            q.answer = `[পৃষ্ঠা ${truePage}] ${q.answer}`.trim();
          }
        } else if (!tagMatch) {
          const fallbackChunk = chunks.find(c => c.pageNum) || chunks[0];
          if (fallbackChunk && fallbackChunk.pageNum) {
            const fallbackPage = toBn(fallbackChunk.pageNum);
            q.answer = `[পৃষ্ঠা ${fallbackPage}] ${q.answer}`.trim();
          }
        }
      }
    });
  });
}

/**
 * Ensures decimal section questions strictly contain decimal points/numbers and correct answers.
 */
export function validateDecimalSection(parsedData) {
  if (!parsedData || !Array.isArray(parsedData.sections)) return;

  const decimalSection = parsedData.sections.find(
    (s) => s.id === 'math_decimal_mul_div' || (s.title && s.title.includes('দশমিক'))
  );

  if (!decimalSection || !Array.isArray(decimalSection.questions) || decimalSection.questions.length === 0) {
    return;
  }

  const fallbackDecimalProblems = [
    { questionText: '০.৩ × ২', answer: '০.৬' },
    { questionText: '০.৫ × ৪', answer: '২' },
    { questionText: '৩.৭৬ × ১০', answer: '৩৭.৬' },
    { questionText: '০.৮ ÷ ২', answer: '০.৪' },
    { questionText: '৪.২ ÷ 六' },
    { questionText: '৪.২ ÷ ৬', answer: '০.৭' },
    { questionText: '১০.৫ ÷ ৫', answer: '২.১' },
    { questionText: '০.০৪ × ৩', answer: '০.১২' },
    { questionText: '৭.২ ÷ ১.২', answer: '৬' },
  ];

  decimalSection.questions.forEach((q, qIdx) => {
    const hasDecimal = q.questionText && (q.questionText.includes('.') || q.questionText.includes('·') || q.questionText.includes('দশমিক'));
    if (!hasDecimal) {
      const fb = fallbackDecimalProblems[qIdx % fallbackDecimalProblems.length];
      q.questionText = fb.questionText;
      q.answer = fb.answer;
    }
  });
}

/**
 * Dynamically queries available models supporting generateContent for the given Gemini API Key
 */
export async function getAvailableGenerativeModels(apiKey) {
  const fallbackModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-pro',
  ];

  if (!apiKey) return fallbackModels;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        const validModels = data.models
          .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map((m) => m.name.replace(/^models\//, ''))
          .filter(Boolean);

        if (validModels.length > 0) {
          const rank = (name) => {
            const n = name.toLowerCase();
            if (n.includes('2.5-flash')) return 1;
            if (n.includes('2.0-flash') && !n.includes('lite')) return 2;
            if (n.includes('2.0-flash-lite')) return 3;
            if (n.includes('flash-latest') || n.includes('flash-8b')) return 4;
            if (n.includes('1.5-flash')) return 5;
            if (n.includes('2.5-pro')) return 6;
            if (n.includes('2.0-pro')) return 7;
            if (n.includes('1.5-pro')) return 8;
            if (n.includes('flash')) return 9;
            return 10;
          };

          validModels.sort((a, b) => rank(a) - rank(b));
          return validModels;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to dynamically query Gemini models list, using fallback list:', err.message);
  }

  return fallbackModels;
}

/**
 * Direct Client-Side Gemini API Caller
 * Calls Google Gemini REST API directly from the browser in a single pass.
 */
export async function generateQuestionsDirectly({
  images = [],
  textSources = [],
  className,
  subject,
  requestedSections,
  mainSourceTitle = '',
  customInstructions = '',
  apiKey: customApiKey,
  onStatusChange = () => {}
}) {
  const apiKey = (customApiKey && customApiKey.trim()) || 
    (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : '') || 
    process.env.NEXT_PUBLIC_GEMINI_API_KEY || 
    '';

  const isEnglish = Boolean(subject && (subject.includes('ইংরেজি') || subject.toLowerCase().includes('english')));

  if (!apiKey) {
    throw new Error('Gemini API Key পাওয়া যায়নি। অনুগ্রহ করে .env.local ফাইলে NEXT_PUBLIC_GEMINI_API_KEY সেট করুন অথবা সেটিংসে আপনার API Key দিন।');
  }

  const hasImages = Array.isArray(images) && images.length > 0;
  const hasTexts = Array.isArray(textSources) && textSources.length > 0;

  if (!hasImages && !hasTexts) {
    throw new Error('প্রশ্নপত্র তৈরির জন্য কোনো সোর্স (ছবি, পিডিএফ পৃষ্ঠা বা নোট) পাওয়া যায়নি।');
  }

  let textSourcesBlock = '';
  if (hasTexts) {
    textSourcesBlock = `\n\nসংযুক্ত টেক্সট নোট/সোর্সসমূহ:\n` + textSources.map((t, idx) => `[সোর্স ${idx + 1}: ${t.title || 'নোট'}]\n${t.text}\n`).join('\n');
  }

  let sectionSourceBlock = '';
  if (Array.isArray(requestedSections) && requestedSections.length > 0) {
    sectionSourceBlock = `\n\n📌 সোর্স নির্ধারণ ও অগ্রাধিকার সংক্রান্ত কঠোর নির্দেশিকা (SOURCE SCOPE & ASSIGNMENT RULES):\n` +
      `১. মূল/মেইন সোর্স (MAIN SOURCE): "${mainSourceTitle || 'বামপাশে মূল সোর্স হিসেবে নির্বাচিত অধ্যায়/বই'}"\n` +
      `২. যেসকল ধারার পাশে কোনো সুনির্দিষ্ট সোর্স উল্লেখ নেই (যেমন: ১ নং সংক্ষেপে উত্তর দাও), সেগুলোর প্রশ্ন ১০০% শুধুমাত্র উপরোক্ত "মূল/মেইন সোর্স" থেকেই তৈরি করতে হবে। অন্য কোনো ধারার জন্য নির্ধারিত বিশেষ সোর্স (যেমন: ২ নং বা ১০ নং এর জ্যামিতি বই বা অন্য কোনো অধ্যায়) থেকে ১ নং এ কোনো প্রশ্ন নেওয়া সম্পূর্ণ নিষিদ্ধ। ১ নং এ কখনোই জ্যামিতির প্রশ্ন আসবে না।\n` +
      `৩. ধারাসমূহের সুনির্দিষ্ট বরাদ্দ তালিকা:\n` +
      requestedSections.map((sec, idx) => {
        const sTitle = sec.sourceTitle || (sec.sourceId && sec.sourceId !== 'all' && sec.sourceId !== 'default' ? `সোর্স ID: ${sec.sourceId}` : null);
        if (sTitle) {
          return `   * ধারা ${idx + 1} ("${sec.title}"): এটি ১০০% শুধুমাত্র এবং কঠোরভাবে "${sTitle}" থেকে তৈরি করতে হবে। মূল মেইন সোর্স বা অন্য কোনো বই/অধ্যায়ের সাথে মেলানো সম্পূর্ণ নিষিদ্ধ।`;
        }
        return `   * ধারা ${idx + 1} ("${sec.title}"): এটি ১০০% শুধুমাত্র "মূল/মেইন সোর্স" (${mainSourceTitle || 'মেইন সোর্স'}) থেকেই তৈরি করতে হবে (জ্যামিতি বা অন্য কোনো সেকশনের সোর্স থেকে প্রশ্ন নেওয়া সম্পূর্ণ নিষিদ্ধ)।`;
      }).join('\n') + '\n';
  }

  const fullSourcesBlock = textSourcesBlock + sectionSourceBlock;
  const systemPrompt = buildSubjectPrompt(subject, className, requestedSections, fullSourcesBlock, customInstructions, mainSourceTitle);

  // Build Gemini API payload parts
  const parts = [];

  // Add images to parts
  if (hasImages) {
    images.forEach((img, idx) => {
      if (img.sourceTitle) {
        parts.push({ text: `[সোর্স পৃষ্ঠা ${idx + 1}: "${img.sourceTitle}"]:` });
      }
      parts.push({
        inline_data: {
          mime_type: img.mimeType || 'image/jpeg',
          data: img.base64Data,
        },
      });
    });
  }

  const totalPageCount = (images?.length || 0) + (textSources?.length || 0);
  let pageQuotaText = '';
  if (totalPageCount > 1) {
    pageQuotaText = `\n\n⚠️ অতি কঠোর পৃষ্ঠাভিত্তিক বন্টন নির্দেশ (STRICT PER-PAGE QUOTA):\n` +
      `আপনার সামনে মোট ${totalPageCount}টি সোর্স পৃষ্ঠা সংযুক্ত রয়েছে। প্রতিটি সেকশনের প্রশ্নসমূহ অবশ্যই এই ${totalPageCount}টি পৃষ্ঠার প্রতিটি পৃষ্ঠা থেকে সমান অনুপাতে ও রেন্ডমলি (পৃষ্ঠার বিভিন্ন স্থান থেকে) নির্বাচন করতে হবে। কোনো একটি পৃষ্ঠা থেকে একনাগাড়ে সিরিয়ালি প্রশ্ন নেওয়া বা অন্য কোনো পৃষ্ঠাকে বাদ দেওয়া সম্পূর্ণ নিষিদ্ধ।`;
  }

  // Add the comprehensive instruction prompt
  parts.push({
    text: `${systemPrompt}${pageQuotaText}\n\n⚠️ অতি গুরুত্বপূর্ণ নির্দেশ: উপরের সকল পৃষ্ঠা/ছবি ও সোর্সকে সম্পূর্ণভাবে বিশ্লেষণ করে পাঠ্যক্রম অনুযায়ী ১০০% সঠিক ও সম্পূর্ণ প্রশ্নপত্র JSON ফরম্যাটে তৈরি করুন।`
  });

  const payload = {
    contents: [
      {
        role: 'user',
        parts: parts,
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
      temperature: 0.65,
    },
  };

  onStatusChange('Verifying available Gemini AI models...');
  const availableModels = await getAvailableGenerativeModels(apiKey);

  let parsedData = null;
  let lastError = null;

  for (const modelName of availableModels) {
    onStatusChange(`Analyzing all ${images.length} pages simultaneously with ${modelName}... This may take up to a minute.`);
    
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        console.warn(`Direct model ${modelName} returned error:`, errMsg);
        lastError = new Error(errMsg);
        
        // If 404/not supported or model not found, try next fallback model
        if (response.status === 404 || errMsg.includes('not found') || errMsg.includes('is not supported') || errMsg.includes('Call ModelService.ListModels')) {
          continue;
        }
        
        // For other errors, also try next model before failing completely
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Gemini API returned an empty response.');
      }

      parsedData = extractAndParseJson(rawText);
      if (parsedData && (parsedData.sections || parsedData.examTitle)) {
        break; // Success!
      }
    } catch (err) {
      lastError = err;
      console.warn(`Attempt with ${modelName} failed:`, err.message);
    }
  }

  if (!parsedData) {
    throw lastError || new Error('Failed to generate question paper from Gemini API.');
  }

  // Enforce requested marks distribution and titles
  if (parsedData && Array.isArray(parsedData.sections)) {
    if (Array.isArray(requestedSections) && requestedSections.length > 0) {
      requestedSections.forEach((reqSec, idx) => {
        let targetSec = parsedData.sections.find((s) => s.id === reqSec.id) || parsedData.sections[idx];
        if (targetSec) {
          targetSec.id = reqSec.id || targetSec.id;
          targetSec.title = reqSec.title || targetSec.title;
          targetSec.marksPerQuestion = reqSec.marksPerQuestion !== undefined ? Number(reqSec.marksPerQuestion) : (targetSec.marksPerQuestion || 1);
          targetSec.count = reqSec.count !== undefined ? Number(reqSec.count) : (targetSec.questions?.length || 1);
          if (reqSec.instructions) {
            targetSec.instructions = reqSec.instructions;
          }
        }
      });
    }

    const isEnglishSubject = Boolean(subject && (subject.includes('ইংরেজি') || subject.toLowerCase().includes('english')));

    parsedData.sections.forEach((sec) => {
      const isOral = sec.id === 'oral' || sec.id?.endsWith('_oral') || (sec.title && sec.title.includes('মৌখিক'));
      if (isOral) {
        sec.questions = [];
      }

      const isGrammarDef = isEnglishSubject && (sec.id?.includes('def') || sec.id?.includes('qa') || sec.id?.includes('questions') || sec.title?.includes('সংজ্ঞা') || sec.title?.includes('কাকে বলে') || sec.title?.includes('ব্যাকরণ') || sec.title?.toLowerCase().includes('answer the following') || sec.title?.toLowerCase().includes('question'));
      if (isGrammarDef && Array.isArray(sec.questions)) {
        sec.questions.forEach((q) => {
          if (q.questionText) {
            q.questionText = cleanQuestionText(q.questionText);
            q.questionText = fixBilingualGrammarQuestion(q.questionText);
          }
          if (q.questionText) {
            q.answer = ensureBengaliGrammarAnswer(q.questionText, q.answer);
          }
        });
      }

      const isTranslate = sec.id?.includes('translate') || sec.title?.includes('অনুবাদ') || sec.title?.toLowerCase().includes('translation');
      if (isTranslate && Array.isArray(sec.questions)) {
        sec.questions.forEach((q) => {
          if (q.questionText) {
            q.questionText = cleanQuestionText(q.questionText);
          }
        });
      }

      const isGkSec = sec.id === 'gk_questions' || (subject && (subject.includes('সাধারণ জ্ঞান') || subject.toLowerCase().includes('general knowledge') || subject.toLowerCase().includes('gk') || subject.includes('জিকে')));
      if (isGkSec) {
        if (sec.title) {
          sec.title = sec.title.replace(/সমান\s*সমান/g, 'সমান');
        }
        if (Array.isArray(sec.questions)) {
          sec.questions.forEach((q) => {
            if (q.questionText) {
              q.questionText = cleanQuestionText(q.questionText);
            }
          });
        }
      }
    });

    // Validate and clean mathematics decimals
    validateDecimalSection(parsedData);
  }

  return parsedData;
}
