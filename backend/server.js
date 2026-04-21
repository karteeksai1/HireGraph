const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

app.post('/api/interview/start', async (req, res) => {
    const { userId, candidateName, domain, difficulty } = req.body;
    try {
        const aiResponse = await axios.post(`${AI_URL}/question`, { domain, difficulty });
        const { question_title, question_text, test_cases, boilerplates } = aiResponse.data;

        const newSession = await pool.query(
            'INSERT INTO interview_sessions (user_id, topic, start_time, status) VALUES ($1, $2, NOW(), $3) RETURNING id',
            [userId, question_title || domain, 'in_progress']
        );
        
        res.json({ 
            sessionId: newSession.rows[0].id,
            topic: question_title || domain,
            question: question_text,
            testCases: test_cases,
            boilerplates: boilerplates
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to start session' });
    }
});

app.post('/api/interview/next', async (req, res) => {
    const { sessionId, domain, difficulty, previousTopic } = req.body;
    try {
        const aiResponse = await axios.post(`${AI_URL}/question`, { 
            domain, difficulty, previous_topic: previousTopic 
        });
        const { question_title, question_text, test_cases, boilerplates } = aiResponse.data;

        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, message_content) VALUES ($1, $2, $3)',
            [sessionId, 'AI', `Phase 2 initiated.\n\nNew Challenge: ${question_title}\n\n${question_text}`]
        );

        res.json({
            topic: question_title || domain,
            question: question_text,
            testCases: test_cases,
            boilerplates: boilerplates
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch next question' });
    }
});

app.post('/api/interview/chat', async (req, res) => {
    const { sessionId, domain, message, questionText } = req.body;
    try {
        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, message_content) VALUES ($1, $2, $3)',
            [sessionId, 'USER', message]
        );

        const historyQuery = await pool.query(
            'SELECT sender_type, message_content FROM interview_messages WHERE session_id = $1 ORDER BY id ASC',
            [sessionId]
        );
        
        const chatHistory = historyQuery.rows.map(row => `${row.sender_type}: ${row.message_content}`);

        const aiResponse = await axios.post(`${AI_URL}/chat`, {
            domain,
            message,
            chat_history: chatHistory,
            question: questionText
        });

        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, message_content) VALUES ($1, $2, $3)',
            [sessionId, 'AI', aiResponse.data.reply]
        );

        res.json({ reply: aiResponse.data.reply });
    } catch (err) {
        res.status(500).json({ error: 'Chat failed' });
    }
});

app.post('/api/interview/run', async (req, res) => {
    const { code, language, testCases } = req.body;
    try {
        const aiResponse = await axios.post(`${AI_URL}/run`, {
            code, language, test_cases: testCases
        });
        res.json(aiResponse.data);
    } catch (err) {
        res.status(500).json({ error: 'Run failed' });
    }
});

app.post('/api/interview/submit', async (req, res) => {
    const { sessionId, topic, domain, language, userCode } = req.body;
    try {
        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, submitted_code) VALUES ($1, $2, $3)',
            [sessionId, 'USER', userCode]
        );

        const historyQuery = await pool.query(
            'SELECT sender_type, submitted_code, message_content FROM interview_messages WHERE session_id = $1 ORDER BY id ASC',
            [sessionId]
        );
        
        const chatHistory = historyQuery.rows.map(row => {
            if (row.sender_type === 'USER') return `Candidate: ${row.submitted_code || row.message_content}`;
            try { return `Interviewer: ${JSON.parse(row.message_content).feedback}`; } 
            catch(e) { return `Interviewer: ${row.message_content}`; }
        });

        const aiResponse = await axios.post(`${AI_URL}/grade`, {
            topic, domain, language, user_code: userCode, chat_history: chatHistory
        });

        const { is_passed, score, metrics, feedback } = aiResponse.data;
        const dbContent = JSON.stringify({ feedback, metrics });

        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, message_content, is_passed, score) VALUES ($1, $2, $3, $4, $5)',
            [sessionId, 'AI', dbContent, is_passed, score]
        );

        res.json({ isPassed: is_passed, score, metrics, feedback });
    } catch (err) {
        res.status(500).json({ error: 'AI Evaluation Failed' });
    }
});

app.post('/api/interview/finish', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const scoreQuery = await pool.query(
            'SELECT AVG(score) as avg_score FROM interview_messages WHERE session_id = $1 AND score IS NOT NULL AND score > 0',
            [sessionId]
        );
        
        const rawScore = scoreQuery.rows[0].avg_score || 0;
        const finalScore = Math.round(rawScore);

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
            'SELECT * FROM interview_sessions WHERE user_id = $1 ORDER BY start_time DESC',
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
        res.json({ session: sessionQuery.rows[0], messages: messagesQuery.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch details' });
    }
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
});