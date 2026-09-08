import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      questionText, 
      currentAnswer, 
      action, 
      customInstruction, 
      className = 'পঞ্চম', 
      subject = 'বিজ্ঞান',
      apiKey: customApiKey 
    } = body;

    const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key পাওয়া যায়নি।' },
        { status: 400 }
      );
    }

    if (!questionText) {
      return NextResponse.json(
        { error: 'Question text is required.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    let instructionDetails = '';
    if (action === 'make_longer') {
      instructionDetails = 'বর্তমান উত্তরটিকে আরও বড়, বিস্তারিত ও ৫ নম্বরের উপযোগী তথ্যবহুল করুন। প্রশ্নের ধরন অনুযায়ী ব্যাখ্যামূলক প্রশ্নে ৪-৬ বাক্যের সহজবোধ্য অনুচ্ছেদে এবং পয়েন্টভিত্তিক প্রশ্নে পয়েন্ট আকারে সহজ ও প্রাঞ্জল ভাষায় সাজিয়ে লিখুন (অপ্রয়োজনে জোর করে পয়েন্ট বানাবেন না)। ভাষা অবশ্যই কোমলমতি শিক্ষার্থীদের উপযোগী অত্যন্ত সহজ, সরল ও প্রমিত বাংলা হতে হবে।';
    } else if (action === 'make_shorter') {
      instructionDetails = 'বর্তমান উত্তরটিকে সংক্ষেপ করুন (১-২টি স্পষ্ট ও সংক্ষিপ্ত বাক্যে মূল তথ্যটুকু রাখুন)।';
    } else if (action === 'simplify') {
      instructionDetails = 'উত্তরটি কিন্ডারগার্টেন ও প্রাথমিক স্তরের শিক্ষার্থীদের জন্য অত্যন্ত সহজ, সরল ও প্রাঞ্জল ভাষায় নতুন করে সাজিয়ে লিখুন।';
    } else if (customInstruction) {
      instructionDetails = `শিক্ষকের বিশেষ নির্দেশনা মেনে উত্তরটি নতুনভাবে তৈরি করুন: "${customInstruction}"`;
    } else {
      instructionDetails = 'উত্তরটি আরও সুন্দর ও মানসম্মত প্রমিত বাংলায় নতুন করে লিখুন।';
    }

    const prompt = `আপনি একজন অভিজ্ঞ প্রাথমিক বিদ্যালয়ের শিক্ষক।
শ্রেণি: ${className}, বিষয়: ${subject}।

প্রশ্ন: ${questionText}
বর্তমান উত্তর: ${currentAnswer || 'নেই'}

নির্দেশনা:
${instructionDetails}

কঠোর নিয়ম:
১. শুধুমাত্র পরিমার্জিত উত্তরটি লিখুন। কোনো ভূমিকা, শুভেচ্ছা বা অতিরিক্ত ব্যাখ্যা (যেমন "এখানে উত্তরটি দেওয়া হলো:") লিখবেন না।
২. ভাষা সম্পূর্ণ প্রমিত বাংলা হতে হবে।`;

    let candidateModels = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b'
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
          !name.includes('1.5-pro')
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
      console.warn('Could not query dynamic models list in refine-answer:', listErr.message);
    }

    let newAnswer = '';
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ text: prompt }],
          config: {
            temperature: 0.3,
          },
        });

        if (response && response.text) {
          newAnswer = response.text.trim();
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} refinement failed:`, err.message);
        const errMsg = err.message || '';
        if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('is not supported')) {
          continue;
        }
      }
    }

    if (!newAnswer) {
      throw lastError || new Error('Failed to refine answer.');
    }

    return NextResponse.json({ 
      success: true, 
      refinedAnswer: newAnswer 
    });
  } catch (error) {
    console.error('Answer Refinement Error:', error);
    let errMsg = error.message || 'Failed to refine answer.';
    if (
      errMsg.includes('401') || 
      errMsg.includes('UNAUTHENTICATED') || 
      errMsg.includes('invalid authentication credentials') ||
      errMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED')
    ) {
      errMsg = 'Gemini API Key সঠিক নয় বা অকার্যকর! অনুগ্রহ করে Google AI Studio থেকে সঠিক API Key দিন।';
    }
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
