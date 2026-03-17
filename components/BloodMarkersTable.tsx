'use client';

import { BloodMarkers } from '@/types';
import { REFERENCE_RANGES, getMarkerStatus, formatMarkerValue } from '@/lib/bloodParser';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface BloodMarkersTableProps {
  markers: BloodMarkers;
}

export default function BloodMarkersTable({ markers }: BloodMarkersTableProps) {
  const markerKeys = Object.keys(markers) as Array<keyof BloodMarkers>;

  if (markerKeys.length === 0) {
    return null;
  }

  const getStatusIcon = (status: ReturnType<typeof getMarkerStatus>) => {
    switch (status) {
      case 'low':
        return <ArrowDown className="w-4 h-4 text-blue-500" />;
      case 'high':
      case 'critical':
        return <ArrowUp className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusColor = (status: ReturnType<typeof getMarkerStatus>) => {
    switch (status) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getMarkerName = (key: keyof BloodMarkers) => {
    const names: Record<keyof BloodMarkers, string> = {
      glucose: 'Glucose',
      hba1c: 'HbA1c',
      totalCholesterol: 'Total Cholesterol',
      ldl: 'LDL Cholesterol',
      hdl: 'HDL Cholesterol',
      triglycerides: 'Triglycerides',
      tsh: 'TSH',
      vitaminD: 'Vitamin D',
      vitaminB12: 'Vitamin B12',
      ferritin: 'Ferritin',
      iron: 'Serum Iron',
    };
    return names[key] || key;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Blood Markers
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-sm font-medium text-gray-600">Marker</th>
              <th className="text-right py-2 px-2 text-sm font-medium text-gray-600">Value</th>
              <th className="text-right py-2 px-2 text-sm font-medium text-gray-600">Reference</th>
              <th className="text-center py-2 px-2 text-sm font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {markerKeys
              .filter((key) => markers[key] !== undefined)
              .map((key) => {
                const value = markers[key]!;
                const status = getMarkerStatus(key, value);
                const range = REFERENCE_RANGES[key];

                return (
                  <tr key={key} className="border-b border-gray-100">
                    <td className="py-3 px-2 text-sm text-gray-900">{getMarkerName(key)}</td>
                    <td className="py-3 px-2 text-sm text-gray-900 text-right font-medium">
                      <div className="flex items-center justify-end space-x-1">
                        <span>{formatMarkerValue(key, value)}</span>
                        {getStatusIcon(status)}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-500 text-right">
                      {range ? `${range.min}-${range.max} ${range.unit}` : '-'}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          status
                        )}`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
