/**
 * Presentation Service
 * Orchestrates AI models to generate presentations from PDFs
 */

import { ParsedPDF } from './pdfParser';

// ============================================
// Types & Interfaces
// ============================================

export interface BookSummary {
    mainTheme: string;
    chapters: ChapterSummary[];
    keyPoints: string[];
    targetAudience: string;
}

export interface ChapterSummary {
    title: string;
    summary: string;
    keyPoints: string[];
    importance: number; // 1-10
}

export interface SlideStructure {
    type: 'title' | 'content' | 'image' | 'conclusion';
    title: string;
    content?: string[];
    imageQuery?: string;
    notes?: string;
}

export interface Slide extends SlideStructure {
    imageUrl?: string;
    index: number;
}

export interface Presentation {
    slides: Slide[];
    title: string;
    file?: Blob;
    createdAt: Date;
    metadata?: {
        sourcePages: number;
        generationTime: number;
        modelsUsed: string[];
    };
}

export interface PresentationOptions {
    chapter?: string;
    maxSlides?: number;
    includeImages?: boolean;
    imageSource?: 'unsplash' | 'imagen';
    language?: 'en' | 'ar';
}

export type ProgressCallback = (stage: string, progress: number) => void;
export type ChunkCallback = (chunk: string) => void;

// ============================================
// Model Configuration
// ============================================

export const PRESENTATION_MODELS = {
    READER: 'gemini-2.0-flash-lite',           // 1M tokens for heavy reading
    ORCHESTRATOR: 'gemini-2.5-flash-live',     // Unlimited RPM for planning
    WRITER: 'gemini-2.5-pro',                   // Best quality for final content
    IMAGE_GEN: 'gemini-2.5-flash-image'        // Image generation
} as const;

// ============================================
// Main Generation Function
// ============================================

/**
 * Generate presentation from PDF with intelligent slide count
 */
export const generatePresentation = async (
    parsedPDF: ParsedPDF,
    options: PresentationOptions = {},
    onProgress?: ProgressCallback,
    onChunk?: ChunkCallback
): Promise<Presentation> => {
    const startTime = Date.now();

    try {
        // Step 0: Determine optimal slide count (10%)
        onProgress?.('Analyzing document size and complexity...', 0);
        const optimalSlideCount = calculateOptimalSlideCount(parsedPDF.text, parsedPDF.pages);
        const maxSlides = options.maxSlides || optimalSlideCount;
        onProgress?.('Analyzing document size and complexity...', 10);

        // Step 1: Deep Reading & Understanding (30%)
        onProgress?.('Reading and understanding content deeply...', 10);
        const summary = await readAndUnderstand(parsedPDF.text, onChunk, options.language);
        onProgress?.('Reading and understanding content deeply...', 30);

        // Step 2: Content Analysis (50%)
        onProgress?.('Analyzing document structure and key concepts...', 30);
        const breakdown = await analyzeContent(summary, onChunk);
        onProgress?.('Analyzing document structure and key concepts...', 50);

        // Step 3: Slide Planning (65%)
        onProgress?.('Planning optimal slide structure...', 50);
        const slideStructure = await planSlides(breakdown, { ...options, maxSlides }, onChunk);
        onProgress?.('Planning optimal slide structure...', 65);

        // Step 4: Content Generation (80%)
        onProgress?.('Generating professional content from document...', 65);
        const slides = await generateSlideContent(slideStructure, onChunk);
        onProgress?.('Generating professional content from document...', 80);

        // Step 5: Add Images (90%)
        if (options.includeImages !== false) {
            onProgress?.('Adding visual elements...', 80);
            await addImages(slides, options.imageSource || 'unsplash');
            onProgress?.('Adding visual elements...', 90);
        }

        // Step 6: Build PPTX (95%)
        onProgress?.('Building PowerPoint file...', 90);
        const pptxBlob = await buildPPTX(slides, parsedPDF.title || 'Presentation');
        onProgress?.('Building PowerPoint file...', 95);

        // Complete
        const generationTime = Date.now() - startTime;
        onProgress?.('Complete!', 100);

        return {
            slides,
            title: parsedPDF.title || 'Presentation',
            file: pptxBlob,
            createdAt: new Date(),
            metadata: {
                sourcePages: parsedPDF.pages,
                generationTime,
                modelsUsed: [
                    PRESENTATION_MODELS.READER,
                    PRESENTATION_MODELS.ORCHESTRATOR,
                    PRESENTATION_MODELS.WRITER
                ]
            }
        };

    } catch (error: any) {
        console.error('Presentation generation error:', error);
        throw new Error(`Failed to generate presentation: ${error.message}`);
    }
};

