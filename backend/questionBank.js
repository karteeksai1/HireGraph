const fs = require('fs');
const path = require('path');

const QUESTIONS_PATH = path.join(__dirname, 'questions.json');
const EMPTY_BOILERPLATES = { python: '', javascript: '', java: '', cpp: '', sql: '' };

let questionCache = null;

function loadQuestions() {
    if (!questionCache) {
        questionCache = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));
    }
    return questionCache;
}

function normalizeDomain(value = 'dsa') {
    const domain = String(value).toLowerCase().trim();
    if (domain.includes('front') || domain.includes('react')) return 'react';
    if (domain.includes('system')) return 'system_design';
    if (domain.includes('sql') || domain.includes('database')) return 'sql';
    return 'dsa';
}

function normalizeDifficulty(value = 'medium') {
    const difficulty = String(value).toLowerCase().trim();
    if (difficulty.includes('easy')) return 'easy';
    if (difficulty.includes('hard')) return 'hard';
    return 'medium';
}

function defaultBoilerplates(domain) {
    if (domain === 'sql') {
        return { ...EMPTY_BOILERPLATES, sql: '-- Write your query here\n' };
    }
    if (domain === 'dsa') {
        return {
            python: 'class Solution:\n    def solve(self):\n        pass\n',
            javascript: 'function solve() {\n  // Write your solution here\n}\n',
            java: 'class Solution {\n    public void solve() {\n        // Write your solution here\n    }\n}\n',
            cpp: 'class Solution {\npublic:\n    void solve() {\n        // Write your solution here\n    }\n};\n',
            sql: ''
        };
    }
    return { ...EMPTY_BOILERPLATES };
}

function defaultTestCases(question) {
    if (Array.isArray(question.test_cases)) return question.test_cases;
    return [];
}

function formatQuestionMessage(phase, question) {
    const label = phase === 1 ? 'Phase 1 initiated.' : `Phase ${phase} initiated.`;
    return `${label}\n\nNew Challenge: ${question.title}\n\n${question.text}`;
}

function publicQuestion(question) {
    return {
        question_title: question.title,
        question_text: question.text,
        optimal_time: question.optimal_time || 'N/A',
        optimal_space: question.optimal_space || 'N/A',
        test_cases: defaultTestCases(question),
        boilerplates: question.boilerplates || defaultBoilerplates(question.domain)
    };
}

function pickQuestion({ domain, difficulty, excludeTitles = [], excludeIds = [] }) {
    const normalizedDomain = normalizeDomain(domain);
    const normalizedDifficulty = normalizeDifficulty(difficulty);
    const excludedTitleSet = new Set(excludeTitles.map(title => String(title).toLowerCase()));
    const excludedIdSet = new Set(excludeIds.map(id => String(id)));
    const questions = loadQuestions();

    const exact = questions.filter(question =>
        question.domain === normalizedDomain &&
        question.difficulty === normalizedDifficulty
    );
    const fallback = questions.filter(question => question.domain === normalizedDomain);
    const pool = exact.length > 0 ? exact : fallback;
    const unseen = pool.filter(question =>
        !excludedTitleSet.has(String(question.title).toLowerCase()) &&
        !excludedIdSet.has(String(question.id))
    );
    const candidates = unseen.length > 0 ? unseen : pool;
    const selected = candidates[Math.floor(Math.random() * candidates.length)];

    return publicQuestion(selected);
}

module.exports = {
    formatQuestionMessage,
    loadQuestions,
    normalizeDifficulty,
    normalizeDomain,
    pickQuestion
};
