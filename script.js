const spreadsheetId = '1ZBvOjWsrj56JbJlAmI72G1h-w1LeJAzT3dxGya8w9uI';
const sheetName = 'Sheet1';
const apiKey = 'AIzaSyBgSr0GH7RWsWcu5hR3ehk5P5ssyHzRLI0';
const clientId = '804290644688-godfemc6ue7b06p9e5oqt2fhj2pgqnh0.apps.googleusercontent.com';
const clientSecret = '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';
const refreshToken = '1//0eB4LQQg3jSGRCgYIARAAGA4SNwF-L9Irsju_WwAkECjqOOiJukwNnQZvzvKh4xQyAL9-bvFGzUFCStH826eaNBh36m1KhbrNXqQ';
const size = 1 / 50000000
const pow = 8

let map;
let markers = [];
let currentMarker = null;
let editingPin = null;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 35.681236, lng: 139.767125 },
        zoom: 10,
    });

    map.addListener('click', (event) => {
        const latLng = event.latLng;
        showForm(latLng);
    });

    document.getElementById('cancel-button').addEventListener('click', cancelForm);

    map.addListener('zoom_changed', () => {
        updateMarkerScale();
    });

    document.getElementById('update-button').addEventListener('click', () => {
        loadPins();
    });

    document.getElementById('submit-button').addEventListener('click', savePin);
    document.getElementById('cancel-button').addEventListener('click', hideForm);

    loadPins();
}

function updateMarkerScale() {
    const zoomLevel = map.getZoom();
    const scale = zoomLevel ** pow * size; // 基本スケール値をズームレベルに合わせて調整


    markers.forEach(marker => {
        const icon = marker.getIcon();
        icon.scale = scale;
        console.log(scale)
        marker.setIcon(icon);
    });
}

function cancelForm() {
    hideForm();
    if (currentMarker) {
        currentMarker.setMap(null);
        currentMarker = null;
    }
}


function showForm(latLng) {
    const form = document.getElementById('form');
    const now = new Date();
    const year = now.getFullYear();
    const month = ('0' + (now.getMonth() + 1)).slice(-2);
    const day = ('0' + now.getDate()).slice(-2);
    const hours = ('0' + now.getHours()).slice(-2);
    const minutes = ('0' + now.getMinutes()).slice(-2);
    const seconds = ('0' + now.getSeconds()).slice(-2);
    const milliseconds = ('00' + now.getMilliseconds()).slice(-3);
    const time = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}:${milliseconds}`;

    document.getElementById('time').value = time;
    form.style.display = 'block';
    form.style.left = `${latLng.x}px`;
    form.style.top = `${latLng.y}px`;
    form.dataset.lat = latLng.lat();
    form.dataset.lng = latLng.lng();

    // 仮のピンを追加
    if (currentMarker) {
        currentMarker.setMap(null);
    }
    currentMarker = new google.maps.Marker({
        position: latLng,
        map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: 'gray',
            fillOpacity: 0.6,
            strokeWeight: 0,
            scale: 10
        }
    });

    editingPin = null;
}

function hideForm() {
    document.getElementById('form').style.display = 'none';
    //currentMarker = null;
}

async function getAccessToken() {
    const url = "https://www.googleapis.com/oauth2/v4/token";
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    const body = new URLSearchParams({
        'refresh_token': refreshToken,
        'client_id': clientId,
        'client_secret': clientSecret,
        'grant_type': 'refresh_token',
        'redirect_uri': 'http://localhost:8080'
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body.toString()
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function savePin() {
    const time = document.getElementById('time').value;
    const nickname = '';
    const count = '';
    const tag = document.getElementById('tag').value;
    const lat = document.getElementById('form').dataset.lat;
    const lng = document.getElementById('form').dataset.lng;

    const color = tag === '完了' ? 'red' : tag === '予定' ? 'blue' : 'gray';

    const zoomLevel = map.getZoom();
    const scale = zoomLevel ** pow * size; // 基本スケール値をズームレベルに合わせて調整

    if (editingPin) {
        // Update existing marker
        editingPin.setIcon({
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 0.6,
            strokeWeight: 0,
            scale: scale
        });
        editingPin.setTitle(nickname);

        await updatePinInSheet(time, lat, lng, nickname, count, tag);
    } else {
        // Create new marker
        const marker = new google.maps.Marker({
            position: { lat: parseFloat(lat), lng: parseFloat(lng) },
            map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 0.6,
                strokeWeight: 0,
                scale: scale
            },
            title: nickname
        });

        marker.addListener('click', () => {
            showPinInfo(marker, { time, nickname, count, tag });
        });

        markers.push(marker);

        const accessToken = await getAccessToken();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        };
        const body = {
            values: [[time, lat, lng, nickname, count, tag]]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error('Failed to save pin to spreadsheet');
            }

            hideForm();
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

async function updatePinInSheet(time, lat, lng, nickname, count, tag) {
    const accessToken = await getAccessToken();
    const range = `${sheetName}!A1:F`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();

        if (!data.values) {
            throw new Error('No data found in spreadsheet');
        }

        const rowIndex = data.values.findIndex(row => row[0] === time);

        if (rowIndex !== -1) {
            const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A${rowIndex + 1}:F${rowIndex + 1}?valueInputOption=USER_ENTERED`;
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            };
            const body = {
                values: [[time, lat, lng, nickname, count, tag]]
            };

            const updateResponse = await fetch(updateUrl, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!updateResponse.ok) {
                throw new Error('Failed to update pin in spreadsheet');
            }

            hideForm();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function showPinInfo(marker, data) {
    const infoWindowContent = `
        <div>
            <p>時刻: ${data.time}</p>
            <p>タグ: ${data.tag}</p>
            <button onclick="editPin('${data.time}', ${marker.getPosition().lat()}, ${marker.getPosition().lng()})">編集</button>
            <button onclick="deletePin('${data.time}', ${marker.getPosition().lat()}, ${marker.getPosition().lng()})">削除</button>
        </div>
    `;
    //<! -- 
    const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent
    });
    infoWindow.open(map, marker);
}

