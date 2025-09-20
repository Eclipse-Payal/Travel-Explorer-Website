// ==========================
// Travel Explorer - script.js
// ==========================

// DOM Elements
const searchForm = document.getElementById("hero-search-form");
const searchInput = document.getElementById("hero-search-input");
const weatherResult = document.getElementById("weather-result");
const photoGrid = document.getElementById("photo-grid");
const cityInfoDiv = document.getElementById("city-info");
const cityBlogsDiv = document.getElementById("city-blogs");

// Suggestion Box
const suggestionBox = document.createElement("ul");
suggestionBox.id = "suggestions";
searchInput.parentNode.appendChild(suggestionBox);

// ==========================
// API Keys
// ==========================
const UNSPLASH_ACCESS_KEY = "0iRxtou0BW7aNP0BqXX9idasGukg3PspyL8tEgDp7EU"; // Unsplash
const OPENWEATHER_API_KEY = "b2d00c1bb84d02966e265a6569b4d5cf"; // OpenWeather
const RAPIDAPI_KEY = "YOUR_RAPIDAPI_KEY"; // Optional for city autocomplete
const NEWSAPI_KEY = "ab489771bdc0451bb7e49b68cb7bd8f3"; // NewsAPI

// ==========================
// GeoDB Cities Autocomplete
// ==========================
async function searchCities(query) {
    try {
        const res = await fetch(
            `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${query}&limit=5`, {
                method: "GET",
                headers: {
                    "X-RapidAPI-Key": RAPIDAPI_KEY,
                    "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
                },
            }
        );
        const data = await res.json();
        return data.data.map((city) => `${city.city}, ${city.countryCode}`);
    } catch (err) {
        console.error("Location API error:", err);
        return [];
    }
}

searchInput.addEventListener("input", async() => {
    const query = searchInput.value.trim();
    suggestionBox.innerHTML = "";
    if (query.length < 2) return;
    const results = await searchCities(query);
    results.forEach((city) => {
        const li = document.createElement("li");
        li.textContent = city;
        li.addEventListener("click", () => {
            searchInput.value = city;
            suggestionBox.innerHTML = "";
        });
        suggestionBox.appendChild(li);
    });
});

// ==========================
// Fetch Weather
// ==========================
async function getWeather(city) {
    weatherResult.innerHTML = `<p style="color:gray;">Loading weather...</p>`;
    try {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        if (!res.ok) throw new Error("City not found");
        const data = await res.json();
        weatherResult.innerHTML = `
      <div class="weather-card">
        <h3>${data.name}, ${data.sys.country}</h3>
        <div class="weather-main">
          <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="${data.weather[0].description}">
          <div class="weather-temp">${Math.round(data.main.temp)}°C</div>
        </div>
        <p class="weather-desc">${capitalizeFirstLetter(data.weather[0].description)}</p>
        <div class="weather-extra">
          <span>💧 ${data.main.humidity}% Humidity</span>
          <span>💨 ${data.wind.speed} m/s Wind</span>
        </div>
      </div>
    `;
    } catch (err) {
        weatherResult.innerHTML = `<p style="color:red;">${err.message}</p>`;
    }
}

// ==========================
// Fetch Photos
// ==========================
async function getPhotos(city) {
    photoGrid.innerHTML = `<p style="color:gray;">Loading photos...</p>`;
    try {
        const res = await fetch(
            `https://api.unsplash.com/search/photos?query=${city}&per_page=6&client_id=${UNSPLASH_ACCESS_KEY}`
        );
        const data = await res.json();
        if (!data.results || data.results.length === 0) {
            photoGrid.innerHTML = `<p style="color:red;">No photos found.</p>`;
            return;
        }
        photoGrid.innerHTML = "";
        data.results.forEach((photo) => {
            const img = document.createElement("img");
            img.src = photo.urls.small;
            img.alt = photo.alt_description || city;
            img.classList.add("photo-item");
            img.loading = "lazy";
            photoGrid.appendChild(img);
        });
    } catch (err) {
        photoGrid.innerHTML = `<p style="color:red;">${err.message}</p>`;
    }
}

// ==========================
// Fetch City Info (Wikipedia)
// ==========================
async function getCityInfo(city) {
    cityInfoDiv.innerHTML = `<p style="color:gray;">Loading city info...</p>`;
    try {
        const summaryRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`
        );
        const summaryData = await summaryRes.json();
        const attractionsRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(city + " tourist attractions")}&limit=5&namespace=0&format=json&origin=*`
        );
        const attractionsData = await attractionsRes.json();

        let attractionsList = "";
        if (attractionsData[1] && attractionsData[1].length > 0) {
            attractionsList = `<ul class="attractions-list">` +
                attractionsData[1].map((place, i) =>
                    `<li><a href="${attractionsData[3][i]}" target="_blank">${place}</a></li>`
                ).join("") +
                `</ul>`;
        } else {
            attractionsList = "<p>No attractions found.</p>";
        }

        cityInfoDiv.innerHTML = `
      <div class="city-card">
        <h3>About ${ summaryData.title }</h3>
        <p>${ summaryData.extract || "No description available."}</p>
        <h4>Top Places to Visit:</h4>
        ${ attractionsList }
      </div>
    `;
    } catch (err) {
        console.error("City info error:", err);
        cityInfoDiv.innerHTML = `<p style="color:red;">Could not load city info.</p>`;
    }
}

// ==========================
// Fetch Blogs / News (NewsAPI)
// ==========================
async function getCityBlogs(city) {
    cityBlogsDiv.innerHTML = `<p style="color:gray;">Loading blogs/news...</p>`;
    try {
        const res = await fetch(
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(city)}&pageSize=5&apiKey=${NEWSAPI_KEY}`
        );
        const data = await res.json();
        if (!data.articles || data.articles.length === 0) {
            cityBlogsDiv.innerHTML = `<p>No recent blogs/news found for ${city}.</p>`;
            return;
        }
        cityBlogsDiv.innerHTML = data.articles.map(article => `
      <div class="blog-card">
        <a href="${article.url}" target="_blank">
          <h4>${article.title}</h4>
        </a>
        <p>${article.description || ""}</p>
        <small>Source: ${article.source.name} · ${new Date(article.publishedAt).toLocaleDateString()}</small>
      </div>
    `).join("");
    } catch (err) {
        console.error("News API error:", err);
        cityBlogsDiv.innerHTML = `<p style="color:red;">Could not load blogs/news.</p>`;
    }
}

// ==========================
// Helper: Capitalize First Letter
// ==========================
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// ==========================
// Search Handler
// ==========================
searchForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const city = searchInput.value.trim();
    if (city) {
        getWeather(city);
        getPhotos(city);
        getCityInfo(city);
        getCityBlogs(city);
    }
});
