const spreadsheetId = '1ZBvOjWsrj56JbJlAmI72G1h-w1LeJAzT3dxGya8w9uI';
const sheetIdPolygon = 175522008
const apiKey = 'AIzaSyBgSr0GH7RWsWcu5hR3ehk5P5ssyHzRLI0';
const clientId = '804290644688-godfemc6ue7b06p9e5oqt2fhj2pgqnh0.apps.googleusercontent.com';
const clientSecret = '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';
const refreshToken = '1//0eB4LQQg3jSGRCgYIARAAGA4SNwF-L9Irsju_WwAkECjqOOiJukwNnQZvzvKh4xQyAL9-bvFGzUFCStH826eaNBh36m1KhbrNXqQ';

const sheetName = 'Sheet1';
const sheetPolygon = 'Polygon'

const size = 1 / 50000000
const pow = 8
const zoomThreshold = 1; 

let map;
let markers = []
let Polygons = []

let currentMarker = null;
let currentPolygon = null;

let editingPin = null;
let editingPolygon = null;

let currentInfoWindow = null

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 35.681236, lng: 139.767125 },
        zoom: 10,
    });
    let lastZoomLevel = map.getZoom();

    map.addListener('click', (event) => {
        const latLng = event.latLng;
        if(currentInfoWindow){
            currentInfoWindow.close()
        }
        showForm(latLng);
    });

    map.addListener('zoom_changed', () => {
        const newZoomLevel = map.getZoom();
        //console.log(newZoomLevel)
        if (Math.abs(newZoomLevel - lastZoomLevel) >= zoomThreshold) {
            lastZoomLevel = newZoomLevel;
            const newScale = calculateScale(newZoomLevel);
            updateMarkerScale(newScale);
        }
    });

    document.getElementById('update-button').addEventListener('click', () => {
        loadPins();
        loadPolygon()
    });

    //Marker
    document.getElementById('cancel-button').addEventListener('click', cancelForm);
    document.getElementById('submit-button').addEventListener('click', savePin);
    //document.getElementById('cancel-button').addEventListener('click', hideForm);

    loadPins();
    loadPolygon()

    //Polygon
    document.getElementById('cancel-button-polygon').addEventListener('click', cancelFormPolygon);
    document.getElementById('submit-button-polygon').addEventListener('click', savePolygon);
    //document.getElementById('cancel-button').addEventListener('click', hideForm);

    // DrawingManagerの設定
    const drawingManager = new google.maps.drawing.DrawingManager({
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [google.maps.drawing.OverlayType.POLYGON],
      }, polygonOptions: polygonOntion("#800080")
    });
  
    drawingManager.setMap(map);

    google.maps.event.addListener(drawingManager,"polygoncomplete",(polygon) => {
        if(currentInfoWindow){
            currentInfoWindow.close()
        }
        if(editingPolygon){
            editingPolygon = null
        }
        currentPolygon = polygon
        showPolygonForm()
        //savePolygon(polygon);
    })

    //console.log(Polygons[0])
}

function polygonOntion(color){
    return {
        fillColor: color,// "#800080",
        fillOpacity: 0.2,
        strokeColor: color,//"#800080",
        strokeOpacity: 1,
        strokeWeight: 2,
        clickable: false,
        editable: false,
        zIndex: 1,
    }    
}
function calculateScale(zoomLevel) {
    return zoomLevel ** pow * size;
}

