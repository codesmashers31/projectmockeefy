import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import ExpertDetails from "../models/expertModel.js";
import Session from "../models/Session.js";

let io;

/**
 * Extract JWT from various handshake formats
 */
function extractToken(socket) {
    if (socket.handshake.auth?.token) return socket.handshake.auth.token;
    if (socket.handshake.query?.token) return socket.handshake.query.token;
    const authHeader = socket.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }
    const cookieHeader = socket.handshake.headers?.cookie;
    if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|;\s*)(?:token|jwt)=([^;]+)/);
        if (match) return decodeURIComponent(match[1]);
    }
    return null;
}

export const initSocket = (httpServer, corsOptions) => {
    io = new Server(httpServer, {
        cors: corsOptions,
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ["websocket", "polling"],
    });

    // Authentication middleware
    io.use(async (socket, next) => {
        const token = extractToken(socket);
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }
        try {
            const secret = process.env.JWT_SECRET || "fallback_jwt_secret";
            const decoded = jwt.verify(token, secret);
            socket.user = decoded; // Attach user info
            next();
        } catch (err) {
            console.warn(`[Socket Auth Error] ${err.message}`);
            return next(new Error("Authentication error: Invalid or expired token"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = (socket.user.userId || socket.user.id || socket.user._id)?.toString();
        if (!userId) {
            socket.disconnect(true);
            return;
        }

        const role = (socket.user.userType || socket.user.role || "user").toLowerCase();
        console.log(`[Socket] User connected: ${userId} (${role}) - Socket ID: ${socket.id}`);

        // 1. Join private user rooms (both raw ID and prefixed for compatibility)
        socket.join(userId);
        socket.join(`user:${userId}`);

        // 2. Join admin room if user is admin
        if (role === "admin") {
            socket.join("admin");
            console.log(`[Socket] Admin joined admin room: ${userId}`);
        }

        // 3. Join expert room if user has an expert profile
        try {
            const expert = await ExpertDetails.findOne({ userId }).select("_id").lean();
            if (expert) {
                const expertId = expert._id.toString();
                socket.expertId = expertId;
                socket.join(expertId);
                socket.join(`expert:${expertId}`);
                console.log(`[Socket] Expert joined expert room: ${expertId} (User: ${userId})`);
            }
        } catch (e) {
            console.warn(`[Socket] Expert room lookup warning for ${userId}:`, e.message);
        }

        // 4. Handle client-initiated session room joining with server-side authorization check
        socket.on("join-session", async (sessionId) => {
            if (!sessionId) return;
            try {
                // Verify user is authorized to join this session
                const s = await Session.findOne({
                    $or: [{ _id: sessionId }, { sessionId }]
                }).select("candidateId expertId").lean();

                if (s) {
                    const isCandidate = s.candidateId?.toString() === userId;
                    const isExpert = s.expertId?.toString() === userId || (socket.expertId && s.expertId?.toString() === socket.expertId);
                    const isAdmin = role === "admin";

                    if (isCandidate || isExpert || isAdmin) {
                        const sIdStr = (s._id || sessionId).toString();
                        socket.join(sIdStr);
                        socket.join(`session:${sIdStr}`);
                        console.log(`[Socket] ${userId} joined session room: ${sIdStr}`);
                    } else {
                        socket.emit("error", { message: "Unauthorized to join session room" });
                    }
                }
            } catch (err) {
                console.warn(`[Socket] join-session error:`, err.message);
            }
        });

        socket.on("leave-session", (sessionId) => {
            if (!sessionId) return;
            const sIdStr = sessionId.toString();
            socket.leave(sIdStr);
            socket.leave(`session:${sIdStr}`);
        });

        socket.on("disconnect", (reason) => {
            console.log(`[Socket] User disconnected: ${userId} (Reason: ${reason})`);
        });
    });

    return io;
};

export const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

/**
 * Emit an event to a specific user's room across all their open sessions/tabs.
 */
export const emitToUser = (userId, eventName, data) => {
    if (io && userId) {
        const idStr = userId.toString();
        io.to(idStr).to(`user:${idStr}`).emit(eventName, data);
    }
};

/**
 * Emit an event to an expert (by expertId or expert user).
 */
export const emitToExpert = (expertId, eventName, data) => {
    if (io && expertId) {
        const idStr = expertId.toString();
        io.to(idStr).to(`expert:${idStr}`).emit(eventName, data);
    }
};

/**
 * Emit an event to all connected admin sessions.
 */
export const emitToAdmin = (eventName, data) => {
    if (io) {
        io.to("admin").emit(eventName, data);
    }
};

/**
 * Emit an event to a session room.
 */
export const emitToSession = (sessionId, eventName, data) => {
    if (io && sessionId) {
        const sStr = sessionId.toString();
        io.to(sStr).to(`session:${sStr}`).emit(eventName, data);
    }
};

/**
 * Standardized data synchronization function.
 * Broadcasts structured DATA_SYNC event to authorized connected rooms.
 * 
 * @param {object} params
 * @param {string} params.type - Sync type, e.g. 'PROFILE_UPDATED', 'PERSONAL_INFO_UPDATED', 'VERIFICATION_UPDATED', 'STATUS_UPDATED', 'SESSION_CREATED', 'SESSION_UPDATED', 'NOTIFICATION_SYNC'
 * @param {string|object} [params.userId] - User ID to notify
 * @param {string|object} [params.expertId] - Expert ID to notify
 * @param {string|object} [params.sessionId] - Session ID to notify
 * @param {any} params.data - The updated data payload
 * @param {boolean} [params.toAdmin=false] - Whether to also broadcast to admin room
 */
export const syncDataChange = ({
    type,
    userId,
    expertId,
    sessionId,
    data,
    toAdmin = false,
}) => {
    if (!io) return;

    const payload = {
        type,
        data,
        userId: userId ? userId.toString() : undefined,
        expertId: expertId ? expertId.toString() : undefined,
        sessionId: sessionId ? sessionId.toString() : undefined,
        timestamp: Date.now(),
    };

    // 1. Emit to user room (all connected tabs of this user)
    if (userId) {
        const uStr = userId.toString();
        io.to(uStr).to(`user:${uStr}`).emit("DATA_SYNC", payload);
        io.to(uStr).to(`user:${uStr}`).emit(type.toLowerCase(), data);
    }

    // 2. Emit to expert room
    if (expertId) {
        const eStr = expertId.toString();
        io.to(eStr).to(`expert:${eStr}`).emit("DATA_SYNC", payload);
        io.to(eStr).to(`expert:${eStr}`).emit(type.toLowerCase(), data);
    }

    // 3. Emit to session room if applicable
    if (sessionId) {
        const sStr = sessionId.toString();
        io.to(sStr).to(`session:${sStr}`).emit("DATA_SYNC", payload);
        io.to(sStr).to(`session:${sStr}`).emit(type.toLowerCase(), data);
    }

    // 4. Emit to admin if requested
    if (toAdmin) {
        io.to("admin").emit("DATA_SYNC", payload);
        io.to("admin").emit(type.toLowerCase(), data);
    }
};
