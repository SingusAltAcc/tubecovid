document.addEventListener('DOMContentLoaded', function() {
    // Check if API key exists in localStorage
    let apiKey = localStorage.getItem('youtubeApiKey');
    const apiKeyModal = document.getElementById('apiKeyModal');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const submitApiKeyBtn = document.getElementById('submitApiKey');
    
    // Show API key modal if no key is stored
    if (!apiKey && apiKeyModal) {
        apiKeyModal.style.display = 'flex';
    } else if (apiKey) {
        initializeYouTubeAPI(apiKey);
    }
    
    // Handle API key submission
    if (submitApiKeyBtn) {
        submitApiKeyBtn.addEventListener('click', function() {
            const inputKey = apiKeyInput.value.trim();
            if (inputKey) {
                localStorage.setItem('youtubeApiKey', inputKey);
                apiKeyModal.style.display = 'none';
                initializeYouTubeAPI(inputKey);
            } else {
                alert('Please enter a valid API key');
            }
        });
    }
    
    // Function to initialize the YouTube API
    function initializeYouTubeAPI(key) {
        // Set the API key
        window.YOUTUBE_API_KEY = key;
        
        // Initialize the API client
        gapi.load('client', function() {
            gapi.client.init({
                apiKey: window.YOUTUBE_API_KEY,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'],
            }).then(function() {
                console.log('YouTube API client initialized');
                loadVideos();
            }).catch(function(error) {
                console.error('Error initializing YouTube API client', error);
                showAPIKeyError();
            });
        });
    }
    
    // Function to show API key error
    function showAPIKeyError() {
        localStorage.removeItem('youtubeApiKey');
        const errorMessage = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                Invalid API key or quota exceeded. Please try a different API key.
            </div>
            <button id="resetApiKey" class="learn-more-btn" style="display: block; margin: 0 auto;">Enter New API Key</button>
        `;
        
        const containers = ['recommended-videos', 'trending-videos', 'news-videos', 'creator-videos'];
        containers.forEach(container => {
            const element = document.getElementById(container);
            if (element) {
                element.innerHTML = errorMessage;
            }
        });
        
        // Add event listener to reset API key button
        const resetButton = document.getElementById('resetApiKey');
        if (resetButton) {
            resetButton.addEventListener('click', function() {
                if (apiKeyModal) apiKeyModal.style.display = 'flex';
            });
        }
    }
    
    // Function to format view counts
    function formatViews(viewCount) {
        if (viewCount >= 1000000) {
            return Math.floor(viewCount / 1000000) + 'M views';
        } else if (viewCount >= 1000) {
            return Math.floor(viewCount / 1000) + 'K views';
        } else {
            return viewCount + ' views';
        }
    }
    
    // Function to format publish date to "X time ago" format
    function formatPublishDate(publishDate) {
        const now = new Date();
        const published = new Date(publishDate);
        const diff = Math.floor((now - published) / 1000); // difference in seconds
        
        if (diff < 60) {
            return diff + ' seconds ago';
        } else if (diff < 3600) {
            return Math.floor(diff / 60) + ' minutes ago';
        } else if (diff < 86400) {
            return Math.floor(diff / 3600) + ' hours ago';
        } else if (diff < 2592000) {
            return Math.floor(diff / 86400) + ' days ago';
        } else if (diff < 31536000) {
            return Math.floor(diff / 2592000) + ' months ago';
        } else {
            return Math.floor(diff / 31536000) + ' years ago';
        }
    }
    
    // Function to format video duration
    function formatDuration(duration) {
        // PT1H24M33S -> 1:24:33
        let match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        
        let hours = (match[1]) ? match[1].replace('H', '') : 0;
        let minutes = (match[2]) ? match[2].replace('M', '') : 0;
        let seconds = (match[3]) ? match[3].replace('S', '') : 0;
        
        // Pad with leading zeros if needed
        if (seconds < 10) seconds = '0' + seconds;
        
        if (hours > 0) {
            if (minutes < 10) minutes = '0' + minutes;
            return `${hours}:${minutes}:${seconds}`;
        } else {
            return `${minutes}:${seconds}`;
        }
    }
    
    // Function to create a video card element
    function createVideoCard(video) {
        const videoId = video.id.videoId || video.id;
        const snippet = video.snippet;
        const statistics = video.statistics || {};
        const contentDetails = video.contentDetails || {};
        
        // Check if statistics are available
        let viewCount = '0 views';
        if (statistics.viewCount) {
            viewCount = formatViews(parseInt(statistics.viewCount));
        }
        
        const publishTime = formatPublishDate(snippet.publishedAt);
        const duration = contentDetails.duration ? formatDuration(contentDetails.duration) : '0:00';
        
        const thumbnailUrl = snippet.thumbnails.high ? snippet.thumbnails.high.url : 
                             (snippet.thumbnails.medium ? snippet.thumbnails.medium.url : 
                             snippet.thumbnails.default.url);
        
        const channelId = snippet.channelId;
        let channelAvatarHtml = `<div class="creator-avatar" style="background-color: #e5e5e5"></div>`;
        
        // Fetch channel data to get thumbnail
        if (channelId) {
            gapi.client.youtube.channels.list({
                part: 'snippet',
                id: channelId
            }).then(response => {
                if (response.result.items && response.result.items.length > 0) {
                    const channel = response.result.items[0];
                    const thumbnail = channel.snippet.thumbnails.default.url;
                    const avatarElement = document.querySelector(`[data-channel-id="${channelId}"]`);
                    if (avatarElement) {
                        avatarElement.innerHTML = `<img src="${thumbnail}" alt="${snippet.channelTitle}">`;
                    }
                }
            }).catch(error => {
                console.error('Error fetching channel thumbnail', error);
            });
            
            channelAvatarHtml = `<div class="creator-avatar" data-channel-id="${channelId}"></div>`;
        }

        return `
            <div class="video-card" data-video-id="${videoId}">
                <div class="thumbnail">
                    <img src="${thumbnailUrl}" alt="${snippet.title}">
                    <div class="video-duration">${duration}</div>
                </div>
                <div class="video-info">
                    ${channelAvatarHtml}
                    <div class="video-details">
                        <h3 class="video-title">${snippet.title}</h3>
                        <p class="video-creator">${snippet.channelTitle}</p>
                        <p class="video-stats">${viewCount} • ${publishTime}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Show error when a section couldn't load videos
    function showSectionError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    ${message || 'Unable to load videos. Please try again later.'}
                </div>
            `;
        }
    }
    
    // Function to load videos from YouTube API
    function loadVideos() {
        // Get popular videos for the recommended section
        fetchPopularVideos()
            .then(videos => {
                const container = document.getElementById('recommended-videos');
                if (container) {
                    if (videos.length === 0) {
                        showSectionError('recommended-videos', 'No videos found in this category.');
                        return;
                    }
                    
                    let html = '';
                    videos.forEach(video => {
                        html += createVideoCard(video);
                    });
                    container.innerHTML = html;
                }
            })
            .catch(error => {
                console.error('Error fetching popular videos', error);
                showSectionError('recommended-videos');
            });
            
        // Get trending videos
        fetchTrendingVideos()
            .then(videos => {
                const container = document.getElementById('trending-videos');
                if (container) {
                    if (videos.length === 0) {
                        showSectionError('trending-videos', 'No trending videos found.');
                        return;
                    }
                    
                    let html = '';
                    videos.forEach(video => {
                        html += createVideoCard(video);
                    });
                    container.innerHTML = html;
                }
            })
            .catch(error => {
                console.error('Error fetching trending videos', error);
                showSectionError('trending-videos');
            });
            
        // Get news videos
        fetchVideosByCategory('25') // 25 is the category ID for News in YouTube API
            .then(videos => {
                const container = document.getElementById('news-videos');
                if (container) {
                    if (videos.length === 0) {
                        showSectionError('news-videos', 'No news videos found.');
                        return;
                    }
                    
                    let html = '';
                    videos.forEach(video => {
                        html += createVideoCard(video);
                    });
                    container.innerHTML = html;
                }
            })
            .catch(error => {
                console.error('Error fetching news videos', error);
                showSectionError('news-videos');
            });
            
        // Get videos from popular creators
        fetchPopularChannelVideos()
            .then(videos => {
                const container = document.getElementById('creator-videos');
                if (container) {
                    if (videos.length === 0) {
                        showSectionError('creator-videos', 'No creator videos found.');
                        return;
                    }
                    
                    // For creator videos, we need to fetch the video details to get view counts
                    const videoIds = videos.map(video => video.id.videoId).join(',');
                    
                    return gapi.client.youtube.videos.list({
                        part: 'snippet,statistics,contentDetails',
                        id: videoIds
                    })
                    .then(response => {
                        if (response.result.items && response.result.items.length > 0) {
                            let html = '';
                            response.result.items.forEach(video => {
                                html += createVideoCard(video);
                            });
                            container.innerHTML = html;
                        } else {
                            showSectionError('creator-videos', 'No creator videos found.');
                        }
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching creator videos', error);
                showSectionError('creator-videos');
            });
    }
    
    // API request functions
    function fetchPopularVideos() {
        return gapi.client.youtube.videos.list({
            part: 'snippet,statistics,contentDetails',
            chart: 'mostPopular',
            maxResults: 8,
            regionCode: 'US'
        })
        .then(response => {
            return response.result.items;
        });
    }
    
    function fetchTrendingVideos() {
        return gapi.client.youtube.videos.list({
            part: 'snippet,statistics,contentDetails',
            chart: 'mostPopular',
            videoCategoryId: '10', // 10 is Music category
            maxResults: 4,
            regionCode: 'US'
        })
        .then(response => {
            return response.result.items;
        });
    }
    
    function fetchVideosByCategory(categoryId) {
        return gapi.client.youtube.videos.list({
            part: 'snippet,statistics,contentDetails',
            chart: 'mostPopular',
            videoCategoryId: categoryId,
            maxResults: 4,
            regionCode: 'US'
        })
        .then(response => {
            return response.result.items;
        });
    }
    
    function fetchPopularChannelVideos() {
        // This is a bit more complex - we'd first need to get popular channels
        // For demo purposes, we'll use a predefined channel ID
        const popularChannelIds = [
            'UCX6OQ3DkcsbYNE6H8uQQuVA', // MrBeast
            'UC-lHJZR3Gqxm24_Vd_AJ5Yw', // PewDiePie
            'UCq-Fj5jknLsUf-MWSy4_brA', // T-Series
            'UCY30JRSgfhYXA6i6xX1erWg'  // Marques Brownlee
        ];
        
        const randomChannelId = popularChannelIds[Math.floor(Math.random() * popularChannelIds.length)];
        
        return gapi.client.youtube.search.list({
            part: 'snippet',
            channelId: randomChannelId,
            maxResults: 4,
            order: 'date',
            type: 'video'
        })
        .then(response => {
            return response.result.items;
        });
    }
    
    // Search functionality
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchTerm = searchInput.value.trim();
            
            if (searchTerm) {
                // Show loading state
                const mainContent = document.querySelector('.main-content');
                
                // Save original content
                const originalContent = mainContent.innerHTML;
                
                // Show search results
                mainContent.innerHTML = `
                    <h2 class="section-title">Search results for "${searchTerm}"</h2>
                    <div class="video-grid" id="search-results">
                        <div class="loading-indicator">
                            <div class="spinner"></div>
                            <p>Searching...</p>
                        </div>
                    </div>
                    <button id="back-to-home" class="learn-more-btn" style="margin-top: 20px;">Back to Home</button>
                `;
                
                // Perform search using YouTube API
                gapi.client.youtube.search.list({
                    part: 'snippet',
                    q: searchTerm,
                    maxResults: 12,
                    type: 'video'
                })
                .then(response => {
                    const results = response.result.items;
                    const resultsContainer = document.getElementById('search-results');
                    
                    if (results && results.length > 0) {
                        // We need to get the full video details including view counts
                        const videoIds = results.map(item => item.id.videoId).join(',');
                        
                        return gapi.client.youtube.videos.list({
                            part: 'snippet,statistics,contentDetails',
                            id: videoIds
                        })
                        .then(videoResponse => {
                            if (videoResponse.result.items && videoResponse.result.items.length > 0) {
                                let html = '';
                                videoResponse.result.items.forEach(video => {
                                    html += createVideoCard(video);
                                });
                                resultsContainer.innerHTML = html;
                            } else {
                                resultsContainer.innerHTML = `
                                    <div class="error-message">
                                        <i class="fas fa-exclamation-circle"></i>
                                        No results found for "${searchTerm}".
                                    </div>
                                `;
                            }
                        });
                    } else {
                        resultsContainer.innerHTML = `
                            <div class="error-message">
                                <i class="fas fa-exclamation-circle"></i>
                                No results found for "${searchTerm}".
                            </div>
                        `;
                    }
                })
                .catch(error => {
                    console.error('Error executing search', error);
                    const resultsContainer = document.getElementById('search-results');
                    resultsContainer.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i>
                            An error occurred while searching. Please try again.
                        </div>
                    `;
                });
                
                // Add event listener to back button
                document.getElementById('back-to-home').addEventListener('click', function() {
                    mainContent.innerHTML = originalContent;
                    
                    // Reattach event listeners to category buttons
                    attachCategoryEventListeners();
                    
                    // Reattach video click events
                    attachVideoClickEvents();
                });
            }
        });
    }
    
    // Function to attach category button event listeners
    function attachCategoryEventListeners() {
        const categoryButtons = document.querySelectorAll('.category');
        
        categoryButtons.forEach(button => {
            button.addEventListener('click', function() {
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                const category = this.dataset.category;
                console.log(`Category selected: ${category}`);
                
                // Filter videos based on category
                filterVideosByCategory(category);
            });
        });
    }
    
    // Function to filter videos by category
    function filterVideosByCategory(category) {
        // This would typically call the API with the category filter
        // For this demo, we'll just log the action
        console.log(`Filtering videos by category: ${category}`);
        
        // You could implement filtering here by calling specific category endpoints
        if (category !== 'all') {
            // Show a message indicating that category filtering is a demo feature
            alert(`Category filtering for "${category}" is a demo feature. In a full implementation, this would load videos from that category.`);
        }
    }
    
    // Function to attach video click events
    function attachVideoClickEvents() {
        document.addEventListener('click', function(e) {
            const videoCard = e.target.closest('.video-card');
            if (videoCard) {
                const videoId = videoCard.dataset.videoId;
                if (videoId) {
                    // Navigate to our custom video player page
                    window.location.href = `video.html?v=${videoId}`;
                }
            }
        });
    }
    
    // Initial attachment of event listeners
    attachCategoryEventListeners();
    attachVideoClickEvents();
    
    // Menu button functionality
    const menuBtn = document.querySelector('.menu-btn');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            document.querySelector('.main-content').classList.toggle('expanded');
        });
    }
});