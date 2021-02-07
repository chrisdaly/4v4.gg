import * as d3 from "d3";

function RangePlot(id, data) {
  console.log("RANGE PLOT DRAWING", id);
  console.log("data", data);

  const { teamOneMmrs, teamOneAverageMmr, teamTwoMmrs, teamTwoAverageMmr } = data;
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const width = 150;
  const height = 235;
  const y = d3
    .scaleLinear()
    .domain(d3.extent([...teamOneMmrs, ...teamTwoMmrs]))
    .range([height, 0])
    .nice(3);

  var yAxis = d3.axisLeft().scale(y).tickSize(2).ticks(3, ",f");
  var yAxisNoTick = d3.axisLeft().scale(y).ticks(0).tickSizeOuter([]);

  const svg = d3
    .select(`#${id}`)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + (width + margin.left + margin.right) / 2 + "," + margin.top + ")");

  const middleLine = svg.append("g").attr("class", "y axis").call(yAxis).append("text").attr("class", "axistitle");

  const leftLine = svg
    .append("g")
    .attr("class", "y axis team1")
    .call(yAxisNoTick)
    .attr("transform", "translate(" + -50 + "," + 0 + ")");

  const rightLine = svg
    .append("g")
    .attr("class", "y axis team2")
    .call(yAxisNoTick)
    .attr("transform", "translate(" + 50 + "," + 0 + ")");

  svg
    .selectAll(".dot teamOne")
    .data(teamOneMmrs)
    .enter()
    .append("circle")
    .attr("class", "dot teamOne")
    .attr("r", 3)
    .attr("cx", function (d) {
      return -50;
    })
    .attr("cy", function (d) {
      return y(d);
    });

  svg
    .selectAll(".dot teamTwo")
    .data(teamTwoMmrs)
    .enter()
    .append("circle")
    .attr("class", "dot teamTwo")
    .attr("r", 3)
    .attr("cx", function (d) {
      return 50;
    })
    .attr("cy", function (d) {
      return y(d);
    });
  //   .style("fill", function (d) {
  //     return colors[d.League];
  //   });
}

export default RangePlot;