function updateMarkerScale(scale) {
    markers.forEach(marker => {
        const icon = marker.getIcon();
        icon.scale = scale;
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

function hideForm() {
    document.getElementById('form').style.display = 'none';
    if(currentInfoWindow){
        currentInfoWindow.close()
        currentInfoWindow = null
    
    }
}

function cancelFormPolygon(){
    hideFormPolygon();
    if(currentPolygon){
        currentPolygon.setMap(null)
        currentPolygon = null    
    }
}

function hideFormPolygon(){
    document.getElementById('formPolygon').style.display = 'none';
    if(currentInfoWindow){
        currentInfoWindow.close()
        currentInfoWindow = null    
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

function showPolygonForm(latLng) {
    let memo = document.getElementById('memoPolygon').value
    if(!memo){
        memo = ''
    }
    const form = document.getElementById('formPolygon');
    document.getElementById('timePolygon').value = new Date().toLocaleString('ja-JP');
    form.style.display = 'block';
}

async function savePin() {
    const time = document.getElementById('time').value;
    let memo = document.getElementById('memo').value;
    const count = '';
    const tag = document.getElementById('tag').value;
    const lat = document.getElementById('form').dataset.lat;
    const lng = document.getElementById('form').dataset.lng;
    if(!memo){
        memo = ''
    }

    const color = tag === '完了' ? 'purple' : tag === '予定' ? 'gray' : 'gray';

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
        editingPin.setTitle(memo);

        await updatePinInSheet(time, lat, lng, memo, count, tag);
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
            title: memo
        });

        marker.addListener('click', () => {
            if(currentInfoWindow){
                currentInfoWindow.close()
            }
            showPinInfo(marker, { time, memo, count, tag });
        });

        markers.push(marker);

        const accessToken = await getAccessToken();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        };
        const body = {
            values: [[time, lat, lng, memo, count, tag]]
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

async function savePolygon(){
    // フォームの値を取得
    let time = document.getElementById('timePolygon').value;
    let memo = document.getElementById('memoPolygon').value;
    let tag = document.getElementById('tagPolygon').value;
    if(!memo){
        memo = ''
    }

    if (editingPolygon) {
        // Update existing polygon
        if(tag == '完了'){
            editingPolygon.setOptions({
                fillColor: "purple",
                strokeColor: "purple"
            })
        } else {
            editingPolygon.setOptions({
                fillColor: "gray",
                strokeColor: "gray"
            })  
        }
        const rowIndex = Polygons.findIndex(row => row[0] === time);
        Polygons[rowIndex][1] = editingPolygon
        editingPolygon = null

        await updatePolygonInSheet(time, tag, memo);
    } else {

        let color = "purple"
        let coodArray = currentPolygon.getPath().getArray()
        if(tag == '予定'){
            color =  "gray"
        }
        const polygon = new google.maps.Polygon({
            paths: coodArray,
            strokeColor: color,
            strokeOpacity: 1,
            strokeWeight: 2,
            fillColor: color,
            fillOpacity: 0.2,
        })
        
        //currentPolygon.setMap(map)
        polygon.setMap(map)
        polygon.addListener('click', (event)=>{
            if(currentInfoWindow){
                currentInfoWindow.close()
            }
            showInfoWindowPolygon(polygon, {time,memo,tag}, event.latLng)
        }) 

        Polygons.push([time, polygon]);

        currentPolygon.setMap(null)
        currentPolygon = null

        // 多角形描画後の処理
        const singlePolygon = [];
    
        // サーバーサイドプログラムに渡す座標情報を用意
        for (const point of coodArray) {
            singlePolygon.push([point.lng(), point.lat()]);
        }
    
        // 最初の座標を加え多角形は閉じておく
        singlePolygon.push(singlePolygon[0]);
        let values = singlePolygon.join("&")
    
        const accessToken = await getAccessToken();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetPolygon}!A1:append?valueInputOption=USER_ENTERED`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        };
        const body = {
            values: [[time, values, tag, memo]]//values
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
    
            hideFormPolygon();
        } catch (error) {
            console.error('Error:', error);
        }
    } 
}

async function updatePinInSheet(time, lat, lng, memo, count, tag) {
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
                values: [[time, lat, lng, memo, count, tag]]
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

async function updatePolygonInSheet(time, tag, memo){
    const accessToken = await getAccessToken();
    const range = `${sheetPolygon}!A1:F`;
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
            const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetPolygon}!A${rowIndex + 1}:F${rowIndex + 1}?valueInputOption=USER_ENTERED`;
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            };
            const body = {
                values: [[time, data.values[rowIndex][1], tag, memo]]
            };

            const updateResponse = await fetch(updateUrl, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!updateResponse.ok) {
                throw new Error('Failed to update pin in spreadsheet');
            }

            hideFormPolygon();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function showPinInfo(marker, data) {
    const infoWindowContent = `
        <div>
            <p>時刻: ${data.time}</p>
            <p>メモ: ${data.memo}</p>
            <p>タグ: ${data.tag}</p>
            <button onclick="editPin('${data.time}', ${marker.getPosition().lat()}, ${marker.getPosition().lng()},'${data.memo}','${data.count}','${data.tag}')">編集</button>
            <button onclick="deletePin('${data.time}', ${marker.getPosition().lat()}, ${marker.getPosition().lng()})">削除</button>
        </div>
    `;
    
    const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent
    });
    currentInfoWindow = infoWindow
    currentInfoWindow.open(map, marker);
}

function showInfoWindowPolygon(polygon, data, latlng){
    const infoWindowContent = `
        <div>
            <p>時刻: ${data.time}</p>
            <p>メモ: ${data.memo}</p>
            <p>タグ: ${data.tag}</p>
            <button onclick="editPolygon('${data.time}', '${data.memo}', '${data.tag}')">編集</button>
            <button onclick="deletePolygon('${data.time}')">削除</button>
        </div>
    `;    
    const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent
    });
    currentInfoWindow = infoWindow
    currentInfoWindow.setPosition(latlng)
    currentInfoWindow.open(map, polygon);
}

