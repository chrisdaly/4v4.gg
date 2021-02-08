import * as d3 from "d3";

function RangePlot(id, data) {
  console.log("RANGE PLOT DRAWING", id);
  console.log("data", data);

  const { teamOneMmrs, teamOneAverageMmr, teamTwoMmrs, teamTwoAverageMmr } = data;
  const margin = { top: 90, right: 10, bottom: 20, left: 10 };
  const width = 150;
  const height = 430 - 77;
  const y = d3
    .scaleLinear()
    .domain(d3.extent([...teamOneMmrs, ...teamTwoMmrs]))
    .range([height, 0])
    .nice(2);

  var yAxis = d3.axisLeft().scale(y).tickSize(2).ticks(3, ",f");

  const svg = d3
    .select(`#${id}`)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + (width + margin.left + margin.right) / 2 + "," + margin.top + ")");

  const middleLine = svg.append("g").attr("class", "y axis").call(yAxis).append("text").attr("class", "axistitle");

  const leftLine = svg
    .append("line")
    .attr("class", "y axis teamOne")
    .attr("x1", -50)
    .attr("y1", (d) => y(d3.max(teamOneMmrs)))
    .attr("x2", -50)
    .attr("y2", (d) => y(d3.min(teamOneMmrs)));

  const rightLine = svg
    .append("line")
    .attr("class", "y axis teamTwo")
    .attr("x1", 50)
    .attr("y1", (d) => y(d3.max(teamTwoMmrs)))
    .attr("x2", 50)
    .attr("y2", (d) => y(d3.min(teamTwoMmrs)));

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
}

export default RangePlot;
