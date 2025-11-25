import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { ShopifyService } from '../services/shopifyService';

interface CostFetchingProgress {
  jobId: string;
  status: 'Running' | 'Completed' | 'Failed' | 'Cancelled' | 'NotFound';
  current: number;
  total: number;
  updated: number;
  failed: number;
  percentage: number;
  currentItem: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  error?: string;
}

interface CostFetchingContextType {
  activeProgress: CostFetchingProgress | null;
  startCostFetching: () => Promise<void>;
  cancelCostFetching: () => Promise<void>;
  isRunning: boolean;
}

const CostFetchingContext = createContext<CostFetchingContextType | undefined>(undefined);

export const useCostFetching = () => {
  const context = useContext(CostFetchingContext);
  if (!context) {
    throw new Error('useCostFetching must be used within a CostFetchingProvider');
  }
  return context;
};

interface CostFetchingProviderProps {
  children: React.ReactNode;
}

export const CostFetchingProvider: React.FC<CostFetchingProviderProps> = ({ children }) => {
  const [activeProgress, setActiveProgress] = useState<CostFetchingProgress | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const isRunning = activeProgress?.status === 'Running';

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  const startProgressPolling = (jobId: string) => {
    // Poll every 2 seconds
    progressInterval.current = setInterval(async () => {
      try {
        const response = await ShopifyService.getCostFetchingProgress(jobId);
        if (response.success && response.data) {
          const progressData: CostFetchingProgress = {
            ...response.data,
            status: response.data.status as
              | 'Running'
              | 'Completed'
              | 'Failed'
              | 'Cancelled'
              | 'NotFound',
          };
          setActiveProgress(progressData);

          // Stop polling if job is completed, failed, or cancelled
          if (['Completed', 'Failed', 'Cancelled'].includes(progressData.status)) {
            if (progressInterval.current) {
              clearInterval(progressInterval.current);
              progressInterval.current = null;
            }

            // Show notification based on status
            if (progressData.status === 'Completed') {
              notifications.show({
                title: 'Cost Fetching Completed',
                message: `Successfully updated ${progressData.updated} variants. ${progressData.failed} failed.`,
                color: 'green',
                autoClose: 5000,
              });
            } else if (progressData.status === 'Failed') {
              notifications.show({
                title: 'Cost Fetching Failed',
                message: progressData.error || 'An error occurred during cost fetching',
                color: 'red',
                autoClose: 5000,
              });
            } else if (progressData.status === 'Cancelled') {
              notifications.show({
                title: 'Cost Fetching Cancelled',
                message: 'Cost fetching was cancelled by the user',
                color: 'yellow',
                autoClose: 3000,
              });
            }

            // Clear progress after a delay
            setTimeout(() => {
              setActiveProgress(null);
            }, 5000);
          }
        }
      } catch (err) {
        console.error('Error polling progress:', err);
      }
    }, 2000);
  };

  const startCostFetching = async () => {
    try {
      const response = await ShopifyService.startCostFetching();
      if (response.success && response.data) {
        const result = response.data;
        const initialProgress: CostFetchingProgress = {
          jobId: result.jobId,
          status: 'Running',
          current: 0,
          total: result.totalVariants,
          updated: 0,
          failed: 0,
          percentage: 0,
          currentItem: '',
          startTime: new Date().toISOString(),
        };
        setActiveProgress(initialProgress);

        // Show notification
        notifications.show({
          title: 'Cost Fetching Started',
          message: `Started fetching costs for ${result.totalVariants} variants`,
          color: 'blue',
          autoClose: 3000,
        });

        // Start polling for progress
        startProgressPolling(result.jobId);
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to start cost fetching',
          color: 'red',
          autoClose: 5000,
        });
      }
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Error starting cost fetching',
        color: 'red',
        autoClose: 5000,
      });
      console.error('Error starting cost fetching:', err);
    }
  };

  const cancelCostFetching = async () => {
    if (!activeProgress?.jobId) return;

    try {
      const response = await ShopifyService.cancelCostFetching(activeProgress.jobId);
      if (response.success) {
        setActiveProgress((prev) => (prev ? { ...prev, status: 'Cancelled' } : null));
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
          progressInterval.current = null;
        }
      }
    } catch (err) {
      console.error('Error cancelling job:', err);
    }
  };

  const value: CostFetchingContextType = {
    activeProgress,
    startCostFetching,
    cancelCostFetching,
    isRunning,
  };

  return <CostFetchingContext.Provider value={value}>{children}</CostFetchingContext.Provider>;
};