/**
 * Calculate optimal slide count based on document size
 */
const calculateOptimalSlideCount = (text: string, pages: number): number => {
    // Formula: 1 slide per 300 words (more detailed) + 1 per page, capped between 10-30
    const wordCount = text.split(/\s+/).length;
    const slideCount = Math.ceil(wordCount / 300) + Math.ceil(pages / 1.5);
    return Math.max(10, Math.min(30, slideCount));
};

// ============================================
// Step 1: Read & Understand
// ============================================

/**
 * Deep reading and understanding using flash-lite (1M tokens)
 */
const readAndUnderstand = async (
    text: string,
    onChunk?: ChunkCallback,
    language: 'en' | 'ar' = 'en'
): Promise<BookSummary> => {
    const { callPresentationModel, MODELS } = await import('./geminiService');

    const languageInstruction = language === 'ar' 
        ? `الرجاء تقديم التحليل بالعربية الفصحى. استخدم لغة احترافية وواضحة.`
        : `Provide analysis in professional English.`;

    const prompt = `CRITICAL INSTRUCTION: You are an EXPERT document analyst. Your ONLY job is to READ and UNDERSTAND the ENTIRE document provided, then extract REAL content from it.

${languageInstruction}

DOCUMENT TO ANALYZE (${text.length} characters, ${Math.ceil(text.length / 1000)} pages):
===========================================
${text.substring(0, 1500000)}
===========================================

MANDATORY ANALYSIS PROCESS:
1. READ THE ENTIRE DOCUMENT CAREFULLY - Do not skip any section
2. UNDERSTAND the core message, structure, and key concepts
3. IDENTIFY all major sections, topics, and subtopics
4. EXTRACT specific examples, data, and insights from the document
5. CREATE detailed summaries that reflect the actual content
6. RATE importance based on how much the document emphasizes each topic

FOR EACH SECTION/CHAPTER:
- Title: Use the actual section title or create one that reflects the content
- Summary: Write 2-3 sentences that capture the REAL content of this section
- Key Points: Extract 5-7 SPECIFIC points directly from the document content
  * Include actual examples, numbers, or concepts mentioned
  * Do NOT use generic placeholder text
  * Each point must be meaningful and unique to this section
- Importance: Rate 1-10 based on how much space/emphasis the document gives it

OVERALL DOCUMENT ANALYSIS:
- Main Theme: What is the document ACTUALLY about?
- Key Takeaways: What are the 5-7 most important messages?
- Target Audience: Who is this document written for?

ABSOLUTE REQUIREMENTS:
✓ Extract REAL content from the document - NO generic text
✓ Each point must be SPECIFIC and DETAILED
✓ Include actual examples, data, or concepts from the document
✓ Summaries must reflect the actual content
✓ Do NOT invent or assume content
✓ If something is not in the document, do NOT include it
✓ Provide comprehensive analysis of ALL content

Return ONLY valid JSON (no markdown, no code blocks, no explanations):
{
  "mainTheme": "The actual main topic of this document",
  "chapters": [
    {
      "title": "Actual section title from document",
      "summary": "2-3 sentences describing what this section actually contains",
      "keyPoints": [
        "Specific point 1 with actual content from document",
        "Specific point 2 with actual content from document",
        "Specific point 3 with actual content from document",
        "Specific point 4 with actual content from document",
        "Specific point 5 with actual content from document"
      ],
      "importance": 8
    }
  ],
  "keyPoints": [
    "Most important message from the document",
    "Second most important message",
    "Third most important message",
    "Fourth most important message",
    "Fifth most important message"
  ],
  "targetAudience": "Who this document is written for and why"
}`;

    // Schema for structured output
    const schema = {
        type: 'object',
        properties: {
            mainTheme: { type: 'string' },
            chapters: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        summary: { type: 'string' },
                        keyPoints: { type: 'array', items: { type: 'string' } },
                        importance: { type: 'number' }
                    },
                    required: ['title', 'summary', 'keyPoints', 'importance']
                }
            },
            keyPoints: { type: 'array', items: { type: 'string' } },
            targetAudience: { type: 'string' }
        },
        required: ['mainTheme', 'chapters', 'keyPoints', 'targetAudience']
    };

    try {
        const result = await callPresentationModel(MODELS.FLASH_LITE, prompt, schema);
        return result as BookSummary;
    } catch (error: any) {
        console.error('Read and understand error:', error);
        // Fallback to basic structure with more meaningful content
        return {
            mainTheme: 'Document Overview',
            chapters: [
                {
                    title: 'Introduction',
                    summary: 'Overview of the document content',
                    keyPoints: ['Document structure', 'Main topics covered'],
                    importance: 8
                },
                {
                    title: 'Core Content',
                    summary: 'Primary information and concepts',
                    keyPoints: ['Key concepts', 'Important details'],
                    importance: 9
                },
                {
                    title: 'Summary',
                    summary: 'Concluding remarks and takeaways',
                    keyPoints: ['Main conclusions', 'Practical applications'],
                    importance: 7
                }
            ],
            keyPoints: ['Document analysis', 'Content structure', 'Key takeaways'],
            targetAudience: 'General audience'
        };
    }
};

