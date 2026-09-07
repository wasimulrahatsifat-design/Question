import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { extractAndParseJson } from '@/lib/jsonHelper';

export async function POST(req) {
  try {
    const body = await req.json();
    const { images = [], textSources = [], className, subject, requestedSections, customInstructions, language = 'bn', apiKey: customApiKey } = body;

    const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'Gemini API Key পাওয়া যায়নি। অনুগ্রহ করে Google AI Studio (https://aistudio.google.com/app/apikey) থেকে সম্পূর্ণ ফ্রিতে একটি API Key নিন এবং .env.local ফাইলে সেট করুন অথবা সেটিংসে দিন।' 
        },
        { status: 400 }
      );
    }

    const hasImages = Array.isArray(images) && images.length > 0;
    const hasTexts = Array.isArray(textSources) && textSources.length > 0;

    if (!hasImages && !hasTexts) {
      return NextResponse.json(
        { error: 'প্রশ্নপত্র তৈরির জন্য কোনো সোর্স (ছবি, পিডিএফ বা টেক্সট) পাওয়া যায়নি।' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Format base64 images as Google Gen AI inline parts with clear source labels
    const imageParts = [];
    if (hasImages) {
      images.forEach((img, idx) => {
        if (img.sourceTitle) {
          imageParts.push({ text: `[সোর্স ইমেজ ${idx + 1} - "${img.sourceTitle}"]:` });
        }
        imageParts.push({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: img.base64Data,
          },
        });
      });
    }

    let textSourcesBlock = '';
    if (hasTexts) {
      textSourcesBlock = `\n\nসংযুক্ত টেক্সট নোট/সোর্সসমূহ:\n` + textSources.map((t, idx) => `[সোর্স ${idx + 1}: ${t.title || 'নোট'}]\n${t.text}\n`).join('\n');
    }

    // Build section-specific source mapping instructions
    let sectionSourceBlock = '';
    if (Array.isArray(requestedSections) && requestedSections.some(s => s.sourceTitle || s.sourceId)) {
      sectionSourceBlock = `\n\n📌 প্রশ্নধারার সুনির্দিষ্ট সোর্স নির্দেশিকা (SECTION-SPECIFIC SOURCE ASSIGNMENTS):\n` +
        requestedSections.map((sec, idx) => {
          const sTitle = sec.sourceTitle || (sec.sourceId ? `সোর্স ID: ${sec.sourceId}` : null);
          if (sTitle) {
            return `- ধারা ${idx + 1} ("${sec.title}"): এটি শুধুমাত্র এবং কঠোরভাবে "${sTitle}" সোর্সের পৃষ্ঠা/ছবি থেকে তৈরি করুন। অন্য কোনো সোর্স ব্যবহার করবেন না।`;
          }
          return `- ধারা ${idx + 1} ("${sec.title}"): এটি সাধারণ মেইন সোর্সসমূহ থেকে তৈরি করুন।`;
        }).join('\n') + '\n';
    }

    const fullSourcesBlock = textSourcesBlock + sectionSourceBlock;

    // Dedicated, isolated prompt builder function per subject & class
    function buildSubjectPrompt(subjectName, classNameStr, reqSections, sourcesBlock, customInst) {
      const sub = (subjectName || '').toLowerCase().trim();
      const cls = classNameStr || 'পঞ্চম';

      // 1. ENGLISH (ক্যাডেট ও জাতীয় শিক্ষাক্রম ১০০ নম্বরের পূর্ণাঙ্গ মডেল)
      if (sub.includes('ইংরেজি') || sub.includes('english')) {
        return `You are an expert primary/kindergarten school English examination question setter in Bangladesh following NCTB and Cadet/Standard school curricula.
Target: Class: ${cls}, Subject: ${subjectName || 'English'}.
Language: Clean, grammatical, school-level English.

Your Task:
1. Extract relevant vocabulary, reading comprehension sentences, themes, and grammar items directly from the attached textbook images and source notes.${sourcesBlock}
2. Strictly follow the list of "requestedSections" and respect each section's 'count' property. Exactly create 'count' items for each section.

Detailed Rules for English Question Paper Sections:
- "Write word meaning (any 10)" / "Word meaning" / "en_word_meaning":
  In 'questionText', provide ONLY the single vocabulary word from the text (e.g. "Protect", "Erosion", "Natural", "Source", "Picture", "Trip", "Greet", "Weapon", "Support", "Flag", "Announcement", "Event"). No numbering, no prefixes.
  In 'answer', provide format "Word = Meaning" (e.g. "Protect = রক্ষা করা / keep safe", "Erosion = নদীভাঙ্গন / wearing away").

- "Write True or False" / "en_true_false":
  In 'questionText', provide a clear factual statement from the text (e.g. "People love to go to the beach", "The main attraction is the lion").
  In 'answer', write ONLY "True" or "False".

- "Fill in the blanks" / "en_fill_blanks":
  In 'questionText', provide a sentence from the text containing "_______" in an appropriate spot (e.g. "Intan is from _______", "_______ is a popular beach in the world").
  In 'answer', write ONLY the exact missing word/phrase.

- "Write a composition about ..." / "en_composition" / "Short Composition":
  In 'questionText', write the composition topic with quotes e.g. "Write a composition about “The Sundarbans”".
  In 'answer', provide a well-written, 5-8 sentence standard model composition.

- "Answer the following question" / "en_questions" / "Short Questions" (SECTION 5):
  CRITICAL: This section contains 4 short comprehension questions based on the reading passage. DO NOT MAKE THIS A MATCHING TABLE.
  In 'questionText', write a clear comprehension question based on the reading text (e.g. "Where is the Sundarbans located?", "Why do people in Indonesia love going to the beach?", "Why is it important to protect the Sundarbans?", "What animals live in the forest?").
  In 'answer', provide a complete, grammatically sound model answer sentence.

- "Make Sentence" / "en_make_sentence":
  In 'questionText', provide ONLY the single word (e.g. "Sundarbans", "Famous", "Island", "Train", "Excited").
  In 'answer', provide format "Word- Meaningful sentence" (e.g. "Famous- Cox's Bazar is a famous tourist spot.").

- "Translate into Bengali" / "en_translate" (SECTION 7):
  CRITICAL: DO NOT LEAVE THIS EMPTY. Provide exactly 4 English sentences to translate into Bengali.
  In 'questionText', provide a natural English sentence from the lesson (e.g. "Today is the annual sports day at Sumon's school.", "The school field is decorated with colourful flags.", "The Sundarbans is a great mangrove forest.", "We must protect wild animals.").
  In 'answer', provide accurate, standard Bengali translation (e.g. "আজ সুমনের বিদ্যালয়ে বার্ষিক ক্রীড়া দিবস।").

- "Rearrange words in the correct order" / "en_rearrange":
  In 'questionText', provide jumbled words separated by slashes '/' ending with punctuation (e.g. "school/from/started/they/at/9 am.", "guide/ greeted/ the/ museum/ at/ them", "songs/ sang/ together/ they").
  In 'answer', provide the correctly arranged meaningful sentence (e.g. "They started from school at 9 am.").

- "Use capital letters and punctuation marks" / "en_punctuation":
  In 'questionText', provide a short 2-3 line continuous paragraph from the reading text in ALL LOWERCASE without any capital letters, commas, or full stops (e.g. "good morning everyone welcome to our annual sports day i have an important announcement for you please listen carefully and follow the instructions.").
  In 'answer', provide the complete paragraph with accurate capitalization and punctuation marks.

- "Match column A with column B" / "en_match" (SECTION 10):
  In 'questionText', provide Column A phrase/word (e.g. "protect", "wildlife", "heritage", "erosion", "livelihood").
  In 'answer', provide matching Column B definition/phrase (e.g. "keep safe", "forest animals", "valuable tradition", "wearing away", "way of living").

Requested Sections List & Count:
${JSON.stringify(reqSections, null, 2)}

${customInst ? `Teacher's Custom Instructions: ${customInst}` : ''}

Output MUST strictly follow the JSON schema.`;
      }

      // 2. BANGLA 1ST / বাংলা ১ম পত্র
      if (sub.includes('বাংলা ১ম') || (sub.includes('বাংলা') && !sub.includes('২য়') && !sub.includes('2nd'))) {
        return `আপনি একজন অভিজ্ঞ প্রাথমিক ও কিন্ডারগার্টেন বাংলা শিক্ষক ও প্রশ্নপত্র প্রণেতা।
টার্গেট: শ্রেণি: ${cls}, বিষয়: ${subjectName || 'বাংলা ১ম পত্র'}।
ভাষা: বিশুদ্ধ প্রমিত বাংলা।

আপনার দায়িত্ব:
1. সংযুক্ত পাঠ্যবইয়ের অধ্যায়ের ছবি ও টেক্সট সোর্সগুলো থেকে সরাসরি মূল তথ্য ও বিষয়বস্তু গ্রহণ করে প্রশ্নপত্র তৈরি করুন।${sourcesBlock}
2. প্রতিটি সেকশনের questions array-তে অবশ্যই ঠিক 'count' সংখ্যক প্রশ্ন তৈরি করতে হবে।

বাংলা প্রশ্নপত্রের সেকশনভিত্তিক সুনির্দিষ্ট নিয়ম:
- "শব্দার্থ লিখ" (bn_vocab): 'questionText' এ শুধুমাত্র মূল শব্দটি থাকবে (যেমন: "টগবগে", "ঝাঁক", "চিৎকার")। 'answer' এ "শব্দ = অর্থ" ফরম্যাটে থাকবে।
- "বাক্য গঠন কর" (bn_sentence): 'questionText' এ শুধুমাত্র মূল শব্দ থাকবে। 'answer' এ "শব্দ- অর্থপূর্ণ বাক্য" থাকবে।
- "কবিতা সংক্রান্ত প্রশ্ন" (bn_poem): 'questionText' এ সোর্সের কবিতার নাম কোটেশনে যুক্ত করে প্রশ্নটি লিখুন, যেমন: "“সংকল্প” কবিতা লিখ কবির নামসহ ১ম ৮ লাইন।" 'answer' খালি রাখুন।
- "শূন্যস্থান পূরণ কর" (bn_fib): প্রতিটি প্রশ্নে 'questionText' এ বাক্যের মধ্যে "_______" দিন এবং 'answer' এ মূল শব্দটি দিন।
- "বিরাম চিহ্ন বসাও" (bn_punctuation): 'questionText' এ সোর্সের গল্প থেকে সরাসরি ২-৩ লাইনের যতিচিহ্নহীন অনুচ্ছেদ দিন। 'answer' এ বিরামচিহ্নসহ পূর্ণাঙ্গ অনুচ্ছেদ দিন।
- "নিচের প্রশ্ন গুলোর উত্তর দাও" / "সংক্ষেপে উত্তর লিখ" (bn_qa): পাঠভিত্তিক স্পষ্ট প্রশ্ন ও নির্ভুল উত্তর দিন।
- "যুক্তবর্ণ বিভাজন করে ২টি শব্দ গঠন কর" (bn_conjunct): 'questionText' এ মূল যুক্তবর্ণ (যেমন: "জ্ঞ", "ক্ষ", "ন্ধ") থাকবে। 'answer' এ "ন্ধ= ন + ধ (গন্ধ, বান্ধব)" ফরম্যাটে বিভাজন ও শব্দ থাকবে।
- "বর্ণনামূলক প্রশ্নের উত্তর দাও" (bn_desc): গভীর ও বর্ণনামূলক প্রশ্ন এবং বিস্তারিত আদর্শ উত্তর দিন।
- "সত্য-মিথ্যা নির্ণয় কর" (bn_tf): বাক্য দিন এবং 'answer' এ "সত্য" বা "মিথ্যা" লিখুন।
- "বামপাশের সাথে ডানপাশের মিল কর" (bn_match): 'questionText' এ বামপাশের অংশ এবং 'answer' এ ডানপাশের অংশ দিন।

অনুরোধকৃত সেকশনসমূহ:
${JSON.stringify(reqSections, null, 2)}

${customInst ? `শিক্ষকের নির্দেশনা: ${customInst}` : ''}
আউটপুট অবশ্যই JSON স্কিমায় দিন।`;
      }

      // 3. BANGLA 2ND / বাংলা ২য় পত্র (ব্যাকরণ ও নির্মিতি)
      if (sub.includes('বাংলা ২য়') || sub.includes('বাংলা ২') || sub.includes('bangla 2nd')) {
        return `আপনি একজন অভিজ্ঞ প্রাথমিক ও কিন্ডারগার্টেন বাংলা ব্যাকরণ শিক্ষক ও প্রশ্নপত্র প্রণেতা।
টার্গেট: শ্রেণি: ${cls}, বিষয়: ${subjectName || 'বাংলা ২য় পত্র'}।
ভাষা: বিশুদ্ধ প্রমিত বাংলা।

আপনার দায়িত্ব:
1. সংযুক্ত পাঠ্যবই বা ব্যাকরণ অধ্যায়ের তথ্য অনুযায়ী প্রশ্নপত্র তৈরি করুন।${sourcesBlock}
2. প্রতিটি সেকশনের নির্ধারিত 'count' অনুযায়ী প্রশ্ন ও উত্তর প্রস্তুত করুন।

বাংলা ২য় পত্রের সেকশনভিত্তিক নিয়ম:
- "ব্যাকরণ সম্পর্কিত প্রশ্নের উত্তর দাও" (bn2_grammar): ব্যাকরণ বিষয়ক ৩টি তথ্যবহুল প্রশ্ন (যেমন: ভাষা, পদ, বা সন্ধি) ও পূর্ণাঙ্গ উত্তর দিন।
- "বিপরীত শব্দ লিখ" (bn2_opposite): 'questionText' এ মূল শব্দ দিন, 'answer' এ "মূলশব্দ - বিপরীতশব্দ" দিন।
- "এক কথায় প্রকাশ কর" (bn2_one_word): 'questionText' এ বাক্য/বাক্যাংশ দিন, 'answer' এ এক কথাটি দিন।
- "সমার্থক শব্দ লিখ" (bn2_synonym): 'questionText' এ মূল শব্দ দিন, 'answer' এ সমার্থক শব্দ দিন।
- "আবেদনপত্র / চিঠি লিখ" (bn2_letter): 'questionText' এ বিষয়সহ পত্র বা দরখাস্তের প্রশ্ন দিন, 'answer' এ আদর্শ কাঠামোবদ্ধ দরখাস্ত দিন।
- "যেকোনো একটি বিষয়ে রচনা লিখ" (bn2_essay): 'questionText' এ রচনার সংকেতসহ প্রশ্ন দিন, 'answer' এ পয়েন্টভিত্তিক আদর্শ রচনা দিন।

অনুরোধকৃত সেকশনসমূহ:
${JSON.stringify(reqSections, null, 2)}

${customInst ? `শিক্ষকের নির্দেশনা: ${customInst}` : ''}
আউটপুট অবশ্যই JSON স্কিমায় দিন।`;
      }

      // 4. MATHEMATICS / প্রাথমিক গণিত (পঞ্চম শ্রেণির আদর্শ ১০০ নম্বরের পূর্ণাঙ্গ গণিত প্রশ্নপত্র)
      if (sub.includes('গণিত') || sub.includes('math')) {
        return `আপনি একজন অভিজ্ঞ প্রাথমিক ও কিন্ডারগার্টেন গণিত শিক্ষক এবং পঞ্চম শ্রেণির জাতীয় শিক্ষাক্রম (NCTB) অনুযায়ী গণিত প্রশ্নপত্র প্রণেতা।
টার্গেট: শ্রেণি: ${cls}, বিষয়: ${subjectName || 'প্রাথমিক গণিত'}।
ভাষা: বাংলা এবং বাংলা গাণিতিক সংখ্যা (যেমন: ০, ১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯)।

গুরুত্বপূর্ণ উৎস সংক্রান্ত নিয়ম (SOURCE HANDLING RULES):
১. সাধারণ ও মূল গণিত প্রশ্নগুলো (১ নং, ৩ নং, ৪ নং, ৫ নং, এবং ৬ থেকে ৯ নং) সংযুক্ত পাঠ্যবইয়ের নির্বাচিত অধ্যায়ের অনুশীলনী, ধারণাসমূহ ও সমস্যা থেকে তৈরি করতে হবে।${sourcesBlock}
২. জ্যামিতি সংক্রান্ত প্রশ্নগুলো (২ নং শূন্যস্থান পূরণ এবং ১০ নং জ্যামিতি প্রশ্ন): এগুলো গণিত বইয়ের সাধারণ পিডিএফ থেকে হবে না। সংযুক্ত জ্যামিতি বইয়ের ছবি/সোর্স থেকে সরাসরি নিতে হবে।
৩. প্রতিটি সেকশনের questions array-তে ঠিক নির্ধারিত 'count' সংখ্যক প্রশ্ন ও নির্ভুল গাণিতিক সমাধান তৈরি করতে হবে।

গণিত প্রশ্নপত্রের ১০টি সেকশনের সুনির্দিষ্ট গঠন ও নিয়মাবলী:

১. "সংক্ষেপে প্রশ্নের উত্তর দাও" / "সংক্ষেপে উত্তর লিখ" (math_short) [১০টি প্রশ্ন]:
   - ব্যবহারকারীর নির্বাচিত অধ্যায়গুলো (যেমন: গুণ, ভাগ, চার প্রক্রিয়া, লসাগু-গসাগু, ভগ্নাংশ, দশমিক, গড়, শতকরা, পরিমাপ বা সময়) থেকে ১০টি সংক্ষিপ্ত প্রশ্ন।
   - প্রশ্নগুলো এক কথায় বা ১-২ লাইনে উত্তরযোগ্য হবে (যেমন: "২৪ এর মৌলিক গুণনীয়কগুলো কী কী?", "প্রকৃত ভগ্নাংশ কাকে বলে?", "এক শতাব্দী সমান কত বছর?", "গড় নির্ণয়ের সূত্রটি লিখ।", "১ হেক্টরে কত বর্গমিটার?")।
   - 'questionText' এ সংক্ষিপ্ত প্রশ্ন এবং 'answer' এ এক কথায়/সংক্ষেপে নির্ভুল উত্তর।

২. "জ্যামিতি থেকে শূন্যস্থান পূরণ কর" (math_geom_fib / math_fib) [ঠিক ১০টি শূন্যস্থান পূরণ প্রশ্ন]:
   - অতি জরুরি ও কঠোর নিয়ম (STRICT EXTRACTION RULE):
     * সোর্স হিসেবে সংযুক্ত জ্যামিতি বইয়ের ছবি/নোটগুলোর দিকে মনোযোগ দিন। সেখানে যে শূন্যস্থানগুলো রয়েছে হুবহু (verbatim) সেই বাক্যগুলো অক্ষর অক্ষত রেখে সোর্স থেকে ব্যবহার করুন। সোর্সের শূন্যস্থান বাদ দিয়ে নিজের থেকে ভিন্ন কিছু বানাবেন না।
     * প্রতিটি প্রশ্নের 'questionText' এ অবশ্যই অবশ্যই "_______" সংবলিত শূন্যস্থান বাক্য হতে হবে।
     * কঠোরভাবে নিষিদ্ধ: কোনো অবস্থাতেই প্রশ্নবাচক বাক্য বা প্রশ্নচিহ্ন '?' (যেমন "কাকে বলে?", "কী?", "বলতে কী বোঝায়?") তৈরি করবেন না! যদি সোর্স ছবিতে কোনো সংজ্ঞা থাকে, তবে সেটিকে শূন্যস্থান বাক্যে রূপান্তর করুন (যেমন: "যে কোণের পরিমাপ ৯০° তাকে _______ কোণ বলে।")।
     * সোর্স ছবিতে যদি ১০টির কম শূন্যস্থান থাকে (যেমন ৮টি থাকে), তবেই কেবল বাকি ঘাটতিগুলো ৫ম শ্রেণির জ্যামিতির মৌলিক সংজ্ঞা ও বৈশিষ্ট্যের আলোকে "_______" ফরম্যাটে শূন্যস্থান হিসেবে তৈরি করবেন।
   - 'questionText' এ বাক্যের উপযুক্ত জায়গায় "_______" থাকবে।
   - 'answer' এ শুধুমাত্র শূন্যস্থানের সঠিক উত্তর।

৩. "খালি ঘর পূরণ কর" (math_blank_box) [৫টি প্রশ্ন]:
   - AI নিজে ৫ম শ্রেণির মান অনুযায়ী ৫টি খালি ঘর সংবলিত সমীকরণ তৈরি করবে।
   - প্রতিটি প্রশ্নে অবশ্যই গাণিতিক খালি বক্স প্রতীক '🔲' (বা '[  ]') ব্যবহার করবেন।
   - উদাহরণস্বরূপ:
     ক) ১৩৪ + 🔲 = ২৬৭
     খ) 🔲 - ১২৭ = ৫৬
     গ) ৬৪ × 🔲 = ৩৮৪০
     ঘ) 🔲 ÷ ২৫ = ১৪
     ঙ) ৫৬০০ ÷ 🔲 = ৭০
   - 'questionText' এ খালি ঘরসহ সমীকরণ এবং 'answer' এ হিসাবসহ খালি ঘরের মান (যেমন: "২৬৭ - ১৩৪ = ১৩৩ ∴ 🔲 = ১৩৩")।

