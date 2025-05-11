const apiKey = "e013b8bd171c003b20b1cc74f3b407c7";    // OpenWeatherMap API key for weather data
const openCageApiKey = "a22371eb95fd4b2abfe065f80840c0ed";   // OpenCage Data API key for reverse geocoding

// DOM ELEMENTS

const searchForm = document.getElementById("searchForm");    // Form and input elements
const cityInput = document.getElementById("cityInput");

// Weather display containers
const currentWeather = document.getElementById("currentWeather");
const forecastSection = document.querySelector(".forecast-cards");

// History and favorites containers
const searchHistoryDiv = document.getElementById("searchHistory");
const favoritesContainer = document.getElementById("favoritesContainer");

// MAP INITIALIZATION
// Create Leaflet map instance with default view
const map = L.map('map', {
    center: [20, 0],  // Default center coordinates (equator)
    zoom: 10,           // Initial zoom level
    scrollWheelZoom: true  // Disable zoom with mouse wheel
}).setView([20, 0], 3);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'  // Required attribution
}).addTo(map);

// STATE MANAGEMENT
// Load search history from localStorage or initialize empty array
let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];

// Load favorites from localStorage or initialize empty array
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Variable to store map marker instance
let marker;
// EVENT HANDLERS
// Handle form submission for city search
searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();  // Prevent page reload
    const city = cityInput.value.trim();
    if (city) {
        await getWeatherData(city);
        cityInput.value = "";  // Clear input field
    }
});

// Handle map click events
map.on('click', async (e) => {
    try {
        showLoading();
        const { lat, lng } = e.latlng;  // Get clicked coordinates
        
        // Clear previous marker
        if (marker) map.removeLayer(marker);
        
        // Create new marker with loading popup
        marker = L.marker([lat, lng]).addTo(map)
            .bindPopup('Loading weather...')
            .openPopup();

        // Convert coordinates to city name
        const city = await reverseGeocode(lat, lng);
        // Fetch weather for the location
        await getWeatherData(city);
        
        // Update popup content after successful fetch
        marker.setPopupContent(`Weather data loaded for ${city}`);
    } catch (error) {
        showError("Failed to get location data");
        if (marker) map.removeLayer(marker);
    }
});

// CORE WEATHER FUNCTIONS
// Main function to fetch weather data
async function getWeatherData(location, isFavorite = false) {
    try {
        showLoading();  // Show loading state
        let lat, lon, cityName;

        // Handle different location types (string = city name, object = coordinates)
        if (typeof location === 'string') {
            // Geocode city name to coordinates
            const geoResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}`
            );
            const geoData = await geoResponse.json();
            lat = geoData.coord.lat;
            lon = geoData.coord.lon;
            cityName = geoData.name;
        } else {
            // Directly use coordinates
            lat = location.lat;
            lon = location.lon;
            cityName = await reverseGeocode(lat, lon);
        }

        // Fetch 5-day forecast data
        const weatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`
        );
        const weatherData = await weatherResponse.json();
        
        // Update UI with fetched data
        displayCurrentWeather(weatherData);
        displayForecast(weatherData.list);
        
        // Update search history unless it's a favorite click
        if (!isFavorite) {
            updateSearchHistory(cityName);
        }
        
    } catch (error) {
        console.error("Error:", error);
        showError("Failed to fetch weather data");
    }
}