// ============================================
// Step 2: Analyze Content
// ============================================

/**
 * Content analysis using flash-live
 */
const analyzeContent = async (
    summary: BookSummary,
    onChunk?: ChunkCallback
): Promise<ChapterSummary[]> => {
    const { callPresentationModel, MODELS } = await import('./geminiService');

    const prompt = `You are a presentation strategist. Analyze and refine this document analysis for optimal presentation structure.

DOCUMENT ANALYSIS:
${JSON.stringify(summary, null, 2)}

REFINEMENT TASK:
For each chapter/section, perform these steps:
1. Create a clear, presentation-friendly title (5-8 words max)
2. Identify and extract the 3-5 MOST IMPORTANT points (not generic, but specific to this section)
3. Rate importance on 1-10 scale based on:
   - Impact on overall message
   - Relevance to audience
   - Actionability
4. Ensure each point is distinct and non-overlapping

CRITICAL REQUIREMENTS:
- Do NOT use generic or placeholder text
- Each point must be specific to the actual content
- Points should be presentation-ready (concise, impactful)
- Importance ratings should be realistic and justified
- Maintain the original meaning and context

Return ONLY valid JSON array (no markdown):
[
  {
    "title": "Refined section title",
    "summary": "Original summary",
    "keyPoints": ["Specific, actionable point 1", "Specific, actionable point 2", "Specific, actionable point 3"],
    "importance": 8
  }
]`;

    const schema = {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                summary: { type: 'string' },
                keyPoints: { type: 'array', items: { type: 'string' } },
                importance: { type: 'number' }
            },
            required: ['title', 'summary', 'keyPoints', 'importance']
        }
    };

    try {
        const result = await callPresentationModel(MODELS.FLASH_LIVE, prompt, schema);
        return result as ChapterSummary[];
    } catch (error) {
        console.error('Analyze content error:', error);
        return summary.chapters; // Fallback to original
    }
};

// ============================================
// Step 3: Plan Slides
// ============================================

/**
 * Slide planning using flash-live
 */