৪. "গুণ / ভাগ কর" (math_mul_div) [৫টি প্রশ্ন]:
   - AI নিজে ৫ম শ্রেণির উপযোগী মানসম্মত ৫টি গুণ ও ভাগ হিসাব তৈরি করবে।
   - মোড সিলেকশন নিয়ন্ত্রণ (User Mode Selection):
     * যদি mathMode === 'multiply' অথবা টাইটেল/নির্দেশনায় "শুধু গুণ" থাকে: ৫টি প্রশ্নই শুধুমাত্র গুণ হবে (যেমন: ৪২৫ × ১৬৪, ৫৬৭২ × ২৭৮, ৩২৫ × ১৪২ ইত্যাদি)।
     * যদি mathMode === 'divide' অথবা টাইটেল/নির্দেশনায় "শুধু ভাগ" থাকে: ৫টি প্রশ্নই শুধুমাত্র ভাগ হবে (যেমন: ৭৩৫০ ÷ ২৫, ৪৬৫২ ÷ ১২, ৮৯৬০ ÷ ২৮ ইত্যাদি)।
     * যদি mathMode === 'mixture' বা মিশ্রণ থাকে: ৩টি গুণ এবং ২টি ভাগের মিশ্রণ তৈরি করবেন।
   - অতি জরুরি: 'questionText' এ "গুণ কর:" বা "ভাগ কর:" বা "হিসাব কর:" এই ধরনের কোনো লেখা বা প্রিফিক্স থাকবে না! শুধুমাত্র গাণিতিক রাশিটি লিখবেন (যেমন: "৪২৫ × ১৬৪" বা "৭৩৫০ ÷ ২৫")।
   - 'answer' এ সঠিক গুণফল বা ভাগফল (ভাগশেষ থাকলে উল্লেখসহ)।

