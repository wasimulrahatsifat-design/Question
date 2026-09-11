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
  // Strip single/double letter, roman numerals, digits followed strictly by closing paren, danda, dash, colon, semicolon e.g. "a) ", "১। ", "ক) ", "a: "
  str = str.replace(/^([0-9\u09E6-\u09EF]+|[a-zA-Z]{1,2}|[ivxlcIVXLC]{1,4}|[ক-হ])[\)\।\-\:\;]\s*/, '');
  // Strip prefix followed by dot ONLY if NOT immediately followed by a digit (preserves decimal numbers e.g. 0.5, ০.৩, ৩.৭৬, ০.৮, ৪.২, ১৭.২)
  str = str.replace(/^([0-9\u09E6-\u09EF]+|[a-zA-Z]{1,2}|[ivxlcIVXLC]{1,4}|[ক-হ])\.(?![0-9\u09E6-\u09EF])\s*/, '');
  // Strip "Column A:", "Column B:", "Column A -", "Column B -", "বামপাশ:", "ডানপাশ:"
  str = str.replace(/^(?:Column\s*[AB]|বামপাশ|ডানপাশ)[\s\:\-\—\–\.]+/i, '');
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

// Clean matching table items (Column A / Column B text) to prevent "Column A: get up" or "a) Column A:" artifacts
export function cleanMatchingText(text) {
  if (!text) return '';
  let str = String(text).trim();
  str = str.replace(/^["'`]+|["'`]+$/g, '');
  for (let iter = 0; iter < 3; iter++) {
    str = str.replace(/^[\:\;\s\-\–\—\.\।\)\(]+/, '').trim();
    str = str.replace(/^\([a-zA-Z0-9\u09E6-\u09EFক-হivxlcIVXLC]+\)\s*/, '');
    str = str.replace(/^([0-9\u09E6-\u09EF]+|[a-zA-Z]{1,2}|[ivxlcIVXLC]{1,4}|[ক-হ])[\)\।\-\:\;]\s*/, '');
    str = str.replace(/^([0-9\u09E6-\u09EF]+|[a-zA-Z]{1,2}|[ivxlcIVXLC]{1,4}|[ক-হ])\.(?![0-9\u09E6-\u09EF])\s*/, '');
    str = str.replace(/^(?:Column\s*[AB]|বামপাশ|ডানপাশ)[\s\:\-\—\–\.]+/i, '').trim();
  }
  str = str.replace(/^[\:\;\s\-\–\—\.\।\)\(]+/, '').trim();
  // Capitalize first letter if starting with lower-case Latin letter
  if (str && /^[a-z]/.test(str)) {
    str = str.charAt(0).toUpperCase() + str.slice(1);
  }
  return str.trim();
}

const GRAMMAR_TERMS = new Set([
  'noun', 'pronoun', 'adjective', 'verb', 'adverb', 'preposition', 'conjunction', 'interjection',
  'sentence', 'tense', 'gender', 'number', 'person', 'case', 'voice', 'degree', 'article', 'articles',
  'punctuation', 'parts of speech', 'finite verb', 'non-finite verb', 'transitive verb', 'intransitive verb',
  'auxiliary verb', 'modal auxiliary', 'modal verb', 'clause', 'phrase', 'subject', 'predicate',
  'proper noun', 'common noun', 'collective noun', 'material noun', 'abstract noun',
  'singular number', 'plural number', 'singular', 'plural',
  'masculine gender', 'feminine gender', 'neuter gender', 'common gender', 'masculine', 'feminine', 'neuter',
  'present tense', 'past tense', 'future tense',
  'first person', 'second person', 'third person',
  'assertive sentence', 'interrogative sentence', 'imperative sentence', 'optative sentence', 'exclamatory sentence',
  'assertive', 'interrogative', 'imperative', 'optative', 'exclamatory',
  'definite article', 'indefinite article'
]);

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
    let rawTerm1 = combinedMatch[1].trim().replace(/^(?:a|an|the)\s+/i, '');
    let rawTerm2 = combinedMatch[2].trim().replace(/^(?:a|an|the)\s+/i, '').replace(/s$/i, '');
    if (GRAMMAR_TERMS.has(rawTerm1.toLowerCase()) || GRAMMAR_TERMS.has(rawTerm2.toLowerCase())) {
      let term1 = rawTerm1.charAt(0).toUpperCase() + rawTerm1.slice(1);
      let term2 = rawTerm2.charAt(0).toUpperCase() + rawTerm2.slice(1);
      return `${term1} কাকে বলে? ${term2} কত প্রকার ও কি কি?`;
    }
  }

  // 1. "What are the kinds of verb? Give examples." / "How many kinds of sentence are there?"
  const kindsMatch = text.match(/(?:what\s+are\s+the\s+kinds\s+of|how\s+many\s+kinds\s+of|classify|kinds\s+of|types\s+of)\s+([a-zA-Z\s\-]+?)(?:\?|\.|\s*give|\s*write|\s*explain|$)/i);
  if (kindsMatch) {
    let rawTerm = kindsMatch[1].trim().replace(/^(?:a|an|the)\s+/i, '').replace(/s$/i, '');
    if (GRAMMAR_TERMS.has(rawTerm.toLowerCase())) {
      let term = rawTerm.charAt(0).toUpperCase() + rawTerm.slice(1);
      return `${term} কত প্রকার ও কি কি?`;
    }
  }

  // 2. "What is a Modal Auxiliary verb?" / "What is Interjection?" / "Define verb."
  const defMatch = text.match(/(?:what\s+is\s+(?:a|an|the)?|define|explain|what\s+do\s+you\s+mean\s+by)\s+([a-zA-Z\s\-]+?)(?:\?|\.|\s*give|\s*with\s+example|\s*and\s+give|$)/i);
  if (defMatch) {
    let rawTerm = defMatch[1].trim().replace(/^(?:a|an|the)\s+/i, '');
    if (GRAMMAR_TERMS.has(rawTerm.toLowerCase())) {
      let term = rawTerm.charAt(0).toUpperCase() + rawTerm.slice(1);
      return `${term} কাকে বলে?`;
    }
  }

  // 3. "Give/Write definition of X with examples"
  const giveDefMatch = text.match(/(?:give|write)\s+(?:the\s+)?definition\s+of\s+([a-zA-Z\s\-]+?)(?:\?|\.|\s*with|\s*give|$)/i);
  if (giveDefMatch) {
    let rawTerm = giveDefMatch[1].trim().replace(/^(?:a|an|the)\s+/i, '');
    if (GRAMMAR_TERMS.has(rawTerm.toLowerCase())) {
      let term = rawTerm.charAt(0).toUpperCase() + rawTerm.slice(1);
      return `${term} কাকে বলে?`;
    }
  }

  // 4. If single grammar term e.g. "Verb", "Parts of speech", "Noun"
  const singleTerm = text.replace(/[\?\.\!]/g, '').trim().toLowerCase();
  if (GRAMMAR_TERMS.has(singleTerm)) {
    let term = singleTerm.charAt(0).toUpperCase() + singleTerm.slice(1);
    return `${term} কাকে বলে?`;
  }

  return text;
}

