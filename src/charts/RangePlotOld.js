import * as d3 from "d3";

import grandmaster from "../icons/grandmaster.png";
import master from "../icons/master.png";
import diamond from "../icons/diamond.png";
import platinum from "../icons/platinum.png";
import gold from "../icons/gold.png";
import silver from "../icons/silver.png";
import bronze from "../icons/bronze.png";

function RangePlot(id, data) {
  const { teamOneMmrs, teamOneAverageMmr, teamTwoMmrs, teamTwoAverageMmr, league } = data;
  const teamSize = teamOneMmrs.length;
  const padding = 1.4;
  const cardHeight = 51.91;
  const teamHeaderHeight = 47.91;
  const margin = { top: teamHeaderHeight + padding * 3, right: 0, bottom: padding + 10, left: 0 };
  const width = 49.75;
  const height = teamHeaderHeight + padding + teamSize * (cardHeight + padding);
  const verticalOffset = 10;

  const badgeMapping = {
    grandmaster: grandmaster,
    master: master,
    diamond: diamond,
    platinum: platinum,
    gold: gold,
    silver: silver,
    grandmbronzester: bronze,
  };
  const leagueIcon = badgeMapping[league];

  // const combinedMmrs = [...teamOneMmrs, ...teamTwoMmrs];
  let minMmr = 800; //d3.min(combinedMmrs);
  let maxMmr = 2500; //d3.max(combinedMmrs);

  const y = d3
    .scaleLinear()
    .domain([minMmr, maxMmr])
    .range([height - margin.top - margin.bottom, 0])
    .nice(3);

  // console.log("y", y);

  var yAxis = d3.axisLeft().scale(y).tickSize(0).ticks(0, ",f");

  const svg = d3
    .select(`#${id}`)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
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
    .attr("y", y.range()[0] + margin.bottom);

  // badge
  middleLine
    .append("svg:image")
    .attr("x", width / 2 - 45)
    .attr("y", y.range()[1] - 46)
    .attr("width", 40)
    // .attr("height", 24)
    .attr("xlink:href", leagueIcon);

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
    .attr("r", 3)
    .attr("cx", verticalOffset)
    .attr("cy", (d) => y(d));

  // rightDots
  svg
    .selectAll(".dot teamOne")
    .data(teamOneMmrs)
    .enter()
    .append("circle")
    .attr("class", "dot teamOne")
    .attr("r", 3)
    .attr("cx", -verticalOffset)
    .attr("cy", (d) => y(d));

  var imgs = svg.selectAll("image").data([0]);
  imgs.enter().append("svg:image");

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
