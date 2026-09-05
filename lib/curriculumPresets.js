/**
 * Primary School Curriculum Question Pattern & Marks Distribution Presets
 * শ্রেণি ও বিষয়ভিত্তিক আদর্শ মানবন্টন ও প্রশ্নের ধারার প্রিসেট
 */

export const DEFAULT_CLASSES = ['১ম', '২য়', '৩য়', '৪র্থ', 'পঞ্চম'];

export const DEFAULT_CLASS_SUBJECTS = {
  '১ম': ['বাংলা', 'ইংরেজি', 'প্রাথমিক গণিত'],
  '২য়': ['বাংলা', 'ইংরেজি', 'প্রাথমিক গণিত'],
  '৩য়': [
    'বাংলা',
    'ইংরেজি',
    'প্রাথমিক গণিত',
    'বাংলাদেশ ও বিশ্বপরিচয়',
    'প্রাথমিক বিজ্ঞান',
    'ইসলাম ও নৈতিক শিক্ষা',
    'হিন্দুধর্ম ও নৈতিক শিক্ষা'
  ],
  '৪র্থ': [
    'বাংলা ১ম পত্র',
    'বাংলা ২য় পত্র',
    'ইংরেজি',
    'প্রাথমিক গণিত',
    'বাংলাদেশ ও বিশ্বপরিচয়',
    'প্রাথমিক বিজ্ঞান',
    'ইসলাম ও নৈতিক শিক্ষা',
    'হিন্দুধর্ম ও নৈতিক শিক্ষা'
  ],
  'পঞ্চম': [
    'বিজ্ঞান',
    'প্রাথমিক গণিত',
    'বাংলা ১ম পত্র',
    'বাংলা ২য় পত্র',
    'ইংরেজি',
    'বাংলাদেশ ও বিশ্বপরিচয়',
    'ইসলাম ও নৈতিক শিক্ষা',
    'হিন্দুধর্ম ও নৈতিক শিক্ষা',
    'সাধারণ জ্ঞান'
  ]
};

export const DEFAULT_SUBJECTS = DEFAULT_CLASS_SUBJECTS['পঞ্চম'];
export const AVAILABLE_CLASSES = DEFAULT_CLASSES;
export const AVAILABLE_SUBJECTS = DEFAULT_SUBJECTS;

