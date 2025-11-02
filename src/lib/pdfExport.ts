import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
 * Convert HTML content to plain text while preserving line breaks and structure
 */
function htmlToText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;

  // Helper function to recursively extract text with line breaks
  function extractText(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      let text = "";

      // Handle explicit line breaks first
      if (tagName === "br") {
        return "\n";
      }
      
      // Handle block-level elements that should create line breaks
      if (["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li"].includes(tagName)) {
        // Process children first
        for (let i = 0; i < element.childNodes.length; i++) {
          const childText = extractText(element.childNodes[i]);
          if (childText) {
            text += childText;
          }
        }
        // Add line break after block elements (but not before if it's the first)
        if (text && !text.endsWith("\n")) {
          text += "\n";
        }
      } else {
        // Inline elements - process children with space preservation
        for (let i = 0; i < element.childNodes.length; i++) {
          const childText = extractText(element.childNodes[i]);
          if (childText && text && !text.endsWith(" ") && !text.endsWith("\n") && !childText.startsWith(" ")) {
            // Add space between inline elements if needed
            text += " ";
          }
          text += childText;
        }
      }

      return text;
    }

    return "";
  }

  let result = extractText(body);
  
  // Normalize whitespace - collapse multiple spaces to single space (but preserve line breaks)
  result = result.replace(/[ \t]+/g, " ");
  
  // Clean up multiple consecutive line breaks (max 2)
  result = result.replace(/\n{3,}/g, "\n\n");
  
  // Remove spaces at start/end of lines
  result = result
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  return result;
}

/**
 * Convert a blob image to base64 for PDF embedding
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Export a session to PDF with theme-aware styling
 */