const planSlides = async (
    breakdown: ChapterSummary[],
    options: PresentationOptions,
    onChunk?: ChunkCallback
): Promise<SlideStructure[]> => {
    const { callPresentationModel, MODELS } = await import('./geminiService');
    const maxSlides = options.maxSlides || 15;
    const language = options.language || 'en';

    const languageInstruction = language === 'ar'
        ? `الرجاء إنشاء العرض التقديمي بالعربية الفصحى. استخدم لغة احترافية وجذابة.`
        : `Create the presentation in professional English.`;

    const prompt = `You are a world-class presentation strategist and designer. Your task is to create a compelling, impactful presentation structure.

${languageInstruction}

CONTENT BREAKDOWN (${breakdown.length} sections):
${JSON.stringify(breakdown, null, 2)}

PRESENTATION DESIGN REQUIREMENTS:
Create exactly ${maxSlides} slides with this strategic structure:

1. **Title Slide** (1 slide)
   - Compelling main title from the document's core topic
   - Engaging subtitle that captures the value proposition
   - Professional opening remarks

2. **Overview/Agenda** (1 slide)
   - List all major sections to be covered
   - Show the logical flow and structure
   - Build anticipation for key content

3. **Content Slides** (${maxSlides - 4} slides)
   - Distribute based on importance:
     * High importance (8-10): 2-3 slides each with detailed content
     * Medium importance (5-7): 1-2 slides each
     * Lower importance: combine or skip
   - Each slide must have:
     * Specific, detailed content from the breakdown (NOT generic)
     * 3-5 key points per slide (detailed, not just bullets)
     * Actionable insights and practical implications
     * Relevant speaker notes with talking points

4. **Key Takeaways** (1 slide)
   - Synthesize the most important conclusions
   - Show business impact and implications
   - Include actionable next steps

5. **Conclusion** (1 slide)
   - Powerful closing statement
   - Call to action
   - Contact/follow-up information

CRITICAL CONTENT REQUIREMENTS:
- Extract REAL, SPECIFIC content from the breakdown
- NO generic or placeholder text
- Each point must be detailed and meaningful
- Titles must be engaging and specific
- Content must flow logically and tell a story
- Include comprehensive speaker notes
- Suggest relevant visual elements

Return ONLY valid JSON array (no markdown, no code blocks):
[
  {
    "type": "title",
    "title": "Compelling main title",
    "content": ["Engaging subtitle", "Key value proposition"],
    "notes": "Strong opening remarks"
  },
  {
    "type": "content",
    "title": "Specific, engaging section title",
    "content": ["Detailed point 1 with context", "Detailed point 2 with implications", "Detailed point 3 with examples"],
    "imageQuery": "relevant visual concept",
    "notes": "Comprehensive talking points and transitions"
  },
  {
    "type": "conclusion",
    "title": "Key Takeaways & Next Steps",
    "content": ["Main conclusion with impact", "Business implication", "Recommended action"],
    "notes": "Powerful closing and call to action"
  }
]`;

    const schema = {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['title', 'content', 'image', 'conclusion'] },
                title: { type: 'string' },
                content: { type: 'array', items: { type: 'string' } },
                imageQuery: { type: 'string' },
                notes: { type: 'string' }
            },
            required: ['type', 'title']
        }
    };

    try {
        const result = await callPresentationModel(MODELS.FLASH_LIVE, prompt, schema);
        return result as SlideStructure[];
    } catch (error) {
        console.error('Plan slides error:', error);
        // Fallback to structured slides based on breakdown
        const slides: SlideStructure[] = [
            {
                type: 'title',
                title: breakdown[0]?.title || 'Presentation',
                content: ['Professional Overview', 'Generated Presentation']
            }
        ];

        // Add overview slide
        slides.push({
            type: 'content',
            title: 'Overview',
            content: [
                `Total sections: ${breakdown.length}`,
                'Key topics covered',
                'Comprehensive analysis'
            ],
            imageQuery: 'overview presentation'
        });

        // Add content slides from breakdown (prioritize by importance)
        const sortedBreakdown = [...breakdown].sort((a, b) => b.importance - a.importance);
        for (let i = 0; i < Math.min(maxSlides - 3, sortedBreakdown.length); i++) {
            const ch = sortedBreakdown[i];
            slides.push({
                type: 'content',
                title: ch.title,
                content: ch.keyPoints.slice(0, 4), // Limit to 4 points per slide
                imageQuery: ch.title,
                notes: ch.summary
            });
        }

        // Add conclusion
        slides.push({
            type: 'conclusion',
            title: 'Key Takeaways',
            content: breakdown.slice(0, 3).map(ch => `${ch.title}: ${ch.keyPoints[0] || 'Key point'}`),
            notes: 'Summary of main points'
        });

        return slides;
    }
};

// ============================================
// Step 4: Generate Slide Content
// ============================================

/**
 * Professional content generation using 2.5-pro
 */
