let map;
let currentLocation;
let markers = [];
let inputForm = document.getElementById('inputForm');
let currentMarkerId = null;

const API_KEY = 'YOUR_API_KEY';
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -25.344, lng: 131.036 },
        zoom: 4
    });

    map.addListener('click', (event) => {
        currentLocation = event.latLng;
        showInputForm(event.pixel);
    });

    // 初回読み込み時にスプレッドシートからマーカーを読み込む
    refreshMarkers();
}

function showInputForm(pixel) {
    const now = new Date();
    const timestamp = now.getMonth() + 1 + '/' + now.getDate() + ' ' + now.getHours() + ':' + now.getMinutes();
    document.getElementById('timestamp').value = timestamp;

    inputForm.style.left = pixel.x + 'px';
    inputForm.style.top = pixel.y + 'px';
    inputForm.style.display = 'block';
}

function cancelForm() {
    inputForm.style.display = 'none';
    currentMarkerId = null;
}

function saveData() {
    const timestamp = document.getElementById('timestamp').value;
    const nickname = document.getElementById('nickname').value;
    const count = document.getElementById('count').value;
    const tag = document.getElementById('tag').value;

    const markerData = {
        id: currentMarkerId !== null ? currentMarkerId : markers.length + 1,
        lat: currentLocation.lat(),
        lng: currentLocation.lng(),
        nickname: nickname,
        count: count,
        tag: tag
    };

    if (currentMarkerId !== null) {
        updateMarker(currentMarkerId, markerData);
    } else {
        addMarker(markerData);
    }

    inputForm.style.display = 'none';
    currentMarkerId = null;
}

function addMarker(data) {
    const color = getColorByTag(data.tag);
    const marker = new google.maps.Marker({
        position: { lat: data.lat, lng: data.lng },
        map: map,
        icon: getMarkerIcon(color)
    });

    marker.addListener('click', () => {
        showInfoWindow(marker, data);
    });

    markers.push(marker);

    saveToSheet(data);
}

function updateMarker(id, data) {
    const marker = markers[id];
    marker.setPosition({ lat: data.lat, lng: data.lng });
    marker.setIcon(getMarkerIcon(getColorByTag(data.tag)));

    marker.addListener('click', () => {
        showInfoWindow(marker, data);
    });

    updateSheet(id, data);
}

function showInfoWindow(marker, data) {
    const contentString = `
        <div>
            <h3>${data.nickname}</h3>
            <p>時刻: ${data.timestamp}</p>
            <p>枚数: ${data.count}</p>
            <p>タグ: ${data.tag}</p>
            <button onclick="editMarker(${markers.indexOf(marker)})">編集</button>
        </div>
    `;

    const infowindow = new google.maps.InfoWindow({
        content: contentString
    });

    infowindow.open(map, marker);
}

function editMarker(id) {
    const marker = markers[id];
    const position = marker.getPosition();
    const latLng = { lat: position.lat(), lng: position.lng() };
    currentLocation = latLng;
    currentMarkerId = id;

    const data = getMarkerDataFromSheet(id);

    document.getElementById('timestamp').value = data.timestamp;
    document.getElementById('nickname').value = data.nickname;
    document.getElementById('count').value = data.count;
    document.getElementById('tag').value = data.tag;

    const pixel = map.getProjection().fromLatLngToPoint(currentLocation);
    showInputForm({ x: pixel.x, y: pixel.y });
}

function getColorByTag(tag) {
    switch (tag) {
        case '完了':
            return 'red';
        case '予定':
            return 'blue';
        case '不可':
            return 'gray';
        default:
            return 'black';
    }
}

function getMarkerIcon(color) {
    return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.6,
        strokeWeight: 0,
        scale: 10
    };
}

function saveToSheet(data) {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:F:append?valueInputOption=RAW&key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            values: [[data.id, data.lat, data.lng, data.nickname, data.count, data.tag]]
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function updateSheet(id, data) {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A${parseInt(id) + 1}:F${parseInt(id) + 1}?valueInputOption=RAW&key=${API_KEY}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            values: [[id, data.lat, data.lng, data.nickname, data.count, data.tag]]
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function refreshMarkers() {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:F?key=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            const rows = data.values;
            markers.forEach(marker => marker.setMap(null));
            markers = [];
            rows.forEach((row, index) => {
                const markerData = {
                    id: row[0],
                    lat: parseFloat(row[1]),
                    lng: parseFloat(row[2]),
                    nickname: row[3],
                    count: row[4],
                    tag: row[5]
                };
                addMarker(markerData);
            });
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}
