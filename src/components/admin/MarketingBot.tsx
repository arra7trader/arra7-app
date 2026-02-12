
import { useState, useEffect } from 'react';
import { MarketingCampaign } from '@/lib/turso';

export default function MarketingBot() {
    const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<MarketingCampaign | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState<'INACTIVITY' | 'NEW_USER'>('INACTIVITY');
    const [daysInactive, setDaysInactive] = useState(3);
    const [message, setMessage] = useState('Hi {name}, we miss you! Come back for a free signal.');
    const [channelEmail, setChannelEmail] = useState(true);
    const [channelTelegram, setChannelTelegram] = useState(false);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/marketing/campaigns');
            const data = await res.json();
            if (data.campaigns) setCampaigns(data.campaigns);
        } catch (e) {
            console.error('Failed to fetch campaigns', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const campaignData: MarketingCampaign = {
            id: editing?.id,
            name,
            type,
            trigger_rule: type === 'INACTIVITY' ? { daysInactive } : {},
            message_template: message,
            channels: [
                ...(channelEmail ? ['EMAIL'] : []),
                ...(channelTelegram ? ['TELEGRAM'] : [])
            ],
            status: 'ACTIVE'
        };

        try {
            const res = await fetch('/api/admin/marketing/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save', campaign: campaignData })
            });
            const result = await res.json();
            if (result.status === 'success') {
                setShowForm(false);
                setEditing(null);
                fetchCampaigns();
                resetForm();
            } else {
                alert(result.error || 'Failed to save');
            }
        } catch (e) {
            alert('Error saving campaign');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Area you sure?')) return;
        try {
            await fetch('/api/admin/marketing/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id })
            });
            fetchCampaigns();
        } catch (e) {
            alert('Error deleting');
        }
    };

    const resetForm = () => {
        setName('');
        setType('INACTIVITY');
        setDaysInactive(3);
        setMessage('Hi {name}, we miss you!');
        setChannelEmail(true);
        setChannelTelegram(false);
    };

    const handleEdit = (c: MarketingCampaign) => {
        setEditing(c);
        setName(c.name);
        setType(c.type as any);
        if (c.type === 'INACTIVITY') {
            setDaysInactive(c.trigger_rule.daysInactive || 3);
        }
        setMessage(c.message_template);
        setChannelEmail(c.channels.includes('EMAIL'));
        setChannelTelegram(c.channels.includes('TELEGRAM'));
        setShowForm(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Marketing Bot Automation 🤖</h2>
                <button
                    onClick={() => { setEditing(null); resetForm(); setShowForm(true); }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
                >
                    + New Campaign
                </button>
            </div>

            {showForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 animate-in fade-in">
                    <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit Campaign' : 'Create Campaign'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type</label>
                                <select
                                    value={type}
                                    onChange={e => setType(e.target.value as any)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="INACTIVITY">User Inactivity (Retention)</option>
                                    <option value="NEW_USER">New User (Onboarding)</option>
                                </select>
                            </div>
                            {type === 'INACTIVITY' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Days Inactive</label>
                                    <input
                                        type="number"
                                        value={daysInactive}
                                        onChange={e => setDaysInactive(Number(e.target.value))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                                        min={1}
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message Template (HTML supported for Email)</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 h-32 font-mono text-sm"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Available variables: {'{name}'}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={channelEmail}
                                        onChange={e => setChannelEmail(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 rounded"
                                    />
                                    Email (Resend)
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={channelTelegram}
                                        onChange={e => setChannelTelegram(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 rounded"
                                    />
                                    Telegram
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-md"
                            >
                                Save Campaign
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid gap-4">
                {campaigns.map(campaign => (
                    <div key={campaign.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-800">{campaign.name}</h4>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {campaign.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500">
                                {campaign.type === 'INACTIVITY' ? `Inactive for ${campaign.trigger_rule.daysInactive} days` : 'New User Signup'}
                                {' • '}
                                {campaign.channels.join(', ')}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit(campaign)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(campaign.id!)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
                {campaigns.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        No active campaigns. Create one to start automating!
                    </div>
                )}
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
                <h4 className="font-semibold mb-1">💡 How it works</h4>
                <p>This bot runs automatically every hour (via Vercel Cron). it checks for users matching your rules and sends them your configured message via Email or Telegram.</p>
                <div className="mt-2 text-xs opacity-75">
                    <strong>Dependencies:</strong> Ensure `RESEND_API_KEY` is set in Vercel to enable emails.
                </div>
            </div>
        </div>
    );
}
