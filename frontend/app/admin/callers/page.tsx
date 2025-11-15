'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';

interface Caller {
  id: string;
  email: string;
  name?: string;
  role: string;
  created_at: string;
  leads_count?: number;
  scripts_count?: number;
}

interface Script {
  id: string;
  specialty: string;
}

interface Lead {
  id: string;
  full_name: string;
  specialty: string;
  status: string;
}

export default function CallersPage() {
  const router = useRouter();
  const [callers, setCallers] = useState<Caller[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCaller, setEditingCaller] = useState<Caller | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [availableScripts, setAvailableScripts] = useState<Script[]>([]);
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [selectedScripts, setSelectedScripts] = useState<string[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  useEffect(() => {
    fetchCallers();
  }, []);

  const fetchCallers = async () => {
    try {
      const response = await api.get('/callers');
      setCallers(response.data);
    } catch (error) {
      console.error('Error fetching callers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableScripts = async () => {
    try {
      const response = await api.get('/scripts');
      setAvailableScripts(response.data);
    } catch (error) {
      console.error('Error fetching scripts:', error);
    }
  };

  const fetchAvailableLeads = async () => {
    try {
      const response = await api.get('/admin/leads');
      setAvailableLeads(response.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const handleEdit = async (caller: Caller) => {
    try {
      // Fetch caller details with assigned scripts
      const response = await api.get(`/callers/${caller.id}`);
      const callerDetails = response.data;
      
      setEditingCaller(callerDetails);
      setSelectedScripts(callerDetails.scripts?.map((s: Script) => s.id) || []);
      setSelectedLeads([]); // We'll load leads separately if needed
      await fetchAvailableScripts();
      await fetchAvailableLeads();
      setShowForm(true);
    } catch (error) {
      console.error('Error fetching caller details:', error);
      alert('Failed to load caller details');
    }
  };

  const handleCreateNew = () => {
    setEditingCaller({
      id: '',
      email: '',
      name: '',
      role: 'caller',
      created_at: new Date().toISOString()
    });
    setSelectedScripts([]);
    setSelectedLeads([]);
    fetchAvailableScripts();
    fetchAvailableLeads();
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!editingCaller) return;

    try {
      if (editingCaller.id) {
        // Update existing caller
        await api.patch(`/callers/${editingCaller.id}`, {
          name: editingCaller.name,
          script_ids: selectedScripts,
          lead_ids: selectedLeads
        });
      } else {
        // Create new caller (requires email)
        if (!editingCaller.email) {
          alert('Email is required');
          return;
        }
        await api.post('/callers', {
          email: editingCaller.email,
          name: editingCaller.name,
          script_ids: selectedScripts,
          lead_ids: selectedLeads
        });
      }

      await fetchCallers();
      setShowForm(false);
      setEditingCaller(null);
      alert('Caller saved successfully');
    } catch (error: any) {
      console.error('Error saving caller:', error);
      alert(error.response?.data?.error || 'Failed to save caller');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading callers...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Cold Caller Profiles</h1>
          </div>
          <button
            onClick={handleCreateNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create New Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {callers.map((caller) => (
            <div
              key={caller.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                {caller.name || caller.email}
              </h3>
              <p className="text-sm text-gray-600 mb-2">{caller.email}</p>
              <div className="flex gap-4 text-sm text-gray-500 mb-4">
                <span>{caller.leads_count || 0} Leads</span>
                <span>{caller.scripts_count || 0} Scripts</span>
              </div>
              <button
                onClick={() => handleEdit(caller)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Edit Profile
              </button>
            </div>
          ))}
        </div>

        {showForm && editingCaller && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingCaller.id ? 'Edit Caller Profile' : 'Create New Caller Profile'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editingCaller.email}
                    onChange={(e) => setEditingCaller({ ...editingCaller, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="caller@example.com"
                    disabled={!!editingCaller.id}
                  />
                  {!editingCaller.id && (
                    <p className="text-xs text-gray-500 mt-1">
                      User must be created in Supabase Auth first
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={editingCaller.name || ''}
                    onChange={(e) => setEditingCaller({ ...editingCaller, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Caller Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Scripts
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {availableScripts.length === 0 ? (
                      <p className="text-sm text-gray-500">No scripts available</p>
                    ) : (
                      availableScripts.map((script) => (
                        <label key={script.id} className="flex items-center space-x-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedScripts.includes(script.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedScripts([...selectedScripts, script.id]);
                              } else {
                                setSelectedScripts(selectedScripts.filter(id => id !== script.id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{script.specialty}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Leads
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {availableLeads.length === 0 ? (
                      <p className="text-sm text-gray-500">No leads available</p>
                    ) : (
                      availableLeads.map((lead) => (
                        <label key={lead.id} className="flex items-center space-x-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeads([...selectedLeads, lead.id]);
                              } else {
                                setSelectedLeads(selectedLeads.filter(id => id !== lead.id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {lead.full_name} - {lead.specialty} ({lead.status})
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingCaller(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Profile
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

