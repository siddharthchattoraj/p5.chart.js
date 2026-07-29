// Create insightful summary table using DataFrame methods on CSV data
let data;
let insightTable;

function preload() {
  if (typeof p5.prototype.registerPreloadMethod === 'function') {
    data = tableToDataFrame('../la_traffic_data.csv', 'csv', 'header');
  }
}

async function setup() {
  createCanvas(1200, 600);

  if (!data) {
    data = await tableToDataFrame('../la_traffic_data.csv', 'csv', 'header');
  }
  
  // Group by area name and aggregate multiple stats
  let areaStats = data.group('Area Name', {
    'Date Reported': 'count',
    'Victim Age': 'mean'
  });
  
  // Rename columns for clarity
  areaStats = areaStats.rename('Date Reported', 'Total Incidents');
  areaStats = areaStats.rename('Victim Age', 'Avg Age');
  
  // Add a gender breakdown column
  areaStats = areaStats.addColumn('Male Victims', (row) => {
    let areaData = data.filter('Area Name', '==', row['Area Name']);
    let males = areaData.filter('Victim Sex', '==', 'M');
    return males.rows.length;
  });
  
  areaStats = areaStats.addColumn('Female Victims', (row) => {
    let areaData = data.filter('Area Name', '==', row['Area Name']);
    let females = areaData.filter('Victim Sex', '==', 'F');
    return females.rows.length;
  });
  
  // Calculate gender ratio
  areaStats = areaStats.addColumn('M/F Ratio', (row) => {
    if (row['Female Victims'] === 0) return 'N/A';
    return (row['Male Victims'] / row['Female Victims']).toFixed(2);
  });
  
  // Round the average age
  areaStats = areaStats.transform('Avg Age', (val) => {
    return val ? Math.round(val) : 'N/A';
  });
  
  // Sort by Total Incidents descending
  insightTable = areaStats.sort('Total Incidents', 'descending');
}

function draw() {
  background(255, 250, 245);
  
  table(insightTable, {
    title: 'LA Traffic Incidents: Area Analysis',
    subtitle: 'Comprehensive statistics by area with gender breakdown',
    maxRows: 15,
    searchable: true,
    pagination: true,
    headerColor: color(147, 197, 253),      // Soft pastel blue
    headerTextColor: color(255),             // White text
    rowColor1: color(254, 249, 195),         // Pastel yellow
    rowColor2: color(253, 224, 221),         // Pastel pink
    hoverColor: color(196, 181, 253),        // Pastel purple
    borderColor: color(203, 213, 225)        // Soft gray
  });
}
