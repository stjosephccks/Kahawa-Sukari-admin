import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import axios from 'axios';

export default function SMSPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [zakas, setZakas] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [balance, setBalance] = useState(null);
  const [stats, setStats] = useState(null);

  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [filteredRecipients, setFilteredRecipients] = useState([]);
  const [message, setMessage] = useState('');
  const [messageLength, setMessageLength] = useState(0);

  const [recipientType, setRecipientType] = useState('individual'); // individual, group, all, payment_filter
  const [paymentFilter, setPaymentFilter] = useState({
    month: '',
    year: new Date().getFullYear(),
    status: 'unpaid' // paid, unpaid
  });
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    content: '',
    category: 'general',
    description: ''
  });
  const [paymentFormData, setPaymentFormData] = useState({
    zakaNumber: '',
    month: '',
    year: new Date().getFullYear(),
    amount: '',
    paymentMethod: 'cash',
    notes: ''
  });
  const [templateData, setTemplateData] = useState({
    month: '',
    year: new Date().getFullYear(),
    amount: ''
  });

  const fetchZakas = useCallback(async () => {
    try {
      const response = await axios.get('/api/zaka?limit=1000');
      setZakas(response.data.zakas || []);
    } catch (err) {
      console.error('Error fetching zakas:', err);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await axios.get('/api/sms?action=groups');
      setGroups(response.data.groups || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      const response = await axios.get('/api/sms?action=balance');
      setBalance(response.data.balance);
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get('/api/sms?action=stats');
      setStats(response.data.balance);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await axios.get('/api/smstemplates');
      setTemplates(response.data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/api/auth/signin');
      return;
    }
    fetchZakas();
    fetchGroups();
    fetchBalance();
    fetchStats();
    fetchTemplates();
  }, [session, status, fetchZakas, fetchGroups, fetchBalance, fetchStats, fetchTemplates, router]);

  const handleRecipientTypeChange = (type) => {
    setRecipientType(type);
    setSelectedRecipients([]);
    setSelectedGroups([]);
    setSendToAll(false);
    setFilteredRecipients([]);
  };

  const fetchPaymentFilteredRecipients = async () => {
    try {
      const response = await axios.get('/api/sms?action=payment_filter', {
        params: paymentFilter
      });
      setFilteredRecipients(response.data.recipients || []);
      setSelectedRecipients(response.data.recipients?.map(r => r.zakaNumber) || []);
    } catch (err) {
      console.error('Error fetching filtered recipients:', err);
      setError(err.response?.data?.error || 'Failed to fetch filtered recipients');
    }
  };

  useEffect(() => {
    if (recipientType === 'payment_filter' && paymentFilter.month && paymentFilter.year) {
      fetchPaymentFilteredRecipients();
    }
  }, [recipientType, paymentFilter.month, paymentFilter.year, paymentFilter.status]);

  const handleRecipientToggle = (zakaNumber) => {
    setSelectedRecipients(prev => {
      if (prev.includes(zakaNumber)) {
        return prev.filter(id => id !== zakaNumber);
      } else {
        return [...prev, zakaNumber];
      }
    });
  };

  const handleGroupToggle = (group) => {
    setSelectedGroups(prev => {
      if (prev.includes(group)) {
        return prev.filter(g => g !== group);
      } else {
        return [...prev, group];
      }
    });
  };

  const handleSelectAllZakas = () => {
    if (selectedRecipients.length === zakas.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(zakas.map(z => z.zakaNumber));
    }
  };

  const handleSelectAllGroups = () => {
    if (selectedGroups.length === groups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups([...groups]);
    }
  };

  const handleMessageChange = (e) => {
    const text = e.target.value;
    setMessage(text);
    setMessageLength(text.length);
  };

  const handleSendSMS = async () => {
    setError('');
    setSuccess('');

    if (!message.trim() && !selectedTemplate) {
      setError('Please enter a message or select a template');
      return;
    }

    if (recipientType === 'individual' && selectedRecipients.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    if (recipientType === 'group' && selectedGroups.length === 0) {
      setError('Please select at least one group');
      return;
    }

    setSending(true);

    try {
      let response;
      const payload = {
        message: message,
        templateId: selectedTemplate?._id,
        templateData: selectedTemplate ? templateData : null
      };
      
      if (recipientType === 'individual') {
        const recipients = zakas.filter(z => selectedRecipients.includes(z.zakaNumber));
        response = await axios.post('/api/sms', {
          ...payload,
          action: 'send_bulk',
          recipients: recipients.map(r => ({ mobile: r.mobileNumber, fullName: r.fullName, zakaNumber: r.zakaNumber, group: r.group }))
        });
      } else if (recipientType === 'group') {
        const recipients = zakas.filter(z => selectedGroups.includes(z.group));
        response = await axios.post('/api/sms', {
          ...payload,
          action: 'send_bulk',
          recipients: recipients.map(r => ({ mobile: r.mobileNumber, fullName: r.fullName, zakaNumber: r.zakaNumber, group: r.group }))
        });
      } else if (recipientType === 'all') {
        response = await axios.post('/api/sms', {
          ...payload,
          action: 'send_bulk',
          recipients: zakas.map(r => ({ mobile: r.mobileNumber, fullName: r.fullName, zakaNumber: r.zakaNumber, group: r.group }))
        });
      } else if (recipientType === 'payment_filter') {
        response = await axios.post('/api/sms', {
          ...payload,
          action: 'send_bulk',
          recipients: filteredRecipients.map(r => ({ mobile: r.mobileNumber, fullName: r.fullName, zakaNumber: r.zakaNumber, group: r.group }))
        });
      }

      if (response.data.success) {
        setSuccess(`SMS sent successfully to ${response.data.sent} recipients`);
        setMessage('');
        setSelectedTemplate(null);
        setSelectedRecipients([]);
        setSelectedGroups([]);
        setMessageLength(0);
        fetchBalance(); // Refresh balance
      } else {
        setError(response.data.error || 'Failed to send SMS');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setMessage(template.content);
    setMessageLength(template.content.length);
  };

  const handleCreateTemplate = async () => {
    try {
      let savedTemplate;
      if (editingTemplate) {
        const response = await axios.put('/api/smstemplates', { ...templateFormData, _id: editingTemplate._id });
        savedTemplate = response.data;
      } else {
        const response = await axios.post('/api/smstemplates', templateFormData);
        savedTemplate = response.data;
      }
      setShowTemplateModal(false);
      setTemplateFormData({ name: '', content: '', category: 'general', description: '' });
      setEditingTemplate(null);
      await fetchTemplates();
      
      // If editing the currently selected template, update the message
      if (selectedTemplate && editingTemplate && selectedTemplate._id === editingTemplate._id) {
        setSelectedTemplate(savedTemplate);
        setMessage(savedTemplate.content);
        setMessageLength(savedTemplate.content.length);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save template');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateFormData({
      name: template.name,
      content: template.content,
      category: template.category,
      description: template.description || ''
    });
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await axios.delete(`/api/smstemplates?id=${templateId}`);
      fetchTemplates();
      if (selectedTemplate?._id === templateId) {
        setSelectedTemplate(null);
        setMessage('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete template');
    }
  };

  const getPreviewMessage = () => {
    if (!selectedTemplate) return message;
    
    // Preview with sample data
    const sampleData = {
      ...templateData,
      name: 'Sample Member',
      zakaNumber: '1234',
      group: 'ST JUDE',
      mobileNumber: '254712345678'
    };
    
    let preview = selectedTemplate.content;
    Object.keys(sampleData).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      preview = preview.replace(regex, sampleData[key] || '');
    });
    
    return preview;
  };

  const handleQuickPayment = async () => {
    try {
      await axios.post('/api/zakapayments', paymentFormData);
      setShowPaymentModal(false);
      setPaymentFormData({
        zakaNumber: '',
        month: '',
        year: new Date().getFullYear(),
        amount: '',
        paymentMethod: 'cash',
        notes: ''
      });
      setSuccess('Payment recorded successfully');
      
      // Refresh filtered recipients if using payment filter
      if (recipientType === 'payment_filter') {
        fetchPaymentFilteredRecipients();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record payment');
    }
  };

  const openPaymentModal = (zakaNumber) => {
    setPaymentFormData({
      ...paymentFormData,
      zakaNumber,
      month: paymentFilter.month || '',
      year: paymentFilter.year || new Date().getFullYear()
    });
    setShowPaymentModal(true);
  };

  const getRecipientCount = () => {
    if (recipientType === 'individual') {
      return selectedRecipients.length;
    } else if (recipientType === 'group') {
      const groupMembers = zakas.filter(z => selectedGroups.includes(z.group));
      return groupMembers.length;
    } else if (recipientType === 'all') {
      return zakas.length;
    } else if (recipientType === 'payment_filter') {
      return filteredRecipients.length;
    }
    return 0;
  };

  if (status === 'loading') {
    return <Layout><div className="flex justify-center p-8">Loading...</div></Layout>;
  }

  if (!session) {
    return null;
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Bulk SMS Messaging</h1>
          <button
            onClick={fetchBalance}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Refresh Balance
          </button>
        </div>

        {/* Balance and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">SMS Balance</h3>
            <p className="text-2xl font-bold text-gray-900">
              {balance ? balance.credit || 'N/A' : 'Loading...'}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Zaka Members</h3>
            <p className="text-2xl font-bold text-gray-900">
              {stats ? stats.totalZakas : 'Loading...'}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Members with Phone</h3>
            <p className="text-2xl font-bold text-gray-900">
              {stats ? stats.zakaWithPhone : 'Loading...'}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Recipient Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Select Recipients</h2>
          
          <div className="flex space-x-4 mb-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="individual"
                checked={recipientType === 'individual'}
                onChange={() => handleRecipientTypeChange('individual')}
                className="mr-2"
              />
              Individual Members
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="group"
                checked={recipientType === 'group'}
                onChange={() => handleRecipientTypeChange('group')}
                className="mr-2"
              />
              By Group/Jumuiya
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="all"
                checked={recipientType === 'all'}
                onChange={() => handleRecipientTypeChange('all')}
                className="mr-2"
              />
              All Members
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="payment_filter"
                checked={recipientType === 'payment_filter'}
                onChange={() => handleRecipientTypeChange('payment_filter')}
                className="mr-2"
              />
              By Payment Status
            </label>
          </div>

          {/* Payment Filter Controls */}
          {recipientType === 'payment_filter' && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">Payment Filter</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Month</label>
                  <select
                    value={paymentFilter.month}
                    onChange={(e) => setPaymentFilter({ ...paymentFilter, month: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="">Select month</option>
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Year</label>
                  <input
                    type="number"
                    value={paymentFilter.year}
                    onChange={(e) => setPaymentFilter({ ...paymentFilter, year: parseInt(e.target.value) })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Status</label>
                  <select
                    value={paymentFilter.status}
                    onChange={(e) => setPaymentFilter({ ...paymentFilter, status: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="unpaid">Unpaid Members</option>
                    <option value="paid">Paid Members</option>
                  </select>
                </div>
              </div>
              {filteredRecipients.length > 0 && (
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-sm text-blue-700">
                    Found {filteredRecipients.length} members matching filter
                  </span>
                  {paymentFilter.status === 'unpaid' && (
                    <button
                      onClick={() => {
                        if (filteredRecipients.length === 1) {
                          openPaymentModal(filteredRecipients[0].zakaNumber);
                        }
                      }}
                      disabled={filteredRecipients.length !== 1}
                      className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Record payment for single member"
                    >
                      Record Payment
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {recipientType === 'individual' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  {selectedRecipients.length} of {zakas.length} selected
                </span>
                <button
                  onClick={handleSelectAllZakas}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedRecipients.length === zakas.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        <input
                          type="checkbox"
                          checked={selectedRecipients.length === zakas.length}
                          onChange={handleSelectAllZakas}
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Zaka #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Phone
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {zakas.map(zaka => (
                      <tr key={zaka.zakaNumber} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedRecipients.includes(zaka.zakaNumber)}
                            onChange={() => handleRecipientToggle(zaka.zakaNumber)}
                          />
                        </td>
                        <td className="px-4 py-2 text-sm">{zaka.zakaNumber}</td>
                        <td className="px-4 py-2 text-sm">{zaka.fullName}</td>
                        <td className="px-4 py-2 text-sm">{zaka.mobileNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {recipientType === 'group' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  {selectedGroups.length} of {groups.length} groups selected
                </span>
                <button
                  onClick={handleSelectAllGroups}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedGroups.length === groups.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {groups.map(group => (
                  <label key={group} className="flex items-center p-2 border rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group)}
                      onChange={() => handleGroupToggle(group)}
                      className="mr-2"
                    />
                    <span className="text-sm">{group}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {recipientType === 'all' && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-sm text-blue-800">
                This will send SMS to all {zakas.length} zaka members with valid phone numbers.
              </p>
            </div>
          )}
        </div>

        {/* Message Composition */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Compose Message</h2>
          
          {/* Template Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template (Optional)
            </label>
            <div className="flex gap-2">
              <select
                value={selectedTemplate?._id || ''}
                onChange={(e) => {
                  const template = templates.find(t => t._id === e.target.value);
                  handleTemplateSelect(template);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a template...</option>
                {templates.map(template => (
                  <option key={template._id} value={template._id}>
                    {template.name} ({template.category})
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateFormData({ name: '', content: '', category: 'general', description: '' });
                  setShowTemplateModal(true);
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
              >
                + New Template
              </button>
            </div>
            
            {/* Template Actions */}
            {selectedTemplate && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleEditTemplate(selectedTemplate)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit Template
                </button>
                <button
                  onClick={() => handleDeleteTemplate(selectedTemplate._id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete Template
                </button>
              </div>
            )}
          </div>

          {/* Template Variables */}
          {selectedTemplate && selectedTemplate.variables.length > 0 && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Template Variables</h3>
              <div className="grid grid-cols-2 gap-4">
                {selectedTemplate.variables.includes('month') && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Month</label>
                    <select
                      value={templateData.month}
                      onChange={(e) => setTemplateData({ ...templateData, month: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="">Select month</option>
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedTemplate.variables.includes('year') && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Year</label>
                    <input
                      type="number"
                      value={templateData.year}
                      onChange={(e) => setTemplateData({ ...templateData, year: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                )}
                {selectedTemplate.variables.includes('amount') && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Amount</label>
                    <input
                      type="number"
                      value={templateData.amount}
                      onChange={(e) => setTemplateData({ ...templateData, amount: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="Enter amount"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={handleMessageChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              rows="5"
              maxLength={1600}
              placeholder="Type your message here..."
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                {messageLength} / 1600 characters
              </span>
              <span className="text-xs text-gray-500">
                ~{Math.ceil(messageLength / 160)} SMS message(s)
              </span>
            </div>
          </div>

          {/* Message Preview */}
          {selectedTemplate && (
            <div className="mb-4 bg-gray-50 border border-gray-200 rounded p-3">
              <h3 className="text-xs font-semibold text-gray-700 mb-1">Preview (with sample data)</h3>
              <p className="text-sm text-gray-600">{getPreviewMessage()}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Recipients: <span className="font-semibold">{getRecipientCount()}</span>
            </div>
            <button
              onClick={handleSendSMS}
              disabled={sending || getRecipientCount() === 0 || (!message.trim() && !selectedTemplate)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Send SMS'}
            </button>
          </div>
        </div>

        {/* SMS Tips */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">SMS Tips</h3>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Standard SMS is 160 characters. Longer messages are split.</li>
            <li>• Phone numbers are automatically normalized to 254 format.</li>
            <li>• Invalid phone numbers are automatically filtered out.</li>
            <li>• Check your balance before sending bulk messages.</li>
            <li>• Use templates with variables like {'{{name}}'}, {'{{month}}'}, {'{{amount}}'} for personalized messages.</li>
          </ul>
        </div>
      </div>

      {/* Template Creation/Edit Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateTemplate(); }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateFormData.name}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={templateFormData.category}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="general">General</option>
                  <option value="payment_reminder">Payment Reminder</option>
                  <option value="payment_confirmation">Payment Confirmation</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Content
                </label>
                <textarea
                  value={templateFormData.content}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows="5"
                  placeholder="Use {'{{name}}'}, {'{{zakaNumber}}'}, {'{{month}}'}, {'{{year}}'}, {'{{amount}}'}, {'{{group}}'} for variables"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={templateFormData.description}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false);
                    setTemplateFormData({ name: '', content: '', category: 'general', description: '' });
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Record Quick Payment</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleQuickPayment(); }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zaka Number
                </label>
                <input
                  type="text"
                  value={paymentFormData.zakaNumber}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, zakaNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  disabled
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  value={paymentFormData.month}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, month: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select month</option>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  value={paymentFormData.year}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (KES)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentFormData.paymentMethod}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentFormData({
                      zakaNumber: '',
                      month: '',
                      year: new Date().getFullYear(),
                      amount: '',
                      paymentMethod: 'cash',
                      notes: ''
                    });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
