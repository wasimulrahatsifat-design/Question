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
  // Strip prefix followed by closing parenthesis, danda, dash, or colon e.g. "a) ", "1) ", "ক. "
  str = str.replace(/^([0-9\u09E6-\u09EF]+|[a-zA-Z]{1,2}|[ক-হ])[\)\।\-\:]\s*/, '');
  // Strip prefix followed by dot ONLY if not immediately followed by a digit (to preserve decimal numbers like 0.5, ০.৩, ৩.৭৬)
  str = str.replace(/^([0-9\u09E6-\u09EF]+|[a-zA-Z]{1,2}|[ক-হ])\.(?![0-9\u09E6-\u09EF])\s*/, '');
  return str.trim();
}

// Clean prefixes from questions e.g. "১) টাইফয়েড" -> "টাইফয়েড", "a) Where is..." -> "Where is..."
export function cleanQuestionText(text) {
  if (!text) return '';
  let str = String(text).trim();
  // Strip initial leading colons, semicolons, dashes, dots, or spaces
  str = str.replace(/^[\:\;\s\-\–\—\.\।\)]+/, '').trim();
  // Strip parenthesized prefix e.g. "(a) ", "(1) ", "(১) ", "(ক) "
  str = str.replace(/^\([a-zA-Z0-9\u09E6-\u09EFক-হivxlcIVXLC]+\)\s*/, '');
  // Strip single/double letter, roman numerals, digits followed strictly by closing paren, danda, dash, colon, dot e.g. "a) ", "১। ", "ক) ", "a: "
  str = str.replace(/^([0-9\u09E6-\u09EF]+|[a-zA-Z]{1,2}|[ivxlcIVXLC]{1,4}|[ক-হ])[\)\।\-\:\.\;]\s*/, '');
  // Strip prefix followed by dot ONLY if NOT immediately followed by a digit (preserves decimal numbers e.g. 0.5, ০.৩, ৩.৭৬, ০.৮, ৪.২)
  str = str.replace(/^([0-9\u09E6-\u09EF]+|[a-zA-Z]{1,2}|[ivxlcIVXLC]{1,4}|[ক-হ])\.(?![0-9\u09E6-\u09EF])\s*/, '');
  // Strip arithmetic instruction prefixes e.g. "গুণ কর:", "ভাগ কর:", "হিসাব কর:"
  str = str.replace(/^(গুণ\s*কর|ভাগ\s*কর|হিসাব\s*কর|গুণফল\s*নির্ণয়\s*কর|ভাগফল\s*নির্ণয়\s*কর|মান\s*নির্ণয়\s*কর)[\s\:\।\-\–]+/i, '');
  // Strip trailing "= কত?", "= কত", "= ?"
  str = str.replace(/\s*=\s*(কত\?|কত|\?)\s*$/i, '');
  // Strip redundant translation suffix e.g. "—Translate into English.", "- Translate into Bengali."
  str = str.replace(/[\—\–\-\:\s]*Translate\s+into\s+[a-zA-Z\s]+\.?/gi, '');
  str = str.replace(/[\(\[]\s*Translate\s+into\s+[a-zA-Z\s]+\.?\s*[\)\]]/gi, '');
  str = str.replace(/[\—\–\-\:\s]*(?:ইংরেজিতে\s*অনুবাদ\s*কর|বাংলায়\s*অনুবাদ\s*কর|অনুবাদ\s*কর)/gi, '');
  // Strip any accidental page reference tags from question text e.g. "[পৃষ্ঠা: ৫]", "[পৃষ্ঠা ৫ এর ২ নং]", "(পৃষ্ঠা: ৫)"
  str = str.replace(/[\(\[]\s*পৃষ্ঠা[^\]\)]*[\)\]]/gi, '');
  // Strip redundant bracketed instruction in question text e.g. "(সারাংশ লিখ)", "(সারমর্ম লিখ)", "(ভাবসম্প্রসারণ কর)"
  str = str.replace(/[\(\[]\s*(সারাংশ\s*লিখ|সারমর্ম\s*লিখ|ভাবসম্প্রসারণ\s*কর|আবেদনপত্র\s*লিখ|চিঠি\s*লিখ)\s*[\)\]]/gi, '');
  // Strip any remaining leading colon, dash, or space
  str = str.replace(/^[\:\;\s\-\–\—\.\।\)]+/, '').trim();
  return str.trim();
}

