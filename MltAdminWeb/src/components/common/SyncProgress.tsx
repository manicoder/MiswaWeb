import React, { useState, useEffect } from 'react';

interface SyncProgressProps {
  isVisible: boolean;
  current: number;
  total: number;
  message: string;
  onComplete?: () => void;
}

export const SyncProgress: React.FC<SyncProgressProps> = ({
  isVisible,
  current,
  total,
  message,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (total > 0) {
      const percentage = Math.round((current / total) * 100);
      setProgress(percentage);
    }
  }, [current, total]);

  useEffect(() => {
    if (isVisible && current === total && total > 0) {
      // Sync completed
      setTimeout(() => {
        onComplete?.();
      }, 1000); // Show 100% for 1 second before hiding
    }
  }, [isVisible, current, total, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-4">
            <div className="text-lg font-semibold text-gray-800 mb-2">{message}</div>
            <div className="text-sm text-gray-600">
              {current} of {total} items processed
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="text-sm text-gray-500">{progress}% complete</div>
        </div>
      </div>
    </div>
  );
};

export default SyncProgress;
