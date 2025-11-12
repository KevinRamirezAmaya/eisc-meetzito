import type { FC, FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../lib/socket';
import useAuthStore from '../../stores/useAuthStore';

type ChatMessage = {
    id: string;
    text: string;
    timestamp: number;
    user: {
        displayName: string | null;
        email: string | null;
        photoURL?: string | null;
    };
    socketId: string;
};

const Profile: FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [currentSocketId, setCurrentSocketId] = useState<string | null>(socket.id ?? null);
    const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

    const initials = useMemo(() => {
        if (!user?.displayName) {
            return 'AN';
        }

        return user.displayName
            .split(' ')
            .map((part) => part.charAt(0))
            .join('')
            .toUpperCase();
    }, [user?.displayName]);

    useEffect(() => {
        if (!user) {
            if (socket.connected) {
                socket.disconnect();
            }

            navigate('/login', { replace: true });
            return;
        }

        if (!socket.connected) {
            socket.connect();
        }

        const handleLoad = (loaded: ChatMessage[]) => {
            setMessages(loaded);
        };

        const handleMessage = (message: ChatMessage) => {
            setMessages((prev) => [...prev, message]);
        };

        const handleConnect = () => {
            setIsConnected(true);
            setCurrentSocketId(socket.id ?? null);
        };
        const handleDisconnect = () => {
            setIsConnected(false);
            setCurrentSocketId(null);
        };

        socket.on('chat:load', handleLoad);
        socket.on('chat:message', handleMessage);
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        return () => {
            socket.off('chat:load', handleLoad);
            socket.off('chat:message', handleMessage);
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.disconnect();
        };
    }, [navigate, user]);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const text = newMessage.trim();
        if (!text || !user) {
            return;
        }

        socket.emit('chat:message', {
            text,
            user,
        });

        setNewMessage('');
    };

    return (
        <div className="container-page">
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 flex items-center justify-center rounded-full bg-violet-600 text-white text-xl font-semibold">
                        {initials}
                    </div>
                    <div>
                        <h1 className="mb-0 text-left">Bienvenido</h1>
                        <h2 className="mb-0 text-left text-lg">{user?.displayName}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-300">
                            {isConnected ? 'Conectado al chat' : 'Desconectado'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="h-80 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                        {messages.length === 0 && (
                            <p className="text-center text-sm text-gray-500">Todavía no hay mensajes. ¡Sé el primero en saludar!</p>
                        )}

                        {messages.map((message) => {
                            const ownSocketId = currentSocketId ?? socket.id ?? '';
                            const isOwnMessage = message.socketId === ownSocketId;

                            return (
                                <div
                                    key={message.id}
                                    className={`mb-2 flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`flex max-w-[75%] flex-col gap-1 ${
                                            isOwnMessage ? 'items-end text-right' : 'items-start text-left'
                                        }`}
                                    >
                                        <span className="text-xs text-gray-500">
                                            {message.user.displayName ?? 'Anónimo'} ·{' '}
                                            {new Date(message.timestamp).toLocaleTimeString()}
                                        </span>
                                        <span
                                            className={`inline-block rounded-2xl px-4 py-2 text-sm ${
                                                isOwnMessage
                                                    ? 'bg-violet-600 text-white'
                                                    : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                                            }`}
                                        >
                                            {message.text}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={endOfMessagesRef} />
                    </div>

                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(event) => setNewMessage(event.target.value)}
                            placeholder={isConnected ? 'Escribe tu mensaje…' : 'Reconectando…'}
                            disabled={!isConnected}
                            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                        <button
                            type="submit"
                            disabled={!isConnected || !newMessage.trim()}
                            className="!w-auto px-6 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Enviar
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;