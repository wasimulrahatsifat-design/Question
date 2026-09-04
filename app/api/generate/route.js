import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { images, className, subject, requestedSections, customInstructions, language = 'bn', apiKey: customApiKey } = body;

    const apiKey = process.env.GEMINI_API_KEY || customApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'Gemini API Key is missing. Please add GEMINI_API_KEY to your .env.local file or enter it in the API Key box in the navbar.' 
        },
        { status: 400 }
      );
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'No page images provided for question generation.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Format base64 images as Google Gen AI inline parts
    const imageParts = images.map((img) => ({
      inlineData: {
        mimeType: img.mimeType || 'image/jpeg',
        data: img.base64Data,
      },
    }));

    const isBengali = language === 'bn';

    const systemPrompt = isBengali
      ? `আপনি একজন অভিজ্ঞ বাংলাদেশি কিন্ডারগার্টেন ও প্রাথমিক বিদ্যালয়ের শিক্ষক ও প্রশ্নপত্র প্রণেতা।
টার্গেট স্তর: শ্রেণি: ${className || 'পঞ্চম'}, বিষয়: ${subject || 'বিজ্ঞান'}।
ভাষা: সম্পূর্ণ বিশুদ্ধ ও সহজবোধ্য প্রমিত বাংলা (Bengali)।

আপনার দায়িত্ব:
1. সংযুক্ত পাঠ্যবইয়ের অধ্যায়ের ছবিগুলো থেকে সরাসরি মূল তথ্য ও বিষয়বস্তু গ্রহণ করে প্রশ্নপত্র তৈরি করুন।
2. নিচের সেকশনগুলোর নিয়ম কঠোরভাবে মেনে চলুন:

সেকশন সংক্রান্ত সুনির্দিষ্ট নিয়মাবলী:
- "১। সঠিক উত্তরটি খাতায় লিখ": প্রতিটি প্রশ্নে ঠিক ২টি পরিষ্কার অপশন দিন (যেমন: ক. পানি   খ. বায়ু)। অপশনে কোনো অতিরিক্ত ডুপ্লিকেট প্রিফিক্স দেবেন না।
- "২। সংক্ষেপে উত্তর লিখ": ছোট ও সহজবোধ্য ১-২ বাক্যের প্রশ্ন ও নির্ভুল উত্তর।
- "৩। শূন্যস্থান পূরণ কর": বাক্যের মধ্যে একটি উপযুক্ত স্থানে "_______" ব্যবহার করুন এবং 'answer' ফিল্ডে শুধুমাত্র শূন্যস্থানের মূল শব্দটি দিন।
- "৪। সত্য/মিথ্যা নির্ণয় কর": বাক্য দিন এবং 'answer' এ শুধুমাত্র "সত্য" বা "মিথ্যা" লিখুন।
- "৫। বামপাশের সাথে ডানপাশের মিল কর": 'questionText' এ বামপাশের অংশ দিন এবং 'answer' এ ডানপাশের মেলানো অংশ দিন।
- "৬। নিচের প্রশ্ন গুলোর উত্তর দাও": বর্ণনামূলক/রচনামূলক প্রশ্ন (যেহেতু এগুলোতে সর্বোচ্চ নম্বর থাকে)। উত্তরগুলো কিন্ডারগার্টেন ও প্রাথমিক স্তরের শিক্ষার্থীদের জন্য সহজ-সরল প্রমিত ভাষায় কিন্তু যথেষ্ট বিস্তারিত ও সুন্দরভাবে বড় করে (৪-৬টি পূর্ণ বাক্য অথবা ৩-৪টি সুস্পষ্ট তথ্যবহুল পয়েন্ট আকারে) লিখুন। কখনোই ১-২ বাক্যে ছোট করবেন না, বিস্তারিত বর্ণনামূলক উত্তর দিন।
- "৭। মৌখিক ও শ্রেণিমূল্যায়ন": এই সেকশনে কোনো প্রশ্ন থাকবে না (questions array সম্পূর্ণ খালি রাখুন)।

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
      'gemini-3.6-flash',
      'gemini-3.6-pro',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];

    try {
      const listRes = await ai.models.list();
      const available = [];
      for await (const m of listRes) {
        const name = m.name?.replace(/^models\//, '');
        if (name && (m.supportedActions?.includes('generateContent') || m.supportedGenerationMethods?.includes('generateContent') || true)) {
          available.push(name);
        }
      }
      if (available.length > 0) {
        const flashModels = available.filter(n => n.includes('flash'));
        const otherModels = available.filter(n => !n.includes('flash'));
        candidateModels = [...flashModels, ...otherModels];
      }
    } catch (listErr) {
      console.warn('Could not query model list, using fallback array:', listErr.message);
    }

    let lastError = null;
    let response = null;
    let successfulModel = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`Generating exam questions with model: ${modelName}`);
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

        if (response && response.text) {
          successfulModel = modelName;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} attempt failed:`, err.message);
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
    return NextResponse.json(
      { error: error.message || 'Failed to process images and generate question paper.' },
      { status: 500 }
    );
  }
}
