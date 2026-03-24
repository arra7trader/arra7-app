
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
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Marketing Bot Automation 🤖</h2>
                <button
                    onClick={() => { setEditing(null); resetForm(); setShowForm(true); }}
                    className="admin-btn bg-purple-600 hover:bg-purple-700 text-white"
                >
                    + New Campaign
                </button>
            </div>

            {showForm && (
                <div className="glass-card p-6 animate-in fade-in border-purple-500/30">
                    <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit Campaign' : 'Create Campaign'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Campaign Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="arra-input"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Trigger Type</label>
                                <select
                                    value={type}
                                    onChange={e => setType(e.target.value as any)}
                                    className="arra-select"
                                >
                                    <option value="INACTIVITY">User Inactivity (Retention)</option>
                                    <option value="NEW_USER">New User (Onboarding)</option>
                                </select>
                            </div>
                            {type === 'INACTIVITY' && (
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Days Inactive</label>
                                    <input
                                        type="number"
                                        value={daysInactive}
                                        onChange={e => setDaysInactive(Number(e.target.value))}
                                        className="arra-input"
                                        min={1}
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Message Template (HTML supported for Email)</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                className="arra-textarea h-32 font-mono text-sm"
                                required
                            />
                            <p className="text-xs text-[var(--text-secondary)] mt-1">Available variables: {'{name}'}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Channels</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={channelEmail}
                                        onChange={e => setChannelEmail(e.target.checked)}
                                        className="w-4 h-4 text-purple-400 rounded"
                                    />
                                    Email (Resend)
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={channelTelegram}
                                        onChange={e => setChannelTelegram(e.target.checked)}
                                        className="w-4 h-4 text-purple-400 rounded"
                                    />
                                    Telegram
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setShowForm(false)} className="admin-btn-ghost px-4 py-2 flex-1 justify-center">
                                Cancel
                            </button>
                            <button type="submit" className="admin-btn bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 flex-1 justify-center">
                                Save Campaign
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid gap-4">
                {campaigns.map(campaign => (
                    <div key={campaign.id} className="bg-[var(--bg-primary)] p-4 rounded-xl shadow-sm border border-[var(--border-light)] flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-[var(--text-primary)]">{campaign.name}</h4>
                                {campaign.status === 'ACTIVE' ? (
                                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-500/15 text-green-400">Active</span>
                                ) : (
                                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">Draft</span>
                                )}
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {campaign.type === 'INACTIVITY' ? `Inactive for ${campaign.trigger_rule.daysInactive} days` : 'New User Signup'}
                                {' • '}
                                {campaign.channels.join(', ')}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit(campaign)}
                                className="p-2 text-blue-400 hover:bg-blue-500/10 border-blue-500/20 rounded-lg"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(campaign.id!)}
                                className="p-2 text-red-400 hover:bg-red-500/10 border-red-500/20 rounded-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
                {campaigns.length === 0 && !loading && (
                    <div className="text-center py-8 text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-medium)]">
                        No active campaigns. Create one to start automating!
                    </div>
                )}
            </div>

            <div className="admin-info-box">
                <h4 className="font-semibold mb-1">💡 How it works</h4>
                <p>This bot runs automatically every hour (via Vercel Cron). it checks for users matching your rules and sends them your configured message via Email or Telegram.</p>
                <div className="mt-2 text-xs opacity-75">
                    <strong>Dependencies:</strong> Ensure `RESEND_API_KEY` is set in Vercel to enable emails.
                </div>
            </div>
        </div>
    );
}
