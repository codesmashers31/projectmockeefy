import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;

export const initSocket = (httpServer, corsOptions) => {
    io = new Server(httpServer, {
        cors: corsOptions,
        pingTimeout: 60000,
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
            return next(new Error("Authentication error"));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded; // Attach user info
            next();
        } catch (err) {
            return next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`[Socket] User connected: ${socket.user.userId || socket.user.id}`);
        
        // Join a private room unique to the user
        const userId = socket.user.userId || socket.user.id;
        socket.join(userId);

        socket.on("disconnect", () => {
            console.log(`[Socket] User disconnected: ${userId}`);
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
 * Emit an event to a specific user's room
 */
export const emitToUser = (userId, eventName, data) => {
    if (io && userId) {
        io.to(userId.toString()).emit(eventName, data);
    }
};
