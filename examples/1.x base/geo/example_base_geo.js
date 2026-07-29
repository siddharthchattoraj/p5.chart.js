// Basic Geo Map Example (manual dataset)
const MANUAL_DATA = [
	// Points around Los Angeles
	{ label: 'Downtown', value: 12, lat: 34.0407, lon: -118.2468 },
	{ label: 'Hollywood', value: 25, lat: 34.1016, lon: -118.3269 },
	{ label: 'Santa Monica', value: 8, lat: 34.0195, lon: -118.4912 },
	{ label: 'Pasadena', value: 19, lat: 34.1478, lon: -118.1445 },
	{ label: 'Long Beach', value: 31, lat: 33.7701, lon: -118.1937 }
];

function setup() {
	createCanvas(800, 450);
}

function draw() {
	background(255);
	geo(MANUAL_DATA, {
		// geo() expects lat/lon by default
		tooltipColumns: [
			{ col: 'label', label: 'Place' },
			{ col: 'value', label: 'Value' },
			{ col: 'lat', label: 'Lat' },
			{ col: 'lon', label: 'Lon' }
		]
	});
}