const generateSlideContent = async (
    structure: SlideStructure[],
    onChunk?: ChunkCallback
): Promise<Slide[]> => {
    const { streamPresentationContent, MODELS } = await import('./geminiService');

    const prompt = `You are a WORLD-CLASS presentation designer, content strategist, and visual communicator. Your task is to transform these slides into STUNNING, PROFESSIONAL, IMPACTFUL presentations.

SLIDE STRUCTURE TO ENHANCE:
${JSON.stringify(structure, null, 2)}

CONTENT ENHANCEMENT REQUIREMENTS:

1. **TITLES** - Make them POWERFUL and ENGAGING:
   - Use strong action verbs and compelling language
   - Make titles specific and memorable
   - Create curiosity and interest
   - Keep them concise but impactful (5-10 words max)

2. **CONTENT POINTS** - Make them DETAILED and IMPRESSIVE:
   - Each point should be 15-20 words (detailed, not just bullets)
   - Include specific examples, numbers, or data when possible
   - Make points actionable and meaningful
   - Use parallel structure for consistency
   - Order points logically (most important first)
   - Add context and implications

3. **SPEAKER NOTES** - Make them COMPREHENSIVE:
   - Detailed talking points for each slide
   - Smooth transitions between slides
   - Audience engagement strategies
   - Key statistics or examples to mention
   - Suggested pauses for emphasis
   - Questions to engage the audience

4. **VISUAL ELEMENTS**:
   - Suggest specific, relevant images that enhance the message
   - Recommend visual metaphors or concepts
   - Suggest colors or design elements that fit the content

5. **OVERALL PRESENTATION QUALITY**:
   - Ensure professional, polished language throughout
   - Maintain consistent tone and style
   - Create a compelling narrative flow
   - Build momentum and engagement
   - End with powerful conclusions
   - Make it memorable and impactful

QUALITY STANDARDS:
✓ Professional business language throughout
✓ Specific, detailed content (NOT generic)
✓ Visually interesting and engaging
✓ Logically structured and flowing
✓ Audience-focused and relevant
✓ Impactful and memorable
✓ Ready for executive presentation

Return ONLY valid JSON array (no markdown, no code blocks):
[
  {
    "type": "title|content|conclusion",
    "title": "Powerful, engaging title",
    "content": [
      "Detailed, specific point 1 with context",
      "Detailed, specific point 2 with implications",
      "Detailed, specific point 3 with examples"
    ],
    "imageQuery": "specific visual concept",
    "notes": "Comprehensive speaker notes with talking points and transitions",
    "index": 1
  }
]`;

    try {
        let responseText = '';
        if (onChunk) {
            // Stream for real-time feedback
            responseText = await streamPresentationContent(MODELS.PRO, prompt, onChunk);
        } else {
            const { callPresentationModel } = await import('./geminiService');
            responseText = await callPresentationModel(MODELS.PRO, prompt);
        }

        // Parse response - handle markdown code blocks
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.substring(7, jsonText.length - 3).trim();
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.substring(3, jsonText.length - 3).trim();
        }

        const refined = JSON.parse(jsonText) as SlideStructure[];

        // Validate and ensure all slides have content
        const validSlides = refined.filter(slide => slide.title && slide.type);
        
        if (validSlides.length === 0) {
            throw new Error('No valid slides in response');
        }

        // Map to slides with index
        return validSlides.map((slide, index) => ({
            ...slide,
            content: slide.content || [],
            index: index + 1
        }));

    } catch (error) {
        console.error('Generate slide content error:', error);
        // Fallback: enhance existing structure with better content
        return structure.map((slide, index) => ({
            ...slide,
            content: slide.content && slide.content.length > 0 
                ? slide.content 
                : [slide.title, 'Key information'],
            index: index + 1
        }));
    }
};

// ============================================
// Step 5: Add Images
// ============================================

/**
 * Add images to slides
 */
const addImages = async (
    slides: Slide[],
    source: 'unsplash' | 'imagen' = 'unsplash'
): Promise<void> => {
    // TODO: Implement image search/generation
    // For now, placeholder

    for (const slide of slides) {
        if (slide.imageQuery) {
            if (source === 'unsplash') {
                // Search Unsplash
                slide.imageUrl = await searchUnsplashImage(slide.imageQuery);
            } else {
                // Generate with Imagen
                slide.imageUrl = await generateImage(slide.imageQuery);
            }
        }
    }
};

