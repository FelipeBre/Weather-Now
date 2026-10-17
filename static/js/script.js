
(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    const cityInput = $("city-input");
    const searchForm = $("search-form");
    const errorMessage = $("error-message");

    const tempUnit = $("temp-unit");
    const windUnit = $("wind-unit");
    const precipUnit = $("precip-unit");

    const unitsBtn = $("units-btn");
    const unitsMenu = $("units-menu");
    const daySelect = $("day-select");

    let latitude = -15.7801;
    let longitude = -47.9292;
    let city = "Brasília";
    let country = "Brasil";

    let requestId = 0;
    let weatherData = null;

    document.addEventListener("DOMContentLoaded", () => {
        loadWeather();
    });

    // Menu de unidades
    unitsBtn.addEventListener("click", event => {
        event.stopPropagation();

        unitsMenu.classList.toggle("hidden");

        unitsBtn.setAttribute(
            "aria-expanded",
            String(!unitsMenu.classList.contains("hidden"))
        );
    });

    document.addEventListener("click", event => {
        if (
            !unitsMenu.contains(event.target) &&
            event.target !== unitsBtn
        ) {
            unitsMenu.classList.add("hidden");
            unitsBtn.setAttribute("aria-expanded", "false");
        }
    });

    // Pesquisa de cidade
    searchForm.addEventListener("submit", async event => {
        event.preventDefault();

        const query = cityInput.value.trim();

        if (!query) return;

        showError("");

        try {
            const url = new URL(
                "https://geocoding-api.open-meteo.com/v1/search"
            );

            url.search = new URLSearchParams({
                name: query,
                count: "1",
                language: "pt",
                format: "json"
            });

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("Erro ao pesquisar cidade.");
            }

            const result = await response.json();

            if (!result.results || !result.results.length) {
                showError("Cidade não encontrada.");
                return;
            }

            const place = result.results[0];

            latitude = place.latitude;
            longitude = place.longitude;
            city = place.name;
            country = place.country || "";

            await loadWeather();

        } catch (error) {
            console.error(error);
            showError(
                "Não foi possível pesquisar a cidade. Tente novamente."
            );
        }
    });

    // Atualizar dados ao trocar as unidades
    [tempUnit, windUnit, precipUnit].forEach(select => {
        select.addEventListener("change", loadWeather);
    });

    // Seleção do dia na previsão horária
    daySelect.addEventListener("change", () => {
        if (weatherData) {
            renderHourly(weatherData);
        }
    });

    async function loadWeather() {
        const id = ++requestId;

        showError("");

        try {
            const url = new URL(
                "https://api.open-meteo.com/v1/forecast"
            );

            url.search = new URLSearchParams({
                latitude: String(latitude),
                longitude: String(longitude),

                current:
                    "temperature_2m,relative_humidity_2m," +
                    "apparent_temperature,precipitation," +
                    "wind_speed_10m",

                daily:
                    "temperature_2m_max,temperature_2m_min",

                hourly: "temperature_2m",

                temperature_unit: tempUnit.value,
                wind_speed_unit: windUnit.value,
                precipitation_unit: precipUnit.value,

                timezone: "auto",
                forecast_days: "7"
            });

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("Erro ao carregar previsão.");
            }

            const data = await response.json();

            if (id !== requestId) return;

            if (!data.current || !data.daily || !data.hourly) {
                throw new Error("Dados meteorológicos incompletos.");
            }

            weatherData = data;

            updateCurrentWeather(data);
            renderDaily(data.daily);
            populateDays(data);
            renderHourly(data);

        } catch (error) {
            if (id !== requestId) return;

            console.error(error);

            showError(
                "Não foi possível carregar o tempo. " +
                "Verifique sua conexão e tente novamente."
            );
        }
    }

    function updateCurrentWeather(data) {
        const current = data.current;

        const temperatureSymbol =
            tempUnit.value === "fahrenheit" ? "°F" : "°C";

        const windSymbol =
            windUnit.value === "mph" ? " mph" : " km/h";

        const precipitationSymbol =
            precipUnit.value === "inch" ? " in" : " mm";

        $("city-name").textContent =
            [city, country].filter(Boolean).join(", ");

        const [year, month, day] =
            current.time.split("T")[0].split("-").map(Number);

        $("current-date").textContent =
            new Date(year, month - 1, day, 12)
                .toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                });

        $("current-temp").textContent =
            `${Math.round(current.temperature_2m)}${temperatureSymbol}`;

        $("feels-like").textContent =
            `${Math.round(current.apparent_temperature)}${temperatureSymbol}`;

        $("humidity").textContent =
            `${current.relative_humidity_2m}%`;

        $("wind-speed").textContent =
            `${Math.round(current.wind_speed_10m)}${windSymbol}`;

        $("precipitation").textContent =
            `${Number(current.precipitation ?? 0).toFixed(1)}${precipitationSymbol}`;
    }

    function renderDaily(daily) {
        const list = $("daily-list");
        list.replaceChildren();

        const symbol =
            tempUnit.value === "fahrenheit" ? "°F" : "°C";

        for (let i = 0; i < daily.time.length; i++) {
            const [year, month, day] =
                daily.time[i].split("-").map(Number);

            const date = new Date(year, month - 1, day, 12);

            const card = document.createElement("article");
            card.className = "daily-card";

            const dayName = document.createElement("span");
            dayName.textContent = i === 0
                ? "Hoje"
                : date.toLocaleDateString("pt-BR", {
                    weekday: "short"
                });

            const maximum = document.createElement("strong");
            maximum.textContent =
                `${Math.round(daily.temperature_2m_max[i])}${symbol}`;

            const minimum = document.createElement("small");
            minimum.textContent =
                `${Math.round(daily.temperature_2m_min[i])}${symbol}`;

            card.append(dayName, maximum, minimum);
            list.appendChild(card);
        }
    }

    function populateDays(data) {
        const select = daySelect;
        const dates = data.daily.time;
        const currentDate = data.current.time.split("T")[0];

        select.replaceChildren();

        dates.forEach((dateString, index) => {
            const option = document.createElement("option");
            option.value = String(index);

            if (dateString === currentDate) {
                option.textContent = "Hoje";
            } else {
                const [year, month, day] =
                    dateString.split("-").map(Number);

                option.textContent =
                    new Date(year, month - 1, day, 12)
                        .toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit"
                        });
            }

            select.appendChild(option);
        });

        select.value = String(
            Math.max(0, dates.indexOf(currentDate))
        );
    }

    function renderHourly(data) {
        const list = $("hourly-list");
        list.replaceChildren();

        const hourly = data.hourly;
        const currentTime = data.current.time;
        const currentDate = currentTime.split("T")[0];

        const selectedDate =
            data.daily.time[Number(daySelect.value)] || currentDate;

        const symbol =
            tempUnit.value === "fahrenheit" ? "°F" : "°C";

        let found = 0;

        hourly.time.forEach((time, index) => {
            if (!time.startsWith(selectedDate)) return;

            if (selectedDate === currentDate && time < currentTime) {
                return;
            }

            if (found >= 12) return;

            const item = document.createElement("div");
            item.className = "hourly-item";

            const hour = document.createElement("span");
            hour.textContent = time.split("T")[1].slice(0, 5);

            const temperature = document.createElement("strong");
            temperature.textContent =
                `${Math.round(hourly.temperature_2m[index])}${symbol}`;

            item.append(hour, temperature);
            list.appendChild(item);

            found++;
        });

        if (!found) {
            list.textContent = "Não há horários disponíveis.";
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
    }
})();
