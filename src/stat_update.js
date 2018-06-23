//=== Packages ===
const mysql = require('mysql');
const Pubgapi = require('pubg_api');
const fs = require('fs');

//=== Constants ===
const apikey = '';
const apiInstance = new Pubgapi(apikey);
const sampleTime = 6; //minutes from start of match to analyze event data
const sampleMatches = 100; //amount of matches to parse from sample set

//=== Data Scheme ===
const maps = ['erangel', 'miramar', 'savage'];
const tileWidths = {'erangel': 80, 'miramar': 80, 'savage': 40};
const tableschema = ['tile_id', 'drops', 'deaths', 'matches'];
const tablenames = ['erangel_drop_tiles', 'miramar_drop_tiles', 'savage_drop_tiles'];
const pixelMeterRatio = 10240;

//=== Connections ===
var connection = mysql.createConnection({
	host: 'localhost',
	port: '3306',
	user: 'root',
	password: 'DropHeat800x',
	database: "dropheatdb"
});
//default port is 3306

console.log('Updating Statistics');
connection.connect((err) => {
	if (err) {
		console.log('Could not connect to database with err: ' + err);
		throw err;
	}
	console.log("Connected to Database");
	gatherStats();
});

//=== Import PUBG Match Data ===
function gatherStats() {
	console.log('Gathering Statistics');
	apiInstance.loadSamples()
		.then((samples) => {
			return retrieveData(samples);
		})
		.then((data) => {
			return parseData(data);
		})
		.then((parsedData) => {
			return insertData(parsedData);
		})
		.then(() => {
			console.log('Updating Statistics completed');
			process.exit();
		})
		.catch((err) => {
			console.log('Err: ' + err);
			process.exit();
		});
}

async function retrieveData(samples) {
	try {
		var resetTables = await checkSamples(samples);
		var tableData = await retrieveTables(resetTables);
		var matches = await retrieveMatches(samples);
		var telemetryURLs = await retrieveTelemetryURLs(matches);
		var matchData = await retrieveMatchData(matches);
	}
	catch (err) {
		throw new Error(err);
	}

	return [telemetryURLs, tableData, matchData];
}
//=== Check Sample Set, Extract Match Id's from Sample Set and load each match ===
async function checkSamples(samples) {
	console.log('Checking Samples');
	var resetTables = false;

	//Find Current and Previous Sample Dates
	const currentSampleDate = new Date(samples.data.attributes.createdAt);
	var lastSampleJSON = JSON.parse(fs.readFileSync(__dirname + '/sampledate.json'));
	var lastSampleDate = new Date(lastSampleJSON.lastSampleDate);

	console.log('current sample date is ' + currentSampleDate);
	console.log('last sample date is ' + lastSampleDate);
	//If Sample Date is the same, skip the stat update
	if (currentSampleDate.getTime() == lastSampleDate.getTime()) {
		throw new Error(' CHECKSAMPLES: Sample Set has not refreshed, skipping statistics update');
	}

	//If Sample Date is next - save log of last month and reset tables
	if (currentSampleDate.getDay() != lastSampleDate.getDay()) {
		resetTables = true;
	}

	lastSampleJSON.lastSampleDate = currentSampleDate;
	fs.writeFileSync(__dirname + '/sampledate.json', JSON.stringify(lastSampleJSON), 'utf8');
	return resetTables;
}

