import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";
import type { Session, Note, Image } from "@/domain/entities";
import { getLevel } from "@/lib/scoring";
import { getImageUrl } from "@/lib/db";

/**
 * Get theme colors from CSS variables
 */
function getThemeColors(): { accent: string; accentRGB: [number, number, number] } {
  if (typeof window === "undefined") {
    // Default cyan theme
    return { accent: "#00F5FF", accentRGB: [0, 245, 255] };
  }

  const root = document.documentElement;
  const accent = getComputedStyle(root).getPropertyValue("--accent").trim() || "#00F5FF";
  const accentRGBStr = getComputedStyle(root).getPropertyValue("--accent-rgb").trim() || "0, 245, 255";
  const accentRGB = accentRGBStr.split(",").map((v) => parseInt(v.trim(), 10)) as [number, number, number];

  return { accent, accentRGB };
}

/**
 * Helper to clean text (remove emojis but keep special chars like ≤, ≥)
 * pdf-lib has better UTF-8 support, but we still remove emojis for consistency
 */
function cleanText(text: string): string {
  // Remove emojis (they don't render well in PDF)
  // Keep special characters like ≤, ≥, etc. - pdf-lib handles them better
  let cleaned = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  
  // Remove control characters that can cause issues
  cleaned = cleaned
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
    .trim();
  
  return cleaned;
}

/**
 * Parse HTML and extract structured content (text, headings, images, lists)
 */
interface ParsedElement {
  type: "text" | "heading" | "list" | "image" | "table" | "linebreak";
  content?: string;
  level?: number; // for headings (1-6)
  items?: string[]; // for lists
  imageUrl?: string; // for images
  rows?: string[][]; // for tables
  tag?: string; // original tag name
}

function parseHTML(html: string): ParsedElement[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;
  const elements: ParsedElement[] = [];

  function processNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = cleanText(node.textContent || "");
      if (text) {
        elements.push({ type: "text", content: text });
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      // Headings
      if (tagName.match(/^h[1-6]$/)) {
        const level = parseInt(tagName[1]);
        const text = cleanText(element.textContent || "");
        if (text) {
          elements.push({ type: "heading", content: text, level, tag: tagName });
        }
        return;
      }

      // Images
      if (tagName === "img") {
        const src = element.getAttribute("src");
        const dataImageId = element.getAttribute("data-image-id");
        if (src || dataImageId) {
          elements.push({ type: "image", imageUrl: src || undefined, tag: tagName });
        }
        return;
      }

      // Line breaks
      if (tagName === "br") {
        elements.push({ type: "linebreak" });
        return;
      }

      // Lists
      if (tagName === "ul" || tagName === "ol") {
        const items: string[] = [];
        const listItems = element.querySelectorAll("li");
        listItems.forEach((li) => {
          const text = cleanText(li.textContent || "");
          if (text) {
            items.push(text);
          }
        });
        if (items.length > 0) {
          elements.push({ type: "list", items, tag: tagName });
        }
        return;
      }

      // Tables
      if (tagName === "table") {
        const rows: string[][] = [];
        const tableRows = element.querySelectorAll("tr");
        tableRows.forEach((tr) => {
          const row: string[] = [];
          const cells = tr.querySelectorAll("th, td");
          cells.forEach((cell) => {
            const text = cleanText(cell.textContent || "");
            row.push(text);
          });
          if (row.length > 0) {
            rows.push(row);
          }
        });
        if (rows.length > 0) {
          elements.push({ type: "table", rows, tag: tagName });
        }
        return;
      }

      // Paragraphs and divs - process children
      if (tagName === "p" || tagName === "div") {
        // Process children first
        Array.from(element.childNodes).forEach(processNode);
        // Add spacing after paragraphs
        if (tagName === "p") {
          elements.push({ type: "linebreak" });
        }
        return;
      }

      // Inline elements - just process children
      Array.from(element.childNodes).forEach(processNode);
    }
  }

  Array.from(body.childNodes).forEach(processNode);
  return elements;
}

/**
 * Load image and convert to bytes for pdf-lib
 */