const searchUnsplashImage = async (query: string): Promise<string | undefined> => {
    // TODO: Implement Unsplash API
    return undefined;
};

const generateImage = async (prompt: string): Promise<string | undefined> => {
    // TODO: Implement Imagen generation
    return undefined;
};

// ============================================
// Step 6: Build PPTX
// ============================================

/**
 * Build PowerPoint file using pptxgenjs
 */
const buildPPTX = async (slides: Slide[], title: string): Promise<Blob> => {
    try {
        // Robust import for both ESM and CJS
        const module = await import('pptxgenjs');
        const PptxGenJS = module.default || module;

        // @ts-ignore - Handle potential type mismatch
        const pptx = new PptxGenJS();

        // Set presentation properties
        pptx.layout = 'LAYOUT_16x9';
        pptx.author = 'Lukas AI';
        pptx.title = title;

        // Add slides
        for (const slide of slides) {
            const pptxSlide = pptx.addSlide();

            if (slide.type === 'title') {
                // Title slide
                pptxSlide.addText(slide.title, {
                    x: 1,
                    y: 2.5,
                    w: 8,
                    h: 1,
                    fontSize: 44,
                    bold: true,
                    align: 'center',
                    color: '363636'
                });

                if (slide.content && slide.content.length > 0) {
                    pptxSlide.addText(slide.content[0], {
                        x: 1,
                        y: 4,
                        w: 8,
                        h: 0.5,
                        fontSize: 24,
                        align: 'center',
                        color: '666666'
                    });
                }

            } else if (slide.type === 'content' || slide.type === 'conclusion') {
                // Content slide
                pptxSlide.addText(slide.title, {
                    x: 0.5,
                    y: 0.5,
                    w: 9,
                    h: 0.75,
                    fontSize: 32,
                    bold: true,
                    color: '1F4788'
                });

                // Add decorative line under title
                pptxSlide.addShape(pptx.ShapeType.rect, {
                    x: 0.5,
                    y: 1.2,
                    w: 2,
                    h: 0.05,
                    fill: { color: '4472C4' },
                    line: { type: 'none' }
                });

                if (slide.content && slide.content.length > 0) {
                    // Convert string array to bullet points with enhanced formatting
                    const bulletText = slide.content.map((item, idx) => ({
                        text: item || `Point ${idx + 1}`,
                        options: { 
                            bullet: true,
                            level: 0,
                            fontSize: 16,
                            lineSpacing: 28
                        }
                    }));
                    pptxSlide.addText(bulletText, {
                        x: 0.5,
                        y: 1.5,
                        w: slide.imageUrl ? 5.5 : 9,
                        h: 4.5,
                        fontSize: 16,
                        color: '333333',
                        valign: 'top',
                        lineSpacing: 28
                    });
                } else {
                    // Add placeholder if no content
                    pptxSlide.addText('Content to be added', {
                        x: 0.5,
                        y: 1.5,
                        w: 9,
                        h: 4.5,
                        fontSize: 16,
                        color: '999999',
                        italic: true,
                        valign: 'top'
                    });
                }

                // Add image if available
                if (slide.imageUrl) {
                    try {
                        pptxSlide.addImage({
                            path: slide.imageUrl,
                            x: 6.2,
                            y: 1.5,
                            w: 3,
                            h: 3,
                            rasterize: true
                        });
                    } catch (imgError) {
                        console.warn('Failed to add image to slide:', imgError);
                    }
                }

                // Add speaker notes if available
                if (slide.notes) {
                    pptxSlide.addNotes(slide.notes);
                }
            }
        }

        // Generate blob using arraybuffer for better compatibility
        const data = await pptx.write({ outputType: 'arraybuffer' });
        const blob = new Blob([data as ArrayBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        });

        console.log(`PPTX Generated. Size: ${blob.size} bytes`);

        if (blob.size === 0) {
            throw new Error('Generated PPTX file is empty');
        }

        return blob;

    } catch (error: any) {
        console.error('PPTX generation error:', error);
        throw new Error(`Failed to build PPTX: ${error.message}`);
    }
};
