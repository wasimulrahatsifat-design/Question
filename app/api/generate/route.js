import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

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

    // Format base64 images as Google Gen AI inline parts
    const imageParts = hasImages
      ? images.map((img) => ({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: img.base64Data,
          },
        }))
      : [];

    let textSourcesBlock = '';
    if (hasTexts) {
      textSourcesBlock = `\n\nসংযুক্ত টেক্সট নোট/সোর্সসমূহ:\n` + textSources.map((t, idx) => `[সোর্স ${idx + 1}: ${t.title || 'নোট'}]\n${t.text}\n`).join('\n');
    }

    const isBengali = language === 'bn';

    const systemPrompt = isBengali
      ? `আপনি একজন অভিজ্ঞ বাংলাদেশি কিন্ডারগার্টেন ও প্রাথমিক বিদ্যালয়ের শিক্ষক ও প্রশ্নপত্র প্রণেতা।
টার্গেট স্তর: শ্রেণি: ${className || 'পঞ্চম'}, বিষয়: ${subject || 'বাংলা'}।
ভাষা: সম্পূর্ণ বিশুদ্ধ ও সহজবোধ্য প্রমিত বাংলা (Bengali)।

আপনার দায়িত্ব:
1. সংযুক্ত পাঠ্যবইয়ের অধ্যায়ের ছবি ও টেক্সট সোর্সগুলো থেকে সরাসরি মূল তথ্য ও বিষয়বস্তু গ্রহণ করে প্রশ্নপত্র তৈরি করুন।${textSourcesBlock}
2. নিচের সেকশনগুলোর নিয়ম কঠোরভাবে মেনে চলুন:

সেকশন সংক্রান্ত সুনির্দিষ্ট নিয়মাবলী (বাংলা ও অন্যান্য বিষয়ের জন্য):
- "শব্দার্থ লিখ": 'questionText' এ শুধুমাত্র মূল শব্দটি থাকবে (যেমন: "টগবগে", "মানা", "ঝাঁক", "চিৎকার", "কিন্তু")। কোনো 'ক', 'খ' থাকবে না। 'answer' এ "শব্দ = অর্থ" ফরম্যাটে থাকবে (যেমন: "গন্ধ = সুবাস" বা "বন্য = বুনো")।
- "বাক্য গঠন কর": 'questionText' এ শুধুমাত্র মূল শব্দটি থাকবে (যেমন: "দূরে", "ছোট", "অথচ", "চাইতে", "পরে")। কোনো 'ক', 'খ' থাকবে না। 'answer' এ "শব্দ- অর্থপূর্ণ বাক্য" ফরম্যাটে থাকবে (যেমন: "বন্য- বাঘ একটি বন্য প্রাণী।")।
- "কবিতা সংক্রান্ত প্রশ্ন" (যেমন: কবিতা লিখ কবির নামসহ ১ম ৮ লাইন): 'questionText' এ সোর্সের কবিতার নাম কোটেশনে যুক্ত করে সরাসরি সম্পূর্ণ প্রশ্নটি লিখুন, যেমন: "“সংকল্প” কবিতা লিখ কবির নামসহ ১ম ৮ লাইন।" (এখানে কোটেশনের ভিতর সোর্সের নির্দিষ্ট কবিতার নাম থাকবে)। সেকশনের 'title' বা 'questionText' এ সরাসরি এই প্রশ্নটি থাকবে এবং নিচে কোনো 'ক' বা কোনো সাব-প্রশ্ন থাকবে না (questions array তে শুধুমাত্র এই ১টি আইটেম থাকবে)। 'answer' এ কোনো উত্তর দেওয়ার প্রয়োজন নেই (খালি "" রাখুন)।
- "শূন্যস্থান পূরণ কর": প্রতিটি প্রশ্নে 'questionText' এ বাক্যের মধ্যে একটি উপযুক্ত স্থানে "_______" ব্যবহার করুন এবং 'answer' ফিল্ডে শুধুমাত্র শূন্যস্থানের মূল শব্দটি দিন (ক, খ, গ, ঘ, ঙ আকারে থাকবে)।
- "বিরাম চিহ্ন বসাও": 'questionText' এ সোর্সের কোনো একটি গল্প থেকে সরাসরি ২-৩ লাইনের একটি বাস্তব অনুচ্ছেদ দিন যেখানে কোনো 'ক' বা কোনো যতিচিহ্ন থাকবে না (যেমন: "টুনটুনি বলল ওগো তো ছোট প্রাণী তোমরা ওকে মারছো কেন\nএকটি ছেলে বলল আমরা তো মজা করছি\nটুনটুনি রাগ করে বলল কেউ তোমাদের এভাবে তাড়া করলে কেমন লাগত")। 'answer' এ যথাযথ বিরামচিহ্ন বসানো পূর্ণাঙ্গ অনুচ্ছেদ দিন (এখানেও কোনো 'ক' থাকবে না)।
- "যুক্তবর্ণ বিভাজন করে ২টি শব্দ গঠন কর" / "যুক্তবর্ণ": 'questionText' এ শুধুমাত্র মূল যুক্তবর্ণটি থাকবে (যেমন: "জ্ঞ", "ক্ষ", "ন্ধ", "ষ্ট", "ঞ্চ")। কোনো 'ক', 'খ' থাকবে না। 'answer' এ "ন্ধ= ন + ধ (গন্ধ, বান্ধব)" ফরম্যাটে বিভাজন ও বন্ধনীতে ২টি শব্দ থাকবে (কোনো 'ক', 'খ' থাকবে না)।
- "বর্ণনামূলক প্রশ্ন" / "বর্ণনামূলক প্রশ্নের উত্তর দাও" / "গল্পের মূলভাব লিখ": 'questionText' এ সোর্সের গল্প বা অধ্যায় অনুযায়ী একটি বড় বর্ণনামূলক প্রশ্ন তৈরি করুন (যেমন: "“শৈশবের ভাবনা” গল্পের আলোকে আনন্দময় শৈশবের গুরুত্ব নিজের ভাষায় বর্ণনা কর।" অথবা অধ্যায়ভিত্তিক তাৎপর্যপূর্ণ বর্ণনামূলক প্রশ্ন)। কোনো 'ক' থাকবে না (questions array তে শুধুমাত্র এই ১টি প্রশ্ন থাকবে)। 'answer' এ বিস্তারিত, গোছানো ও সহজবোধ্য আদর্শ উত্তর দিন (কোনো 'ক' থাকবে না)।
- "নিচের প্রশ্ন গুলোর উত্তর দাও" / "সংক্ষেপে উত্তর লিখ": গল্প বা বিষয়ের উপর ভিত্তি করে স্পষ্ট প্রশ্ন ও নির্ভুল উত্তর (ক, খ, গ, ঘ, ঙ আকারে)।
- "সত্য/মিথ্যা নির্ণয় কর" / "সত্য-মিথ্যা নির্ণয় কর": বাক্য দিন এবং 'answer' এ শুধুমাত্র "সত্য" বা "মিথ্যা" লিখুন (ক, খ, গ, ঘ, ঙ আকারে)।
- "ডানপাশের সাথে বামপাশ মিল কর" / "বামপাশের সাথে ডানপাশের মিল কর": 'questionText' এ বামপাশের অংশ দিন এবং 'answer' এ ডানপাশের মেলানো অংশ দিন।
- "সঠিক উত্তরটি খাতায় লিখ" (MCQ): প্রতিটি প্রশ্নে ঠিক ২টি পরিষ্কার অপশন দিন (যেমন: ক. পানি   খ. বায়ু)। অপশনে কোনো অতিরিক্ত ডুপ্লিকেট প্রিফিক্স দেবেন না।
- "মৌখিক ও শ্রেণিমূল্যায়ন": এই সেকশনে কোনো প্রশ্ন থাকবে না (questions array সম্পূর্ণ খালি রাখুন)।

অনুরোধকৃত সেকশনসমূহ:
${JSON.stringify(requestedSections, null, 2)}

${customInstructions ? `শিক্ষকের নির্দেশনা: ${customInstructions}` : ''}

আউটপুট অবশ্যই নিচের JSON স্কিমায় ফেরত দিন।`
      : `You are an expert school examination creator for primary schools.
Target Audience: Class ${className || '5'}, Subject: ${subject || 'Science'}.
Language: English.

Requirements:
1. Section 1 (MCQ): Exactly 2 options per question.
2. Section 3 (Fill Blanks): Use "_______".
3. Section 4 (True/False): Provide statements with True/False answer.
4. Section 5 (Match): Put left phrase in 'questionText' and matching right phrase in 'answer'.
5. Section 6 (Descriptive): Provide rich, detailed, well-explained answers (4-6 comprehensive sentences or detailed bullet points) suitable for elementary school examinations.
6. Section 7 (Oral): Empty questions array.
7. Return clean JSON matching schema.`;

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
    ];

    try {
      const listRes = await ai.models.list();
      const valid = [];
      for await (const m of listRes) {
        const name = m.name?.replace(/^models\//, '');
        const methods = m.supportedGenerationMethods || [];
        const isGenerative = methods.length === 0 || methods.includes('generateContent');
        if (name && isGenerative && !name.includes('embedding') && !name.includes('aqa') && !name.includes('imagen') && !name.includes('2.5-flash') && !name.includes('1.5-pro')) {
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

          if (response && response.text) {
            successfulModel = modelName;
            success = true;
            break;
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

      if (success && response && response.text) {
        break;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('All model attempts failed.');
    }

    const outputText = response.text;
    const parsedData = JSON.parse(outputText);

    // Ensure Section 7 (Oral assessment) has empty questions array
    if (parsedData && parsedData.sections) {
      parsedData.sections.forEach((sec) => {
        if (sec.id.includes('oral') || sec.title.includes('মৌখিক')) {
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
