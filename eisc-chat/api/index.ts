








import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { randomUUID } from 'node:crypto';
import { Server } from 'socket.io';

type UserInfo = {
	displayName: string | null;
	email: string | null;
	photoURL?: string | null;
};

type IncomingChatPayload = {
	text: string;
	user: UserInfo;
};

type ChatMessage = {
	id: string;
	text: string;
	user: UserInfo;
	timestamp: number;
	socketId: string;
};

const parseOrigins = (rawOrigins: string | undefined): string[] => {
	if (!rawOrigins) {
		return ['http://localhost:5173'];
	}

	return rawOrigins
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);
};

const PORT = Number(process.env.PORT ?? 3000);
const ALLOWED_ORIGINS = parseOrigins(process.env.ORIGIN);
const MAX_MESSAGES = 100;

const app = express();
app.use(cors({
	origin: ALLOWED_ORIGINS,
	credentials: true,
}));

app.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
	cors: {
		origin: ALLOWED_ORIGINS,
		methods: ['GET', 'POST'],
	},
});

const messages: ChatMessage[] = [];

io.on('connection', (socket) => {
	console.log(`Client connected ${socket.id}`);

	socket.emit('chat:load', messages);

	socket.on('chat:message', (payload: IncomingChatPayload) => {
		const text = payload?.text?.trim();
		if (!text) {
			return;
		}

			const message: ChatMessage = {
				id: randomUUID(),
				text,
				user: {
					displayName: payload?.user?.displayName ?? 'Anónimo',
					email: payload?.user?.email ?? null,
					photoURL: payload?.user?.photoURL ?? null,
				},
				timestamp: Date.now(),
				socketId: socket.id,
			};

		messages.push(message);

		if (messages.length > MAX_MESSAGES) {
			messages.shift();
		}

		io.emit('chat:message', message);
	});

	socket.on('disconnect', (reason) => {
		console.log(`Client disconnected ${socket.id}: ${reason}`);
	});
});

httpServer.listen(PORT, () => {
	console.log(`🚀 Chat server running on http://localhost:${PORT}`);
});









