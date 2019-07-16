// Set up Chart Area

var svgWidth = 2000;
var svgHeight = 475;

var chartMargin = {
  top: 75,
  right: 20,
  bottom: 40,
  left: 40
};

var chartWidth = svgWidth - chartMargin.left - chartMargin.right;
var chartHeight = svgHeight - chartMargin.top - chartMargin.bottom;

var svg = d3.select("#stackedChart")
  .append("svg")
  .attr("height", svgHeight)
  .attr("width", svgWidth);

var chartGroup = svg.append("g")
  .attr("transform", `translate(${chartMargin.left}, ${chartMargin.top})`);

var chartGroup2 = svg.append("g")
  .attr("transform", `translate(${chartMargin.left}, ${chartMargin.top})`);


// Read Data
d3.csv("../static/data/data.csv", data => {

  // Transform data to one row per year
  var flatData = transposeData(data);

  // Get all keys for causes of death
  var causeKeys = Object.keys(flatData[0]).filter(d => d != "Year");
  // console.log(flatData)

  // Calculate total deaths for each year for stacked bar chart
  flatData.forEach(d =>
    d.total = d3.sum(causeKeys, k => +d[k]));

  // Configure scales for grouped and stacked charts

  // Scale band for years
  var xScaleYears = d3.scaleBand()
    .domain(data.map(d => d.Year))
    .range([0, chartWidth])
    .paddingInner(.1)
    .paddingOuter(.1);

  // Scale band for causes (for within each year band)
  var xScaleCauses = d3.scaleBand()
    .domain(causeKeys)
    .range([0, xScaleYears.bandwidth()])
    .paddingInner(.05)
    .paddingOuter(.05);

  // y scale for grouped bar chart
  var yScaleGrouped = d3.scaleLinear()
    .domain([0, d3.max(data, d => +d.DeathRate)])
    .range([chartHeight, 0]);

  // y scale for stacked bar chart
  var yScaleStacked = d3.scaleLinear()
    .domain(d3.extent([0, d3.max(flatData, d => d.total)]))
    .range([chartHeight, 0]);

  // Add axes to chart, using y scale for grouped bar chart which
  // is initially displayed
  var bottomAxis = d3.axisBottom().scale(xScaleYears);
  var leftGroupedAxis = d3.axisLeft().scale(yScaleGrouped); 
  var leftStackedAxis = d3.axisLeft().scale(yScaleStacked);

  var x_axis = chartGroup.append("g")
    .attr("transform", `translate(0, ${chartHeight})`)
    // .selectAll("text")
    .call(bottomAxis)
    .selectAll("text")  
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-65)" );;

  var y_axis = chartGroup.append("g")
    .attr("class", "yAxis")
    .call(leftGroupedAxis);

  // Scale for bar chart color fills
  var color = d3.scaleOrdinal(d3.schemeSet1);

  //Build stacked chart with initial visibility set to none
  var stack = d3.stack().keys(causeKeys);

  var stackedChart = chartGroup2.selectAll(".bar")
    .data(stack(flatData))
    .enter().append("g")
    .attr("class", "bar")
    .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d)
      .enter().append("rect")
      .attr("x", d => xScaleYears(d.data.Year))
      .attr("y", d => yScaleStacked(d[1]))
      .attr("height", d => yScaleStacked(d[0]) - yScaleStacked(d[1]))
      .attr("width", xScaleYears.bandwidth())
      .style("opacity", 0)


  // Build grouped chart with intitial visibitlity set to on
  var groupedChart = chartGroup.append("g")
    .selectAll("g")
    .data(flatData)
    .enter().append("g")
    .attr("class", "bar")
    .attr("transform", d => "translate(" + (xScaleYears(d.Year) + ",0)"))
    .selectAll("rect")
    .data(d => causeKeys.map(key => ({ key: key, value: d[key] })))
      .enter().append("rect")
      .attr("x", d => xScaleCauses(d.key))
      .attr("y", d => yScaleGrouped(d.value))
      .attr("width", xScaleCauses.bandwidth())
      .attr("height", d => chartHeight - yScaleGrouped(d.value))
      .attr("fill", d => color(d.key))
      .style("opacity", 1);

      
  // Create legend used for both bar charts

  // Reverse order of keys to use in legend to display
  // in proper order
  var reversedkeys = causeKeys.slice().reverse();

  var legend = chartGroup.selectAll(".legend")
    .data(reversedkeys)
    .enter().append("g")
    .attr("class", "legend")
    .attr("transform", (d, i) => "translate(0," + (i * 20 - 70) + ")")

  legend.append("rect")
    .attr("x", 40)
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", color)
    .attr("stroke", color)
    .attr("stroke-width", 2)
    .on("click", d => updateGroupedChart(d));

  legend.append("text")
    .attr("x", 60)
    .attr("y", 9)
    .attr("dy", ".20em")
    .attr("text-anchor", "begin")
    .text(d => d);


  // Set function to switch between grouped and stacked bar charts
  // based on user selection of radio buttons
  const buttons = d3.selectAll('input').on('change', function (d) { 
    if (this.value == "grouped") {

        // Transition view from stacked to grouped chart
        stackedChart
          .transition()
          .duration(1500)
          .style("opacity", 0);
        groupedChart
          .transition()
          .duration(2000)
          .delay(500)
          .style("opacity", 1);
        
        // Transition y axis to group chart y scale
        y_axis
          .transition()
          .duration(2000)
          .call(leftGroupedAxis);
      }
      else {

        // Transition view from grouped to stacked chart
        groupedChart
          .transition()
          .duration(1500)
          .style("opacity", 0);
        stackedChart
          .transition()
          .duration(2000)
          .delay(500)
          .style("opacity", 1);
        

        // Transition y axis to stacked chart y scale
        y_axis
          .transition()
          .duration(2000)
          .call(leftStackedAxis);
      }
    });

  // Array of cause keys for data that are deselected for display
  var filteredKeys = [];

  function updateGroupedChart(key) {

    // Disable chart/legend updates if stacked chart is being displayed
    if (d3.select('input[name="chartType"]:checked').node().value
      == "stacked") {
      return;
    }

    // Update list of data to filter out for display
    // Add selected key to list if not currently in list
    if (filteredKeys.indexOf(key) == -1) {
      filteredKeys.push(key);
      // If all bars are deselected reset list causing chart and legend to reset
      if (filteredKeys.length == causeKeys.length) filteredKeys = [];
    }
    // If selected key is in the list, remove it
    else {
      filteredKeys.splice(filteredKeys.indexOf(key), 1);
    };

    // Create new list of active keys by inverting filteredKeys
    var viewableKeys = [];
    causeKeys.forEach(d => {
      if (filteredKeys.indexOf(d) == -1) {
        viewableKeys.push(d);
      }
    });

    // Update x and y scales to data set up viewable bars
    xScaleCauses
      .domain(viewableKeys)

    yScaleGrouped
      .domain([0, d3.max(flatData, d => d3.max(viewableKeys, k => +d[k]))])

    // Update y axis
    leftGroupedAxis = d3.axisLeft().scale(yScaleGrouped)

    y_axis
      .transition()
      .duration(2000)
      .call(leftGroupedAxis);

    // select all bars on chart
    var bars = chartGroup.selectAll(".bar").selectAll("rect")

    // If key for bar is in the filtered list remove from chart
    // by setting height and width to 0
    bars.filter(d => filteredKeys.indexOf(d.key) > -1)
      .transition()
      .duration(1000)
      .attr("height", 0)
      .attr("width", 0)
      .attr("y", chartHeight);

    // If key for bar is not in the filtered list adjust
    // height and width for data set of viewable bars
    bars.filter(d => filteredKeys.indexOf(d.key) == -1)
      .transition()
      .duration(500)
      .delay(1000)
      .attr("x", d => xScaleCauses(d.key))
      .attr("width", xScaleCauses.bandwidth())
      .transition()
      .duration(800)
      .delay(0)
      .attr("y", d => yScaleGrouped(d.value))
      .attr("height", d => chartHeight - yScaleGrouped(d.value))
      .attr("fill", d => color(d.key));

    // Update legend to indicate which bars are selected/deselected
    // for display by user selection of legend icons
    legend.selectAll("rect")
      .transition()
      .attr("fill", d => {
        if (filteredKeys.length) {
          if (filteredKeys.indexOf(d) == -1) {
            return color(d);
          }
          else {
            return "white";
          }
        }
        else {
          return color(d);
        }
      })
      .duration(100);
  }
});


// Transform data from one row per data point per year
// to all data points per year on one row
function transposeData(data) {
  var yearLimits = d3.extent(data, d => d.Year);
  var flatData = [];

  for (i = yearLimits[0]; i <= yearLimits[1]; i++) {

    var yearData = data.filter(d => d.Year == i);

    var strokeRate = yearData.filter(d => d.Cause == "Stroke")[0].DeathRate;
    var fluRate = yearData.filter(d => d.Cause == "Influenza and Pneumonia")[0].DeathRate;
    var accidentRate = yearData.filter(d => d.Cause == "Accidents")[0].DeathRate;
    var heartRate = yearData.filter(d => d.Cause == "Heart Disease")[0].DeathRate;
    var cancerRate = yearData.filter(d => d.Cause == "Cancer")[0].DeathRate;

    flatData.push({
      "Year": i,
      "Stroke": strokeRate,
      "Influenza and Pneumonia": fluRate,
      "Accidents": accidentRate,
      "Heart Disease": heartRate,
      "Cancer": cancerRate
    });
  }
  return flatData;
}

