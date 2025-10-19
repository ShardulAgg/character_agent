import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, AlertCircle, Database, Cloud } from 'lucide-react';
import { apiService } from '../services/api';
import { testFirestoreConnection } from '../utils/firestore-test';

interface SystemStatusProps {
  className?: string;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ className }) => {
  const [healthStatus, setHealthStatus] = useState<'loading' | 'healthy' | 'error'>('loading');
  const [firestoreStatus, setFirestoreStatus] = useState<{
    status: 'loading' | 'healthy' | 'error';
    message?: string;
    error?: string;
  }>({ status: 'loading' });
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

  const checkFirestore = async () => {
    setFirestoreStatus({ status: 'loading' });
    try {
      const result = await testFirestoreConnection();
      setFirestoreStatus({
        status: result.success ? 'healthy' : 'error',
        message: result.message,
        error: result.error,
      });
    } catch (error) {
      setFirestoreStatus({
        status: 'error',
        message: 'Connection test failed',
        error: 'unknown',
      });
    }
  };

  const checkAll = async () => {
    await Promise.all([checkHealth(), checkFirestore()]);
  };

  useEffect(() => {
    checkAll();
  }, []);

  const getStatusColor = (status: 'loading' | 'healthy' | 'error') => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusIcon = (status: 'loading' | 'healthy' | 'error') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5" />;
      case 'error': return <XCircle className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getStatusText = (status: 'loading' | 'healthy' | 'error', type: 'backend' | 'firestore') => {
    const service = type === 'backend' ? 'Backend' : 'Firestore';
    switch (status) {
      case 'healthy': return `${service} is healthy`;
      case 'error': return `${service} connection failed`;
      default: return `Checking ${service.toLowerCase()}...`;
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center mb-6">
        <Activity className="h-5 w-5 text-gray-700 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
      </div>

      <div className="space-y-4">
        {/* Backend Status */}
        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
          <div className="flex items-center">
            <Cloud className="h-5 w-5 text-blue-500 mr-3" />
            <span className="font-medium text-gray-900">Backend API</span>
          </div>
          <div className={`flex items-center space-x-2 ${getStatusColor(healthStatus)}`}>
            {getStatusIcon(healthStatus)}
            <span className="text-sm font-medium">{getStatusText(healthStatus, 'backend')}</span>
          </div>
        </div>

        {/* Firestore Status */}
        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
          <div className="flex items-center">
            <Database className="h-5 w-5 text-green-500 mr-3" />
            <span className="font-medium text-gray-900">Firestore Database</span>
          </div>
          <div className={`flex items-center space-x-2 ${getStatusColor(firestoreStatus.status)}`}>
            {getStatusIcon(firestoreStatus.status)}
            <span className="text-sm font-medium">{getStatusText(firestoreStatus.status, 'firestore')}</span>
          </div>
        </div>

        {/* Firestore Error Details */}
        {firestoreStatus.status === 'error' && firestoreStatus.message && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Firestore Connection Issue</p>
                <p className="text-sm text-red-600 mt-1">{firestoreStatus.message}</p>
                {firestoreStatus.error && (
                  <p className="text-xs text-red-500 mt-1 font-mono">Error: {firestoreStatus.error}</p>
                )}
                <div className="mt-2 text-xs text-red-600">
                  <p className="font-medium">Common fixes:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1 mt-1">
                    <li>Enable Firestore in Firebase Console</li>
                    <li>Update Firestore security rules to allow reads/writes</li>
                    <li>Verify project ID: <code className="font-mono bg-red-100 px-1 rounded">{import.meta.env.VITE_FIREBASE_PROJECT_ID || 'Not configured'}</code></li>
                    <li>Check network connectivity</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div>
            {lastChecked && (
              <div className="text-sm text-gray-500">
                Last checked: {lastChecked.toLocaleTimeString()}
              </div>
            )}
          </div>
          <button
            onClick={checkAll}
            disabled={healthStatus === 'loading' || firestoreStatus.status === 'loading'}
            className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition-colors disabled:opacity-50"
          >
            Refresh All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div>
            <div className="text-sm font-medium text-gray-700">Backend URL</div>
            <div className="text-sm text-gray-600 font-mono break-all">
              {import.meta.env.VITE_API_URL || 'http://localhost:8000'}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Firebase Project</div>
            <div className="text-sm text-gray-600 font-mono">
              {import.meta.env.VITE_FIREBASE_PROJECT_ID || 'Not configured'}
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
