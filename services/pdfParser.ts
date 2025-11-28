/**
 * PDF Parser Service
 * Extracts text and metadata from PDF files
 */
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export interface ParsedPDF {
    text: string;
    pages: number;
    title?: string;
    author?: string;
}

export interface PDFValidationResult {
    valid: boolean;
    error?: string;
}

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Validate PDF file
 */
export const validatePDF = (file: File): PDFValidationResult => {
    // Check file type
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
        return {
            valid: false,
            error: 'File must be a PDF'
        };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
        };
    }

    // Check if file is empty
    if (file.size === 0) {
        return {
            valid: false,
            error: 'File is empty'
        };
    }

    return { valid: true };
};

/**
 * Parse PDF file and extract text
 * NOTE: This requires pdfjs-dist to be installed
 * Run: npm install pdfjs-dist
 */
export const parsePDF = async (file: File): Promise<ParsedPDF> => {
    // Validation
    const validation = validatePDF(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    try {
        // Dynamic import to avoid bundling issues
        const pdfjsLib = await import('pdfjs-dist');

        // Set worker path
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // Extract metadata
        const metadata = await pdf.getMetadata();
        const title = metadata?.info?.Title || file.name.replace('.pdf', '');
        const author = metadata?.info?.Author;

        // Extract text from all pages
        let fullText = '';
        const numPages = pdf.numPages;

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Combine text items
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += pageText + '\n\n';
        }

        return {
            text: fullText.trim(),
            pages: numPages,
            title,
            author
        };

    } catch (error: any) {
        console.error('PDF parsing error:', error);
        throw new Error(`Failed to parse PDF: ${error.message}`);
    }
};

/**
 * Extract text from specific pages
 */
export const parsePDFPages = async (
    file: File,
    startPage: number,
    endPage: number
): Promise<string> => {
    const validation = validatePDF(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // Validate page range
        if (startPage < 1 || endPage > pdf.numPages || startPage > endPage) {
            throw new Error('Invalid page range');
        }

        let text = '';
        for (let i = startPage; i <= endPage; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            text += pageText + '\n\n';
        }

        return text.trim();

    } catch (error: any) {
        throw new Error(`Failed to parse pages: ${error.message}`);
    }
};
