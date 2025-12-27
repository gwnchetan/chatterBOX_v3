import React, { useState, useEffect, useCallback } from 'react';
import { giphyService } from '../../services/giphy.service';
import { Search, X } from '../common/Icons';
import { useToast } from '../Toast';
import './GiphyPicker.css';

const GiphyPicker = ({ onSelect, onClose }) => {
    const [gifs, setGifs] = useState([]);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    // Debounce search
    useEffect(() => {
        const fetchGifs = async () => {
            setIsLoading(true);
            try {
                let results;
                if (query.trim()) {
                    results = await giphyService.search(query);
                } else {
                    results = await giphyService.getTrending();
                }
                setGifs(results);
            } catch (error) {
                console.error('Failed to fetch GIFs', error);
                toast.error('Failed to load GIFs');
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchGifs();
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [query]);

    return (
        <div className="giphy-picker-overlay" onClick={onClose}>
            <div className="giphy-picker-modal" onClick={e => e.stopPropagation()}>
                <div className="giphy-header">
                    <div className="search-bar">
                        <Search className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search GIPHY"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X />
                    </button>
                </div>

                <div className="giphy-grid">
                    {isLoading ? (
                        <div className="loading-spinner">Loading...</div>
                    ) : (
                        gifs.map((gif) => (
                            <div
                                key={gif.id}
                                className="gif-item"
                                onClick={() => onSelect(gif)}
                            >
                                <img src={gif.previewUrl} alt={gif.title} loading="lazy" />
                            </div>
                        ))
                    )}
                    {!isLoading && gifs.length === 0 && (
                        <div className="no-results">No GIFs found</div>
                    )}
                </div>
                <div className="giphy-footer">
                    <img src="https://developers.giphy.com/branch/master/static/header-logo-0fec0225d189bc0eae27dac3e3770582.gif" alt="Powered by GIPHY" style={{ height: '15px' }} />
                </div>
            </div>
        </div>
    );
};

export default GiphyPicker;
