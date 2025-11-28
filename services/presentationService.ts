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
        const summary = await readAndUnderstand(parsedPDF.text, onChunk);
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
    // Formula: 1 slide per 500 words + 1 per page, capped between 8-25
    const wordCount = text.split(/\s+/).length;
    const slideCount = Math.ceil(wordCount / 500) + Math.ceil(pages / 2);
    return Math.max(8, Math.min(25, slideCount));
};

// ============================================
// Step 1: Read & Understand
// ============================================

/**
 * Deep reading and understanding using flash-lite (1M tokens)
 */
const readAndUnderstand = async (
    text: string,
    onChunk?: ChunkCallback
): Promise<BookSummary> => {
    const { callPresentationModel, MODELS } = await import('./geminiService');

    const prompt = `You are an expert document analyst. Your task is to deeply understand and analyze the complete document provided.

DOCUMENT CONTENT:
${text.substring(0, 1000000)}

ANALYSIS INSTRUCTIONS:
1. Understand the ENTIRE document structure, themes, and key concepts
2. Identify the main topic and its context
3. Extract logical sections/chapters (even if not explicitly labeled)
4. For each section, identify:
   - Clear, descriptive title
   - Comprehensive summary (2-3 sentences)
   - 3-5 most important key points
   - Importance rating (1-10 scale)
5. Identify overall key takeaways
6. Determine the target audience

IMPORTANT:
- Be thorough and extract REAL content from the document
- Do NOT use placeholder text
- Each key point should be specific and meaningful
- Importance should reflect actual significance in the document
- Summaries should capture the essence of each section

Return ONLY valid JSON (no markdown, no extra text):
{
  "mainTheme": "Clear, specific main topic of the document",
  "chapters": [
    {
      "title": "Section title",
      "summary": "2-3 sentence summary of this section",
      "keyPoints": ["Specific point 1", "Specific point 2", "Specific point 3"],
      "importance": 8
    }
  ],
  "keyPoints": ["Overall key takeaway 1", "Overall key takeaway 2", "Overall key takeaway 3"],
  "targetAudience": "Specific audience description"
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

    const prompt = `You are a master presentation designer. Create an optimal presentation structure from this content analysis.

CONTENT BREAKDOWN:
${JSON.stringify(breakdown, null, 2)}

PRESENTATION DESIGN TASK:
Create exactly ${maxSlides} slides with this structure:
1. Title slide (1 slide) - Main topic and subtitle
2. Overview/Agenda (1 slide) - Key sections to be covered
3. Content slides (${maxSlides - 4} slides) - Distribute chapters by importance:
   - High importance (8-10): 2 slides each
   - Medium importance (5-7): 1 slide each
   - Lower importance: combine or skip
4. Key takeaways (1 slide) - Main conclusions
5. Conclusion (1 slide) - Call to action or closing remarks

SLIDE CONTENT REQUIREMENTS:
- Each slide must have specific, non-generic content from the breakdown
- Content points should be actionable and meaningful
- Titles should be clear and engaging
- Include speaker notes for presenter guidance
- Suggest relevant image search terms

Return ONLY valid JSON array (no markdown, no extra text):
[
  {
    "type": "title",
    "title": "Main presentation title",
    "content": ["Subtitle or key message", "Optional: Author/Date"],
    "notes": "Opening remarks"
  },
  {
    "type": "content",
    "title": "Section title",
    "content": ["Specific point 1 from content", "Specific point 2 from content", "Specific point 3 from content"],
    "imageQuery": "relevant search term",
    "notes": "Presenter talking points"
  },
  {
    "type": "conclusion",
    "title": "Key Takeaways",
    "content": ["Main conclusion 1", "Main conclusion 2", "Main conclusion 3"],
    "notes": "Summary and next steps"
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

    const prompt = `You are a world-class presentation designer and content strategist. Your task is to refine and enhance each slide's content to be professional, impactful, and presentation-ready.

SLIDE STRUCTURE TO REFINE:
${JSON.stringify(structure, null, 2)}

CONTENT REFINEMENT GUIDELINES:
1. For each slide:
   - Enhance the title to be more engaging and specific
   - Refine bullet points to be:
     * Clear and concise (max 10 words per point)
     * Specific and actionable (not generic)
     * Logically ordered
     * Professional in tone
   - Improve speaker notes with:
     * Key talking points
     * Transition suggestions
     * Audience engagement tips

2. Quality Standards:
   - Use professional business language
   - Ensure consistency across all slides
   - Make content presentation-ready
   - Maintain the original meaning and intent
   - Avoid placeholder or generic text

3. Structure Requirements:
   - Keep the same slide types and order
   - Maintain the same number of slides
   - Preserve all metadata (imageQuery, notes)

Return ONLY valid JSON array (no markdown, no extra text):
[
  {
    "type": "title|content|conclusion",
    "title": "Refined, engaging title",
    "content": ["Refined point 1", "Refined point 2", "Refined point 3"],
    "imageQuery": "relevant search term",
    "notes": "Enhanced speaker notes",
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
                    // Convert string array to bullet points with better formatting
                    const bulletText = slide.content.map((item, idx) => ({
                        text: item || `Point ${idx + 1}`,
                        options: { 
                            bullet: true,
                            level: 0
                        }
                    }));
                    pptxSlide.addText(bulletText, {
                        x: 0.5,
                        y: 1.5,
                        w: slide.imageUrl ? 5.5 : 9,
                        h: 4.5,
                        fontSize: 18,
                        color: '444444',
                        valign: 'top'
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
