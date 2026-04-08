const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        
        const { sub: googleId, email, name, picture } = ticket.getPayload();

        let userResult = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
        
        if (userResult.rows.length === 0) {
            userResult = await pool.query(
                'INSERT INTO users (google_id, email, name, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *',
                [googleId, email, name, picture]
            );
        }
        
        res.json({ user: userResult.rows[0] });
    } catch (error) {
        res.status(401).json({ error: 'Invalid Google Token' });
    }
});

app.get('/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'Express is running', db_time: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ error: 'Database connection failed' });
    }
});

app.post('/api/interview/start', async (req, res) => {
    const { candidateName, topic } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO interview_sessions (candidate_name, topic) VALUES ($1, $2) RETURNING id',
            [candidateName, topic]
        );
        res.json({ sessionId: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/interview/submit', async (req, res) => {
    const { sessionId, topic, userCode } = req.body;
    try {
        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, submitted_code) VALUES ($1, $2, $3)',
            [sessionId, 'USER', userCode]
        );

        const aiResponse = await axios.post('http://127.0.0.1:8000/grade', {
            topic: topic,
            user_code: userCode
        });

        const { is_passed, feedback } = aiResponse.data;

        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, message_content, is_passed) VALUES ($1, $2, $3, $4)',
            [sessionId, 'AI', feedback, is_passed]
        );

        res.json({ isPassed: is_passed, feedback: feedback });
    } catch (err) {
        res.status(500).json({ error: 'AI Evaluation Failed', details: err.message });
    }
});

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
});