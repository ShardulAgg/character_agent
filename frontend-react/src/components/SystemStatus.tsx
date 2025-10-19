import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';

interface SystemStatusProps {
  className?: string;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ className }) => {
  const [healthStatus, setHealthStatus] = useState<'loading' | 'healthy' | 'error'>('loading');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = async () => {
    setHealthStatus('loading');
    try {
      await apiService.checkHealth();
      setHealthStatus('healthy');
      setLastChecked(new Date());
    } catch (error) {
      setHealthStatus('error');
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusColor = () => {
    switch (healthStatus) {
      case 'healthy': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusIcon = () => {
    switch (healthStatus) {
      case 'healthy': return <CheckCircle className="h-5 w-5" />;
      case 'error': return <XCircle className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getStatusText = () => {
    switch (healthStatus) {
      case 'healthy': return 'Backend is healthy';
      case 'error': return 'Backend is not responding';
      default: return 'Checking backend status...';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center mb-6">
        <Activity className="h-5 w-5 text-gray-700 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="font-medium">{getStatusText()}</span>
          </div>
          <button
            onClick={checkHealth}
            disabled={healthStatus === 'loading'}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {lastChecked && (
          <div className="text-sm text-gray-500">
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div>
            <div className="text-sm font-medium text-gray-700">Backend URL</div>
            <div className="text-sm text-gray-600 font-mono break-all">
              {import.meta.env.VITE_API_URL || 'http://localhost:8000'}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Environment</div>
            <div className="text-sm text-gray-600 uppercase">
              {import.meta.env.MODE}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};