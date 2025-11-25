import React, { useState } from 'react';
import { Container, Paper, Text, Stack, Tabs } from '@mantine/core';

// Import all PDF tool components
import MergePdf from './MergePdf';
import SplitPdf from './SplitPdf';
import CsvToPdf from './CsvToPdf';
import ExcelToPdf from './ExcelToPdf';
import AmazonLabels from './AmazonLabels';
import ImageToPdf from './ImageToPdf';
import PdfToCsv from './PdfToCsv';

const PdfManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>('merge');

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}

        {/* Main Content */}
        <Paper shadow="md" p="xl" radius="lg">
          {/* PDF Tools Tabs */}
          <div style={{ marginBottom: 'var(--mantine-spacing-xl)' }}>
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab
                  value="merge"
                  style={{
                    minHeight: '40px',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Merge PDF
                  </Text>
                </Tabs.Tab>
                <Tabs.Tab
                  value="split"
                  style={{
                    minHeight: '40px',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Split PDF
                  </Text>
                </Tabs.Tab>
                <Tabs.Tab
                  value="csv"
                  style={{
                    minHeight: '40px',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    CSV to PDF
                  </Text>
                </Tabs.Tab>
                <Tabs.Tab
                  value="excel"
                  style={{
                    minHeight: '40px',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Excel to PDF
                  </Text>
                </Tabs.Tab>
                <Tabs.Tab
                  value="labels"
                  style={{
                    minHeight: '40px',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Amazon Labels
                  </Text>
                </Tabs.Tab>
                <Tabs.Tab
                  value="image"
                  style={{
                    minHeight: '40px',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Image to PDF
                  </Text>
                </Tabs.Tab>
                <Tabs.Tab
                  value="pdf-to-csv"
                  style={{
                    minHeight: '40px',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    PDF to CSV
                  </Text>
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="merge">
                <MergePdf />
              </Tabs.Panel>

              <Tabs.Panel value="split">
                <SplitPdf />
              </Tabs.Panel>

              <Tabs.Panel value="csv">
                <CsvToPdf />
              </Tabs.Panel>

              <Tabs.Panel value="excel">
                <ExcelToPdf />
              </Tabs.Panel>

              <Tabs.Panel value="labels">
                <AmazonLabels />
              </Tabs.Panel>

              <Tabs.Panel value="image">
                <ImageToPdf />
              </Tabs.Panel>

              <Tabs.Panel value="pdf-to-csv">
                <PdfToCsv />
              </Tabs.Panel>
            </Tabs>
          </div>
        </Paper>
      </Stack>
    </Container>
  );
};

export default PdfManager;
