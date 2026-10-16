
 // Seleção de elementos do DOM
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const currentTempEl = document.getElementById('current-temp');
const feelsLikeEl = document.getElementById('feels-like');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const precipitationEl = document.getElementById('precipitation');

// Seletores do menu avançado de unidades
const tempUnitSelect = document.getElementById('temp-unit');
const windUnitSelect = document.getElementById('wind-unit');
const precipUnitSelect = document.getElementById('precip-unit');

const dailyListEl = document.getElementById('daily-list');
const hourlyListEl = document.getElementById('hourly-list');

// Variáveis para guardar a última localização pesquisada
let currentLat = -15.7801;
let currentLon = -47.9292;
let currentCityName = 'Brasília';
let currentCountryName = 'Brasil';

// Evita que respostas antigas sobrescrevam pesquisas mais recentes
let weatherRequestId = 0;

// Carregar Brasília por padrão ao iniciar a página
window.addEventListener('DOMContentLoaded', () => {
    getWeatherDataByCoords(
        currentLat,
        currentLon,
        currentCityName,
        currentCountryName
    );
});

// Eventos de pesquisa
if (searchBtn) {
    searchBtn.addEventListener('click', () => {
        const query = cityInput ? cityInput.value.trim() : '';

        if (query) {
            searchCity(query);
        }
    });
}

if (cityInput) {
    cityInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            const query = cityInput.value.trim();

            if (query) {
                searchCity(query);
            }
        }
    });
}

// Atualizar dados ao alterar qualquer unidade
[tempUnitSelect, windUnitSelect, precipUnitSelect].forEach(select => {
    if (select) {
        select.addEventListener('change', () => {
            getWeatherDataByCoords(
                currentLat,
                currentLon,
                currentCityName,
                currentCountryName
            );
        });
    }
});

// Função para procurar cidade por nome
async function searchCity(cityName) {
    try {
        const url = new URL(
            'https://geocoding-api.open-meteo.com/v1/search'
        );

        url.search = new URLSearchParams({
            name: cityName,
            count: '1',
            language: 'pt',
            format: 'json'
        }).toString();

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Erro na geocodificação: HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            alert('Localização não encontrada!');
            return;
        }

        const {
            latitude,
            longitude,
            name,
            country
        } = data.results[0];

        // Atualizar a localização atual
        currentLat = latitude;
        currentLon = longitude;
        currentCityName = name;
        currentCountryName = country || 'Brasil';

        await getWeatherDataByCoords(
            currentLat,
            currentLon,
            currentCityName,
            currentCountryName
        );

    } catch (error) {
        console.error('Erro na geocodificação:', error);
        alert('Não foi possível pesquisar a cidade. Tente novamente.');
    }
}