async function retrieveTables(resetTables) {
	console.log('Retrieving Tables');
	var tableData = [];
	var queries = [];

	//Find Previous Sample Date
	var lastSampleDate;
	var lastSampleJSON = JSON.parse(fs.readFileSync(__dirname + '/sampledate.json'));
	var lastSampleDate = new Date(lastSampleJSON.lastSampleDate);

	for (let m = 0; m < maps.length; m++) {
		var querystring = 'SELECT * FROM ??;';
		queries.push(new Promise((resolve, reject) => {
			connection.query(querystring, [tablenames[m]], (err, results) => {
				if (err) {
					reject(new Error(' RETRIEVETABLES: Error getting all row data on retrieve table ' + tablenames[m] + ' with err: ' + err));
				}
				const stats = createStats(results);
				console.log('results from query in retrieve is length of ' + results.length);
				tableData.push(stats);
				if (resetTables) {
					console.log('saving table record');
					const json = JSON.stringify(stats);
					const filename = __dirname + '/stat_logs/' + tablenames[m] + '#T' + lastSampleDate.getTime() + '.json';
					fs.writeFileSync(filename, json, 'utf8');
				}
				resolve();
			});
		}));
	}

	await Promise.all(queries).then(() => {
		console.log('all queries finished in retrieve tables');
	}, (err) => {throw new Error(err)})

	//Reset Tables
	if (resetTables) {
		console.log('resetting tables');
		for (let t = 0; t < tableData.length; t++) {
			const keys = Object.keys(tableData[t]);
			for (let k = 0; k < keys.length; k++) {
				tableData[t][keys[k]] = [keys[k],0,0,0];
			}
		}
	}

	return tableData;
}

//=== Load each match ===
async function retrieveMatches(samples) {
	console.log('Retrieving Matches');
	const matchIds = samples.data.relationships.matches.data;
	var matches = [];
	console.log('Total number of matches in Sample set is ' + matchIds.length);
	for (let m = 0; m < sampleMatches; m++) {
		const match = await apiInstance.loadMatchById(matchIds[m].id);
		matches.push(match);
	}
	console.log('Finished loading matches');
	console.log('Amount of matches sampled is ' + matches.length);
	return matches;
}

//=== Find the telemetry url's ===
async function retrieveTelemetryURLs(matches) {
	console.log('Retrieving Telemetry URLs');
	//Load each match - up to sampleMatches
	var telemetryURLs = []; 

	//Find amount of matches sampled for each map
	//Find telemetry URL for each match
	for (let m = 0; m < matches.length; m++) {
		const url = await apiInstance.findTelemetryURLs(matches[m]);
		telemetryURLs.push(url);
	}
	
	console.log('at end of retrieving telemetry urls, amount of telemetry URLs is ' + telemetryURLs.length);
	return telemetryURLs;
}

async function retrieveMatchData(matches) {
	console.log('Retrieving Match Data');
	var matchCount = [0,0,0];
	for (let m = 0; m < matches.length; m++) {
		if (matches[m].attributes.mapName.includes('Erangel')) matchCount[0]++;
		else if (matches[m].attributes.mapName.includes('Desert')) matchCount[1]++;
		else matchCount[2]++;
	}
	
	console.log('at end of retrieving match data, amount of matches is ' + matchCount.toString());
	return matchCount;
}

