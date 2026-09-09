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
    'হিন্দুধর্ম ও নৈতিক শিক্ষা',
    'সাধারণ জ্ঞান'
  ],
  '৪র্থ': [
    'বাংলা ১ম পত্র',
    'বাংলা ২য় পত্র',
    'ইংরেজি ১ম পত্র',
    'ইংরেজি ২য় পত্র',
    'প্রাথমিক গণিত',
    'বাংলাদেশ ও বিশ্বপরিচয়',
    'প্রাথমিক বিজ্ঞান',
    'ইসলাম ও নৈতিক শিক্ষা',
    'হিন্দুধর্ম ও নৈতিক শিক্ষা',
    'সাধারণ জ্ঞান'
  ],
  'পঞ্চম': [
    'বিজ্ঞান',
    'প্রাথমিক গণিত',
    'বাংলা ১ম পত্র',
    'বাংলা ২য় পত্র',
    'ইংরেজি ১ম পত্র',
    'ইংরেজি ২য় পত্র',
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

  // ৫. প্রাথমিক গণিত / গণিত (পঞ্চম শ্রেণির ১০০ নম্বরের পূর্ণাঙ্গ প্রশ্নপত্র কাঠামো)
  'প্রাথমিক গণিত': [
    { id: 'math_short', title: 'সংক্ষেপে উত্তর দাও', count: 10, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'math_geom_fib', title: 'জ্যামিতি থেকে শূন্যস্থান পূরণ কর', count: 10, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'math_blank_box', title: 'খালি ঘর পূরণ কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'math_mul_div', title: 'গুণ / ভাগ কর (বা উভয়টির মিশ্রণ)', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false, mathMode: 'mixture' },
    { id: 'math_decimal_mul_div', title: 'দশমিকের গুণ ও ভাগ কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false, mathMode: 'mixture' },
    { id: 'math_word_prob_6', title: 'গাণিতিক সমস্যা সমাধান কর (১)', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'math_word_prob_7', title: 'গাণিতিক সমস্যা সমাধান কর (২)', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'math_word_prob_8', title: 'গাণিতিক সমস্যা সমাধান কর (৩)', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'math_word_prob_9', title: 'গাণিতিক সমস্যা সমাধান কর (৪)', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'math_geom_qa', title: 'চিত্রসহ সংজ্ঞা লিখ', count: 2, marksPerQuestion: 5, enabled: true, isMcq: false },
  ],
  'গণিত': [
    { id: 'math_short', title: 'সংক্ষেপে উত্তর দাও', count: 10, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'math_geom_fib', title: 'জ্যামিতি থেকে শূন্যস্থান পূরণ কর', count: 10, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'math_blank_box', title: 'খালি ঘর পূরণ কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'math_mul_div', title: 'গুণ / ভাগ কর (বা উভয়টির মিশ্রণ)', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false, mathMode: 'mixture' },
    { id: 'math_decimal_mul_div', title: 'দশমিকের গুণ ও ভাগ কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false, mathMode: 'mixture' },
    { id: 'math_word_prob_6', title: 'গাণিতিক সমস্যা সমাধান কর (১)', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'math_word_prob_7', title: 'গাণিতিক সমস্যা সমাধান কর (২)', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'math_word_prob_8', title: 'গাণিতিক সমস্যা সমাধান কর (৩)', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'math_word_prob_9', title: 'গাণিতিক সমস্যা সমাধান কর (৪)', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'math_geom_qa', title: 'চিত্রসহ সংজ্ঞা লিখ', count: 2, marksPerQuestion: 5, enabled: true, isMcq: false },
  ],

  // ৬. বাংলা / বাংলা ১ম পত্র (১০০ নম্বরের আদর্শ প্রশ্নপত্র)
  'বাংলা': [
    { id: 'bn_vocab', title: 'শব্দার্থ লিখ', count: 10, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'bn_sentence', title: 'বাক্য গঠন কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_poem', title: 'কবিতা লিখ কবির নামসহ ১ম ৮ লাইন', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'bn_fib', title: 'শূন্যস্থান পূরণ কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_punctuation', title: 'বিরাম চিহ্ন বসাও', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'bn_qa', title: 'নিচের প্রশ্ন গুলোর উত্তর দাও', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_conjunct', title: 'যুক্তবর্ণ বিভাজন করে ২টি শব্দ গঠন কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_desc', title: 'বর্ণনামূলক প্রশ্নের উত্তর দাও', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'bn_tf', title: 'সত্য-মিথ্যা নির্ণয় কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_match', title: 'বামপাশের সাথে ডানপাশের মিল কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
  ],
  'বাংলা ১ম পত্র': [
    { id: 'bn_vocab', title: 'শব্দার্থ লিখ', count: 10, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'bn_sentence', title: 'বাক্য গঠন কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'bn_poem', title: 'কবিতা লিখ কবির নামসহ ১ম ৮ লাইন', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'bn_fib', title: 'শূন্যস্থান পূরণ কর', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
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

  // ৮. ইংরেজি / English 1st (১০০ নম্বরের ক্যাডেট ও জাতীয় আদর্শ প্রশ্নপত্র)
  'ইংরেজি': [
    { id: 'en_word_meaning', title: 'Write word meaning (any 10)', count: 10, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_true_false', title: 'Write True or False', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_fill_blanks', title: 'Fill in the blanks', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en_composition', title: 'Write a composition about given topic', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'en_questions', title: 'Answer the following question', count: 4, marksPerQuestion: 5, enabled: true, isMcq: false },
    { id: 'en_make_sentence', title: 'Make Sentence', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en_translate', title: 'Translate into Bengali', count: 4, marksPerQuestion: 2.5, enabled: true, isMcq: false },
    { id: 'en_rearrange', title: 'Rearrange words in the correct order', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_punctuation', title: 'Use capital letters and punctuation marks', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'en_match', title: 'Match column A with column B', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
  ],
  'ইংরেজি ১ম পত্র': [
    { id: 'en_word_meaning', title: 'Write word meaning (any 10)', count: 10, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_true_false', title: 'Write True or False', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_fill_blanks', title: 'Fill in the blanks', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en_composition', title: 'Write a composition about given topic', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'en_questions', title: 'Answer the following question', count: 4, marksPerQuestion: 5, enabled: true, isMcq: false },
    { id: 'en_make_sentence', title: 'Make Sentence', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en_translate', title: 'Translate into Bengali', count: 4, marksPerQuestion: 2.5, enabled: true, isMcq: false },
    { id: 'en_rearrange', title: 'Rearrange words in the correct order', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_punctuation', title: 'Use capital letters and punctuation marks', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'en_match', title: 'Match column A with column B', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
  ],
  'English': [
    { id: 'en_word_meaning', title: 'Write word meaning (any 10)', count: 10, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_true_false', title: 'Write True or False', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_fill_blanks', title: 'Fill in the blanks', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en_composition', title: 'Write a composition about given topic', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'en_questions', title: 'Answer the following question', count: 4, marksPerQuestion: 5, enabled: true, isMcq: false },
    { id: 'en_make_sentence', title: 'Make Sentence', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en_translate', title: 'Translate into Bengali', count: 4, marksPerQuestion: 2.5, enabled: true, isMcq: false },
    { id: 'en_rearrange', title: 'Rearrange words in the correct order', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_punctuation', title: 'Use capital letters and punctuation marks', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'en_match', title: 'Match column A with column B', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
  ],
  'English 1st': [
    { id: 'en_word_meaning', title: 'Write word meaning (any 10)', count: 10, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_true_false', title: 'Write True or False', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_fill_blanks', title: 'Fill in the blanks', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en_composition', title: 'Write a composition about given topic', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'en_questions', title: 'Answer the following question', count: 4, marksPerQuestion: 5, enabled: true, isMcq: false },
    { id: 'en_make_sentence', title: 'Make Sentence', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en_translate', title: 'Translate into Bengali', count: 4, marksPerQuestion: 2.5, enabled: true, isMcq: false },
    { id: 'en_rearrange', title: 'Rearrange words in the correct order', count: 5, marksPerQuestion: 1, enabled: true, isMcq: false },
    { id: 'en_punctuation', title: 'Use capital letters and punctuation marks', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'en_match', title: 'Match column A with column B', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
  ],

  // ৯. ইংরেজি ২য় পত্র / English 2nd Paper (ব্যাকরণ, অনুবাদ ও নির্মিতি)
  'ইংরেজি ২য় পত্র': [
    { id: 'en2_definitions', title: 'সংজ্ঞাসহ উদাহরণ দাও', count: 3, marksPerQuestion: 5, enabled: true, isMcq: false },
    { id: 'en2_fib', title: 'Fill in the blanks with appropriate Articles / Prepositions', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en2_change', title: 'Change the following (Gender / Number / Tense / Sentence)', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en2_translate', title: 'Translate into English', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en2_letter', title: 'Write an Application / Letter', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'en2_paragraph', title: 'Write a Paragraph / Composition', count: 1, marksPerQuestion: 15, enabled: true, isMcq: false },
  ],
  'English 2nd': [
    { id: 'en2_definitions', title: 'সংজ্ঞাসহ উদাহরণ দাও', count: 3, marksPerQuestion: 5, enabled: true, isMcq: false },
    { id: 'en2_fib', title: 'Fill in the blanks with appropriate Articles / Prepositions', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en2_change', title: 'Change the following (Gender / Number / Tense / Sentence)', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en2_translate', title: 'Translate into English', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en2_letter', title: 'Write an Application / Letter', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'en2_paragraph', title: 'Write a Paragraph / Composition', count: 1, marksPerQuestion: 15, enabled: true, isMcq: false },
  ],
  'English 2nd Paper': [
    { id: 'en2_definitions', title: 'সংজ্ঞাসহ উদাহরণ দাও', count: 3, marksPerQuestion: 5, enabled: true, isMcq: false },
    { id: 'en2_fib', title: 'Fill in the blanks with appropriate Articles / Prepositions', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en2_change', title: 'Change the following (Gender / Number / Tense / Sentence)', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en2_translate', title: 'Translate into English', count: 5, marksPerQuestion: 2, enabled: true, isMcq: false },
    { id: 'en2_letter', title: 'Write an Application / Letter', count: 1, marksPerQuestion: 10, enabled: true, isMcq: false },
    { id: 'en2_paragraph', title: 'Write a Paragraph / Composition', count: 1, marksPerQuestion: 15, enabled: true, isMcq: false },
  ],

  // ১০. সাধারণ জ্ঞান
  'সাধারণ জ্ঞান': [
    { id: 'gk_questions', title: 'যেকোনো দশটি প্রশ্নের উত্তর দাও। সকল প্রশ্নের মান সমান', count: 12, marksPerQuestion: 5, enabled: true, isMcq: false },
  ],
  'General Knowledge': [
    { id: 'gk_questions', title: 'Answer any 10 questions. All questions carry equal marks', count: 12, marksPerQuestion: 5, enabled: true, isMcq: false },
  ],
  'জিকে': [
    { id: 'gk_questions', title: 'যেকোনো দশটি প্রশ্নের উত্তর দাও। সকল প্রশ্নের মান সমান', count: 12, marksPerQuestion: 5, enabled: true, isMcq: false },
  ]
};

const STORAGE_PREFIX = 'primary_exam_preset_v9_';
const LEGACY_STORAGE_PREFIX = 'primary_exam_preset_v8_';
const CLASS_SUBJECTS_PREFIX = 'primary_exam_subjects_by_class_v9_';
const CLASSES_STORAGE_KEY = 'primary_exam_classes_list_v9';

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
      window.dispatchEvent(new CustomEvent('exam_subjects_updated', { detail: { className, subjects } }));
      localStorage.setItem('primary_exam_presets_last_sync', `subjects_${className || 'default'}_${Date.now()}`);
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
      window.dispatchEvent(new CustomEvent('exam_subjects_updated', { detail: { className } }));
      localStorage.setItem('primary_exam_presets_last_sync', `subjects_reset_${className || 'default'}_${Date.now()}`);
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
      window.dispatchEvent(new CustomEvent('exam_classes_updated', { detail: { classes } }));
      localStorage.setItem('primary_exam_presets_last_sync', `classes_${Date.now()}`);
      return true;
    } catch (e) {
      console.error('Failed to save classes to localStorage:', e);
      return false;
    }
  }
  return false;
}

/**
 * Reset classes list to standard default
 */
export function resetClassesListToDefault() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(CLASSES_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('exam_classes_updated', { detail: { classes: DEFAULT_CLASSES } }));
      localStorage.setItem('primary_exam_presets_last_sync', `classes_reset_${Date.now()}`);
    } catch (e) {
      console.error('Failed to reset classes list:', e);
    }
  }
  return [...DEFAULT_CLASSES];
}


/**
 * Get Storage Key for a given Class and Subject
 */
export function getPresetStorageKey(className, subject) {
  return `${STORAGE_PREFIX}${className || 'default'}_${subject || 'default'}`;
}

/**
 * Normalize section object to guarantee count, questionCount, marksPerQuestion, and enabled properties
 */
export function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.map((sec, idx) => {
    const rawCount = sec.count !== undefined ? sec.count : (sec.questionCount !== undefined ? sec.questionCount : 5);
    const count = Number(rawCount) > 0 ? Number(rawCount) : 1;
    const rawMarks = sec.marksPerQuestion !== undefined ? sec.marksPerQuestion : 1;
    const marksPerQuestion = Number(rawMarks) > 0 ? Number(rawMarks) : 1;

    return {
      id: sec.id || `sec_${idx + 1}_${Date.now()}`,
      title: sec.title || `প্রশ্ন ধারা ${idx + 1}`,
      instructions: sec.instructions || '',
      count: count,
      questionCount: count, // support both property names
      marksPerQuestion: marksPerQuestion,
      totalMarks: sec.totalMarks !== undefined ? Number(sec.totalMarks) : (count * marksPerQuestion),
      enabled: sec.enabled !== false,
      isMcq: Boolean(sec.isMcq),
      sourceId: sec.sourceId || null,
      sourceTitle: sec.sourceTitle || null,
      sourceConfigs: sec.sourceConfigs || null,
      mathMode: sec.mathMode || null,
    };
  });
}

/**
 * Load sections for a specific class & subject
 */
export function loadSectionsForSubject(className, subject) {
  if (typeof window !== 'undefined') {
    try {
      const key = getPresetStorageKey(className, subject);
      let saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return normalizeSections(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
    }
  }

  // Fallback to default presets
  const preset = DEFAULT_CURRICULUM_PRESETS[subject];
  if (preset) {
    return normalizeSections(preset);
  }

  // If subject includes 'ইংরেজি ২য়' or 'English 2nd'
  if (subject && (subject.includes('ইংরেজি ২য়') || subject.includes('ইংরেজি ২') || subject.toLowerCase().includes('english 2nd') || subject.toLowerCase().includes('grammar') || subject.includes('ব্যাকরণ'))) {
    return normalizeSections(DEFAULT_CURRICULUM_PRESETS['ইংরেজি ২য় পত্র']);
  }

  // If subject includes 'ইংরেজি' or 'English'
  if (subject && (subject.includes('ইংরেজি') || subject.toLowerCase().includes('english'))) {
    return normalizeSections(DEFAULT_CURRICULUM_PRESETS['ইংরেজি']);
  }

  // If subject includes 'সাধারণ জ্ঞান' or 'General Knowledge' or 'GK'
  if (subject && (subject.includes('সাধারণ জ্ঞান') || subject.toLowerCase().includes('general knowledge') || subject.toLowerCase().includes('gk') || subject.includes('জিকে'))) {
    return normalizeSections(DEFAULT_CURRICULUM_PRESETS['সাধারণ জ্ঞান']);
  }

  // Generic fallback if subject not found
  return normalizeSections(DEFAULT_CURRICULUM_PRESETS['বিজ্ঞান']);
}

/**
 * Save custom sections for a specific class & subject to localStorage
 */
export function saveSectionsForSubject(className, subject, sections) {
  if (typeof window !== 'undefined') {
    try {
      const normalized = normalizeSections(sections);
      const key = getPresetStorageKey(className, subject);
      localStorage.setItem(key, JSON.stringify(normalized));
      // Notify all components in current and other windows
      window.dispatchEvent(new CustomEvent('exam_presets_updated', {
        detail: { className, subject, sections: normalized }
      }));
      localStorage.setItem('primary_exam_presets_last_sync', `${className || 'default'}_${subject || 'default'}_${Date.now()}`);
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
      const legacyKey = `${LEGACY_STORAGE_PREFIX}${className || 'default'}_${subject || 'default'}`;
      localStorage.removeItem(legacyKey);
      window.dispatchEvent(new CustomEvent('exam_presets_updated', {
        detail: { className, subject }
      }));
      localStorage.setItem('primary_exam_presets_last_sync', `${className || 'default'}_${subject || 'default'}_${Date.now()}`);
    } catch (e) {
      console.error('Failed to reset localStorage:', e);
    }
  }
  const preset = DEFAULT_CURRICULUM_PRESETS[subject] || 
    (subject && (subject.includes('সাধারণ জ্ঞান') || subject.toLowerCase().includes('general knowledge') || subject.toLowerCase().includes('gk') || subject.includes('জিকে')) ? DEFAULT_CURRICULUM_PRESETS['সাধারণ জ্ঞান'] :
    (subject && (subject.includes('ইংরেজি ২য়') || subject.includes('ইংরেজি ২') || subject.toLowerCase().includes('english 2nd') || subject.toLowerCase().includes('grammar') || subject.includes('ব্যাকরণ')) ? DEFAULT_CURRICULUM_PRESETS['ইংরেজি ২য় পত্র'] :
    (subject && (subject.includes('ইংরেজি') || subject.toLowerCase().includes('english')) ? DEFAULT_CURRICULUM_PRESETS['ইংরেজি'] : DEFAULT_CURRICULUM_PRESETS['বিজ্ঞান'])));
  return JSON.parse(JSON.stringify(preset));
}

