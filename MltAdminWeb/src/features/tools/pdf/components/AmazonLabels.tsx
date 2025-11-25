import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Button,
  FileInput,
  Select,
  Checkbox,
  Alert,
  Progress,
  Badge,
  Divider,
  Image,
  ActionIcon,
  Tooltip,
  Table,
  TextInput,
  NumberInput,
  SegmentedControl,
  Box,
  Loader,
} from '@mantine/core';
import {
  IconUpload,
  IconDownload,
  IconFileTypeCsv,
  IconTag,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconPhoto,
  IconTrash,
  IconPlus,
  IconSearch,
} from '@tabler/icons-react';
import JsBarcode from 'jsbarcode';
import JSZip from 'jszip';
import defaultLogoSrc from '../../../../assets/mlt_logo.svg';
import type { jsPDF } from 'jspdf';
import type { ShopifyProduct } from '../../../../types/shopify';
import { ENV } from '../../../../config/environment';

interface ProductData {
  title: string;
  fnsku: string;
  mrp: string;
  qty: number;
}

interface LabelOptions {
  layout: 'single' | 'multiple';
  separateFiles: boolean;
  fullProductImage: boolean;
}

const AmazonLabels: React.FC = () => {
  const [inputMode, setInputMode] = useState<'csv' | 'manual'>('csv');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(defaultLogoSrc); // Initially use SVG, will update to PNG when converted
  const [productData, setProductData] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [useDefaultLogo, setUseDefaultLogo] = useState<boolean>(true);

  // Manual input state
  const [manualProducts, setManualProducts] = useState<ProductData[]>([
    { title: '', fnsku: '', mrp: '', qty: 1 }
  ]);

  // Product search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ShopifyProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<ShopifyProduct[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  const [options, setOptions] = useState<LabelOptions>({
    layout: 'single',
    separateFiles: false,
    fullProductImage: false,
  });

  // For SVG to PNG conversion
  const [defaultLogoPngUrl, setDefaultLogoPngUrl] = useState<string | null>(null);

  // Convert SVG to PNG for PDF compatibility
  useEffect(() => {
    // Create an image element to load the SVG
    const img = document.createElement('img');
    img.src = defaultLogoSrc;

    img.onload = () => {
      // Create a canvas to draw the image
      const canvas = document.createElement('canvas');
      canvas.width = 300; // Set appropriate size
      canvas.height = 300;

      // Draw the image on the canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert canvas to PNG data URL
        const pngDataUrl = canvas.toDataURL('image/png');
        setDefaultLogoPngUrl(pngDataUrl);
        console.log('✅ Successfully converted SVG logo to PNG');

        // Update the logo preview if using default logo
        if (useDefaultLogo) {
          setLogoPreview(pngDataUrl);
        }
      }
    };

    img.onerror = (error) => {
      console.error('❌ Failed to load SVG logo:', error);
      setDefaultLogoPngUrl(null);
    };
  }, [useDefaultLogo]);

  // Preview table state
  const [previewData, setPreviewData] = useState<ProductData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  // Fallback barcode generation using simple bars
  const generateFallbackBarcode = (fnsku: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create simple barcode pattern
      ctx.fillStyle = '#000000';
      const barWidth = 2;
      const barHeight = 30;
      const startY = 10;

      // Generate pseudo-random but consistent pattern based on FNSKU
      let x = 10;
      for (let i = 0; i < fnsku.length; i++) {
        const charCode = fnsku.charCodeAt(i);
        const pattern = charCode % 8; // 8 different patterns

        for (let j = 0; j < pattern; j++) {
          if (j % 2 === 0) {
            ctx.fillRect(x, startY, barWidth, barHeight);
          }
          x += barWidth;
        }
        x += barWidth; // Space between character patterns
      }
    }

    return canvas.toDataURL('image/png', 1.0);
  };

  const downloadExampleTemplate = () => {
    const csvContent = `Title,FNSKU,MRP,Qty
"MyLittleTales Tiger Educational Toy - Skills Development, Ideal Gift",X00284X37B,2400,5
"Educational Wooden Blocks Set - Learning Toy for Kids",X00567X89C,1800,3
"Creative Art Set with Colors, Brushes & Canvas - Perfect for Children",X00890X12D,3200,2
"Wooden Puzzle Game, Educational & Fun Activity Set",X00111X22E,1500,1`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'amazon-labels-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogoUpload = (file: File | null) => {
    if (file) {
      setLogoFile(file);
      setUseDefaultLogo(false);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoFile(null);
      setUseDefaultLogo(true);
      // Use the converted PNG if available, otherwise fallback to SVG
      setLogoPreview(defaultLogoPngUrl || defaultLogoSrc);
    }
  };

  // Helper function to clean special characters and emojis
  const cleanText = (text: string): string => {
    if (!text) return '';

    return (
      text
        .toString()
        .trim()
        // Remove emojis and special Unicode characters
        .replace(
          /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
          '',
        )
        // Remove other problematic characters like (replacement character)
        .replace(/[\uFFFD\u200B-\u200D\uFEFF]/g, '')
        // Remove any remaining non-printable characters using a filter function
        .split('')
        .filter((c) => {
          const code = c.charCodeAt(0);
          return (
            (code >= 32 && code !== 127 && code <= 55295) ||
            (code >= 57344 && code <= 65533) ||
            (code >= 65536 && code <= 1114111)
          );
        })
        .join('')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
        .trim()
    );
  };

  // Helper function to properly parse CSV with quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current.trim());

    return result;
  };

  const processCsvFile = async (file: File): Promise<ProductData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line);

          if (lines.length < 2) {
            throw new Error('CSV file must contain at least a header row and one data row');
          }

          // Parse header to find column indices using proper CSV parsing
          const headers = parseCSVLine(lines[0]).map((h) =>
            h.trim().toLowerCase().replace(/"/g, ''),
          );

          console.log('📋 CSV Headers detected:', headers);

          const titleIndex = headers.findIndex((h) => h.includes('title'));
          const fnskuIndex = headers.findIndex((h) => h.includes('fnsku'));
          const mrpIndex = headers.findIndex((h) => h.includes('mrp'));
          const qtyIndex = headers.findIndex((h) => h.includes('qty') || h.includes('quantity'));

          console.log('📍 Column indices found:', {
            title: titleIndex,
            fnsku: fnskuIndex,
            mrp: mrpIndex,
            qty: qtyIndex,
          });

          if (titleIndex === -1 || fnskuIndex === -1 || mrpIndex === -1 || qtyIndex === -1) {
            throw new Error(
              `CSV must contain columns: Title, FNSKU, MRP, Qty. Found headers: ${headers.join(
                ', ',
              )}`,
            );
          }

          const products: ProductData[] = [];
          let skippedRows = 0;
          const skipReasons: { [key: string]: number } = {
            emptyTitle: 0,
            emptyFNSKU: 0,
            emptyMRP: 0,
            zeroMRP: 0,
            invalidQty: 0,
            insufficientColumns: 0,
          };

          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]).map((v) => v.trim().replace(/"/g, ''));

            if (values.length >= Math.max(titleIndex, fnskuIndex, mrpIndex, qtyIndex) + 1) {
              // Debug: Log the raw values for the first few rows
              if (i <= 3) {
                console.log(`🔍 Row ${i + 1} raw values:`, {
                  all_values: values,
                  title_index: titleIndex,
                  fnsku_index: fnskuIndex,
                  mrp_index: mrpIndex,
                  qty_index: qtyIndex,
                  title_raw: values[titleIndex],
                  fnsku_raw: values[fnskuIndex],
                  mrp_raw: values[mrpIndex],
                  qty_raw: values[qtyIndex],
                });
              }

              // Clean all text fields to remove special characters and emojis
              const originalTitle = values[titleIndex]?.trim() || '';
              const title = cleanText(values[titleIndex]);
              const fnsku = cleanText(values[fnskuIndex]);
              const originalMrp = values[mrpIndex]?.trim() || '';
              const mrp = cleanText(values[mrpIndex]);
              const originalQty = values[qtyIndex]?.trim() || '';
              const qty = parseInt(values[qtyIndex]) || 1;

              // Debug: Log processed values for problematic rows
              if (i <= 3 || parseFloat(mrp) <= 1) {
                console.log(`🔍 Row ${i + 1} processed:`, {
                  title,
                  fnsku,
                  mrp_original: originalMrp,
                  mrp_cleaned: mrp,
                  mrp_parsed: parseFloat(mrp),
                  qty_original: originalQty,
                  qty_parsed: qty,
                });
              }

              // Log if text was cleaned (contains special characters)
              if (originalTitle !== title && originalTitle.length > 0) {
                console.log(`🧹 Row ${i + 1}: Cleaned title "${originalTitle}" → "${title}"`);
              }

              // Validate required fields
              if (!title || title.length === 0) {
                console.warn(`⚠️ Row ${i + 1}: Empty title (after cleaning), skipping...`);
                skippedRows++;
                skipReasons.emptyTitle++;
                continue;
              }

              if (!fnsku || fnsku.length === 0) {
                console.warn(`⚠️ Row ${i + 1}: Empty FNSKU for "${title}", skipping...`);
                skippedRows++;
                skipReasons.emptyFNSKU++;
                continue;
              }

              if (!mrp || mrp.length === 0) {
                console.warn(`⚠️ Row ${i + 1}: Empty MRP for "${title}", skipping...`);
                skippedRows++;
                skipReasons.emptyMRP++;
                continue;
              }

              // Check if MRP is 0
              const mrpValue = parseFloat(mrp);
              if (mrpValue === 0 || isNaN(mrpValue)) {
                console.warn(
                  `⚠️ Row ${i + 1}: MRP is 0 or invalid (${mrp}) for "${title}", skipping...`,
                );
                skippedRows++;
                skipReasons.zeroMRP++;
                continue;
              }

              if (qty <= 0) {
                console.warn(
                  `⚠️ Row ${i + 1}: Invalid quantity (${qty}) for "${title}", skipping...`,
                );
                skippedRows++;
                skipReasons.invalidQty++;
                continue;
              }

              // Create multiple entries based on quantity
              for (let j = 0; j < qty; j++) {
                products.push({
                  title: title,
                  fnsku: fnsku,
                  mrp: mrp,
                  qty: 1,
                });
              }
            } else {
              console.warn(`⚠️ Row ${i + 1}: Insufficient columns, skipping...`);
              skippedRows++;
              skipReasons.insufficientColumns++;
            }
          }

          console.log(`📊 CSV Processing Summary:`);
          console.log(`   ✅ Valid rows: ${lines.length - 1 - skippedRows}`);
          console.log(`   ❌ Skipped rows: ${skippedRows}`);
          console.log(`   📦 Total labels: ${products.length}`);

          if (skippedRows > 0) {
            console.log(`\n📋 Detailed Skip Reasons:`);
            if (skipReasons.emptyTitle > 0)
              console.log(`   🏷️ Empty titles: ${skipReasons.emptyTitle}`);
            if (skipReasons.emptyFNSKU > 0)
              console.log(`   📝 Empty FNSKU: ${skipReasons.emptyFNSKU}`);
            if (skipReasons.emptyMRP > 0) console.log(`   💰 Empty MRP: ${skipReasons.emptyMRP}`);
            if (skipReasons.zeroMRP > 0)
              console.log(`   💸 MRP is 0 or invalid: ${skipReasons.zeroMRP}`);
            if (skipReasons.invalidQty > 0)
              console.log(`   🔢 Invalid quantity: ${skipReasons.invalidQty}`);
            if (skipReasons.insufficientColumns > 0)
              console.log(`   📊 Insufficient columns: ${skipReasons.insufficientColumns}`);
          }

          if (products.length === 0) {
            throw new Error(
              'No valid products found in CSV. Please check that all required fields (Title, FNSKU, MRP, Qty) are filled and MRP is greater than 0.',
            );
          }

          if (skippedRows > 0) {
            console.warn(
              `\n⚠️ ${skippedRows} rows were skipped due to missing or invalid data. Check detailed breakdown above.`,
            );
          }

          resolve(products);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  };

  const generateBarcode = async (fnsku: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Use setTimeout to make this truly async and prevent blocking
      setTimeout(async () => {
        try {
          // Validate FNSKU
          if (!fnsku || typeof fnsku !== 'string' || fnsku.trim().length === 0) {
            throw new Error('Invalid FNSKU: empty, null, or not a string');
          }

          const cleanFnsku = fnsku.trim().toUpperCase();

          // Validate FNSKU format (basic Amazon FNSKU pattern)
          if (!/^[A-Z0-9]{10}$/.test(cleanFnsku)) {
            console.warn(`FNSKU "${cleanFnsku}" doesn't match expected format, but proceeding...`);
          }

          // Create a fresh canvas for each barcode to avoid conflicts
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 50;

          // Get context and clear
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }

          // Clear canvas with white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Generate barcode with explicit settings
          JsBarcode(canvas, cleanFnsku, {
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

          // Small delay to let the canvas render
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Verify canvas has content
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const hasContent = imageData.data.some((pixel, index) => {
            // Check if any pixel is not white (assuming white background)
            if ((index + 1) % 4 === 0) return false; // Skip alpha channel
            return pixel < 255;
          });

          if (!hasContent) {
            throw new Error('Barcode generation produced empty canvas');
          }

          const dataUrl = canvas.toDataURL('image/png', 1.0);

          // Validate data URL
          if (!dataUrl.startsWith('data:image/png;base64,')) {
            throw new Error('Invalid barcode data URL generated');
          }

          console.log(`✅ Successfully generated barcode for FNSKU: ${cleanFnsku}`);
          resolve(dataUrl);
        } catch (error) {
          console.warn(`⚠️ JsBarcode failed for FNSKU: ${fnsku}, trying fallback...`, error);

          try {
            // Use fallback barcode generation
            const fallbackDataUrl = generateFallbackBarcode(fnsku.trim());
            console.log(`✅ Generated fallback barcode for FNSKU: ${fnsku}`);
            resolve(fallbackDataUrl);
          } catch (fallbackError) {
            console.error(
              `❌ Both barcode generation methods failed for FNSKU: ${fnsku}`,
              fallbackError,
            );
            reject(
              new Error(
                `All barcode generation methods failed: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              ),
            );
          }
        }
      }, 5); // Small initial delay to ensure async execution
    });
  };

  // const truncateTitle = (title: string, maxLength: number = 35, front: number = 20, end: number = 8): string => {
  //   if (!title || title.length <= maxLength) return title;
  //   return `${title.slice(0, front)}...${title.slice(-end)}`;
  // };

  // Function to extract brand name and create the title format for labels
  const formatLabelTitle = (title: string): string => {
    if (!title) return 'New';

    // Clean the title first
    const cleanedTitle = cleanText(title);

    // Extract brand name (assuming brand is before first space or dash)
    // For titles like "MyLittleTales Tiger Educational Toy - Skills Development"
    let brandName = '';
    let description = '';

    // Look for patterns like "BrandName Product - Description" or "BrandName Product Description"
    const titleParts = cleanedTitle.split(/[\s-]+/);

    if (titleParts.length > 0) {
      // Take the first part as brand name
      brandName = titleParts[0];

      // Take the rest as description, but focus on key descriptive words
      const descriptionParts = titleParts.slice(1);

      // Filter for meaningful words (skip common words)
      const meaningfulWords = descriptionParts.filter(
        (word) =>
          word.length > 3 &&
          !['the', 'and', 'for', 'with', 'that', 'this', 'from'].includes(word.toLowerCase()),
      );

      description = meaningfulWords.join(' '); // Join all meaningful words
    }

    // Create the format: "BrandName start_of_description...last_word" on first line, "New" on second line
    if (brandName && description) {
      const maxLength = 35;

      // Split description into words
      const words = description.split(' ');

      // Get the last word
      const lastWord = words.length > 0 ? words[words.length - 1] : '';

      // Get the beginning words (excluding the last word)
      const beginningWords = words.slice(0, -1);

      if (beginningWords.length === 0) {
        // Only one word in description
        const firstLine = `${brandName} ${description}`;
        if (firstLine.length <= maxLength) {
          return `${firstLine}\nNew`;
        } else {
          const truncated = description.substring(0, maxLength - brandName.length - 1);
          return `${brandName} ${truncated}\nNew`;
        }
      } else {
        // Multiple words - show first part + last word
        const availableSpace = maxLength - brandName.length - lastWord.length - 5; // -5 for space, ellipsis, and space

        // Take as many beginning words as will fit
        let startText = '';
        let i = 0;
        while (
          i < beginningWords.length &&
          (startText + beginningWords[i] + ' ').length <= availableSpace
        ) {
          startText += beginningWords[i] + ' ';
          i++;
        }

        // Remove trailing space
        startText = startText.trim();

        // Construct the final text
        const firstLine = `${brandName} ${startText}...${lastWord}`;

        return `${firstLine}\nNew`;
      }
    } else if (brandName) {
      return `${brandName}\nNew`;
    } else {
      return 'New';
    }
  };

  const generateLabels = async () => {
    if (!csvFile || productData.length === 0) {
      setError('Please upload a valid CSV file first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Load logo (custom or default)
      let logoDataUrl: string | null = null;
      if (logoFile) {
        logoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(logoFile);
        });
      } else if (useDefaultLogo && defaultLogoPngUrl) {
        logoDataUrl = defaultLogoPngUrl;
        console.log('Using converted PNG default logo for PDF');
      }

      if (options.separateFiles) {
        // Generate separate PDF files grouped by FNSKU
        await generateSeparateFiles(logoDataUrl);
      } else {
        // Generate single PDF file
        await generateSingleFile(logoDataUrl);
      }
    } catch (error: unknown) {
      console.error('Label generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to generate labels: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const generateSingleFile = async (logoDataUrl: string | null) => {
    // Dynamically import jsPDF
    const { default: jsPDFConstructor } = await import('jspdf');

    const doc = new jsPDFConstructor({
      orientation: options.layout === 'single' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: options.layout === 'single' ? [50, 25] : 'a4',
    });

    if (options.layout === 'single') {
      // Single label per page (50mm x 25mm)
      console.log(`📄 Generating ${productData.length} single labels...`);

      for (let i = 0; i < productData.length; i++) {
        if (i > 0) doc.addPage([50, 25], 'landscape');

        const product = productData[i];
        console.log(
          `📝 Generating label ${i + 1}/${
            productData.length
          } for: ${product.title.substring(0, 30)}...`,
        );

        await generateSingleLabel(doc, product, logoDataUrl);

        // Small delay between labels to prevent browser freeze
        if (i > 0 && i % 5 === 0) {
          console.log(`⏸️ Brief pause after ${i + 1} labels...`);
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    } else {
      // Multiple labels per A4 page
      const labelsPerRow = 4;
      const labelsPerCol = 11;
      const labelsPerPage = labelsPerRow * labelsPerCol;

      for (let page = 0; page < Math.ceil(productData.length / labelsPerPage); page++) {
        if (page > 0) doc.addPage('a4', 'portrait');

        const pageProducts = productData.slice(page * labelsPerPage, (page + 1) * labelsPerPage);
        await generateMultipleLabels(doc, pageProducts, logoDataUrl, labelsPerRow);
      }
    }

    console.log('📄 Saving PDF...');

    // Save the PDF
    const fileName = `amazon-labels-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    console.log(`✅ PDF saved successfully: ${fileName}`);
    setSuccess(`Successfully generated ${productData.length} labels!`);
  };

  const generateSeparateFiles = async (logoDataUrl: string | null) => {
    // Group products by FNSKU
    const productGroups = new Map<string, ProductData[]>();

    productData.forEach((product) => {
      const fnsku = product.fnsku;
      if (!productGroups.has(fnsku)) {
        productGroups.set(fnsku, []);
      }
      productGroups.get(fnsku)!.push(product);
    });

    console.log(
      `📁 Generating ${productGroups.size} separate PDF files for ${productData.length} total labels...`,
    );

    const zip = new JSZip();
    let fileCount = 0;

    // Generate PDF for each FNSKU group
    for (const [fnsku, products] of productGroups) {
      fileCount++;
      console.log(
        `📄 Creating PDF ${fileCount}/${productGroups.size} for FNSKU: ${fnsku} (${products.length} labels)`,
      );

      // Dynamically import jsPDF
      const { default: jsPDFConstructor } = await import('jspdf');

      const doc = new jsPDFConstructor({
        orientation: options.layout === 'single' ? 'landscape' : 'portrait',
        unit: 'mm',
        format: options.layout === 'single' ? [50, 25] : 'a4',
      });

      if (options.layout === 'single') {
        // Single label per page
        for (let i = 0; i < products.length; i++) {
          if (i > 0) doc.addPage([50, 25], 'landscape');
          await generateSingleLabel(doc, products[i], logoDataUrl);
        }
      } else {
        // Multiple labels per A4 page
        const labelsPerRow = 4;
        const labelsPerCol = 11;
        const labelsPerPage = labelsPerRow * labelsPerCol;

        for (let page = 0; page < Math.ceil(products.length / labelsPerPage); page++) {
          if (page > 0) doc.addPage('a4', 'portrait');

          const pageProducts = products.slice(page * labelsPerPage, (page + 1) * labelsPerPage);
          await generateMultipleLabels(doc, pageProducts, logoDataUrl, labelsPerRow);
        }
      }

      // Generate filename: FNSKU + truncated title
      const title = products[0].title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
      const filename = `${fnsku}-${title}-${products.length}labels.pdf`;

      // Get PDF blob and add to ZIP
      const pdfBlob = doc.output('blob');
      zip.file(filename, pdfBlob);

      console.log(`✅ Added ${filename} to ZIP (${products.length} labels)`);

      // Small delay to prevent browser freeze
      if (fileCount % 3 === 0) {
        console.log(`⏸️ Brief pause after ${fileCount} files...`);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log('📦 Creating ZIP file...');

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Download ZIP file
    const zipFileName = `amazon-labels-grouped-${new Date().toISOString().split('T')[0]}.zip`;
    const link = document.createElement('a');
    const url = URL.createObjectURL(zipBlob);
    link.setAttribute('href', url);
    link.setAttribute('download', zipFileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`✅ ZIP file downloaded: ${zipFileName}`);
    setSuccess(
      `Successfully generated ${productGroups.size} PDF files with ${productData.length} total labels in ZIP!`,
    );
  };

  const generateSingleLabel = async (
    doc: jsPDF,
    product: ProductData,
    logoDataUrl: string | null,
  ) => {
    const pageWidth = 50;

    // Content area (full width - logo doesn't affect layout)
    const contentX = 2;
    const contentWidth = pageWidth - 4;

    // Row 1: MRP and Tax info (centered)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`MRP: Rs. ${product.mrp}`, contentX + contentWidth / 2, 4, {
      align: 'center',
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('(Inclusive of all Taxes)', contentX + contentWidth / 2, 7, {
      align: 'center',
    });

    // Row 2: Barcode (centered)
    try {
      console.log(`🔄 Generating barcode for FNSKU: ${product.fnsku}`);
      const barcodeDataUrl = await generateBarcode(product.fnsku);
      const barcodeWidth = contentWidth * 0.9;
      const barcodeX = contentX + (contentWidth - barcodeWidth) / 2;
      doc.addImage(barcodeDataUrl, 'PNG', barcodeX, 8, barcodeWidth, 10);
      console.log(`✅ Successfully added barcode for FNSKU: ${product.fnsku}`);
    } catch (error) {
      console.error(`❌ Failed to generate barcode for FNSKU: ${product.fnsku}`, error);
      doc.setFontSize(6);
      doc.text('Barcode Error', contentX + contentWidth / 2, 11, {
        align: 'center',
      });
    }

    // Row 3: FNSKU (centered)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(product.fnsku, contentX + contentWidth / 2, 19.5, {
      align: 'center',
    });

    // Row 4: Product Title with "BrandName Description" on first line, "New" on second line
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');

    // Format the title as "BrandName Description\nNew"
    const formattedTitle = formatLabelTitle(product.title);

    // Split the text by newline and render each line separately
    const titleLines = formattedTitle.split('\n');
    if (titleLines.length > 1) {
      doc.text(titleLines[0], contentX + contentWidth / 2, 21.5, {
        align: 'center',
      });
      doc.setFont('helvetica', 'bold');
      doc.text(titleLines[1], contentX + contentWidth / 2, 24, {
        align: 'center',
      });
    } else {
      doc.text(formattedTitle, contentX + contentWidth / 2, 22.5, {
        align: 'center',
      });
    }

    // Add logo as overlay in top-left corner (absolute positioning)
    if (logoDataUrl) {
      try {
        console.log(`🖼️ Adding logo to PDF (${logoDataUrl.substring(0, 30)}...)`);
        // For SVG, specify PNG format explicitly
        const imageFormat = logoDataUrl.startsWith('data:image/svg') ? 'PNG' : 'JPEG';
        doc.addImage(logoDataUrl, imageFormat, 0.5, 0.5, 6, 6);
        console.log('✅ Logo added successfully');
      } catch (error) {
        console.warn('❌ Failed to add logo:', error);
      }
    } else {
      console.log('⚠️ No logo data URL available');
    }

    /*
    // Add "Made in India" text at the bottom
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.text('Made in India', contentX + (contentWidth / 2), 24.5, { align: 'center' });
  */
  };

  const generateMultipleLabels = async (
    doc: jsPDF,
    products: ProductData[],
    logoDataUrl: string | null,
    labelsPerRow: number,
  ) => {
    const labelWidth = 50;
    const labelHeight = 25;
    const marginX = (210 - labelsPerRow * labelWidth) / 2; // Center on A4
    const marginY = 10;

    // Generate all barcodes first to avoid timing issues
    const barcodeCache: { [key: string]: string } = {};
    const uniqueFNSKUs = [...new Set(products.map((p) => p.fnsku))];

    console.log(`📊 Found ${uniqueFNSKUs.length} unique FNSKUs to generate barcodes for...`);

    for (let i = 0; i < uniqueFNSKUs.length; i++) {
      const fnsku = uniqueFNSKUs[i];

      try {
        console.log(`🔄 Generating barcode ${i + 1}/${uniqueFNSKUs.length} for FNSKU: ${fnsku}`);

        // Add a small delay before each barcode generation
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        barcodeCache[fnsku] = await generateBarcode(fnsku);
        console.log(`✅ Barcode ${i + 1}/${uniqueFNSKUs.length} completed for FNSKU: ${fnsku}`);

        // Longer delay every 3 barcodes to prevent browser lock-up
        if ((i + 1) % 3 === 0) {
          console.log(`⏸️ Taking a brief pause after ${i + 1} barcodes...`);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ Failed to generate barcode for FNSKU: ${fnsku}`, error);
        barcodeCache[fnsku] = 'ERROR';

        // Small delay even on error
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }

    console.log(`✅ Generated ${Object.keys(barcodeCache).length} unique barcodes`);

    // Now render all labels
    for (let i = 0; i < products.length; i++) {
      const row = Math.floor(i / labelsPerRow);
      const col = i % labelsPerRow;

      const x = marginX + col * labelWidth;
      const y = marginY + row * labelHeight;

      const product = products[i];

      // Content area (full width - logo doesn't affect layout)
      const contentX = x + 2;
      const contentWidth = labelWidth - 4;

      // Row 1: MRP and Tax info (centered)
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(`MRP: Rs. ${product.mrp}`, contentX + contentWidth / 2, y + 3, {
        align: 'center',
      });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.text('(Inclusive of all Taxes)', contentX + contentWidth / 2, y + 6, {
        align: 'center',
      });

      // Row 2: Barcode (centered)
      const barcodeDataUrl = barcodeCache[product.fnsku];
      if (barcodeDataUrl && barcodeDataUrl !== 'ERROR') {
        try {
          const barcodeWidth = contentWidth * 0.8;
          const barcodeX = contentX + (contentWidth - barcodeWidth) / 2;
          doc.addImage(barcodeDataUrl, 'PNG', barcodeX, y + 7, barcodeWidth, 6);
        } catch (error) {
          console.warn('Failed to add barcode to PDF:', error);
          doc.setFontSize(4);
          doc.text('Barcode Error', contentX + contentWidth / 2, y + 9, {
            align: 'center',
          });
        }
      } else {
        doc.setFontSize(4);
        doc.text('Barcode Error', contentX + contentWidth / 2, y + 9, {
          align: 'center',
        });
      }

      // Row 3: FNSKU (centered)
      doc.setFontSize(5);
      doc.setFont('helvetica', 'bold');
      doc.text(product.fnsku, contentX + contentWidth / 2, y + 16, {
        align: 'center',
      });

      // Row 4: Product Title with "BrandName Description" on first line, "New" on second line
      doc.setFontSize(4);
      doc.setFont('helvetica', 'normal');

      // Format the title as "BrandName Description\nNew"
      const formattedTitle = formatLabelTitle(product.title);

      // Split the text by newline and render each line separately
      const titleLines = formattedTitle.split('\n');
      if (titleLines.length > 1) {
        doc.text(titleLines[0], contentX + contentWidth / 2, y + 17, {
          align: 'center',
        });
        doc.setFont('helvetica', 'bold');
        doc.text(titleLines[1], contentX + contentWidth / 2, y + 19, {
          align: 'center',
        });
      } else {
        doc.text(formattedTitle, contentX + contentWidth / 2, y + 18, {
          align: 'center',
        });
      }

      // Add logo as overlay in top-left corner (absolute positioning)
      if (logoDataUrl) {
        try {
          // For SVG, specify PNG format explicitly
          const imageFormat = logoDataUrl.startsWith('data:image/svg') ? 'PNG' : 'JPEG';
          doc.addImage(logoDataUrl, imageFormat, x + 0.5, y + 0.5, 5, 5);
        } catch (error) {
          console.warn('❌ Failed to add logo in multiple labels:', error);
        }
      }

      // Add "Made in India" text at the bottom
      doc.setFontSize(4);
      doc.setFont('helvetica', 'normal');
      doc.text('Made in India', contentX + contentWidth / 2, y + 22, {
        align: 'center',
      });

      // Draw border around label
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.rect(x, y, labelWidth, labelHeight);
    }
  };

  const handleCsvUpload = async (file: File | null) => {
    if (file) {
      setCsvFile(file);
      setError(null);
      setSuccess(null);
      setLoading(true);

      try {
        const data = await processCsvFile(file);

        // Group products by unique combination (title, fnsku, mrp) and sum quantities
        const groupedProducts = new Map<string, ProductData>();

        data.forEach((product) => {
          const key = `${product.title}|${product.fnsku}|${product.mrp}`;
          if (groupedProducts.has(key)) {
            const existing = groupedProducts.get(key)!;
            existing.qty += product.qty;
          } else {
            groupedProducts.set(key, { ...product });
          }
        });

        const uniqueProducts = Array.from(groupedProducts.values());

        setPreviewData(uniqueProducts);
        setShowPreview(true);
        setProductData(data); // Keep original for generation
        setSuccess(
          `Loaded ${uniqueProducts.length} unique products (${data.length} total labels) - Review and edit below`,
        );
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : 'Failed to process CSV file');
        setProductData([]);
        setPreviewData([]);
        setShowPreview(false);
      } finally {
        setLoading(false);
      }
    } else {
      setCsvFile(null);
      setProductData([]);
      setPreviewData([]);
      setShowPreview(false);
    }
  };

  const addManualProduct = () => {
    setManualProducts([...manualProducts, { title: '', fnsku: '', mrp: '', qty: 1 }]);
  };

  const removeManualProduct = (index: number) => {
    if (manualProducts.length > 1) {
      setManualProducts(manualProducts.filter((_, i) => i !== index));
    }
  };

  const updateManualProduct = (index: number, field: keyof ProductData, value: string | number) => {
    const updated = [...manualProducts];
    updated[index] = { ...updated[index], [field]: value };
    setManualProducts(updated);
  };

  const processManualInput = (): ProductData[] => {
    const validProducts: ProductData[] = [];
    
    manualProducts.forEach((product) => {
      if (product.title.trim() && product.fnsku.trim() && product.mrp.trim() && parseFloat(product.mrp) > 0) {
        const cleanTitle = cleanText(product.title.trim());
        const cleanFnsku = cleanText(product.fnsku.trim());
        const cleanMrp = cleanText(product.mrp.trim());
        const qty = Math.max(1, parseInt(product.qty.toString()) || 1);
        
        // Create multiple entries based on quantity
        for (let i = 0; i < qty; i++) {
          validProducts.push({
            title: cleanTitle,
            fnsku: cleanFnsku,
            mrp: cleanMrp,
            qty: 1,
          });
        }
      }
    });
    
    return validProducts;
  };

  const handleManualInputSubmit = () => {
    const data = processManualInput();
    
    if (data.length === 0) {
      setError('Please fill in all required fields (Title, FNSKU, MRP) with valid values');
      return;
    }

    // Group products by unique combination (title, fnsku, mrp) and sum quantities
    const groupedProducts = new Map<string, ProductData>();

    data.forEach((product) => {
      const key = `${product.title}|${product.fnsku}|${product.mrp}`;
      if (groupedProducts.has(key)) {
        const existing = groupedProducts.get(key)!;
        existing.qty += product.qty;
      } else {
        groupedProducts.set(key, { ...product });
      }
    });

    const uniqueProducts = Array.from(groupedProducts.values());

    setPreviewData(uniqueProducts);
    setShowPreview(true);
    setProductData(data); // Keep original for generation
    setSuccess(
      `Loaded ${uniqueProducts.length} unique products (${data.length} total labels) - Review and edit below`,
    );
  };

    // Load all products once for fast frontend search
  const loadAllProducts = async () => {
    if (productsLoaded) return;
    
    try {
      console.log('📥 Loading all products for fast search...');
      const url = `${ENV.apiUrl}/Shopify/products?limit=100`;
      console.log('🌐 Loading from URL:', url);
      
      const response = await fetch(url);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Raw response data:', data);
        
        if (data.success && data.data?.products) {
          // Transform the response to match ShopifyProduct interface
          const transformedProducts = data.data.products.map((p: any) => ({
            id: p.id,
            title: p.title,
            vendor: p.vendor,
            product_type: p.productType,
            status: p.status,
            variants: p.variants.map((v: any) => ({
              id: v.id,
              sku: v.sku,
              price: v.price,
              barcode: v.barcode,
              inventory_quantity: v.inventoryQuantity
            }))
          }));
          
          console.log('🔄 Transformed products:', transformedProducts);
          console.log('🔍 Sample product titles:', transformedProducts.slice(0, 5).map((p: any) => p.title));
          
          setAllProducts(transformedProducts);
          setProductsLoaded(true);
          console.log('✅ Loaded', transformedProducts.length, 'products for fast search');
        } else {
          console.log('❌ No products in response or invalid format');
        }
      } else {
        console.log('❌ Response not OK:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Failed to load products:', error);
    }
  };

  // Product search functionality - using frontend filtering for instant results
  const searchProducts = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    console.log('🔍 Searching for:', query);
    setSearching(true);
    
    try {
      // Load products if not already loaded
      if (!productsLoaded) {
        await loadAllProducts();
      }
      
      // Filter products with priority for exact matches (like warehouse system)
      const searchLower = query.toLowerCase().trim();
      console.log('🔍 Searching for:', query, 'in', allProducts.length, 'products');
      
      // First check for exact barcode or SKU match
      for (const product of allProducts) {
        for (const variant of product.variants) {
          if (variant.sku === query || variant.barcode === query) {
            // Exact match found - return only this product
            console.log('🎯 Exact match found for:', query);
            setSearchResults([product]);
            return;
          }
        }
      }
      
      // No exact match, do fuzzy search with multiple criteria
      const filteredProducts = allProducts.filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(searchLower);
        const vendorMatch = p.vendor.toLowerCase().includes(searchLower);
        const skuMatch = p.variants.some((v) => v.sku.toLowerCase().includes(searchLower));
        const barcodeMatch = p.variants.some((v) => v.barcode && v.barcode.toLowerCase().includes(searchLower));
        
        if (titleMatch || vendorMatch || skuMatch || barcodeMatch) {
          console.log('✅ Match found:', p.title, '| Title:', titleMatch, '| Vendor:', vendorMatch, '| SKU:', skuMatch, '| Barcode:', barcodeMatch);
        }
        
        return titleMatch || vendorMatch || skuMatch || barcodeMatch;
      }).slice(0, 20); // Limit to 20 results
      
      console.log('🔄 Found', filteredProducts.length, 'products matching search');
      setSearchResults(filteredProducts);
    } catch (error) {
      console.error('❌ Failed to search products:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleProductSelect = (product: ShopifyProduct, index: number) => {
    // Find the first variant with SKU to use as FNSKU
    const firstVariant = product.variants?.[0];
    const fnsku = firstVariant?.sku || '';
    
    // Try to get price from variant
    const price = firstVariant?.price || '0';
    
    updateManualProduct(index, 'title', product.title);
    updateManualProduct(index, 'fnsku', fnsku);
    updateManualProduct(index, 'mrp', price);
    
    // Close dropdown and clear search
    setSearchDropdownOpen(false);
    setSearchResults([]);
  };



  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() && searchQuery.length >= 2) {
        searchProducts(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setSearchDropdownOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const resetTool = () => {
    setInputMode('csv');
    setCsvFile(null);
    setLogoFile(null);
    setUseDefaultLogo(true);
    // Use the converted PNG if available, otherwise fallback to SVG
    setLogoPreview(defaultLogoPngUrl || defaultLogoSrc);
    setProductData([]);
    setPreviewData([]);
    setShowPreview(false);
    setEditingIndex(null);
    setError(null);
    setSuccess(null);
    setManualProducts([{ title: '', fnsku: '', mrp: '', qty: 1 }]);
    setSearchQuery('');
    setSearchResults([]);
    setSearchDropdownOpen(false);
    setAllProducts([]);
    setProductsLoaded(false);
    setOptions({
      layout: 'single',
      separateFiles: false,
      fullProductImage: false,
    });
  };

  const updatePreviewData = (index: number, field: keyof ProductData, value: string | number) => {
    setPreviewData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const deletePreviewRow = (index: number) => {
    setPreviewData((prev) => prev.filter((_, i) => i !== index));
  };

  const generateLabelsFromPreview = async () => {
    // Regenerate productData based on preview data with quantities
    const finalProductData: ProductData[] = [];

    previewData.forEach((product) => {
      for (let i = 0; i < product.qty; i++) {
        finalProductData.push({
          ...product,
          qty: 1, // Each individual label has qty 1
        });
      }
    });

    setProductData(finalProductData);

    // Call the original generate labels function
    generateLabels();
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Stack gap="md" align="center">
          <Group>
            <IconTag size={32} color="var(--mantine-color-orange-6)" />
            <Title order={1} c="orange.6">
              Amazon Labels Tool
            </Title>
          </Group>
          <Text c="dimmed" ta="center" maw={600}>
            Upload a CSV file or manually enter product details to generate Amazon product labels
          </Text>

          <Button
            variant="light"
            leftSection={<IconFileTypeCsv size={16} />}
            onClick={downloadExampleTemplate}
          >
            Download Example CSV Template
          </Button>
        </Stack>

        <Divider label="Input Method" labelPosition="center" />

        {/* Input Mode Selection */}
        <Paper withBorder radius="md" p="xl">
          <Stack gap="lg">
            <SegmentedControl
              value={inputMode}
              onChange={(value) => setInputMode(value as 'csv' | 'manual')}
              data={[
                { label: '📁 Upload CSV File', value: 'csv' },
                { label: '✏️ Manual Input', value: 'manual' },
              ]}
              fullWidth
            />

            {inputMode === 'csv' ? (
              /* CSV File Upload & Logo Upload - Same Line */
              <Group align="flex-start" grow>
                {/* CSV File Upload */}
                <Stack gap="md">
                  <Text fw={600} size="lg">
                    CSV File
                  </Text>
                  <FileInput
                    placeholder="Select CSV File"
                    value={csvFile}
                    onChange={handleCsvUpload}
                    accept=".csv"
                    leftSection={<IconUpload size={16} />}
                    clearable
                  />

                  {productData.length > 0 && (
                    <Badge color="green" variant="light" size="lg">
                      {productData.length} labels ready to generate
                    </Badge>
                  )}
                </Stack>

                {/* Logo Upload */}
                <Stack gap="md">
                  <Text fw={600} size="lg">
                    Brand Logo
                  </Text>
                  <Group align="flex-start">
                    <FileInput
                      placeholder="Select Custom Logo Image"
                      value={logoFile}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      leftSection={<IconPhoto size={16} />}
                      clearable
                      style={{ flex: 1 }}
                    />

                    {logoPreview && (
                      <Group gap="xs">
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          width={60}
                          height={60}
                          fit="contain"
                        />
                        {!useDefaultLogo && (
                          <Tooltip label="Reset to default logo">
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => handleLogoUpload(null)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    )}
                  </Group>
                  {useDefaultLogo && (
                    <Text size="sm" c="dimmed">
                      Using default MLT logo. Upload a custom logo to replace it.
                    </Text>
                  )}
                </Stack>
              </Group>
            ) : (
              /* Manual Input Form */
              <Stack gap="lg">
                <Group justify="space-between" align="center">
                  <Text fw={600} size="lg">
                    Manual Product Entry
                  </Text>
                  <Button
                    variant="light"
                    leftSection={<IconPlus size={16} />}
                    onClick={addManualProduct}
                    size="sm"
                  >
                    Add Product
                  </Button>
                </Group>

                <Text size="sm" c="dimmed">
                  Enter product details manually or search existing Shopify products. All fields are required. MRP must be greater than 0.
                </Text>

                {manualProducts.map((product, index) => (
                  <Paper key={index} withBorder radius="md" p="md">
                    <Stack gap="md">
                      {/* Product Title with Search */}
                      <Box>
                        <Text size="sm" fw={500} mb={4}>
                          Product Title *
                        </Text>
                        <Stack gap="xs">
                          <Group gap="xs">
                            <TextInput
                              placeholder="Search products by title, SKU, or barcode..."
                              value={searchQuery}
                              onChange={(event) => {
                                const value = event.currentTarget.value;
                                console.log('🔍 Search input changed:', value);
                                setSearchQuery(value);
                                if (value.length >= 2) {
                                  setSearchDropdownOpen(true);
                                } else {
                                  setSearchDropdownOpen(false);
                                  setSearchResults([]);
                                }
                              }}
                              leftSection={<IconSearch size={16} />}
                              rightSection={searching ? <Loader size="xs" /> : null}
                              onFocus={() => {
                                if (searchQuery.length >= 2) {
                                  setSearchDropdownOpen(true);
                                }
                              }}
                              style={{ flex: 1 }}
                            />
                            <Button
                              size="xs"
                              variant="light"
                              onClick={() => {
                                console.log('🧪 Test button clicked');
                                console.log('🔍 Current searchQuery:', searchQuery);
                                console.log('📦 Current allProducts:', allProducts);
                                if (searchQuery.length >= 2) {
                                  searchProducts(searchQuery);
                                }
                              }}
                            >
                              Test Search
                            </Button>
                            <Button
                              size="xs"
                              variant="light"
                              onClick={() => {
                                console.log('📥 Manual load products clicked');
                                loadAllProducts();
                              }}
                            >
                              Load Products
                            </Button>
                          </Group>
                          
                          {/* Search Results Dropdown */}
                          {searchDropdownOpen && (
                            <Paper shadow="md" radius="md" p="xs" style={{ position: 'relative', zIndex: 1000, maxHeight: 300, overflowY: 'auto' }}>
                              {searchResults.length > 0 ? (
                                <Stack gap="xs">
                                  <Text size="sm" c="dimmed" px="xs">
                                    {searchResults.length} product{searchResults.length !== 1 ? 's' : ''} found
                                  </Text>
                                  {searchResults.map((searchProduct) => (
                                    <Paper
                                      key={searchProduct.id}
                                      p="sm"
                                      radius="sm"
                                      style={{ 
                                        cursor: 'pointer', 
                                        border: '1px solid var(--mantine-color-gray-3)',
                                        transition: 'all 0.2s ease'
                                      }}
                                      onClick={() => {
                                        handleProductSelect(searchProduct, index);
                                        setSearchQuery('');
                                        setSearchDropdownOpen(false);
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)';
                                        e.currentTarget.style.borderColor = 'var(--mantine-color-blue-3)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.borderColor = 'var(--mantine-color-gray-3)';
                                      }}
                                    >
                                      <Group justify="space-between" align="flex-start">
                                        <Stack gap="xs" style={{ flex: 1 }}>
                                          <Text size="sm" fw={500} lineClamp={1}>
                                            {searchProduct.title}
                                          </Text>
                                          <Group gap="xs">
                                            {searchProduct.vendor && (
                                              <Badge size="xs" variant="light" color="blue">
                                                {searchProduct.vendor}
                                              </Badge>
                                            )}
                                            {searchProduct.variants?.[0]?.sku && (
                                              <Badge size="xs" variant="light" color="gray">
                                                SKU: {searchProduct.variants[0].sku}
                                              </Badge>
                                            )}
                                            {searchProduct.variants?.[0]?.price && (
                                              <Badge size="xs" variant="light" color="green">
                                                ₹{searchProduct.variants[0].price}
                                              </Badge>
                                            )}
                                          </Group>
                                        </Stack>
                                        <ActionIcon size="sm" variant="light" color="blue">
                                          <IconPlus size={12} />
                                        </ActionIcon>
                                      </Group>
                                    </Paper>
                                  ))}
                                </Stack>
                              ) : searchQuery.length >= 2 && !searching ? (
                                <Stack gap="sm" align="center" py="md">
                                  <Text size="sm" c="dimmed">
                                    No products found for "{searchQuery}"
                                  </Text>
                                  <Text size="xs" c="dimmed" ta="center">
                                    Try searching by product title, SKU, or barcode
                                  </Text>
                                </Stack>
                              ) : searching ? (
                                <Stack gap="sm" align="center" py="md">
                                  <Loader size="sm" />
                                  <Text size="sm" c="dimmed">
                                    Searching products...
                                  </Text>
                                </Stack>
                              ) : null}
                            </Paper>
                          )}
                          
                          {/* Selected product preview or manual input */}
                          <TextInput
                            label="Product Title"
                            placeholder="Enter product title manually or select from search above"
                            value={product.title}
                            onChange={(e) => updateManualProduct(index, 'title', e.target.value)}
                            required
                          />
                        </Stack>
                      </Box>

                      {/* Other fields in a row */}
                      <Group align="flex-start" grow>
                        <TextInput
                          label="FNSKU"
                          placeholder="Enter FNSKU"
                          value={product.fnsku}
                          onChange={(e) => updateManualProduct(index, 'fnsku', e.target.value)}
                          required
                          style={{ flex: 1 }}
                        />
                        <NumberInput
                          label="MRP (₹)"
                          placeholder="Enter MRP"
                          value={parseFloat(product.mrp) || undefined}
                          onChange={(value) => updateManualProduct(index, 'mrp', value?.toString() || '')}
                          min={0.01}
                          step={0.01}
                          required
                          style={{ flex: 1 }}
                        />
                        <NumberInput
                          label="Quantity"
                          placeholder="Qty"
                          value={product.qty}
                          onChange={(value) => updateManualProduct(index, 'qty', value || 1)}
                          min={1}
                          step={1}
                          style={{ flex: 1 }}
                        />
                        <Box style={{ flex: 0 }}>
                          <Text size="sm" c="dimmed" mb={4}>
                            Actions
                          </Text>
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => removeManualProduct(index)}
                            disabled={manualProducts.length === 1}
                            size="sm"
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Box>
                      </Group>
                    </Stack>
                  </Paper>
                ))}

                <Group justify="center">
                  <Button
                    variant="filled"
                    color="blue"
                    onClick={handleManualInputSubmit}
                    disabled={manualProducts.some(p => !p.title.trim() || !p.fnsku.trim() || !p.mrp.trim())}
                  >
                    Process Manual Input
                  </Button>
                </Group>
              </Stack>
            )}

            {/* Logo Upload for Manual Input */}
            {inputMode === 'manual' && (
              <Stack gap="md">
                <Text fw={600} size="lg">
                  Brand Logo
                </Text>
                <Group align="flex-start">
                  <FileInput
                    placeholder="Select Custom Logo Image"
                    value={logoFile}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    leftSection={<IconPhoto size={16} />}
                    clearable
                    style={{ flex: 1 }}
                  />

                  {logoPreview && (
                    <Group gap="xs">
                      <Image
                        src={logoPreview}
                        alt="Logo preview"
                        width={60}
                        height={60}
                        fit="contain"
                      />
                      {!useDefaultLogo && (
                        <Tooltip label="Reset to default logo">
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => handleLogoUpload(null)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  )}
                </Group>
                {useDefaultLogo && (
                  <Text size="sm" c="dimmed">
                    Using default MLT logo. Upload a custom logo to replace it.
                  </Text>
                )}
              </Stack>
            )}

            {/* Layout Options - Second Row */}
            <Stack gap="md">
              <Text fw={600} size="lg">
                Layout
              </Text>
              <Select
                value={options.layout}
                onChange={(value) =>
                  setOptions((prev) => ({
                    ...prev,
                    layout: value as 'single' | 'multiple',
                  }))
                }
                data={[
                  {
                    value: 'single',
                    label: 'One label per page (50mm x 25mm)',
                  },
                  { value: 'multiple', label: 'Multiple labels per page (A4)' },
                ]}
              />

              <Stack gap="xs">
                <Checkbox
                  checked={options.separateFiles}
                  onChange={(event) =>
                    setOptions((prev) => ({
                      ...prev,
                      separateFiles: event.currentTarget.checked,
                    }))
                  }
                  label="📦 Generate separate PDF file for each product (grouped by FNSKU)"
                  description="Creates a ZIP file with individual PDFs - one per unique FNSKU. Perfect for organizing different products separately!"
                />

                <Checkbox
                  checked={options.fullProductImage}
                  onChange={(event) =>
                    setOptions((prev) => ({
                      ...prev,
                      fullProductImage: event.currentTarget.checked,
                    }))
                  }
                  label="Use first label as full product image"
                  description="When enabled, the first label for each product will be a full-size product image, followed by regular labels"
                />
              </Stack>
            </Stack>

            {/* Generate Button */}
            <Group justify="center" mt="xl">
              <Button
                size="lg"
                leftSection={<IconDownload size={20} />}
                onClick={showPreview ? generateLabelsFromPreview : generateLabels}
                disabled={
                  (inputMode === 'csv' && !csvFile) ||
                  (inputMode === 'manual' && !showPreview) ||
                  (showPreview ? previewData.length === 0 : productData.length === 0) ||
                  loading
                }
                loading={loading}
              >
                Generate Amazon Labels & Download
              </Button>

              {(csvFile || logoFile || (inputMode === 'manual' && manualProducts.some(p => p.title || p.fnsku || p.mrp))) && (
                <Button variant="outline" color="red" onClick={resetTool} disabled={loading}>
                  Clear All
                </Button>
              )}
            </Group>
          </Stack>
        </Paper>

        {/* Preview Table */}
        {showPreview && previewData.length > 0 && (
          <Paper withBorder radius="md" p="xl">
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Text fw={600} size="lg">
                  Preview & Edit Product Data
                </Text>
                <Badge color="blue" variant="light" size="lg">
                  {previewData.reduce((sum, product) => sum + product.qty, 0)} total labels
                </Badge>
              </Group>

              <Text size="sm" c="dimmed">
                Review the data below. Click any cell to edit it. MRP and Qty must be numbers
                greater than 0.
              </Text>

              <div style={{ overflowX: 'auto' }}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Title</Table.Th>
                      <Table.Th>FNSKU</Table.Th>
                      <Table.Th>MRP</Table.Th>
                      <Table.Th>Qty</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {previewData.map((product, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>
                          {editingIndex === index ? (
                            <TextInput
                              value={product.title}
                              onChange={(e) => updatePreviewData(index, 'title', e.target.value)}
                              onBlur={() => setEditingIndex(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingIndex(null)}
                              autoFocus
                            />
                          ) : (
                            <Text
                              style={{ cursor: 'pointer' }}
                              onClick={() => setEditingIndex(index)}
                              size="sm"
                            >
                              {product.title}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {product.fnsku}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {editingIndex === index ? (
                            <NumberInput
                              value={parseFloat(product.mrp)}
                              onChange={(value) =>
                                updatePreviewData(index, 'mrp', value?.toString() || '0')
                              }
                              onBlur={() => setEditingIndex(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingIndex(null)}
                              min={0.01}
                              step={0.01}
                              autoFocus
                            />
                          ) : (
                            <Text
                              style={{ cursor: 'pointer' }}
                              onClick={() => setEditingIndex(index)}
                              size="sm"
                            >
                              ₹{product.mrp}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {editingIndex === index ? (
                            <NumberInput
                              value={product.qty}
                              onChange={(value) => updatePreviewData(index, 'qty', value || 1)}
                              onBlur={() => setEditingIndex(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingIndex(null)}
                              min={1}
                              step={1}
                              autoFocus
                            />
                          ) : (
                            <Text
                              style={{ cursor: 'pointer' }}
                              onClick={() => setEditingIndex(index)}
                              size="sm"
                            >
                              {product.qty}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => deletePreviewRow(index)}
                            size="sm"
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>

              {previewData.length === 0 && (
                <Text ta="center" c="dimmed" py="xl">
                  No valid products found. Please check your input.
                </Text>
              )}
            </Stack>
          </Paper>
        )}

        {/* Status Messages */}
        {loading && (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            <Text size="sm" mb="xs">
              Generating Amazon labels... This may take a moment for large files.
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              Check the browser console for detailed progress updates.
            </Text>
            <Progress value={50} animated />
          </Alert>
        )}

        {error && (
          <Alert
            icon={<IconX size={16} />}
            color="red"
            variant="light"
            onClose={() => setError(null)}
            withCloseButton
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            icon={<IconCheck size={16} />}
            color="green"
            variant="light"
            onClose={() => setSuccess(null)}
            withCloseButton
          >
            {success}
          </Alert>
        )}
      </Stack>

      {/* Hidden canvas for barcode generation */}
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
    </Container>
  );
};

export default AmazonLabels;
