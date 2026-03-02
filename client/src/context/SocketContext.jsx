import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export const SocketContext = createContext()

export const useSocket = () => {
    return useContext(SocketContext)
}

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null)

    useEffect(() => {
        // Connect to the backend socket server
        // Determine URL based on environment (Vite uses VITE_ prefix)
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'

        const newSocket = io(backendUrl, {
            withCredentials: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        })

        setSocket(newSocket)

        newSocket.on('connect', () => {
            console.log('Connected to socket server:', newSocket.id)
        })

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error)
        })

        return () => {
            newSocket.disconnect()
        }
    }, [])

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    )
}