৫. "দশমিকের গুণ ও ভাগ কর" (math_decimal_mul_div) [৫টি প্রশ্ন]:
   - ৫ম শ্রেণির উপযোগী ৫টি দশমিকের গুণ ও ভাগ সমস্যা।
   - মোড সিলেকশন নিয়ন্ত্রণ:
     * যদি mathMode === 'multiply' বা "শুধু গুণ" হয়: ৫টিই দশমিকের গুণ (যেমন: ৪.৭৫ × ৩.২, ৮.৩৬ × ০.৪, ১২.৫ × ০.০৮ ইত্যাদি)।
     * যদি mathMode === 'divide' বা "শুধু ভাগ" হয়: ৫টিই দশমিকের ভাগ (যেমন: ৭.৮ ÷ ০.৬, ২৩.৪ ÷ ৩, ৬.২৫ ÷ ০.৫ ইত্যাদি)।
     * যদি mathMode === 'mixture' বা মিশ্রণ হয়: দশমিকের গুণ ও ভাগের মিশ্রণ।
   - অতি জরুরি: 'questionText' এ "গুণ কর:" বা "ভাগ কর:" লেখা থাকবে না! শুধুমাত্র দশমিকের গাণিতিক হিসাবটি লিখবেন (যেমন: "৪.৭৫ × ৩.২")।
   - 'answer' এ নির্ভুল দশমিক উত্তর।