//=== Find and Parse Telemetry Data and Statistics Data from Matches ===
async function parseData(data) {
	console.log('Parsing Data');
	const telemetryURLs = data[0];
	const tableData = data[1];
	const matchData = data[2];

	//new drop data
	var erangelDrops = [];
	var miramarDrops = [];
	var savageDrops = [];

	//add Match Counts to table data
	for (let m = 0; m < maps.length; m++) {
		const table = tableData[m];
		const keys = Object.keys(table);
		const matchCount = matchData[m];
		for (let k = 0; k < keys.length; k++) {
			table[keys[k]][3] += matchCount;
		}

	}
	console.log('match counts updated');

	console.log('loading telemetry data');
	for (let u = 0; u < telemetryURLs.length; u++) {
		//wait for telemetry to resolve (do not buffer multiple telemetry files asynchronously from for loop)
		var telemetry = await apiInstance.loadTelemetry(telemetryURLs[u]);
		var matchStartTime;

		for (let e = 0; e < telemetry.length; e++) {
			const event = telemetry[e];
			const eventTime = new Date(event._D);

			//if time into match is greater than sampleTime, then stop looking at Telemetry Data
			if (matchStartTime && ((eventTime - matchStartTime) > (sampleTime * 60 * 1000))) break;

			//if event is the match start
			if (event._T === 'LogMatchStart') {
				matchStartTime = new Date(event._D);
			}

			//if event is leaving parachute (drop)
			if (event._T === 'LogVehicleLeave' && event.vehicle.vehicleType === 'Parachute') {
				const drop = new dropdata(event.character.accountId, event.character.location.x, event.character.location.y);
				if (event.common.mapName.includes('Erangel')) {
					erangelDrops.push(drop);
					tableData[0][drop[1]][1]++;
				}
				else if (event.common.mapName.includes('Desert')) {
					miramarDrops.push(drop);
					tableData[1][drop[1]][1]++;
				}
				else if (event.common.mapName.includes('Savage')) {
					savageDrops.push(drop);
					tableData[2][drop[1]][1]++;
				}
			}

			//if event is play death
			if (event._T === 'LogPlayerKill') {
				if (event.common.mapName.includes('Erangel')) {
					tableData[0][findDrop(erangelDrops, event.victim.accountId)][2]++;
				}
				else if (event.common.mapName.includes('Desert')) {
					tableData[1][findDrop(miramarDrops, event.victim.accountId)][2]++;
				}
				else if (event.common.mapName.includes('Savage')) {
					tableData[2][findDrop(savageDrops, event.victim.accountId)][2]++;
				}

			}
		}
		//ready for garbage collection
		telemetry = null;
	}
	console.log('finished loading all telemetry datas and updating table data');

	return tableData;
}

//DaJoule was here
//=== Update Database Background Data ===
async function insertData(parsedData) {
	console.log('Inserting Data');
	const tableData = parsedData;
	const tableDataArr = [[],[],[]];
	var queries = [];

	for (let m = 0; m < maps.length; m++) {
		const keys = Object.keys(tableData[m]);
		for (let k = 0; k < keys.length; k++) {
			tableDataArr[m].push(tableData[m][keys[k]]);
		}

		var querystring = 'DELETE FROM ??;';
		queries.push(new Promise((resolve, reject) => {
			connection.query(querystring, [tablenames[m]], (err, results) => {
				if (err) {
					reject(new Error(' INSERTDATA: Error reseting table ' + tablenames[m] + ' for update with err: ' + err));
				}
				console.log('deleted old table record with ' + results.affectedRows + ' rows affected on delete');

				querystring = 'INSERT INTO ?? (??) VALUES ?';
				connection.query(querystring, [tablenames[m], tableschema, tableDataArr[m]], (err, results) => {
					if (err) {
						reject(new Error(' INSERTDATA: Error Inserting updated values into ' + tablenames[m] + ' with err: ' + err));
					}
					console.log('inserted new table record with ' + results.affectedRows + ' rows affected on insert');
					resolve();
				});
			});
		}));
	}

	await Promise.all(queries).then(() => {
		console.log('all tables flushed and recreated');
	})

	return;
}

//=== Helper Functions ===
function dropdata(player_id, tile_x, tile_y) {
	this.player_id = player_id;
	this.tile_x = Math.floor(tile_x / pixelMeterRatio);
	this.tile_y = Math.floor(tile_y / pixelMeterRatio);
	this.tile_id = (this.tile_x << 8) + this.tile_y;
	return [this.player_id, this.tile_id];
	// x byte [00000000] y byte [00000000] maximum 256x256 resolution (30m on 8km map)
	//to deresolve x -> bitshift tile_id >> 8
	//to deresolve y -> mask tile_id & 0xFF
}

function findDrop(dropArr, player) {
	for (let d = 0; d < dropArr.length; d++) {
		if (dropArr[d][0] === player) {
			return dropArr[d][1];
		}
	}
	return 0;
}

//=== JSON Constructor ===
function createStats(rowData) {
	const stats = {};
	for (let row = 0; row < rowData.length; row++)
	{
		stats[rowData[row].tile_id] = [rowData[row].tile_id, rowData[row].drops, rowData[row].deaths, rowData[row].matches];
	}
	return stats;
}
