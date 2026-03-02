import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { TrashIcon } from '@heroicons/react/24/solid'
import axios from '../config/axiosConfig'
import { useContext, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { AuthContext } from '../context/AuthContext'
import { StarIcon } from '@heroicons/react/24/solid'

const ShowtimeDetails = ({ showDeleteBtn, showtime, fetchShowtime }) => {
	const { auth } = useContext(AuthContext)
	const navigate = useNavigate()
	const location = useLocation()
	const [isDeletingShowtimes, SetIsDeletingShowtimes] = useState(false)
	const [isReleasingShowtime, setIsReleasingShowtime] = useState(false)
	const [isUnreleasingShowtime, setIsUnreleasingShowtime] = useState(false)

	// TMDB State
	const [tmdbData, setTmdbData] = useState(null)
	const [isTmdbLoading, setIsTmdbLoading] = useState(false)
	const [currentBackdropIndex, setCurrentBackdropIndex] = useState(0)

	// Fetch TMDB data when the movie name becomes available
	useEffect(() => {
		const fetchTmdbData = async () => {
			if (!showtime?.movie?.name) return
			setIsTmdbLoading(true)
			try {
				const response = await axios.get(`/tmdb/search/${encodeURIComponent(showtime.movie.name)}`)
				if (response.data.success && response.data.data) {
					setTmdbData(response.data.data)
				}
			} catch (error) {
				console.error('Failed to fetch TMDB data:', error)
			} finally {
				setIsTmdbLoading(false)
			}
		}

		fetchTmdbData()
	}, [showtime?.movie?.name])

	// Auto-scroll Backdrops array if available
	useEffect(() => {
		if (!tmdbData?.backdrops || tmdbData.backdrops.length === 0) return;

		const dropInterval = setInterval(() => {
			setCurrentBackdropIndex((prev) => (prev + 1) % tmdbData.backdrops.length);
		}, 4000); // 4 seconds per image

		return () => clearInterval(dropInterval);
	}, [tmdbData?.backdrops])

	const handleDelete = () => {
		const confirmed = window.confirm(`Do you want to delete this showtime, including its tickets?`)
		if (confirmed) {
			onDeleteShowtime()
		}
	}

	const onDeleteShowtime = async () => {
		try {
			SetIsDeletingShowtimes(true)
			const response = await axios.delete(`/showtime/${showtime._id}`, {
				headers: {
					Authorization: `Bearer ${auth.token}`
				}
			})
			// console.log(response.data)
			navigate('/cinema')
			toast.success('Delete showtime successful!', {
				position: 'top-center',
				autoClose: 2000,
				pauseOnHover: false
			})
		} catch (error) {
			console.error(error)
			toast.error('Error', {
				position: 'top-center',
				autoClose: 2000,
				pauseOnHover: false
			})
		} finally {
			SetIsDeletingShowtimes(false)
		}
	}

	const handleReleaseShowtime = () => {
		const confirmed = window.confirm(`Do you want to release this showtime?`)
		if (confirmed) {
			onReleaseShowtime()
		}
	}

	const onReleaseShowtime = async () => {
		setIsReleasingShowtime(true)
		try {
			const response = await axios.put(
				`/showtime/${showtime._id}`,
				{ isRelease: true },
				{
					headers: {
						Authorization: `Bearer ${auth.token}`
					}
				}
			)
			await fetchShowtime()
			toast.success(`Release showtime successful!`, {
				position: 'top-center',
				autoClose: 2000,
				pauseOnHover: false
			})
		} catch (error) {
			console.error(error)
			toast.error('Error', {
				position: 'top-center',
				autoClose: 2000,
				pauseOnHover: false
			})
		} finally {
			setIsReleasingShowtime(false)
		}
	}

	const handleUnreleasedShowtime = () => {
		const confirmed = window.confirm(`Do you want to unreleased this showtime?`)
		if (confirmed) {
			onUnreleasedShowtime()
		}
	}

	const onUnreleasedShowtime = async () => {
		setIsUnreleasingShowtime(true)
		try {
			const response = await axios.put(
				`/showtime/${showtime._id}`,
				{ isRelease: false },
				{
					headers: {
						Authorization: `Bearer ${auth.token}`
					}
				}
			)
			await fetchShowtime()
			toast.success(`Unreleased showtime successful!`, {
				position: 'top-center',
				autoClose: 2000,
				pauseOnHover: false
			})
		} catch (error) {
			console.error(error)
			toast.error('Error', {
				position: 'top-center',
				autoClose: 2000,
				pauseOnHover: false
			})
		} finally {
			setIsUnreleasingShowtime(false)
		}
	}

	return (
		<>
			{showDeleteBtn && auth.role === 'admin' && (
				<div className="mb-4 flex justify-end gap-2">
					{!showtime.isRelease && (
						<button
							title="Edit cinema name"
							className="flex w-fit items-center gap-1 rounded-md bg-gradient-to-r from-indigo-600 to-blue-500  py-1 pl-2 pr-1.5 text-sm font-medium text-white hover:from-indigo-500 hover:to-blue-400 disabled:from-slate-500 disabled:to-slate-400"
							onClick={() => handleReleaseShowtime(true)}
							disabled={isReleasingShowtime}
						>
							{isReleasingShowtime ? (
								'Processing...'
							) : (
								<>
									RELEASE
									<EyeIcon className="h-5 w-5" />
								</>
							)}
						</button>
					)}
					{showtime.isRelease && (
						<button
							title="Edit cinema name"
							className="flex w-fit items-center gap-1 rounded-md bg-gradient-to-r from-indigo-600 to-blue-500  py-1 pl-2 pr-1.5 text-sm font-medium text-white hover:from-indigo-500 hover:to-blue-400 disabled:from-slate-500 disabled:to-slate-400"
							onClick={() => handleUnreleasedShowtime(true)}
							disabled={isUnreleasingShowtime}
						>
							{isUnreleasingShowtime ? (
								'Processing...'
							) : (
								<>
									UNRELEASE
									<EyeSlashIcon className="h-5 w-5" />
								</>
							)}
						</button>
					)}
					<button
						className="flex w-fit items-center gap-1 rounded-md bg-gradient-to-r from-red-700 to-rose-600 py-1 pl-2 pr-1.5 text-sm font-medium text-white hover:from-red-600 hover:to-rose-600 disabled:from-slate-500 disabled:to-slate-400"
						onClick={() => handleDelete()}
						disabled={isDeletingShowtimes}
					>
						{isDeletingShowtimes ? (
							'Processing...'
						) : (
							<>
								DELETE
								<TrashIcon className="h-5 w-5" />
							</>
						)}
					</button>
				</div>
			)}
			<div className="flex justify-between">
				<div className="flex flex-col justify-center rounded-tl-lg bg-gradient-to-br from-gray-800 to-gray-700 px-4 py-0.5 text-center font-bold text-white sm:px-8">
					<p className="text-sm">Theater</p>
					<p className="text-3xl">{showtime?.theater?.number}</p>
				</div>
				<div className="flex w-fit grow items-center justify-center rounded-tr-lg bg-gradient-to-br from-indigo-800 to-blue-700 px-4 py-0.5 text-center text-xl font-bold text-white sm:text-3xl">
					<p className="mx-auto">{showtime?.theater?.cinema.name}</p>
					{!showtime?.isRelease && <EyeSlashIcon className="h-8 w-8" title="Unreleased showtime" />}
				</div>
			</div>
			<div className="flex flex-col md:flex-row">
				<div className="flex grow flex-col gap-4 bg-gradient-to-br from-indigo-100 to-white py-2 drop-shadow-lg sm:py-4">
					<div className="flex flex-col items-center sm:items-start sm:flex-row w-full">
						<img src={showtime?.movie?.img} className="w-48 px-4 drop-shadow-md pb-4 sm:pb-0" />
						<div className="flex flex-col flex-1 px-4 sm:px-0">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between">
								<h4 className="mr-4 text-2xl font-bold sm:text-3xl md:text-4xl text-gray-800">
									{showtime?.movie?.name}
								</h4>
								{/* TMDB Rating */}
								{tmdbData?.rating && (
									<div className="flex items-center gap-1 mt-2 sm:mt-0 bg-yellow-100 px-3 py-1 rounded-full w-fit">
										<StarIcon className="h-5 w-5 text-yellow-500" />
										<span className="font-bold text-yellow-700">{tmdbData.rating} <span className="text-sm font-medium text-yellow-600">/ 10</span></span>
									</div>
								)}
							</div>

							{showtime?.movie && (
								<p className="font-semibold text-gray-600 mt-1 sm:text-lg">
									Length: {showtime?.movie?.length || '-'} min
								</p>
							)}

							{/* TMDB Tagline */}
							{tmdbData?.tagline && (
								<p className="italic text-gray-500 mt-2 font-medium">"{tmdbData.tagline}"</p>
							)}

							{/* TMDB Synopsis */}
							{tmdbData?.overview && (
								<div className="mt-4 pr-4">
									<h5 className="font-bold text-gray-700 mb-1">Synopsis</h5>
									<p className="text-gray-600 text-sm leading-relaxed line-clamp-3 sm:line-clamp-none">
										{tmdbData.overview}
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
				<div className="flex flex-col">
					<div className="flex h-full min-w-max flex-col items-center justify-center gap-y-1 bg-gradient-to-br from-indigo-100 to-white py-2 text-center text-xl font-semibold drop-shadow-lg sm:py-4 sm:text-2xl md:items-start">
						<p className="mx-4 text-lg leading-4 ">
							{showtime?.showtime &&
								`${new Date(showtime?.showtime).toLocaleString('default', { weekday: 'long' })}`}
						</p>
						<p className="mx-4 ">
							{showtime?.showtime &&
								`${new Date(showtime?.showtime).getDate()}
               					 ${new Date(showtime?.showtime).toLocaleString('default', { month: 'long' })}
                				${new Date(showtime?.showtime).getFullYear()}`}
						</p>
						<p className="mx-4 bg-gradient-to-r from-indigo-800 to-blue-700 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
							{showtime?.showtime &&
								`${new Date(showtime?.showtime).getHours().toString().padStart(2, '0')} : ${new Date(
									showtime?.showtime
								)
									.getMinutes()
									.toString()
									.padStart(2, '0')}`}
						</p>
					</div>
				</div>
			</div>

			{/* TMDB Supplemental Media Section - HIDDEN ON PURCHASE PAGE */}
			{!location.pathname.includes('/purchase') && (tmdbData?.trailerKey || (tmdbData?.backdrops && tmdbData.backdrops.length > 0)) && (
				<div className="mt-4 w-full bg-gradient-to-br from-gray-900 to-black rounded-lg overflow-hidden drop-shadow-xl text-white pb-4">

					{/* Header */}
					<div className="w-full bg-gradient-to-r from-red-700 to-red-600 py-1.5 px-4 shadow-md z-10 relative">
						<h3 className="text-white font-bold flex items-center gap-2 text-sm">
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path fillRule="evenodd" d="M21.582 6.186a2.6 2.6 0 00-1.83-1.833C18.14 3.93 12 3.93 12 3.93s-6.14 0-7.752.423a2.6 2.6 0 00-1.83 1.833C2.001 7.801 2 12 2 12s.001 4.199.418 5.814a2.6 2.6 0 001.83 1.833C5.86 20.07 12 20.07 12 20.07s6.14 0 7.752-.423a2.6 2.6 0 001.83-1.833C21.999 16.199 22 12 22 12s-.001-4.199-.418-5.814zM9.99 15.424V8.576L15.938 12 9.99 15.424z" clipRule="evenodd" />
							</svg>
							Media & Cast
						</h3>
					</div>

					{/* Flex Container for 3-Column View */}
					<div className="flex flex-col lg:flex-row w-full max-h-[800px] lg:max-h-[300px]">

						{/* Column 1: Auto-Scrolling Backdrops (Left) */}
						{tmdbData.backdrops && tmdbData.backdrops.length > 0 && (
							<div className="w-full lg:w-1/3 relative bg-gray-900 overflow-hidden h-[200px] lg:h-[300px] border-b lg:border-b-0 lg:border-r border-gray-800">
								{tmdbData.backdrops.map((imgUrl, index) => (
									<img
										key={index}
										src={imgUrl}
										alt={`Backdrop ${index + 1}`}
										className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === currentBackdropIndex ? 'opacity-100' : 'opacity-0'}`}
									/>
								))}
								{/* Backdrop overlay gradient */}
								<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-900/90 to-transparent pointer-events-none"></div>
								<div className="absolute bottom-1 right-3 text-[10px] font-mono text-gray-300 pointer-events-none drop-shadow-md">
									{currentBackdropIndex + 1} / {tmdbData.backdrops.length}
								</div>
							</div>
						)}

						{/* Column 2: Trailer (Middle) */}
						{tmdbData.trailerKey && (
							<div className="w-full lg:w-1/3 bg-black border-b lg:border-b-0 lg:border-r border-gray-800">
								<iframe
									className="w-full h-[200px] lg:h-[300px]"
									src={`https://www.youtube.com/embed/${tmdbData.trailerKey}?autoplay=0&rel=0`}
									title={`${showtime?.movie?.name} Official Trailer`}
									frameBorder="0"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
									referrerPolicy="strict-origin-when-cross-origin"
									allowFullScreen
								></iframe>
							</div>
						)}

						{/* Column 3: Cast List (Right - Vertical Scroll) */}
						{tmdbData.cast && tmdbData.cast.length > 0 && (
							<div className="w-full lg:w-1/3 bg-gray-900 h-[200px] lg:h-[300px] overflow-y-auto custom-scrollbar p-3">
								<h4 className="text-gray-400 font-semibold mb-3 text-xs uppercase tracking-wider sticky top-0 bg-gray-900/95 py-1 z-10 backdrop-blur-sm">Top Cast</h4>
								<div className="flex flex-col gap-2">
									{tmdbData.cast.map((actor) => (
										<div key={actor.id} className="flex items-center gap-3 bg-gray-800/60 rounded-lg p-2 hover:bg-gray-800 transition-colors">
											<div className="w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-gray-700 drop-shadow-md border border-gray-600">
												{actor.profilePath ? (
													<img src={actor.profilePath} alt={actor.name} className="w-full h-full object-cover" />
												) : (
													<div className="w-full h-full flex items-center justify-center text-gray-500">
														<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
													</div>
												)}
											</div>
											<div className="flex flex-col flex-1 min-w-0">
												<p className="text-sm font-bold text-gray-200 leading-tight truncate w-full" title={actor.name}>{actor.name}</p>
												<p className="text-xs text-gray-400 leading-tight mt-0.5 truncate w-full" title={actor.character}>{actor.character}</p>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</>
	)
}

export default ShowtimeDetails
