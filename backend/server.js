const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
const bcrypt = require('bcrypt');
const { formatQuestionMessage, normalizeDifficulty, normalizeDomain, pickQuestion } = require('./questionBank');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'https://hire-graph.vercel.app',
    'http://localhost:5173',
    'http://localhost:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 120000);

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function warmAiService() {
    try {
        const response = await axios.post(`${AI_URL}/warmup`, {}, { timeout: 20000 });
        return { ready: response.data?.ready !== false, data: response.data };
    } catch (err) {
        console.warn("AI warmup failed:", err.message);
        return { ready: false, error: err.message };
    }
}

function warmAiServiceInBackground() {
    warmAiService().catch(err => console.warn("Background AI warmup failed:", err.message));
}

async function postAi(path, payload, options = {}) {
    const retries = options.retries ?? 2;
    const timeout = options.timeout ?? AI_TIMEOUT_MS;
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await axios.post(`${AI_URL}${path}`, payload, { timeout });
        } catch (err) {
            lastError = err;
            if (attempt < retries) {
                await warmAiService();
                await sleep(1500 * (attempt + 1));
            }
        }
    }

    throw lastError;
}

function parseJsonContent(content) {
    if (!content) return null;
    try {
        return JSON.parse(content);
    } catch {
        return null;
    }
}

async function getAskedQuestionTitles(sessionId) {
    const result = await pool.query(
        'SELECT message_content FROM interview_messages WHERE session_id = $1 AND sender_type = $2 ORDER BY id ASC',
        [sessionId, 'AI']
    );

    return result.rows
        .map(row => parseJsonContent(row.message_content))
        .filter(content => content?.type === 'question')
        .map(content => content.title);
}

async function getSessionStats(sessionId) {
    const result = await pool.query(
        'SELECT sender_type, message_content, score FROM interview_messages WHERE session_id = $1 ORDER BY id ASC',
        [sessionId]
    );

    const evaluations = [];
    let hintCount = 0;

    for (const row of result.rows) {
        const parsed = parseJsonContent(row.message_content);
        if (parsed?.type === 'evaluation') {
            evaluations.push({
                score: Number(row.score ?? parsed.adjusted_score ?? parsed.raw_score ?? 0),
                rawScore: Number(parsed.raw_score ?? row.score ?? 0),
                adjustedScore: Number(parsed.adjusted_score ?? row.score ?? 0),
                penalty: Number(parsed.penalty ?? 0),
                metrics: parsed.metrics || {},
                feedback: parsed.feedback || ''
            });
        } else if (row.score !== null && row.score !== undefined) {
            evaluations.push({
                score: Number(row.score || 0),
                rawScore: Number(row.score || 0),
                adjustedScore: Number(row.score || 0),
                penalty: 0,
                metrics: parsed?.metrics || {},
                feedback: parsed?.feedback || row.message_content || ''
            });
        }
        if (parsed?.type === 'hint') {
            hintCount += 1;
        }
    }

    const avgScore = evaluations.length
        ? Math.round(evaluations.reduce((sum, evaluation) => sum + evaluation.adjustedScore, 0) / evaluations.length)
        : 0;
    const avgRawScore = evaluations.length
        ? Math.round(evaluations.reduce((sum, evaluation) => sum + evaluation.rawScore, 0) / evaluations.length)
        : 0;
    const totalPenalty = evaluations.reduce((sum, evaluation) => sum + evaluation.penalty, 0);
    const lastEvaluation = evaluations[evaluations.length - 1] || null;

    return {
        avgScore,
        avgRawScore,
        totalPenalty,
        hintCount,
        evaluations,
        lastEvaluation,
        questionsAnswered: evaluations.length
    };
}

function calculatePenalty({ hintCount, attemptNumber, isPassed }) {
    const hintPenalty = Math.min(hintCount * 3, 15);
    const retryPenalty = Math.max(0, attemptNumber - 1) * 7;
    const wrongSubmissionPenalty = isPassed ? 0 : 12;
    return Math.min(hintPenalty + retryPenalty + wrongSubmissionPenalty, 35);
}

