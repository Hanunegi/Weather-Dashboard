const apiKey = "e013b8bd171c003b20b1cc74f3b407c7";
const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const currentWeather = document.getElementById("currentWeather");
const forecastSection = document.querySelector(".forecast-cards");
const searchHistoryDiv = document.getElementById("searchHistory");

let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];

// Initialize
renderSearchHistory();

// Event Listeners
searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) {
        await getWeatherData(city);
        cityInput.value = "";
    }
});

// Weather Data Fetch
async function getWeatherData(city) {
    try {
        showLoading();
        
        // Get Coordinates
        const geoResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`
        );
        const geoData = await geoResponse.json();
        
        // Get Weather Data
        const weatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${geoData.coord.lat}&lon=${geoData.coord.lon}&appid=${apiKey}`
        );
        const weatherData = await weatherResponse.json();
        
        // Update UI
        displayCurrentWeather(weatherData);
        displayForecast(weatherData.list);
        updateSearchHistory(city);
        
    } catch (error) {
        console.error("Error:", error);
        showError("Failed to fetch weather data");
    }
}

// Display Current Weather
function displayCurrentWeather(data) {
    const city = data.city.name;
    const date = dayjs().format("MMMM D, YYYY");
    const temp = (data.list[0].main.temp - 273.15).toFixed(1);
    const humidity = data.list[0].main.humidity;
    const windSpeed = (data.list[0].wind.speed * 3.6).toFixed(1);
    const icon = data.list[0].weather[0].icon;

    currentWeather.innerHTML = `
        <div class="weather-main">
            <div>
                <h2>${city}</h2>
                <p class="text-muted">${date}</p>
                <img src="https://openweathermap.org/img/wn/${icon}@4x.png" 
                     alt="Weather icon" 
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
    `;
}

// Display 5-Day Forecast
function displayForecast(forecastData) {
    forecastSection.innerHTML = "";
    
    // Filter for midday forecasts
    const dailyForecast = forecastData.filter((item, index) => index % 8 === 0).slice(0, 5);

    dailyForecast.forEach(item => {
        const date = dayjs(item.dt_txt).format("MMM D");
        const temp = (item.main.temp - 273.15).toFixed(1);
        const icon = item.weather[0].icon;
        const humidity = item.main.humidity;

        const card = document.createElement("div");
        card.className = "forecast-card animate__animated animate__fadeInUp";
        card.innerHTML = `
            <p class="forecast-date">${date}</p>
            <img src="https://openweathermap.org/img/wn/${icon}.png" 
                 alt="Weather icon">
            <p class="forecast-temp">${temp}°C</p>
            <p class="text-muted"><i class="fas fa-tint"></i> ${humidity}%</p>
        `;
        forecastSection.appendChild(card);
    });
}

// Search History Functions
function updateSearchHistory(city) {
    if (!searchHistory.includes(city)) {
        searchHistory.unshift(city);
        if (searchHistory.length > 5) searchHistory.pop();
        localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
        renderSearchHistory();
    }
}

function renderSearchHistory() {
    searchHistoryDiv.innerHTML = searchHistory.map(city => `
        <div class="search-history-item" onclick="getWeatherData('${city}')">
            <i class="fas fa-map-marker-alt"></i>
            ${city}
        </div>
    `).join("");
}

// UI Helpers
function showLoading() {
    currentWeather.innerHTML = `
        <div class="loading text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-3">Loading weather data...</p>
        </div>
    `;
    forecastSection.innerHTML = "";
}

function showError(message) {
    currentWeather.innerHTML = `
        <div class="alert alert-danger">
            ${message}
        </div>
    `;
}