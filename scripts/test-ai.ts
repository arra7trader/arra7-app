
import { generateTextHybrid } from '../src/lib/ai-provider';
import * as fs from 'fs';
import * as path from 'path';

// Manually load .env.local
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach((line) => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes
                process.env[key] = value;
            }
        });
        console.log('✅ Loaded .env.local');
    } else {
        console.warn('⚠️ .env.local not found');
    }
} catch (e) {
    console.error('Error loading .env.local:', e);
}

async function testAI() {
    console.log('--- AI Provider Test ---');
    console.log('Groq Key Present:', !!process.env.GROQ_API_KEY);
    console.log('Google Key Present:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    try {
        console.log('\nAttempting Hybrid Generation...');
        const result = await generateTextHybrid({
            messages: [{ role: 'user', content: 'Say "Hello, World!" and nothing else.' }],
            maxTokens: 50,
            temperature: 0.1
        });
        console.log('✅ Success!');
        console.log('Output:', result.text);
    } catch (error) {
        console.error('❌ Failed:', error);
    }
}

testAI();