৬, ৭, ৮, ৯. "গাণিতিক সমস্যা সমাধান কর" (math_word_prob_6, math_word_prob_7, math_word_prob_8, math_word_prob_9) [প্রতিটিতে ১টি করে মোট ৪টি সমস্যা]:
   - পাঠ্যবইয়ের নির্বাচিত অধ্যায়ের অনুশীলনী বা 'নিজে করি' অংশ থেকে একক গাণিতিক সমস্যা (single standalone word problem) হুবহু বা সরাসরি নিতে হবে।
   - কঠোরভাবে নিষিদ্ধ: কোনো অবস্থাতেই ক), খ) যুক্ত বা বহুপদী সৃজনশীল কাঠামোবদ্ধ উপ-প্রশ্ন তৈরি করবেন না। প্রতিটি নম্বরে শুধুমাত্র একটি একক পূর্ণাঙ্গ গাণিতিক কথার সমস্যা (Single Word Problem) থাকবে।
   - অতি জরুরি (উত্তরপত্রে বইয়ের পৃষ্ঠা নম্বর সংযোজন): শুধু গণিত বিষয়ের জন্য ৬, ৭, ৮, ৯ নং এর প্রতিটি 'answer' ফিল্ডের শুরুতে বা শেষে অবশ্যই বইটি/সোর্সের পৃষ্ঠা নম্বর স্পষ্টভাবে উল্লেখ করবেন। ফরম্যাট: "[বইয়ের পৃষ্ঠা নং: ...]" এবং এর সাথে ধাপে ধাপে বিস্তারিত সমাধান। যেমন: "[বইয়ের পৃষ্ঠা: ৩৩]\nসমাধান: ..."
   - 'questionText' এ সম্পূর্ণ সমস্যাটি এবং 'answer' এ পৃষ্ঠা নম্বরসহ ধাপে ধাপে বিস্তারিত সমাধান।

