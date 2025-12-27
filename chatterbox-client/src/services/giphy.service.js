import axios from 'axios';

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;
const BASE_URL = 'https://api.giphy.com/v1/gifs';

// Strict limits
const LIMIT = 20;
const RATING = 'pg';
const LANG = 'en';

export const giphyService = {
    /**
     * Search GIFs
     * @param {string} query 
     * @param {number} offset 
     */
    search: async (query, offset = 0) => {
        if (!GIPHY_API_KEY) {
            console.warn('Giphy API Key missing');
            return []; // Fail gracefully
        }

        try {
            const response = await axios.get(`${BASE_URL}/search`, {
                params: {
                    api_key: GIPHY_API_KEY,
                    q: query,
                    limit: LIMIT,
                    rating: RATING,
                    lang: LANG,
                    offset
                }
            });
            return response.data.data.map(transformGiphyResult);
        } catch (error) {
            console.error('Giphy Search Error:', error);
            throw error;
        }
    },

    /**
     * Get Trending GIFs
     * @param {number} offset 
     */
    getTrending: async (offset = 0) => {
        if (!GIPHY_API_KEY) {
            console.warn('Giphy API Key missing');
            return [];
        }

        try {
            const response = await axios.get(`${BASE_URL}/trending`, {
                params: {
                    api_key: GIPHY_API_KEY,
                    limit: LIMIT,
                    rating: RATING,
                    offset
                }
            });
            return response.data.data.map(transformGiphyResult);
        } catch (error) {
            console.error('Giphy Trending Error:', error);
            throw error;
        }
    }
};

/**
 * Transforms Giphy API result to our internal format
 */
const transformGiphyResult = (gif) => ({
    id: gif.id,
    type: 'gif',
    url: gif.images.original.url, // Store the full URL
    previewUrl: gif.images.fixed_height.url, // For UI grid
    provider: 'giphy',
    title: gif.title
});
