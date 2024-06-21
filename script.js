let map;
let currentLocation;
let markers = [];
let inputForm = document.getElementById('inputForm');
let currentMarkerId = null;

const CLIENT_ID = '804290644688-omr0p98vsiij9lu2hd74ri47no7kpo6s.apps.googleusercontent.com';
const API_KEY = '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';
const SPREADSHEET_ID = '1ZBvOjWsrj56JbJlAmI72G1h-w1LeJAzT3dxGya8w9uI';

const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

function loadGapi() {
    gapi.load('client:auth2', initClient);
}

function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
    }).then(() => {
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    }, (error) => {
        console.log(JSON.stringify(error, null, 2));
    });
}

function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        refreshMarkers();
    } else {
        gapi.auth2.getAuthInstance().signIn();
    }
}

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 35.728611, lng: 139.710278 }, // 池袋駅の座標
        zoom: 7
    });

    map.addListener('click', (event) => {
        currentLocation = event.latLng;
        showInputForm(event.pixel);
    });

    loadGapi();
}

function showInputForm(pixel) {
    const now = new Date();
    const timestamp = (now.getMonth() + 1) + '/' + now.getDate() + ' ' + now.getHours() + ':' + now.getMinutes();
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

    if (currentMarkerId !== null) {
        const markerData = {
            id: currentMarkerId,
            lat: currentLocation.lat(),
            lng: currentLocation.lng(),
            timestamp: timestamp,
            nickname: nickname,
            count: count,
            tag: tag
        };
        updateMarker(markerData);
    } else {
        fetchRowCount().then(rowCount => {
            const markerData = {
                id: rowCount + 1,
                lat: currentLocation.lat(),
                lng: currentLocation.lng(),
                timestamp: timestamp,
                nickname: nickname,
                count: count,
                tag: tag
            };
            addMarker(markerData);
        });
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

function updateMarker(data) {
    const marker = markers.find(m => m.data.id === data.id);
    marker.setPosition({ lat: data.lat, lng: data.lng });
    marker.setIcon(getMarkerIcon(getColorByTag(data.tag)));

    marker.addListener('click', () => {
        showInfoWindow(marker, data);
    });

    updateSheet(data.id, data);
}

function showInfoWindow(marker, data) {
    const contentString = `
        <div>
            <h3>${data.nickname}</h3>
            <p>時刻: ${data.timestamp}</p>
            <p>枚数: ${data.count}</p>
            <p>タグ: ${data.tag}</p>
            <button onclick="editMarker(${data.id})">編集</button>
        </div>
    `;

    const infowindow = new google.maps.InfoWindow({
        content: contentString
    });

    infowindow.open(map, marker);
}

function editMarker(id) {
    const markerData = markers.find(m => m.data.id === id).data;
    currentLocation = { lat: markerData.lat, lng: markerData.lng };
    currentMarkerId = id;

    document.getElementById('timestamp').value = markerData.timestamp;
    document.getElementById('nickname').value = markerData.nickname;
    document.getElementById('count').value = markerData.count;
    document.getElementById('tag').value = markerData.tag;

    const pixel = map.getProjection().fromLatLngToPoint(new google.maps.LatLng(currentLocation.lat, currentLocation.lng));
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
        path: 'M 0,-48 14,-14 47,-14 23,7 29,40 0,20 -29,40 -23,7 -47,-14 -14,-14 Z',
        fillColor: color,
        fillOpacity: 0.8,
        strokeWeight: 1,
        scale: 1.5
    };
}

function saveToSheet(data) {
    gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:F',
        valueInputOption: 'RAW',
        resource: {
            values: [[data.id, data.lat, data.lng, data.nickname, data.count, data.tag]]
        }
    }).then((response) => {
        console.log(response);
    }, (error) => {
        console.error(error);
    });
}

function updateSheet(id, data) {
    gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!A${parseInt(id) + 1}:F${parseInt(id) + 1}`,
        valueInputOption: 'RAW',
        resource: {
            values: [[id, data.lat, data.lng, data.nickname, data.count, data.tag]]
        }
    }).then((response) => {
        console.log(response);
    }, (error) => {
        console.error(error);
    });
}

function refreshMarkers() {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:F',
    }).then(response => {
        const rows = response.result.values;
        markers.forEach(marker => marker.setMap(null));
        markers = [];
        rows.forEach((row, index) => {
            const markerData = {
                id: row[0],
                lat: parseFloat(row[1]),
                lng: parseFloat(row[2]),
                timestamp: row[3],
                nickname: row[4],
                count: row[5],
                tag: row[6]
            };
            addMarker(markerData);
        });
    }, (error) => {
        console.error(error);
    });
}

function fetchRowCount() {
    return gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:A',
    }).then(response => {
        const rows = response.result.values;
        return rows ? rows.length : 0;
    });
}