app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Fixed: Insert into password_hash instead of password
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
            [name, email, hashedPassword]
        );
        res.json(newUser.rows[0]);
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: 'Server error during signup' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const userResult = await pool.query(
            'SELECT id, name, email, password_hash FROM users WHERE email = $1',
            [email]
        );
        const user = userResult.rows[0];

        if (!user || !user.password_hash || user.password_hash === 'google_oauth_user') {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        res.json({ id: user.id, name: user.name, email: user.email });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/auth/google', async (req, res) => {
    const { email, name } = req.body;
    try {
        let user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        // If Google user doesn't exist, create an account automatically
        if (user.rows.length === 0) {
            // Fixed: Insert into password_hash instead of password
            user = await pool.query(
                'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
                [name || 'Google User', email, 'google_oauth_user'] 
            );
        }
        res.json({ id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email });
    } catch (err) {
        console.error("Google Auth error:", err);
        res.status(500).json({ error: 'Google auth failed' });
    }
});

app.post('/api/ai/warmup', async (req, res) => {
    const status = await warmAiService();
    res.status(status.ready ? 200 : 202).json({
        ready: status.ready,
        message: status.ready ? 'AI service is ready.' : 'AI service is booting. Please wait a moment.'
    });
});

app.post('/api/interview/start', async (req, res) => {
    const { userId, domain, difficulty } = req.body;
    try {
        const question = pickQuestion({ domain, difficulty });

        const newSession = await pool.query(
            'INSERT INTO interview_sessions (user_id, topic, start_time, status) VALUES ($1, $2, NOW(), $3) RETURNING id',
            [userId, `${normalizeDomain(domain)} ${normalizeDifficulty(difficulty)}`, 'in_progress']
        );

        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, message_content) VALUES ($1, $2, $3)',
            [newSession.rows[0].id, 'AI', JSON.stringify({
                type: 'question',
                phase: 1,
                title: question.question_title,
                text: question.question_text,
                optimal_time: question.optimal_time,
                optimal_space: question.optimal_space
            })]
        );

        warmAiServiceInBackground();
        
        res.json({ 
            sessionId: newSession.rows[0].id,
            topic: question.question_title,
            question: question.question_text,
            testCases: question.test_cases,
            boilerplates: question.boilerplates,
            aiBooting: true
        });
    } catch (err) {
        console.error("Interview start error:", err);
        res.status(500).json({ error: 'Failed to start interview' });
    }
});

app.post('/api/interview/next', async (req, res) => {
    const { sessionId, domain, difficulty } = req.body;
    try {
        const previousTitles = await getAskedQuestionTitles(sessionId);
        const question = pickQuestion({ domain, difficulty, excludeTitles: previousTitles });
        const phase = previousTitles.length + 1;

        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, message_content) VALUES ($1, $2, $3)',
            [sessionId, 'AI', JSON.stringify({
                type: 'question',
                phase,
                title: question.question_title,
                text: question.question_text,
                optimal_time: question.optimal_time,
                optimal_space: question.optimal_space
            })]
        );

        res.json({
            topic: question.question_title,
            question: question.question_text,
            testCases: question.test_cases,
            boilerplates: question.boilerplates
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch next question' });
    }
});

app.post('/api/interview/chat', async (req, res) => {
    const { sessionId, domain, message, questionText } = req.body;
    try {
        const lowerMessage = String(message).toLowerCase();
        const isHintRequest = lowerMessage.includes('hint') || lowerMessage.includes('stuck') || lowerMessage.includes('help') || lowerMessage.includes('approach');

        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, message_content) VALUES ($1, $2, $3)',
            [sessionId, 'USER', JSON.stringify({ type: isHintRequest ? 'hint' : 'chat', content: message })]
        );

        const historyQuery = await pool.query(
            'SELECT sender_type, message_content FROM interview_messages WHERE session_id = $1 ORDER BY id ASC',
            [sessionId]
        );
        
        const chatHistory = historyQuery.rows.map(row => {
            const parsed = parseJsonContent(row.message_content);
            if (parsed?.type === 'question') return `Interviewer: ${formatQuestionMessage(parsed.phase, { title: parsed.title, text: parsed.text })}`;
            if (parsed?.type === 'evaluation') return `Interviewer: ${parsed.feedback}`;
            if (parsed?.content) return `${row.sender_type}: ${parsed.content}`;
            return `${row.sender_type}: ${row.message_content}`;
        });

        const aiResponse = await postAi('/chat', {
            domain,
            message,
            chat_history: chatHistory,
            question: questionText
        }, { retries: 2, timeout: AI_TIMEOUT_MS });

        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, message_content) VALUES ($1, $2, $3)',
            [sessionId, 'AI', JSON.stringify({ type: 'chat', content: aiResponse.data.reply })]
        );

        const stats = await getSessionStats(sessionId);
        res.json({ reply: aiResponse.data.reply, hintCount: stats.hintCount });
    } catch (err) {
        res.status(500).json({ error: 'Chat failed' });
    }
});

