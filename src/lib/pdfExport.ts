import jsPDF from "jspdf";
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
 * Also sanitizes unsafe characters for PDF rendering
 */
function cleanText(text: string): string {
  // Remove emojis (they don't render well in PDF)
  // Keep special characters like ≤, ≥, etc.
  let cleaned = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  
  // Replace unsafe/control characters that can cause PDF rendering issues
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
 * Load image and convert to base64 data URL
 */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("[PDF Export] Failed to load image:", url, error);
    return null;
  }
}

/**
 * Export a session to PDF with clean, native rendering
 */
export async function exportSessionToPDF(
  session: Session,
  note: Note | null,
  images: Image[]
): Promise<void> {
  console.log('%c[AURA-NX0 PDF Export]', 'color: #00F5FF; font-weight: bold; font-size: 14px;', 
    'PDF Export v4.0 (Native) - Starting export for:', session.title);
  
  const { accentRGB } = getThemeColors();
  const doc = new jsPDF({
    compress: true,
    orientation: 'portrait',
    unit: 'pt',
  });
  
  // Ensure UTF-8 encoding for special characters like ≤, ≥
  doc.setProperties({
    title: session.title,
    creator: 'AURA-NX0',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15; // Small, clean margins
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Theme color for accents
  const [r, g, b] = accentRGB;
  const accentPDFColor: [number, number, number] = [r / 255, g / 255, b / 255]; // For text color (0-1 range)
  const accentPDFFillColor: [number, number, number] = accentRGB; // For fill color (0-255 range)

  // Helper to sanitize text for PDF rendering
  function sanitizeText(text: string): string {
    // jsPDF handles most characters, but we ensure no control chars
    return text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width spaces
  }

  // Helper to get proper line height for a font size
  function getLineHeight(fontSize: number): number {
    return fontSize * 1.5; // Standard 1.5 line height for readability
  }

  // Helper to check if we need a new page and add one if needed
  function ensurePageSpace(requiredHeight: number): void {
    if (yPos + requiredHeight > pageHeight - margin - 15) {
      doc.addPage();
      yPos = margin;
    }
  }

  // Helper to add text with automatic wrapping and proper spacing
  function addText(text: string, fontSize: number, isBold = false): number {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    
    // Sanitize text before rendering
    const sanitized = sanitizeText(text);
    const lines = doc.splitTextToSize(sanitized, contentWidth);
    const lineHeight = getLineHeight(fontSize);
    const totalHeight = lines.length * lineHeight;
    
    ensurePageSpace(totalHeight);
    
    lines.forEach((line) => {
      ensurePageSpace(lineHeight);
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    });
    
    return totalHeight; // Return height used for spacing calculations
  }

  // Header section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...accentPDFColor);
  const sanitizedHeaderTitle = sanitizeText(session.title.toUpperCase());
  const titleLines = doc.splitTextToSize(sanitizedHeaderTitle, contentWidth);
  const titleLineHeight = getLineHeight(16);
  
  ensurePageSpace(titleLines.length * titleLineHeight + 8);
  
  titleLines.forEach((line) => {
    doc.text(line, margin, yPos);
    yPos += titleLineHeight;
  });
  yPos += 8; // Space after title

  // Metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  const level = getLevel(session.score);
  const formattedDate = new Date(session.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const metadataLineHeight = getLineHeight(9);
  ensurePageSpace(metadataLineHeight);
  doc.text(`Level ${level} • ${session.score} XP • ${formattedDate}`, margin, yPos);
  yPos += metadataLineHeight + 8; // Line height + spacing

  // Divider line
  doc.setDrawColor(...accentPDFColor);
  doc.setLineWidth(0.3);
  ensurePageSpace(12);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 12; // Space after divider

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

    // Create image URL cache
    const imageCache = new Map<string, string>();

    // Render each element
    for (const element of parsedElements) {
      switch (element.type) {
        case "heading": {
          const fontSize = 12 - (element.level || 1) + 1; // h1=12pt, h2=11pt, etc.
          doc.setFont("helvetica", "bold");
          doc.setFontSize(fontSize);
          doc.setTextColor(...accentPDFColor);
          
          const lineHeight = getLineHeight(fontSize);
          const sanitizedContent = sanitizeText(element.content || "");
          const lines = doc.splitTextToSize(sanitizedContent, contentWidth);
          const totalHeight = lines.length * lineHeight;
          
          // Add space before heading (except first element)
          if (yPos > margin + 20) {
            yPos += 8;
          }
          
          ensurePageSpace(totalHeight + 10);
          
          lines.forEach((line) => {
            doc.text(line, margin, yPos);
            yPos += lineHeight;
          });
          
          yPos += 8; // Spacing after heading
          break;
        }

        case "text": {
          // Add space before paragraph
          yPos += 6;
          
          const usedHeight = addText(element.content || "", 10, false);
          yPos += 6; // Spacing after paragraph
          break;
        }

        case "list": {
          // Add space before list
          yPos += 6;
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          
          const lineHeight = getLineHeight(10);
          
          (element.items || []).forEach((item, itemIdx) => {
            const sanitizedItem = sanitizeText(item);
            const lines = doc.splitTextToSize(`• ${sanitizedItem}`, contentWidth - 5);
            const itemHeight = lines.length * lineHeight;
            
            ensurePageSpace(itemHeight);
            
            lines.forEach((line, idx) => {
              doc.text(line, margin + (idx === 0 ? 0 : 5), yPos);
              yPos += lineHeight;
            });
            
            // Spacing between list items
            if (itemIdx < element.items!.length - 1) {
              yPos += 3;
            }
          });
          
          yPos += 8; // Spacing after list
          break;
        }

        case "table": {
          if (!element.rows || element.rows.length === 0) break;
          
          // Add space before table
          yPos += 8;
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          
          const numCols = Math.max(...element.rows.map(r => r.length));
          const colWidth = contentWidth / numCols;
          const fontSize = 9;
          const lineHeight = getLineHeight(fontSize);
          const cellPadding = 5; // Adequate padding to keep text inside
          
          // Draw table row by row
          element.rows.forEach((row, rowIdx) => {
            // Calculate row height: find the cell with most lines
            let maxCellLines = 1;
            const cellLineCounts: number[] = [];
            
            row.forEach((cell) => {
              const sanitizedCell = sanitizeText(cell || "");
              const cellLines = doc.splitTextToSize(sanitizedCell, colWidth - (cellPadding * 2));
              const lineCount = cellLines.length;
              cellLineCounts.push(lineCount);
              maxCellLines = Math.max(maxCellLines, lineCount);
            });
            
            // Row height = top padding + content height + bottom padding
            // Content height = number of lines * line height
            const contentHeight = maxCellLines * lineHeight;
            const rowHeight = cellPadding + contentHeight + cellPadding;
            
            ensurePageSpace(rowHeight + 3);
            
            // Draw the row - first draw all borders, then draw all text
            let xPos = margin;
            
            // Draw cell borders first
            row.forEach((cell, colIdx) => {
              doc.setDrawColor(200, 200, 200);
              doc.setLineWidth(0.2);
              doc.rect(xPos, yPos, colWidth, rowHeight, "S");
              xPos += colWidth;
            });
            
            // Draw cell text - ensure it's properly positioned within cells
            xPos = margin;
            row.forEach((cell, colIdx) => {
              const isHeader = rowIdx === 0;
              
              // Set font style
              if (isHeader) {
                doc.setTextColor(...accentPDFColor);
                doc.setFont("helvetica", "bold");
              } else {
                doc.setTextColor(60, 60, 60);
                doc.setFont("helvetica", "normal");
              }
              
              // Get text lines for this cell
              const cellText = sanitizeText(cell || "");
              const cellLines = doc.splitTextToSize(cellText, colWidth - (cellPadding * 2));
              
              // Position text: start from top padding, adjust for baseline
              // jsPDF text() positions at baseline, so we add a bit for proper top padding
              let textYPos = yPos + cellPadding + (lineHeight * 0.7); // Adjusted for proper baseline positioning
              
              // Draw each line, ensuring it stays within the cell
              cellLines.forEach((line) => {
                const maxY = yPos + rowHeight - cellPadding;
                if (textYPos <= maxY) {
                  doc.text(line, xPos + cellPadding, textYPos);
                  textYPos += lineHeight;
                }
              });
              
              xPos += colWidth;
            });
            
            // Move to next row
            yPos += rowHeight + 3; // Spacing between rows
          });
          
          yPos += 10; // Spacing after table
          break;
        }

        case "image": {
          if (!element.imageUrl) break;
          
          try {
            // Get image from cache or load it
            let imageDataUrl = imageCache.get(element.imageUrl);
            if (!imageDataUrl) {
              imageDataUrl = await loadImageAsDataUrl(element.imageUrl);
              if (imageDataUrl) {
                imageCache.set(element.imageUrl, imageDataUrl);
              }
            }
            
            if (imageDataUrl) {
              // Create temporary image to get dimensions
              const img = new Image();
              await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageDataUrl!;
              });
              
              // Calculate dimensions to fit page width
              const maxWidth = contentWidth;
              const aspectRatio = img.width / img.height;
              let imgWidth = maxWidth;
              let imgHeight = maxWidth / aspectRatio;
              
              // Limit height
              const maxHeight = pageHeight - margin - 20;
              if (imgHeight > maxHeight) {
                imgHeight = maxHeight;
                imgWidth = imgHeight * aspectRatio;
              }
              
              // Add space before image
              yPos += 8;
              ensurePageSpace(imgHeight + 8);
              
              doc.addImage(imageDataUrl, "PNG", margin, yPos, imgWidth, imgHeight);
              yPos += imgHeight + 8; // Image height + spacing after
            }
          } catch (error) {
            console.warn("[PDF Export] Failed to add image:", element.imageUrl, error);
            // Add placeholder text
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text("[Image]", margin, yPos);
            yPos += 5;
          }
          break;
        }

        case "linebreak": {
          yPos += 6; // Space for line break
          break;
        }
      }
    }
  } else if (note && note.content) {
    // Fallback: simple text rendering
    const parser = new DOMParser();
    const doc2 = parser.parseFromString(note.content, "text/html");
    const text = doc2.body.textContent || "";
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    
    const paragraphs = text.split(/\n+/).filter(p => p.trim());
    paragraphs.forEach((paragraph) => {
      addText(paragraph.trim(), 10);
      yPos += 2;
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `AURA-NX0 • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  // Sanitize filename - remove/replace unsafe characters for file systems
  function sanitizeFilename(name: string): string {
    // Replace unsafe characters with safe alternatives
    return name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_") // Remove/reserve unsafe filesystem characters
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/_{2,}/g, "_") // Replace multiple underscores with single
      .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
      .slice(0, 200); // Limit length to prevent issues
  }

  // Save PDF with sanitized filename
  const sanitizedTitle = sanitizeFilename(session.title);
  const dateStr = new Date(session.createdAt).toISOString().split("T")[0];
  const filename = sanitizedTitle ? `${sanitizedTitle}_${dateStr}.pdf` : `session_${dateStr}.pdf`;
  doc.save(filename);
}
