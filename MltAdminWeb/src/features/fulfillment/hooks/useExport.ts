import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import JsBarcode from 'jsbarcode';
import defaultLogoSrc from '../../../assets/mlt_logo.svg';
import type { Shipment } from '../types';
import type { jsPDF } from 'jspdf';
import { ExportUtils, type ExportColumn } from '../../../utils/exportUtils';

export const useExport = (shipment: Shipment | null) => {
  const [exportBarcodesLoading, setExportBarcodesLoading] = useState(false);
  const [exportListLoading, setExportListLoading] = useState(false);
  const [exportCsvLoading, setExportCsvLoading] = useState(false);

  // Export barcodes functionality
  const exportBarcodes = async () => {
    if (!shipment || !shipment.items || shipment.items.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'No items to export',
        color: 'red',
      });
      return;
    }

    try {
      setExportBarcodesLoading(true);

      // Dynamically import jsPDF
      const { default: jsPDFConstructor } = await import('jspdf');

      // Create a new PDF document with mm units and custom size for 50mm x 25mm label
      const doc = new jsPDFConstructor({
        orientation: 'landscape',
        unit: 'mm',
        format: [50, 25], // Width x Height: 50mm x 25mm
      });

      // Load logo
      const img = new Image();
      img.src = defaultLogoSrc;

      // Wait for image to load
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Convert SVG to PNG for PDF compatibility
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      const logoDataUrl = canvas.toDataURL('image/png');

      // Generate all barcodes first to avoid timing issues
      const barcodeCache: Record<string, string | null> = {};

      for (const item of shipment.items) {
        const identifier = item.productBarcode || item.sku || '';
        if (!identifier || identifier in barcodeCache) continue;

        try {
          // Generate barcode
          const barcodeCanvas = document.createElement('canvas');
          JsBarcode(barcodeCanvas, identifier, {
            format: 'CODE128',
            width: 2,
            height: 40,
            displayValue: false,
            margin: 5,
            background: '#ffffff',
            lineColor: '#000000',
            fontSize: 0,
            textMargin: 0,
          });

          barcodeCache[identifier] = barcodeCanvas.toDataURL('image/png');
        } catch (e) {
          console.error('Error generating barcode:', e);
          // Use a fallback if barcode generation fails
          barcodeCache[identifier] = null;
        }
      }

      // Process each item and generate labels based on quantity
      let totalLabels = 0;
      let isFirstPage = true;

      for (const item of shipment.items) {
        // Generate labels for each quantity of the item
        for (let q = 0; q < item.quantityPlanned; q++) {
          // Add a new page for each label (except the first one)
          if (!isFirstPage) {
            doc.addPage([50, 25]); // Width x Height: 50mm x 25mm
          }
          isFirstPage = false;

          // Generate label
          await generateLabel(
            doc,
            item,
            0,
            0,
            50, //25,
            barcodeCache,
            logoDataUrl,
          );

          totalLabels++;
        }
      }

      // Save the PDF
      doc.save(`${shipment.shipmentNumber}_barcodes.pdf`);

      notifications.show({
        title: 'Export Complete',
        message: `${totalLabels} barcode labels exported successfully`,
        color: 'green',
      });
    } catch (error) {
      console.error('Error exporting barcodes:', error);
      notifications.show({
        title: 'Export Failed',
        message: 'Failed to export barcodes',
        color: 'red',
      });
    } finally {
      setExportBarcodesLoading(false);
    }
  };

  // Helper function to generate a single label
  const generateLabel = async (
    doc: jsPDF,
    item: Shipment['items'][0],
    x: number,
    y: number,
    labelWidth: number,
    //labelHeight: number,
    barcodeCache: Record<string, string | null>,
    logoDataUrl: string,
  ) => {
    // Content area (full width - logo doesn't affect layout)
    const contentX = x + 2;
    const contentWidth = labelWidth - 4;

    // Calculate content height (used for vertical spacing)
    //const contentHeight = labelHeight - 4;

    // Draw border around label (optional)
    // doc.rect(x, y, labelWidth, labelHeight);

    // Row 1: Price (centered)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    // Use "Rs." instead of the Rupee symbol to avoid encoding issues
    const currencyPrefix = 'Rs.';

    // Use unitPrice (normal price) instead of compareAtPrice for barcode labels
    const displayPrice = item.unitPrice;

    doc.text(
      `MRP: ${currencyPrefix}${displayPrice?.toFixed(2) || '0.00'}`,
      contentX + contentWidth / 2,
      y + 4,
      { align: 'center' },
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('(Inclusive of all Taxes)', contentX + contentWidth / 2, y + 7, { align: 'center' });

    // Row 2: Barcode (centered)
    const identifier = item.productBarcode || item.sku || '';
    const barcodeDataUrl = barcodeCache[identifier];

    if (barcodeDataUrl) {
      const barcodeWidth = contentWidth * 0.9;
      const barcodeX = contentX + (contentWidth - barcodeWidth) / 2;
      doc.addImage(barcodeDataUrl, 'PNG', barcodeX, y + 8, barcodeWidth, 8);
    } else {
      doc.setFontSize(8);
      doc.text('Barcode Error', contentX + contentWidth / 2, y + 12, { align: 'center' });
    }

    // Row 3: SKU/Barcode (centered) - moved down to accommodate taller barcode
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(identifier, contentX + contentWidth / 2, y + 18, { align: 'center' });

    // Row 4: Product Title (truncated if needed)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Helper function to truncate text to fit within available width with ellipsis in center
    const truncateTextToFit = (text: string, maxWidth: number): string => {
      if (!text) return 'MyLittleTales Product';

      // Clean the title
      const cleanTitle = text.trim();

      // If the text already fits, return it
      const textWidth =
        (doc.getStringUnitWidth(cleanTitle) * doc.getFontSize()) / doc.internal.scaleFactor;
      if (textWidth <= maxWidth) {
        return `MyLittleTales ${cleanTitle}`;
      }

      // Try with just the prefix first
      const prefixText = 'MyLittleTales ';
      const prefixWidth =
        (doc.getStringUnitWidth(prefixText) * doc.getFontSize()) / doc.internal.scaleFactor;
      const availableWidth = maxWidth - prefixWidth;

      if (availableWidth <= 0) {
        return 'MyLittleTales';
      }

      // Split the text into words for better truncation
      const words = cleanTitle.split(/\s+/);

      if (words.length <= 3) {
        // For short titles, just truncate from the end
        let truncatedText = '';
        for (let i = 0; i < cleanTitle.length; i++) {
          const testText = cleanTitle.substring(0, i + 1);
          const testWidth =
            (doc.getStringUnitWidth(testText) * doc.getFontSize()) / doc.internal.scaleFactor;

          if (testWidth > availableWidth) {
            break;
          }
          truncatedText = testText;
        }

        if (!truncatedText) {
          return 'MyLittleTales';
        }

        if (truncatedText.length < cleanTitle.length) {
          truncatedText = truncatedText.substring(0, Math.max(0, truncatedText.length - 3)) + '...';
        }

        return `MyLittleTales ${truncatedText}`;
      } else {
        // For longer titles, show beginning and end with ellipsis in center
        const ellipsis = '...';
        const ellipsisWidth =
          (doc.getStringUnitWidth(ellipsis) * doc.getFontSize()) / doc.internal.scaleFactor;
        const remainingWidth = availableWidth - ellipsisWidth;

        if (remainingWidth <= 0) {
          return 'MyLittleTales';
        }

        // Try to fit first few words + ellipsis + last few words
        let bestResult = '';

        for (let firstWords = 1; firstWords <= Math.min(3, words.length - 1); firstWords++) {
          for (
            let lastWords = 1;
            lastWords <= Math.min(3, words.length - firstWords);
            lastWords++
          ) {
            const firstPart = words.slice(0, firstWords).join(' ');
            const lastPart = words.slice(-lastWords).join(' ');
            const testText = `${firstPart}${ellipsis}${lastPart}`;
            const testWidth =
              (doc.getStringUnitWidth(testText) * doc.getFontSize()) / doc.internal.scaleFactor;

            if (testWidth <= remainingWidth && testText.length > bestResult.length) {
              bestResult = testText;
            }
          }
        }

        if (bestResult) {
          return `MyLittleTales ${bestResult}`;
        }

        // Fallback: just show first few words with ellipsis
        let truncatedText = '';
        for (let i = 0; i < cleanTitle.length; i++) {
          const testText = cleanTitle.substring(0, i + 1);
          const testWidth =
            (doc.getStringUnitWidth(testText) * doc.getFontSize()) / doc.internal.scaleFactor;

          if (testWidth > availableWidth) {
            break;
          }
          truncatedText = testText;
        }

        if (!truncatedText) {
          return 'MyLittleTales';
        }

        truncatedText = truncatedText.substring(0, Math.max(0, truncatedText.length - 3)) + '...';
        return `MyLittleTales ${truncatedText}`;
      }
    };

    const formattedTitle = truncateTextToFit(
      item.productTitle || 'Unknown Product',
      contentWidth - 4,
    );

    // Add the title (centered) - moved lower to accommodate taller barcode
    doc.text(formattedTitle, contentX + contentWidth / 2, y + 21, { align: 'center' });

    // Add "New" on a separate line, centered
    doc.setFont('helvetica', 'bold');
    doc.text('New', contentX + contentWidth / 2, y + 24, { align: 'center' });

    // Add logo as overlay in top-left corner
    try {
      doc.addImage(logoDataUrl, 'PNG', x + 1, y + 1, 6, 6);
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
    }
  };

  // Export Product List functionality
  const exportProductList = async () => {
    if (!shipment || !shipment.items || shipment.items.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'No items to export',
        color: 'red',
      });
      return;
    }

    try {
      setExportListLoading(true);

      // Dynamically import jsPDF
      const { default: jsPDFConstructor } = await import('jspdf');

      // Create a new PDF document with A4 size
      const doc = new jsPDFConstructor({
        orientation: 'portrait', // Use portrait for A4
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15; // Margins for A4
      const cellPadding = 2; // Reduced padding for A4

      // Load logo
      const img = new Image();
      img.src = defaultLogoSrc;

      // Wait for image to load with timeout
      await new Promise((resolve) => {
        img.onload = resolve;
        // Set a timeout in case the image never loads
        setTimeout(resolve, 3000);
      });

      // Convert SVG to PNG for PDF compatibility
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      const logoDataUrl = canvas.toDataURL('image/png');

      // Helper function to wrap text to fit within a given width
      const wrapText = (text: string, maxWidth: number, maxLines: number): string[] => {
        if (!text) return [''];

        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth =
            (doc.getStringUnitWidth(testLine) * doc.getFontSize()) / doc.internal.scaleFactor;

          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              // Word is too long, truncate it
              lines.push(
                word.substring(
                  0,
                  Math.floor(maxWidth / (doc.getFontSize() / doc.internal.scaleFactor)),
                ),
              );
              currentLine = '';
            }
          }

          if (lines.length >= maxLines) {
            if (currentLine) {
              lines.push(currentLine + '...');
            }
            break;
          }
        }

        if (currentLine && lines.length < maxLines) {
          lines.push(currentLine);
        }

        return lines;
      };

      // Helper function to load image as data URL with optimized size and quality
      const loadImageAsDataUrl = (imageUrl: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous'; // Handle CORS issues

          img.onload = () => {
            try {
              // Create canvas with optimized size (180x180 for PDF - doubled from 90)
              const canvas = document.createElement('canvas');
              const targetSize = 180; // Fixed size for PDF - doubled from 90
              canvas.width = targetSize;
              canvas.height = targetSize;

              const ctx = canvas.getContext('2d');
              if (ctx) {
                // Set white background for better quality
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, targetSize, targetSize);

                // Calculate scaling to maintain aspect ratio
                const scale = Math.min(targetSize / img.width, targetSize / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const x = (targetSize - scaledWidth) / 2;
                const y = (targetSize - scaledHeight) / 2;

                // Draw image centered and scaled
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

                // Convert to JPEG with low quality for faster processing
                resolve(canvas.toDataURL('image/jpeg', 0.6)); // 60% quality
              } else {
                reject(new Error('Failed to get canvas context'));
              }
            } catch (error) {
              reject(error);
            }
          };

          img.onerror = () => {
            reject(new Error('Failed to load image'));
          };

          // Reduced timeout for faster failure
          setTimeout(() => {
            reject(new Error('Image load timeout'));
          }, 5000); // Reduced from 10s to 5s

          img.src = imageUrl;
        });
      };

      // Pre-load all product images with progress notification
      const imageCache: Record<string, string | null> = {};
      const itemsWithImages = shipment.items.filter((item) => item.productImageUrl);

      if (itemsWithImages.length > 0) {
        notifications.show({
          title: 'Processing Images',
          message: `Optimizing ${itemsWithImages.length} product images for PDF...`,
          color: 'blue',
          autoClose: false,
          id: 'pdf-image-processing',
        });
      }

      for (let i = 0; i < shipment.items.length; i++) {
        const item = shipment.items[i];
        if (item.productImageUrl) {
          try {
            const imageDataUrl = await loadImageAsDataUrl(item.productImageUrl);
            imageCache[item.id.toString()] = imageDataUrl;

            // Update progress
            if (itemsWithImages.length > 0) {
              const progress = Math.round(((i + 1) / shipment.items.length) * 100);
              notifications.update({
                id: 'pdf-image-processing',
                title: 'Processing Images',
                message: `Optimizing images... ${progress}% complete`,
                color: 'blue',
              });
            }
          } catch (error) {
            console.warn(`Failed to load image for product ${item.id}:`, error);
            imageCache[item.id.toString()] = null;
          }
        } else {
          imageCache[item.id.toString()] = null;
        }
      }

      // Close progress notification
      if (itemsWithImages.length > 0) {
        notifications.update({
          id: 'pdf-image-processing',
          title: 'Images Processed',
          message: 'All images optimized successfully',
          color: 'green',
          autoClose: 2000,
        });
      }

      // Add logo
      try {
        doc.addImage(logoDataUrl, 'PNG', margin, margin, 30, 10);
      } catch (error) {
        console.warn('Could not add logo to PDF:', error);
        // Continue without the logo
      }

      // Add header section with professional styling for A4
      const headerY = margin;
      const headerHeight = 35;

      // Add light gray background for header section
      doc.setFillColor(248, 249, 250); // Light gray background
      doc.rect(margin, headerY, pageWidth - margin * 2, headerHeight, 'F');

      // Add border around header section
      doc.setDrawColor(230, 230, 230); // Light gray border
      doc.rect(margin, headerY, pageWidth - margin * 2, headerHeight);

      // Add title with larger font
      doc.setFontSize(18);
      doc.setTextColor(44, 62, 80); // Dark blue-gray color
      doc.setFont('helvetica', 'bold');
      doc.text(`Shipment: ${shipment.shipmentNumber}`, margin + 40, headerY + 15);

      // Add shipment details in two columns for A4
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      // Left column
      const leftColX = margin + 40;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, leftColX, headerY + 25);
      doc.text(`Status: ${shipment.status.toUpperCase()}`, leftColX, headerY + 30);

      // Right column
      const rightColX = pageWidth - margin - 60;
      doc.text(`Total Items: ${shipment.totalItemsCount}`, rightColX, headerY + 25);
      doc.text(
        `Total Value: Rs.${shipment.totalValue?.toFixed(2) || '0.00'}`,
        rightColX,
        headerY + 30,
      );

      // Table styling constants for A4 with text wrapping
      const tableStartY = headerY + headerHeight + 8;
      const tableWidth = pageWidth - margin * 2;
      const headerRowHeight = 8;
      const rowHeight = 30; // Increased to accommodate larger images (22mm + padding)

      // Define columns with better proportions for A4 portrait mode (reduced widths)
      const columns = [
        { header: 'Image', width: 28 }, // Increased from 20 to 28 for larger images
        { header: 'Product', width: 52 }, // Reduced from 60 to 52 to accommodate image column
        { header: 'SKU/Barcode', width: 30 },
        { header: 'Planned', width: 15 },
        { header: 'Price', width: 20 },
      ];

      // Calculate column positions
      const columnPositions: number[] = [];
      let runningX = margin;
      for (const col of columns) {
        columnPositions.push(runningX);
        runningX += col.width;
      }

      // Draw table header
      let y = tableStartY;

      // Header background
      doc.setFillColor(52, 73, 94); // Dark blue-gray for header
      doc.rect(margin, y, tableWidth, headerRowHeight, 'F');

      // Header text
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255); // White text for header
      doc.setFont('helvetica', 'bold');

      for (let i = 0; i < columns.length; i++) {
        const x = columnPositions[i] + cellPadding;
        doc.text(columns[i].header, x, y + 6);
      }

      y += headerRowHeight;

      // Draw rows
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0); // Black text for content
      doc.setFont('helvetica', 'normal');

      // Keep track of alternating row colors
      let isAlternateRow = false;

      for (const item of shipment.items) {
        // Check if we need a new page
        if (y + rowHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;

          // Redraw header on new page
          doc.setFillColor(52, 73, 94); // Dark blue-gray for header
          doc.rect(margin, y, tableWidth, headerRowHeight, 'F');

          doc.setFontSize(12);
          doc.setTextColor(255, 255, 255); // White text for header
          doc.setFont('helvetica', 'bold');

          for (let i = 0; i < columns.length; i++) {
            const x = columnPositions[i] + cellPadding;
            doc.text(columns[i].header, x, y + 7);
          }

          y += headerRowHeight;
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0); // Reset text color for content
          doc.setFont('helvetica', 'normal');
          isAlternateRow = false;
        }

        // Draw alternating row background
        if (isAlternateRow) {
          doc.setFillColor(240, 240, 240); // Light gray for alternate rows
          doc.rect(margin, y, tableWidth, rowHeight, 'F');
        }
        isAlternateRow = !isAlternateRow;

        // Draw row border
        doc.setDrawColor(230, 230, 230); // Light gray border
        doc.rect(margin, y, tableWidth, rowHeight);

        // Draw cell data
        // Product image (column 1) - centered and properly contained
        const imageX = columnPositions[0] + 2;
        const imageY = y + 2;
        const imageSize = 22; // Increased from 16 to 22 for larger images
        const imageColumnWidth = columns[0].width;
        const imagePadding = 2;
        const maxImageSize = imageColumnWidth - imagePadding * 2;
        const actualImageSize = Math.min(imageSize, maxImageSize);
        const imageCenterX = imageX + (imageColumnWidth - actualImageSize) / 2;

        const imageDataUrl = imageCache[item.id.toString()];
        if (imageDataUrl) {
          try {
            // Add the actual product image (JPEG format for better performance)
            // Use calculated position and size to ensure proper containment
            doc.addImage(
              imageDataUrl,
              'JPEG',
              imageCenterX,
              imageY,
              actualImageSize,
              actualImageSize,
            );
          } catch (error) {
            console.warn(`Failed to add image for product ${item.id}:`, error);
            // Fallback to placeholder
            doc.setFillColor(240, 240, 240);
            doc.rect(imageCenterX, imageY, actualImageSize, actualImageSize, 'F');
          }
        } else {
          // No image available, show placeholder
          doc.setFillColor(240, 240, 240);
          doc.rect(imageCenterX, imageY, actualImageSize, actualImageSize, 'F');
        }

        // Product name (column 2) - 3 lines
        const productName = item.productTitle || 'Unknown Product';
        const productLines = wrapText(productName, columns[1].width - cellPadding * 2, 3);
        productLines.forEach((line, index) => {
          doc.text(line, columnPositions[1] + cellPadding, y + 4 + index * 3);
        });

        // SKU/Barcode (column 3) - 2 lines each, positioned separately
        const skuText = item.sku || 'N/A';
        const barcodeText = item.productBarcode || 'N/A';

        // SKU lines (top part)
        const skuLines = wrapText(skuText, columns[2].width - cellPadding * 2, 2);
        skuLines.forEach((line, index) => {
          doc.text(line, columnPositions[2] + cellPadding, y + 4 + index * 3);
        });

        // Barcode lines (bottom part, below SKU) - make bold
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        const barcodeLines = wrapText(barcodeText, columns[2].width - cellPadding * 2, 2);
        const skuLineCount = skuLines.length;
        barcodeLines.forEach((line, index) => {
          // Position barcode below SKU lines with proper spacing
          const barcodeY = y + 4 + skuLineCount * 3 + 2 + index * 3;
          doc.text(line, columnPositions[2] + cellPadding, barcodeY);
        });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        // Quantity (column 4)
        doc.setFont('helvetica', 'bold');
        doc.text(item.quantityPlanned.toString(), columnPositions[3] + cellPadding, y + 8);
        doc.setFont('helvetica', 'normal');

        // Price (column 5)
        const currencyPrefix = 'Rs.';
        doc.text(
          `${currencyPrefix} ${item.unitPrice?.toFixed(2) || '0.00'}`,
          columnPositions[4] + cellPadding,
          y + 8,
        );

        y += rowHeight;
      }

      // Add footer
      const footerY = pageHeight - margin - 10;
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128); // Gray text for footer
      doc.text(
        `Generated on ${new Date().toLocaleString()} • MyLittleTales Admin`,
        pageWidth / 2,
        footerY,
        { align: 'center' },
      );
      doc.text(`Page 1 of 1`, pageWidth - margin, footerY, { align: 'right' });

      // Save the PDF
      try {
        doc.save(`${shipment.shipmentNumber}_product_list.pdf`);

        notifications.show({
          title: 'Export Complete',
          message: 'Product list exported successfully',
          color: 'green',
        });
      } catch (saveError) {
        console.error('Error saving PDF:', saveError);
        throw new Error('Failed to save PDF file');
      }
    } catch (error) {
      console.error('Error exporting product list:', error);
      notifications.show({
        title: 'Export Failed',
        message: 'Failed to export product list. Check console for details.',
        color: 'red',
      });
    } finally {
      setExportListLoading(false);
    }
  };

  // Export CSV functionality
  const exportCsv = async () => {
    if (!shipment || !shipment.items || shipment.items.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'No items to export',
        color: 'red',
      });
      return;
    }

    try {
      setExportCsvLoading(true);

      // Define columns for CSV export
      const columns: ExportColumn<unknown>[] = [
        {
          key: 'productTitle',
          label: 'Product Name',
          width: 30,
        },
        {
          key: 'sku',
          label: 'SKU',
          width: 15,
        },
        {
          key: 'productBarcode',
          label: 'Barcode',
          width: 20,
        },
        {
          key: 'quantityPlanned',
          label: 'Quantity',
          width: 10,
          formatter: (value) => value?.toString() || '0',
        },
        {
          key: 'unitPrice',
          label: 'Unit Price (Rs.)',
          width: 15,
          formatter: (value) => {
            const price = typeof value === 'number' ? value : Number(value) || 0;
            return price.toFixed(2);
          },
        },
        {
          key: 'productImageUrl',
          label: 'Image URL',
          width: 25,
          isImage: true,
        },
        {
          key: 'shopifyVariantId',
          label: 'Variant ID',
          width: 20,
        },
      ];

      // Prepare data for export
      const data = shipment.items.map((item) => ({
        ...item,
        // Ensure all required fields are present
        productTitle: item.productTitle || 'Unknown Product',
        sku: item.sku || 'N/A',
        productBarcode: item.productBarcode || 'N/A',
        quantityPlanned: item.quantityPlanned || 0,
        unitPrice: item.unitPrice || 0,
        productImageUrl: item.productImageUrl || '',
        shopifyVariantId: item.shopifyVariantId || 'N/A',
      }));

      // Export to CSV
      await ExportUtils.exportToCSV({
        filename: `${shipment.shipmentNumber}_shipment_items`,
        title: `Shipment Items - ${shipment.shipmentNumber}`,
        subtitle: `Generated on ${new Date().toLocaleDateString()}`,
        columns,
        data,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      notifications.show({
        title: 'Export Failed',
        message: 'Failed to export CSV file. Please try again.',
        color: 'red',
      });
    } finally {
      setExportCsvLoading(false);
    }
  };

  return {
    exportBarcodesLoading,
    exportListLoading,
    exportCsvLoading,
    exportBarcodes,
    exportProductList,
    exportCsv,
  };
};