export function ensureBengaliGrammarAnswer(qText, currentAnswer) {
  const q = String(qText || '').toLowerCase().trim();
  let ans = String(currentAnswer || '').trim();

  // If already has an answer from AI/source, remove any unwanted bracketed English definitions like [In English: ...], [A noun is...], or page tags
  if (ans && ans.length >= 5) {
    ans = ans.replace(/\[\s*(?:in\s*english|english|def|definition)?\s*:[^\]]*\]/gi, '').trim();
    ans = ans.replace(/\[\s*(?:পৃষ্ঠা|page|p\.)[^\]]*\]/gi, '').trim();
    ans = ans.replace(/\[\s*[A-Za-z\s,.'"-]{8,}\s*\]/g, '').trim();
    return ans;
  }

  // Fallback / Auto-completion for all English grammar terms
  if (q.includes('singular number') || (q.includes('singular') && q.includes('number'))) {
    return "যে Noun বা Pronoun দ্বারা কেবল একটি মাত্র ব্যক্তি, বস্তু বা স্থানকে বোঝায়, তাকে Singular Number (একবচন) বলে।\nযেমন: Book, Boy, Pen, Bird ইত্যাদি।";
  }
  if (q.includes('plural number') || (q.includes('plural') && q.includes('number'))) {
    return "যে Noun বা Pronoun দ্বারা একের অধিক (দুই বা ততোধিক) ব্যক্তি, বস্তু বা স্থানকে বোঝায়, তাকে Plural Number (বহুবচন) বলে।\nযেমন: Books, Boys, Pens, Birds ইত্যাদি।";
  }
  if (q.includes('number') || q.includes('বচন')) {
    return "যা দ্বারা কোনো ব্যক্তি, বস্তু বা প্রাণীর সংখ্যা বোঝায়, তাকে Number (বচন) বলে।\nNumber প্রধানত ২ প্রকার। যথা: ১) Singular Number (একবচন), ২) Plural Number (বহুবচন)।";
  }
  if (q.includes('masculine gender') || (q.includes('masculine') && q.includes('gender'))) {
    return "যে Noun বা Pronoun দ্বারা কেবল পুরুষ জাতিকে বোঝায়, তাকে Masculine Gender (পুংলিঙ্গ) বলে।\nযেমন: Father, King, Boy, Lion ইত্যাদি।";
  }
  if (q.includes('feminine gender') || (q.includes('feminine') && q.includes('gender'))) {
    return "যে Noun বা Pronoun দ্বারা কেবল স্ত্রী বা নারী জাতিকে বোঝায়, তাকে Feminine Gender (স্ত্রীলিঙ্গ) বলে।\nযেমন: Mother, Queen, Girl, Lioness ইত্যাদি।";
  }
  if (q.includes('common gender') || (q.includes('common') && q.includes('gender'))) {
    return "যে শব্দ দ্বারা পুরুষ ও স্ত্রী উভয়কেই বোঝায়, তাকে Common Gender (উভয়লিঙ্গ) বলে।\nযেমন: Child, Friend, Baby, Doctor ইত্যাদি।";
  }
  if (q.includes('neuter gender') || (q.includes('neuter') && q.includes('gender'))) {
    return "যে শব্দ দ্বারা কোনো অপ্রাণিবাচক বা অচেতন জড় বস্তুকে বোঝায়, তাকে Neuter Gender (ক্লীবলিঙ্গ) বলে।\nযেমন: Book, Table, Pen, Chair ইত্যাদি।";
  }
  if (q.includes('gender') || q.includes('লিঙ্গ')) {
    return "যে চিহ্ন বা লক্ষণ দ্বারা কোনো noun বা pronoun পুরুষ, স্ত্রী, ক্লীব বা উভয় জাতীয় তা নির্দেশ করে, তাকে Gender (লিঙ্গ) বলে।\nGender ৪ প্রকার। যথা: ১) Masculine Gender (পুরুষবাচক), ২) Feminine Gender (স্ত্রীবাচক), ৩) Common Gender (উভয়লিঙ্গ), ৪) Neuter Gender (ক্লীবলিঙ্গ)।";
  }
  if (q.includes('proper noun')) {
    return "যে Noun দ্বারা কোনো নির্দিষ্ট ব্যক্তি, স্থান বা বস্তুর নাম বোঝায়, তাকে Proper Noun বলে।\nযেমন: Dhaka, Rahim, The Quran, Bangladesh ইত্যাদি।";
  }
  if (q.includes('common noun')) {
    return "যে Noun দ্বারা একই জাতীয় সকল ব্যক্তি বা বস্তুর সাধারণ নাম বোঝায়, তাকে Common Noun বলে।\nযেমন: Boy, Girl, City, River, Book ইত্যাদি।";
  }
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
  if (q.includes('adverb') || q.includes('ভাববিশেষণ')) {
    return "যে word কোনো Verb, Adjective বা অন্য কোনো Adverb-কে বিশেষিত করে, তাকে Adverb বলে।\nযেমন: slowly, quickly, very, now, well ইত্যাদি।\nযেমন: He walks slowly.";
  }
  if (q.includes('preposition') || q.includes('পদান্বয়ী')) {
    return "যে word কোনো Noun বা Pronoun-এর পূর্বে বসে বাক্যের অন্য শব্দের সাথে সম্পর্ক স্থাপন করে, তাকে Preposition বলে।\nযেমন: in, on, at, to, under, with ইত্যাদি।\nযেমন: The book is on the table.";
  }
  if (q.includes('conjunction') || q.includes('সংযোজক')) {
    return "যে word দুই বা ততোধিক word, phrase বা clause-কে যুক্ত করে, তাকে Conjunction বলে।\nযেমন: and, but, or, because ইত্যাদি।\nযেমন: Rahim and Karim are two brothers.";
  }
  if (q.includes('interjection') || q.includes('আবেগসূচক')) {
    return "যে word দ্বারা মনের আকস্মিক আবেগ, আনন্দ, দুঃখ, বিস্ময় বা ভয় প্রকাশ পায়, তাকে Interjection বলে।\nযেমন: Alas! Hurrah! Bravo! ইত্যাদি।\nযেমন: Hurrah! We have won the game.";
  }
  if (q.includes('present tense') || (q.includes('present') && q.includes('tense'))) {
    return "যে কাজ বর্তমানে সম্পন্ন হয় বা হচ্ছে বোঝায়, তাকে Present Tense (বর্তমান কাল) বলে।\nযেমন: I read a book. He goes to school.";
  }
  if (q.includes('past tense') || (q.includes('past') && q.includes('tense'))) {
    return "যে কাজ অতীতকালে সম্পন্ন হয়েছিল বোঝায়, তাকে Past Tense (অতীত কাল) বলে।\nযেমন: I ate rice. He went to school.";
  }
  if (q.includes('future tense') || (q.includes('future') && q.includes('tense'))) {
    return "যে কাজ ভবিষ্যতে সম্পন্ন হবে বোঝায়, তাকে Future Tense (ভবিষ্যত কাল) বলে।\nযেমন: I will play football. He will go home.";
  }
  if (q.includes('tense') || q.includes('কাল')) {
    return "কোনো কাজ সম্পন্ন হওয়ার সময়কে Tense (কাল) বলে।\nTense প্রধানত ৩ প্রকার। যথা: ১) Present Tense (বর্তমান কাল), ২) Past Tense (অতীত কাল), ৩) Future Tense (ভবিষ্যত কাল)।";
  }
  if (q.includes('assertive')) {
    return "যে Sentence দ্বারা কোনো সাধারণ বিবৃতি বা বর্ণনা প্রকাশ করা হয়, তাকে Assertive Sentence বলে।\nযেমন: The sky is blue. Birds fly in the sky.";
  }
  if (q.includes('interrogative')) {
    return "যে Sentence দ্বারা কোনো প্রশ্ন বা জিজ্ঞাসা করা হয়, তাকে Interrogative Sentence বলে।\nযেমন: What is your name? Do you like tea?";
  }
  if (q.includes('imperative')) {
    return "যে Sentence দ্বারা আদেশ, উপদেশ, নিষেধ বা অনুরোধ বোঝায়, তাকে Imperative Sentence বলে।\nযেমন: Open the door. Always speak the truth.";
  }
  if (q.includes('optative')) {
    return "যে Sentence দ্বারা মনের ইচ্ছা, প্রার্থনা বা আশীর্বাদ প্রকাশ পায়, তাকে Optative Sentence বলে।\nযেমন: May you live long. God bless you.";
  }
  if (q.includes('exclamatory')) {
    return "যে Sentence দ্বারা মনের আকস্মিক আনন্দ, দুঃখ, ভয় বা বিস্ময় প্রকাশ পায়, তাকে Exclamatory Sentence বলে।\nযেমন: How beautiful the bird is! Alas! We lost.";
  }
  if (q.includes('sentence') || q.includes('বাক্য')) {
    return "এক বা একাধিক শব্দ পাশাপাশি বসে যদি সম্পূর্ণ মনের ভাব প্রকাশ করে, তবে তাকে Sentence (বাক্য) বলে।\nযেমন: Birds fly in the sky.\nঅর্থানুসারে Sentence ৫ প্রকার। যথা: ১) Assertive, ২) Interrogative, ৩) Imperative, ৪) Optative, ৫) Exclamatory।";
  }
  if (q.includes('article')) {
    return "A, An এবং The-কে Article বলে।\nArticle প্রধানত ২ প্রকার: ১) Indefinite Article (A, An), ২) Definite Article (The)।";
  }
  if (q.includes('person') || q.includes('পুরুষ')) {
    return "Sentence-এ ব্যবহৃত যেসব Noun বা Pronoun-কে ভিত্তি করে Verb-এর রূপ নির্ধারিত হয়, তাকে Person (পুরুষ) বলে।\nPerson ৩ প্রকার: ১) First Person (I, We), ২) Second Person (You), ৩) Third Person (He, She, They, It)।";
  }

  return ans;
}

/**
 * Universal Section Type Detector (prioritizes section title over id)
 */
export function getSectionType(sec) {
  const title = (sec?.title || '').toLowerCase().trim();
  const id = (sec?.id || '').toLowerCase().trim();

  // Jumbled letters / বর্ণ সাজানো (Computer 1 no.)
  if (title.includes('এলোমেলো বর্ণ') || title.includes('বর্ণ সাজি') || title.includes('বর্ণগুলা') || title.includes('বর্ণগুলো') || title.includes('jumbled') || id.includes('jumble')) return 'jumble';

  // 1. Punctuation (HIGH PRIORITY - so 'capital letters' is never caught by letter)
  if (title.includes('বিরাম') || title.includes('যতি') || title.includes('punctuation') || title.includes('capital') || id.includes('punctuation')) return 'punctuation';

  // 2. Vocabulary & Word Meaning
  if (title.includes('শব্দার্থ') || title.includes('শব্দের অর্থ') || title.includes('word meaning') || id === 'en_word_meaning' || id === 'bn_vocab') return 'vocab';

  // 3. Make Sentence
  if (title.includes('বাক্য গঠন') || title.includes('বাক্য তৈরি') || title.includes('make sentence') || title.includes('বাক্য রচনা') || id === 'bn_sentence' || id === 'en_make_sentence') return 'sentence';

  // 4. Conjunct / যুক্তবর্ণ
  if (title.includes('যুক্তবর্ণ') || title.includes('conjunct') || id.includes('conjunct')) return 'conjunct';

  // 5. Opposite / বিপরীত শব্দ
  if (title.includes('বিপরীত শব্দ') || title.includes('বিপরীতার্থ') || title.includes('antonym') || id.includes('opposite')) return 'opposite';

  // 6. Synonym / সমার্থক শব্দ
  if (title.includes('সমার্থক শব্দ') || title.includes('প্রতিশব্দ') || title.includes('synonym') || id.includes('synonym')) return 'synonym';

  // 7. One Word / এক কথায় প্রকাশ
  if (title.includes('এক কথায় প্রকাশ') || title.includes('এককথায় প্রকাশ') || title.includes('এক কথায়') || title.includes('এককথায়') || id.includes('one_word')) return 'one_word';

  // 8. Bagdhara / বাগধারা
  if (title.includes('বাগধারা') || title.includes('idiom') || title.includes('phrase') || id.includes('bagdhara')) return 'bagdhara';

  // 9. Summary / সারাংশ / সারমর্ম
  if (title.includes('সারাংশ') || title.includes('সারমর্ম') || title.includes('summary') || id.includes('summary')) return 'summary';

  // 10. Amplification / ভাবসম্প্রসারণ
  if (title.includes('ভাবসম্প্রসারণ') || title.includes('ভাব-সম্প্রসারণ') || title.includes('ভাব সম্প্রসারণ') || id.includes('amplification')) return 'amplification';

  // 11. Letter & Application (Never match plain 'letter' or plain 'পত্র' substring)
  if (title.includes('দরখাস্ত') || title.includes('আবেদনপত্র') || title.includes('চিঠি লিখ') || title.includes('চিঠি') || title.includes('application') || /\bletters?\s*writing\b/i.test(title) || /\bwrite\s+a\s+letter\b/i.test(title) || id.includes('letter') || id.includes('application') || id === 'bn2_letter') return 'letter';

  // 12. Poem & Rhyme / কবিতা / ছড়া / Rhyme (High priority check so Rhymes are never misclassified as standard composition)
  if (title.includes('কবিতা') || title.includes('ছড়া') || title.includes('poem') || title.includes('rhyme') || id.includes('poem') || id.includes('rhyme')) return 'poem';
  const firstQ = (sec?.questions?.[0]?.questionText || '').toLowerCase();
  if (firstQ.includes('rhyme') || firstQ.includes('poem') || firstQ.includes('কবিতা') || firstQ.includes('ছড়া')) {
    return 'poem';
  }

  // 13. Essay & Composition & Paragraph
  if (title.includes('রচনা') || title.includes('essay') || title.includes('composition') || title.includes('অনুচ্ছেদ লিখ') || title.includes('paragraph') || id.includes('essay') || id.includes('composition') || id.includes('paragraph') || id === 'en_composition') return 'essay';

  // 14. MCQ / সঠিক উত্তর
  if (title.includes('সঠিক উত্তর') || title.includes('mcq') || id.includes('mcq')) return 'mcq';

  // 15. Fill in the blanks / শূন্যস্থান
  if (title.includes('শূন্যস্থান') || title.includes('fill in') || id.includes('fib') || id.includes('fill_blanks')) return 'fib';

  // 16. True/False / সত্য-মিথ্যা
  if (title.includes('সত্য/মিথ্যা') || title.includes('সত্য-মিথ্যা') || title.includes('সত্য') || title.includes('true') || id.includes('tf') || id.includes('true_false')) return 'tf';

  // 17. Matching / মিলকরণ
  if (title.includes('মিল') || title.includes('match') || id.includes('match')) return 'match';

  // 18. Translation / অনুবাদ
  if (title.includes('translation') || title.includes('অনুবাদ') || id.includes('translate')) return 'translate';

  // 19. Oral / মৌখিক
  if (title.includes('মৌখিক') || title.includes('oral') || id.includes('oral')) return 'oral';

  // 20. Question Answers / ব্যাকরণ সংজ্ঞা / কাঠামোবদ্ধ প্রশ্ন (fallback to qa)
  if (title.includes('answer the following') || title.includes('answer the question') || title.includes('questions') || title.includes('প্রশ্নের উত্তর') || title.includes('প্রশ্ন গুলোর উত্তর') || title.includes('সংজ্ঞাসহ') || title.includes('সংজ্ঞা লিখ') || title.includes('কাকে বলে') || title.includes('ব্যাকরণ সম্পর্কিত') || id.includes('qa') || id.includes('questions') || id.includes('definition') || id.includes('grammar')) return 'qa';

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
  const isComputer = !isGk && Boolean(subject && (subject.includes('কম্পিউটার') || subject.toLowerCase().includes('computer') || subject.toLowerCase().includes('ict') || subject.includes('আইসিটি')));
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
    const yearMatch = (examTitle || '').match(/\d{4}|[\u09E6-\u09EF]{4}/);
    const yr = yearMatch ? yearMatch[0].replace(/[\u09E6-\u09EF]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)) : new Date().getFullYear();
    if (examTitle.includes('বার্ষিক') || examTitle.toLowerCase().includes('annual')) displayExamTitle = `Annual Examination- ${yr}`;
    else if (examTitle.includes('৩য়') || examTitle.includes('3rd')) displayExamTitle = `3ʳᵈ Semester Examination- ${yr}`;
    else if (examTitle.includes('২য়') || examTitle.includes('2nd')) displayExamTitle = `2ⁿᵈ Semester Examination- ${yr}`;
    else if (examTitle.includes('১ম') || examTitle.includes('1st')) displayExamTitle = `1ˢᵗ Semester Examination- ${yr}`;
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
    const isJumble = secType === 'jumble';
    const isInlineComma = isVocab || isSentence || isConjunct || isOpposite || isOneWord || isSynonym || isBagdhara || isJumble || (isComputer && (sIndex === 0 || sIndex === 1));

    const isSingleMathProblem = section.questions?.length === 1 && (section.id?.startsWith('math_word') || section.id?.startsWith('math_problem') || section.id === 'math_lcm_gcd' || section.id?.includes('table') || section.id?.includes('multiplication') || section.title?.includes('নামতা'));
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
      displayTitle = cleanQuestionText(section.questions[0].questionText);
    } else if (isSingleMathProblem && section.questions?.[0]?.questionText) {
      displayTitle = cleanQuestionText(section.questions[0].questionText);
    } else if (isComposition) {
      const qText = cleanQuestionText(section.questions?.[0]?.questionText || section.title || '');
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
      if (includeAnswers && (isComposition || isSingleMathProblem) && !isPoem && section.questions?.[0]?.answer) {
        docChildren.push(
          new Paragraph({
            spacing: ZERO_SPACING,
            indent: ZERO_INDENT,
            children: [
              new TextRun({ text: isComposition ? (isEnglish ? 'Model Composition: ' : 'মডেল রচনা: ') : 'সমাধান/উত্তর: ', bold: true, color: '047857', size: 24, font: FONT_RUN }),
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
        let left = q.questionText || '';
        let right = q.answer || '';
        if (left.includes('|')) {
          const parts = left.split('|');
          left = parts[0];
          right = parts[1] || right;
        } else if (left.includes('=')) {
          const parts = left.split('=');
          left = parts[0];
          right = parts[1] || right;
        }
        left = cleanMatchingText(left);
        right = cleanMatchingText(right);
        if (left && !right && q.answer) {
          right = cleanMatchingText(q.answer);
        }
        leftItems.push({ text: left, originalAnswer: right });
        rightItemsRaw.push(right);
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
          } else if (isJumble || isComputer) {
            if (rawAns.includes('=')) {
              lineText = rawAns;
            } else if (rawAns) {
              lineText = `${qWord} = ${rawAns}`;
            } else {
              lineText = qWord;
            }
          } else if (isSynonym) {
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