export const DEFAULT_CURRICULUM_PRESETS = {
  // ১. বিজ্ঞান / প্রাথমিক বিজ্ঞান (Science)
  'বিজ্ঞান': [
    { id: 'mcq', title: 'সঠিক উত্তরটি খাতায় লিখ', count: 5, marksPerQuestion: 1, enabled: true, isMcq: true },
    { id: 'short', title: 'সংক্ষেপে উত্তর লিখ', count: 5, marksPerQuestion: 3, enabled: true, isMcq: false },
    { id: 'fib', title: 'শূন্যস্থান পূরণ কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'tf', title: 'সত্য/মিথ্যা নির্ণয় কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'match', title: 'বামপাশের সাথে ডানপাশের মিল কর', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'long', title: 'নিচের প্রশ্ন গুলোর উত্তর দাও', count: 5, marksPerQuestion: 8, enabled: true, isMcq: false },
    { id: 'oral', title: 'মৌখিক ও শ্রেণিমূল্যায়ন', count: 1, marksPerQuestion: 15, enabled: true, isMcq: false },
  ],
  'প্রাথমিক বিজ্ঞান': [
    { id: 'mcq', title: 'সঠিক উত্তরটি খাতায় লিখ', count: 5, marksPerQuestion: 1, enabled: true, isMcq: true },
    { id: 'short', title: 'সংক্ষেপে উত্তর লিখ', count: 5, marksPerQuestion: 3, enabled: true, isMcq: false },
    { id: 'fib', title: 'শূন্যস্থান পূরণ কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'tf', title: 'সত্য/মিথ্যা নির্ণয় কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'match', title: 'বামপাশের সাথে ডানপাশের মিল কর', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'long', title: 'নিচের প্রশ্ন গুলোর উত্তর দাও', count: 5, marksPerQuestion: 8, enabled: true, isMcq: false },
    { id: 'oral', title: 'মৌখিক ও শ্রেণিমূল্যায়ন', count: 1, marksPerQuestion: 15, enabled: true, isMcq: false },
  ],

  // ২. বাংলাদেশ ও বিশ্বপরিচয় (BGS)
  'বাংলাদেশ ও বিশ্বপরিচয়': [
    { id: 'mcq', title: 'সঠিক উত্তরটি খাতায় লিখ', count: 5, marksPerQuestion: 1, enabled: true, isMcq: true },
    { id: 'short', title: 'সংক্ষেপে উত্তর লিখ', count: 5, marksPerQuestion: 3, enabled: true, isMcq: false },
    { id: 'fib', title: 'শূন্যস্থান পূরণ কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'tf', title: 'সত্য/মিথ্যা নির্ণয় কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'match', title: 'বামপাশের সাথে ডানপাশের মিল কর', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'long', title: 'কাঠামোবদ্ধ প্রশ্ন গুলোর উত্তর দাও', count: 5, marksPerQuestion: 8, enabled: true, isMcq: false },
    { id: 'oral', title: 'মৌখিক ও শ্রেণিমূল্যায়ন', count: 1, marksPerQuestion: 15, enabled: true, isMcq: false },
  ],

  // ৩. ইসলাম ও নৈতিক শিক্ষা
  'ইসলাম ও নৈতিক শিক্ষা': [
    { id: 'mcq', title: 'সঠিক উত্তরটি খাতায় লিখ', count: 5, marksPerQuestion: 1, enabled: true, isMcq: true },
    { id: 'short', title: 'সংক্ষেপে উত্তর লিখ', count: 5, marksPerQuestion: 3, enabled: true, isMcq: false },
    { id: 'fib', title: 'শূন্যস্থান পূরণ কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'tf', title: 'সত্য/মিথ্যা নির্ণয় কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'match', title: 'বামপাশের সাথে ডানপাশের মিল কর', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'long', title: 'বর্ণনামূলক প্রশ্ন গুলোর উত্তর দাও', count: 5, marksPerQuestion: 8, enabled: true, isMcq: false },
    { id: 'oral', title: 'মৌখিক ও শ্রেণিমূল্যায়ন', count: 1, marksPerQuestion: 15, enabled: true, isMcq: false },
  ],

  // ৪. হিন্দুধর্ম ও নৈতিক শিক্ষা
  'হিন্দুধর্ম ও নৈতিক শিক্ষা': [
    { id: 'mcq', title: 'সঠিক উত্তরটি খাতায় লিখ', count: 5, marksPerQuestion: 1, enabled: true, isMcq: true },
    { id: 'short', title: 'সংক্ষেপে উত্তর লিখ', count: 5, marksPerQuestion: 3, enabled: true, isMcq: false },
    { id: 'fib', title: 'শূন্যস্থান পূরণ কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'tf', title: 'সত্য/মিথ্যা নির্ণয় কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'match', title: 'বামপাশের সাথে ডানপাশের মিল কর', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'long', title: 'বর্ণনামূলক প্রশ্ন গুলোর উত্তর দাও', count: 5, marksPerQuestion: 8, enabled: true, isMcq: false },
    { id: 'oral', title: 'মৌখিক ও শ্রেণিমূল্যায়ন', count: 1, marksPerQuestion: 15, enabled: true, isMcq: false },
  ],

  // ৫. প্রাথমিক গণিত / গণিত (Math)
  'প্রাথমিক গণিত': [
    { id: 'math_short', title: 'সংক্ষেপে উত্তর দাও', count: 10, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'math_proc', title: 'চার প্রক্রিয়া সম্পর্কিত সমস্যা সমাধান কর', count: 2, marksPerQuestion: 8, enabled: true, isMcq: false },
    { id: 'math_fraction', title: 'ভগ্নাংশ ও দশমিক সম্পর্কিত সমস্যা সমাধান কর', count: 2, marksPerQuestion: 8, enabled: true, isMcq: false },
    { id: 'math_geometry', title: 'চিত্রসহ সংজ্ঞা লিখ (জ্যামিতি)', count: 3, marksPerQuestion: 4, enabled: true, isMcq: false },
    { id: 'math_measurement', title: 'পরিমাপ ও সময় সম্পর্কিত সমস্যা সমাধান কর', count: 2, marksPerQuestion: 8, enabled: true, isMcq: false },
    { id: 'math_data', title: 'উপাত্ত বিন্যস্তকরণ ও সাধারণ সৃজনশীল সমস্যা', count: 2, marksPerQuestion: 8, enabled: true, isMcq: false },
    { id: 'oral', title: 'মৌখিক মূল্যায়ন', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
  ],
  'গণিত': [
    { id: 'math_short', title: 'সংক্ষেপে উত্তর দাও', count: 10, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'math_proc', title: 'চার প্রক্রিয়া সম্পর্কিত সমস্যা সমাধান কর', count: 2, marksPerQuestion: 8, enabled: true, isMcq: false },
    { id: 'math_fraction', title: 'ভগ্নাংশ ও দশমিক সম্পর্কিত সমস্যা সমাধান কর', count: 2, marksPerQuestion: 8, enabled: true, isMcq: false },
    { id: 'math_geometry', title: 'চিত্রসহ সংজ্ঞা লিখ (জ্যামিতি)', count: 3, marksPerQuestion: 4, enabled: true, isMcq: false },
    { id: 'math_measurement', title: 'পরিমাপ ও সময় সম্পর্কিত সমস্যা সমাধান কর', count: 2, marksPerQuestion: 8, enabled: true, isMcq: false },
    { id: 'math_data', title: 'উপাত্ত বিন্যস্তকরণ ও সাধারণ সৃজনশীল সমস্যা', count: 2, marksPerQuestion: 8, enabled: true, isMcq: false },
    { id: 'oral', title: 'মৌখিক মূল্যায়ন', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
  ],

  // ৬. বাংলা / বাংলা ১ম পত্র (১০০ নম্বরের আদর্শ প্রশ্নপত্র)
  'বাংলা': [
    { id: 'bn_vocab', title: 'শব্দার্থ লিখ', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'bn_sentence', title: 'বাক্য গঠন কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_poem', title: 'কবিতা লিখ কবির নামসহ ১ম ৮ লাইন', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'bn_fib', title: 'শূন্যস্থান পূরণ কর', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'bn_punctuation', title: 'বিরাম চিহ্ন বসাও', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'bn_qa', title: 'নিচের প্রশ্ন গুলোর উত্তর দাও', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_conjunct', title: 'যুক্তবর্ণ বিভাজন করে ২টি শব্দ গঠন কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_desc', title: 'বর্ণনামূলক প্রশ্নের উত্তর দাও', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'bn_tf', title: 'সত্য-মিথ্যা নির্ণয় কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_match', title: 'বামপাশের সাথে ডানপাশের মিল কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
  ],
  'বাংলা ১ম পত্র': [
    { id: 'bn_vocab', title: 'শব্দার্থ লিখ', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'bn_sentence', title: 'বাক্য গঠন কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_poem', title: 'কবিতা লিখ কবির নামসহ ১ম ৮ লাইন', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'bn_fib', title: 'শূন্যস্থান পূরণ কর', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'bn_punctuation', title: 'বিরাম চিহ্ন বসাও', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'bn_qa', title: 'নিচের প্রশ্ন গুলোর উত্তর দাও', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_conjunct', title: 'যুক্তবর্ণ বিভাজন করে ২টি শব্দ গঠন কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_desc', title: 'বর্ণনামূলক প্রশ্নের উত্তর দাও', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'bn_tf', title: 'সত্য-মিথ্যা নির্ণয় কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_match', title: 'বামপাশের সাথে ডানপাশের মিল কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
  ],

  // ৭. বাংলা ২য় পত্র (ব্যাকরণ ও নির্মিতি)
  'বাংলা ২য় পত্র': [
    { id: 'bn2_grammar', title: 'ব্যাকরণ সম্পর্কিত প্রশ্নের উত্তর দাও', count: 3, marksPerQuestion: 5, enabled: true, isMcq: false },
    { id: 'bn2_opposite', title: 'বিপরীত শব্দ লিখ', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn2_one_word', title: 'এক কথায় প্রকাশ কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn2_synonym', title: 'সমার্থক শব্দ লিখ', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn2_letter', title: 'আবেদনপত্র / চিঠি লিখ', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'bn2_essay', title: 'যেকোনো একটি বিষয়ে রচনা লিখ', count: 1, marksPerQuestion: 15, enabled: true, isMcq: false },
  ],

  // ৮. ইংরেজি (English)
  'ইংরেজি': [
    { id: 'en_match', title: 'Match the words in Column A with their meanings in Column B', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_tf', title: 'Write True or False beside the following statements', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_short_q', title: 'Answer the following short questions', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en_rearrange', title: 'Rearrange the words in the appropriate order to make meaningful sentences', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en_passage', title: 'Read the text and answer the questions', count: 4, marksPerQuestion: 3, enabled: true, isMcq: false },
    { id: 'en_composition', title: 'Write a short composition on given topic', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
  ],

  // ৯. সাধারণ জ্ঞান
  'সাধারণ জ্ঞান': [
    { id: 'gk_mcq', title: 'সঠিক উত্তরটি নির্বাচন কর', count: 10, marksPerQuestion: 1, enabled: true, isMcq: true },
    { id: 'gk_short', title: 'এক কথায় উত্তর দাও', count: 10, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'gk_fib', title: 'শূন্যস্থান পূরণ কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'gk_match', title: 'বামপাশের সাথে ডানপাশের মিল কর', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'oral', title: 'মৌখিক পরীক্ষা', count: 1, marksPerQuestion: 15, enabled: true, isMcq: false },
  ]
};

const STORAGE_PREFIX = 'primary_exam_preset_v2_';
const CLASS_SUBJECTS_PREFIX = 'primary_exam_subjects_by_class_v2_';
const CLASSES_STORAGE_KEY = 'primary_exam_classes_list_v2';

/**
 * Load subjects list for a SPECIFIC class
 */
export function loadSubjectsForClass(className) {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(`${CLASS_SUBJECTS_PREFIX}${className || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read subjects for class from localStorage:', e);
    }
  }
  
  if (DEFAULT_CLASS_SUBJECTS[className]) {
    return [...DEFAULT_CLASS_SUBJECTS[className]];
  }
  return [...DEFAULT_CLASS_SUBJECTS['পঞ্চম']];
}

/**
 * Save subjects list for a SPECIFIC class
 */
export function saveSubjectsForClass(className, subjects) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${CLASS_SUBJECTS_PREFIX}${className || 'default'}`, JSON.stringify(subjects));
      return true;
    } catch (e) {
      console.error('Failed to save subjects for class to localStorage:', e);
      return false;
    }
  }
  return false;
}

/**
 * Reset subjects list for a specific class to standard default
 */
export function resetSubjectsForClass(className) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`${CLASS_SUBJECTS_PREFIX}${className || 'default'}`);
    } catch (e) {
      console.error('Failed to reset subjects for class:', e);
    }
  }
  return DEFAULT_CLASS_SUBJECTS[className] ? [...DEFAULT_CLASS_SUBJECTS[className]] : [...DEFAULT_CLASS_SUBJECTS['পঞ্চম']];
}

