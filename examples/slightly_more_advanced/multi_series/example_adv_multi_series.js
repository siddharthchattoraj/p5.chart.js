/* Stylized multi-series chart showing LA Traffic Incidents across age groups */
// This example demonstrates advanced styling options for series charts
let data;
let seriesData;

function preload() {
  if (typeof p5.prototype.registerPreloadMethod === 'function') {
    data = tableToDataFrame('../la_traffic_data.csv', 'csv', 'header');
  }
}

async function setup() {
  createCanvas(1200, 700);

  if (!data) {
    data = await tableToDataFrame('../la_traffic_data.csv', 'csv', 'header');
  }
  
  // Extract hour from Time Occurred
  data = data.addColumn('Hour', (row) => {
    let time = String(row['Time Occurred']).padStart(4, '0');
    return parseInt(time.substring(0, 2));
  });
  
  // Create age groups
  data = data.addColumn('Age Group', (row) => {
    let age = row['Victim Age'];
    if (!age || age < 0) return null;
    if (age < 25) return 'Youth (Under 25)';
    if (age < 45) return 'Adults (25-44)';
    if (age < 65) return 'Middle Age (45-64)';
    return 'Seniors (65+)';
  });
  
  // Build multi-series data: Age groups across hours
  let ageGroups = ['Youth (Under 25)', 'Adults (25-44)', 'Middle Age (45-64)', 'Seniors (65+)'];
  
  seriesData = data.filter('Hour', '!=', null)
    .group('Hour', { 'Date Reported': 'count' })
    .sort('Hour', 'ascending');
  
  // Add series for each age group
  ageGroups.forEach(group => {
    seriesData = seriesData.addColumn(group, (row) => {
      let filtered = data.filter('Hour', '==', row.Hour)
        .filter('Age Group', '==', group);
      return filtered.rows.length;
    });
  });
}

function draw() {
  background(255, 250, 245);
  
  series(seriesData, {
    x: 'Hour',
    y: ['Youth (Under 25)', 'Adults (25-44)', 'Middle Age (45-64)', 'Seniors (65+)'],
    title: 'LA Traffic Incidents: Age Demographics Across Time',
    subtitle: 'Hourly patterns reveal when different age groups are most at risk',
    xLabel: 'Hour of Day (24-Hour Format)',
    yLabel: 'Incident Count',
    showPoints: true,
    pointSize: 10,
    lineSize: 3,
    legend: {
      show: true,
      position: 'top-right',
      fontSize: 13
    },
    palette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'],
    margin: { top: 80, right: 60, bottom: 80, left: 90 }
  });
}
