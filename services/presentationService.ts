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
 * Generate presentation from PDF
 */
export const generatePresentation = async (
    parsedPDF: ParsedPDF,
    options: PresentationOptions = {},
    onProgress?: ProgressCallback,
    onChunk?: ChunkCallback
): Promise<Presentation> => {
    const startTime = Date.now();

    try {
        // Step 1: Deep Reading & Understanding (30%)
        onProgress?.('Reading and understanding content...', 0);
        const summary = await readAndUnderstand(parsedPDF.text, onChunk);
        onProgress?.('Reading and understanding content...', 30);

        // Step 2: Content Analysis (50%)
        onProgress?.('Analyzing content structure...', 30);
        const breakdown = await analyzeContent(summary, onChunk);
        onProgress?.('Analyzing content structure...', 50);

        // Step 3: Slide Planning (65%)
        onProgress?.('Planning slide structure...', 50);
        const slideStructure = await planSlides(breakdown, options, onChunk);
        onProgress?.('Planning slide structure...', 65);

        // Step 4: Content Generation (80%)
        onProgress?.('Generating professional content...', 65);
        const slides = await generateSlideContent(slideStructure, onChunk);
        onProgress?.('Generating professional content...', 80);

        // Step 5: Add Images (90%)
        if (options.includeImages !== false) {
            onProgress?.('Adding images...', 80);
            await addImages(slides, options.imageSource || 'unsplash');
            onProgress?.('Adding images...', 90);
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

    const prompt = `You are analyzing a book/document for presentation creation.

Content:
${text.substring(0, 1000000)}

Please provide a comprehensive analysis:
1. Main theme/topic
2. Chapter breakdown (if applicable)
3. Key points and takeaways
4. Target audience

Return as JSON with this structure:
{
  "mainTheme": "...",
  "chapters": [
    {
      "title": "...",
      "summary": "...",
      "keyPoints": ["...", "..."],
      "importance": 8
    }
  ],
  "keyPoints": ["...", "..."],
  "targetAudience": "..."
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

    const prompt = `Analyze this book summary for presentation planning:

${JSON.stringify(summary, null, 2)}

For each chapter/section:
1. Refine the title
2. Extract 3-5 most important points
3. Rate importance (1-10)
4. Suggest visual elements

Return as JSON array of chapters with the same structure.`;

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

    const prompt = `Create a presentation outline from this content:

${JSON.stringify(breakdown, null, 2)}

Create ${maxSlides} slides with this structure:
1. Title slide
2. Overview/Agenda (1 slide)
3. Content slides (1-2 per chapter, prioritize by importance)
4. Key takeaways (1 slide)
5. Conclusion (1 slide)

Return as JSON array:
[
  {
    "type": "title",
    "title": "...",
    "content": ["subtitle", "author"],
    "notes": "Opening remarks"
  },
  {
    "type": "content",
    "title": "...",
    "content": ["point 1", "point 2", "point 3"],
    "imageQuery": "search term for image",
    "notes": "Talking points"
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

    const prompt = `You are a professional presentation designer. Write compelling content for these slides:

${JSON.stringify(structure, null, 2)}

Guidelines:
- Clear, concise bullet points
- Professional business language
- Actionable insights
- Engaging titles
- Helpful speaker notes

Refine and polish each slide's content to professional standards.
Return the SAME JSON structure but with improved content.`;

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
