import React, { useState, useEffect } from 'react';
import { Download, Play, RefreshCw, CheckCircle, XCircle, Clock, Users } from 'lucide-react';

interface BatchStatus {
  status: string;
  total_users: number;
  processed_users: number;
  current_user?: string;
  errors: string[];
}

export const BatchProcessor: React.FC = () => {
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Poll status every 2 seconds when processing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isProcessing) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/batch-process-status`);
          if (response.ok) {
            const statusData = await response.json();
            setStatus(statusData);
            setLastUpdate(new Date());
            
            // Stop polling if processing is complete
            if (statusData.status !== 'processing') {
              setIsProcessing(false);
            }
          }
        } catch (err) {
          console.error('Error polling status:', err);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing]);

  const startBatchProcessing = async () => {
    setError('');
    setIsProcessing(true);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/batch-process-users`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Batch processing started:', result);
      
      // Start polling immediately
      const statusResponse = await fetch(`${apiUrl}/batch-process-status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStatus(statusData);
        setLastUpdate(new Date());
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Cannot connect to backend. Make sure the backend server is running on port 8000.');
      } else {
        setError(errorMessage);
      }
      setIsProcessing(false);
    }
  };

  const refreshStatus = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/batch-process-status`);
      if (response.ok) {
        const statusData = await response.json();
        setStatus(statusData);
        setLastUpdate(new Date());
        setIsProcessing(statusData.status === 'processing');
      }
    } catch (err) {
      setError('Failed to refresh status - check backend connection');
    }
  };

  const getStatusColor = () => {
    if (!status) return 'text-gray-500';
    
    switch (status.status) {
      case 'processing': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    if (!status) return <Clock className="h-5 w-5" />;
    
    switch (status.status) {
      case 'processing': return <RefreshCw className="h-5 w-5 animate-spin" />;
      case 'completed': return <CheckCircle className="h-5 w-5" />;
      case 'failed': return <XCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const formatProgress = () => {
    if (!status || status.total_users === 0) return '0%';
    return `${Math.round((status.processed_users / status.total_users) * 100)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <Download className="h-6 w-6 text-primary-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">Batch Media Processor</h2>
      </div>

      <div className="space-y-6">
        {/* Control Panel */}
        <div className="flex items-center space-x-4">
          <button
            onClick={startBatchProcessing}
            disabled={isProcessing}
            className={`flex items-center px-4 py-2 rounded-lg font-medium ${
              isProcessing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            } transition-colors`}
          >
            <Play className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Start Batch Processing'}
          </button>

          <button
            onClick={refreshStatus}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Status Display */}
        {status && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={getStatusColor()}>
                  {getStatusIcon()}
                </div>
                <div>
                  <div className={`font-medium ${getStatusColor()}`}>
                    Status: {status.status}
                  </div>
                  {status.current_user && (
                    <div className="text-sm text-gray-600">
                      Currently processing: {status.current_user}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {formatProgress()}
                </div>
                <div className="text-sm text-gray-600">
                  {status.processed_users} / {status.total_users} users
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {status.total_users > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress</span>
                  <span>{status.processed_users} / {status.total_users}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      status.status === 'completed' ? 'bg-green-500' :
                      status.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ 
                      width: `${status.total_users > 0 ? (status.processed_users / status.total_users) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            )}

            {/* Errors */}
            {status.errors && status.errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
                <div className="space-y-1">
                  {status.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="text-xs text-red-600">
                      • {error}
                    </div>
                  ))}
                  {status.errors.length > 5 && (
                    <div className="text-xs text-red-500 italic">
                      ... and {status.errors.length - 5} more errors
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        {/* Last Update */}
        {lastUpdate && (
          <div className="text-xs text-gray-500 text-center">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Users className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Batch Processing</p>
              <p className="text-sm text-blue-600 mt-1">
                This will download all images and voice files from Firebase Storage for every user 
                in the email_users table. Files will be saved locally and processing status will be tracked.
              </p>
              <div className="mt-2 text-xs text-blue-600">
                <strong>Note:</strong> Backend must be running on port 8000 with Firebase dependencies installed.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};