// Função principal para buscar dados meteorológicos
async function getWeatherDataByCoords(
    lat,
    lon,
    cityName,
    countryName
) {
    const requestId = ++weatherRequestId;

    try {
        const tempUnit = tempUnitSelect
            ? tempUnitSelect.value
            : 'celsius';

        const windUnit = windUnitSelect
            ? windUnitSelect.value
            : 'kmh';

        const precipUnit = precipUnitSelect
            ? precipUnitSelect.value
            : 'mm';

        // Montar a URL com parâmetros válidos da Open-Meteo
        const url = new URL(
            'https://api.open-meteo.com/v1/forecast'
        );

        const params = {
            latitude: String(lat),
            longitude: String(lon),

            current: [
                'temperature_2m',
                'relative_humidity_2m',
                'apparent_temperature',
                'precipitation',
                'wind_speed_10m'
            ].join(','),

            // "time" não deve ser incluído na lista de variáveis.
            // A API retorna os horários automaticamente.
            daily: [
                'temperature_2m_max',
                'temperature_2m_min'
            ].join(','),

            hourly: 'temperature_2m',

            temperature_unit:
                tempUnit === 'fahrenheit'
                    ? 'fahrenheit'
                    : 'celsius',

            wind_speed_unit:
                windUnit === 'mph'
                    ? 'mph'
                    : 'kmh',

            precipitation_unit:
                precipUnit === 'inch'
                    ? 'inch'
                    : 'mm',

            timezone: 'auto',
            forecast_days: '7'
        };

        url.search = new URLSearchParams(params).toString();

        const response = await fetch(url);

        if (!response.ok) {
            const errorDetails = await response.text();

            throw new Error(
                `Erro na API: HTTP ${response.status}. ${errorDetails}`
            );
        }

        const data = await response.json();

        // Ignorar respostas de pesquisas anteriores
        if (requestId !== weatherRequestId) {
            return;
        }

        if (!data.current || !data.daily || !data.hourly) {
            throw new Error(
                'A API não retornou todos os dados meteorológicos esperados.'
            );
        }

        // Atualizar o nome da cidade
        if (cityNameEl) {
            cityNameEl.textContent = `${cityName}, ${countryName}`;
        }

        // Usar o horário local informado pela API
        if (currentDateEl) {
            const localTime = data.current.time;
            const datePart = localTime.split('T')[0];
            const [year, month, day] = datePart.split('-').map(Number);

            // Meio-dia evita problemas de mudança de dia por fuso horário
            const localDate = new Date(year, month - 1, day, 12);

            currentDateEl.textContent = localDate.toLocaleDateString(
                'pt-BR',
                {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                }
            );
        }

        // Símbolos das unidades
        const tempSymbol =
            tempUnit === 'fahrenheit' ? '°F' : '°C';

        const speedSymbol =
            windUnit === 'mph' ? ' mph' : ' km/h';

        const precipSymbol =
            precipUnit === 'inch' ? ' in' : ' mm';

        // Valores atuais
        const current = data.current;

        if (currentTempEl) {
            currentTempEl.textContent =
                `${Math.round(current.temperature_2m)}${tempSymbol}`;
        }

        if (feelsLikeEl) {
            feelsLikeEl.textContent =
                `${Math.round(current.apparent_temperature)}${tempSymbol}`;
        }

        if (humidityEl) {
            humidityEl.textContent =
                `${current.relative_humidity_2m}%`;
        }

        if (windSpeedEl) {
            windSpeedEl.textContent =
                `${Math.round(current.wind_speed_10m)}${speedSymbol}`;
        }

        if (precipitationEl) {
            const precipValue = Number(current.precipitation ?? 0);

            precipitationEl.textContent =
                `${precipValue.toFixed(1)}${precipSymbol}`;
        }

        // Renderizar previsão diária
        renderDailyForecast(data.daily, tempSymbol);

        // Renderizar previsão horária
        renderHourlyForecast(data.hourly, tempSymbol, current.time);

    } catch (error) {
        // Não mostrar erros de solicitações que já ficaram obsoletas
        if (requestId !== weatherRequestId) {
            return;
        }

        console.error('Erro ao buscar dados do tempo:', error);
    }
}

// Renderizar previsão diária
function renderDailyForecast(daily, tempSymbol) {
    if (!dailyListEl) return;

    dailyListEl.innerHTML = '';

    const totalDays = Math.min(
        7,
        daily.time.length,
        daily.temperature_2m_max.length,
        daily.temperature_2m_min.length
    );

    for (let i = 0; i < totalDays; i++) {
        const [year, month, day] = daily.time[i]
            .split('-')
            .map(Number);

        const date = new Date(year, month - 1, day, 12);

        const dayName = date.toLocaleDateString('pt-BR', {
            weekday: 'short'
        });

        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);

        const card = document.createElement('div');
        card.className = 'daily-card';

        const dayEl = document.createElement('span');
        dayEl.textContent = dayName;

        const maxEl = document.createElement('strong');
        maxEl.textContent = `${maxTemp}${tempSymbol}`;

        const minEl = document.createElement('small');
        minEl.textContent = `${minTemp}${tempSymbol}`;

        card.append(dayEl, maxEl, minEl);
        dailyListEl.appendChild(card);
    }
}

// Renderizar previsão horária
function renderHourlyForecast(hourly, tempSymbol, currentTime) {
    if (!hourlyListEl) return;

    hourlyListEl.innerHTML = '';

    // Os horários retornados pela API estão no fuso da cidade.
    // Comparar as strings evita depender do fuso do navegador.
    let startIdx = hourly.time.findIndex(
        time => time >= currentTime
    );

    if (startIdx === -1) {
        startIdx = 0;
    }

    const endIdx = Math.min(
        startIdx + 12,
        hourly.time.length,
        hourly.temperature_2m.length
    );

    for (let i = startIdx; i < endIdx; i++) {
        const timeString = hourly.time[i].split('T')[1];

        const temp = Math.round(hourly.temperature_2m[i]);

        const item = document.createElement('div');
        item.className = 'hourly-item';

        const timeEl = document.createElement('span');
        timeEl.textContent = timeString.slice(0, 5);

        const tempEl = document.createElement('strong');
        tempEl.textContent = `${temp}${tempSymbol}`;

        item.append(timeEl, tempEl);
        hourlyListEl.appendChild(item);
    }
}

// Abrir/fechar o menu flutuante de unidades
const unitsBtn = document.getElementById('units-btn');
const unitsMenu = document.getElementById('units-menu');

if (unitsBtn && unitsMenu) {
    unitsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        unitsMenu.classList.toggle('hidden');
    });

    window.addEventListener('click', () => {
        if (!unitsMenu.classList.contains('hidden')) {
            unitsMenu.classList.add('hidden');
        }
    });

    unitsMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}
