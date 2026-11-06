import mongoose from 'mongoose';
import AiSession from '../models/AiSession.js';
import { getNextQuestionForSession, getQuestionsForField } from '../data/interviewQuestions.js';

const getUserId = (req) => {
    return req.user?.userId || req.user?.id || req.user?._id;
};

// Create a new session
export const createSession = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: User ID not found' });
        }

        const { config } = req.body;

        if (!config || !config.role) {
            return res.status(400).json({ success: false, message: 'Invalid configuration: role is required' });
        }

        const safeConfig = {
            goal: config.goal || 'Practice general interview skills',
            role: config.role,
            experience: config.experience || 'Mid-level',
            skills: Array.isArray(config.skills) ? config.skills : [],
            difficulty: config.difficulty || 'medium',
            tone: config.tone || 'professional',
            depth: config.depth || 'scenario'
        };

        const newSession = new AiSession({
            userId,
            config: safeConfig,
            status: 'live'
        });

        await newSession.save();

        res.status(201).json({
            success: true,
            data: newSession
        });
    } catch (error) {
        console.error('Create Session Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// Update session (add transcript or update status)
export const updateSession = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: User ID not found' });
        }

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid session ID' });
        }

        const { transcript, status, duration } = req.body;

        const session = await AiSession.findOne({ _id: id, userId });

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        if (transcript) {
            if (Array.isArray(transcript)) {
                session.transcript.push(...transcript);
            } else {
                session.transcript.push(transcript);
            }
        }

        if (status) session.status = status;
        if (duration) session.duration = duration;

        await session.save();

        res.json({ success: true, data: session });
    } catch (error) {
        console.error('Update Session Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// End session
export const endSession = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: User ID not found' });
        }

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid session ID' });
        }

        const { duration, feedback } = req.body;

        const session = await AiSession.findOne({ _id: id, userId });

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        session.status = 'completed';
        if (duration) session.duration = duration;
        if (feedback) session.feedback = feedback;
        if (req.body.evaluationReport) session.evaluationReport = req.body.evaluationReport;

        await session.save();

        res.json({ success: true, data: session });
    } catch (error) {
        console.error('End Session Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// Get User Sessions
export const getUserSessions = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: User ID not found' });
        }

        const sessions = await AiSession.find({ userId })
            .sort({ createdAt: -1 });

        res.json({ success: true, data: sessions });
    } catch (error) {
        console.error('Get User Sessions Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// Get Single Session
export const getSession = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: User ID not found' });
        }

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid session ID' });
        }

        const session = await AiSession.findOne({ _id: id, userId });
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }
        res.json({ success: true, data: session });
    } catch (error) {
        console.error('Get Session Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// Short acknowledgments the AI can say before the next question (professional, based on field)
const ACKNOWLEDGMENTS = [
    'Thanks for that.',
    'Good point.',
    'That makes sense.',
    'Understood.',
    'Noted.',
];

// Get next interview question; returns "reply" = full text for AI to speak (acknowledgment + next question)
export const getNextQuestion = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: User ID not found' });
        }

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid session ID' });
        }

        const session = await AiSession.findOne({ _id: id, userId });
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }
        const transcript = session.transcript || [];
        const next = getNextQuestionForSession(transcript, session.config);
        if (!next) {
            return res.json({ success: true, data: { question: null, reply: null, done: true } });
        }
        const userReplied = transcript.some(m => m.sender === 'user');
        const ack = ACKNOWLEDGMENTS[Math.floor(Math.random() * ACKNOWLEDGMENTS.length)];
        const reply = userReplied ? `${ack} Next question: ${next.text}` : next.text;
        res.json({
            success: true,
            data: {
                question: next.text,
                reply,
                difficulty: next.difficulty,
                topic: next.topic,
                done: false,
            },
        });
    } catch (error) {
        console.error('Get Next Question Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// Generate structured evaluation report from transcript (professional, constructive)
function buildEvaluationReport(transcript, config) {
    const role = config?.role || 'Software Engineer';
    const aiTurns = (transcript || []).filter(m => m.sender === 'ai').length;
    const userTurns = (transcript || []).filter(m => m.sender === 'user').length;
    const userMessages = (transcript || []).filter(m => m.sender === 'user');
    const totalUserChars = userMessages.reduce((sum, m) => sum + (m.text || '').length, 0);
    const avgLength = userTurns ? Math.round(totalUserChars / userTurns) : 0;

    // Heuristic scores 1-10 (encourage with slight variance)
    const base = Math.min(8, Math.max(4, Math.floor(aiTurns / 2) + Math.min(2, Math.floor(avgLength / 80))));
    const technical = Math.min(10, base + (avgLength > 150 ? 1 : 0));
    const communication = Math.min(10, base + (userTurns >= 5 ? 1 : 0));
    const confidence = Math.min(10, base);
    const problemSolving = Math.min(10, base + (aiTurns >= 6 ? 1 : 0));
    const overall = Math.round((technical + communication + confidence + problemSolving) / 4);

    const strengths = [
        'Engaged with the questions and provided structured responses.',
        'Demonstrated willingness to explain and elaborate on technical concepts.',
    ];
    if (userTurns >= 6) strengths.push('Completed a good number of questions within the time limit.');
    if (avgLength >= 100) strengths.push('Gave sufficiently detailed answers that show depth of thought.');

    const weaknesses = [];
    if (avgLength < 80) weaknesses.push('Consider expanding your answers with concrete examples or steps.');
    if (userTurns < 5) weaknesses.push('Try to attempt more questions; practice will improve your pacing.');

    const suggestions = [
        'Practice answering out loud with a timer to improve clarity and concision.',
        'Prepare 2–3 real project examples that you can tie to behavioral and technical questions.',
        'Review core concepts for your role and rehearse explaining them in simple terms.',
    ];

    const topics = (getQuestionsForField(role) || []).slice(0, 5).map(q => q.topic);
    const uniqueTopics = [...new Set(topics)];

    return {
        role,
        overallScore: Math.min(10, overall),
        technicalKnowledge: technical,
        communicationClarity: communication,
        confidence: confidence,
        problemSolving: problemSolving,
        strengths,
        weaknesses: weaknesses.length ? weaknesses : ['Focus on linking your answers back to the question asked.'],
        improvementSuggestions: suggestions,
        recommendedTopicsToStudy: uniqueTopics.length ? uniqueTopics : ['Core concepts', 'System design', 'Best practices'],
    };
}

export const generateReport = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: User ID not found' });
        }

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid session ID' });
        }

        const session = await AiSession.findOne({ _id: id, userId });
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }
        const report = buildEvaluationReport(session.transcript || [], session.config);
        session.evaluationReport = report;
        await session.save();
        res.json({ success: true, data: report });
    } catch (error) {
        console.error('Generate Report Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};