// Convert coordinates to human-readable location
async function reverseGeocode(lat, lng) {
    const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${openCageApiKey}`
    );
    const data = await response.json();
    
    // Handle no results found
    if (!data.results.length) throw new Error('No results found');
    
    // Extract location components with fallbacks
    const components = data.results[0].components;
    return components.city || components.town || components.village || components.county;
}

// DISPLAY FUNCTIONS
// Update current weather display
function displayCurrentWeather(data) {
    // Extract weather data from API response
    const city = data.city.name;
    const date = dayjs().format("MMMM D, YYYY");
    const temp = (data.list[0].main.temp - 273.15).toFixed(1);  // Convert Kelvin to Celsius
    const humidity = data.list[0].main.humidity;
    const windSpeed = (data.list[0].wind.speed * 3.6).toFixed(1);  // Convert m/s to km/h
    const icon = data.list[0].weather[0].icon;
    const isFavorite = favorites.includes(city);

    // Generate HTML template
    currentWeather.innerHTML = `
        <div class="weather-main">
            <div>
                <h2>${city}</h2>
                <p class="text-muted">${date}</p>
                <img src="https://openweathermap.org/img/wn/${icon}@4x.png" 
                     class="weather-icon">
            </div>
            <div class="weather-details">
                <p class="display-4">${temp}°C</p>
                <div class="weather-stats">
                    <p><i class="fas fa-tint"></i> Humidity: ${humidity}%</p>
                    <p><i class="fas fa-wind"></i> Wind: ${windSpeed} km/h</p>
                </div>
            </div>
        </div>
        <div class="favorite-button-container">
            <button class="add-favorite-btn ${isFavorite ? 'added' : ''}" 
                    onclick="toggleFavorite('${city.replace(/'/g, "\\'")}')"
                    ${isFavorite ? 'disabled' : ''}>
                <i class="fas fa-heart"></i>
                ${isFavorite ? 'Added to Favorites' : 'Add to Favorites'}
            </button>
        </div>
    `;
}

// Display 5-day forecast
function displayForecast(forecastData) {
    forecastSection.innerHTML = "";  // Clear previous forecast
    
    // Filter to get daily forecasts (every 8th item in 3-hour intervals)
    const dailyForecast = forecastData.filter((item, index) => index % 8 === 0).slice(0, 5);

    // Create forecast cards
    dailyForecast.forEach(item => {
        const date = dayjs(item.dt_txt).format("MMM D");
        const temp = (item.main.temp - 273.15).toFixed(1);
        const icon = item.weather[0].icon;
        const humidity = item.main.humidity;

        // Create card element
        const card = document.createElement("div");
        card.className = "forecast-card animate__animated animate__fadeInUp";
        card.innerHTML = `
            <p class="forecast-date">${date}</p>
            <img src="https://openweathermap.org/img/wn/${icon}.png">
            <p class="forecast-temp">${temp}°C</p>
            <p class="text-muted"><i class="fas fa-tint"></i> ${humidity}%</p>
        `;

        forecastSection.appendChild(card);
    });
}

// SEARCH HISTORY
// Update search history storage
function updateSearchHistory(city) {
    if (!searchHistory.includes(city)) {
        searchHistory.unshift(city);  // Add to beginning
        if (searchHistory.length > 5) searchHistory.pop();  // Keep only 5 items
        localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
        renderSearchHistory();
    }
}

// Render search history UI
function renderSearchHistory() {
    searchHistoryDiv.innerHTML = searchHistory.map(city => `
        <div class="search-history-item" onclick="getWeatherData('${city.replace(/'/g, "\\'")}')">
            <i class="fas fa-map-marker-alt"></i>
            ${city}
        </div>
    `).join("");
}

// FAVORITES MANAGEMENT
// Toggle city in favorites
function toggleFavorite(city) {
    if (!favorites.includes(city)) {
        // Add to favorites if space available
        if (favorites.length >= 3) {
            showError("Maximum 3 favorites allowed. Remove one to add new.");
            return;
        }
        favorites.push(city);
    } else {
        // Remove from favorites
        favorites = favorites.filter(f => f !== city);
    }
    
    // Update storage and UI
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderFavorites();
    
    // Update favorite button state
    const btn = document.querySelector('.add-favorite-btn');
    if (btn) {
        btn.classList.toggle('added', favorites.includes(city));
        btn.innerHTML = `
            <i class="fas fa-heart"></i>
            ${favorites.includes(city) ? 'Added to Favorites' : 'Add to Favorites'}
        `;
        btn.disabled = favorites.includes(city);
    }
}

// Render favorites list
function renderFavorites() {
    // Clean invalid entries
    favorites = favorites.filter(f => typeof f === 'string');
    
    // Generate favorite cards
    favoritesContainer.innerHTML = favorites.map(city => `
        <div class="favorite-card">
            <button class="remove-favorite" onclick="toggleFavorite('${city.replace(/'/g, "\\'")}')">&times;</button>
            <div onclick="getWeatherData('${city.replace(/'/g, "\\'")}', true)">
                <h4>${city}</h4>
                <div class="mini-weather">Loading...</div>
            </div>
        </div>
    `).join('');
    
    // Update weather for all favorites
    favorites.forEach(city => updateFavoriteWeather(city));
}

// Update weather data for favorite cities
async function updateFavoriteWeather(city) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`
        );
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        const temp = (data.main.temp - 273.15).toFixed(1);
        const icon = data.weather[0]?.icon || '';

        // Update matching favorite card
        document.querySelectorAll('.favorite-card h4').forEach(element => {
            if (element.textContent === city) {
                element.closest('.favorite-card').querySelector('.mini-weather').innerHTML = `
                    ${icon ? `<img src="https://openweathermap.org/img/wn/${icon}.png" 
                         style="width: 40px; height: 40px;">` : ''}
                    <span>${temp}°C</span>
                `;
            }
        });
    } catch (error) {
        console.error("Error updating favorite:", error);
        // Show error state for failed updates
        document.querySelectorAll('.favorite-card h4').forEach(element => {
            if (element.textContent === city) {
                element.closest('.favorite-card').querySelector('.mini-weather').innerHTML = `
                    <span class="text-muted">Data unavailable</span>
                `;
            }
        });
    }
}

// UI UTILITIES
// Show loading state
function showLoading() {
    currentWeather.innerHTML = `
        <div class="loading text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-3">Loading weather data...</p>
        </div>
    `;
    forecastSection.innerHTML = "";  // Clear forecast during load
}

// Show error message
function showError(message) {
    currentWeather.innerHTML = `
        <div class="alert alert-danger">
            ${message}
        </div>
    `;
}

// INITIALIZATION
// Get initial location on app start
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            // Use device location if available
            getWeatherData({
                lat: position.coords.latitude,
                lon: position.coords.longitude
            });
        },
        (error) => {
            console.error("Geolocation error:", error);
            getWeatherData('London');  // Fallback to London
        }
    );
} else {
    getWeatherData('London');  // Fallback for browsers without geolocation
}

// Initial rendering of stored data
renderSearchHistory();
renderFavorites();