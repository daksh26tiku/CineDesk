import { TicketIcon } from '@heroicons/react/24/solid'
import axios from '../config/axiosConfig'
import { Fragment, useContext, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Select from 'react-tailwindcss-select'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'
import Navbar from '../components/Navbar'
import Seat from '../components/Seat'
import ShowtimeDetails from '../components/ShowtimeDetails'
import { AuthContext } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { ClockIcon } from '@heroicons/react/24/outline'

const Showtime = () => {
	const { auth } = useContext(AuthContext)
	const socket = useSocket()
	const { id } = useParams()
	const [showtime, setShowtime] = useState({})
	const [selectedSeats, setSelectedSeats] = useState([])
	const [lockedSeats, setLockedSeats] = useState({})
	const [filterRow, setFilterRow] = useState(null)
	const [filterColumn, setFilterColumn] = useState(null)

	// 15-second pre-purchase anti-hoarding timer
	const [selectionTimeLeft, setSelectionTimeLeft] = useState(15)

	const sortedSelectedSeat = selectedSeats.sort((a, b) => {
		const [rowA, numberA] = a.match(/([A-Za-z]+)(\d+)/).slice(1)
		const [rowB, numberB] = b.match(/([A-Za-z]+)(\d+)/).slice(1)
		if (rowA === rowB) {
			if (parseInt(numberA) > parseInt(numberB)) {
				return 1
			} else {
				return -1
			}
		} else if (rowA.length > rowB.length) {
			return 1
		} else if (rowA.length < rowB.length) {
			return -1
		} else if (rowA > rowB) {
			return 1
		}
		return -1
	})

	const fetchShowtime = async (data) => {
		try {
			let response
			if (auth.role === 'admin') {
				response = await axios.get(`/showtime/user/${id}`, {
					headers: {
						Authorization: `Bearer ${auth.token}`
					}
				})
			} else {
				response = await axios.get(`/showtime/${id}`)
			}
			// console.log(response.data.data)
			setShowtime(response.data.data)
		} catch (error) {
			console.error(error)
			toast.error(error.response.data.message || 'Error', {
				position: 'top-center',
				autoClose: 2000,
				pauseOnHover: false
			})
		}
	}

	useEffect(() => {
		fetchShowtime()
	}, [])

	const isPast = showtime.showtime ? new Date(showtime.showtime) < new Date() : false

	useEffect(() => {
		if (socket && showtime._id && !isPast) {
			const userId = auth?._id || auth?.id || auth?.username;
			// Actively unlock any lingering seats for this user to prevent hoarding/inventory denial upon page refresh
			if (userId) {
				socket.emit('unlock_all_user_seats', { showtimeId: showtime._id, userId })
			}

			socket.emit('join_showtime', { showtimeId: showtime._id, userId })

			socket.on('locked_seats_update', (locks) => {
				setLockedSeats(locks)
			})

			socket.on('lock_failed', ({ seatId, message }) => {
				toast.error(message, {
					position: 'top-center',
					autoClose: 2000,
					pauseOnHover: false
				})
				// Force deselection visually since lock failed
				setSelectedSeats((prev) => prev.filter((e) => e !== seatId))
			})

			return () => {
				socket.emit('leave_showtime', showtime._id)
				socket.off('locked_seats_update')
				socket.off('lock_failed')
			}
		}
	}, [socket, showtime._id, isPast])

	// Anti-hoarding Selection Timer Logic
	useEffect(() => {
		// Only run timer if they have seats actually selected
		if (selectedSeats.length === 0) {
			setSelectionTimeLeft(15)
			return
		}

		if (selectionTimeLeft <= 0) {
			// Time is up, boot their seats
			toast.error('Selection timed out. Seats released.', {
				position: 'top-center',
				autoClose: 3000,
				pauseOnHover: false
			})

			const userId = auth?._id || auth?.id || auth?.username;
			if (socket && showtime._id && userId) {
				socket.emit('unlock_all_user_seats', { showtimeId: showtime._id, userId })
			}

			setSelectedSeats([]) // Wipe local selection
			setSelectionTimeLeft(15) // Reset timer
			return
		}

		const timer = setInterval(() => {
			setSelectionTimeLeft((prev) => prev - 1)
		}, 1000)

		return () => clearInterval(timer)
	}, [selectedSeats.length, selectionTimeLeft, socket, showtime._id, auth])

	// Reset timer to 15 seconds every time they click a new seat to keep looking
	useEffect(() => {
		if (selectedSeats.length > 0) {
			setSelectionTimeLeft(15)
		}
	}, [selectedSeats.length])

	// Lock cleanup moved to Purchase component or timeout to allow for seamless routing

	const row = showtime?.theater?.seatPlan?.row
	let rowLetters = []
	if (row) {
		for (let k = 64; k <= (row.length === 2 ? row.charCodeAt(0) : 64); k++) {
			for (
				let i = 65;
				i <= (k === row.charCodeAt(0) || row.length === 1 ? row.charCodeAt(row.length - 1) : 90);
				i++
			) {
				const letter = k === 64 ? String.fromCharCode(i) : String.fromCharCode(k) + String.fromCharCode(i)
				rowLetters.push(letter)
			}
		}
	}

	const column = showtime?.theater?.seatPlan.column
	let colNumber = []
	for (let k = 1; k <= column; k++) {
		colNumber.push(k)
	}

	const filteredSeats = showtime?.seats?.filter((seat) => {
		return (
			(!filterRow || filterRow.map((row) => row.value).includes(seat.row)) &&
			(!filterColumn || filterColumn.map((column) => column.value).includes(String(seat.number)))
		)
	})

	return (
		<div className="flex min-h-screen flex-col gap-4 bg-gradient-to-br from-indigo-900 to-blue-500 pb-8 sm:gap-8">
			<Navbar />
			<div className="mx-4 h-fit rounded-lg bg-gradient-to-br from-indigo-200 to-blue-100 p-4 drop-shadow-xl sm:mx-8 sm:p-6">
				{showtime.showtime ? (
					<>
						<ShowtimeDetails showtime={showtime} showDeleteBtn={true} fetchShowtime={fetchShowtime} />
						<div className="flex flex-col justify-between rounded-b-lg bg-gradient-to-br from-indigo-100 to-white text-center text-lg drop-shadow-lg md:flex-row">
							<div className="flex flex-col items-center gap-x-4 px-4 py-2 md:flex-row">
								{!isPast && <p className="font-semibold">Selected Seats : </p>}
								<p className="text-start">{sortedSelectedSeat.join(', ')}</p>
								{!!selectedSeats.length && (
									<p className="whitespace-nowrap">({selectedSeats.length} seats)</p>
								)}
							</div>
							{!!selectedSeats.length && (
								<div className="flex items-stretch mt-4 md:mt-0">
									<div className="flex items-center gap-1 bg-red-50 text-red-600 px-3 font-mono font-bold text-sm border border-red-200 border-r-0 md:border-b-0 md:border-t-0 md:rounded-tl-lg">
										<ClockIcon className="h-4 w-4" />
										00:{selectionTimeLeft.toString().padStart(2, '0')}
									</div>
									<Link
										to={auth.role ? `/purchase/${id}` : '/login'}
										state={{
											selectedSeats: sortedSelectedSeat,
											showtime
										}}
										className="flex items-center justify-center gap-2 rounded-br-lg md:rounded-bl-none bg-gradient-to-br from-indigo-600 to-blue-500 px-4 py-2 sm:py-1 font-semibold text-white hover:from-indigo-500 hover:to-blue-500"
									>
										<p>Purchase</p>
										<TicketIcon className="h-6 w-6 text-white" />
									</Link>
								</div>
							)}
						</div>

						<div className="mx-auto mt-4 flex flex-col items-center rounded-lg bg-gradient-to-br from-indigo-100 to-white p-4 text-center drop-shadow-lg">
							<div className="w-full rounded-lg bg-white">
								<div className="bg-gradient-to-r from-indigo-800 to-blue-700 bg-clip-text text-xl font-bold text-transparent">
									Screen
								</div>
							</div>
							<div className="flex w-full flex-col overflow-x-auto overflow-y-hidden">
								<div className="m-auto my-2">
									<div className="flex flex-col">
										<div className="flex items-center">
											<div className="flex h-8 w-8 items-center">
												<p className="w-8"></p>
											</div>
											{colNumber.map((col, index) => {
												return (
													<div key={index} className="flex h-8 w-8 items-center">
														<p className="w-8 font-semibold">{col}</p>
													</div>
												)
											})}
										</div>
										{rowLetters.reverse().map((rowLetter, index) => {
											return (
												<div key={index} className="flex">
													<div className="flex h-8 w-8 items-center">
														<p className="w-8 text-xl font-semibold">{rowLetter}</p>
													</div>
													{colNumber.map((col, index) => {
														return (
															<Seat
																key={index}
																seat={{ row: rowLetter, number: col }}
																isSelected={selectedSeats.includes(`${rowLetter}${col}`)}
																setSelectedSeats={setSelectedSeats}
																selectable={!isPast}
																showtimeId={showtime._id}
																lockedSeats={lockedSeats}
																isAvailable={
																	!showtime.seats.find(
																		(seat) =>
																			seat.row === rowLetter &&
																			seat.number === col
																	)
																}
															/>
														)
													})}
													<div className="flex h-8 w-8 items-center">
														<p className="w-8 text-xl font-semibold">{rowLetter}</p>
													</div>
												</div>
											)
										})}
									</div>
								</div>
							</div>
						</div>
						{auth.role === 'admin' && (
							<>
								<h2 className="mt-4 text-2xl font-bold">Booked Seats</h2>
								<div className="mt-2 flex gap-2 rounded-md bg-gradient-to-br from-indigo-100 to-white p-4">
									<div className="flex grow flex-col">
										<h4 className="text-lg font-bold text-gray-800">Row</h4>
										<Select
											value={filterRow}
											options={Array.from(new Set(showtime?.seats.map((seat) => seat.row)))
												.sort((a, b) => {
													const rowA = a.row
													const rowB = b.row
													if (rowA === rowB) {
														return 0
													} else if (rowA.length > rowB.length) {
														return 1
													} else if (rowA.length < rowB.length) {
														return -1
													} else if (rowA > rowB) {
														return 1
													}
													return -1
												})
												.map((value) => ({
													value,
													label: value
												}))}
											onChange={(value) => {
												setFilterRow(value)
											}}
											isClearable={true}
											isMultiple={true}
											isSearchable={true}
											primaryColor="indigo"
										/>
									</div>
									<div className="flex grow flex-col">
										<h4 className="text-lg font-bold text-gray-800">Number</h4>
										<Select
											value={filterColumn}
											options={Array.from(new Set(showtime?.seats.map((seat) => seat.number)))
												.sort((a, b) => {
													return a - b
												})
												.map((value) => ({
													value: String(value),
													label: String(value)
												}))}
											onChange={(value) => {
												setFilterColumn(value)
											}}
											isClearable={true}
											isMultiple={true}
											isSearchable={true}
											primaryColor="indigo"
										/>
									</div>
								</div>
								<div
									className={`mt-4 grid max-h-screen w-full overflow-auto rounded-md bg-gradient-to-br from-indigo-100 to-white`}
									style={{
										gridTemplateColumns: 'repeat(4, minmax(max-content, 1fr))'
									}}
								>
									<p className="sticky top-0 bg-gradient-to-br from-gray-800 to-gray-700 px-2 py-1 text-center text-xl font-semibold text-white">
										Seat
									</p>
									<p className="sticky top-0 bg-gradient-to-br from-gray-800 to-gray-700 px-2 py-1 text-center text-xl font-semibold text-white">
										Username
									</p>
									<p className="sticky top-0 bg-gradient-to-br from-gray-800 to-gray-700 px-2 py-1 text-center text-xl font-semibold text-white">
										Email
									</p>
									<p className="sticky top-0 bg-gradient-to-br from-gray-800 to-gray-700 px-2 py-1 text-center text-xl font-semibold text-white">
										Role
									</p>
									{filteredSeats
										.sort((a, b) => {
											const rowA = a.row
											const numberA = a.number
											const rowB = b.row
											const numberB = b.number
											if (rowA === rowB) {
												if (parseInt(numberA) > parseInt(numberB)) {
													return 1
												} else {
													return -1
												}
											} else if (rowA.length > rowB.length) {
												return 1
											} else if (rowA.length < rowB.length) {
												return -1
											} else if (rowA > rowB) {
												return 1
											}
											return -1
										})
										.map((seat, index) => {
											return (
												<Fragment key={index}>
													<div className="border-t-2 border-indigo-200 px-2 py-1">
														{`${seat.row}${seat.number}`}
													</div>
													<div className="border-t-2 border-indigo-200 px-2 py-1">
														{seat.user.username}
													</div>
													<div className="border-t-2 border-indigo-200 px-2 py-1">
														{seat.user.email}
													</div>
													<div className="border-t-2 border-indigo-200 px-2 py-1">
														{seat.user.role}
													</div>
												</Fragment>
											)
										})}
								</div>
							</>
						)}
					</>
				) : (
					<Loading />
				)}
			</div>
		</div>
	)
}

export default Showtime