১০. "চিত্রসহ সংজ্ঞা লিখ" (math_geom_qa / math_geometry) [অবশ্যই ঠিক ২টি পৃথক প্রশ্ন তৈরি করতে হবে: ক এবং খ]:
   - questions array-তে ঠিক ২টি প্রশ্ন অবজেক্ট (questions[0] এবং questions[1]) থাকতে হবে:
     * প্রশ্ন ১ (ক): সোর্স জ্যামিতি বই/নোট অনুযায়ী ১ম বিষয়ের চিত্রসহ সংজ্ঞা (যেমন: "চিত্রসহ সংজ্ঞা লিখ: সূক্ষ্মকোণ ও সমকোণ।" অথবা "চিত্রসহ সংজ্ঞা লিখ: স্থূলকোণ ও সরলকোণ।")।
     * প্রশ্ন ২ (খ): সোর্স অনুযায়ী ২য় বিষয়ের প্রকারভেদ বা অন্য জ্যামিতিক চিত্র ও সংজ্ঞা (যেমন: "চতুর্ভুজের প্রকারভেদের চিত্রসহ সংক্ষিপ্ত সংজ্ঞা দাও।" অথবা "চিত্রসহ সংজ্ঞা লিখ: রম্বস ও সামান্তরিক।")।
   - কঠোর নিয়ম: কোনো "বৈশিষ্ট্য লিখ" থাকবে না! শুধুমাত্র চিত্র আঁকা, সংজ্ঞা ও প্রকারভেদ থাকবে।
   - 'questionText' এ চিত্র ও সংজ্ঞার স্পষ্ট নির্দেশনামূলক প্রশ্ন থাকবে (ক ও খ)।
   - 'answer' এ আদর্শ চিত্রের বিবরণ, সঠিক সংজ্ঞা ও প্রকারভেদ থাকবে।

অনুরোধকৃত সেকশনসমূহ ও প্রশ্নের সংখ্যা:
${JSON.stringify(reqSections, null, 2)}

${customInst ? `শিক্ষকের অতিরিক্ত নির্দেশনা: ${customInst}` : ''}
আউটপুট অবশ্যই সম্পূর্ণ নির্ভুল JSON স্কিমায় দিন।`;
      }

      // 5. SCIENCE / প্রাথমিক বিজ্ঞান
      if (sub.includes('বিজ্ঞান') || sub.includes('science')) {
        return `আপনি একজন অভিজ্ঞ প্রাথমিক বিদ্যালয়ের বিজ্ঞান শিক্ষক ও প্রশ্নপত্র প্রণেতা।
টার্গেট: শ্রেণি: ${cls}, বিষয়: ${subjectName || 'প্রাথমিক বিজ্ঞান'}।
ভাষা: বিশুদ্ধ প্রমিত বাংলা।

আপনার দায়িত্ব:
1. সংযুক্ত পাঠ্যবইয়ের অধ্যায় থেকে বৈজ্ঞানিক তথ্য ও ধারণার ভিত্তিতে প্রশ্নপত্র তৈরি করুন।${sourcesBlock}
2. প্রতিটি সেকশনের জন্য নির্ধারিত 'count' অনুযায়ী প্রশ্ন ও উত্তর প্রস্তুত করুন।

