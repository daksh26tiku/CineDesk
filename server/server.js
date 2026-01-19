const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
const mongoose = require('mongoose')
const mongoSanitize = require('express-mongo-sanitize')
const helmet = require('helmet')
const xss = require('xss-clean')
require('dotenv').config()

const auth = require('./routes/auth')
const cinema = require('./routes/cinema')
const theater = require('./routes/theater')
const movie = require('./routes/movie')
const showtime = require('./routes/showtime')

mongoose.set('strictQuery', false)
mongoose
	.connect(process.env.DATABASE, { autoIndex: true })
	.then(() => {
		console.log('mongoose connected!')
	})
	.catch((err) => console.log(err))

const app = express()

// Frontend URLs (remove trailing slash and add both www and non-www versions)
const FRONTEND_URLS = [
	'http://d2wjw0tm17zr9g.cloudfront.net',
	'https://d2wjw0tm17zr9g.cloudfront.net',
	// 'https://cine-booker.vercel.app',
	'https://cine-desk.vercel.app',
	// 'https://www.cine-booker.vercel.app',
	'https://www.cine-desk.vercel.app',
	'http://localhost:3000', // for local development
	'http://localhost:5173', // for local development
	'http://localhost:3001'  // backup local port
]

// CORS configuration - THIS IS CRITICAL FOR CROSS-ORIGIN REQUESTS
const corsOptions = {
	origin: function (origin, callback) {
		// Allow requests with no origin (mobile apps, postman, etc.)
		if (!origin) return callback(null, true)
		
		// Check if it's in the allowed list
		if (FRONTEND_URLS.includes(origin)) {
			return callback(null, true)
		}
		
		// Allow any Vercel domain (production, preview, branch deployments)
		// Matches: *.vercel.app for automatic preview deployments
		if (origin.endsWith('.vercel.app')) {
			return callback(null, true)
		}
		
		console.log('Blocked by CORS:', origin)
		callback(new Error('Not allowed by CORS'))
	},
	credentials: true, // Allow cookies to be sent
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
	exposedHeaders: ['Set-Cookie']
}

// Apply middleware in correct order
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// Apply CORS before other middleware
app.use(cors(corsOptions))

// Handle preflight requests
app.options('*', cors(corsOptions))

// Other middleware
app.use(morgan('combined')) // Use 'combined' for production logging
app.use(mongoSanitize())

// Configure helmet for production
app.use(helmet({
	crossOriginEmbedderPolicy: false,
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			scriptSrc: ["'self'"],
			imgSrc: ["'self'", "data:", "https:"],
		},
	},
}))

app.use(xss())

// Add a health check endpoint (available at both /health and /api/health)
const healthCheck = (req, res) => {
	res.status(200).json({ 
		status: 'OK', 
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV || 'development'
	})
}
app.get('/health', healthCheck)
app.get('/api/health', healthCheck)

// Add request logging middleware for debugging
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
	console.log('Origin:', req.get('Origin'))
	console.log('Headers:', req.headers)
	next()
})

// Routes - prefix with /api for Vercel deployment
app.use('/api/auth', auth)
app.use('/api/cinema', cinema)
app.use('/api/theater', theater)
app.use('/api/movie', movie)
app.use('/api/showtime', showtime)

// Also support non-prefixed routes for local development backward compatibility
app.use('/auth', auth)
app.use('/cinema', cinema)
app.use('/theater', theater)
app.use('/movie', movie)
app.use('/showtime', showtime)

// Catch-all error handler
app.use((err, req, res, next) => {
	console.error('Error:', err.message)
	console.error('Stack:', err.stack)
	
	if (err.message === 'Not allowed by CORS') {
		return res.status(403).json({
			success: false,
			message: 'CORS error - Origin not allowed',
			origin: req.get('Origin')
		})
	}
	
	res.status(500).json({
		success: false,
		message: process.env.NODE_ENV === 'production' 
			? 'Internal server error' 
			: err.message
	})
})

// 404 handler
app.use('*', (req, res) => {
	res.status(404).json({
		success: false,
		message: `Route ${req.originalUrl} not found`
	})
})

const port = process.env.PORT || 3000

// Only listen if not in serverless environment (Vercel)
if (require.main === module) {
	app.listen(port, '0.0.0.0', () => {
		console.log(`Server running on port ${port}`)
		console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
		console.log(`Allowed origins: ${FRONTEND_URLS.join(', ')}`)
	})
}

// Export for Vercel serverless
module.exports = app