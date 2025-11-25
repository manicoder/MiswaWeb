import type jsPDF from 'jspdf';
import { notifications } from '@mantine/notifications';
import type { Styles } from 'jspdf-autotable';

export interface ExportColumn<T> {
  key: string;
  label: string;
  formatter?: (value: unknown, row: T, index?: number) => string;
  width?: number;
  isImage?: boolean; // Indicates this column contains image URLs
}

export interface ExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  columns: ExportColumn<unknown>[];
  data: unknown[];
  orientation?: 'portrait' | 'landscape';
  fontSize?: number;
}

export class ExportUtils {
  static async exportToCSV(options: ExportOptions): Promise<void> {
    try {
      const { filename, columns, data } = options;

      // Prepare headers
      const headers = columns.map((col) => col.label);

      // Prepare data rows
      const rows = data.map((item, index) =>
        columns.map((col) => {
          const value = this.getNestedValue(item as Record<string, unknown>, col.key);
          const formatted = col.formatter
            ? col.formatter(value, item, index)
            : this.formatValue(value);
          // For image columns in CSV, show URL or "No Image"
          if (col.isImage) {
            return formatted || 'No Image';
          }
          return formatted;
        }),
      );

      // Combine headers and data
      const csvData = [headers, ...rows];

      // Dynamically import Papa Parse
      const { default: Papa } = await import('papaparse');

      // Convert to CSV string
      const csvString = Papa.unparse(csvData, {
        header: false,
        delimiter: ',',
        quotes: true,
      });

      // Download file
      this.downloadFile(csvString, `${filename}.csv`, 'text/csv');

      notifications.show({
        title: 'Export Successful',
        message: 'CSV file has been downloaded successfully!',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Export Failed',
        message: 'Failed to export CSV file. Please try again.' + error,
        color: 'red',
      });
    }
  }

