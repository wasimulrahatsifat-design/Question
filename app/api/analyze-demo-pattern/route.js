import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { extractAndParseJson } from '@/lib/jsonHelper';

export async function POST(req) {
  try {
    const body = await req.json();
    const { images = [], className = 'পঞ্চম', subject = 'বাংলা', apiKey: customApiKey } = body;

    const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key পাওয়া যায়নি। দয়া করে সেটিংস বা .env.local এ API Key যুক্ত করুন।' },
        { status: 400 }
      );
    }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'বিশ্লেষণের জন্য কোনো ডেমো প্রশ্নপত্রের ছবি বা পিডিএফ পাতা পাওয়া যায়নি।' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const imageParts = images.map((img) => ({
      inlineData: {
        mimeType: img.mimeType || 'image/jpeg',
        data: img.base64Data,
      },
    }));

    const systemPrompt = `আপনি একজন বিশেষজ্ঞ স্কুল কারিকুলাম ও প্রশ্নপত্র বিশ্লেষক (Exam Pattern & Curriculum Analyzer Expert)।
টার্গেট স্তর: শ্রেণি: ${className} | বিষয়: ${subject}।

আপনার কাজ:
সংযুক্ত ডেমো/নমুনা প্রশ্নপত্রের ছবি বা পৃষ্ঠাগুলো খুব সূক্ষ্মভাবে ও শুরু থেকে শেষ পর্যন্ত সম্পূর্ণ বিশ্লেষণ করুন।
প্রশ্নপত্রের সম্পূর্ণ কাঠামো, প্রতিটি সেকশনের ক্রম (১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯, ১০...), নাম/শিরোনাম, প্রশ্নের সংখ্যা (count), প্রতি প্রশ্নের মান (marksPerQuestion), মোট নম্বর (totalMarks), এবং বিশেষ ফরম্যাটিং বৈশিষ্ট্য নিখুঁতভাবে শনাক্ত করে JSON আকারে দিন।

কঠোর নির্দেশনা:
১. প্রশ্নপত্রে যতগুলো নম্বরযুক্ত ধারা বা প্রশ্ন রয়েছে (যেমন: ১। শব্দার্থ লিখ, ২। বাক্য গঠন কর, ৩। “...” কবিতা লিখ কবির নামসহ ১ম ৮ লাইন, ৪। শূন্যস্থান পূরণ কর, ৫। বিরাম চিহ্ন বসাও, ৬। নিচের প্রশ্নগুলোর উত্তর দাও, ৭। যুক্তবর্ণ বিভাজন করে ২টি শব্দ গঠন কর, ৮। বর্ণনামূলক প্রশ্নের উত্তর দাও, ৯। সত্য-মিথ্যা নির্ণয় কর, ১০। বামপাশের সাথে ডানপাশ মিল কর ইত্যাদি)—প্রতিটি ধারার জন্য 'sections' array-তে একটি করে অবজেক্ট তৈরি করুন। কোনো সেকশন বাদ দেবেন না।
২. প্রতিটি ধারার আসল নাম/শিরোনাম 'title' ফিল্ডে দিন (যেমন: "শব্দার্থ লিখ", "বাক্য গঠন কর", "“সংকল্প” কবিতা লিখ কবির নামসহ ১ম ৮ লাইন", "যুক্তবর্ণ বিভাজন করে ২টি শব্দ গঠন কর")।
৩. প্রতিটি ধারার মোট প্রশ্নের সংখ্যা 'count' ফিল্ডে এবং ডানপাশে থাকা নম্বর অনুযায়ী 'marksPerQuestion' ও 'totalMarks' নিখুঁতভাবে দিন।
৪. সেকশনের ফরম্যাট টাইপ 'formatType' হিসেবে দিন:
   - 'inline_comma' (শব্দার্থ, বাক্য গঠন, যুক্তবর্ণ - যা এক লাইনে কমা দিয়ে থাকে)
   - 'single_prompt' (কবিতা, বিরাম চিহ্ন, বর্ণনামূলক প্রশ্ন / রচনা)
   - 'table_match' (বামপাশ-ডানপাশ মিলকরণ টেবিল)
   - 'mcq' (সঠিক উত্তর নির্বাচন)
   - 'list_standard' (ক, খ, গ... আকারে প্রশ্ন)
৫. কোনো সেকশন যদি শূন্যস্থান বা সত্য-মিথ্যা বা প্রশ্ন উত্তর হয় তবে সেটির count স্পষ্ট করে বের করুন (যেমন: ৫টি থাকলে count: 5)।
৬. আউটপুট অবশ্যই শুদ্ধ JSON অবজেক্ট হতে হবে।`;

    const responseSchema = {
      type: 'object',
      properties: {
        examTitle: { type: 'string', description: 'পরীক্ষার শিরোনাম (যেমন: ২য় সেমিস্টার পরীক্ষা- ২০২৬ ইং)' },
        className: { type: 'string' },
        subject: { type: 'string' },
        totalMarks: { type: 'number', description: 'মোট পূর্ণমান (যেমন: ১০০)' },
        timeAllowed: { type: 'string', description: 'সময় (যেমন: ২ ঘণ্টা)' },
        patternSummary: { type: 'string', description: 'প্রশ্নপত্রের কাঠামোর সংক্ষিপ্ত বিবরণ' },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'স্বতন্ত্র আইডি যেমন: bn_vocab, bn_sentence, bn_poem, bn_fib, bn_punctuation, bn_qa, bn_conjunct, bn_desc, bn_tf, bn_match' },
              title: { type: 'string', description: 'সেকশনের শিরোনাম/নির্দেশনা' },
              count: { type: 'number', description: 'প্রশ্নের সংখ্যা' },
              marksPerQuestion: { type: 'number', description: 'প্রতি প্রশ্নের নম্বর' },
              totalMarks: { type: 'number', description: 'এই সেকশনের মোট নম্বর' },
              isMcq: { type: 'boolean' },
              formatType: { type: 'string', description: 'inline_comma | single_prompt | table_match | mcq | list_standard' },
              sampleSnippet: { type: 'string', description: 'প্রশ্নপত্র থেকে পাওয়া নমুনা' },
              instructions: { type: 'string', description: 'AI বা শিক্ষকের জন্য ফরম্যাটিং নির্দেশনা' },
            },
            required: ['id', 'title', 'count', 'marksPerQuestion', 'totalMarks'],
          },
        },
        formattingRules: {
          type: 'array',
          items: { type: 'string' },
          description: 'প্রশ্নপত্রটিতে লক্ষ্য করা বিশেষ নিয়মাবলী (যেমন: শব্দার্থে ক,খ নেই, কবিতায় কোটেশন ইত্যাদি)',
        },
      },
      required: ['examTitle', 'className', 'subject', 'totalMarks', 'sections'],
    };

    let candidateModels = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
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
          !name.includes('tts') &&
          !name.includes('2.5-pro')
        ) {
          valid.push(name);
        }
      }
      if (valid.length > 0) {
        const flash2 = valid.filter(n => n === 'gemini-2.0-flash' || (n.includes('2.0-flash') && !n.includes('lite')));
        const flash2Lite = valid.filter(n => n.includes('2.0-flash-lite'));
        const flash15 = valid.filter(n => n.includes('1.5-flash'));
        const flash25 = valid.filter(n => n.includes('2.5-flash'));
        const others = valid.filter(n => !flash2.includes(n) && !flash2Lite.includes(n) && !flash15.includes(n) && !flash25.includes(n));
        candidateModels = [...new Set([...flash2, ...flash2Lite, ...flash15, ...flash25, ...others, ...candidateModels])];
      }
    } catch (listErr) {
      console.warn('Could not query dynamic models list:', listErr.message);
    }

    let resultJson = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      let retriesForModel = 2;
      let success = false;

      for (let attempt = 1; attempt <= retriesForModel; attempt++) {
        try {
          console.log(`Analyzing demo pattern with model: ${modelName} (attempt ${attempt})`);
          
          let responseText = '';
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: [
                ...imageParts,
                { text: `${systemPrompt}\n\nদয়া করে সংযুক্ত ডেমো প্রশ্নপত্রের নিখুঁত ধারা, নম্বর ও নিয়ম বিশ্লেষণ করে JSON আউটপুট দিন।` }
              ],
              config: {
                responseMimeType: 'application/json',
                responseSchema,
                temperature: 0.2,
              },
            });
            responseText = response?.text || '';
          } catch (schemaErr) {
            console.warn(`Schema mode on ${modelName} failed, retrying without strict schema:`, schemaErr.message);
            const response = await ai.models.generateContent({
              model: modelName,
              contents: [
                ...imageParts,
                { text: `${systemPrompt}\n\nদয়া করে সংযুক্ত ডেমো প্রশ্নপত্রের ধারা ও নম্বর বিশ্লেষণ করে শুধু নিখুঁত JSON আউটপুট দিন (কোনো অতিরিক্ত টেক্সট ছাড়া)।` }
              ],
              config: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            });
            responseText = response?.text || '';
          }

          if (responseText) {
            const parsed = extractAndParseJson(responseText);
            if (parsed) {
              resultJson = parsed;
              success = true;
              break;
            }
          }
        } catch (err) {
          lastError = err;
          const errMsg = err.message || '';
          console.warn(`Model ${modelName} (attempt ${attempt}) analysis failed:`, errMsg);

          // If model is not found (404) or unsupported, don't retry - go immediately to next candidate model!
          if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('is not supported')) {
            break;
          }

          const isDemandError = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429');
          if (isDemandError) {
            const waitTime = attempt * 1200;
            console.log(`Waiting ${waitTime}ms before retry due to model load...`);
            await new Promise((r) => setTimeout(r, waitTime));
          } else {
            break;
          }
        }
      }

      if (success && resultJson) {
        break;
      }
    }

    if (!resultJson) {
      throw lastError || new Error('ডেমো প্রশ্নপত্র বিশ্লেষণ করতে ব্যর্থ হয়েছে।');
    }

    return NextResponse.json({
      success: true,
      data: resultJson,
    });
  } catch (error) {
    console.error('Demo Pattern Analysis Error:', error);
    let errMsg = error.message || 'ডেমো প্রশ্নপত্র প্রসেস করার সময় ত্রুটি ঘটেছে।';
    
    if (
      errMsg.includes('401') || 
      errMsg.includes('UNAUTHENTICATED') || 
      errMsg.includes('API_KEY_INVALID') || 
      errMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
      errMsg.includes('invalid authentication credentials')
    ) {
      errMsg = '⚠️ Gemini API Key সঠিক নয় বা কাজ করছে না। অনুগ্রহ করে Google AI Studio (https://aistudio.google.com/app/apikey) থেকে একটি সঠিক ও ফ্রি API Key (যা AIzaSy... দিয়ে শুরু হয়) নিয়ে অ্যাডমিন সেটিংসে সেভ করুন।';
    } else if (
      errMsg.includes('503') || 
      errMsg.includes('high demand') || 
      errMsg.includes('UNAVAILABLE') || 
      errMsg.includes('ResourceExhausted') || 
      errMsg.includes('429')
    ) {
      errMsg = '⚠️ Google Gemini সার্ভারে বর্তমানে অতিরিক্ত ট্রাফিকের চাপ রয়েছে (503 High Demand)। আমাদের সিস্টেম স্বয়ংক্রিয়ভাবে বিকল্প মডেল দিয়ে আবার চেষ্টা করবে। অনুগ্রহ করে কয়েক সেকেন্ড পর পুনরায় "AI দিয়ে প্রশ্নপত্রের প্যাটার্ন বিশ্লেষণ করুন" বাটনে ক্লিক করুন।';
    }

    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
