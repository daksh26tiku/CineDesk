import { CheckIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { memo, useContext } from 'react'
import { useSocket } from '../context/SocketContext'
import { AuthContext } from '../context/AuthContext'

const Seat = ({ seat, isSelected, setSelectedSeats, selectable, isAvailable, showtimeId, lockedSeats }) => {
	const socket = useSocket()
	const { auth } = useContext(AuthContext)
	const seatId = `${seat.row}${seat.number}`

	const userId = auth?._id || auth?.id || auth?.username

	const isLockedBySomeoneElse =
		lockedSeats &&
		lockedSeats[seatId] &&
		lockedSeats[seatId].userId !== userId &&
		lockedSeats[seatId].expiresAt > Date.now()

	return !isAvailable ? (
		<button
			title={`${seat.row}${seat.number}`}
			className="flex h-8 w-8 cursor-not-allowed items-center justify-center"
		>
			<div className="h-6 w-6 rounded bg-gray-500 drop-shadow-md"></div>
		</button>
	) : isLockedBySomeoneElse ? (
		<button
			title={`${seat.row}${seat.number} - Locked`}
			className="flex h-8 w-8 cursor-not-allowed items-center justify-center"
		>
			<div className="flex h-6 w-6 items-center justify-center rounded bg-yellow-400 drop-shadow-md">
				<LockClosedIcon className="h-4 w-4 stroke-[2] text-white" />
			</div>
		</button>
	) : isSelected ? (
		<button
			title={`${seat.row}${seat.number}`}
			className="flex h-8 w-8 items-center justify-center"
			onClick={() => {
				setSelectedSeats((prev) => prev.filter((e) => e !== seatId))
				if (socket && userId) {
					socket.emit('unlock_seat', { showtimeId, seatId, userId })
				}
			}}
		>
			<div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500 drop-shadow-md">
				<CheckIcon className="h-5 w-5 stroke-[3] text-white" />
			</div>
		</button>
	) : (
		<button
			title={`${seat.row}${seat.number}`}
			className={`flex h-8 w-8 items-center justify-center ${!selectable && 'cursor-not-allowed'}`}
			onClick={() => {
				if (selectable) {
					setSelectedSeats((prev) => [...prev, seatId])
					if (socket && userId) {
						socket.emit('lock_seat', { showtimeId, seatId, userId })
					}
				}
			}}
		>
			<div className="h-6 w-6 rounded bg-white drop-shadow-md"></div>
		</button>
	)
}

export default memo(Seat)