export function fixBilingualGrammarQuestion(qText) {
  if (!qText) return '';
  let text = cleanQuestionText(qText);

  // If already in standard Bengali-English bilingual format, clean up and return
  if (text.includes('কাকে বলে') || text.includes('কী কী') || text.includes('কি কি') || text.includes('কত প্রকার') || text.includes('কয় প্রকার')) {
    return text;
  }

  // Check for combined definition + classification e.g. "What is Adjective? How many kinds of Adjective are there?"
  const combinedMatch = text.match(/(?:what\s+is\s+(?:a|an|the)?|define)\s+([a-zA-Z\s\-]+?)\?\s*(?:how\s+many\s+kinds\s+of|what\s+are\s+the\s+kinds\s+of)\s+([a-zA-Z\s\-]+?)(?:\?|\.|$)/i);
  if (combinedMatch) {
    let term1 = combinedMatch[1].trim().replace(/^(?:a|an|the)\s+/i, '');
    term1 = term1.charAt(0).toUpperCase() + term1.slice(1);
    let term2 = combinedMatch[2].trim().replace(/^(?:a|an|the)\s+/i, '').replace(/s$/i, '');
    term2 = term2.charAt(0).toUpperCase() + term2.slice(1);
    return `${term1} কাকে বলে? ${term2} কত প্রকার ও কি কি?`;
  }

  // 1. "What are the kinds of verb? Give examples." / "How many kinds of sentence are there?" / "What are the kinds of preposition?"
  const kindsMatch = text.match(/(?:what\s+are\s+the\s+kinds\s+of|how\s+many\s+kinds\s+of|classify|kinds\s+of|types\s+of)\s+([a-zA-Z\s\-]+?)(?:\?|\.|\s*give|\s*write|\s*explain|$)/i);
  if (kindsMatch) {
    let term = kindsMatch[1].trim().replace(/^(?:a|an|the)\s+/i, '').replace(/s$/i, '');
    term = term.charAt(0).toUpperCase() + term.slice(1);
    return `${term} কত প্রকার ও কি কি?`;
  }

  // 2. "What is a Modal Auxiliary verb?" / "What is Interjection?" / "What is a finite verb?" / "Define verb."
  const defMatch = text.match(/(?:what\s+is\s+(?:a|an|the)?|define|explain|what\s+do\s+you\s+mean\s+by)\s+([a-zA-Z\s\-]+?)(?:\?|\.|\s*give|\s*with\s+example|\s*and\s+give|$)/i);
  if (defMatch) {
    let term = defMatch[1].trim().replace(/^(?:a|an|the)\s+/i, '');
    term = term.charAt(0).toUpperCase() + term.slice(1);
    return `${term} কাকে বলে?`;
  }

  // 3. "Give/Write definition of X with examples"
  const giveDefMatch = text.match(/(?:give|write)\s+(?:the\s+)?definition\s+of\s+([a-zA-Z\s\-]+?)(?:\?|\.|\s*with|\s*give|$)/i);
  if (giveDefMatch) {
    let term = giveDefMatch[1].trim().replace(/^(?:a|an|the)\s+/i, '');
    term = term.charAt(0).toUpperCase() + term.slice(1);
    return `${term} কাকে বলে?`;
  }

  // 4. If single or short term e.g. "Verb?", "Parts of speech?", "Interjection"
  const singleTermMatch = text.match(/^([a-zA-Z\s\-]+?)(?:\?|\.|$)/i);
  if (singleTermMatch && singleTermMatch[1].trim().split(/\s+/).length <= 4) {
    let term = singleTermMatch[1].trim().replace(/^(?:a|an|the)\s+/i, '');
    term = term.charAt(0).toUpperCase() + term.slice(1);
    return `${term} কাকে বলে?`;
  }

  return text;
}

