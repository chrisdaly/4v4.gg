import * as d3 from "d3";

function RangePlot(id, data) {
  const { teamOneMmrs, teamOneAverageMmr, teamTwoMmrs, teamTwoAverageMmr, league } = data;
  const teamSize = teamOneMmrs.length;

  const padding = 0;
  const teamHeaderHeight = document.getElementsByClassName("ui vertically divided grid team-header team-1")[0].offsetHeight;
  const cardHeight = document.getElementsByClassName("ui vertically divided grid playerCard")[0].offsetHeight;

  const margin = { top: teamHeaderHeight, right: 0, bottom: padding, left: 0 };
  const width = 49.75;
  const height = 5 + cardHeight * 4;
  const svgHeight = 5 + document.getElementsByClassName("teamDiv")[0].offsetHeight; //height + teamHeaderHeight;
  // console.log("svgHeight", svgHeight);
  const verticalOffset = 10;

  let minMmr = 900; //d3.min(combinedMmrs);
  let maxMmr = 2230; //d3.max(combinedMmrs);

  const y = d3.scaleLinear().domain([minMmr, maxMmr]).range([height, 0]).nice(0);

  var yAxis = d3.axisLeft().scale(y).tickSize(0).ticks(0, ",f");

  const svg = d3
    .select(`#${id}`)
    .append("svg")
    .attr("width", width)
    .attr("height", svgHeight)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + margin.top + ")")
    .attr("height", height - margin.top);

  const middleLine = svg.append("g").attr("class", "y axis middle").call(yAxis);

  // Label;
  middleLine
    .append("text")
    .attr("class", "axistitle")
    .text("MMR")
    .attr("x", width / 2 - 25)
    .attr("y", y.range()[1] - teamHeaderHeight / 2);

  // middleLine
  //   .append("text")
  //   .attr("class", "mmrBackground")
  //   .text("1.5k")
  //   .attr("x", width / 2 - 25)
  //   .attr("y", y.range()[0] / 2);

  // badge
  // middleLine
  //   .append("svg:image")
  //   .attr("x", width / 2 - 45)
  //   .attr("y", y.range()[1] - 46)
  //   .attr("width", 40)
  //   // .attr("height", 24)
  //   .attr("xlink:href", leagueIcon);

  // leftLine;
  svg
    .append("line")
    .attr("class", "y axis teamOne")
    .attr("x1", -verticalOffset)
    .attr("y1", (d) => y(d3.max(teamOneMmrs)))
    .attr("x2", -verticalOffset)
    .attr("y2", (d) => y(d3.min(teamOneMmrs)));

  // rightLine
  svg
    .append("line")
    .attr("class", "y axis teamTwo")
    .attr("x1", verticalOffset)
    .attr("y1", (d) => y(d3.max(teamTwoMmrs)))
    .attr("x2", verticalOffset)
    .attr("y2", (d) => y(d3.min(teamTwoMmrs)));

  // avgLine
  svg
    .append("line")
    .attr("class", "y axis avgLine")
    .attr("x1", -verticalOffset)
    .attr("y1", (d) => y(teamOneAverageMmr))
    .attr("x2", verticalOffset)
    .attr("y2", (d) => y(teamTwoAverageMmr));

  // leftDots
  svg
    .selectAll(".dot teamTwo")
    .data(teamTwoMmrs)
    .enter()
    .append("circle")
    .attr("class", "dot teamTwo")
    .attr("r", 5)
    .attr("cx", verticalOffset)
    .attr("cy", (d) => y(d));

  // rightDots
  svg
    .selectAll(".dot teamOne")
    .data(teamOneMmrs)
    .enter()
    .append("circle")
    .attr("class", "dot teamOne")
    .attr("r", 5)
    .attr("cx", -verticalOffset)
    .attr("cy", (d) => y(d));

  // var imgs = svg.selectAll("image").data([0]);
  // imgs.enter().append("svg:image");

  // svg
  //   .selectAll(".mmr axis")
  //   .data(teamTwoMmrs)
  //   .enter()
  //   .append("circle")
  //   .attr("class", "dot teamTwo")
  //   .attr("r", 4)
  //   .attr("cx", function (d) {
  //     return verticalOffset;
  //   })
  //   .attr("cy", function (d) {
  //     return y(d);
  //   });
}

export default RangePlot;
