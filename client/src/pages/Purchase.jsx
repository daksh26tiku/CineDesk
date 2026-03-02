import { TicketIcon } from '@heroicons/react/24/solid'
import axios from '../config/axiosConfig'
import { useContext, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import Navbar from '../components/Navbar'
import ShowtimeDetails from '../components/ShowtimeDetails'
import { AuthContext } from '../context/AuthContext'
import { ClockIcon } from '@heroicons/react/24/outline'
import { useSocket } from '../context/SocketContext'

const Purchase = () => {
	const navigate = useNavigate()
	const { auth } = useContext(AuthContext)
	const socket = useSocket()
	const location = useLocation()
	const showtime = location.state.showtime
	const selectedSeats = location.state.selectedSeats || []
	const [isPurchasing, SetIsPurchasing] = useState(false)
	const [hasPurchased, setHasPurchased] = useState(false)
	const [timeLeft, setTimeLeft] = useState(120) // 2 minutes

	// Timer logic
	useEffect(() => {
		if (hasPurchased) return;

		if (timeLeft <= 0) {
			toast.error('Session expired. Seats have been released.', {
				position: 'top-center',
				autoClose: 3000,
				pauseOnHover: false
			})

			// Explicitly release seats since the timer physically expired
			if (socket && showtime?._id && auth) {
				const userId = auth._id || auth.id || auth.username
				if (userId) {
					socket.emit('unlock_all_user_seats', {
						showtimeId: showtime._id,
						userId: userId
					})
				}
			}

			navigate('/cinema')
			return;
		}

		const timer = setInterval(() => {
			setTimeLeft((prev) => prev - 1)
		}, 1000)

		return () => clearInterval(timer)
	}, [timeLeft, hasPurchased, navigate])

	// Format time MM:SS
	const minutes = Math.floor(timeLeft / 60)
	const seconds = timeLeft % 60
	const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

	const onPurchase = async (data) => {
		SetIsPurchasing(true)
		try {
			const response = await axios.post(
				`/showtime/${showtime._id}`,
				{ seats: selectedSeats },
				{
					headers: {
						Authorization: `Bearer ${auth.token}`
					}
				}
			)
			// console.log(response.data)
			setHasPurchased(true)
			navigate('/cinema')
			toast.success('Purchase seats successful!', {
				position: 'top-center',
				autoClose: 2000,
				pauseOnHover: false
			})
		} catch (error) {
			console.error(error)
			toast.error(error.response.data.message || 'Error', {
				position: 'top-center',
				autoClose: 2000,
				pauseOnHover: false
			})
		} finally {
			SetIsPurchasing(false)
		}
	}

	return (
		<div className="flex min-h-screen flex-col gap-4 bg-gradient-to-br from-indigo-900 to-blue-500 pb-8 sm:gap-8">
			<Navbar />
			<div className="mx-4 h-fit rounded-lg bg-gradient-to-br from-indigo-200 to-blue-100 p-4 drop-shadow-xl sm:mx-8 sm:p-6">
				<ShowtimeDetails showtime={showtime} />
				<div className="flex flex-col justify-between rounded-b-lg bg-gradient-to-br from-indigo-100 to-white text-center text-lg drop-shadow-lg md:flex-row">
					<div className="flex flex-col items-center gap-x-4 px-4 py-2 md:flex-row">
						<p className="font-semibold">Selected Seats : </p>
						<p className="text-start">{selectedSeats.join(', ')}</p>
						{!!selectedSeats.length && <p className="whitespace-nowrap">({selectedSeats.length} seats)</p>}
					</div>
					{!!selectedSeats.length && (
						<div className="flex items-stretch mt-4 md:mt-0">
							<div className="flex items-center gap-1.5 bg-red-50 px-4 text-red-600 font-mono font-bold text-sm md:text-base border-t border-l border-red-200 md:border-b-0">
								<ClockIcon className="h-5 w-5" />
								{formattedTime}
							</div>
							<button
								onClick={() => onPurchase()}
								className="flex items-center justify-center gap-2 rounded-br-lg bg-gradient-to-br from-indigo-600 to-blue-500 px-4 py-2 sm:py-1 font-semibold text-white hover:from-indigo-500 hover:to-blue-500 disabled:from-slate-500 disabled:to-slate-400"
								disabled={isPurchasing}
							>
								{isPurchasing ? (
									'Processing...'
								) : (
									<>
										<p>Confirm Purchase</p>
										<TicketIcon className="h-7 w-7 text-white" />
									</>
								)}
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default Purchase