app.post('/api/interview/run', async (req, res) => {
    const { code, language, testCases } = req.body;
    try {
        const aiResponse = await postAi('/run', {
            code, language, test_cases: testCases
        }, { retries: 2, timeout: AI_TIMEOUT_MS });
        res.json(aiResponse.data);
    } catch (err) {
        res.status(500).json({ error: 'Run failed' });
    }
});

app.post('/api/interview/submit', async (req, res) => {
    const { sessionId, topic, domain, language, userCode } = req.body;
    try {
        const existingStats = await getSessionStats(sessionId);
        const attemptNumber = existingStats.evaluations.length + 1;

        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, message_content, submitted_code) VALUES ($1, $2, $3, $4)',
            [sessionId, 'USER', JSON.stringify({ type: 'submission', topic, attempt: attemptNumber }), userCode]
        );

        const historyQuery = await pool.query(
            'SELECT sender_type, submitted_code, message_content FROM interview_messages WHERE session_id = $1 ORDER BY id ASC',
            [sessionId]
        );
        
        const chatHistory = historyQuery.rows.map(row => {
            const parsed = parseJsonContent(row.message_content);
            if (row.sender_type === 'USER') return `Candidate: ${row.submitted_code || parsed?.content || row.message_content}`;
            if (parsed?.type === 'question') return `Interviewer: ${formatQuestionMessage(parsed.phase, { title: parsed.title, text: parsed.text })}`;
            if (parsed?.type === 'evaluation') return `Interviewer: ${parsed.feedback}`;
            if (parsed?.content) return `Interviewer: ${parsed.content}`;
            return `Interviewer: ${row.message_content}`;
        });

        const aiResponse = await postAi('/grade', {
            topic, domain, language, user_code: userCode, chat_history: chatHistory
        }, { retries: 3, timeout: 180000 });

        const { is_passed, score, metrics, feedback } = aiResponse.data;
        const penalty = calculatePenalty({ hintCount: existingStats.hintCount, attemptNumber, isPassed: is_passed });
        const adjustedScore = Math.max(0, Math.round(Number(score || 0) - penalty));
        const dbContent = JSON.stringify({
            type: 'evaluation',
            topic,
            domain,
            feedback,
            metrics,
            raw_score: Number(score || 0),
            adjusted_score: adjustedScore,
            penalty,
            hint_count: existingStats.hintCount,
            attempt: attemptNumber
        });

        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, message_content, is_passed, score) VALUES ($1, $2, $3, $4, $5)',
            [sessionId, 'AI', dbContent, is_passed, adjustedScore]
        );

        res.json({ isPassed: is_passed, score: adjustedScore, rawScore: score, penalty, metrics, feedback });
    } catch (err) {
        console.error("AI evaluation failed:", err.message);
        res.status(503).json({ error: 'AI is still booting. Please wait and submit again.' });
    }
});

app.post('/api/interview/finish', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const stats = await getSessionStats(sessionId);
        const finalScore = stats.avgScore;

        await pool.query(
            "UPDATE interview_sessions SET status = 'completed', final_score = $1 WHERE id = $2",
            [finalScore, sessionId]
        );
        res.json({ success: true, finalScore });
    } catch (err) {
        res.status(500).json({ error: 'Failed to finish session' });
    }
});

app.get('/api/sessions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const sessions = await pool.query(
            `SELECT s.*, COUNT(m.score) AS questions_answered, COALESCE(ROUND(AVG(m.score)), 0) AS avg_score
             FROM interview_sessions s
             LEFT JOIN interview_messages m ON m.session_id = s.id AND m.score IS NOT NULL
             WHERE s.user_id = $1
             GROUP BY s.id
             ORDER BY s.start_time DESC`,
            [userId]
        );
        res.json(sessions.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

app.get('/api/sessions/details/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessionQuery = await pool.query('SELECT * FROM interview_sessions WHERE id = $1', [sessionId]);
        const messagesQuery = await pool.query('SELECT * FROM interview_messages WHERE session_id = $1 ORDER BY id ASC', [sessionId]);
        if (sessionQuery.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
        const stats = await getSessionStats(sessionId);
        res.json({ session: sessionQuery.rows[0], messages: messagesQuery.rows, stats });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch details' });
    }
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
});
