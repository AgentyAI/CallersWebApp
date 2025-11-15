'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/lib/api';

interface Script {
  id?: string;
  specialty: string;
  opening_line: string;
  qualification: string;
  talking_points: string;
  objection_handling: string;
  closing_line: string;
}

export default function ScriptsPage() {
  const router = useRouter();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchScripts();
  }, []);

  // Auto-show form when editingScript is set
  useEffect(() => {
    if (editingScript && !showForm) {
      setShowForm(true);
    }
  }, [editingScript, showForm]);

  const fetchScripts = async () => {
    try {
      const response = await api.get('/scripts');
      setScripts(response.data);
    } catch (error) {
      console.error('Error fetching scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScript = async () => {
    if (!editingScript) return;

    if (!editingScript.specialty || !editingScript.specialty.trim()) {
      alert('Specialty is required');
      return;
    }

    try {
      await api.post('/scripts', editingScript);
      await fetchScripts();
      setShowForm(false);
      setEditingScript(null);
      alert('Script saved successfully');
    } catch (error: any) {
      console.error('Error saving script:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save script';
      alert(`Failed to save script: ${errorMessage}`);
    }
  };

  const handleEdit = (script: Script) => {
    setEditingScript({ ...script });
    setShowForm(true);
  };

  const handleCreateNew = () => {
    const newScript: Script = {
      specialty: '',
      opening_line: '',
      qualification: '',
      talking_points: '',
      objection_handling: '',
      closing_line: ''
    };
    setEditingScript(newScript);
    // Form will show automatically via useEffect when editingScript is set
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading scripts...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Calling Scripts</h1>
          </div>
          <button
            onClick={handleCreateNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create New Script
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {scripts.map((script) => (
            <div
              key={script.id || script.specialty}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{script.specialty}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{script.opening_line}</p>
              <button
                onClick={() => handleEdit(script)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Edit Script
              </button>
            </div>
          ))}
        </div>

        {showForm && editingScript && (
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
                      setShowForm(false);
                      setEditingScript(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleSaveScript();
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
      </div>
    </Layout>
  );
}

