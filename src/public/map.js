
//=== Definitions ===
//Map Canvas
var canvas;
var ctx;
var canvasWidth;
var canvasHeight;

//Map Data
const maps = ['erangel', 'miramar', 'savage'];
const dropsDescriptor = ' drops per game';
const carnageDescriptor = ' die in the first 6 minutes'
var selectedMap;
var datatype;
var mapData;
var mapImage;
const red = {r:255, g:0, b:0, a:0.7};
const green = {r:0, g:255, b:0, a:0.7};
const blue = {r:0, g:0, b:255, a:0.7};

//=== Document Ready ==
function prep() {
	//load default map
	selectMap(maps[0]);

	for (let i = 0; i < maps.length; i++) {
		document.getElementById(maps[i]).onclick = function() {
			console.log(maps[i] + ' clicked');
			selectMap(maps[i]);
		}
	}

	document.getElementById('drops').onclick = function() {
		selectData('drops', green);
	};

	document.getElementById('carnage').onclick = function() {
		selectData('carnage', red);
	};
}

function loadData(endpoint, callback) {
	console.log('load data');
	return new Promise((resolve, reject) => {
		var xhttp = new XMLHttpRequest();
		xhttp.onload = () => {
			console.log('successful data load');
			resolve(callback(xhttp));
		}
		xhttp.onerror = (err) => {
			console.log('unsuccessful data load');
			reject(err);
		}
		xhttp.open('GET', endpoint, true);
		xhttp.send();
	});
}

function loadMapData(xhttp) {
	console.log('load map data');
	return mapData = JSON.parse(xhttp.responseText);
}

function selectData(data, color) {
	datatype = data;
	ctx.clearRect(0, 0, canvasWidth, canvasHeight);
	ctx.drawImage(mapImage, 0, 0, canvasWidth, canvasHeight);
	loadData('./'+selectedMap+'/'+data, loadMapData).then((newMapData) => {
		mapData = newMapData;
		drawMapOverlay(color);
	}, (err) => {serverError(err)});
}

function selectMap(map) {
	console.log('selecting map ' + map);
	
	const background = document.getElementsByClassName('content-background')[0];
	const pos = -(maps.indexOf(map) * 10);
	background.style.left = pos + '%';

	if (selectedMap == null) {
		canvas = document.getElementById('map-canvas');
		ctx = canvas.getContext('2d');
		canvasWidth = canvas.width;
		canvasHeight = canvas.height;
		
		ctx.fillStyle = '#222222';
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		selectedMap = map;

		mapImage = new Image();
		mapImage.src = './img/' + map + '.png';
		mapImage.onload = () => {
			selectData('drops', green);
		};
		canvas.onmouseenter = (e) => {mapIn(e)};
		canvas.onmousemove = (e) => {mapInteract(e)};
		canvas.onmouseout = (e) => {mapOut(e)};
	}

	if (selectedMap != map) {
		const mapContainer = document.getElementById('map-canvas-container');
		const animateDirection = maps.indexOf(map) > maps.indexOf(selectedMap) ? 'left' : 'right';
		if (animateDirection == 'left') {
			exitOffset = '-50%';
			enterOffset = '150%';
		}
		else {
			exitOffset = '150%';
			enterOffset = '-50%';
		}

		const currentMap = document.getElementById('currentMap');
		const nextMap = currentMap.cloneNode(true);
		nextMap.style.left = enterOffset;
		nextMap.style.top = 0;
		nextMap.style.position = 'absolute';
		nextMap.id = 'nextMap';
		mapContainer.appendChild(nextMap);
		endPos = Math.floor(mapContainer.clientWidth / 2);
		Velocity(nextMap, {left: endPos}, {duration: 500, easing: 'easeInCubic'});
		Velocity(currentMap, {left: exitOffset}, {duration: 500, easing: 'easeInCubic', complete: function () {
			nextMap.style.position = 'relative';
			nextMap.style.left = '50%';
			mapContainer.removeChild(currentMap);
			canvas = document.getElementById('map-canvas');
			ctx = canvas.getContext('2d');
			canvasWidth = canvas.width;
			canvasHeight = canvas.height;
			
			ctx.fillStyle = '#222222';
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);

			selectedMap = map;

			mapImage = new Image();
			mapImage.src = './img/' + map + '.png';
			mapImage.onload = () => {
				selectData('drops'
					, green);
			};
			nextMap.id = 'currentMap';
			canvas.onmouseenter = (e) => {mapIn(e)};
			canvas.onmousemove = (e) => {mapInteract(e)};
			canvas.onmouseout = (e) => {mapOut(e)};
		}});
	}
}