বিজ্ঞান প্রশ্নপত্রের নিয়ম:
- "সঠিক উত্তরটি খাতায় লিখ" (mcq): প্রতিটি প্রশ্নে ঠিক ২টি অপশন দিন।
- "সংক্ষেপে উত্তর লিখ" (short): ৫টি সংক্ষিপ্ত প্রশ্ন ও নির্ভুল বৈজ্ঞানিক উত্তর।
- "শূন্যস্থান পূরণ কর" (fib): বাক্যে "_______" ব্যবহার করুন।
- "সত্য/মিথ্যা নির্ণয় কর" (tf): বিবৃতি ও 'answer' এ "সত্য" বা "মিথ্যা"।
- "বামপাশের সাথে ডানপাশের মিল কর" (match): 'questionText' এ বামপাশ, 'answer' এ ডানপাশ।
- "নিচের প্রশ্ন গুলোর উত্তর দাও" (long): ৫টি গভীর, কাঠামোবদ্ধ বর্ণনামূলক প্রশ্ন ও বিস্তারিত ৩-৫ লাইনের আদর্শ উত্তর।
- "মৌখিক ও শ্রেণিমূল্যায়ন" (oral): মৌখিক মূল্যায়নে কোনো লিখিত প্রশ্ন থাকবে না (questions: [])।

অনুরোধকৃত সেকশনসমূহ:
${JSON.stringify(reqSections, null, 2)}

${customInst ? `শিক্ষকের নির্দেশনা: ${customInst}` : ''}
আউটপুট অবশ্যই JSON স্কিমায় দিন।`;
      }

      // 6. BANGLADESH & GLOBAL STUDIES / বাংলাদেশ ও বিশ্বপরিচয়
      if (sub.includes('বাংলাদেশ ও বিশ্বপরিচয়') || sub.includes('বিশ্বপরিচয়') || sub.includes('bgs')) {
        return `আপনি একজন অভিজ্ঞ প্রাথমিক বিদ্যালয়ের বাংলাদেশ ও বিশ্বপরিচয় শিক্ষক ও প্রশ্নপত্র প্রণেতা।
টার্গেট: শ্রেণি: ${cls}, বিষয়: ${subjectName || 'বাংলাদেশ ও বিশ্বপরিচয়'}।
ভাষা: বিশুদ্ধ প্রমিত বাংলা।

আপনার দায়িত্ব:
1. সংযুক্ত পাঠ্যবইয়ের অধ্যায় থেকে সামাজিক, ঐতিহাসিক ও ভৌগোলিক তথ্যের ভিত্তিতে প্রশ্নপত্র তৈরি করুন।${sourcesBlock}
2. প্রতিটি সেকশনের নির্ধারিত 'count' অনুযায়ী প্রশ্ন তৈরি করুন।

বাংলাদেশ ও বিশ্বপরিচয় প্রশ্নপত্রের নিয়ম:
- "সঠিক উত্তরটি খাতায় লিখ" (mcq): প্রতিটি প্রশ্নে ঠিক ২টি অপশন দিন।
- "সংক্ষেপে উত্তর লিখ" (short): ৫টি স্পষ্ট সংক্ষিপ্ত প্রশ্ন ও উত্তর।
- "শূন্যস্থান পূরণ কর" (fib): বাক্যে "_______" ব্যবহার করুন।
- "সত্য/মিথ্যা নির্ণয় কর" (tf): বিবৃতি ও 'answer' এ "সত্য" বা "মিথ্যা"।
- "বামপাশের সাথে ডানপাশের মিল কর" (match): 'questionText' এ বামপাশ, 'answer' এ ডানপাশ।
- "কাঠামোবদ্ধ প্রশ্ন গুলোর উত্তর দাও" (long): ৫টি যোগ্যতাভিত্তিক কাঠামোবদ্ধ প্রশ্ন ও বিস্তারিত আদর্শ উত্তর।
- "মৌখিক ও শ্রেণিমূল্যায়ন" (oral): প্রশ্ন খালি রাখুন (questions: [])।

অনুরোধকৃত সেকশনসমূহ:
${JSON.stringify(reqSections, null, 2)}

${customInst ? `শিক্ষকের নির্দেশনা: ${customInst}` : ''}
আউটপুট অবশ্যই JSON স্কিমায় দিন।`;
      }

      // 7. ISLAM / ইসলাম ও নৈতিক শিক্ষা
      if (sub.includes('ইসলাম') || sub.includes('islam')) {
        return `আপনি একজন অভিজ্ঞ প্রাথমিক বিদ্যালয়ের ইসলাম ও নৈতিক শিক্ষা শিক্ষক ও প্রশ্নপত্র প্রণেতা।
টার্গেট: শ্রেণি: ${cls}, বিষয়: ${subjectName || 'ইসলাম ও নৈতিক শিক্ষা'}।
ভাষা: বিশুদ্ধ প্রমিত বাংলা।

আপনার দায়িত্ব:
1. সংযুক্ত পাঠ্যবইয়ের অধ্যায় থেকে কুরআন, হাদিস ও ইসলামিক শিষ্টাচার অনুযায়ী প্রশ্নপত্র তৈরি করুন।${sourcesBlock}
2. প্রতিটি সেকশনের 'count' অনুযায়ী প্রশ্ন ও নির্ভুল উত্তর তৈরি করুন।