  static async exportToExcel(options: ExportOptions): Promise<void> {
    try {
      const { filename, title, columns, data } = options;

      // Prepare headers
      const headers = columns.map((col) => col.label);

      // Prepare data rows
      const rows = data.map((item, index) =>
        columns.map((col) => {
          const value = this.getNestedValue(item as Record<string, unknown>, col.key);
          const formatted = col.formatter
            ? col.formatter(value, item, index)
            : this.formatValue(value);
          // For image columns in Excel, show URL or "No Image"
          if (col.isImage) {
            return formatted || 'No Image';
          }
          return formatted;
        }),
      );

      // Dynamically import XLSX
      const XLSX = await import('xlsx');

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();

      // Add title row
      const worksheetData = [
        [title], // Title row
        [], // Empty row
        headers, // Header row
        ...rows, // Data rows
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Style the title row (merge cells)
      if (!worksheet['!merges']) worksheet['!merges'] = [];
      worksheet['!merges'].push({
        s: { c: 0, r: 0 }, // Start cell
        e: { c: headers.length - 1, r: 0 }, // End cell
      });

      // Set column widths
      const colWidths = columns.map((col) => ({ wch: col.width || 15 }));
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

      // Export file
      XLSX.writeFile(workbook, `${filename}.xlsx`);

      notifications.show({
        title: 'Export Successful',
        message: 'Excel file has been downloaded successfully!',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Export Failed',
        message: 'Failed to export Excel file. Please try again.',
        color: 'red',
      });
    }
  }

  static async exportToPDF(options: ExportOptions): Promise<void> {
    try {
      const {
        filename,
        title,
        subtitle,
        columns,
        data,
        orientation = 'landscape',
        fontSize = 9,
      } = options;

      // Dynamically import jsPDF
      const { default: jsPDFConstructor } = await import('jspdf');

      const doc = new jsPDFConstructor({
        orientation,
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = orientation === 'portrait' ? 210 : 297;
      const pageHeight = orientation === 'portrait' ? 297 : 210;
      const margin = 15;

      // Professional header with company branding
      this.addProfessionalHeader(doc, pageWidth, margin, title, subtitle);

      const yPosition = 55;

      // Load images for image columns
      const imageColumnIndexes = columns
        .map((col, index) => (col.isImage ? index : -1))
        .filter((i) => i !== -1);
      const rowImages: (string | null)[][] = [];

      if (imageColumnIndexes.length > 0) {
        notifications.show({
          title: 'Creating Professional PDF',
          message: `Processing ${data.length} records with high-quality images...`,
          color: 'blue',
          autoClose: false,
          id: 'pdf-image-loading',
        });

        for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
          const item = data[rowIndex];
          const imageRow: (string | null)[] = [];

          for (const colIndex of imageColumnIndexes) {
            const col = columns[colIndex];
            const value = this.getNestedValue(item as Record<string, unknown>, col.key);
            const imageUrl = col.formatter
              ? col.formatter(value, item, rowIndex)
              : this.formatValue(value);

            if (imageUrl && imageUrl !== '' && imageUrl !== 'No Image') {
              try {
                const base64Image = await this.loadImageAsBase64(imageUrl);
                imageRow[colIndex] = base64Image;
              } catch {
                imageRow[colIndex] = null;
              }
            } else {
              imageRow[colIndex] = null;
            }
          }
          rowImages.push(imageRow);
        }

        notifications.update({
          id: 'pdf-image-loading',
          title: 'Finalizing Professional PDF',
          message: 'Applying professional styling and layout...',
          color: 'blue',
        });
      }

      // Prepare table data
      const headers = columns.map((col) => col.label);
      const rows = data.map((item, index) =>
        columns.map((col) => {
          if (col.isImage) {
            return ''; // Images will be added separately
          }
          const value = this.getNestedValue(item as Record<string, unknown>, col.key);
          const formatted = col.formatter
            ? col.formatter(value, item, index)
            : this.formatValue(value);
          return String(formatted).substring(0, 50);
        }),
      );

      // Professional table styling
      const availableWidth = pageWidth - margin * 2;
      const columnWidths = this.calculateProfessionalColumnWidths(columns, availableWidth);

      // Dynamically import autoTable
      const { default: autoTable } = await import('jspdf-autotable');

      // Create professional table
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: yPosition,
        styles: {
          fontSize: fontSize,
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle',
          minCellHeight: imageColumnIndexes.length > 0 ? 35 : 12,
          lineColor: [220, 220, 220],
          lineWidth: 0.5,
          textColor: [50, 50, 50],
        },
        headStyles: {
          fillColor: [41, 98, 255], // Professional blue
          textColor: [255, 255, 255],
          fontSize: fontSize + 1,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          cellPadding: 4,
          minCellHeight: 15,
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250], // Very light gray
        },
        margin: { top: yPosition, right: margin, bottom: margin, left: margin },
        tableWidth: 'auto',
        columnStyles: columnWidths.reduce(
          (acc, width, index) => {
            acc[index] = {
              cellWidth: width,
              halign: columns[index].isImage ? 'center' : 'left',
              valign: 'middle',
            };
            return acc;
          },
          {} as { [key: string]: Partial<Styles> },
        ),
        theme: 'grid',
        showHead: 'everyPage',
        didDrawCell: (data: unknown) => {
          if (
            typeof data === 'object' &&
            data !== null &&
            'column' in data &&
            'row' in data &&
            'cell' in data &&
            'section' in data &&
            Array.isArray(rowImages)
          ) {
            const d = data as {
              column: { index: number };
              row: { index: number };
              cell: { x: number; y: number; width: number; height: number };
              section: string;
            };
            if (imageColumnIndexes.includes(d.column.index) && d.section === 'body') {
              const rowIndex = d.row.index;
              const colIndex = d.column.index;
              const base64Image = rowImages[rowIndex]?.[colIndex];
              if (base64Image) {
                try {
                  const cellX = d.cell.x + 3;
                  const cellY = d.cell.y + 3;
                  const imageSize = Math.min(d.cell.width - 6, d.cell.height - 6, 25);
                  doc.addImage(base64Image, 'JPEG', cellX, cellY, imageSize, imageSize);
                } catch {
                  this.addImagePlaceholder(doc, d.cell.x, d.cell.y, d.cell.width, d.cell.height);
                }
              } else {
                this.addImagePlaceholder(doc, d.cell.x, d.cell.y, d.cell.width, d.cell.height);
              }
            }
          }
        },
      });

      // Add professional footer
      this.addProfessionalFooter(doc, pageWidth, pageHeight, margin, data.length);

      // Save file with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      doc.save(`${filename}_${timestamp}.pdf`);

      notifications.hide('pdf-image-loading');
      notifications.show({
        title: 'Export Successful',
        message: 'Professional PDF with images has been downloaded successfully!',
        color: 'green',
      });
    } catch {
      notifications.hide('pdf-image-loading');
      notifications.show({
        title: 'Export Failed',
        message: 'Failed to export PDF file. Please try again.',
        color: 'red',
      });
    }
  }

  private static addProfessionalHeader(
    doc: jsPDF,
    pageWidth: number,
    margin: number,
    title: string,
    subtitle?: string,
  ): void {
    // Header background
    doc.setFillColor(41, 98, 255);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Company logo area (placeholder)
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, 8, 30, 12, 'F');
    doc.setFontSize(8);
    doc.setTextColor(41, 98, 255);
    doc.text('MLT ADMIN', margin + 2, 16);

    // Main title
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 40, 18);

    // Subtitle
    if (subtitle) {
      doc.setFontSize(12);
      doc.setTextColor(200, 200, 255);
      doc.text(subtitle, margin + 40, 28);
    }

    // Generation info
    doc.setFontSize(9);
    doc.setTextColor(220, 220, 255);
    const date = new Date().toLocaleString();
    doc.text(`Generated: ${date}`, pageWidth - margin - 50, 16);

    // Reset colors
    doc.setTextColor(0, 0, 0);
  }

  private static addProfessionalFooter(
    doc: jsPDF,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    recordCount: number,
  ): void {
    const footerY = pageHeight - 15;

    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total Records: ${recordCount}`, margin, footerY);
    doc.text(`Page 1`, pageWidth - margin - 20, footerY);
    doc.text('Confidential - MLT Admin System', pageWidth / 2 - 30, footerY);
  }

  private static addImagePlaceholder(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    // Light gray background
    doc.setFillColor(245, 245, 245);
    doc.rect(x + 3, y + 3, width - 6, height - 6, 'F');

    // Border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(x + 3, y + 3, width - 6, height - 6, 'S');

    // Placeholder text
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    doc.text('No Image', centerX - 8, centerY);
  }

  private static calculateProfessionalColumnWidths(
    columns: ExportColumn<unknown>[],
    availableWidth: number,
  ): number[] {
    const totalPreferredWidth = columns.reduce((sum, col) => sum + (col.width || 20), 0);
    const scaleFactor = availableWidth / totalPreferredWidth;

    return columns.map((col) => {
      const preferredWidth = col.width || 20;
      const scaledWidth = preferredWidth * scaleFactor;

      // Ensure minimum widths
      if (col.isImage) {
        return Math.max(scaledWidth, 35); // Minimum for images
      }
      return Math.max(scaledWidth, 15); // Minimum for text
    });
  }

  private static async loadImageAsBase64(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Set canvas size to 150x150 for better quality
          canvas.width = 150;
          canvas.height = 150;

          if (ctx) {
            // Set white background for better image quality
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 150, 150);

            // Calculate scaling to maintain aspect ratio
            const scale = Math.min(150 / img.width, 150 / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const x = (150 - scaledWidth) / 2;
            const y = (150 - scaledHeight) / 2;

            // Draw image centered and scaled
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            const base64 = canvas.toDataURL('image/jpeg', 0.9);
            resolve(base64);
          } else {
            reject(new Error('Could not get canvas context'));
          }
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };

      // Add timestamp to bypass cache issues
      const urlWithTimestamp = imageUrl.includes('?')
        ? `${imageUrl}&t=${Date.now()}`
        : `${imageUrl}?t=${Date.now()}`;

      img.src = urlWithTimestamp;
    });
  }

  private static getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path
      .split('.')
      .reduce<unknown>(
        (current, key) =>
          current && typeof current === 'object'
            ? (current as Record<string, unknown>)[key]
            : undefined,
        obj,
      );
  }

  private static formatValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Shopify-specific export configurations
export const ShopifyExportConfigs = {
  products: {
    columns: [
      {
        key: 'images',
        label: 'Product Photo',
        width: 20,
        isImage: true,
        formatter: (images: unknown) => {
          if (!Array.isArray(images) || images.length === 0) return '';
          const img = images[0] as { url?: string; src?: string };
          return img?.url || img?.src || '';
        },
      },
      { key: 'title', label: 'Product Title', width: 25 },
      { key: 'handle', label: 'Handle', width: 20 },
      { key: 'status', label: 'Status', width: 12 },
      { key: 'vendor', label: 'Vendor', width: 15 },
      { key: 'productType', label: 'Product Type', width: 15 },
      {
        key: 'variants',
        label: 'Total Inventory',
        width: 12,
        formatter: (variants: unknown) => {
          if (!Array.isArray(variants) || variants.length === 0) return '0';
          return variants
            .reduce(
              (total, variant) =>
                total +
                (typeof variant === 'object' && variant && 'inventoryQuantity' in variant
                  ? (variant as { inventoryQuantity?: number }).inventoryQuantity || 0
                  : 0),
              0,
            )
            .toString();
        },
      },
      {
        key: 'variants',
        label: 'Price Range',
        width: 15,
        formatter: (variants: unknown) => {
          if (!Array.isArray(variants) || variants.length === 0) return 'N/A';
          const prices = variants
            .map((v) =>
              typeof v === 'object' && v && 'price' in v
                ? parseFloat((v as { price: string | number }).price as string)
                : NaN,
            )
            .filter((p) => !isNaN(p));
          if (prices.length === 0) return 'N/A';
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          return min === max ? `₹${min.toFixed(2)}` : `₹${min.toFixed(2)} - ₹${max.toFixed(2)}`;
        },
      },
      {
        key: 'createdAt',
        label: 'Created Date',
        width: 15,
        formatter: (date: string) => {
          if (!date) return '';
          return new Date(date).toLocaleDateString();
        },
      },
      {
        key: 'updatedAt',
        label: 'Updated Date',
        width: 15,
        formatter: (date: string) => {
          if (!date) return '';
          return new Date(date).toLocaleDateString();
        },
      },
    ] as ExportColumn<unknown>[],
  },

  orders: {
    columns: [
      {
        key: 'lineItems',
        label: 'Product Photo',
        width: 20,
        isImage: true,
        formatter: (lineItems: unknown) => {
          if (!Array.isArray(lineItems) || lineItems.length === 0) return '';
          const firstItem = lineItems[0] as { image?: { url?: string; src?: string } };
          return firstItem?.image?.url || firstItem?.image?.src || '';
        },
      },
      { key: 'orderNumber', label: 'Order Number', width: 15 },
      { key: 'name', label: 'Order Name', width: 15 },
      {
        key: 'customer.displayName',
        label: 'Customer',
        width: 20,
        formatter: (value: unknown, row: unknown) => {
          if (typeof value === 'string' && value) return value;
          if (row && typeof row === 'object' && 'customer' in row) {
            const customer = (row as { customer?: { firstName?: string; lastName?: string } })
              .customer;
            const firstName = customer?.firstName || '';
            const lastName = customer?.lastName || '';
            return `${firstName} ${lastName}`.trim() || 'Guest';
          }
          return 'Guest';
        },
      },
      { key: 'customer.email', label: 'Customer Email', width: 25 },
      {
        key: 'totalPrice',
        label: 'Total Amount',
        width: 12,
        formatter: (value: string) => {
          return `₹${parseFloat(value || '0').toFixed(2)}`;
        },
      },
      { key: 'fulfillmentStatus', label: 'Fulfillment Status', width: 15 },
      { key: 'financialStatus', label: 'Financial Status', width: 15 },
      {
        key: 'lineItems',
        label: 'Items Count',
        width: 10,
        formatter: (items: unknown) => {
          return Array.isArray(items) ? items.length.toString() : '0';
        },
      },
      {
        key: 'createdAt',
        label: 'Order Date',
        width: 15,
        formatter: (date: string) => {
          if (!date) return '';
          return new Date(date).toLocaleDateString();
        },
      },
      {
        key: 'processedAt',
        label: 'Processed Date',
        width: 15,
        formatter: (date: string) => {
          if (!date) return '';
          return new Date(date).toLocaleDateString();
        },
      },
    ] as ExportColumn<unknown>[],
  },

  unfulfilledProducts: {
    columns: [
      {
        key: 'image',
        label: 'Product Photo',
        width: 20,
        isImage: true,
        formatter: (image: unknown) => {
          if (!image || typeof image !== 'object') return '';
          return (
            (image as { url?: string; src?: string }).url ||
            (image as { url?: string; src?: string }).src ||
            ''
          );
        },
      },
      { key: 'title', label: 'Product Title', width: 30 },
      { key: 'quantity', label: 'Quantity Needed', width: 15 },
      {
        key: 'price',
        label: 'Unit Price',
        width: 12,
        formatter: (value: string) => {
          return `₹${parseFloat(value || '0').toFixed(2)}`;
        },
      },
      {
        key: 'orders',
        label: 'Orders Count',
        width: 12,
        formatter: (orders: unknown[]) => {
          return orders ? orders.length.toString() : '0';
        },
      },
      {
        key: 'orders',
        label: 'Order Numbers',
        width: 25,
        formatter: (orders: unknown) => {
          if (!Array.isArray(orders) || orders.length === 0) return '';
          return orders.map((order) => (order as { orderNumber?: string }).orderNumber).join(', ');
        },
      },
      {
        key: 'orders',
        label: 'Customers',
        width: 25,
        formatter: (orders: unknown) => {
          if (!Array.isArray(orders) || orders.length === 0) return '';
          const customers = orders.map((order) => {
            const customer = (
              order as {
                customer?: { displayName?: string; firstName?: string; lastName?: string };
              }
            ).customer;
            return (
              customer?.displayName ||
              `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
              'Guest'
            );
          });
          return [...new Set(customers)].join(', ');
        },
      },
    ] as ExportColumn<unknown>[],
  },

  topSellingProducts: {
    columns: [
      {
        key: 'imageUrl',
        label: 'Product Photo',
        width: 20,
        isImage: true,
        formatter: (imageUrl: string) => {
          return imageUrl || '';
        },
      },
      { key: 'name', label: 'Product Name', width: 35 },
      { key: 'quantity', label: 'Quantity Sold', width: 15 },
      {
        key: 'revenue',
        label: 'Revenue',
        width: 15,
        formatter: (value: number) => {
          return `₹${value.toFixed(2)}`;
        },
      },
      {
        key: 'cost',
        label: 'Cost',
        width: 15,
        formatter: (value: number) => {
          return `₹${value.toFixed(2)}`;
        },
      },
      {
        key: 'profit',
        label: 'Profit',
        width: 15,
        formatter: (value: number) => {
          return `₹${value.toFixed(2)}`;
        },
      },
      {
        key: 'margin',
        label: 'Margin %',
        width: 15,
        formatter: (value: number) => {
          return `${value.toFixed(1)}%`;
        },
      },
    ] as ExportColumn<unknown>[],
  },
};