async function editPin(time, lat, lng, memo, count, tag) {
    document.getElementById('time').value = time;
    document.getElementById('memo').value = memo;
    //document.getElementById('count').value = "";
    document.getElementById('tag').value = tag;

    const form = document.getElementById('form');
    form.style.display = 'block';
    form.dataset.lat = lat;
    form.dataset.lng = lng;

    editingPin = markers.find(marker => marker.getPosition().lat() === parseFloat(lat) && marker.getPosition().lng() === parseFloat(lng));
}

async function editPolygon(time, memo, tag){
    document.getElementById('timePolygon').value = time;
    document.getElementById('memoPolygon').value = memo;
    //document.getElementById('count').value = "";
    document.getElementById('tagPolygon').value = tag;

    const form = document.getElementById('formPolygon');
    form.style.display = 'block';

    let index = getIndexByKey(Polygons, time)
    editingPolygon = Polygons[index][1]
}

function getIndexByKey(array, key) {
    // array: 2次元配列
    // key: 検索するキー

    for (let i = 0; i < array.length; i++) {
        if (array[i][0] === key) {
            return i; // キーが見つかった場合、インデックスを返す
        }
    }
    return -1; // キーが見つからない場合、-1を返す
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
        const rowIndex = data.values.findIndex(row => row[0] === time);

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

async function deletePolygon(time) {
    const accessToken = await getAccessToken();
    const range = `${sheetPolygon}!A1:F`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

    try {
        const response = await fetch(url, {
            //method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await response.json();
        const rowIndex = data.values.findIndex(row => row[0] === time);

        if (rowIndex !== -1) {
            const requests = [{
                deleteDimension: {
                    range: {
                        sheetId: sheetIdPolygon,
                        dimension: 'ROWS',
                        startIndex: rowIndex, // 0-based index
                        endIndex: rowIndex + 1
                    }
                }
            }];
            const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
            const deleteResponse = await fetch(deleteUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify({ requests })
            });

            if (deleteResponse.ok) {
                const polygonIndex = Polygons.findIndex(row => row[0] === time);
                if (polygonIndex !== -1) {
                    Polygons[polygonIndex][1].setMap(null);
                    Polygons.splice(polygonIndex, 1);
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
                const [time, lat, lng, memo, count, tag] = row;
                const color = tag === '完了' ? 'purple' : tag === '予定' ? 'gray' : 'gray';

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
                    title: memo
                });

                marker.addListener('click', () => {
                    if(currentInfoWindow){
                        currentInfoWindow.close()
                    }
                    showPinInfo(marker, { time, memo, count, tag });
                });

                markers.push(marker);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadPolygon(){
    const accessToken = await getAccessToken();
    const range = `${sheetPolygon}!A1:F`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();

        if (data.values && data.values.length > 1) {
            Polygons.forEach(polygon => polygon[1].setMap(null));
            Polygons = [];

            for (let i = 1; i < data.values.length; i++) {
                const row = data.values[i];
                const [time, coods, tag, memo] = row;

                const color = tag === '完了' ? 'purple' : tag === '予定' ? 'gray' : 'gray';
                const coodsArray = convertCoodsToLatLngArray(coods)
                const polygon = new google.maps.Polygon({
                    paths: coodsArray,
                    strokeColor: color,
                    strokeOpacity: 1,
                    strokeWeight: 2,
                    fillColor: color,
                    fillOpacity: 0.2,
                })
                polygon.setMap(map)
                Polygons.push([time,polygon]);

                polygon.addListener('click', (event)=>{
                    if(currentInfoWindow){
                        currentInfoWindow.close()
                    }
                    showInfoWindowPolygon(polygon, {time,memo,tag}, event.latLng)
                }) 
            }
        }
        //console.log(Polygons)
    } catch (error) {
        console.error('Error:', error);
    }
}

function convertCoodsToLatLngArray(inputString) {
    // 入力文字列を '&' で分割して座標のペアに分ける
    const pairs = inputString.split('&');

    // 各ペアを 'lat' と 'lng' に分割し、オブジェクトに変換する
    const result = pairs.map(pair => {
        const [lng, lat] = pair.split(',');
        return { lat: parseFloat(lat), lng: parseFloat(lng) };
    });

    return result;
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

window.onload = initMap;