ইসলাম ও নৈতিক শিক্ষা প্রশ্নপত্রের নিয়ম:
- "সঠিক উত্তরটি খাতায় লিখ" (mcq): ঠিক ২টি অপশন।
- "সংক্ষেপে উত্তর লিখ" (short): ৫টি সংক্ষিপ্ত প্রশ্ন ও সহীহ উত্তর।
- "শূন্যস্থান পূরণ কর" (fib): বাক্যে "_______" ব্যবহার করুন।
- "সত্য/মিথ্যা নির্ণয় কর" (tf): বিবৃতি ও 'answer' এ "সত্য" বা "মিথ্যা"।
- "বামপাশের সাথে ডানপাশের মিল কর" (match): 'questionText' এ বামপাশ, 'answer' এ ডানপাশ।
- "বর্ণনামূলক প্রশ্ন গুলোর উত্তর দাও" (long): ৫টি ইসলামিক বর্ণনামূলক প্রশ্ন ও বিস্তারিত আদর্শ উত্তর।
- "মৌখিক ও শ্রেণিমূল্যায়ন" (oral): প্রশ্ন খালি রাখুন (questions: [])।

অনুরোধকৃত সেকশনসমূহ:
${JSON.stringify(reqSections, null, 2)}

${customInst ? `শিক্ষকের নির্দেশনা: ${customInst}` : ''}
আউটপুট অবশ্যই JSON স্কিমায় দিন।`;
      }

      // 8. HINDU / হিন্দুধর্ম ও নৈতিক শিক্ষা
      if (sub.includes('হিন্দু') || sub.includes('hindu')) {
        return `আপনি একজন অভিজ্ঞ প্রাথমিক বিদ্যালয়ের হিন্দুধর্ম ও নৈতিক শিক্ষা শিক্ষক ও প্রশ্নপত্র প্রণেতা।
টার্গেট: শ্রেণি: ${cls}, বিষয়: ${subjectName || 'হিন্দুধর্ম ও নৈতিক শিক্ষা'}।
ভাষা: বিশুদ্ধ প্রমিত বাংলা।

আপনার দায়িত্ব:
1. সংযুক্ত পাঠ্যবইয়ের অধ্যায় থেকে সনাতন ধর্ম ও নৈতিক শিক্ষার আলোকে প্রশ্ন তৈরি করুন।${sourcesBlock}
2. প্রতিটি সেকশনের 'count' অনুযায়ী প্রশ্ন ও উত্তর তৈরি করুন।

হিন্দুধর্ম ও নৈতিক শিক্ষা প্রশ্নপত্রের নিয়ম:
- "সঠিক উত্তরটি খাতায় লিখ" (mcq): ঠিক ২টি অপশন।
- "সংক্ষেপে উত্তর লিখ" (short): ৫টি সংক্ষিপ্ত প্রশ্ন ও উত্তর।
- "শূন্যস্থান পূরণ কর" (fib): বাক্যে "_______" ব্যবহার করুন।
- "সত্য/মিথ্যা নির্ণয় কর" (tf): বিবৃতি ও 'answer' এ "সত্য" বা "মিথ্যা"।
- "বামপাশের সাথে ডানপাশের মিল কর" (match): 'questionText' এ বামপাশ, 'answer' এ ডানপাশ।
- "বর্ণনামূলক প্রশ্ন গুলোর উত্তর দাও" (long): ৫টি বিস্তারিত প্রশ্ন ও আদর্শ উত্তর।
- "মৌখিক ও শ্রেণিমূল্যায়ন" (oral): প্রশ্ন খালি রাখুন (questions: [])।

অনুরোধকৃত সেকশনসমূহ:
${JSON.stringify(reqSections, null, 2)}

${customInst ? `শিক্ষকের নির্দেশনা: ${customInst}` : ''}
আউটপুট অবশ্যই JSON স্কিমায় দিন।`;
      }

      // 9. GENERAL KNOWLEDGE / সাধারণ জ্ঞান
      if (sub.includes('সাধারণ জ্ঞান') || sub.includes('gk') || sub.includes('general knowledge')) {
        return `আপনি একজন অভিজ্ঞ শিক্ষক ও সাধারণ জ্ঞান প্রশ্নপত্র প্রণেতা।
টার্গেট: শ্রেণি: ${cls}, বিষয়: ${subjectName || 'সাধারণ জ্ঞান'}।
ভাষা: বিশুদ্ধ প্রমিত বাংলা।

আপনার দায়িত্ব:
1. সংযুক্ত সোর্স ও সমসাময়িক সাধারণ জ্ঞানের ভিত্তিতে প্রশ্ন তৈরি করুন।${sourcesBlock}
2. প্রতিটি সেকশনের 'count' অনুযায়ী প্রশ্ন ও উত্তর তৈরি করুন।

সাধারণ জ্ঞান প্রশ্নপত্রের নিয়ম:
- "সঠিক উত্তরটি নির্বাচন কর" (gk_mcq): প্রতিটি প্রশ্নে ২টি সঠিক ও বিভ্রান্তিকর অপশন।
- "এক কথায় উত্তর দাও" (gk_short): ১০টি তথ্যবহুল এক কথায় উত্তর উপযোগী প্রশ্ন ও সঠিক উত্তর।
- "শূন্যস্থান পূরণ কর" (gk_fib): বাক্যে "_______" দিন।
- "বামপাশের সাথে ডানপাশের মিল কর" (gk_match): 'questionText' এ বামপাশ, 'answer' এ ডানপাশ।
- "মৌখিক পরীক্ষা" (oral): প্রশ্ন খালি রাখুন (questions: [])।

অনুরোধকৃত সেকশনসমূহ:
${JSON.stringify(reqSections, null, 2)}

${customInst ? `শিক্ষকের নির্দেশনা: ${customInst}` : ''}
আউটপুট অবশ্যই JSON স্কিমায় দিন।`;
      }

      // 10. GENERAL / CUSTOM FALLBACK (যেকোনো অন্য বিষয় বা কাস্টম বিষয়)
      return `আপনি একজন অভিজ্ঞ শিক্ষক ও প্রশ্নপত্র প্রণেতা।
টার্গেট: শ্রেণি: ${cls}, বিষয়: ${subjectName || 'পরীক্ষা'}।

