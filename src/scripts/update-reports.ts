
import getTursoClient from '../lib/turso';
import { getPerformanceSummary, generateDailyReport } from '../lib/signal-tracker';

async function updateExistingReports() {
    const turso = getTursoClient();
    if (!turso) {
        console.error('Turso not configured');
        process.exit(1);
    }

    try {
        console.log('Fetching existing reports...');
        const result = await turso.execute('SELECT date FROM daily_reports');
        const dates = result.rows.map(row => row.date as string);

        console.log(`Found ${dates.length} reports to update.`);

        for (const date of dates) {
            console.log(`Updating report for date: ${date}...`);

            // This will use the NEW getPerformanceSummary logic we just updated
            const summary = await getPerformanceSummary('custom', date);
            const reportText = await generateDailyReport(date);

            if (summary) {
                await turso.execute({
                    sql: `UPDATE daily_reports SET 
                          total_signals = ?, 
                          tp_hit = ?, 
                          sl_hit = ?, 
                          pending = ?, 
                          win_rate = ?, 
                          report_text = ?
                          WHERE date = ?`,
                    args: [
                        summary.total,
                        summary.tpHit,
                        summary.slHit,
                        summary.pending,
                        parseFloat(summary.winRate),
                        reportText,
                        date
                    ]
                });
                console.log(`✅ Updated ${date}: Winrate ${summary.winRate}%`);
            }
        }

        console.log('All reports updated successfully!');
    } catch (error) {
        console.error('Update script failed:', error);
    }
}

updateExistingReports();