/**
 * Load classes list from localStorage or fallback to default
 */
export function loadClassesList() {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(CLASSES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read classes from localStorage:', e);
    }
  }
  return [...DEFAULT_CLASSES];
}

/**
 * Save classes list to localStorage
 */
export function saveClassesList(classes) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CLASSES_STORAGE_KEY, JSON.stringify(classes));
      return true;
    } catch (e) {
      console.error('Failed to save classes to localStorage:', e);
      return false;
    }
  }
  return false;
}

/**
 * Get Storage Key for a given Class and Subject
 */
export function getPresetStorageKey(className, subject) {
  return `${STORAGE_PREFIX}${className || 'default'}_${subject || 'default'}`;
}

/**
 * Load sections for a specific class & subject
 */
export function loadSectionsForSubject(className, subject) {
  if (typeof window !== 'undefined') {
    try {
      const key = getPresetStorageKey(className, subject);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
    }
  }

  // Fallback to default presets
  const preset = DEFAULT_CURRICULUM_PRESETS[subject];
  if (preset) {
    return JSON.parse(JSON.stringify(preset));
  }

  // Generic fallback if subject not found
  return JSON.parse(JSON.stringify(DEFAULT_CURRICULUM_PRESETS['বিজ্ঞান']));
}

/**
 * Save custom sections for a specific class & subject to localStorage
 */
export function saveSectionsForSubject(className, subject, sections) {
  if (typeof window !== 'undefined') {
    try {
      const key = getPresetStorageKey(className, subject);
      localStorage.setItem(key, JSON.stringify(sections));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return false;
    }
  }
  return false;
}

/**
 * Reset sections for a specific class & subject to standard default
 */
export function resetSectionsToDefault(className, subject) {
  if (typeof window !== 'undefined') {
    try {
      const key = getPresetStorageKey(className, subject);
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to reset localStorage:', e);
    }
  }
  const preset = DEFAULT_CURRICULUM_PRESETS[subject] || DEFAULT_CURRICULUM_PRESETS['বিজ্ঞান'];
  return JSON.parse(JSON.stringify(preset));
}