আপনার দায়িত্ব:
1. সংযুক্ত সোর্স ও ছবি থেকে প্রাসঙ্গিক প্রশ্নপত্র তৈরি করুন।${sourcesBlock}
2. নিচের requestedSections তালিকায় দেওয়া প্রতিটি সেকশনের নাম, ধরন ও 'count' কঠোরভাবে অনুসরণ করুন।

অনুরোধকৃত সেকশনসমূহ:
${JSON.stringify(reqSections, null, 2)}

${customInst ? `শিক্ষকের নির্দেশনা: ${customInst}` : ''}
আউটপুট অবশ্যই JSON স্কিমায় দিন।`;
    }

    const systemPrompt = buildSubjectPrompt(subject, className, requestedSections, fullSourcesBlock, customInstructions);

    const responseSchema = {
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
                    answer: { type: 'string', description: 'Accurate model answer' },
                  },
                  required: ['id', 'questionText', 'answer'],
                },
              },
            },
            required: ['id', 'title', 'instructions', 'marksPerQuestion', 'questions'],
          },
        },
      },
      required: ['examTitle', 'sections'],
    };

    let candidateModels = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
    ];

    try {
      const listRes = await ai.models.list();
      const valid = [];
      for await (const m of listRes) {
        const name = m.name?.replace(/^models\//, '');
        const methods = m.supportedGenerationMethods || [];
        const isGenerative = methods.length === 0 || methods.includes('generateContent');
        if (
          name && 
          name.startsWith('gemini-') && 
          isGenerative && 
          !name.includes('embedding') && 
          !name.includes('aqa') && 
          !name.includes('imagen') && 
          !name.includes('image') &&
          !name.includes('tts') &&
          !name.includes('audio') &&
          !name.includes('2.5-pro') &&
          !name.includes('2.5-flash')
        ) {
          valid.push(name);
        }
      }
      if (valid.length > 0) {
        const flash2 = valid.filter(n => n === 'gemini-2.0-flash' || (n.includes('2.0-flash') && !n.includes('lite')));
        const flash2Lite = valid.filter(n => n.includes('2.0-flash-lite'));
        const flash15 = valid.filter(n => n.includes('1.5-flash'));
        const others = valid.filter(n => !flash2.includes(n) && !flash2Lite.includes(n) && !flash15.includes(n));
        candidateModels = [...new Set([...flash2, ...flash2Lite, ...flash15, ...others, ...candidateModels])];
      }
    } catch (listErr) {
      console.warn('Could not query dynamic models list:', listErr.message);
    }

    let lastError = null;
    let response = null;
    let successfulModel = null;
    let parsedData = null;

    for (const modelName of candidateModels) {
      let retriesForModel = 2;
      let success = false;

      for (let attempt = 1; attempt <= retriesForModel; attempt++) {
        try {
          console.log(`Generating exam questions with model: ${modelName} (attempt ${attempt})`);
          
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: [
                ...imageParts,
                { text: systemPrompt },
              ],
              config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                temperature: 0.2,
              },
            });
          } catch (schemaErr) {
            console.warn(`Schema mode on ${modelName} failed, retrying plain json:`, schemaErr.message);
            response = await ai.models.generateContent({
              model: modelName,
              contents: [
                ...imageParts,
                { text: `${systemPrompt}\n\nদয়া করে সম্পূর্ণ প্রশ্নপত্রটি নিখুঁত JSON আকারে আউটপুট দিন।` },
              ],
              config: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            });
          }

          let outputText = response?.text;
          if (outputText) {
            const data = extractAndParseJson(outputText);
            if (data && (data.sections || data.examTitle)) {
              parsedData = data;
              successfulModel = modelName;
              success = true;
              break;
            }
          }
        } catch (err) {
          lastError = err;
          const errMsg = err.message || '';
          console.warn(`Model ${modelName} (attempt ${attempt}) failed:`, errMsg);

          // If 404 / unsupported model, do not retry - immediately try next model!
          if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('is not supported')) {
            break;
          }

          const isDemandError = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429');
          if (isDemandError) {
            const waitTime = attempt * 1200;
            console.log(`Waiting ${waitTime}ms before retry due to model demand spike...`);
            await new Promise((r) => setTimeout(r, waitTime));
          } else {
            break;
          }
        }
      }

      if (success && parsedData) {
        break;
      }
    }

    if (!parsedData) {
      throw lastError || new Error('All model attempts failed to produce valid question paper JSON.');
    }

    // Strictly enforce requested marks distribution, question count, and titles
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

      parsedData.sections.forEach((sec) => {
        // Ensure oral assessment section (if present) has empty questions array
        const isOral = sec.id === 'oral' || sec.id?.endsWith('_oral') || (sec.title && sec.title.includes('মৌখিক'));
        if (isOral) {
          sec.questions = [];
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      modelUsed: successfulModel,
      data: parsedData 
    });
  } catch (error) {
    console.error('Gemini API Handler Error:', error);
    let errMsg = error.message || 'Failed to process images and generate question paper.';
    if (
      errMsg.includes('401') || 
      errMsg.includes('UNAUTHENTICATED') || 
      errMsg.includes('invalid authentication credentials') || 
      errMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
      errMsg.includes('API_KEY_INVALID')
    ) {
      errMsg = '⚠️ আপনার Gemini API Key সঠিক নয় বা অকার্যকর! Google AI Studio (https://aistudio.google.com/app/apikey) থেকে একটি সঠিক ফ্রি API Key (যা AIzaSy... দিয়ে শুরু হয়) নিয়ে .env.local ফাইলে বসান অথবা অ্যাপ সেটিংসে দিন।';
    } else if (
      errMsg.includes('503') || 
      errMsg.includes('high demand') || 
      errMsg.includes('UNAVAILABLE') || 
      errMsg.includes('ResourceExhausted') || 
      errMsg.includes('429')
    ) {
      errMsg = '⚠️ Google Gemini সার্ভারে অতিরিক্ত ট্রাফিকের কারণে সাময়িক বিলম্ব হচ্ছে (503 High Demand)। কয়েক সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন।';
    }
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
