'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';

interface Lead {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  specialty: string;
  status: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags: Array<{ id: string; name: string; color?: string }>;
  call_attempts: Array<any>;
  appointments: Array<any>;
  data_completeness_score: number;
}

interface Script {
  specialty: string;
  opening_line: string;
  qualification: string;
  talking_points: string;
  objection_handling: string;
  closing_line: string;
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params?.id as string;
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'script' | 'calls' | 'appointments'>('details');
  const [showCallForm, setShowCallForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  
  const [editForm, setEditForm] = useState({
    phone: '',
    email: '',
    notes: '',
    status: '',
    first_name: '',
    last_name: '',
    tags: [] as string[]
  });

  const [callForm, setCallForm] = useState({
    outcome: 'no_answer',
    notes: '',
    interest_level: 3,
    appointment_likelihood: 3,
    decision_maker_reached: false,
    call_control: 3,
    objection_handling: 3
  });

  const [appointmentForm, setAppointmentForm] = useState({
    scheduled_at: '',
    notes: ''
  });

  useEffect(() => {
    if (leadId) {
      fetchLead();
      fetchScript();
    }
  }, [leadId]);

  const fetchLead = async () => {
    try {
      const response = await api.get(`/leads/${leadId}`);
      const leadData = response.data;
      setLead(leadData);
      setEditForm({
        phone: leadData.phone || '',
        email: leadData.email || '',
        notes: leadData.notes || '',
        status: leadData.status || '',
        first_name: leadData.first_name || '',
        last_name: leadData.last_name || '',
        tags: leadData.tags?.map((t: any) => t.name) || []
      });
    } catch (error) {
      console.error('Error fetching lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScript = async (specialty: string) => {
    try {
      const response = await api.get(`/scripts/${specialty}`);
      setScript(response.data);
    } catch (error) {
      console.error('Error fetching script:', error);
    }
  };

  useEffect(() => {
    if (lead?.specialty) {
      fetchScript(lead.specialty);
    }
  }, [lead?.specialty]);

  const handleUpdateLead = async () => {
    try {
      await api.patch(`/leads/${leadId}`, editForm);
      await fetchLead();
      alert('Lead updated successfully');
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead');
    }
  };

  const handleLogCall = async () => {
    try {
      await api.post(`/leads/${leadId}/calls`, callForm);
      await fetchLead();
      setShowCallForm(false);
      setCallForm({
        outcome: 'no_answer',
        notes: '',
        interest_level: 3,
        appointment_likelihood: 3,
        decision_maker_reached: false,
        call_control: 3,
        objection_handling: 3
      });
      alert('Call logged successfully');
    } catch (error) {
      console.error('Error logging call:', error);
      alert('Failed to log call');
    }
  };

  const handleBookAppointment = async () => {
    try {
      // Get Google OAuth token (simplified - in production, handle OAuth flow properly)
      const { data: { session } } = await import('@/lib/supabase').then(m => 
        m.supabase.auth.getSession()
      );

      // For now, we'll create the appointment without Google Calendar
      // In production, implement proper OAuth flow
      await api.post('/appointments', {
        lead_id: leadId,
        scheduled_at: appointmentForm.scheduled_at,
        notes: appointmentForm.notes
      });
      
      await fetchLead();
      setShowAppointmentForm(false);
      setAppointmentForm({ scheduled_at: '', notes: '' });
      alert('Appointment booked successfully');
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Failed to book appointment');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-500">Lead not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/leads')}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Leads
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{lead.full_name}</h1>
          <p className="text-gray-600">{lead.specialty}</p>
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {(['details', 'script', 'calls', 'appointments'] as const).map((tab) => (
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

        {activeTab === 'details' && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="appointment_booked">Appointment Booked</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="follow_up">Follow Up</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={handleUpdateLead}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowCallForm(true)}
                className="ml-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Log Call
              </button>
              <button
                onClick={() => setShowAppointmentForm(true)}
                className="ml-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Book Appointment
              </button>
            </div>
          </div>
        )}

        {activeTab === 'script' && script && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Calling Script - {script.specialty}</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Opening Line</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{script.opening_line}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Qualification</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{script.qualification}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Talking Points</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-line">{script.talking_points}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Objection Handling</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-line">{script.objection_handling}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Closing Line</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{script.closing_line}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calls' && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Call History</h2>
              <button
                onClick={() => setShowCallForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Log New Call
              </button>
            </div>
            <div className="space-y-4">
              {lead.call_attempts?.map((call: any) => (
                <div key={call.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold">{call.outcome.replace('_', ' ')}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(call.created_at).toLocaleString()}
                    </span>
                  </div>
                  {call.notes && <p className="text-gray-700 mb-2">{call.notes}</p>}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                    {call.interest_level && (
                      <div>Interest: {call.interest_level}/5</div>
                    )}
                    {call.appointment_likelihood && (
                      <div>Appt Likelihood: {call.appointment_likelihood}/5</div>
                    )}
                    {call.call_control && (
                      <div>Call Control: {call.call_control}/5</div>
                    )}
                    {call.objection_handling && (
                      <div>Objection Handling: {call.objection_handling}/5</div>
                    )}
                    {call.decision_maker_reached && (
                      <div>Decision Maker: Yes</div>
                    )}
                  </div>
                </div>
              ))}
              {(!lead.call_attempts || lead.call_attempts.length === 0) && (
                <p className="text-gray-500">No calls logged yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Appointments</h2>
              <button
                onClick={() => setShowAppointmentForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Book Appointment
              </button>
            </div>
            <div className="space-y-4">
              {lead.appointments?.map((apt: any) => (
                <div key={apt.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold">
                      {new Date(apt.scheduled_at).toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500">{apt.status}</span>
                  </div>
                  {apt.notes && <p className="text-gray-700 mb-2">{apt.notes}</p>}
                  {apt.google_meet_link && (
                    <a
                      href={apt.google_meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Join Google Meet
                    </a>
                  )}
                </div>
              ))}
              {(!lead.appointments || lead.appointments.length === 0) && (
                <p className="text-gray-500">No appointments scheduled</p>
              )}
            </div>
          </div>
        )}

        {showCallForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Log Call</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Outcome</label>
                  <select
                    value={callForm.outcome}
                    onChange={(e) => setCallForm({ ...callForm, outcome: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="no_answer">No Answer</option>
                    <option value="voicemail">Voicemail</option>
                    <option value="contacted">Contacted</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="appointment_booked">Appointment Booked</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={callForm.notes}
                    onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Interest Level (1-5)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={callForm.interest_level}
                      onChange={(e) => setCallForm({ ...callForm, interest_level: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appointment Likelihood (1-5)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={callForm.appointment_likelihood}
                      onChange={(e) => setCallForm({ ...callForm, appointment_likelihood: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Call Control (1-5)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={callForm.call_control}
                      onChange={(e) => setCallForm({ ...callForm, call_control: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Objection Handling (1-5)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={callForm.objection_handling}
                      onChange={(e) => setCallForm({ ...callForm, objection_handling: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={callForm.decision_maker_reached}
                      onChange={(e) => setCallForm({ ...callForm, decision_maker_reached: e.target.checked })}
                      className="mr-2"
                    />
                    Decision Maker Reached
                  </label>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowCallForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogCall}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Log Call
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAppointmentForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Book Appointment</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={appointmentForm.scheduled_at}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduled_at: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={appointmentForm.notes}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowAppointmentForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBookAppointment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Book Appointment
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

