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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'scripts' | 'callers'>('dashboard');
  
  // Scripts state
  const [scripts, setScripts] = useState<any[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(false);
  const [editingScript, setEditingScript] = useState<any>(null);
  const [showScriptForm, setShowScriptForm] = useState(false);
  
  // Callers management state
  const [callersLoading, setCallersLoading] = useState(false);
  const [editingCaller, setEditingCaller] = useState<any>(null);
  const [showCallerForm, setShowCallerForm] = useState(false);
  const [availableScripts, setAvailableScripts] = useState<any[]>([]);
  const [availableLeads, setAvailableLeads] = useState<any[]>([]);
  const [selectedScripts, setSelectedScripts] = useState<string[]>([]);
  const [selectedCallerLeads, setSelectedCallerLeads] = useState<string[]>([]);
  const [callerPassword, setCallerPassword] = useState('');
  const [selectedLeadCategories, setSelectedLeadCategories] = useState<{
    specialties: string[];
    statuses: string[];
  }>({ specialties: [], statuses: [] });
  const [loading, setLoading] = useState(true);
  const [showLeadUpload, setShowLeadUpload] = useState(false);
  const [leadUploadData, setLeadUploadData] = useState('');
  const [selectedCaller, setSelectedCaller] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterCaller, setFilterCaller] = useState('');
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkUpdateProgress, setBulkUpdateProgress] = useState({ current: 0, total: 0 });
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<'recent' | 'alphabetical' | 'specialty'>('recent');
  const [customRegion, setCustomRegion] = useState('Αττικη');

  useEffect(() => {
    fetchMetrics();
    fetchCallers();
  }, []);

  useEffect(() => {
    if (activeTab === 'leads') {
      fetchLeads();
    } else if (activeTab === 'scripts') {
      fetchScripts();
    } else if (activeTab === 'callers') {
      fetchCallersForTab();
    }
  }, [activeTab, filterStatus, filterSpecialty, filterCaller]);

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

  const fetchCallersForTab = async () => {
    setCallersLoading(true);
    try {
      const response = await api.get('/callers');
      setCallers(response.data);
    } catch (error) {
      console.error('Error fetching callers:', error);
    } finally {
      setCallersLoading(false);
    }
  };

  const fetchScripts = async () => {
    setScriptsLoading(true);
    try {
      const response = await api.get('/scripts');
      setScripts(response.data);
    } catch (error) {
      console.error('Error fetching scripts:', error);
    } finally {
      setScriptsLoading(false);
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

  const fetchLeads = async () => {
    setLeadsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterSpecialty) params.append('specialty', filterSpecialty);
      if (filterCaller) {
        params.append('caller_id', filterCaller);
      }

      const response = await api.get(`/admin/leads?${params.toString()}`);
      let fetchedLeads = response.data;
      
      // Apply sorting
      fetchedLeads = sortLeads(fetchedLeads, sortOption);
      
      setLeads(fetchedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      alert('Failed to fetch leads');
    } finally {
      setLeadsLoading(false);
    }
  };

  const sortLeads = (leadsToSort: any[], sort: 'recent' | 'alphabetical' | 'specialty') => {
    const sorted = [...leadsToSort];
    switch (sort) {
      case 'recent':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // Most recent first
        });
      case 'alphabetical':
        return sorted.sort((a, b) => {
          const nameA = (a.full_name || '').toLowerCase();
          const nameB = (b.full_name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
      case 'specialty':
        return sorted.sort((a, b) => {
          const specialtyA = (a.specialty || '').toLowerCase();
          const specialtyB = (b.specialty || '').toLowerCase();
          return specialtyA.localeCompare(specialtyB);
        });
      default:
        return sorted;
    }
  };

  useEffect(() => {
    if (leads.length > 0 && !leadsLoading) {
      const sorted = sortLeads(leads, sortOption);
      // Only update if order actually changed to avoid infinite loops
      setLeads(sorted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOption]);

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (!confirm(`Are you sure you want to delete "${leadName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/admin/leads/${leadId}`);
      alert('Lead deleted successfully');
      fetchLeads();
      fetchMetrics(); // Refresh metrics
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete lead';
      alert(`Failed to delete lead: ${errorMessage}`);
    }
  };

  const handleBulkUpdateSpecialties = async () => {
    const leadsToUpdate = selectedLeads.size > 0 
      ? leads.filter(lead => selectedLeads.has(lead.id))
      : leads;
    
    if (leadsToUpdate.length === 0) {
      alert('Please select at least one lead to update, or update all leads.');
      return;
    }

    if (!confirm(`This will normalize specialty names for ${leadsToUpdate.length} lead(s) with region "${customRegion}". Continue?`)) {
      return;
    }

    setUploading(true);
    setBulkUpdateProgress({ current: 0, total: 0 });
    
    try {
      const updates = leadsToUpdate
        .map(lead => ({
          id: lead.id,
          oldSpecialty: lead.specialty,
          newSpecialty: normalizeSpecialty(lead.specialty, customRegion)
        }))
        .filter(update => update.oldSpecialty !== update.newSpecialty); // Only update if changed

      if (updates.length === 0) {
        alert('No specialties need updating - they are already normalized!');
        setShowBulkUpdate(false);
        setUploading(false);
        return;
      }

      setBulkUpdateProgress({ current: 0, total: updates.length });
      let successCount = 0;
      let failCount = 0;

      // Update leads in batches of 10
      for (let i = 0; i < updates.length; i += 10) {
        const batch = updates.slice(i, i + 10);
        await Promise.all(
          batch.map(async (update) => {
            try {
              await api.patch(`/admin/leads/${update.id}`, {
                specialty: update.newSpecialty
              });
              successCount++;
            } catch (error) {
              console.error(`Failed to update lead ${update.id}:`, error);
              failCount++;
            } finally {
              setBulkUpdateProgress(prev => ({ ...prev, current: prev.current + 1 }));
            }
          })
        );
      }

      alert(`Specialties updated: ${successCount} successful, ${failCount} failed`);
      setSelectedLeads(new Set()); // Clear selection after update
      await fetchLeads();
      await fetchMetrics();
      setShowBulkUpdate(false);
      setBulkUpdateProgress({ current: 0, total: 0 });
    } catch (error: any) {
      console.error('Error updating specialties:', error);
      alert(`Failed to update specialties: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      setBulkUpdateProgress({ current: 0, total: 0 });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-gray-100 text-gray-800';
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'appointment_booked':
        return 'bg-green-100 text-green-800';
      case 'not_interested':
        return 'bg-red-100 text-red-800';
      case 'follow_up':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUniqueSpecialties = () => {
    const specialties = new Set(leads.map(lead => lead.specialty).filter(Boolean));
    return Array.from(specialties).sort();
  };

  // Normalize specialty name - extract base specialty and map region codes
  const normalizeSpecialty = (specialty: string, region: string = 'Αττικη'): string => {
    if (!specialty) return specialty;
    
    // Extract base specialty name (before any codes)
    // Pattern: "Καρδιολογία (GR)GR0028" -> "Καρδιολογία"
    let baseSpecialty = specialty;
    
    // Remove patterns like "(GR)GR0028", "GR0028", "GR0027027", etc.
    baseSpecialty = baseSpecialty.replace(/\s*\(GR\)\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*GR\d+\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*ATT\.\w+\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*ATH\.\w+\.?\d*\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*PIR\.\w+\.?\w*\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*WEST\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*NORTH\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*SOUTH\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*EAST\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*CENT\.?\w*\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*SUB\.?\w*\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*KOLONAKI\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*S-E\.\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*S-W\.\d*\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\s*W\.\d*\s*/gi, ' ');
    baseSpecialty = baseSpecialty.replace(/\d+\s*/g, ' '); // Remove any remaining standalone numbers
    baseSpecialty = baseSpecialty.replace(/\s+/g, ' ').trim(); // Clean up multiple spaces
    
    // Remove existing region if present
    const commonRegions = ['Αττικη', 'Αθήνα', 'Θεσσαλονίκη', 'Πειραιάς'];
    for (const existingRegion of commonRegions) {
      baseSpecialty = baseSpecialty.replace(new RegExp(`\\s*${existingRegion}\\s*`, 'gi'), ' ').trim();
    }
    
    // If we found a specialty name, add the specified region
    if (baseSpecialty && region) {
      return `${baseSpecialty} ${region}`;
    }
    
    return baseSpecialty || specialty;
  };

  const parseCSV = (text: string): Array<{ full_name: string; specialty: string }> => {
    const lines = text.trim().split('\n');
    const leads: Array<{ full_name: string; specialty: string }> = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Handle CSV with potential quotes and commas
      const parts: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim());
      
      if (parts.length >= 2) {
        const full_name = parts[0].replace(/^"|"$/g, '').trim();
        const specialtyRaw = parts[1].replace(/^"|"$/g, '').trim();
        const specialty = normalizeSpecialty(specialtyRaw, customRegion);
        
        if (full_name && specialty) {
          leads.push({ full_name, specialty });
        }
      }
    }
    
    return leads;
  };

  const handleFileUpload = async (file: File) => {
    return new Promise<Array<{ full_name: string; specialty: string }>>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const leads = parseCSV(text);
          resolve(leads);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  };

  const handleUploadLeads = async () => {
    setUploading(true);
    try {
      let leads: Array<{ full_name: string; specialty: string }> = [];
      
      if (csvFile) {
        // Parse uploaded CSV file
        leads = await handleFileUpload(csvFile);
      } else if (leadUploadData.trim()) {
        // Parse textarea input
        leads = parseCSV(leadUploadData);
      } else {
        alert('Please either upload a CSV file or enter leads in the text area');
        setUploading(false);
        return;
      }

      if (leads.length === 0) {
        alert('No valid leads found. Please check your CSV format (Name,Specialty)');
        setUploading(false);
        return;
      }

      const leadsWithCaller = leads.map(lead => ({
        ...lead,
        assigned_caller_id: selectedCaller || null
      }));

      const response = await api.post('/admin/leads', { 
        leads: leadsWithCaller, 
        caller_id: selectedCaller || null 
      });
      
      alert(`Successfully uploaded ${response.data.count || leads.length} leads`);
      setShowLeadUpload(false);
      setLeadUploadData('');
      setCsvFile(null);
      fetchMetrics();
      fetchLeads(); // Refresh leads list
    } catch (error: any) {
      console.error('Error uploading leads:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload leads';
      alert(`Failed to upload leads: ${errorMessage}`);
    } finally {
      setUploading(false);
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
              {(['dashboard', 'leads', 'scripts', 'callers'] as const).map((tab) => (
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
          <div className="space-y-6">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Manage Leads</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBulkUpdate(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Normalize Specialties
                  </button>
              <button
                onClick={() => setShowLeadUpload(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Upload Leads
              </button>
            </div>
              </div>

              {/* Selection and Sort Controls */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedLeads.size > 0 && selectedLeads.size === leads.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeads(new Set(leads.map(lead => lead.id)));
                        } else {
                          setSelectedLeads(new Set());
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {selectedLeads.size > 0 ? `${selectedLeads.size} selected` : 'Select all'}
                    </span>
                  </label>
                  {selectedLeads.size > 0 && (
                    <button
                      onClick={() => setSelectedLeads(new Set())}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Sort by:</label>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as 'recent' | 'alphabetical' | 'specialty')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="recent">Recently Added</option>
                    <option value="alphabetical">Alphabetical (Name)</option>
                    <option value="specialty">Alphabetical (Specialty)</option>
                  </select>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Statuses</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="appointment_booked">Appointment Booked</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="follow_up">Follow Up</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Specialty</label>
                  <select
                    value={filterSpecialty}
                    onChange={(e) => setFilterSpecialty(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Specialties</option>
                    {getUniqueSpecialties().map(specialty => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Caller</label>
                  <select
                    value={filterCaller}
                    onChange={(e) => setFilterCaller(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Callers</option>
                    <option value="unassigned">Unassigned</option>
                    {callers.map(caller => (
                      <option key={caller.id} value={caller.id}>
                        {caller.name || caller.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Leads Table */}
              {leadsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading leads...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                          <input
                            type="checkbox"
                            checked={selectedLeads.size > 0 && selectedLeads.size === leads.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeads(new Set(leads.map(lead => lead.id)));
                              } else {
                                setSelectedLeads(new Set());
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calls</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appointments</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {leads.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                            No leads found
                          </td>
                        </tr>
                      ) : (
                        leads.map((lead) => (
                          <tr key={lead.id} className={`hover:bg-gray-50 ${selectedLeads.has(lead.id) ? 'bg-blue-50' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedLeads.has(lead.id)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedLeads);
                                  if (e.target.checked) {
                                    newSelected.add(lead.id);
                                  } else {
                                    newSelected.delete(lead.id);
                                  }
                                  setSelectedLeads(newSelected);
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{lead.full_name}</div>
                              {lead.email && (
                                <div className="text-xs text-gray-500">{lead.email}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{lead.specialty}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                                {lead.status?.replace('_', ' ') || 'new'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {lead.caller_name || lead.caller_email || 'Unassigned'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {lead.call_count || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {lead.appointment_count || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLead(lead.id, lead.full_name);
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {!leadsLoading && leads.length > 0 && (
                <div className="mt-4 text-sm text-gray-600">
                  Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}

        {showBulkUpdate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Normalize Specialty Names</h2>
            <p className="text-gray-600 mb-4">
                This will update specialty names by:
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>Extracting the base specialty name (e.g., "Καρδιολογία")</li>
                  <li>Removing codes like "GR0028" or "(GR)GR0028"</li>
                  <li>Adding the specified region</li>
                </ul>
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region to Add
                </label>
                <input
                  type="text"
                  value={customRegion}
                  onChange={(e) => setCustomRegion(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Αττικη"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: "Καρδιολογία (GR)GR0028" → "Καρδιολογία {customRegion}"
                </p>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  {selectedLeads.size > 0 
                    ? `Will update ${selectedLeads.size} selected lead(s)`
                    : `Will update all ${leads.length} lead(s)`}
                </p>
              </div>
              
              {uploading && bulkUpdateProgress.total > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Updating leads...</span>
                    <span>{bulkUpdateProgress.current} / {bulkUpdateProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(bulkUpdateProgress.current / bulkUpdateProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowBulkUpdate(false);
                    setBulkUpdateProgress({ current: 0, total: 0 });
                  }}
                  disabled={uploading}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUpdateSpecialties}
                  disabled={uploading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {uploading ? 'Updating...' : 'Update All Specialties'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scripts' && (
          <div className="space-y-6">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Calling Scripts</h2>
                <button
                  onClick={() => {
                    const newScript = {
                      specialty: '',
                      opening_line: '',
                      qualification: '',
                      talking_points: '',
                      objection_handling: '',
                      closing_line: ''
                    };
                    setEditingScript(newScript);
                    setShowScriptForm(true);
                  }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                  Create New Script
                </button>
            </div>

              {scriptsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading scripts...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scripts.map((script) => (
                    <div
                      key={script.id || script.specialty}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">{script.specialty}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{script.opening_line}</p>
                      <button
                        onClick={() => {
                          setEditingScript({ ...script });
                          setShowScriptForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Edit Script
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'callers' && (
          <div className="space-y-6">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Cold Caller Profiles</h2>
                <button
                  onClick={async () => {
                    const newCaller = {
                      id: '',
                      email: '',
                      name: '',
                      role: 'caller',
                      created_at: new Date().toISOString()
                    };
                    setEditingCaller(newCaller);
                    setCallerPassword('');
                    setSelectedScripts([]);
                    setSelectedCallerLeads([]);
                    setSelectedLeadCategories({ specialties: [], statuses: [] });
                    await fetchAvailableScripts();
                    await fetchAvailableLeads();
                    setShowCallerForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create New Profile
                </button>
              </div>

              {callersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading callers...</p>
                </div>
              ) : (
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
                        onClick={async () => {
                          try {
                            const response = await api.get(`/callers/${caller.id}`);
                            const callerDetails = response.data;
                            setEditingCaller(callerDetails);
                            setCallerPassword('');
                            setSelectedScripts(callerDetails.scripts?.map((s: any) => s.id) || []);
                            setSelectedCallerLeads([]);
                            setSelectedLeadCategories({ specialties: [], statuses: [] });
                            await fetchAvailableScripts();
                            await fetchAvailableLeads();
                            setShowCallerForm(true);
                          } catch (error) {
                            console.error('Error fetching caller details:', error);
                            alert('Failed to load caller details');
                          }
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Edit Profile
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showLeadUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
                    Upload CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCsvFile(file);
                        // Also populate textarea for preview
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setLeadUploadData(event.target?.result as string);
                        };
                        reader.readAsText(file);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  {csvFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">OR</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste CSV Data (format: Name,Specialty)
                  </label>
                  <textarea
                    value={leadUploadData}
                    onChange={(e) => {
                      setLeadUploadData(e.target.value);
                      setCsvFile(null); // Clear file if user types manually
                    }}
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="Dr. John Smith,Cardiology&#10;Dr. Jane Doe,Dermatology"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Format: One lead per line, comma-separated (Name,Specialty)
                  </p>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowLeadUpload(false);
                      setLeadUploadData('');
                      setCsvFile(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadLeads}
                    disabled={uploading || (!csvFile && !leadUploadData.trim())}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Script Form Modal */}
        {showScriptForm && editingScript && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingScript.id ? 'Edit Script' : 'Create New Script'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
                  <input
                    type="text"
                    value={editingScript.specialty}
                    onChange={(e) => setEditingScript({ ...editingScript, specialty: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Cardiology"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Opening Line</label>
                  <textarea
                    value={editingScript.opening_line}
                    onChange={(e) => setEditingScript({ ...editingScript, opening_line: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Hello, this is [Your Name] calling from [Company]..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qualification</label>
                  <textarea
                    value={editingScript.qualification}
                    onChange={(e) => setEditingScript({ ...editingScript, qualification: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="I wanted to see if you might be interested..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Talking Points</label>
                  <textarea
                    value={editingScript.talking_points}
                    onChange={(e) => setEditingScript({ ...editingScript, talking_points: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Key points to discuss..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Objection Handling</label>
                  <textarea
                    value={editingScript.objection_handling}
                    onChange={(e) => setEditingScript({ ...editingScript, objection_handling: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Common objections and responses..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Closing Line</label>
                  <textarea
                    value={editingScript.closing_line}
                    onChange={(e) => setEditingScript({ ...editingScript, closing_line: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Would you be available for a brief call this week?"
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowScriptForm(false);
                      setEditingScript(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!editingScript.specialty || !editingScript.specialty.trim()) {
                        alert('Specialty is required');
                        return;
                      }
                      try {
                        await api.post('/scripts', editingScript);
                        await fetchScripts();
                        setShowScriptForm(false);
                        setEditingScript(null);
                        alert('Script saved successfully');
                      } catch (error: any) {
                        console.error('Error saving script:', error);
                        const errorMessage = error.response?.data?.error || error.message || 'Failed to save script';
                        alert(`Failed to save script: ${errorMessage}`);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Script
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Caller Form Modal */}
        {showCallerForm && editingCaller && (
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
                </div>
                {!editingCaller.id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={callerPassword}
                      onChange={(e) => setCallerPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter password for new caller"
                      required={!editingCaller.id}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Password is required to create a new caller account
                    </p>
                  </div>
                )}
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
                    Assign Leads by Category
                  </label>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">By Specialty</label>
                      <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                        {getUniqueSpecialties().length === 0 ? (
                          <p className="text-sm text-gray-500">No specialties available</p>
                        ) : (
                          getUniqueSpecialties().map((specialty) => (
                            <label key={specialty} className="flex items-center space-x-2 py-2">
                              <input
                                type="checkbox"
                                checked={selectedLeadCategories.specialties.includes(specialty)}
                                onChange={(e) => {
                                  const newSpecialties = e.target.checked
                                    ? [...selectedLeadCategories.specialties, specialty]
                                    : selectedLeadCategories.specialties.filter(s => s !== specialty);
                                  setSelectedLeadCategories({
                                    ...selectedLeadCategories,
                                    specialties: newSpecialties
                                  });
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{specialty}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">By Status</label>
                      <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                        {['new', 'contacted', 'appointment_booked', 'not_interested', 'follow_up'].map((status) => (
                          <label key={status} className="flex items-center space-x-2 py-2">
                            <input
                              type="checkbox"
                              checked={selectedLeadCategories.statuses.includes(status)}
                              onChange={(e) => {
                                const newStatuses = e.target.checked
                                  ? [...selectedLeadCategories.statuses, status]
                                  : selectedLeadCategories.statuses.filter(s => s !== status);
                                setSelectedLeadCategories({
                                  ...selectedLeadCategories,
                                  statuses: newStatuses
                                });
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {(selectedLeadCategories.specialties.length > 0 || selectedLeadCategories.statuses.length > 0) && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-600">
                          Leads matching selected categories will be assigned to this caller
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowCallerForm(false);
                      setEditingCaller(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!editingCaller) return;
                      try {
                        if (editingCaller.id) {
                          await api.patch(`/callers/${editingCaller.id}`, {
                            name: editingCaller.name,
                            script_ids: selectedScripts,
                            lead_categories: selectedLeadCategories
                          });
                        } else {
                          if (!editingCaller.email) {
                            alert('Email is required');
                            return;
                          }
                          if (!callerPassword) {
                            alert('Password is required for new callers');
                            return;
                          }
                          await api.post('/callers', {
                            email: editingCaller.email,
                            name: editingCaller.name,
                            password: callerPassword,
                            script_ids: selectedScripts,
                            lead_categories: selectedLeadCategories
                          });
                        }
                        await fetchCallersForTab();
                        setShowCallerForm(false);
                        setEditingCaller(null);
                        alert('Caller saved successfully');
                      } catch (error: any) {
                        console.error('Error saving caller:', error);
                        alert(error.response?.data?.error || 'Failed to save caller');
                      }
                    }}
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