function drawMapOverlay(color) {
	console.log('draw map overlay');
	const keys = Object.keys(mapData);
	var mapWidth = Math.sqrt(keys.length);
	console.log('keys length is ' + keys.length);
	console.log('map width is ' + mapWidth);
	var maxHeat = 0;
	for (let i = 0; i < keys.length; i++) {
		const tileheat = mapData[keys[i]];
		if (tileheat > maxHeat) {
			maxHeat = tileheat;
		}
	}
	console.log('max heat is ' + maxHeat);
	const mapScale = canvasWidth / mapWidth;
	for (let x = 0; x < mapWidth; x++) {
		for (let y = 0; y < mapWidth; y++) {
			let tile_id = x;
			tile_id = tile_id << 8;
			tile_id += y;
			const heat = mapData[tile_id] / maxHeat;
			ctx.fillStyle = rgba(color.r,color.g,color.b,color.a * heat);
			ctx.fillRect(x * mapScale, y * mapScale, mapScale, mapScale);
		}
	}
}

function serverError(err) {
	console.log('server error ' + err);
}

function mapInteract(e) {
	if (mapData == null) {
		return;
	}
	const keys = Object.keys(mapData);
	const mapWidth = Math.sqrt(keys.length);

	const mapContainer = document.getElementById('currentMap');
	const mapRect = canvas.getBoundingClientRect();
	const containerRect = mapContainer.getBoundingClientRect();
	const pixelMeterRatioX = mapRect.width / mapWidth;
	const pixelMeterRatioY = mapRect.height / mapWidth;

	const x = Math.floor((e.clientX - mapRect.left)/pixelMeterRatioX);
	const y = Math.floor((e.clientY - mapRect.top)/pixelMeterRatioY);
	const key = (x << 8) + y;
	const tileHeat = mapData[key];

	const popup = document.getElementById('popup');
	popupText = popup.firstChild.firstChild;
	if (datatype == 'drops') {
		popupText.data = tileHeat + dropsDescriptor;
	}
	else if (datatype == 'carnage') {
		popupText.data = Math.floor(tileHeat*100) + '%' + carnageDescriptor;
	}
	const top = (e.clientY - mapRect.top) + (mapRect.top - containerRect.top);
	const left = (e.clientX - mapRect.left) + (mapRect.left - containerRect.left);
	popup.style.top = top+'px';
	popup.style.left = left+'px';
}

function mapIn(e) {
	const mapContainer = document.getElementById('currentMap');
	var popup = document.getElementById('popup');

	if (popup == null) {
		popup = document.createElement('div');
		const popupTextContainer = document.createElement('p');
		popupText = document.createTextNode('.');
		popup.id = 'popup';
		popupTextContainer.appendChild(popupText);
		popup.appendChild(popupTextContainer);
		mapContainer.appendChild(popup);
	}
	if (popup != null) {
		Velocity(popup, {opacity: 1}, {duration: 500});
	}
}

function mapOut(e) {
	var popup = document.getElementById('popup');

	if (popup != null) {
		Velocity(popup, {opacity: 0}, {duration: 500});
	}
}
//convert rgba values to css rgba string
function rgba(rval, gval, bval, aval) {
	const r = Math.floor(rval);
	const g = Math.floor(gval);
	const b = Math.floor(bval);
	const a = aval;
	return 'rgba('+r+','+g+','+b+','+a+')';
}