export async function exportSessionToPDF(
  session: Session,
  note: Note | null,
  images: Image[]
): Promise<void> {
  const { accent, accentRGB } = getThemeColors();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  // Reduced margins for better space utilization
  const margin = 15; // Reduced from 20
  const rightMargin = 15; // Separate right margin
  const contentWidth = pageWidth - margin - rightMargin;
  let yPos = margin;

  // Theme color for accents
  const [r, g, b] = accentRGB;
  const accentPDFColor: [number, number, number] = [r / 255, g / 255, b / 255];

  // Header section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...accentPDFColor);
  doc.text(session.title.toUpperCase(), margin, yPos);
  yPos += 12;

  // Metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  const level = getLevel(session.score);
  const dateStr = new Date(session.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Level ${level} • ${session.score} XP • ${dateStr}`, margin, yPos);
  yPos += 15;

  // Divider line
  doc.setDrawColor(...accentPDFColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - rightMargin, yPos);
  yPos += 10;

  // Note content - use html2canvas to preserve emojis and formatting
  if (note && note.content && typeof window !== "undefined") {
    try {
      // Get actual theme colors from CSS variables
      const root = document.documentElement;
      const accentColor = getComputedStyle(root).getPropertyValue("--accent").trim() || "#00F5FF";
      const textBodyColor = getComputedStyle(root).getPropertyValue("--text-body").trim() || "rgb(170, 225, 235)";
      const textHeadingColor = getComputedStyle(root).getPropertyValue("--text-heading").trim() || "rgb(150, 215, 225)";

      // Replace blob URLs and data-image-id attributes with actual image URLs
      let processedContent = note.content;
      for (const image of images) {
        try {
          const imageUrl = await getImageUrl(image);
          // Replace data-image-id references with actual URLs
          processedContent = processedContent.replace(
            new RegExp(`data-image-id="${image.id}"`, "g"),
            `src="${imageUrl}"`
          );
          // Also replace blob URLs if any
          processedContent = processedContent.replace(
            new RegExp(`blob:[^"']*`, "g"),
            (match) => {
              // Try to match blob URL to image - simple approach
              return match;
            }
          );
        } catch {
          // Skip if image can't be loaded
        }
      }

      // Create a temporary container with the HTML content
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      // Use actual content width for proper table/column rendering
      // Calculate pixel width: jsPDF uses points (1pt = 1/72 inch), convert to pixels
      // Standard PDF is 8.5" x 11" at 72 DPI = 612pt x 792pt
      // For better quality in html2canvas, we use 2x scale but match actual content width
      const contentWidthPx = contentWidth * 2; // 2x for quality, matches actual rendered width
      tempContainer.style.width = `${contentWidthPx}px`;
      tempContainer.style.padding = "15px";
      tempContainer.style.backgroundColor = "#0A0A0C"; // Dark background
      tempContainer.style.color = textBodyColor;
      tempContainer.style.fontFamily = "'Courier New', monospace";
      tempContainer.style.fontSize = "14px";
      tempContainer.style.lineHeight = "1.6";
      tempContainer.style.boxSizing = "border-box";
      tempContainer.innerHTML = processedContent;

      // Apply theme-aware styles with actual color values
      const style = document.createElement("style");
      style.textContent = `
        #pdf-temp-container {
          overflow-x: visible;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        #pdf-temp-container a {
          color: ${accentColor};
          text-decoration: underline;
        }
        #pdf-temp-container h1, #pdf-temp-container h2, #pdf-temp-container h3, 
        #pdf-temp-container h4, #pdf-temp-container h5, #pdf-temp-container h6 {
          color: ${textHeadingColor};
          font-weight: bold;
          margin: 1em 0 0.5em 0;
        }
        #pdf-temp-container h1 { font-size: 1.5em; }
        #pdf-temp-container h2 { font-size: 1.3em; }
        #pdf-temp-container h3 { font-size: 1.1em; }
        #pdf-temp-container p {
          margin: 0.5em 0;
        }
        #pdf-temp-container strong {
          font-weight: bold;
        }
        #pdf-temp-container em {
          font-style: italic;
        }
        #pdf-temp-container ul, #pdf-temp-container ol {
          margin: 0.5em 0;
          padding-left: 1.5em;
        }
        #pdf-temp-container img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0.5em 0;
        }
        /* Table handling for PDF export */
        #pdf-temp-container table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
          table-layout: auto;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        #pdf-temp-container table th,
        #pdf-temp-container table td {
          padding: 0.5em;
          border: 1px solid rgba(var(--accent-rgb), 0.3);
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }
        #pdf-temp-container table th {
          background-color: rgba(var(--accent-rgb), 0.1);
          font-weight: bold;
          color: ${textHeadingColor};
        }
        #pdf-temp-container table td {
          color: ${textBodyColor};
        }
        /* Ensure columns don't overflow */
        #pdf-temp-container table td:last-child,
        #pdf-temp-container table th:last-child {
          max-width: 30%;
        }
      `;
      tempContainer.id = "pdf-temp-container";
      document.head.appendChild(style);
      document.body.appendChild(tempContainer);

      // Wait a bit for images to load
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Convert to canvas
      // Use scale 2 for quality, but ensure width matches our content width
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: "#0A0A0C",
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        width: contentWidthPx,
        height: tempContainer.scrollHeight,
        windowWidth: contentWidthPx,
        allowTaint: false,
        removeContainer: false,
      });

      // Clean up
      document.body.removeChild(tempContainer);
      document.head.removeChild(style);

      // Calculate image dimensions to fit page
      // Scale down from canvas (which is at 2x scale) to actual PDF points
      const canvasToPDFRatio = 2; // Since we used scale: 2
      const maxWidth = contentWidth;
      const imgAspectRatio = canvas.width / canvas.height;
      let imgWidth = maxWidth;
      let imgHeight = maxWidth / imgAspectRatio;

      // Split across multiple pages if needed
      const maxHeightPerPage = pageHeight - margin - 30; // Leave space for footer
      let remainingHeight = imgHeight;
      let sourceY = 0;
      const sourceHeight = canvas.height;

      while (remainingHeight > 0) {
        // Check if we need a new page
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = margin;
        }

        // Calculate how much of the image fits on this page
        const heightThisPage = Math.min(remainingHeight, maxHeightPerPage - (yPos - margin));
        const sourceYThisPage = (sourceY / imgHeight) * sourceHeight;
        const sourceHeightThisPage = (heightThisPage / imgHeight) * sourceHeight;

        // Add this portion of the image
        const canvasDataUrl = canvas.toDataURL("image/png");
        
        // Create a temporary canvas for this page's portion
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeightThisPage;
        const pageCtx = pageCanvas.getContext("2d");
        if (pageCtx) {
          pageCtx.drawImage(
            canvas,
            0, sourceYThisPage, canvas.width, sourceHeightThisPage,
            0, 0, canvas.width, sourceHeightThisPage
          );
          const pageDataUrl = pageCanvas.toDataURL("image/png");
          
          // Scale to fit page width
          // pageCanvas contains a portion of the full canvas
          // We scale it to maxWidth and calculate height proportionally
          const pageImgWidth = maxWidth;
          // Use the aspect ratio of the extracted portion
          const pageAspectRatio = pageCanvas.width / pageCanvas.height;
          const pageImgHeight = pageImgWidth / pageAspectRatio;
          
          doc.addImage(pageDataUrl, "PNG", margin, yPos, pageImgWidth, pageImgHeight);
        }

        yPos += heightThisPage + 5;
        sourceY += heightThisPage;
        remainingHeight -= heightThisPage;
      }

      yPos += 10;
    } catch (error) {
      // Fallback to text-based rendering if html2canvas fails
      console.warn("Failed to render HTML with emojis, falling back to text", error);
      doc.setFont("courier", "normal");
      doc.setFontSize(11);
      doc.setTextColor(200, 200, 200);

      const text = htmlToText(note.content);
      
      // Split by line breaks first to preserve structure, then wrap long lines
      const paragraphs = text.split("\n").filter((p) => p.trim().length > 0);
      
      for (const paragraph of paragraphs) {
        // Check if we need a new page before starting a paragraph
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = margin;
        }
        
        // Split long lines to fit page width
        const lines = doc.splitTextToSize(paragraph.trim(), contentWidth);
        
        for (const line of lines) {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(line.trim(), margin, yPos);
          yPos += 6;
        }
        
        // Add spacing between paragraphs
        yPos += 2;
      }
      yPos += 5;
    }
  } else if (note && note.content) {
    // Server-side fallback: text-only (no emojis)
    doc.setFont("courier", "normal");
    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);

    const text = htmlToText(note.content);
    
    // Split by line breaks first to preserve structure, then wrap long lines
    const paragraphs = text.split("\n").filter((p) => p.trim().length > 0);
    
    for (const paragraph of paragraphs) {
      // Check if we need a new page before starting a paragraph
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }
      
      // Split long lines to fit page width
      const lines = doc.splitTextToSize(paragraph.trim(), contentWidth);
      
      for (const line of lines) {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line.trim(), margin, yPos);
        yPos += 6;
      }
      
      // Add spacing between paragraphs
      yPos += 2;
    }
    yPos += 5;
  }

  // Note: Images are now embedded within the note content when using html2canvas
  // No separate Images section needed

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `AURA-NX0 • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  // Save PDF
  const filename = `${session.title.replace(/[^a-z0-9]/gi, "_")}_${new Date(session.createdAt).toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}

