'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';

interface Lead {
  id: string;
  full_name: string;
  specialty: string;
  status: string;
  tags: Array<{ id: string; name: string; color?: string }>;
  call_count: number;
  last_call_at?: string;
  data_completeness_score: number;
}

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    specialty: '',
    search: ''
  });

  useEffect(() => {
    fetchLeads();
  }, [filters]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.specialty) params.append('specialty', filters.specialty);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/leads?${params.toString()}`);
      setLeads(response.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-gray-100 text-gray-800',
      contacted: 'bg-blue-100 text-blue-800',
      appointment_booked: 'bg-green-100 text-green-800',
      not_interested: 'bg-red-100 text-red-800',
      follow_up: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading leads...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">My Leads</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <input
              type="text"
              placeholder="Search leads..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="appointment_booked">Appointment Booked</option>
              <option value="not_interested">Not Interested</option>
              <option value="follow_up">Follow Up</option>
            </select>
            <select
              value={filters.specialty}
              onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Specialties</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Dermatology">Dermatology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="General Practice">General Practice</option>
            </select>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specialty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calls
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completeness
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{lead.full_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{lead.specialty}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                      {lead.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.call_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${lead.data_completeness_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500">{lead.data_completeness_score}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                        >
                          {tag.name}
                        </span>
                      ))}
                      {lead.tags.length > 3 && (
                        <span className="px-2 py-1 text-xs text-gray-500">+{lead.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No leads found</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

