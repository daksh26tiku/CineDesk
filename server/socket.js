const { Server } = require('socket.io')

// In-memory store for locked seats
// Structure: { showtimeId: { seatId: { userId, expiresAt } } }
const lockedSeats = {}

// 2 minutes in milliseconds for deliberate locks
const LOCK_EXPIRATION_TIME = 2 * 60 * 1000

// Maps a socketId to a timeout object so we can cancel the cleanup if they reconnect
const disconnectTimers = {}

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: [
                'http://d2wjw0tm17zr9g.cloudfront.net',
                'https://d2wjw0tm17zr9g.cloudfront.net',
                'https://cine-desk.vercel.app',
                'https://cine-desk-seven.vercel.app',
                'https://www.cine-desk.vercel.app',
                'https://cine-desk-client.vercel.app',
                'http://localhost:3000',
                'http://localhost:5173',
                'http://localhost:3001'
            ],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
        }
    })

    io.on('connection', (socket) => {
        // console.log(`User connected: ${socket.id}`)

        socket.on('join_showtime', (payload) => {
            // Support both old string payload and new object payload
            const showtimeId = typeof payload === 'string' ? payload : payload.showtimeId;
            const userId = typeof payload === 'object' ? payload.userId : null;

            socket.join(showtimeId)

            if (userId) {
                // If the user refreshed the page, cancel their disconnect deletion timer
                if (disconnectTimers[userId]) {
                    clearTimeout(disconnectTimers[userId])
                    delete disconnectTimers[userId]
                }

                // Update their existing locks with their brand new socket.id so a FUTURE reload is tracked
                if (lockedSeats[showtimeId]) {
                    for (const seatId in lockedSeats[showtimeId]) {
                        if (lockedSeats[showtimeId][seatId].userId === userId) {
                            lockedSeats[showtimeId][seatId].socketId = socket.id;
                        }
                    }
                }
            }

            // Send current locked seats to the user who just joined
            const roomLockedSeats = lockedSeats[showtimeId] || {}
            socket.emit('locked_seats_update', roomLockedSeats)
        })

        socket.on('leave_showtime', (showtimeId) => {
            socket.leave(showtimeId)
        })

        socket.on('lock_seat', ({ showtimeId, seatId, userId }) => {
            if (!lockedSeats[showtimeId]) {
                lockedSeats[showtimeId] = {}
            }

            // Check if seat is already locked by someone else
            const currentLock = lockedSeats[showtimeId][seatId]
            if (currentLock && currentLock.expiresAt > Date.now() && currentLock.userId !== userId) {
                // Seat is already locked
                socket.emit('lock_failed', { seatId, message: 'Seat is already locked by another user' })
                return
            }

            // Lock the seat
            lockedSeats[showtimeId][seatId] = {
                userId,
                expiresAt: Date.now() + LOCK_EXPIRATION_TIME,
                socketId: socket.id
            }

            // If this user had a pending disconnect timer from a page transition, cancel it
            if (disconnectTimers[userId]) {
                clearTimeout(disconnectTimers[userId])
                delete disconnectTimers[userId]
            }

            // Broadcast update to everyone in the room
            io.to(showtimeId).emit('locked_seats_update', lockedSeats[showtimeId])
        })

        socket.on('unlock_seat', ({ showtimeId, seatId, userId }) => {
            if (lockedSeats[showtimeId] && lockedSeats[showtimeId][seatId]) {
                const currentLock = lockedSeats[showtimeId][seatId]

                // Only unlock if it's the same user or if the lock has expired
                if (currentLock.userId === userId || currentLock.expiresAt <= Date.now()) {
                    delete lockedSeats[showtimeId][seatId]
                    io.to(showtimeId).emit('locked_seats_update', lockedSeats[showtimeId])
                }
            }
        })

        socket.on('unlock_all_user_seats', ({ showtimeId, userId }) => {
            if (lockedSeats[showtimeId]) {
                let updated = false
                for (const seatId in lockedSeats[showtimeId]) {
                    if (lockedSeats[showtimeId][seatId].userId === userId) {
                        delete lockedSeats[showtimeId][seatId]
                        updated = true
                    }
                }
                if (updated) {
                    io.to(showtimeId).emit('locked_seats_update', lockedSeats[showtimeId])
                }
            }
        })

        socket.on('disconnect', () => {
            // Find all locks owned by this socket to extract the userId
            let disconnectedUserId = null

            for (const showtimeId in lockedSeats) {
                for (const seatId in lockedSeats[showtimeId]) {
                    if (lockedSeats[showtimeId][seatId].socketId === socket.id) {
                        disconnectedUserId = lockedSeats[showtimeId][seatId].userId
                        break
                    }
                }
                if (disconnectedUserId) break
            }

            if (!disconnectedUserId) return // No locks to clean up

            // Give the user a 15-second grace period to navigate to /purchase and establish a new socket
            disconnectTimers[disconnectedUserId] = setTimeout(() => {
                let updatedRooms = new Set()
                for (const showtimeId in lockedSeats) {
                    for (const seatId in lockedSeats[showtimeId]) {
                        // Only delete if the lock still belongs to this specific user
                        if (lockedSeats[showtimeId][seatId].userId === disconnectedUserId) {
                            delete lockedSeats[showtimeId][seatId]
                            updatedRooms.add(showtimeId)
                        }
                    }
                }

                // Notify rooms about the unlocked seats
                updatedRooms.forEach((showtimeId) => {
                    io.to(showtimeId).emit('locked_seats_update', lockedSeats[showtimeId])
                })

                delete disconnectTimers[disconnectedUserId]
            }, 15000)
        })
    })

    // Periodic cleanup for expired locks (runs every 30 seconds)
    setInterval(() => {
        const now = Date.now()
        for (const showtimeId in lockedSeats) {
            let updated = false
            for (const seatId in lockedSeats[showtimeId]) {
                if (lockedSeats[showtimeId][seatId].expiresAt <= now) {
                    delete lockedSeats[showtimeId][seatId]
                    updated = true
                }
            }

            // If room is empty, clean it up to avoid memory leak
            if (Object.keys(lockedSeats[showtimeId]).length === 0) {
                delete lockedSeats[showtimeId]
            } else if (updated) {
                // Only emit if there were cleanup changes
                io.to(showtimeId).emit('locked_seats_update', lockedSeats[showtimeId])
            }
        }
    }, 30000)

    return io
}

module.exports = { initializeSocket, lockedSeats }
