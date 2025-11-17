'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';

interface Lead {
  id: string;
  full_name: string;
  phone?: string;
  status: string;
  notes?: string;
  specialty: string;
}


export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params?.id as string;
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [status, setStatus] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  useEffect(() => {
    if (leadId) {
      fetchLead();
    }
  }, [leadId]);

  const fetchLead = async () => {
    try {
      const response = await api.get(`/leads/${leadId}`);
      const leadData = response.data;
      setLead(leadData);
      // Map 'new' status to 'contacted' for the dropdown
      const initialStatus = leadData.status === 'new' ? 'contacted' : (leadData.status || 'contacted');
      setStatus(initialStatus);
      setComments(leadData.notes || '');
      setPhone(leadData.phone || '');
    } catch (error) {
      console.error('Error fetching lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!lead) return;
    
    setUpdating(true);
    setSuccessMessage(null);
    
    try {
      await api.patch(`/leads/${leadId}`, {
        status: status,
        notes: comments,
        phone: phone
      });
      
      await fetchLead();
      setSuccessMessage('Lead updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead');
    } finally {
      setUpdating(false);
    }
  };

  const handleGoogleSearch = () => {
    if (!lead) return;
    
    const searchQuery = `${lead.full_name} ${lead.specialty}`;
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    
    window.open(googleSearchUrl, '_blank');
  };

  // Map database status to UI status
  const getUIStatus = (dbStatus: string): string => {
    const statusMap: Record<string, string> = {
      'contacted': 'Contacted',
      'not_interested': 'Not Interested',
      'appointment_booked': 'Booked',
      'follow_up': 'Interested',
      'new': 'New'
    };
    return statusMap[dbStatus] || dbStatus;
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading lead...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!lead) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-500">Lead not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/leads')}
            className="text-blue-600 hover:text-blue-700 mb-4 text-sm"
          >
            ← Back to Leads
          </button>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Lead Details</h1>
          
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg">
              {successMessage}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Name
              </label>
              <div className="text-base text-gray-900">{lead.full_name}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Status
              </label>
              <div className="text-base text-gray-900">{getUIStatus(lead.status)}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="contacted">Contacted</option>
                <option value="follow_up">Interested</option>
                <option value="not_interested">Not Interested</option>
                <option value="appointment_booked">Booked</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Add notes about this lead..."
              />
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {updating ? 'Updating...' : 'Update'}
              </button>
              
              <button
                onClick={handleGoogleSearch}
                className="px-6 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 font-medium"
              >
                Search on Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
