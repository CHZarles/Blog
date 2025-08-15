// 获取今日天气（基于IP定位）并显示到 Quick Stats

// 天气状况转emoji
function weatherToEmoji(desc) {
    desc = desc.toLowerCase();
    if (desc.includes('sun') || desc.includes('晴')) return '☀️';
    if (desc.includes('cloud') || desc.includes('阴') || desc.includes('多云')) return '☁️';
    if (desc.includes('rain') || desc.includes('雨')) return '🌧️';
    if (desc.includes('thunder') || desc.includes('雷')) return '⛈️';
    if (desc.includes('snow') || desc.includes('雪')) return '❄️';
    if (desc.includes('fog') || desc.includes('雾')) return '🌫️';
    if (desc.includes('wind') || desc.includes('风')) return '💨';
    if (desc.includes('mist') || desc.includes('霾')) return '🌫️';
    return '🌡️';
}

function fetchAndDisplayWeather() {
    const weatherEl = document.getElementById('weather-stat');
    if (!weatherEl) return;
    fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(loc => {
            if (!loc || !loc.city) throw new Error('无法获取定位');
            const city = loc.city;
            const country = loc.country_name || '';
            return fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%C+%t`)
                .then(res => res.text())
                .then(weather => {
                    // weather like "Partly cloudy +28°C"
                    const match = weather.match(/^([^+]+)\s*([+\-]?[0-9]+°C)?/);
                    let desc = weather, temp = '';
                    if (match) {
                        desc = match[1].trim();
                        temp = match[2] ? match[2].trim() : '';
                    }
                    const emoji = weatherToEmoji(desc);
                    weatherEl.innerHTML = `<svg viewBox=\"0 0 20 20\" fill=\"currentColor\" style=\"vertical-align:-2px;width:1.1em;height:1.1em;\"><path d='M6.995 12a5 5 0 119.9 0A4 4 0 1110 18a4 4 0 01-3.005-6z'/></svg>${city}：${emoji} ${desc}${temp}`;
                });
        })
        .catch(() => {
            weatherEl.innerHTML = `<svg viewBox=\"0 0 20 20\" fill=\"currentColor\" style=\"vertical-align:-2px;width:1.1em;height:1.1em;\"><path d='M6.995 12a5 5 0 119.9 0A4 4 0 1110 18a4 4 0 01-3.005-6z'/></svg>今日天气获取失败`;
        });
}

document.addEventListener('DOMContentLoaded', function() {
    fetchAndDisplayWeather();
});
