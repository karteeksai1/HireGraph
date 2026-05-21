const fs = require('fs');
const path = require('path');

const QUESTIONS_PATH = path.join(__dirname, 'questions.json');
const EMPTY_BOILERPLATES = { python: '', javascript: '', java: '', cpp: '', sql: '' };
const SAMPLE_CASES_BY_TITLE = {
    'two sum': [
        { input: 'nums = [2, 7, 11, 15], target = 9', expected_output: '[0, 1]' },
        { input: 'nums = [3, 2, 4], target = 6', expected_output: '[1, 2]' }
    ],
    'reverse linked list': [
        { input: 'head = [1, 2, 3, 4, 5]', expected_output: '[5, 4, 3, 2, 1]' },
        { input: 'head = [1, 2]', expected_output: '[2, 1]' }
    ],
    'valid palindrome': [
        { input: 's = "A man, a plan, a canal: Panama"', expected_output: 'true' },
        { input: 's = "race a car"', expected_output: 'false' }
    ],
    'binary search': [
        { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9', expected_output: '4' },
        { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 2', expected_output: '-1' }
    ],
    'contains duplicate': [
        { input: 'nums = [1, 2, 3, 1]', expected_output: 'true' },
        { input: 'nums = [1, 2, 3, 4]', expected_output: 'false' }
    ],
    'valid anagram': [
        { input: 's = "anagram", t = "nagaram"', expected_output: 'true' },
        { input: 's = "rat", t = "car"', expected_output: 'false' }
    ],
    'best time to buy and sell stock': [
        { input: 'prices = [7, 1, 5, 3, 6, 4]', expected_output: '5' },
        { input: 'prices = [7, 6, 4, 3, 1]', expected_output: '0' }
    ],
    'move zeroes': [
        { input: 'nums = [0, 1, 0, 3, 12]', expected_output: '[1, 3, 12, 0, 0]' },
        { input: 'nums = [0]', expected_output: '[0]' }
    ],
    'climbing stairs': [
        { input: 'n = 2', expected_output: '2' },
        { input: 'n = 3', expected_output: '3' }
    ],
    'linked list cycle': [
        { input: 'head = [3, 2, 0, -4], pos = 1', expected_output: 'true' },
        { input: 'head = [1], pos = -1', expected_output: 'false' }
    ],
    'maximum depth of binary tree': [
        { input: 'root = [3, 9, 20, null, null, 15, 7]', expected_output: '3' },
        { input: 'root = [1, null, 2]', expected_output: '2' }
    ],
    'group anagrams': [
        { input: 'strs = ["eat", "tea", "tan", "ate", "nat", "bat"]', expected_output: '[["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]' },
        { input: 'strs = [""]', expected_output: '[[""]]' }
    ],
    'top k frequent elements': [
        { input: 'nums = [1, 1, 1, 2, 2, 3], k = 2', expected_output: '[1, 2]' },
        { input: 'nums = [1], k = 1', expected_output: '[1]' }
    ],
    'product of array except self': [
        { input: 'nums = [1, 2, 3, 4]', expected_output: '[24, 12, 8, 6]' },
        { input: 'nums = [-1, 1, 0, -3, 3]', expected_output: '[0, 0, 9, 0, 0]' }
    ],
    'longest consecutive sequence': [
        { input: 'nums = [100, 4, 200, 1, 3, 2]', expected_output: '4' },
        { input: 'nums = [0, 3, 7, 2, 5, 8, 4, 6, 0, 1]', expected_output: '9' }
    ],
    '3sum': [
        { input: 'nums = [-1, 0, 1, 2, -1, -4]', expected_output: '[[-1, -1, 2], [-1, 0, 1]]' },
        { input: 'nums = [0, 1, 1]', expected_output: '[]' }
    ],
    'longest substring without repeating characters': [
        { input: 's = "abcabcbb"', expected_output: '3' },
        { input: 's = "bbbbb"', expected_output: '1' }
    ],
    'search in rotated sorted array': [
        { input: 'nums = [4, 5, 6, 7, 0, 1, 2], target = 0', expected_output: '4' },
        { input: 'nums = [4, 5, 6, 7, 0, 1, 2], target = 3', expected_output: '-1' }
    ],
    'coin change': [
        { input: 'coins = [1, 2, 5], amount = 11', expected_output: '3' },
        { input: 'coins = [2], amount = 3', expected_output: '-1' }
    ],
    'number of islands': [
        { input: 'grid = [["1","1","0"],["1","0","0"],["0","0","1"]]', expected_output: '2' },
        { input: 'grid = [["1","1"],["1","1"]]', expected_output: '1' }
    ],
    'merge intervals': [
        { input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]', expected_output: '[[1,6],[8,10],[15,18]]' },
        { input: 'intervals = [[1,4],[4,5]]', expected_output: '[[1,5]]' }
    ],
    'trapping rain water': [
        { input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', expected_output: '6' },
        { input: 'height = [4,2,0,3,2,5]', expected_output: '9' }
    ],
    'sliding window maximum': [
        { input: 'nums = [1,3,-1,-3,5,3,6,7], k = 3', expected_output: '[3,3,5,5,6,7]' },
        { input: 'nums = [1], k = 1', expected_output: '[1]' }
    ],
    'second highest salary': [
        { input: 'Employee(id, salary) = [(1,100), (2,200), (3,300)]', expected_output: '200' },
        { input: 'Employee(id, salary) = [(1,100)]', expected_output: 'null' }
    ],
    'identify duplicate emails': [
        { input: 'Person = [(1,"a@b.com"), (2,"c@d.com"), (3,"a@b.com")]', expected_output: '["a@b.com"]' },
        { input: 'Person = [(1,"a@b.com"), (2,"c@d.com")]', expected_output: '[]' }
    ]
};

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
    if (Array.isArray(question.test_cases) && question.test_cases.length > 0) return question.test_cases;

    const titleKey = String(question.title || '').toLowerCase();
    if (SAMPLE_CASES_BY_TITLE[titleKey]) return SAMPLE_CASES_BY_TITLE[titleKey];

    if (question.domain === 'dsa') {
        return [
            {
                input: `Sample input for ${question.title}`,
                expected_output: `Expected output that satisfies: ${question.text}`
            },
            {
                input: `Edge case input for ${question.title}`,
                expected_output: 'Correct edge-case output'
            }
        ];
    }

    if (question.domain === 'sql') {
        return [
            {
                input: 'Use the table shape described in the prompt with a normal multi-row dataset.',
                expected_output: 'Rows matching the requested query condition.'
            },
            {
                input: 'Use an edge-case dataset with missing, duplicate, or tied values.',
                expected_output: 'Rows should still satisfy the prompt constraints.'
            }
        ];
    }

    return [
        {
            input: 'Primary scenario from the prompt.',
            expected_output: 'Implementation or explanation covers the required behavior.'
        },
        {
            input: 'Edge scenario with empty, loading, error, or high-scale state.',
            expected_output: 'Answer handles the edge case clearly.'
        }
    ];
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
