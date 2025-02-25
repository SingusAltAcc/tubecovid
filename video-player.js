document.addEventListener('DOMContentLoaded', function() {
    // Get the video ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    
    // Check if we're on a video page and have a video ID
    if (!videoId) {
        // If we're on video.html but without a video ID, redirect to home
        if (window.location.pathname.includes('video.html')) {
            window.location.href = 'index.html';
        }
        return;
    }
    
    // Set up back button functionality
    const backButton = document.getElementById('backToHome');
    if (backButton) {
        backButton.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
    
    // Check if API key exists
    let apiKey = localStorage.getItem('youtubeApiKey');
    
    if (!apiKey) {
        showVideoError('YouTube API key required. Please go back to the home page and enter your API key.');
        return;
    }
    
    // Initialize the YouTube API
    gapi.load('client', function() {
        gapi.client.init({
            apiKey: apiKey,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'],
        }).then(function() {
            // Load video data
            loadVideoData(videoId);
        }).catch(function(error) {
            console.error('Error initializing YouTube API client', error);
            showVideoError('Failed to initialize YouTube API. Please check your API key.');
        });
    });
    
    // Function to show error on video page
    function showVideoError(message) {
        const playerWrapper = document.querySelector('.player-wrapper');
        if (playerWrapper) {
            playerWrapper.innerHTML = `
                <div class="error-message" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; text-align: center;">
                    <i class="fas fa-exclamation-circle"></i>
                    ${message}
                </div>
            `;
        }
    }
    
    // Function to load video data
    function loadVideoData(videoId) {
        // Set up the iframe with the video
        const videoIframe = document.getElementById('videoIframe');
        if (videoIframe) {
            videoIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        }
        
        // Fetch the video details
        gapi.client.youtube.videos.list({
            part: 'snippet,statistics,contentDetails',
            id: videoId
        }).then(function(response) {
            if (response.result.items && response.result.items.length > 0) {
                const video = response.result.items[0];
                populateVideoDetails(video);
                
                // Fetch channel details
                return gapi.client.youtube.channels.list({
                    part: 'snippet,statistics',
                    id: video.snippet.channelId
                });
            } else {
                throw new Error('Video not found');
            }
        }).then(function(response) {
            if (response.result.items && response.result.items.length > 0) {
                const channel = response.result.items[0];
                populateChannelDetails(channel);
            }
            
            // Fetch related videos
            return gapi.client.youtube.search.list({
                part: 'snippet',
                relatedToVideoId: videoId,
                type: 'video',
                maxResults: 10
            });
        }).then(function(response) {
            if (response.result.items && response.result.items.length > 0) {
                populateRelatedVideos(response.result.items);
            }
            
            // Fetch video comments
            return gapi.client.youtube.commentThreads.list({
                part: 'snippet',
                videoId: videoId,
                maxResults: 20
            });
        }).then(function(response) {
            if (response.result.items) {
                populateComments(response.result.items);
            }
        }).catch(function(error) {
            console.error('Error fetching video data', error);
            showVideoError('Failed to load video data. ' + error.message);
        });
    }
    
    // Function to populate video details
    function populateVideoDetails(video) {
        // Set video title
        const videoTitle = document.getElementById('videoTitle');
        if (videoTitle) {
            videoTitle.textContent = video.snippet.title;
            document.title = video.snippet.title + ' - YouTube (2020)';
        }
        
        // Set views and date
        const videoViewsDate = document.getElementById('videoViewsDate');
        if (videoViewsDate) {
            const views = parseInt(video.statistics.viewCount).toLocaleString();
            const publishDate = formatPublishDate(video.snippet.publishedAt);
            videoViewsDate.textContent = `${views} views • ${publishDate}`;
        }
        
        // Set likes and dislikes
        const videoLikes = document.getElementById('videoLikes');
        const videoDislikes = document.getElementById('videoDislikes');
        if (videoLikes && videoDislikes) {
            videoLikes.textContent = parseInt(video.statistics.likeCount || 0).toLocaleString();
            videoDislikes.textContent = parseInt(video.statistics.dislikeCount || 0).toLocaleString();
        }
        
        // Set description
        const videoDescription = document.getElementById('videoDescription');
        if (videoDescription) {
            videoDescription.textContent = video.snippet.description || 'No description available.';
        }
        
        // Set comment count
        const commentCount = document.getElementById('commentCount');
        if (commentCount) {
            const count = parseInt(video.statistics.commentCount || 0).toLocaleString();
            commentCount.textContent = `${count} Comments`;
        }
    }
    
    // Function to populate channel details
    function populateChannelDetails(channel) {
        const channelName = document.getElementById('channelName');
        const channelSubs = document.getElementById('channelSubs');
        const channelAvatar = document.getElementById('channelAvatar');
        
        if (channelName) {
            channelName.textContent = channel.snippet.title;
        }
        
        if (channelSubs) {
            const subCount = parseInt(channel.statistics.subscriberCount || 0).toLocaleString();
            channelSubs.textContent = `${subCount} subscribers`;
        }
        
        if (channelAvatar) {
            const thumbnailUrl = channel.snippet.thumbnails.default.url;
            channelAvatar.innerHTML = `<img src="${thumbnailUrl}" alt="${channel.snippet.title}">`;
        }
    }
    
    // Function to populate related videos
    function populateRelatedVideos(videos) {
        const suggestedVideos = document.getElementById('suggestedVideos');
        if (!suggestedVideos) return;
        
        let html = '';
        
        // Need to get the full video details for the related videos
        const videoIds = videos.map(video => video.id.videoId).join(',');
        
        gapi.client.youtube.videos.list({
            part: 'snippet,statistics,contentDetails',
            id: videoIds
        }).then(function(response) {
            if (response.result.items && response.result.items.length > 0) {
                const detailedVideos = response.result.items;
                
                // Create a map for quick lookup
                const videoMap = {};
                detailedVideos.forEach(video => {
                    videoMap[video.id] = video;
                });
                
                // Now use the original order from the search results, but with detailed information
                videos.forEach(relatedVideo => {
                    const videoId = relatedVideo.id.videoId;
                    const snippet = relatedVideo.snippet;
                    const detailedVideo = videoMap[videoId];
                    
                    if (!detailedVideo) return;
                    
                    // Extract detailed information
                    const statistics = detailedVideo.statistics || {};
                    const contentDetails = detailedVideo.contentDetails || {};
                    
                    const viewCount = statistics.viewCount ? formatViews(parseInt(statistics.viewCount)) : '0 views';
                    const publishTime = formatPublishDate(snippet.publishedAt);
                    const duration = contentDetails.duration ? formatDuration(contentDetails.duration) : '0:00';
                    
                    const thumbnailUrl = snippet.thumbnails.medium ? snippet.thumbnails.medium.url : 
                                         (snippet.thumbnails.high ? snippet.thumbnails.high.url : 
                                         snippet.thumbnails.default.url);
                    
                    html += `
                        <div class="suggested-video" data-video-id="${videoId}">
                            <div class="suggested-thumbnail">
                                <img src="${thumbnailUrl}" alt="${snippet.title}">
                                <div class="suggested-duration">${duration}</div>
                            </div>
                            <div class="suggested-details">
                                <h3 class="suggested-title">${snippet.title}</h3>
                                <p class="suggested-channel">${snippet.channelTitle}</p>
                                <p class="suggested-stats">${viewCount} • ${publishTime}</p>
                            </div>
                        </div>
                    `;
                });
                
                suggestedVideos.innerHTML = html;
                
                // Add click event listeners to related videos
                const suggestedVideoElements = document.querySelectorAll('.suggested-video');
                suggestedVideoElements.forEach(video => {
                    video.addEventListener('click', function() {
                        const videoId = this.dataset.videoId;
                        window.location.href = `video.html?v=${videoId}`;
                    });
                });
            } else {
                suggestedVideos.innerHTML = '<p>No related videos found.</p>';
            }
        }).catch(function(error) {
            console.error('Error fetching related videos details', error);
            suggestedVideos.innerHTML = '<p>Failed to load related videos.</p>';
        });
    }
    
    // Function to populate comments
    function populateComments(comments) {
        const commentsContainer = document.getElementById('commentsContainer');
        if (!commentsContainer) return;
        
        let html = '';
        
        comments.forEach(thread => {
            const comment = thread.snippet.topLevelComment.snippet;
            const likeCount = parseInt(comment.likeCount || 0);
            const publishDate = formatPublishDate(comment.publishedAt);
            
            html += `
                <div class="comment">
                    <div class="comment-avatar">
                        <img src="${comment.authorProfileImageUrl}" alt="${comment.authorDisplayName}">
                    </div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-author">${comment.authorDisplayName}</span>
                            <span class="comment-date">${publishDate}</span>
                        </div>
                        <div class="comment-text">${comment.textDisplay}</div>
                        <div class="comment-actions">
                            <button class="comment-action"><i class="fas fa-thumbs-up"></i> ${likeCount}</button>
                            <button class="comment-action"><i class="fas fa-thumbs-down"></i></button>
                            <button class="comment-action">REPLY</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (html) {
            commentsContainer.innerHTML = html;
        } else {
            commentsContainer.innerHTML = '<p>No comments found for this video.</p>';
        }
    }
    
    // Format functions
    function formatViews(viewCount) {
        if (viewCount >= 1000000) {
            return Math.floor(viewCount / 1000000) + 'M views';
        } else if (viewCount >= 1000) {
            return Math.floor(viewCount / 1000) + 'K views';
        } else {
            return viewCount + ' views';
        }
    }
    
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
});