export function ensureBengaliGrammarAnswer(qText, currentAnswer) {
  const q = String(qText || '').toLowerCase();
  let ans = String(currentAnswer || '').trim();

  // If already has comprehensive Bengali explanation (contains "বলে" or "প্রকার" or substantial Bengali), return ans
  const bnCharCount = (ans.match(/[\u0980-\u09FF]/g) || []).length;
  if (ans && bnCharCount > 25 && (ans.includes('বলে') || ans.includes('প্রকার') || ans.includes('যথা') || ans.includes('ক্রিয়া') || ans.includes('সর্বনাম') || ans.includes('বিশেষ্য'))) {
    return ans;
  }

  // Standard Bengali grammar definitions & examples for Class 5
  if (q.includes('noun') || q.includes('বিশেষ্য')) {
    return "যে word বা শব্দ দ্বারা কোনো ব্যক্তি, বস্তু, স্থান, জাতি, গুণ বা সমষ্টির নাম বোঝায়, তাকে Noun (বিশেষ্য) বলে।\nযেমন: Rahim, Dhaka, Book, Honesty ইত্যাদি।\nNoun প্রধানত ৫ প্রকার। যথা: ১) Proper Noun, ২) Common Noun, ৩) Collective Noun, ৪) Material Noun, ৫) Abstract Noun।";
  }
  if (q.includes('pronoun') || q.includes('সর্বনাম')) {
    return "Noun-এর পরিবর্তে যে word ব্যবহৃত হয়, তাকে Pronoun (সর্বনাম) বলে।\nযেমন: He, She, They, It, We ইত্যাদি।\nPronoun প্রধানত ৮ প্রকার। যথা: ১) Personal Pronoun, ২) Demonstrative Pronoun, ৩) Interrogative Pronoun, ৪) Relative Pronoun, ৫) Indefinite Pronoun, ৬) Distributive Pronoun, ৭) Reflexive Pronoun, ৮) Reciprocal Pronoun।";
  }
  if (q.includes('adjective') || q.includes('বিশেষণ')) {
    return "যে word কোনো Noun বা Pronoun-এর দোষ, গুণ, অবস্থা, সংখ্যা বা পরিমাণ প্রকাশ করে, তাকে Adjective (বিশেষণ) বলে।\nযেমন: Good, Bad, Rich, Poor, Five, Much ইত্যাদি।\nAdjective প্রধানত ৪ প্রকার। যথা: ১) Adjective of Quality, ২) Adjective of Quantity, ৩) Adjective of Number, ৪) Pronominal Adjective।";
  }
  if (q.includes('parts of speech') || q.includes('পদ')) {
    return "বাক্যে ব্যবহৃত প্রত্যেকটি অর্থপূর্ণ শব্দকে Parts of speech বা পদ বলে।\nParts of speech মোট ৮ প্রকার। যথা: ১) Noun, ২) Pronoun, ৩) Adjective, ৪) Verb, ৫) Adverb, ৬) Preposition, ৭) Conjunction, ৮) Interjection।";
  }
  if (q.includes('finite verb') || q.includes('সমাপিকা')) {
    return "যে Verb দ্বারা বাক্যের অর্থ সম্পূর্ণরূপে প্রকাশ পায় এবং Subject-এর Number ও Person অনুযায়ী যার রূপ পরিবর্তিত হয়, তাকে Finite Verb (সমাপিকা ক্রিয়া) বলে।\nযেমন: I play football. He reads a book.";
  }
  if (q.includes('verb') || q.includes('ক্রিয়া') || q.includes('ক্রিয়া')) {
    return "যে word দ্বারা কোনো কিছু করা, হওয়া, যাওয়া, খাওয়া বা কাজ সম্পন্ন করা বোঝায়, তাকে Verb (ক্রিয়া) বলে।\nযেমন: Read, Write, Play, Go, Eat ইত্যাদি।\nVerb প্রধানত ২ প্রকার। যথা: ১) Finite Verb (সমাপিকা ক্রিয়া), ২) Non-finite Verb (অসমাপিকা ক্রিয়া)।";
  }
  if (q.includes('preposition') || q.includes('পদান্বয়ী')) {
    return "যে word কোনো Noun বা Pronoun-এর পূর্বে বসে বাক্যের অন্য শব্দের সাথে সম্পর্ক স্থাপন করে, তাকে Preposition বলে।\nযেমন: in, on, at, to, under, with ইত্যাদি।\nযেমন: The book is on the table.";
  }
  if (q.includes('tense') || q.includes('কাল')) {
    return "কোনো কাজ সম্পন্ন হওয়ার সময়কে Tense (কাল) বলে।\nTense প্রধানত ৩ প্রকার। যথা: ১) Present Tense (বর্তমান কাল), ২) Past Tense (অতীত কাল), ৩) Future Tense (ভবিষ্যত কাল)।";
  }
  if (q.includes('sentence') || q.includes('বাক্য')) {
    return "এক বা একাধিক শব্দ পাশাপাশি বসে যদি সম্পূর্ণ মনের ভাব প্রকাশ করে, তবে তাকে Sentence (বাক্য) বলে।\nযেমন: Birds fly in the sky.\nঅর্থানুসারে Sentence ৫ প্রকার। যথা: ১) Assertive, ২) Interrogative, ৩) Imperative, ৪) Optative, ৫) Exclamatory।";
  }
  if (q.includes('interjection') || q.includes('আবেগসূচক')) {
    return "যে word দ্বারা মনের আকস্মিক আবেগ, আনন্দ, দুঃখ, বিস্ময় বা ভয় প্রকাশ পায়, তাকে Interjection বলে।\nযেমন: Alas! Hurrah! Bravo! ইত্যাদি।\nযেমন: Hurrah! We have won the game.";
  }
  if (q.includes('conjunction') || q.includes('সংযোজক')) {
    return "যে word দুই বা ততোধিক word, phrase বা clause-কে যুক্ত করে, তাকে Conjunction বলে।\nযেমন: and, but, or, because ইত্যাদি।\nযেমন: Rahim and Karim are two brothers.";
  }
  if (q.includes('adverb') || q.includes('ভাববিশেষণ')) {
    return "যে word কোনো Verb, Adjective বা অন্য কোনো Adverb-কে বিশেষিত করে, তাকে Adverb বলে।\nযেমন: slowly, quickly, very, now, well ইত্যাদি।\nযেমন: He walks slowly.";
  }
  if (q.includes('gender') || q.includes('লিঙ্গ')) {
    return "যে চিহ্ন বা লক্ষণ দ্বারা কোনো noun বা pronoun পুরুষ, স্ত্রী, ক্লীব বা উভয় জাতীয় তা নির্দেশ করে, তাকে Gender (লিঙ্গ) বলে।\nGender ৪ প্রকার। যথা: ১) Masculine Gender (পুরুষবাচক), ২) Feminine Gender (স্ত্রীবাচক), ৩) Common Gender (উভয়লিঙ্গ), ৪) Neuter Gender (ক্লীবলিঙ্গ)।";
  }
  if (q.includes('number') || q.includes('বচন')) {
    return "যা দ্বারা কোনো ব্যক্তি, বস্তু বা প্রাণীর সংখ্যা বোঝায়, তাকে Number (বচন) বলে।\nNumber ২ প্রকার। যথা: ১) Singular Number (একবচন), ২) Plural Number (বহুবচন)।";
  }

  return ans;
}

