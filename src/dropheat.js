//=== Packages ===
const http = require('http');
const express = require('express');
const mysql = require('mysql');
const child_process = require('child_process');

//=== Server Definitions ===
var port = 8080;
const app = express();
var statUpdateProcess;
var statsInUpdate = false;

//=== Connections ===
var connection = mysql.createConnection({
	host: 'localhost',
	port: '3306',
	user: 'root',
	password: 'DropHeat800x',
	database: "dropheatdb"
});
//default port is 3306

connection.connect((err) => {
	if (err)
	{
		throw err;
	}
	console.log("Connected to Database");
});

//=== JSON Constructor ===
function createStats(rowData, valueFunc) {
	const stats = {};
	for (let row = 0; row < rowData.length; row++) {
		stats[rowData[row].tile_id] = valueFunc(rowData[row]);
	}
	return stats;
}
//=== Generic Middleware ===
/*
app.use((req, res, next) => {
	res.setHeader('cache-control', 'private, max-age=0, no-cache, no-store, must-revalidate');
	res.setHeader('expires', '0');
	res.setHeader('pragma', 'no-cache');
	next();
});
*/
app.use('/', express.static(__dirname + '/public'));

//=== Routes ===
var erangelrouter = express.Router();
var miramarrouter = express.Router();
var savagerouter = express.Router();

//middleware

//endpoints
erangelrouter.get('/drops', (req, res) => {
	connection.query('SELECT * FROM erangel_drop_tiles', (err, results, fields) => {
		if (err) {
			console.log('error in query at router');
			res.send(err);
			return;
		}
		console.log('erangel');
		console.log(results.length);
		res.send(createStats(results, (row) => {
			return row.matches > 0 ? row.drops/row.matches : 0;
		}));
	});
});

erangelrouter.get('/carnage', (req, res) => {
	connection.query('SELECT * FROM erangel_drop_tiles', (err, results) => {
		if (err) {
			console.log('error in query at router');
			res.send(err);
			return;
		}
		console.log('erangel');
		console.log(results.length);
		res.send(createStats(results, (row) => {
			return row.drops > 0 ? row.deaths/row.drops : 0;
		}));
	});
});

miramarrouter.get('/drops', (req, res) => {
	connection.query('SELECT * FROM miramar_drop_tiles', (err, results, fields) => {
		if (err) {
			res.send(err);
			return;
		}
		console.log('miramar');
		console.log(results.length);
		res.send(createStats(results, (row) => {
			return row.drops/row.matches;
		}));
	});
});

miramarrouter.get('/carnage', (req, res) => {
	connection.query('SELECT * FROM miramar_drop_tiles', (err, results, fields) => {
		if (err) {
			res.send(err);
			return;
		}
		console.log('miramar');
		console.log(results.length);
		res.send(createStats(results, (row) => {
			return row.deaths/row.drops;
		}));
	});
});

savagerouter.get('/drops', (req, res) => {
	connection.query('SELECT * FROM savage_drop_tiles', (err, results, fields) => {
		if (err) {
			res.send(err);
			return;
		}
		res.send(createStats(results, (row) => {
			row.drops/row.matches;
		}));
	});
});

savagerouter.get('/carnage', (req, res) => {
	connection.query('SELECT * FROM savage_drop_tiles', (err, results, fields) => {
		if (err) {
			res.send(err);
			return;
		}
		res.send(createStats(results, (row) => {
			row.deaths/row.drops;
		}));
	});
});

//router.route('').get().post().put()

//=== Register Routes ===
app.use('/erangel', erangelrouter);
app.use('/miramar', miramarrouter);
app.use('/savage', savagerouter);

//=== Start Server ===
const server = app.listen(port, function() {
	let host = server.address().address;
	let port = server.address().port;
	console.log(`DropHeat listening at http://${host}:${port}`);
});

scheduleStatUpdate();

function scheduleStatUpdate(){
	console.log('Scheduling Stat Update');
	var now = new Date();
	var next = new Date(now.getTime() + (24 * 60 * 60 * 1000));
	var msToNext = next.getTime() - now.getTime();
	if (!statsInUpdate) {
		statUpdateProcess = child_process.fork(__dirname + '/stat_update.js');
		statsInUpdate = true;
	}
	//statUpdateprocess.on('message', (msg) => {})
	//statUpdateProcess.send({key: 'value'}) -> process.on/process.send
	statUpdateProcess.on('error', (err) => {
		console.log('stat update not executing with error ' + err);
	});
	statUpdateProcess.on('exit', (code, signal) => {
		console.log('exit from stat update process');
		statsInUpdate = false;
	});

	setTimeout(scheduleStatUpdate, msToNext);
}

//function updateStats

