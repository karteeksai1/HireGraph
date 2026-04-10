const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, avatar_url',
            [email, passwordHash, name]
        );

        res.json({ user: newUser.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Server error during signup' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const user = userResult.rows[0];
        
        if (!user.password_hash) {
            return res.status(400).json({ error: 'Please login with Google for this account' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        res.json({ user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url } });
    } catch (error) {
        res.status(500).json({ error: 'Server error during login' });
    }
});

app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        
        const { sub: googleId, email, name, picture } = ticket.getPayload();

        let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userResult.rows.length === 0) {
            userResult = await pool.query(
                'INSERT INTO users (google_id, email, name, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *',
                [googleId, email, name, picture]
            );
        } else if (!userResult.rows[0].google_id) {
            userResult = await pool.query(
                'UPDATE users SET google_id = $1, avatar_url = $2 WHERE email = $3 RETURNING *',
                [googleId, picture, email]
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
    const { candidateName, topic, domain } = req.body;
    try {
        const aiResponse = await axios.post('http://127.0.0.1:8000/question', {
            topic: topic,
            domain: domain
        });
        const questionText = aiResponse.data.question;

        const newSession = await pool.query(
            'INSERT INTO interview_sessions (user_id, topic, start_time) VALUES ((SELECT id FROM users WHERE name = $1 LIMIT 1), $2, NOW()) RETURNING id',
            [candidateName, topic]
        );
        
        res.json({ 
            sessionId: newSession.rows[0].id,
            question: questionText 
        });
    } catch (err) {
        console.error("DATABASE ERROR:", err.message);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

app.post('/api/interview/submit', async (req, res) => {
    const { sessionId, topic, domain, language, userCode } = req.body;
    try {
        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, submitted_code) VALUES ($1, $2, $3)',
            [sessionId, 'USER', userCode]
        );

        const aiResponse = await axios.post('http://127.0.0.1:8000/grade', {
            topic: topic,
            domain: domain,
            language: language,
            user_code: userCode
        });

        const { is_passed, score, metrics, feedback } = aiResponse.data;

        await pool.query(
            'INSERT INTO interview_messages (session_id, sender_type, message_content, is_passed, score) VALUES ($1, $2, $3, $4, $5)',
            [sessionId, 'AI', feedback, is_passed, score]
        );

        res.json({ isPassed: is_passed, score: score, metrics: metrics, feedback: feedback });
    } catch (err) {
        console.error("AI ROUTE ERROR:", err.message);
        res.status(500).json({ error: 'AI Evaluation Failed' });
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
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

app.post('/api/interview/finish', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        const scoreQuery = await pool.query(
            'SELECT MAX(score) as max_score FROM interview_messages WHERE session_id = $1',
            [sessionId]
        );
        
        const finalScore = scoreQuery.rows[0].max_score || 0;

        await pool.query(
            "UPDATE interview_sessions SET status = 'completed', final_score = $1 WHERE id = $2",
            [finalScore, sessionId]
        );
        
        res.json({ success: true, finalScore });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to finish session' });
    }
});
const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
});