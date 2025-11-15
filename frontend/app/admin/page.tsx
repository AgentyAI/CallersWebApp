'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';

interface Metrics {
  overall: {
    total_leads: number;
    appointments_booked: number;
    total_calls: number;
    calls_contacted: number;
    leads_enriched: number;
  };
  callers: Array<{
    id: string;
    name: string;
    email: string;
    leads_assigned: number;
    appointments_booked: number;
    calls_made: number;
    calls_contacted: number;
    avg_interest_level: number;
    avg_appointment_likelihood: number;
  }>;
  specialties: Array<{
    specialty: string;
    total_leads: number;
    appointments_booked: number;
    total_calls: number;
  }>;
}

interface Caller {
  id: string;
  email: string;
  name?: string;
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [callers, setCallers] = useState<Caller[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'scripts'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [showLeadUpload, setShowLeadUpload] = useState(false);
  const [leadUploadData, setLeadUploadData] = useState('');
  const [selectedCaller, setSelectedCaller] = useState('');

  useEffect(() => {
    fetchMetrics();
    fetchCallers();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/admin/metrics');
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      // Set default empty metrics on error
      setMetrics({
        overall: {
          total_leads: 0,
          appointments_booked: 0,
          total_calls: 0,
          calls_contacted: 0,
          leads_enriched: 0
        },
        callers: [],
        specialties: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCallers = async () => {
    try {
      const response = await api.get('/admin/callers');
      setCallers(response.data);
    } catch (error) {
      console.error('Error fetching callers:', error);
    }
  };

  const handleUploadLeads = async () => {
    try {
      // Parse CSV or JSON data
      const lines = leadUploadData.trim().split('\n');
      const leads = lines.map(line => {
        const [full_name, specialty] = line.split(',').map(s => s.trim());
        return { full_name, specialty, assigned_caller_id: selectedCaller || null };
      });

      await api.post('/admin/leads', { leads, caller_id: selectedCaller || null });
      alert('Leads uploaded successfully');
      setShowLeadUpload(false);
      setLeadUploadData('');
      fetchMetrics();
    } catch (error) {
      console.error('Error uploading leads:', error);
      alert('Failed to upload leads');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {(['dashboard', 'leads', 'scripts'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {metrics ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-600">Total Leads</div>
                    <div className="text-2xl font-bold text-gray-900">{metrics.overall.total_leads || 0}</div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-600">Appointments</div>
                    <div className="text-2xl font-bold text-green-600">{metrics.overall.appointments_booked || 0}</div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-600">Total Calls</div>
                    <div className="text-2xl font-bold text-blue-600">{metrics.overall.total_calls || 0}</div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-600">Calls Contacted</div>
                    <div className="text-2xl font-bold text-purple-600">{metrics.overall.calls_contacted || 0}</div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-600">Leads Enriched</div>
                    <div className="text-2xl font-bold text-yellow-600">{metrics.overall.leads_enriched || 0}</div>
                  </div>
                </div>

                <div className="bg-white shadow-sm rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Caller Performance</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caller</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leads</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calls</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacted</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appointments</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Interest</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {metrics.callers && metrics.callers.length > 0 ? (
                          metrics.callers.map((caller) => (
                            <tr key={caller.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{caller.name || caller.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{caller.leads_assigned || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{caller.calls_made || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{caller.calls_contacted || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{caller.appointments_booked || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {caller.avg_interest_level ? caller.avg_interest_level.toFixed(1) : '-'}/5
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                              No callers found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white shadow-sm rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Specialty Breakdown</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialty</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Leads</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calls</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appointments</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {metrics.specialties && metrics.specialties.length > 0 ? (
                          metrics.specialties.map((spec) => (
                            <tr key={spec.specialty}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{spec.specialty}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{spec.total_leads || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{spec.total_calls || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{spec.appointments_booked || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {spec.total_leads > 0 ? ((spec.appointments_booked / spec.total_leads) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                              No specialties found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white shadow-sm rounded-lg p-6 text-center">
                <p className="text-gray-600">No metrics available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Upload Leads</h2>
              <button
                onClick={() => setShowLeadUpload(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Upload Leads
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Upload leads in CSV format: Name,Specialty (one per line)
            </p>
          </div>
        )}

        {activeTab === 'scripts' && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Scripts</h2>
              <a
                href="/admin/scripts"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Manage Scripts
              </a>
            </div>
            <p className="text-gray-600">Click "Manage Scripts" to view and edit all calling scripts by specialty.</p>
          </div>
        )}

        {showLeadUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Upload Leads</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Caller (optional)
                  </label>
                  <select
                    value={selectedCaller}
                    onChange={(e) => setSelectedCaller(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Unassigned</option>
                    {callers.map(caller => (
                      <option key={caller.id} value={caller.id}>
                        {caller.name || caller.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leads (CSV format: Name,Specialty)
                  </label>
                  <textarea
                    value={leadUploadData}
                    onChange={(e) => setLeadUploadData(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="Dr. John Smith,Cardiology&#10;Dr. Jane Doe,Dermatology"
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowLeadUpload(false);
                      setLeadUploadData('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadLeads}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

