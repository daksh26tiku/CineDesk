const express = require('express')
const axios = require('axios')
const router = express.Router()

// @desc    Search TMDB by movie title and fetch details + videos
// @route   GET /api/tmdb/search/:title
// @access  Public
router.get('/search/:title', async (req, res) => {
    try {
        const { title } = req.params;
        const TMDB_API_KEY = process.env.TMDB_API_KEY;

        if (!TMDB_API_KEY) {
            console.error('TMDB_API_KEY is missing from environment variables');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error'
            });
        }

        // 1. Search for the movie by title to get its TMDB ID
        const searchResponse = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
            params: {
                api_key: TMDB_API_KEY,
                query: title,
                page: 1,
                include_adult: false
            }
        });

        const results = searchResponse.data.results;

        if (!results || results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Movie not found on TMDB'
            });
        }

        // Take the closest match (first result)
        const movieId = results[0].id;

        // 2. Fetch the rich movie details, including trailers, images, and cast
        const detailsResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
            params: {
                api_key: TMDB_API_KEY,
                append_to_response: 'videos,images,credits',
                include_image_language: 'en,null' // Get language-agnostic or english backdrops
            }
        });

        const movieData = detailsResponse.data;

        // 3. Extract the YouTube trailer key (preferring official trailers)
        let trailerKey = null;
        if (movieData.videos && movieData.videos.results) {
            const trailers = movieData.videos.results.filter(
                (v) => v.site === 'YouTube' && v.type === 'Trailer'
            );

            // Try to find the official trailer, otherwise just take the first YouTube trailer
            const officialTrailer = trailers.find((v) => v.name.toLowerCase().includes('official'));
            trailerKey = officialTrailer ? officialTrailer.key : (trailers.length > 0 ? trailers[0].key : null);
        }

        // 4. Extract Backdrops (Top 10)
        let backdrops = [];
        if (movieData.images && movieData.images.backdrops) {
            backdrops = movieData.images.backdrops
                .slice(0, 10)
                .map(bg => `https://image.tmdb.org/t/p/w1280${bg.file_path}`);
        }

        // 5. Extract Cast (Top 15)
        let cast = [];
        if (movieData.credits && movieData.credits.cast) {
            cast = movieData.credits.cast
                .slice(0, 15)
                .map(actor => ({
                    id: actor.id,
                    name: actor.name,
                    character: actor.character,
                    profilePath: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
                }));
        }

        // 6. Construct a clean response object for the frontend
        const payload = {
            id: movieData.id,
            rating: movieData.vote_average ? movieData.vote_average.toFixed(1) : null,
            tagline: movieData.tagline || null,
            overview: movieData.overview || null,
            trailerKey: trailerKey,
            backdropPath: movieData.backdrop_path ? `https://image.tmdb.org/t/p/original${movieData.backdrop_path}` : null,
            posterPath: movieData.poster_path ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}` : null,
            backdrops: backdrops,
            cast: cast
        };

        res.status(200).json({
            success: true,
            data: payload
        });

    } catch (error) {
        console.error('TMDB API Error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch data from TMDB'
        });
    }
});

module.exports = router;
