import axios from '../config/axiosConfig'
import { useContext, useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import Loading from '../components/Loading'
import Navbar from '../components/Navbar'
import ShowtimeDetails from '../components/ShowtimeDetails'
import { AuthContext } from '../context/AuthContext'

const Tickets = () => {
	const { auth } = useContext(AuthContext)
	const [tickets, setTickets] = useState([])
	const [isFetchingticketsDone, setIsFetchingticketsDone] = useState(false)
	const fetchTickets = async () => {
		try {
			setIsFetchingticketsDone(false)
			const response = await axios.get('/auth/tickets', {
				headers: {
					Authorization: `Bearer ${auth.token}`
				}
			})
			setTickets(
				response.data.data.tickets?.sort((a, b) => {
					if (a.showtime.showtime > b.showtime.showtime) {
						return 1
					}
					return -1
				})
			)
		} catch (error) {
			console.error(error)
		} finally {
			setIsFetchingticketsDone(true)
		}
	}

	useEffect(() => {
		fetchTickets()
	}, [])

	return (
		<div className="flex min-h-screen flex-col gap-4 bg-gradient-to-br from-indigo-900 to-blue-500 pb-8 text-gray-900 sm:gap-8">
			<Navbar />
			<div className="mx-4 flex h-fit flex-col gap-4 rounded-md bg-gradient-to-br from-indigo-200 to-blue-100 p-4 drop-shadow-xl sm:mx-8 sm:p-6">
				<h2 className="text-3xl font-bold text-gray-900">My Tickets</h2>
				{isFetchingticketsDone ? (
					<>
						{tickets.length === 0 ? (
							<p className="text-center">You have not purchased any tickets yet</p>
						) : (
							<div className="grid grid-cols-1 gap-4 xl:grid-cols-2 min-[1920px]:grid-cols-3">
								{tickets.map((ticket, index) => {
									const seatString = ticket.seats.map((seat) => seat.row + seat.number).join(', ')
									const qrData = JSON.stringify({
										ticketId: ticket._id,
										userId: auth._id,
										showtimeId: ticket.showtime._id,
										seats: seatString
									})

									return (
										<div className="flex flex-col overflow-hidden rounded-lg bg-white drop-shadow-lg" key={index}>
											<ShowtimeDetails showtime={ticket.showtime} />
											<div className="flex h-full flex-col items-center justify-between border-t-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 md:flex-row">
												<div className="flex flex-col gap-2">
													<div className="flex items-center gap-x-2">
														<p className="whitespace-nowrap font-semibold">Seats:</p>
														<p className="text-left font-bold text-indigo-700">{seatString}</p>
													</div>
													<div className="flex items-center gap-x-2">
														<p className="whitespace-nowrap font-semibold">Total:</p>
														<p className="text-left">{ticket.seats.length} seats</p>
													</div>
												</div>
												<div className="mt-4 shrink-0 rounded-lg bg-white p-2 shadow-inner md:mt-0">
													<QRCodeCanvas
														value={qrData}
														size={100}
														level={"H"}
														includeMargin={false}
													/>
												</div>
											</div>
										</div>
									)
								})}
							</div>
						)}
					</>
				) : (
					<Loading />
				)}
			</div>
		</div>
	)
}

export default Tickets
