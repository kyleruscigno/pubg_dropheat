//=== Packages ===
const mysql = require('mysql');

//=== Constants ===
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

console.log('Building Databases');
connection.connect((err) => {
	if (err) {
		console.log('Could not connect to database with err: ' + err);
		throw err;
	}
	console.log("Connected to Database");
	buildDatabases().then(() => {
		connection.end();
		console.log("Built Databases and Connection completed");
	}, (err) => {
		connection.end();
		console.log("Error Building Databases, Connection completed with err: " + err);
	});
});

//=== Build Databases ===

function buildDatabases() {
	return new Promise((resolve, reject) => {
		insertQueries = [];

		//drop tables
		for (let map = 0; map < maps.length; map++) {
			const table = tablenames[map];
			const primary_key = "id" + tablenames[map];
			const tileWidth = tileWidths[maps[map]];
			const tile_ids = generateTileIds(tileWidth);
			console.log('building tile id length = ' + tile_ids.length);

			insertQueries.push(new Promise((resolve, reject) => {
				var querystring = 'CREATE TABLE IF NOT EXISTS ?? (?? INT NOT NULL AUTO_INCREMENT, ?? INT UNSIGNED NOT NULL, ?? INT UNSIGNED NOT NULL DEFAULT 0, ?? INT UNSIGNED NOT NULL DEFAULT 0, ?? INT UNSIGNED NOT NULL DEFAULT 0, PRIMARY KEY(??));';
				connection.query(querystring, [table, primary_key, tableschema[0], tableschema[1], tableschema[2], tableschema[3], primary_key], (err, result) => {
					if (err) {
						console.log('error creating table ' + table + ' with err: ' + err);
						reject(err);
					}
					querystring = 'INSERT INTO ?? (??) VALUES ?';
					connection.query(querystring, [table, tableschema[0], tile_ids], (err, result) => {
						if (err) {
							console.log('error inserting tile ids into ' + table + ' with err: ' + err);
							reject(err);
						}
						resolve();
					});
				});
			}));
		}
		Promise.all(insertQueries).then(() => {resolve();}).catch((err) => {reject(err);});
	});
}

//=== Helper Functions ===
function generateTileIds(tileWidth) {
	const tileArr = [];
	for (let x = 0; x < tileWidth; x++) {
		for (let y = 0; y < tileWidth; y++) {
			let tile_id = x;
			tile_id = tile_id << 8;
			tile_id += y;
			tileArr.push([tile_id]);
		}
	}
	return tileArr;
};