async function loadImageBytes(url: string): Promise<Uint8Array | undefined> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.warn("[PDF Export] Failed to load image:", url, error);
    return undefined;
  }
}

/**
 * Normalize special characters to ASCII for width calculation
 * pdf-lib standard fonts use WinAnsi encoding which doesn't support all Unicode
 */
function normalizeForWidthCalculation(text: string): string {
  return text
    // Convert mathematical symbols to ASCII equivalents
    .replace(/\u2264/g, "<=") // ≤
    .replace(/\u2265/g, ">=") // ≥
    .replace(/\u2260/g, "!=") // ≠
    .replace(/\u2248/g, "≈") // ≈ (keep this one)
    .replace(/\u00B1/g, "+/-") // ±
    // Convert arrows
    .replace(/\u2192/g, "->") // →
    .replace(/\u2190/g, "<-") // ←
    .replace(/\u2191/g, "^") // ↑
    .replace(/\u2193/g, "v") // ↓
    // Normalize quotes
    .replace(/[\u2018\u2019]/g, "'") // Smart quotes
    .replace(/[\u201C\u201D]/g, '"') // Smart quotes
    // Normalize dashes
    .replace(/\u2013/g, "-") // En dash
    .replace(/\u2014/g, "--") // Em dash
    // Remove zero-width spaces
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

/**
 * Split text into lines that fit within a given width
 * Handles Unicode characters that can't be measured directly
 */
function splitTextIntoLines(
  text: string,
  maxWidth: number,
  fontSize: number,
  font: PDFFont
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    // Normalize for width calculation (to handle Unicode)
    const normalizedTestLine = normalizeForWidthCalculation(testLine);
    let width: number;
    
    try {
      width = font.widthOfTextAtSize(normalizedTestLine, fontSize);
    } catch (error) {
      // If measurement fails, estimate width based on character count
      // Average character width is roughly 0.6 * fontSize for Helvetica
      width = normalizedTestLine.length * fontSize * 0.6;
    }

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}

/**
 * Export a session to PDF using pdf-lib
 */
export async function exportSessionToPDF(
  session: Session,
  note: Note | null,
  images: Image[]
): Promise<void> {
  console.log('%c[AURA-NX0 PDF Export]', 'color: #00F5FF; font-weight: bold; font-size: 14px;', 
    'PDF Export v5.0 (pdf-lib) - Starting export for:', session.title);
  
  const { accentRGB } = getThemeColors();
  
  // Create PDF document (A4 size in points)
  const doc = await PDFDocument.create();
  
  // Embed standard fonts
  const helveticaFont = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  
  // A4 dimensions in points: 595.28 x 841.89
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 43; // ~15mm in points
  const contentWidth = pageWidth - 2 * margin;
  
  // Create first page
  let page = doc.addPage([pageWidth, pageHeight]);
  let yPos = pageHeight - margin; // pdf-lib uses bottom-left origin, we work from top
  
  // Colors - all text in black/gray for clean PDF export
  const blackColor = rgb(0, 0, 0); // Pure black for titles and headings
  const grayColor = rgb(0.235, 0.235, 0.235); // ~60, 60, 60 for body text
  const lightGrayColor = rgb(0.471, 0.471, 0.471); // ~120, 120, 120 for metadata
  const footerGrayColor = rgb(0.588, 0.588, 0.588); // ~150, 150, 150 for footer
  const accentColor = rgb(accentRGB[0] / 255, accentRGB[1] / 255, accentRGB[2] / 255); // Keep for divider line only
  
  // Helper to check if we need a new page
  function ensurePageSpace(requiredHeight: number): void {
    const footerHeight = 20;
    if (yPos - requiredHeight < margin + footerHeight) {
      page = doc.addPage([pageWidth, pageHeight]);
      yPos = pageHeight - margin;
    }
  }
  
  // Helper to get line height
  function getLineHeight(fontSize: number): number {
    return fontSize * 1.5;
  }
  
  // Helper to normalize text for rendering (convert special chars to safe ASCII)
  function normalizeForRendering(text: string): string {
    return text
      // Convert mathematical symbols to ASCII equivalents (pdf-lib standard fonts don't support them)
      .replace(/\u2264/g, "<=") // ≤
      .replace(/\u2265/g, ">=") // ≥
      .replace(/\u2260/g, "!=") // ≠
      .replace(/\u00B1/g, "+/-") // ±
      // Convert arrows
      .replace(/\u2192/g, "->") // →
      .replace(/\u2190/g, "<-") // ←
      .replace(/\u2191/g, "^") // ↑
      .replace(/\u2193/g, "v") // ↓
      // Normalize quotes
      .replace(/[\u2018\u2019]/g, "'") // Smart quotes
      .replace(/[\u201C\u201D]/g, '"') // Smart quotes
      // Normalize dashes
      .replace(/\u2013/g, "-") // En dash
      .replace(/\u2014/g, "--") // Em dash
      // Remove zero-width spaces
      .replace(/[\u200B-\u200D\uFEFF]/g, '');
  }

  // Helper to add text with wrapping
  async function addText(
    text: string,
    fontSize: number,
    isBold = false,
    color = grayColor
  ): Promise<number> {
    if (!text.trim()) {
      return 0;
    }
    
    const font = isBold ? helveticaBoldFont : helveticaFont;
    // Normalize text before wrapping and rendering (to handle Unicode)
    const normalizedText = normalizeForRendering(text);
    const lines = splitTextIntoLines(normalizedText, contentWidth, fontSize, font);
    const lineHeight = getLineHeight(fontSize);
    const totalHeight = lines.length * lineHeight;
    
    ensurePageSpace(totalHeight);
    
    lines.forEach((line: string) => {
      try {
        page.drawText(line, {
          x: margin,
          y: yPos,
          size: fontSize,
          font: font,
          color: color,
        });
      } catch (error) {
        // If rendering fails due to encoding, try with further normalization
        const safeLine = normalizeForWidthCalculation(line);
        page.drawText(safeLine, {
          x: margin,
          y: yPos,
          size: fontSize,
          font: font,
          color: color,
        });
      }
      yPos -= lineHeight;
    });
    
    return totalHeight;
  }
  
  // Header section
  const headerText = normalizeForRendering(session.title.toUpperCase());
  const headerLines = splitTextIntoLines(
    headerText,
    contentWidth,
    16,
    helveticaBoldFont
  );
  const headerLineHeight = getLineHeight(16);
  const headerHeight = headerLines.length * headerLineHeight;
  
  ensurePageSpace(headerHeight + 10);
  
  headerLines.forEach((line: string) => {
    page.drawText(line, {
      x: margin,
      y: yPos,
      size: 16,
      font: helveticaBoldFont,
      color: blackColor,
    });
    yPos -= headerLineHeight;
  });
  yPos -= 8; // Space after title
  
  // Metadata
  const level = getLevel(session.score);
  const formattedDate = new Date(session.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const metadataText = normalizeForRendering(`Level ${level} • ${session.score} XP • ${formattedDate}`);
  const metadataHeight = await addText(metadataText, 9, false, lightGrayColor);
  yPos -= 8; // Spacing after metadata
  
  // Divider line
  ensurePageSpace(12);
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: pageWidth - margin, y: yPos },
    thickness: 0.3,
    color: accentColor,
  });
  yPos -= 12; // Space after divider
  
  // Note content
  if (note && note.content && typeof window !== "undefined") {
    // Replace data-image-id with actual image URLs
    let processedContent = note.content;
    const imageMap = new Map<string, string>();
    
    for (const image of images) {
      try {
        const imageUrl = await getImageUrl(image);
        imageMap.set(image.id, imageUrl);
        processedContent = processedContent.replace(
          new RegExp(`data-image-id="${image.id}"`, "g"),
          `src="${imageUrl}"`
        );
      } catch {
        // Skip if image can't be loaded
      }
    }

    // Parse HTML into structured elements
    const parsedElements = parseHTML(processedContent);

    // Create image cache
    const imageCache = new Map<string, Uint8Array | undefined>();

    // Render each element
    for (const element of parsedElements) {
      switch (element.type) {
        case "heading": {
          const fontSize = 12 - (element.level || 1) + 1; // h1=12pt, h2=11pt, etc.
          const headingText = normalizeForRendering(element.content || "");
          const headingLines = splitTextIntoLines(
            headingText,
            contentWidth,
            fontSize,
            helveticaBoldFont
          );
          const lineHeight = getLineHeight(fontSize);
          const totalHeight = headingLines.length * lineHeight;
          
          // Add space before heading (except first element)
          if (yPos < pageHeight - margin - 20) {
            yPos -= 8;
          }
          
          ensurePageSpace(totalHeight + 10);
          
          headingLines.forEach((line: string) => {
            page.drawText(line, {
              x: margin,
              y: yPos,
              size: fontSize,
              font: helveticaBoldFont,
              color: blackColor,
            });
            yPos -= lineHeight;
          });
          
          yPos -= 8; // Spacing after heading
          break;
        }

        case "text": {
          yPos -= 6; // Space before paragraph
          await addText(element.content || "", 10, false);
          yPos -= 6; // Spacing after paragraph
          break;
        }

        case "list": {
          yPos -= 6; // Space before list
          
          (element.items || []).forEach((item, itemIdx) => {
            const listText = normalizeForRendering(`• ${item}`);
            const listLines = splitTextIntoLines(
              listText,
              contentWidth - 5,
              10,
              helveticaFont
            );
            const lineHeight = getLineHeight(10);
            const itemHeight = listLines.length * lineHeight;
            
            ensurePageSpace(itemHeight);
            
            listLines.forEach((line: string, idx: number) => {
              page.drawText(line, {
                x: margin + (idx === 0 ? 0 : 5),
                y: yPos,
                size: 10,
                font: helveticaFont,
                color: grayColor,
              });
              yPos -= lineHeight;
            });
            
            // Spacing between list items
            if (itemIdx < element.items!.length - 1) {
              yPos -= 3;
            }
          });
          
          yPos -= 8; // Spacing after list
          break;
        }

        case "table": {
          if (!element.rows || element.rows.length === 0) break;
          
          yPos -= 8; // Space before table
          
          const numCols = Math.max(...element.rows.map(r => r.length));
          const colWidth = contentWidth / numCols;
          const fontSize = 9;
          const lineHeight = getLineHeight(fontSize);
          const cellPadding = 4;
          
          // Draw table row by row
          element.rows.forEach((row, rowIdx) => {
            // Calculate row height: find the cell with most lines
            let maxCellLines = 1;
            
            row.forEach((cell) => {
              const cellText = normalizeForRendering(cell || "");
              const cellLines = splitTextIntoLines(
                cellText,
                colWidth - (cellPadding * 2),
                fontSize,
                helveticaFont
              );
              maxCellLines = Math.max(maxCellLines, cellLines.length);
            });
            
            // Row height = top padding + content height + bottom padding
            const contentHeight = maxCellLines * lineHeight;
            const rowHeight = cellPadding + contentHeight + cellPadding;
            
            ensurePageSpace(rowHeight + 3);
            
            // Draw cell borders and text
            let xPos = margin;
            
            row.forEach((cell, colIdx) => {
              const isHeader = rowIdx === 0;
              
              // Draw cell border
              page.drawRectangle({
                x: xPos,
                y: yPos - rowHeight,
                width: colWidth,
                height: rowHeight,
                borderColor: rgb(0.784, 0.784, 0.784), // ~200, 200, 200
                borderWidth: 0.5,
              });
              
              // Get text lines for this cell
              const cellText = normalizeForRendering(cell || "");
              const cellLines = splitTextIntoLines(
                cellText,
                colWidth - (cellPadding * 2),
                fontSize,
                isHeader ? helveticaBoldFont : helveticaFont
              );
              
              // Position text within cell
              let textYPos = yPos - cellPadding - fontSize * 0.8; // Position from top
              
              cellLines.forEach((line: string) => {
                const minY = yPos - rowHeight + cellPadding;
                if (textYPos >= minY) {
                  page.drawText(line, {
                    x: xPos + cellPadding,
                    y: textYPos,
                    size: fontSize,
                    font: isHeader ? helveticaBoldFont : helveticaFont,
                    color: isHeader ? blackColor : grayColor,
                  });
                  textYPos -= lineHeight;
                }
              });
              
              xPos += colWidth;
            });
            
            // Move to next row
            yPos -= rowHeight + 3; // Spacing between rows
          });
          
          yPos -= 10; // Spacing after table
          break;
        }

        case "image": {
          if (!element.imageUrl) break;
          
          try {
            // Get image from cache or load it
            let imageBytes = imageCache.get(element.imageUrl);
            if (!imageBytes) {
              imageBytes = await loadImageBytes(element.imageUrl);
              if (imageBytes) {
                imageCache.set(element.imageUrl, imageBytes);
              }
            }
            
            if (imageBytes) {
              let pdfImage;
              // Detect image type and embed
              if (element.imageUrl.match(/\.(jpg|jpeg)$/i)) {
                pdfImage = await doc.embedJpg(imageBytes);
              } else if (element.imageUrl.match(/\.png$/i)) {
                pdfImage = await doc.embedPng(imageBytes);
              } else {
                // Try PNG first, then JPG
                try {
                  pdfImage = await doc.embedPng(imageBytes);
                } catch {
                  pdfImage = await doc.embedJpg(imageBytes);
                }
              }
              
              // Calculate dimensions to fit page width
              const maxWidth = contentWidth;
              const aspectRatio = pdfImage.width / pdfImage.height;
              let imgWidth = maxWidth;
              let imgHeight = maxWidth / aspectRatio;
              
              // Limit height
              const maxHeight = pageHeight - margin - 20;
              if (imgHeight > maxHeight) {
                imgHeight = maxHeight;
                imgWidth = imgHeight * aspectRatio;
              }
              
              // Add space before image
              yPos -= 8;
              ensurePageSpace(imgHeight + 8);
              
              page.drawImage(pdfImage, {
                x: margin,
                y: yPos - imgHeight,
                width: imgWidth,
                height: imgHeight,
              });
              
              yPos -= imgHeight + 8; // Image height + spacing after
            }
          } catch (error) {
            console.warn("[PDF Export] Failed to add image:", element.imageUrl, error);
            // Add placeholder text
            yPos -= 5;
            page.drawText("[Image]", {
              x: margin,
              y: yPos,
              size: 8,
              font: helveticaFont,
              color: footerGrayColor,
            });
            yPos -= 5;
          }
          break;
        }

        case "linebreak": {
          yPos -= 6; // Space for line break
          break;
        }
      }
    }
  } else if (note && note.content) {
    // Fallback: simple text rendering
    const parser = new DOMParser();
    const doc2 = parser.parseFromString(note.content, "text/html");
    const text = doc2.body.textContent || "";
    
    const paragraphs = text.split(/\n+/).filter(p => p.trim());
    for (const paragraph of paragraphs) {
      await addText(paragraph.trim(), 10);
      yPos -= 2;
    }
  }

  // Footer on all pages (centered)
  const totalPages = doc.getPageCount();
  const pages = doc.getPages();
  const footerText = `AURA-NX0 • Page 1 of ${totalPages}`;
  const footerFontSize = 8;
  const footerWidth = helveticaFont.widthOfTextAtSize(footerText, footerFontSize);
  
  pages.forEach((page, index) => {
    const footerTextWithPage = `AURA-NX0 • Page ${index + 1} of ${totalPages}`;
    const textWidth = helveticaFont.widthOfTextAtSize(footerTextWithPage, footerFontSize);
    const xPos = (pageWidth - textWidth) / 2; // Center the text
    
    page.drawText(footerTextWithPage, {
      x: xPos,
      y: 15,
      size: footerFontSize,
      font: helveticaFont,
      color: footerGrayColor,
    });
  });

  // Sanitize filename
  function sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 200);
  }

  // Save PDF
  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  
  const sanitizedTitle = sanitizeFilename(session.title);
  const dateStr = new Date(session.createdAt).toISOString().split("T")[0];
  link.download = sanitizedTitle ? `${sanitizedTitle}_${dateStr}.pdf` : `session_${dateStr}.pdf`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
