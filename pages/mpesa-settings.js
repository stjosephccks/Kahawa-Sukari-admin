import Layout from "@/components/Layout";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";

export default function MpesaSettings() {
    const { canPublish } = useAuth();
    const [saved, setSaved] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [registrationResult, setRegistrationResult] = useState(null);

    const [parishSettings, setParishSettings] = useState({
        consumerKey: '',
        consumerSecret: '',
        passkey: '',
        paybill: ''
    });

    const [outstationSettings, setOutstationSettings] = useState({
        consumerKey: '',
        consumerSecret: '',
        passkey: '',
        paybill: ''
    });

    const [environment, setEnvironment] = useState('sandbox');

    function handleSave() {
        // This would typically save to environment variables or database
        // For now, we'll show a message about updating .env file
        alert('To save these settings, please update your .env file with the following values:\n\n' +
              'MPESA_ENVIRONMENT=' + environment + '\n' +
              'MPESA_PARISH_CONSUMER_KEY=' + parishSettings.consumerKey + '\n' +
              'MPESA_PARISH_CONSUMER_SECRET=' + parishSettings.consumerSecret + '\n' +
              'MPESA_PARISH_PASSKEY=' + parishSettings.passkey + '\n' +
              'MPESA_PARISH_PAYBILL=' + parishSettings.paybill + '\n' +
              'MPESA_OUTSTATION_CONSUMER_KEY=' + outstationSettings.consumerKey + '\n' +
              'MPESA_OUTSTATION_CONSUMER_SECRET=' + outstationSettings.consumerSecret + '\n' +
              'MPESA_OUTSTATION_PASSKEY=' + outstationSettings.passkey + '\n' +
              'MPESA_OUTSTATION_PAYBILL=' + outstationSettings.paybill);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    }

    async function handleRegisterUrls() {
        const baseUrl = window.location.origin;
        const validationUrl = `${baseUrl}/api/mpesa/validation`;
        const confirmationUrl = `${baseUrl}/api/mpesa/confirmation`;

        setRegistering(true);
        setRegistrationResult(null);

        try {
            const response = await axios.post('/api/mpesa/register', {
                validationUrl,
                confirmationUrl
            });
            setRegistrationResult(response.data);
        } catch (error) {
            setRegistrationResult({ error: error.response?.data?.error || 'Failed to register URLs' });
        } finally {
            setRegistering(false);
        }
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">M-Pesa Settings</h1>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex">
                        <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-yellow-800">
                            <strong>Note:</strong> These settings are currently configured via environment variables in the .env file. 
                            Use this page as a reference for the required values. In production, consider implementing a secure database storage for credentials.
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
                    <select
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md w-full max-w-xs"
                    >
                        <option value="sandbox">Sandbox (Testing)</option>
                        <option value="production">Production (Live)</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Parish Settings */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Parish M-Pesa Credentials</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Key</label>
                                <input
                                    type="text"
                                    value={parishSettings.consumerKey}
                                    onChange={(e) => setParishSettings({...parishSettings, consumerKey: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Enter parish consumer key"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Secret</label>
                                <input
                                    type="password"
                                    value={parishSettings.consumerSecret}
                                    onChange={(e) => setParishSettings({...parishSettings, consumerSecret: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Enter parish consumer secret"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Passkey</label>
                                <input
                                    type="password"
                                    value={parishSettings.passkey}
                                    onChange={(e) => setParishSettings({...parishSettings, passkey: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Enter parish passkey"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paybill Number</label>
                                <input
                                    type="text"
                                    value={parishSettings.paybill}
                                    onChange={(e) => setParishSettings({...parishSettings, paybill: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Enter parish paybill number"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Outstation Settings */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Outstation M-Pesa Credentials</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Key</label>
                                <input
                                    type="text"
                                    value={outstationSettings.consumerKey}
                                    onChange={(e) => setOutstationSettings({...outstationSettings, consumerKey: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Enter outstation consumer key"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Secret</label>
                                <input
                                    type="password"
                                    value={outstationSettings.consumerSecret}
                                    onChange={(e) => setOutstationSettings({...outstationSettings, consumerSecret: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Enter outstation consumer secret"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Passkey</label>
                                <input
                                    type="password"
                                    value={outstationSettings.passkey}
                                    onChange={(e) => setOutstationSettings({...outstationSettings, passkey: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Enter outstation passkey"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paybill Number</label>
                                <input
                                    type="text"
                                    value={outstationSettings.paybill}
                                    onChange={(e) => setOutstationSettings({...outstationSettings, paybill: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Enter outstation paybill number"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex gap-4">
                    {canPublish && (
                        <button
                            onClick={handleSave}
                            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                        >
                            {saved ? 'Saved!' : 'Save Settings'}
                        </button>
                    )}
                    {canPublish && (
                        <button
                            onClick={handleRegisterUrls}
                            disabled={registering}
                            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:bg-gray-400"
                        >
                            {registering ? 'Registering...' : 'Register C2B URLs'}
                        </button>
                    )}
                </div>

                {registrationResult && (
                    <div className={`mt-6 border rounded-lg p-4 ${registrationResult.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <h4 className="font-semibold mb-2">Registration Result</h4>
                        {registrationResult.error ? (
                            <p className="text-red-700">{registrationResult.error}</p>
                        ) : (
                            <div>
                                {registrationResult.map && registrationResult.map((result, index) => (
                                    <div key={index} className={`mb-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                        {result.success ? '✓' : '✗'} {result.paybill} ({result.shortcode}): {result.success ? 'Success' : result.error}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Get M-Pesa Credentials</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        <li>Go to <a href="https://developer.safaricom.co.ke/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Safaricom Developer Portal</a></li>
                        <li>Create an account or log in</li>
                        <li>Create a new app in the dashboard</li>
                        <li>Copy the Consumer Key and Consumer Secret from your app</li>
                        <li>For production, you&apos;ll need to request a passkey from Safaricom</li>
                        <li>Register your paybill numbers with Safaricom for C2B payments</li>
                        <li><strong>Click &quot;Register C2B URLs&quot; button above to register your callback URLs with Safaricom</strong></li>
                    </ol>
                </div>
            </div>
        </Layout>
    );
}