/**
 * Universal Section Type Detector (prioritizes section title over id)
 */
export function getSectionType(sec) {
  const title = (sec?.title || '').toLowerCase();
  const id = (sec?.id || '').toLowerCase();

  // 1. Title matching (takes priority)
  if (title.includes('answer the following') || title.includes('answer the question') || title.includes('questions') || title.includes('প্রশ্নের উত্তর') || title.includes('প্রশ্ন গুলোর উত্তর') || title.includes('সংজ্ঞাসহ') || title.includes('সংজ্ঞা লিখ') || title.includes('কাকে বলে') || title.includes('ব্যাকরণ সম্পর্কিত') || id.includes('en2_questions') || id.includes('definition') || id.includes('en2_def')) return 'qa';
  if (title.includes('translation') || title.includes('অনুবাদ') || id.includes('translate')) return 'translate';
  if (title.includes('বাগধারা') || title.includes('idiom') || title.includes('phrase')) return 'bagdhara';
  if (title.includes('সারাংশ') || title.includes('সারমর্ম') || title.includes('summary')) return 'summary';
  if (title.includes('ভাবসম্প্রসারণ') || title.includes('ভাব-সম্প্রসারণ') || title.includes('ভাব সম্প্রসারণ')) return 'amplification';
  if (title.includes('বিপরীত শব্দ') || title.includes('বিপরীতার্থ') || title.includes('antonym')) return 'opposite';
  if (title.includes('সমার্থক শব্দ') || title.includes('প্রতিশব্দ') || title.includes('synonym')) return 'synonym';
  if (title.includes('এক কথায় প্রকাশ') || title.includes('এককথায় প্রকাশ') || title.includes('এক কথায়') || title.includes('এককথায়')) return 'one_word';
  if (title.includes('দরখাস্ত') || title.includes('আবেদনপত্র') || title.includes('চিঠি') || title.includes('পত্র') || title.includes('letter') || title.includes('application')) return 'letter';
  if (title.includes('রচনা') || title.includes('essay') || title.includes('composition') || title.includes('অনুচ্ছেদ') || title.includes('paragraph')) return 'essay';
  if (title.includes('শব্দার্থ') || title.includes('শব্দের অর্থ') || title.includes('word meaning') || title.includes('vocab')) return 'vocab';
  if (title.includes('বাক্য গঠন') || title.includes('বাক্য তৈরি') || title.includes('make sentence') || title.includes('বাক্য রচনা')) return 'sentence';
  if (title.includes('যুক্তবর্ণ') || title.includes('conjunct')) return 'conjunct';
  if (title.includes('বিরাম') || title.includes('যতি') || title.includes('punctuation') || title.includes('capital')) return 'punctuation';
  if (title.includes('কবিতা') || title.includes('poem')) return 'poem';
  if (title.includes('সঠিক উত্তর') || title.includes('mcq')) return 'mcq';
  if (title.includes('শূন্যস্থান') || title.includes('fill in')) return 'fib';
  if (title.includes('সত্য/মিথ্যা') || title.includes('সত্য-মিথ্যা') || title.includes('সত্য') || title.includes('true')) return 'tf';
  if (title.includes('মিল') || title.includes('match')) return 'match';
  if (title.includes('মৌখিক') || title.includes('oral')) return 'oral';

  // 2. Fallback to ID
  if (id.includes('qa') || id.includes('questions') || id.includes('definition') || id.includes('grammar')) return 'qa';
  if (id.includes('translate')) return 'translate';
  if (id.includes('bagdhara') || id.includes('idiom')) return 'bagdhara';
  if (id.includes('summary') || id.includes('sarangsho')) return 'summary';
  if (id.includes('amplification') || id.includes('bhab')) return 'amplification';
  if (id.includes('opposite') || id.includes('antonym')) return 'opposite';
  if (id.includes('synonym')) return 'synonym';
  if (id.includes('one_word') || id.includes('ek_kothay')) return 'one_word';
  if (id.includes('letter') || id.includes('application')) return 'letter';
  if (id.includes('essay') || id.includes('composition') || id.includes('paragraph')) return 'essay';
  if (id.includes('vocab') || id.includes('word_meaning')) return 'vocab';
  if (id.includes('sentence') || id.includes('make_sentence')) return 'sentence';
  if (id.includes('conjunct')) return 'conjunct';
  if (id.includes('punctuation')) return 'punctuation';
  if (id.includes('poem')) return 'poem';
  if (id.includes('mcq')) return 'mcq';
  if (id.includes('fib')) return 'fib';
  if (id.includes('tf')) return 'tf';
  if (id.includes('match')) return 'match';
  if (id.includes('oral')) return 'oral';

  return 'generic';
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
  const isGk = Boolean(subject && (subject.includes('সাধারণ জ্ঞান') || subject.toLowerCase().includes('general knowledge') || subject.toLowerCase().includes('gk') || subject.includes('জিকে')));
  const isEnglish2nd = !isGk && Boolean(subject && (subject.includes('২য়') || subject.includes('2nd') || subject.toLowerCase().includes('grammar') || subject.includes('ব্যাকরণ')));
  const isEnglish = !isGk && Boolean(subject && (subject.includes('ইংরেজি') || subject.toLowerCase().includes('english')));
  const isEnglishOnly = isEnglish && !isEnglish2nd;
  const fontName = isEnglishOnly ? 'Times New Roman' : 'Kalpurush';
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
    : (fullMarks ? toBengaliNumerals(fullMarks) : (isGk ? '৫০' : toBengaliNumerals(totalCalculated)));

  let displayExamTitle = examTitle;
  if (isEnglish) {
    if (examTitle.includes('৩য়') || examTitle.includes('3rd')) displayExamTitle = '3ʳᵈ Semester Examination- 2026';
    else if (examTitle.includes('২য়') || examTitle.includes('2nd')) displayExamTitle = '2ⁿᵈ Semester Examination- 2026';
    else if (examTitle.includes('১ম') || examTitle.includes('1st')) displayExamTitle = '1ˢᵗ Semester Examination- 2026';
  }

  let displaySubject = subject;
  if (isEnglish) {
    if (subject.includes('২য়') || subject.includes('2nd')) displaySubject = 'English 2ⁿᵈ';
    else if (subject.includes('১ম') || subject.includes('1st')) displaySubject = 'English 1ˢᵗ';
    else if (subject.includes('ইংরেজি')) displaySubject = 'English';
  }

  let displayClass = className;
  if (isEnglish) {
    if (className === 'পঞ্চম' || className === '৫ম' || className === '5') displayClass = 'Five';
    else if (className === '৪র্থ' || className === '4') displayClass = 'Four';
    else if (className === '৩য়' || className === '3') displayClass = 'Three';
    else if (className === '২য়' || className === '2') displayClass = 'Two';
    else if (className === '১ম' || className === '1') displayClass = 'One';
  }

  let displayTime = timeAllowed;
  if (isEnglish) {
    if (timeAllowed.includes('১')) displayTime = '1hr';
    else if (timeAllowed.includes('২')) displayTime = '2hr';
    else if (timeAllowed.includes('৩')) displayTime = '3hr';
  }

  const docxSchoolName = isEnglish && (!schoolName || schoolName.includes('শওকত ভূঁইয়া') || schoolName.toLowerCase().includes('showkot'))
    ? 'Showkot Bhuiyan Child Care Homes'
    : schoolName;

  const docxSchoolSubtitle = isEnglish && (!schoolSubtitle || schoolSubtitle.includes('প্রি-ক্যাডেট') || schoolSubtitle.toLowerCase().includes('pre-cadet'))
    ? 'Pre-Cadet Child Care Homes'
    : (schoolSubtitle ? schoolSubtitle.trim() : '');

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
            text: docxSchoolName, 
            bold: true, 
            size: 32, // 16pt
            font: FONT_RUN 
          }),
        ],
      })
    );

    // Line 2: School Name Line 2
    if (docxSchoolSubtitle) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: ZERO_SPACING,
          indent: ZERO_INDENT,
          children: [
            new TextRun({ 
              text: docxSchoolSubtitle, 
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
            text: displayExamTitle,
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
          new TextRun({ text: `${displaySubject}`, bold: true, font: FONT_RUN, size: 24 }),
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
          new TextRun({ text: `${isEnglish ? displayClass : toBengaliNumerals(displayClass)}`, bold: true, font: FONT_RUN, size: 24 }),
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
          new TextRun({ text: `${displayTime}`, bold: isEnglish, font: FONT_RUN, size: 20 }),
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

    if (isGk || section.id === 'gk_questions') {
      // 1. Centered Subtitle / Instruction Line (e.g. যেকোনো দশটি প্রশ্নের উত্তর দাও। সকল প্রশ্নের মান সমান)
      const gkTitle = (section.title || 'যেকোনো দশটি প্রশ্নের উত্তর দাও। সকল প্রশ্নের মান সমান').replace(/সমান\s*সমান/g, 'সমান');
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 180, line: 240, lineRule: 'auto' },
          indent: ZERO_INDENT,
          children: [
            new TextRun({ 
              text: gkTitle, 
              bold: true, 
              font: FONT_RUN, 
              size: 24 // 12pt
            }),
          ],
        })
      );

      // 2. Direct GK questions list: ১।, ২।, ৩।, ..., ১২।
      (section.questions || []).forEach((q, qIndex) => {
        const cleanQ = cleanQuestionText(q.questionText);
        const prefix = `${toBengaliNumerals(qIndex + 1)}। `;
        docChildren.push(
          new Paragraph({
            spacing: ZERO_SPACING,
            indent: ZERO_INDENT,
            children: [
              new TextRun({ text: prefix, bold: true, font: FONT_RUN, size: 24 }),
              new TextRun({ text: cleanQ, font: FONT_RUN, size: 24 }),
            ],
          })
        );

        if (includeAnswers && q.answer) {
          docChildren.push(
            new Paragraph({
              spacing: ZERO_SPACING,
              indent: ZERO_INDENT,
              children: [
                new TextRun({ text: '  উ: ', bold: true, color: '047857', font: FONT_RUN, size: 24 }),
                new TextRun({ text: `${q.answer}`, color: '065F46', font: FONT_RUN, size: 24 }),
              ],
            })
          );
        }
      });
      return;
    }

    const secType = getSectionType(section);

    const isOralSection = secType === 'oral';
    const isMatchSection = secType === 'match';
    const isFibSection = secType === 'fib';
    const isTfSection = secType === 'tf';
    const isMcq = secType === 'mcq' || (section.questions?.[0]?.options?.length > 0);

    const isVocab = secType === 'vocab';
    const isSentence = secType === 'sentence';
    const isPoem = secType === 'poem';
    const isPunctuation = secType === 'punctuation';
    const isComposition = secType === 'essay';
    const isConjunct = secType === 'conjunct';
    const isOpposite = secType === 'opposite';
    const isOneWord = secType === 'one_word';
    const isSynonym = secType === 'synonym';
    const isBagdhara = secType === 'bagdhara';
    const isLetter = secType === 'letter';
    const isEssay = secType === 'essay';
    const isSummary = secType === 'summary';
    const isAmplification = secType === 'amplification';

    const isSinglePrompt = isPunctuation || isComposition || isLetter || isEssay || isSummary || isAmplification || ((section.id?.includes('theme') || section.id?.includes('desc') || section.id?.includes('long') || section.title?.includes('মূলভাব') || section.title?.includes('বর্ণনামূলক') || section.title?.includes('দরখাস্ত') || section.title?.includes('চিঠি')) && section.questions?.length <= 1) || (section.questions?.length === 1 && !isMcq);
    const isInlineComma = isVocab || isSentence || isConjunct || isOpposite || isOneWord || isSynonym || isBagdhara;

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
          } else if (isOpposite) {
            if (rawAns.includes('=')) {
              lineText = rawAns;
            } else if (rawAns) {
              lineText = `${qWord} = ${rawAns}`;
            } else {
              lineText = qWord;
            }
          } else if (isOneWord) {
            if (rawAns.includes('=')) {
              lineText = rawAns;
            } else if (rawAns) {
              lineText = `${qWord} = ${rawAns}`;
            } else {
              lineText = qWord;
            }
          } else if (isBagdhara) {
            if (rawAns.includes('=') || rawAns.includes('-') || rawAns.includes('–')) {
              lineText = rawAns;
            } else if (rawAns) {
              lineText = `${qWord} = ${rawAns}`;
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

      // In Answer Key: format multi-line paragraphs cleanly for letter, essay, summary, amplification, punctuation
      if (includeAnswers && !isPoem && singleQ?.answer) {
        const rawAns = String(singleQ.answer).trim();
        const ansLines = rawAns.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        
        if (ansLines.length <= 1) {
          docChildren.push(
            new Paragraph({
              spacing: ZERO_SPACING,
              indent: ZERO_INDENT,
              children: [
                new TextRun({ text: `${isEnglish ? 'Answer: ' : 'উত্তর: '}`, bold: true, color: '047857', size: 24, font: FONT_RUN }),
                new TextRun({ text: `${rawAns}`, color: '065F46', size: 24, font: FONT_RUN }),
              ],
            })
          );
        } else {
          docChildren.push(
            new Paragraph({
              spacing: ZERO_SPACING,
              indent: ZERO_INDENT,
              children: [
                new TextRun({ text: `${isEnglish ? 'Answer: ' : 'উত্তরমালা / সমাধান:'}`, bold: true, color: '047857', size: 24, font: FONT_RUN }),
              ],
            })
          );
          ansLines.forEach((line) => {
            docChildren.push(
              new Paragraph({
                spacing: ZERO_SPACING,
                indent: ZERO_INDENT,
                children: [
                  new TextRun({ text: `  ${line}`, color: '065F46', size: 24, font: FONT_RUN }),
                ],
              })
            );
          });
        }
      }

    } else {
      // 5. STANDARD NUMBERED SECTIONS: MCQ, শূন্যস্থান, সত্য-মিথ্যা, প্রশ্নোত্তর (with a), b), c) or ক, খ, গ...)
      (section.questions || []).forEach((q, qIndex) => {
        let cleanQ = cleanQuestionText(q.questionText);
        const isGrammarDef = isEnglish && (secType === 'qa' || secType === 'generic' || section.title?.includes('সংজ্ঞা') || section.title?.includes('কাকে বলে') || section.title?.toLowerCase().includes('answer the following') || section.title?.toLowerCase().includes('question') || section.id?.includes('def'));
        if (isGrammarDef) {
          cleanQ = fixBilingualGrammarQuestion(cleanQ);
        }
        const prefix = isMcq 
          ? (isEnglish ? `${qIndex + 1}) ` : `${toBengaliNumerals(qIndex + 1)}) `) 
          : (section.questions?.length === 1 
              ? '' 
              : (isEnglish ? `${enSubLetters[qIndex] || `${qIndex + 1})`} ` : `${bnSubLetters[qIndex] || `(${qIndex + 1})`} `));

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
          let ansContent = q.answer;
          if (isGrammarDef) {
            ansContent = ensureBengaliGrammarAnswer(cleanQ, ansContent);
          }
          const ansLines = String(ansContent).split('\n').map((l) => l.trim()).filter(Boolean);
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