async function editPin(time, lat, lng, nickname, count, tag) {
    document.getElementById('time').value = time;
    //document.getElementById('nickname').value = "";
    //document.getElementById('count').value = "";
    document.getElementById('tag').value = tag;

    const form = document.getElementById('form');
    form.style.display = 'block';
    form.dataset.lat = lat;
    form.dataset.lng = lng;

    editingPin = markers.find(marker => marker.getPosition().lat() === parseFloat(lat) && marker.getPosition().lng() === parseFloat(lng));
}   

async function deletePin(time, lat, lng) {
    const accessToken = await getAccessToken();
    const range = `${sheetName}!A1:F`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

    try {
        const response = await fetch(url, {
            //method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await response.json();
        const rowIndex = data.values.findIndex(row => row[0] === time && parseFloat(row[1]) === parseFloat(lat) && parseFloat(row[2]) === parseFloat(lng));

        if (rowIndex !== -1) {
            const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A${rowIndex + 1}:F${rowIndex + 1}:clear`;
            const deleteResponse = await fetch(deleteUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (deleteResponse.ok) {
                const markerIndex = markers.findIndex(marker => marker.getPosition().lat() === parseFloat(lat) && marker.getPosition().lng() === parseFloat(lng));
                if (markerIndex !== -1) {
                    markers[markerIndex].setMap(null);
                    markers.splice(markerIndex, 1);
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadPins() {
    const accessToken = await getAccessToken();
    const range = `${sheetName}!A1:F`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();

        if (data.values && data.values.length > 1) {
            markers.forEach(marker => marker.setMap(null));
            markers = [];

            const zoomLevel = map.getZoom();
            const scale = zoomLevel ** pow * size; // 基本スケール値をズームレベルに合わせて調整

            for (let i = 1; i < data.values.length; i++) {
                const row = data.values[i];
                const [time, lat, lng, nickname, count, tag] = row;
                const color = tag === '完了' ? 'red' : tag === '予定' ? 'blue' : 'gray';

                const marker = new google.maps.Marker({
                    position: { lat: parseFloat(lat), lng: parseFloat(lng) },
                    map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: color,
                        fillOpacity: 0.6,
                        strokeWeight: 0,
                        scale: scale
                    },
                    title: nickname
                });

                marker.addListener('click', () => {
                    showPinInfo(marker, { time, nickname, count, tag });
                });

                markers.push(marker);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

window.onload = initMap;
