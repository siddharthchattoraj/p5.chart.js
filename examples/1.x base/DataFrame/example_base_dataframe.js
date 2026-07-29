const MANUAL_DATA = [
	{ label: 'A', value: 12, x: 1, y: 12 },
	{ label: 'B', value: 25, x: 2, y: 25 },
	{ label: 'C', value: 8,  x: 3, y: 8  },
	{ label: 'D', value: 19, x: 4, y: 19 },
	{ label: 'E', value: 31, x: 5, y: 31 }
];

let df2;

function setup() {
	createCanvas(800, 450);

    // Convert manual data to DataFrame
	const df = new p5.prototype.chart.DataFrame(MANUAL_DATA);

    // Apply common DataFrame operations
	df2 = new p5.prototype.chart.DataFrame(df.rows)
		.addColumn('value_doubled', (row) => Number(row.value) * 2) // New column with value doubled
		.addColumn('bucket', (row) => (Number(row.value) >= 20 ? 'high' : 'low')) // Categorize values as 'high' or 'low'
		.transform('label', (v) => String(v).toUpperCase()) // Transform "label" to uppercase
		.filter('value', '>=', 10) // Filter for values >= 10
		.sort('value', 'descending') // Sort by value descending

        // Rename columns for better display
		.rename('label', 'Label')
		.rename('value', 'Value')
		.rename('value_doubled', 'Value Doubled')
		.rename('bucket', 'Bucket')
		.rename('x', 'X')
		.rename('y', 'Y');
}

function draw() {
	background(255);

	table(df2, {
		title: 'Basic DataFrame Example',
		subtitle: 'Converts manual data to a DataFrame, applies common operations, and then renders an interactive table.'
	});
}
