import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { images = [], language = 'bn', apiKey: customApiKey } = body;

    const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'Gemini API Key পাওয়া যায়নি। অনুগ্রহ করে Google AI Studio (https://aistudio.google.com/app/apikey) থেকে সম্পূর্ণ ফ্রিতে একটি API Key নিন এবং .env.local ফাইলে সেট করুন অথবা সেটিংসে দিন।' 
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({
        success: true,
        text: '',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Format base64 images as Google Gen AI inline parts
    const imageParts = [];
    images.forEach((img, idx) => {
      if (img.sourceTitle) {
        imageParts.push({ text: `[Page ${idx + 1} - "${img.sourceTitle}"]:` });
      }
      imageParts.push({
        inlineData: {
          mimeType: img.mimeType || 'image/jpeg',
          data: img.base64Data,
        },
      });
    });

    const extractionPrompt = `You are an expert OCR and text extractor for Bangladeshi school textbooks (NCTB / Primary & Kindergarten curriculum).
Task:
1. Extract all readable Bengali and English text, titles, stories, poems, sentences, textbook exercises (অনুশীলনী, সংক্ষিপ্ত প্রশ্ন, কাঠামোবদ্ধ/বর্ণনামূলক প্রশ্ন ও প্রশ্নোত্তর), word meanings, mathematical equations, numbers, and grammar rules from the attached page images verbatim and accurately. Pay special attention to capturing every single question and exercise item present on the pages.
2. Maintain natural paragraph structure and headings.
3. DO NOT generate new questions, do not summarize, and do not output JSON.
4. Output ONLY the raw extracted plain text content.`;

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
      console.warn('Could not query dynamic models list for text extraction:', listErr.message);
    }

    let extractedText = '';
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`Extracting text from images with model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            ...imageParts,
            { text: extractionPrompt },
          ],
          config: {
            temperature: 0.1,
          },
        });

        if (response?.text) {
          extractedText = response.text.trim();
          break;
        }
      } catch (err) {
        lastError = err;
        const errMsg = err.message || '';
        console.warn(`Extraction model ${modelName} failed:`, errMsg);

        if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('is not supported')) {
          continue;
        }

        const isDemandError = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429');
        if (isDemandError) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    }

    if (!extractedText && lastError) {
      throw lastError;
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
    });
  } catch (error) {
    console.error('Text Extraction Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract text from images.' },
      { status: 500 }
    );
  }
}
