#PUBG DropHeat - Drop Zone and Player Death Heatmap

## Intro

DropHeat is a server-based statistical heatmap for the game PlayerUnknown's Battlegrounds. It extensively makes use of the PUBG API as well as the [PUBG Node wrapper](https://github.com/Wobow/pubg_api). 

The back-end consists of a Node/Express server supporting various routes to return data to the user based on game map, statistic, and time period. The Server queries the official PUBG API, gathering data then compiles statistics based on various parameters. This data is then queried through an included frontend for representation as a heatmap.

Currently DropHeat supports two primary statistics, number of players dropping in a specific map tile at the beginning of the game and number of players killed in that tile at the beginning of the game (as an average across many hundreds of games played during the last 24 hours). These statistics are stored in a MySQL database which is updated periodically through the 'stat_update.js' child process, allowing quick read access. 

The heat map has a resolution of 80 x 80 tiles for the bigger maps and 40 x 40 for smaller. Each tile is stored as a 16-bit integer representing it's x and y coordinates. A maximum resolution of 256 x 256 is supported, though this will greatly increase database size and stat update times.

User's wishing to host their own local version of this server will need to provide their own official [API key](https://developer.playbattlegrounds.com/) in order to access raw data from the developers of PUBG. 


## Table of contents
- [Installation](#installation)
- [Usage](#usage)
- [Roadmap](#roadmap)

## Installation

**Steps to install on local machine **
- Copy repository to your local machine
- Make sure MySQL is installed and initialize a database
- Update your database credentials in both dropheat.js and dbbuildscript.js under 'Connections'
- Update your API key in stat_update.js in order to access PUBG statistics
- Open the Command Prompt and navigate to where you installed the directory
- **node src\dbbuildscript.js** to build tables
- **node src\dropheat.js** to start server

## Usage

### Making Calls

Calls to the DropHeat Server are of the structure url/mapname/datatype, where the url is wherever you're hosting the server, the map name is replaced by any of the available supported maps (Erangel, Miramar, Savage), and Datatype is any of the supported statistics (Drops, Carnage).

### Customizing the Back-End

Currently the backend offers a few simple customization options, however more will be added

**In dropheat.js**
- statUpdatePeriod : The period of time between stat updates. A smaller value will update statistics more frequently

**In stat_update.js**
- sampleTime : The number of minutes since the start of a match to parse statistical data when compiling statistics for each match

- sampleMatches : The number of matches to sample every time a stat update occurs. Generally each match returned by the PUBG API is around 30mb in size, so this value must be chosen carefully if you have bandwidth restrictions.

- statPeriod : The time period over which to add new entries to the existing statistic database. Once this time period rolls over, old statistics are flushed from the database. A long time period means that variations in statistics will be harder to detect, while a very short one means that noise will be greater.

## Roadmap

Front-End
- [ ] Reponsive Design for Mobile/Desktop
- [ ] Map Zoom Controls
- [ ] Data Descriptors

Back-End
- [x] Save Stat Records
- [ ] Add url query for accessing statistics-over-time by tile (using saved records)
- [ ] Update outdated map assets
